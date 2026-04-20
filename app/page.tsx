import ProfitDecisionPageClient from '../components/ProfitDecisionPageClient'
import type { FreightChartPoint } from '../components/FreightChart'
import type { ProfitCalculationResponse } from '../components/ProfitCalculator'
import type { DecisionAdvice } from '../lib/profit/advice'
import { deriveDecisionAdvice } from '../lib/profit/decision-advice'
import { deriveHomeSummary, type HomeSummary } from '../lib/profit/home-summary'
import { isSupabaseConfigured, SUPABASE_ENV_ERROR } from '../lib/supabase'

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

type FreightChartRow = {
  date: string
  baseline_freight: number
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
  decisionAdvice: DecisionAdvice | null
  homeSummary: HomeSummary
}

type ProfitDecisionPageDataDeps = {
  supabaseConfigured?: boolean
  seedData?: Omit<ProfitDecisionPageData, 'decisionAdvice'>
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

  return ((data ?? []) as FreightChartRow[]).map((row) => ({
    date: row.date,
    baselineFreight: row.baseline_freight,
  }))
}

export function ProfitDecisionPageContent({ data }: { data: ProfitDecisionPageData }) {
  return <ProfitDecisionPageClient {...data} />
}

export function getPageDecisionAdvice(
  calculation: ProfitCalculationResponse | null,
  recentPoliciesCount: number,
): DecisionAdvice | null {
  return deriveDecisionAdvice(calculation, recentPoliciesCount)
}

export function getPageHomeSummary(
  data: Pick<ProfitDecisionPageData, 'decisionAdvice' | 'aedRate' | 'baselineFreight' | 'tariffStatus' | 'recentPolicies'>,
): HomeSummary {
  return deriveHomeSummary({
    decisionAdvice: data.decisionAdvice,
    aedRate: data.aedRate,
    baselineFreight: data.baselineFreight,
    tariffStatus: data.tariffStatus,
    recentPoliciesCount: data.recentPolicies.length,
  })
}

export async function getProfitDecisionPageData(
  deps: ProfitDecisionPageDataDeps = {},
): Promise<ProfitDecisionPageData> {
  if (deps.seedData) {
    const decisionAdvice = getPageDecisionAdvice(deps.seedData.initialCalculation, deps.seedData.recentPolicies.length)

    return {
      ...deps.seedData,
      decisionAdvice,
      homeSummary: getPageHomeSummary({
        ...deps.seedData,
        decisionAdvice,
      }),
    }
  }

  const supabaseConfigured = deps.supabaseConfigured ?? isSupabaseConfigured

  if (!supabaseConfigured) {
    return {
      baselineFreight: 0,
      aedRate: null,
      fxChartData: [],
      freightChartData: [],
      tariffStatus: {
        dateLabel: '未配置数据源',
        statusLabel: SUPABASE_ENV_ERROR,
      },
      recentPolicies: [],
      initialCalculation: null,
      decisionAdvice: null,
      homeSummary: deriveHomeSummary({
        decisionAdvice: null,
        aedRate: null,
        baselineFreight: 0,
        tariffStatus: {
          dateLabel: '未配置数据源',
          statusLabel: SUPABASE_ENV_ERROR,
        },
        recentPoliciesCount: 0,
      }),
    }
  }

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
    decisionAdvice: null,
    homeSummary: deriveHomeSummary({
      decisionAdvice: null,
      aedRate,
      baselineFreight,
      tariffStatus: {
        dateLabel: tariffDate,
        statusLabel: tariffStatus,
      },
      recentPoliciesCount: recentPolicies.length,
    }),
  }

  return data
}

export default async function DashboardPage() {
  const data = await getProfitDecisionPageData()
  return <ProfitDecisionPageContent data={data} />
}
