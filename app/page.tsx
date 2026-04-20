import ProfitDecisionPageClient from '../components/ProfitDecisionPageClient'
import type { FreightChartPoint } from '../components/FreightChart'
import type { ProfitCalculationResponse } from '../components/ProfitCalculator'

export const revalidate = 300

type LatestRate = {
  rate: number | null
  change_pct: number | null
  date: string | null
}

type RateChartPoint = {
  date: string
  rate: number
  change_pct: number | null
}

type RecentPolicy = {
  id: string
  title: string
  published_at: string
}

export interface ProfitDecisionPageData {
  baselineFreight: number
  aedRate: LatestRate | null
  fxChartData: RateChartPoint[]
  freightChartData: FreightChartPoint[]
  tariffStatus: {
    dateLabel: string
    statusLabel: string
  }
  recentPolicies: RecentPolicy[]
  initialCalculation: ProfitCalculationResponse | null
}

async function getLatestRate(target: string): Promise<LatestRate | null> {
  const { supabase } = await import('../lib/supabase')
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate, change_pct, date')
    .eq('target', target)
    .order('date', { ascending: false })
    .limit(1)
    .single()
  return data
}

async function getLatestTariffUpdate() {
  const { supabase } = await import('../lib/supabase')
  const { data } = await supabase
    .from('tariffs')
    .select('fetched_at, changed')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

async function getRecentPolicies(): Promise<RecentPolicy[]> {
  const { supabase } = await import('../lib/supabase')
  const { data } = await supabase
    .from('policies')
    .select('id, title, published_at')
    .eq('is_relevant', true)
    .order('published_at', { ascending: false })
    .limit(3)
  return (data ?? []) as RecentPolicy[]
}

async function getChartData(target: string): Promise<RateChartPoint[]> {
  const { supabase } = await import('../lib/supabase')
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('exchange_rates')
    .select('date, rate, change_pct')
    .eq('target', target)
    .gte('date', since)
    .order('date', { ascending: true })
  return data ?? []
}

async function getFreightChartData(routeKey: string, containerType: string): Promise<FreightChartPoint[]> {
  const { supabase } = await import('../lib/supabase')
  const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('freight_rates')
    .select('date, baseline_freight')
    .eq('route_key', routeKey)
    .eq('container_type', containerType)
    .gte('date', since)
    .order('date', { ascending: true })

  return (data ?? []).map((row) => ({
    date: row.date,
    baselineFreight: row.baseline_freight,
  }))
}

export function ProfitDecisionPageContent({ data }: { data: ProfitDecisionPageData }) {
  return <ProfitDecisionPageClient {...data} />
}

export default async function DashboardPage() {
  const [aedRate, tariffUpdate, fxChartData, freightChartData, recentPolicies] = await Promise.all([
    getLatestRate('AED'),
    getLatestTariffUpdate(),
    getChartData('AED'),
    getFreightChartData('shanghai-jebel-ali-20gp', '20GP'),
    getRecentPolicies(),
  ])

  const tariffDate = tariffUpdate?.fetched_at
    ? new Date(tariffUpdate.fetched_at).toLocaleDateString('zh-CN')
    : '尚未抓取'
  const tariffStatus = tariffUpdate?.changed ? '有税率变化 ⚠' : '税率稳定'
  const baselineFreight = freightChartData[freightChartData.length - 1]?.baselineFreight ?? 0

  const data: ProfitDecisionPageData = {
    baselineFreight,
    aedRate,
    fxChartData,
    freightChartData,
    tariffStatus: {
      dateLabel: tariffDate,
      statusLabel: tariffStatus,
    },
    recentPolicies,
    initialCalculation: null,
  }

  return <ProfitDecisionPageContent data={data} />
}
