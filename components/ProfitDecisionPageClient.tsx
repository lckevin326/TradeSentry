'use client'

import { useState } from 'react'

import AlertBanner from './AlertBanner'
import FreightChart, { type FreightChartPoint } from './FreightChart'
import ProfitAttribution from './ProfitAttribution'
import ProfitCalculator, { type ProfitCalculationResponse } from './ProfitCalculator'
import ProfitSummary from './ProfitSummary'
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

export default function ProfitDecisionPageClient({
  baselineFreight,
  aedRate,
  fxChartData,
  freightChartData,
  tariffStatus,
  recentPolicies,
  initialCalculation,
}: ProfitDecisionPageClientProps) {
  const [calculation, setCalculation] = useState(initialCalculation)
  const [freightDays, setFreightDays] = useState(30)

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

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ProfitCalculator
          baselineFreight={baselineFreight}
          onCalculated={setCalculation}
        />

        {calculation?.todayResult && calculation.yesterdayResult && calculation.attribution ? (
          <ProfitSummary
            todayResult={calculation.todayResult}
            yesterdayResult={calculation.yesterdayResult}
            attribution={calculation.attribution}
          />
        ) : (
          <div className="card p-5 page-enter page-enter-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              决策摘要
            </span>
            <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--text)' }}>
              先提交一笔订单参数
            </h2>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
              提交后会直接显示今日利润、较昨日变化以及主导因子，不再分散跳到别的页面查看。
            </p>
          </div>
        )}
      </div>

      {calculation?.attribution ? (
        <ProfitAttribution attribution={calculation.attribution} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
        <div className="card p-5 page-enter page-enter-3">
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

        <FreightChart
          data={freightChartData}
          days={freightDays}
          onDaysChange={setFreightDays}
          title="中东航线基准运费"
        />

        <div className="card p-5 page-enter page-enter-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            政策与税率观察
          </h2>

          <div className="mt-4 rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <div className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              最近关税更新
            </div>
            <div className="mt-2 text-lg font-semibold" style={{ color: 'var(--text)' }}>
              {tariffStatus.dateLabel}
            </div>
            <div className="mt-1 text-sm" style={{ color: 'var(--red)' }}>
              {tariffStatus.statusLabel}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              最新政策
            </div>
            <div className="mt-3 space-y-3">
              {recentPolicies.length === 0 ? (
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                  暂无相关政策
                </div>
              ) : (
                recentPolicies.map((policy) => (
                  <div
                    key={policy.id}
                    className="rounded-lg border px-3 py-3"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  >
                    <div className="text-sm font-medium leading-6" style={{ color: 'var(--text)' }}>
                      {policy.title}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>
                      {policy.published_at}
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
