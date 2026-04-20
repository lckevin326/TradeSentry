'use client'

import { useState } from 'react'

import type { DecisionBriefInput, DecisionBriefResult } from '../lib/ai/decision-brief'
import type { DecisionAdvice } from '../lib/profit'
import { deriveDecisionAdvice } from '../lib/profit/decision-advice'
import { deriveHomeSummary, type HomeSummary } from '../lib/profit/home-summary'

import AlertBanner from './AlertBanner'
import DecisionAdviceCard from './DecisionAdviceCard'
import FreightChart, { type FreightChartPoint } from './FreightChart'
import HomeSummaryCard from './HomeSummaryCard'
import ProfitAttribution from './ProfitAttribution'
import {
  createErrorAiBriefState,
  createIdleAiBriefState,
  createLoadingAiBriefState,
  createReadyAiBriefState,
  type ProfitDecisionAiBriefState,
} from './ProfitDecisionAiBrief'
import ProfitCalculator, { type ProfitCalculationResponse } from './ProfitCalculator'
import ProfitSummary from './ProfitSummary'
import RateCard from './RateCard'
import RateChart from './RateChart'

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

interface ProfitDecisionPageClientProps {
  baselineFreight: number
  aedRate: {
    rate: number | null
    change_pct: number | null
    date: string | null
  } | null
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
  initialAiBriefState?: ProfitDecisionAiBriefState
}

function changeLabel(value: number | null | undefined): string {
  if (value == null) {
    return '暂无数据'
  }

  return `${value > 0 ? '+' : ''}${value}%`
}

function changeTone(value: number | null | undefined): 'var(--green)' | 'var(--red)' | 'var(--text-2)' {
  if (value == null) {
    return 'var(--text-2)'
  }

  return value > 0 ? 'var(--green)' : 'var(--red)'
}

