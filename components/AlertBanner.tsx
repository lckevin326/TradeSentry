'use client'
import { useEffect, useState } from 'react'
import type { Alert } from '@/types'

const severityStyle: Record<string, { border: string; bg: string; icon: string }> = {
  high:   { border: 'var(--red)',    bg: 'var(--red-dim)',  icon: '⚠' },
  medium: { border: 'var(--gold-l)', bg: 'var(--gold-dim)', icon: '●' },
  low:    { border: 'var(--blue)',   bg: 'var(--blue-dim)', icon: '◉' },
}

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    fetch('/api/alerts').then(r => r.json()).then(setAlerts)
  }, [])

  if (alerts.length === 0) return null

  const dismiss = async (id: string) => {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-2 mb-6 page-enter">
      {alerts.map(alert => {
        const s = severityStyle[alert.severity] ?? severityStyle.low
        return (
          <div
            key={alert.id}
            className="flex items-start justify-between px-4 py-3 rounded-lg text-sm"
            style={{ background: s.bg, borderLeft: `3px solid ${s.border}`, color: 'var(--text)' }}
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <span className="mt-0.5 shrink-0 text-xs" style={{ color: s.border }}>{s.icon}</span>
              <span className="leading-snug">{alert.message}</span>
            </div>
            <button
              onClick={() => dismiss(alert.id)}
              className="ml-4 shrink-0 text-xs rounded p-1 transition-colors"
              style={{ color: 'var(--text-2)' }}
              title="关闭"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
