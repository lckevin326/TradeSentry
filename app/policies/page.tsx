'use client'
import { useEffect, useState } from 'react'
import PolicyTimeline from '@/components/PolicyTimeline'
import PolicyRateChart from '@/components/PolicyRateChart'
import type { Policy, ExchangeRate, PolicySource } from '@/types'

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [rates, setRates] = useState<Pick<ExchangeRate, 'date' | 'rate'>[]>([])
  const [source, setSource] = useState<PolicySource | ''>('')

  useEffect(() => {
    const srcParam = source ? `&source=${source}` : ''
    fetch(`/api/policies?relevant=false${srcParam}`)
      .then(r => r.json()).then(setPolicies)
  }, [source])

  useEffect(() => {
    fetch('/api/exchange-rates?target=AED&days=90')
      .then(r => r.json()).then(setRates)
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">政策动态</h1>
      <PolicyRateChart rates={rates} policies={policies} />
      <PolicyTimeline data={policies} source={source} onSourceChange={setSource} />
    </div>
  )
}
