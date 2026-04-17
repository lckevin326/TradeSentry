import {
  PROFIT_CONTAINER_TYPES,
  PROFIT_COUNTRIES,
  PROFIT_QUOTE_CURRENCIES,
  PROFIT_TRADE_TERMS,
  type MarketSnapshot,
  type OrderInput,
} from '../../../lib/profit/index'
import { calculateAttribution, calculateProfitComparison } from '../../../lib/profit/calculate'
import { getFreightRouteByKey } from '../../../lib/freight/constants'
import { getExportRebateRateByHsCode } from '../../../lib/rebates'

type FxHistoryRow = {
  date: string
  rate: number
}

type TariffHistoryRow = {
  date?: string | null
  fetched_at?: string
  fetchedAt?: string
  rate_pct?: number
  ratePct?: number
}

type FreightHistoryRow = {
  date: string
  baseline_freight?: number
  baselineFreight?: number
  fetched_at?: string
  fetchedAt?: string
  source_url?: string
  sourceUrl?: string
}

type MarketSeries<T> = {
  today: T
  yesterday: T
}

type ProfitMarketData = {
  fx: MarketSeries<FxHistoryRow>
  tariff: MarketSeries<TariffHistoryRow>
  freight: MarketSeries<FreightHistoryRow>
}

type MarketSelection = {
  fxRate: number
  fxSourceRate: number
  fxSourceDate: string
  fxSourceKind: 'market_rate' | 'synthetic_cny_parity'
  tariffRatePct: number
  tariffSourceDate: string
  tariffSourceFetchedAt: string
  freightCny: number
  freightSourceDate: string
  freightSourceFetchedAt: string
  freightSourceUrl: string
  rebateRatePct: number
  rebateSource: 'fixture' | 'fallback'
}

export type ProfitRouteDeps = {
  now?: () => Date
  loadMarketData?: (order: OrderInput, now: Date) => Promise<ProfitMarketData>
  getRebateRate?: typeof getExportRebateRateByHsCode
}

const DEFAULT_NOW = () => new Date()

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

function normalizeDate(value: string | null | undefined): string {
  if (!value) {
    return ''
  }

  return value.slice(0, 10)
}

function readTariffRate(row: TariffHistoryRow): number {
  const value = row.rate_pct ?? row.ratePct
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Missing tariff rate')
  }

  return value
}

function readFreightValue(row: FreightHistoryRow): number {
  const value = row.baseline_freight ?? row.baselineFreight
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Missing freight value')
  }

  return value
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing or invalid ${field}`)
  }
}

function assertNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Missing or invalid ${field}`)
  }
}

function assertEnum<T extends readonly string[]>(value: unknown, field: string, values: T): asserts value is T[number] {
  assertString(value, field)

  if (!values.includes(value as T[number])) {
    throw new Error(`Unsupported ${field}: ${value}`)
  }
}

function assertFreightRouteCompatibility(
  routeKey: unknown,
  destinationCountry: unknown,
  containerType: unknown,
): asserts routeKey is string {
  assertString(routeKey, 'routeKey')
  assertEnum(destinationCountry, 'destinationCountry', PROFIT_COUNTRIES)
  assertEnum(containerType, 'containerType', PROFIT_CONTAINER_TYPES)

  const route = getFreightRouteByKey(routeKey)
  if (!route) {
    throw new Error(`Unsupported routeKey: ${routeKey}`)
  }

  if (route.destinationCountry !== destinationCountry || route.containerType !== containerType) {
    throw new Error(
      `routeKey ${routeKey} is not compatible with destinationCountry ${destinationCountry} and containerType ${containerType}`,
    )
  }
}

