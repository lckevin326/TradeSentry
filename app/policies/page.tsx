'use client'
import { useEffect, useState } from 'react'
import PolicyTimeline from '@/components/PolicyTimeline'
import PolicyRateChart from '@/components/PolicyRateChart'
import { safeFetchJson } from '@/lib/http'
import type { Policy, ExchangeRate, PolicySource } from '@/types'

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [rates, setRates] = useState<Pick<ExchangeRate, 'date' | 'rate'>[]>([])
  const [source, setSource] = useState<PolicySource | ''>('')

  useEffect(() => {
    const srcParam = source ? `&source=${source}` : ''
    safeFetchJson<Policy[]>(`/api/policies?relevant=false${srcParam}`, { fallback: [] }).then(setPolicies)
  }, [source])

  useEffect(() => {
    safeFetchJson<Pick<ExchangeRate, 'date' | 'rate'>[]>(
      '/api/exchange-rates?target=AED&days=90',
      { fallback: [] },
    ).then(setRates)
  }, [])

  return (
    <div className="space-y-6">
      <div className="page-enter">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>政策</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>商务部 · WTO 涉轮胎相关政策动态</p>
      </div>
      <PolicyRateChart rates={rates} policies={policies} />
      <PolicyTimeline data={policies} source={source} onSourceChange={setSource} />
    </div>
  )
}
