'use client'

import type { AttributionResult, ProfitResult } from '../lib/profit'

interface ProfitSummaryProps {
  todayResult: ProfitResult
  yesterdayResult: ProfitResult
  attribution: AttributionResult
}

type DriverTone = {
  action: string
  risk: string
}

const DRIVER_LABELS = {
  fx: 'FX',
  tariff: 'Tariff',
  freight: 'Freight',
} as const satisfies Record<AttributionResult['dominantDriver'], string>

const DRIVER_TONES: Record<AttributionResult['dominantDriver'], DriverTone> = {
  fx: {
    action: '动作：保留美元报价节奏',
    risk: '风险：汇率回吐会直接压缩利润',
  },
  tariff: {
    action: '动作：马上复核税负与退税口径',
    risk: '风险：税负继续抬升会吞掉新增订单',
  },
  freight: {
    action: '动作：马上重算运费并锁价',
    risk: '风险：运费继续走高会吞掉安全垫',
  },
}

function formatCny(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

function formatSignedCny(value: number): string {
  const rounded = Math.round(value)
  return `${rounded >= 0 ? '+' : '-'}¥${formatCny(Math.abs(rounded))}`
}

function formatMargin(value: number): string {
  return `${value.toFixed(2)}%`
}

function statusTone(value: number) {
  return value >= 0
    ? { label: 'Helping', color: 'var(--green)', background: 'var(--green-dim)' }
    : { label: 'Hurting', color: 'var(--red)', background: 'var(--red-dim)' }
}

function cardTone(value: number) {
  return value >= 0
    ? { subColor: 'var(--green)', glow: 'var(--green-dim)' }
    : { subColor: 'var(--red)', glow: 'var(--red-dim)' }
}

function dominantDriverDelta(attribution: AttributionResult): number {
  switch (attribution.dominantDriver) {
    case 'fx':
      return attribution.fxDeltaCny
    case 'tariff':
      return attribution.dutiesDeltaCny
    case 'freight':
      return attribution.freightDeltaCny
  }
}

export default function ProfitSummary({
  todayResult,
  yesterdayResult,
  attribution,
}: ProfitSummaryProps) {
  const profitDelta = todayResult.profitCny - yesterdayResult.profitCny
  const dominantDriver = attribution.dominantDriver
  const driverDelta = dominantDriverDelta(attribution)
  const driverTone = statusTone(driverDelta)
  const driverCopy = DRIVER_TONES[dominantDriver]
  const profitTone = cardTone(todayResult.profitCny)
  const deltaTone = cardTone(profitDelta)

  return (
    <section className="space-y-4 page-enter page-enter-3">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.1fr_1.3fr]">
        <div
          className="card p-5 flex flex-col gap-2"
          style={{ boxShadow: `0 0 0 1px ${profitTone.glow}, inset 0 0 24px ${profitTone.glow}` }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            今日利润
          </span>
          <span
            className="text-3xl font-semibold leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}
          >
            ¥{formatCny(todayResult.profitCny)}
          </span>
          <span className="text-xs font-medium" style={{ color: profitTone.subColor }}>
            成本后剩余贡献利润
          </span>
        </div>

        <div className="card p-5 flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            利润率
          </span>
          <span
            className="text-3xl font-semibold leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}
          >
            {formatMargin(todayResult.marginPct)}
          </span>
          <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
            较昨日 {formatSignedCny(profitDelta)}
          </span>
        </div>

        <div
          className="card p-5 flex flex-col gap-3"
          style={{ boxShadow: `0 0 0 1px ${driverTone.background}, inset 0 0 28px ${driverTone.background}` }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              主导因子
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: driverTone.color, background: driverTone.background }}
            >
              {driverTone.label}
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <span
              className="text-2xl font-semibold leading-none"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}
            >
              {DRIVER_LABELS[dominantDriver]}
            </span>
            <span className="text-sm font-medium" style={{ color: deltaTone.subColor }}>
              {formatSignedCny(attribution.totalDeltaCny)}
            </span>
          </div>
          <div className="space-y-1 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
            <p>{driverCopy.action}</p>
            <p>{driverCopy.risk}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