function parseOrderInput(payload: unknown): OrderInput {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Request body must be a JSON object')
  }

  const candidate = payload as Record<string, unknown>

  assertEnum(candidate.destinationCountry, 'destinationCountry', PROFIT_COUNTRIES)
  assertString(candidate.hsCode, 'hsCode')
  assertEnum(candidate.tradeTerm, 'tradeTerm', PROFIT_TRADE_TERMS)
  assertEnum(candidate.quoteCurrency, 'quoteCurrency', PROFIT_QUOTE_CURRENCIES)
  assertNumber(candidate.quotedAmount, 'quotedAmount')
  assertNumber(candidate.quantity, 'quantity')
  assertNumber(candidate.productCost, 'productCost')
  assertNumber(candidate.miscFees, 'miscFees')
  assertEnum(candidate.containerType, 'containerType', PROFIT_CONTAINER_TYPES)
  assertFreightRouteCompatibility(candidate.routeKey, candidate.destinationCountry, candidate.containerType)

  if (candidate.quotedAmount <= 0) {
    throw new Error('quotedAmount must be greater than 0')
  }

  if (candidate.quantity <= 0) {
    throw new Error('quantity must be greater than 0')
  }

  if (candidate.productCost < 0) {
    throw new Error('productCost must be greater than or equal to 0')
  }

  if (candidate.miscFees < 0) {
    throw new Error('miscFees must be greater than or equal to 0')
  }

  return {
    destinationCountry: candidate.destinationCountry,
    hsCode: candidate.hsCode.trim(),
    tradeTerm: candidate.tradeTerm,
    quoteCurrency: candidate.quoteCurrency,
    quotedAmount: candidate.quotedAmount,
    quantity: candidate.quantity,
    productCost: candidate.productCost,
    miscFees: candidate.miscFees,
    routeKey: candidate.routeKey.trim(),
    containerType: candidate.containerType,
  }
}

function toMarketSnapshot(
  rebateRatePct: number,
  source: {
    fxRate: number
    tariffRatePct: number
    freightCny: number
  },
): MarketSnapshot {
  return {
    fxRate: source.fxRate,
    tariffRatePct: source.tariffRatePct,
    antiDumpingRatePct: 0,
    exportRebateRatePct: rebateRatePct,
    baselineFreight: source.freightCny,
    overrideFreight: null,
  }
}

function buildMarketSelection(
  rebateRatePct: number,
  rebateSource: 'fixture' | 'fallback',
  fx: FxHistoryRow,
  tariff: TariffHistoryRow,
  freight: FreightHistoryRow,
  fxSourceKind: 'market_rate' | 'synthetic_cny_parity',
): MarketSelection {
  return {
    fxRate: round6(1 / fx.rate),
    fxSourceRate: fx.rate,
    fxSourceDate: fx.date,
    fxSourceKind,
    tariffRatePct: readTariffRate(tariff),
    tariffSourceDate: normalizeDate(tariff.date ?? tariff.fetched_at ?? tariff.fetchedAt),
    tariffSourceFetchedAt: tariff.fetched_at ?? tariff.fetchedAt ?? '',
    freightCny: readFreightValue(freight),
    freightSourceDate: freight.date,
    freightSourceFetchedAt: freight.fetched_at ?? freight.fetchedAt ?? '',
    freightSourceUrl: freight.source_url ?? freight.sourceUrl ?? '',
    rebateRatePct,
    rebateSource,
  }
}

async function loadFxSeries(order: OrderInput, now: Date): Promise<MarketSeries<FxHistoryRow>> {
  const { supabase } = await import('../../../lib/supabase')

  if (order.quoteCurrency === 'CNY') {
    const today = now.toISOString().slice(0, 10)
    const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10)

    return {
      today: { date: today, rate: 1 },
      yesterday: { date: yesterday, rate: 1 },
    }
  }

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('date, rate')
    .eq('target', order.quoteCurrency)
    .order('date', { ascending: false })
    .limit(2)

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as FxHistoryRow[]

  if (rows.length < 2) {
    throw new Error(`Need at least two FX records for ${order.quoteCurrency}`)
  }

  return {
    today: rows[0],
    yesterday: rows[1],
  }
}

