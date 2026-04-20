'use client'
import { useEffect, useState, useCallback } from 'react'
import TariffTable from '@/components/TariffTable'
import { safeFetchJson } from '@/lib/http'
import type { Tariff } from '@/types'

export default function TariffsPage() {
  const [data, setData] = useState<Tariff[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(() => {
    return safeFetchJson<Tariff[]>('/api/tariffs', { fallback: [] }).then(setData)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleRefresh = async () => {
    setLoading(true)
    await fetch('/api/fetch/tariffs', { method: 'POST' })
    await loadData()
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="page-enter">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>关税</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>GCC 六国 · HS 4011 轮胎品类进口税率</p>
      </div>
      <TariffTable data={data} onRefresh={handleRefresh} loading={loading} />
    </div>
  )
}
