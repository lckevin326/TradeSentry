import { getExportRebateRateByHsCode } from '../rebates'
import { calculateProfitResult } from './calculate'
import type { MarketSnapshot, OrderInput, ProfitResult } from './index'

type FxRow = { date: string; rate: number }
type TariffRow = { rate_pct: number }
type FreightRow = { baseline_freight: number }

async function fetchTodayFx(quoteCurrency: string): Promise<number> {
  if (quoteCurrency === 'CNY') return 1

  const { supabase } = await import('../supabase')
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('target', quoteCurrency)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) throw new Error(`No FX rate for ${quoteCurrency}`)
  return (data as FxRow).rate
}

async function fetchTodayTariff(country: string, hsCode: string): Promise<number> {
  const { supabase } = await import('../supabase')
  const { data, error } = await supabase
    .from('tariffs')
    .select('rate_pct')
    .eq('country', country)
    .eq('hs_code', hsCode)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) throw new Error(`No tariff for ${country} ${hsCode}`)
  return (data as TariffRow).rate_pct
}

async function fetchTodayFreight(routeKey: string, containerType: string): Promise<number> {
  const { supabase } = await import('../supabase')
  const { data, error } = await supabase
    .from('freight_rates')
    .select('baseline_freight')
    .eq('route_key', routeKey)
    .eq('container_type', containerType)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) throw new Error(`No freight for ${routeKey} ${containerType}`)
  return (data as FreightRow).baseline_freight
}

export async function loadTodayMarketSnapshot(order: OrderInput): Promise<MarketSnapshot> {
  const [fxSourceRate, tariffRatePct, baselineFreight, { ratePct: rebateRatePct }] = await Promise.all([
    fetchTodayFx(order.quoteCurrency),
    fetchTodayTariff(order.destinationCountry, order.hsCode),
    fetchTodayFreight(order.routeKey, order.containerType),
    Promise.resolve(getExportRebateRateByHsCode(order.hsCode)),
  ])

  const fxRate = order.quoteCurrency === 'CNY' ? 1 : 1 / fxSourceRate

  return {
    fxRate,
    tariffRatePct,
    antiDumpingRatePct: 0,
    exportRebateRatePct: rebateRatePct,
    baselineFreight,
    overrideFreight: null,
  }
}

export async function calculateTodayProfit(order: OrderInput): Promise<ProfitResult> {
  const snapshot = await loadTodayMarketSnapshot(order)
  return calculateProfitResult(order, snapshot)
}

export function buildYesterdayDateString(today: string): string {
  const d = new Date(today + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

async function fetchFxOnDate(currencies: string[], asOfDate: string): Promise<Map<string, number>> {
  if (currencies.length === 0) return new Map()
  const { supabase } = await import('../supabase')
  const { data } = await supabase
    .from('exchange_rates')
    .select('target, rate, date')
    .in('target', currencies)
    .lte('date', asOfDate)
    .order('date', { ascending: false })

  const seen = new Set<string>()
  const result = new Map<string, number>()
  for (const row of (data ?? []) as { target: string; rate: number; date: string }[]) {
    if (!seen.has(row.target)) {
      seen.add(row.target)
      result.set(row.target, row.rate)
    }
  }
  return result
}

async function fetchTariffOnDate(
  pairs: { country: string; hsCode: string }[],
  asOfDate: string,
): Promise<Map<string, number>> {
  const { supabase } = await import('../supabase')
  const countries = [...new Set(pairs.map(p => p.country))]
  const hsCodes = [...new Set(pairs.map(p => p.hsCode))]
  const { data } = await supabase
    .from('tariffs')
    .select('country, hs_code, rate_pct, fetched_at')
    .in('country', countries)
    .in('hs_code', hsCodes)
    .lte('fetched_at', asOfDate + 'T23:59:59Z')
    .order('fetched_at', { ascending: false })

  const seen = new Set<string>()
  const result = new Map<string, number>()
  for (const row of (data ?? []) as { country: string; hs_code: string; rate_pct: number }[]) {
    const key = `${row.country}:${row.hs_code}`
    if (!seen.has(key)) {
      seen.add(key)
      result.set(key, row.rate_pct)
    }
  }
  return result
}

async function fetchFreightOnDate(
  routeKeys: string[],
  containerType: string,
  asOfDate: string,
): Promise<Map<string, number>> {
  const { supabase } = await import('../supabase')
  const { data } = await supabase
    .from('freight_rates')
    .select('route_key, baseline_freight, date')
    .in('route_key', routeKeys)
    .eq('container_type', containerType)
    .lte('date', asOfDate)
    .order('date', { ascending: false })

  const seen = new Set<string>()
  const result = new Map<string, number>()
  for (const row of (data ?? []) as { route_key: string; baseline_freight: number }[]) {
    if (!seen.has(row.route_key)) {
      seen.add(row.route_key)
      result.set(row.route_key, row.baseline_freight)
    }
  }
  return result
}

export interface BatchMarketSnapshot {
  today: MarketSnapshot | null
  yesterday: MarketSnapshot | null
}

export async function loadAllMarketSnapshots(
  orders: Array<OrderInput & { key: string }>,
  todayDate: string,
): Promise<Map<string, BatchMarketSnapshot>> {
  const { getExportRebateRateByHsCode } = await import('../rebates')
  const yesterdayDate = buildYesterdayDateString(todayDate)

  const currencies = [...new Set(orders.filter(o => o.quoteCurrency !== 'CNY').map(o => o.quoteCurrency))]
  const tariffPairs = orders.map(o => ({ country: o.destinationCountry, hsCode: o.hsCode }))
  const routeKeys = orders.map(o => o.routeKey)
  const containerType = orders[0].containerType

  const [todayFx, yesterdayFx, todayTariff, yesterdayTariff, todayFreight, yesterdayFreight] = await Promise.all([
    fetchFxOnDate(currencies, todayDate),
    fetchFxOnDate(currencies, yesterdayDate),
    fetchTariffOnDate(tariffPairs, todayDate),
    fetchTariffOnDate(tariffPairs, yesterdayDate),
    fetchFreightOnDate(routeKeys, containerType, todayDate),
    fetchFreightOnDate(routeKeys, containerType, yesterdayDate),
  ])

  const result = new Map<string, BatchMarketSnapshot>()

  for (const order of orders) {
    function buildSnapshot(
      fxMap: Map<string, number>,
      tariffMap: Map<string, number>,
      freightMap: Map<string, number>,
    ): MarketSnapshot | null {
      const freightCny = freightMap.get(order.routeKey)
      const tariffRatePct = tariffMap.get(`${order.destinationCountry}:${order.hsCode}`)
      if (freightCny == null || tariffRatePct == null) return null

      let fxRate: number
      if (order.quoteCurrency === 'CNY') {
        fxRate = 1
      } else {
        const fxSource = fxMap.get(order.quoteCurrency)
        if (fxSource == null) return null
        fxRate = 1 / fxSource
      }

      const { ratePct: exportRebateRatePct } = getExportRebateRateByHsCode(order.hsCode)

      return {
        fxRate,
        tariffRatePct,
        antiDumpingRatePct: 0,
        exportRebateRatePct,
        baselineFreight: freightCny,
        overrideFreight: null,
      }
    }

    result.set(order.key, {
      today: buildSnapshot(todayFx, todayTariff, todayFreight),
      yesterday: buildSnapshot(yesterdayFx, yesterdayTariff, yesterdayFreight),
    })
  }

  return result
}