async function loadTariffSeries(order: OrderInput): Promise<MarketSeries<TariffHistoryRow>> {
  const { supabase } = await import('../../../lib/supabase')

  const { data, error } = await supabase
    .from('tariffs')
    .select('date:effective_date, fetched_at, rate_pct')
    .eq('country', order.destinationCountry)
    .eq('hs_code', order.hsCode)
    .order('fetched_at', { ascending: false })
    .limit(2)

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as TariffHistoryRow[]

  if (rows.length < 2) {
    throw new Error(`Need at least two tariff records for ${order.destinationCountry} ${order.hsCode}`)
  }

  return {
    today: rows[0],
    yesterday: rows[1],
  }
}

async function loadFreightSeries(order: OrderInput): Promise<MarketSeries<FreightHistoryRow>> {
  const { supabase } = await import('../../../lib/supabase')

  const { data, error } = await supabase
    .from('freight_rates')
    .select('date, baseline_freight, fetched_at, source_url')
    .eq('route_key', order.routeKey)
    .eq('container_type', order.containerType)
    .order('date', { ascending: false })
    .order('fetched_at', { ascending: false })
    .limit(2)

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as FreightHistoryRow[]

  if (rows.length < 2) {
    throw new Error(`Need at least two freight records for ${order.routeKey} ${order.containerType}`)
  }

  return {
    today: rows[0],
    yesterday: rows[1],
  }
}

async function loadMarketData(order: OrderInput, now: Date): Promise<ProfitMarketData> {
  return {
    fx: await loadFxSeries(order, now),
    tariff: await loadTariffSeries(order),
    freight: await loadFreightSeries(order),
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text()

  if (!text.trim()) {
    throw new Error('Request body is required')
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON body')
  }
}

export async function POST(request: Request, deps: ProfitRouteDeps = {}): Promise<Response> {
  try {
    const now = deps.now?.() ?? DEFAULT_NOW()
    const payload = await readJsonBody(request)
    const order = parseOrderInput(payload)
    const rebateLookup = (deps.getRebateRate ?? getExportRebateRateByHsCode)(order.hsCode)
    const marketData = await (deps.loadMarketData ?? loadMarketData)(order, now)

    const todaySelection = buildMarketSelection(
      rebateLookup.ratePct,
      rebateLookup.source,
      marketData.fx.today,
      marketData.tariff.today,
      marketData.freight.today,
      order.quoteCurrency === 'CNY' ? 'synthetic_cny_parity' : 'market_rate',
    )
    const yesterdaySelection = buildMarketSelection(
      rebateLookup.ratePct,
      rebateLookup.source,
      marketData.fx.yesterday,
      marketData.tariff.yesterday,
      marketData.freight.yesterday,
      order.quoteCurrency === 'CNY' ? 'synthetic_cny_parity' : 'market_rate',
    )

    const todaySnapshot = toMarketSnapshot(rebateLookup.ratePct, {
      fxRate: todaySelection.fxRate,
      tariffRatePct: todaySelection.tariffRatePct,
      freightCny: todaySelection.freightCny,
    })
    const yesterdaySnapshot = toMarketSnapshot(rebateLookup.ratePct, {
      fxRate: yesterdaySelection.fxRate,
      tariffRatePct: yesterdaySelection.tariffRatePct,
      freightCny: yesterdaySelection.freightCny,
    })

    const comparison = calculateProfitComparison(order, yesterdaySnapshot, todaySnapshot)
    const attribution = calculateAttribution(order, yesterdaySnapshot, todaySnapshot)

    return Response.json({
      ok: true,
      input: order,
      rebate: rebateLookup,
      selectedMarketValues: {
        today: todaySelection,
        yesterday: yesterdaySelection,
      },
      todayResult: comparison.today,
      yesterdayResult: comparison.yesterday,
      comparison: comparison.deltas,
      attribution,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = /unsupported|invalid|required|greater than 0|Need at least two|Must be/i.test(message) ? 400 : 422

    return Response.json(
      {
        ok: false,
        error: message,
      },
      { status },
    )
  }
}
