'use client'

import type { DecisionBriefResult } from '../lib/ai/decision-brief'

export type ProfitDecisionAiBriefState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  brief: DecisionBriefResult | null
  error: string | null
}

interface ProfitDecisionAiBriefProps {
  state: ProfitDecisionAiBriefState
  disabled?: boolean
  onGenerate?: (() => void) | null
  buttonLabel?: string
  emptyMessage?: string
}

export function createIdleAiBriefState(): ProfitDecisionAiBriefState {
  return {
    status: 'idle',
    brief: null,
    error: null,
  }
}

export function createLoadingAiBriefState(current: ProfitDecisionAiBriefState): ProfitDecisionAiBriefState {
  return {
    ...current,
    status: 'loading',
    error: null,
  }
}

export function createReadyAiBriefState(brief: DecisionBriefResult): ProfitDecisionAiBriefState {
  return {
    status: 'ready',
    brief,
    error: null,
  }
}

export function createErrorAiBriefState(
  current: ProfitDecisionAiBriefState,
  error: string,
): ProfitDecisionAiBriefState {
  return {
    status: 'error',
    brief: current.brief,
    error,
  }
}

export default function ProfitDecisionAiBrief({
  state,
  disabled = false,
  onGenerate = null,
  buttonLabel = '生成 AI 解读',
  emptyMessage = '可手动生成 AI 解读。',
}: ProfitDecisionAiBriefProps) {
  return (
    <div className="rounded-lg border px-4 py-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            AI解读
          </div>
          {state.brief ? (
            <div className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>
              {state.brief.model} · {state.brief.generatedAt}
            </div>
          ) : null}
        </div>

        {onGenerate ? (
          <button
            type="button"
            onClick={onGenerate}
            disabled={disabled || state.status === 'loading'}
            className="rounded-lg px-3 py-2 text-xs font-medium transition-colors"
            style={{
              background: 'var(--text)',
              color: 'white',
              opacity: disabled || state.status === 'loading' ? 0.7 : 1,
            }}
          >
            {state.status === 'loading' ? '生成中...' : buttonLabel}
          </button>
        ) : null}
      </div>

      {state.status === 'ready' && state.brief ? (
        <p className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
          {state.brief.analysis}
        </p>
      ) : null}

      {state.status === 'error' && state.error ? (
        <div
          className="rounded-lg border px-3 py-3 text-sm"
          style={{ borderColor: 'rgba(220,38,38,0.25)', background: 'var(--red-dim)', color: 'var(--red)' }}
        >
          {state.error}
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <p className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
          正在生成经营解释，请稍候。
        </p>
      ) : null}

      {state.status === 'idle' ? (
        <p className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
          {emptyMessage}
        </p>
      ) : null}
    </div>
  )
}