function formatMetricValue(value: number | null | undefined, digits = 0): string {
  if (value == null) {
    return '—'
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function buildDecisionBriefInput(input: {
  calculation: ProfitCalculationResponse | null
  decisionAdvice: DecisionAdvice | null
  aedRate: ProfitDecisionPageClientProps['aedRate']
  baselineFreight: number
  tariffStatus: ProfitDecisionPageClientProps['tariffStatus']
  policyCount: number
}): DecisionBriefInput | null {
  const { calculation, decisionAdvice } = input

  if (!calculation?.todayResult || !calculation.yesterdayResult || !calculation.attribution || !decisionAdvice) {
    return null
  }

  return {
    statusLabel: decisionAdvice.statusLabel,
    summary: decisionAdvice.summary,
    executiveSummary: decisionAdvice.executiveSummary ?? decisionAdvice.summary,
    dominantDriverLabel: decisionAdvice.dominantDriverLabel,
    actionLabel: decisionAdvice.actionLabel,
    warnings: decisionAdvice.warnings,
    driverBreakdown: decisionAdvice.driverBreakdown ?? [],
    todayProfit: calculation.todayResult.profitCny,
    todayMargin: calculation.todayResult.marginPct,
    profitDeltaCny: decisionAdvice.profitDeltaCny,
    profitDeltaPct: decisionAdvice.profitDeltaPct,
    aedRate: input.aedRate?.rate ?? null,
    aedChangePct: input.aedRate?.change_pct ?? null,
    baselineFreight: input.baselineFreight,
    policyCount: input.policyCount,
    tariffStatus: input.tariffStatus.statusLabel,
  }
}

export async function requestDecisionAiBrief(
  payload: DecisionBriefInput,
  fetcher: (input: string | URL | Request, init?: RequestInit) => Promise<Response> = fetch,
): Promise<DecisionBriefResult> {
  const response = await fetcher('/api/ai/decision-brief', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = (await response.json()) as {
    ok?: boolean
    data?: DecisionBriefResult
    error?: string
  }

  if (!response.ok || result.ok === false || !result.data) {
    throw new Error(result.error ?? 'AI 解读生成失败，请稍后重试。')
  }

  return result.data
}

export async function runDecisionAiBriefFlow(
  payload: DecisionBriefInput,
  currentState: ProfitDecisionAiBriefState,
  requester: (payload: DecisionBriefInput) => Promise<DecisionBriefResult> = requestDecisionAiBrief,
): Promise<ProfitDecisionAiBriefState> {
  try {
    const brief = await requester(payload)
    return createReadyAiBriefState(brief)
  } catch (error) {
    return createErrorAiBriefState(
      currentState,
      error instanceof Error ? error.message : 'AI 解读生成失败，请稍后重试。',
    )
  }
}

export function deriveLiveDecisionState(input: {
  calculation: ProfitCalculationResponse
  policyCount: number
  aedRate: ProfitDecisionPageClientProps['aedRate']
  baselineFreight: number
  tariffStatus: ProfitDecisionPageClientProps['tariffStatus']
}) {
  const decisionAdvice = deriveDecisionAdvice(input.calculation, input.policyCount)
  const homeSummary = deriveHomeSummary({
    decisionAdvice,
    aedRate: input.aedRate,
    baselineFreight: input.baselineFreight,
    tariffStatus: input.tariffStatus,
    recentPoliciesCount: input.policyCount,
  })

  return { decisionAdvice, homeSummary }
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

async function saveQuote(calculation: ProfitCalculationResponse): Promise<void> {
  const today = calculation.selectedMarketValues?.today
  if (!calculation.todayResult || !today) throw new Error('No result to save')

  const response = await fetch('/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: calculation.input,
      savedMarginPct: calculation.todayResult.marginPct,
      savedProfitCny: calculation.todayResult.profitCny,
      savedFxRate: today.fxRate,
      savedTariffPct: today.tariffRatePct,
      savedFreightCny: today.freightCny,
      savedRebatePct: today.rebateRatePct,
    }),
  })
  const json = (await response.json()) as { ok?: boolean; error?: string }
  if (!json.ok) throw new Error(json.error ?? 'Save failed')
}

export default function ProfitDecisionPageClient({
  baselineFreight,
  aedRate,
  fxChartData,
  freightChartData,
  tariffStatus,
  recentPolicies,
  initialCalculation,
  decisionAdvice: initialDecisionAdvice,
  homeSummary: initialHomeSummary,
  initialAiBriefState = createIdleAiBriefState(),
}: ProfitDecisionPageClientProps) {
  const [calculation, setCalculation] = useState(initialCalculation)
  const [decisionAdvice, setDecisionAdvice] = useState(initialDecisionAdvice)
  const [homeSummary, setHomeSummary] = useState(initialHomeSummary)
  const [aiBriefState, setAiBriefState] = useState(initialAiBriefState)
  const [freightDays, setFreightDays] = useState(30)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const latestFreight = freightChartData[freightChartData.length - 1]?.baselineFreight ?? null
  const policyCount = recentPolicies.length
  const todayProfit = calculation?.todayResult?.profitCny ?? null
  const todayMargin = calculation?.todayResult?.marginPct ?? null
  const aiBriefPayload = buildDecisionBriefInput({
    calculation,
    decisionAdvice,
    aedRate,
    baselineFreight,
    tariffStatus,
    policyCount,
  })

  const handleGenerateAiBrief = async () => {
    if (!aiBriefPayload) {
      return
    }

    setAiBriefState((current) => createLoadingAiBriefState(current))

    try {
      const nextState = await runDecisionAiBriefFlow(aiBriefPayload, aiBriefState)
      setAiBriefState(nextState)
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="page-enter">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
          利润决策页
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
          同一页面看报价输入、利润变化、归因拆解和关键外部波动。
        </p>
      </div>

      <AlertBanner />

      <HomeSummaryCard
        summary={homeSummary}
        aiBrief={aiBriefState}
        aiBriefDisabled={!aiBriefPayload}
        onGenerateAiBrief={handleGenerateAiBrief}
      />

      <DecisionAdviceCard advice={decisionAdvice} aiBrief={aiBriefState} />

      <div className="grid gap-5 2xl:grid-cols-[1.35fr_0.85fr]">
        <div className="card p-5 page-enter page-enter-3 space-y-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                AED 近30日走势
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
                报价折算先看汇率，利润弹性会最先体现在这里。
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                {aedRate?.rate?.toFixed(4) ?? '—'}
              </div>
              <div className="text-xs font-medium" style={{ color: changeTone(aedRate?.change_pct) }}>
                {changeLabel(aedRate?.change_pct)}
              </div>
            </div>
          </div>
          <RateChart data={fxChartData} />
        </div>

        <div className="card p-5 page-enter page-enter-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            预警中心
          </h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                关税状态
              </div>
              <div className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
                {tariffStatus.statusLabel}
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>
                更新于 {tariffStatus.dateLabel}
              </div>
            </div>
            <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                运费状态
              </div>
              <div className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
                {latestFreight != null ? `已加载默认运费 ¥${formatMetricValue(latestFreight)}，来源于 CCFI 中东指数映射` : '运费源未抓取，利润测算会缺少默认值'}
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>
                目前支持 UAE / SA 两条中东航线，用户仍可手工覆盖
              </div>
            </div>
            <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                政策动态
              </div>
              <div className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
                {policyCount > 0 ? `最近有 ${policyCount} 条相关政策需要观察` : '暂无新增政策'}
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>
                详情见右下政策时间线
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <ProfitCalculator
            baselineFreight={baselineFreight}
            onCalculated={(nextCalculation) => {
              const nextDecisionState = deriveLiveDecisionState({
                calculation: nextCalculation,
                policyCount,
                aedRate,
                baselineFreight,
                tariffStatus,
              })

              setCalculation(nextCalculation)
              setDecisionAdvice(nextDecisionState.decisionAdvice)
              setHomeSummary(nextDecisionState.homeSummary)
              setAiBriefState(createIdleAiBriefState())
              setSaveState('idle')
            }}
          />

          {calculation?.todayResult && calculation.yesterdayResult && calculation.attribution ? (
            <>
              <ProfitSummary
                todayResult={calculation.todayResult}
                yesterdayResult={calculation.yesterdayResult}
                attribution={calculation.attribution}
              />
              <ProfitAttribution attribution={calculation.attribution} />
              <div className="card p-4 flex items-center justify-between gap-4">
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  保存后可在「报价历史」中对比同一报价在不同时间点的利润率变化。
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {saveState === 'saved' && (
                    <span className="text-sm" style={{ color: 'var(--green)' }}>已保存</span>
                  )}
                  {saveState === 'error' && (
                    <span className="text-sm" style={{ color: 'var(--red)' }}>保存失败，请重试</span>
                  )}
                  <button
                    type="button"
                    disabled={saveState === 'saving'}
                    onClick={async () => {
                      if (!calculation) return
                      setSaveState('saving')
                      try {
                        await saveQuote(calculation)
                        setSaveState('saved')
                      } catch {
                        setSaveState('error')
                      }
                    }}
                    className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    style={{
                      background: saveState === 'saved' ? 'var(--green-dim)' : 'var(--surface-2)',
                      color: saveState === 'saved' ? 'var(--green)' : 'var(--text)',
                      border: '1px solid var(--border)',
                      opacity: saveState === 'saving' ? 0.6 : 1,
                    }}
                  >
                    {saveState === 'saving' ? '保存中...' : '保存此次报价 →'}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="space-y-5">
          <FreightChart
            data={freightChartData}
            days={freightDays}
            onDaysChange={setFreightDays}
            title="中东航线默认运费"
          />

          <div className="card p-5 page-enter page-enter-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              政策动态与时间轴
            </h2>

            <div className="mt-4 space-y-4">
              {recentPolicies.length === 0 ? (
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                  暂无相关政策
                </div>
              ) : (
                recentPolicies.map((policy, index) => (
                  <div key={policy.id} className="flex gap-3">
                    <div className="flex flex-col items-center pt-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background: index === 0 ? 'var(--red)' : index === 1 ? 'var(--gold-l)' : 'var(--blue)',
                        }}
                      />
                      {index < recentPolicies.length - 1 ? (
                        <span className="mt-1 h-full w-px" style={{ background: 'var(--border)' }} />
                      ) : null}
                    </div>
                    <div className="pb-2">
                      <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {policy.published_at}
                      </div>
                      <div className="mt-1 text-sm font-medium leading-6" style={{ color: 'var(--text)' }}>
                        {policy.title}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
