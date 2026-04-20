'use client'

import type { HomeSummary } from '../lib/profit/home-summary'
import ProfitDecisionAiBrief, { type ProfitDecisionAiBriefState } from './ProfitDecisionAiBrief'

interface HomeSummaryCardProps {
  summary: HomeSummary
  aiBrief?: ProfitDecisionAiBriefState | null
  aiBriefDisabled?: boolean
  onGenerateAiBrief?: (() => void) | null
}

function stateTone(state: HomeSummary['state']) {
  switch (state) {
    case 'ready':
      return {
        color: 'var(--blue)',
        background: 'rgba(37, 99, 235, 0.12)',
        border: 'rgba(37, 99, 235, 0.18)',
      }
    case 'pending':
      return {
        color: 'var(--text-2)',
        background: 'var(--surface-2)',
        border: 'var(--border)',
      }
  }
}

export default function HomeSummaryCard({
  summary,
  aiBrief = null,
  aiBriefDisabled = false,
  onGenerateAiBrief = null,
}: HomeSummaryCardProps) {
  const tone = stateTone(summary.state)

  return (
    <section className="card p-5 page-enter page-enter-3 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            今日出口环境摘要
          </h2>
          <p className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
            {summary.conclusion}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
          style={{ color: tone.color, background: tone.background, border: `1px solid ${tone.border}` }}
        >
          {summary.state === 'ready' ? '已生成' : '等待测算'}
        </span>
      </div>

      {summary.state === 'ready' ? (
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              三条关键信号
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
              {summary.keySignals.map((signal) => (
                <li key={signal} className="flex gap-2">
                  <span style={{ color: 'var(--blue)' }}>•</span>
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              当日关注项
            </div>
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
              {summary.focus}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
          <p className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
            {summary.focus}
          </p>
        </div>
      )}

      {aiBrief ? (
        <ProfitDecisionAiBrief
          state={aiBrief}
          disabled={aiBriefDisabled}
          onGenerate={onGenerateAiBrief}
          buttonLabel={aiBrief.brief ? '重新生成' : '生成 AI 解读'}
          emptyMessage={summary.state === 'ready' ? '可手动生成 AI 解读。' : '完成测算后可生成 AI 解读。'}
        />
      ) : null}
    </section>
  )
}
