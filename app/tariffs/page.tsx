'use client'
import { useEffect, useState, useCallback } from 'react'
import TariffTable from '@/components/TariffTable'
import type { Tariff } from '@/types'

export default function TariffsPage() {
  const [data, setData] = useState<Tariff[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(() => {
    fetch('/api/tariffs').then(r => r.json()).then(setData)
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
      <h1 className="text-xl font-bold">关税详情</h1>
      <TariffTable data={data} onRefresh={handleRefresh} loading={loading} />
    </div>
  )
}
