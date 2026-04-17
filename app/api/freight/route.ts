type FreightHistoryRow = {
  date: string
  route_key: string
  origin_port: string
  destination_country: string
  destination_port: string
  container_type: string
  baseline_freight: number
  source_url: string | null
  fetched_at: string
}

type FreightHistoryQueryBuilder = {
  select(columns: string): FreightHistoryQueryBuilder
  order(column: string, options: { ascending: boolean }): FreightHistoryQueryBuilder
  eq(column: string, value: string): FreightHistoryQueryBuilder
  gte(column: string, value: string): PromiseLike<FreightHistoryQueryResult>
}

type FreightHistoryDb = {
  from(table: string): FreightHistoryQueryBuilder
}

type FreightHistoryQueryResult = {
  data: FreightHistoryRow[] | null
  error: { message: string } | null
}

export type FreightHistoryQueryOptions = {
  route?: string | null
  container?: string | null
  days?: number | null
  now?: number
}

const FREIGHT_HISTORY_COLUMNS =
  'date, route_key, origin_port, destination_country, destination_port, container_type, baseline_freight, source_url, fetched_at'

function normalizeDays(days: number | null | undefined): number {
  if (typeof days !== 'number' || !Number.isFinite(days) || days <= 0) {
    return 30
  }

  return Math.max(1, Math.ceil(days))
}

function getSinceDate(days: number, now: number): string {
  return new Date(now - days * 86400000).toISOString().slice(0, 10)
}

export function parseFreightHistoryQuery(searchParams: URLSearchParams): FreightHistoryQueryOptions {
  const route = searchParams.get('route') ?? searchParams.get('routeKey')
  const container = searchParams.get('container') ?? searchParams.get('containerType')
  const daysParam = searchParams.get('days')
  const days = daysParam ? Number.parseFloat(daysParam) : 30

  return { route, container, days }
}

export async function fetchFreightHistory(
  db: FreightHistoryDb,
  options: FreightHistoryQueryOptions = {},
): Promise<FreightHistoryQueryResult> {
  const days = normalizeDays(options.days)
  const since = getSinceDate(days, options.now ?? Date.now())

  let query = db.from('freight_rates').select(FREIGHT_HISTORY_COLUMNS)

  if (options.route) {
    query = query.eq('route_key', options.route)
  }

  if (options.container) {
    query = query.eq('container_type', options.container)
  }

  query = query.order('date', { ascending: true })
  query = query.order('fetched_at', { ascending: true })

  const { data, error } = await query.gte('date', since)

  return {
    data: data ?? [],
    error,
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = parseFreightHistoryQuery(searchParams)

  const { supabase } = await import('../../../lib/supabase')
  const freightDb = supabase as unknown as FreightHistoryDb
  const { data, error } = await fetchFreightHistory(freightDb, query)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
