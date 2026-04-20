import {
  buildDerivedFreightRows,
  type DerivedFreightRow,
} from '../freight/anchors'
import type {
  FreightContainerType,
  FreightCountry,
  FreightRouteKey,
  FreightRouteSelection,
} from '../freight/constants'
import {
  CCFI_URL,
  fetchCcfiPageHtml,
  parsePersianGulfCcfi,
  type PersianGulfCcfiSnapshot,
} from './ccfi'

const FREIGHT_TABLE = 'freight_rates'

type FreightWriteRow = {
  date: string
  route_key: FreightRouteKey
  origin_port: FreightRouteSelection['originPort']
  destination_country: FreightCountry
  destination_port: FreightRouteSelection['destinationPort']
  container_type: FreightContainerType
  baseline_freight: number
  source_url: string
  fetched_at: string
}

type FreightDbClient = {
  from(table: string): {
    upsert(rows: FreightWriteRow[], options: { onConflict: string }): Promise<{ error: { message: string } | null }>
  }
}

export interface FreightNormalizedRow {
  date: string
  routeKey: FreightRouteKey
  originPort: FreightRouteSelection['originPort']
  destinationCountry: FreightCountry
  destinationPort: FreightRouteSelection['destinationPort']
  containerType: FreightContainerType
  baselineFreight: number
  sourceUrl: string
}

type FetchAndSaveFreightDeps = {
  loadCcfiSnapshot?: () => Promise<PersianGulfCcfiSnapshot>
  saveRows?: (rows: FreightNormalizedRow[]) => Promise<{ saved: number }>
}

export function normalizeFreightRows(
  rows: DerivedFreightRow[],
  sourceUrl: string,
): FreightNormalizedRow[] {
  return rows.map((row) => ({
    date: row.date,
    routeKey: row.route_key,
    originPort: row.origin_port,
    destinationCountry: row.destination_country,
    destinationPort: row.destination_port,
    containerType: row.container_type,
    baselineFreight: row.baseline_freight,
    sourceUrl,
  }))
}

export async function saveFreightRows(
  records: FreightNormalizedRow[],
  db?: FreightDbClient,
): Promise<{ saved: number }> {
  if (records.length === 0) {
    return { saved: 0 }
  }

  const uniqueRecordKeys = new Set(records.map((record) => `${record.date}:${record.routeKey}`))
  if (uniqueRecordKeys.size !== records.length) {
    throw new Error('Freight records contain duplicate date:routeKey pairs')
  }

  const client = db ?? (await import('../supabase')).supabaseAdmin
  const fetchedAt = new Date().toISOString()
  const payload = records.map((record) => ({
    date: record.date,
    route_key: record.routeKey,
    origin_port: record.originPort,
    destination_country: record.destinationCountry,
    destination_port: record.destinationPort,
    container_type: record.containerType,
    baseline_freight: record.baselineFreight,
    source_url: record.sourceUrl,
    fetched_at: fetchedAt,
  } satisfies FreightWriteRow))

  const { error } = await client.from(FREIGHT_TABLE).upsert(payload, { onConflict: 'date,route_key' })
  if (error) {
    throw new Error(`Freight save failed: ${error.message}`)
  }

  return { saved: payload.length }
}

async function loadCurrentCcfiSnapshot(): Promise<PersianGulfCcfiSnapshot> {
  const html = await fetchCcfiPageHtml()
  return parsePersianGulfCcfi(html)
}

export async function fetchAndSaveFreight(
  deps: FetchAndSaveFreightDeps = {},
): Promise<{ scanned: number; saved: number; reportDate: string }> {
  const loadCcfiSnapshot = deps.loadCcfiSnapshot ?? loadCurrentCcfiSnapshot
  const saveRows = deps.saveRows ?? ((rows) => saveFreightRows(rows))

  const snapshot = await loadCcfiSnapshot()
  const derivedRows = [
    ...buildDerivedFreightRows({
      date: snapshot.previousDate,
      currentIndex: snapshot.previousIndex,
    }),
    ...buildDerivedFreightRows({
      date: snapshot.currentDate,
      currentIndex: snapshot.currentIndex,
    }),
  ]
  const normalized = normalizeFreightRows(derivedRows, CCFI_URL)
  const { saved } = await saveRows(normalized)

  return {
    scanned: normalized.length,
    saved,
    reportDate: snapshot.currentDate,
  }
}
