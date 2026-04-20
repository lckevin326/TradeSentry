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
