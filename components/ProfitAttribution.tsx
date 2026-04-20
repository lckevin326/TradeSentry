'use client'

import type { AttributionResult } from '../lib/profit'

interface ProfitAttributionProps {
  attribution: AttributionResult
}

type DriverKey = 'fxDeltaCny' | 'dutiesDeltaCny' | 'freightDeltaCny'

const ATTRIBUTION_META: Array<{
  key: DriverKey
  label: string
  hint: string
}> = [
  { key: 'fxDeltaCny', label: 'FX', hint: '报价币种折算后的利润变化' },
  { key: 'dutiesDeltaCny', label: 'Tariff', hint: '关税、反倾销与退税净影响' },
  { key: 'freightDeltaCny', label: 'Freight', hint: '基准运费或覆盖运费的变动' },
]

function formatSignedCny(value: number): string {
  const abs = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: abs % 1 === 0 ? 0 : 1,
  }).format(abs)

  return `${value >= 0 ? '+' : '-'}¥${formatted}`
}

function tone(value: number) {
  return value >= 0
    ? {
        direction: 'Positive',
        impact: 'Helping',
        color: 'var(--green)',
        background: 'var(--green-dim)',
      }
    : {
        direction: 'Negative',
        impact: 'Hurting',
        color: 'var(--red)',
        background: 'var(--red-dim)',
      }
}

export default function ProfitAttribution({ attribution }: ProfitAttributionProps) {
  return (
    <section className="space-y-4 page-enter page-enter-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            归因拆解
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            把今日利润变化拆成 FX、税负、运费三个可解释因子。
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ATTRIBUTION_META.map((item) => {
          const value = attribution[item.key]
          const itemTone = tone(value)

          return (
            <div
              key={item.key}
              className="card p-5 flex flex-col gap-3"
              style={{ boxShadow: `0 0 0 1px ${itemTone.background}, inset 0 0 24px ${itemTone.background}` }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                  {item.label}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: itemTone.color, background: itemTone.background }}
                >
                  {itemTone.direction}
                </span>
              </div>

              <div
                className="text-3xl font-semibold leading-none tracking-tight"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}
              >
                {formatSignedCny(value)}
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium" style={{ color: itemTone.color }}>
                  {itemTone.impact}
                </p>
                <p className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                  {item.hint}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
