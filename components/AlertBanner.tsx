'use client'
import { useEffect, useState } from 'react'
import type { Alert } from '@/types'

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

  const colorMap: Record<string, string> = {
    high: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    low: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  return (
    <div className="space-y-2 mb-4">
      {alerts.map(alert => (
        <div key={alert.id} className={`flex items-start justify-between p-3 rounded border text-sm ${colorMap[alert.severity]}`}>
          <span>{alert.message}</span>
          <button onClick={() => dismiss(alert.id)} className="ml-4 opacity-60 hover:opacity-100 shrink-0">✕</button>
        </div>
      ))}
    </div>
  )
}
