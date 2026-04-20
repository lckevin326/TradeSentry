'use client'

import type { DecisionAdvice } from '../lib/profit'
import type { ProfitDecisionAiBriefState } from './ProfitDecisionAiBrief'
import ProfitDecisionAiBrief from './ProfitDecisionAiBrief'

interface DecisionAdviceCardProps {
  advice: DecisionAdvice | null
  aiBrief?: ProfitDecisionAiBriefState | null
}

function statusTone(status: DecisionAdvice['status']) {
  switch (status) {
    case 'healthy':
      return {
        color: 'var(--green)',
        background: 'var(--green-dim)',
        glow: 'rgba(34, 197, 94, 0.18)',
      }
    case 'watch':
      return {
        color: 'var(--gold-d)',
        background: 'rgba(245, 158, 11, 0.14)',
        glow: 'rgba(245, 158, 11, 0.16)',
      }
    case 'pressure':
      return {
        color: 'var(--red)',
        background: 'var(--red-dim)',
        glow: 'rgba(220, 38, 38, 0.14)',
      }
  }
}

export default function DecisionAdviceCard({ advice, aiBrief = null }: DecisionAdviceCardProps) {
  if (advice == null) {
    return (
      <section className="card p-5 page-enter page-enter-3 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
          决策建议
        </h2>
        <div
          className="rounded-lg border px-4 py-4"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
        >
          <p className="text-sm font-medium leading-6" style={{ color: 'var(--text-2)' }}>
            完成测算后生成建议
          </p>
        </div>
        {aiBrief ? (
          <ProfitDecisionAiBrief state={aiBrief} emptyMessage="完成测算后可生成 AI 解读。" />
        ) : null}
      </section>
    )
  }

  const tone = statusTone(advice.status)

  return (
    <section
      className="card p-5 page-enter page-enter-3 space-y-4"
      style={{ boxShadow: `0 0 0 1px ${tone.glow}, inset 0 0 32px ${tone.glow}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            决策建议
          </h2>
          <p className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
            {advice.summary}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
          style={{ color: tone.color, background: tone.background }}
        >
          {advice.statusLabel}
        </span>
      </div>

      {advice.executiveSummary ? (
        <div className="rounded-lg border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
          <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            经营摘要
          </div>
          <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
            {advice.executiveSummary}
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
          <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            主驱动
          </div>
          <div className="mt-2 text-lg font-semibold" style={{ color: 'var(--text)' }}>
            {advice.dominantDriverLabel}
          </div>
        </div>

        <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
          <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            建议动作
          </div>
          <div className="mt-2 text-lg font-semibold" style={{ color: 'var(--text)' }}>
            {advice.actionLabel}
          </div>
        </div>
      </div>

      {advice.driverBreakdown && advice.driverBreakdown.length > 0 ? (
        <div className="rounded-lg border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
          <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            驱动拆解
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {advice.driverBreakdown.map((item) => (
              <div key={item.label} className="rounded-lg border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'white' }}>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {item.label}
                </div>
                <div className="mt-2 text-base font-semibold" style={{ color: 'var(--text)' }}>
                  {item.impactCny > 0 ? '+' : ''}
                  {item.impactCny}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {advice.warnings.length > 0 ? (
        <div className="rounded-lg border px-4 py-4" style={{ borderColor: tone.background, background: 'var(--surface-2)' }}>
          <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            风险提醒
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
            {advice.warnings.map((warning) => (
              <li key={warning} className="flex gap-2">
                <span style={{ color: tone.color }}>•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {aiBrief ? <ProfitDecisionAiBrief state={aiBrief} emptyMessage="可手动生成 AI 解读。" /> : null}
    </section>
  )
}
