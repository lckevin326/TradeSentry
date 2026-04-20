'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import FreightChart from '../../components/FreightChart'
import {
  FREIGHT_CONTAINER_TYPE_LABELS,
  FREIGHT_CONTAINER_TYPES,
  FREIGHT_ROUTE_OPTIONS,
  type FreightContainerType,
} from '../../lib/freight/constants'
import { safeFetchJson } from '../../lib/http'

type FreightHistoryPoint = {
  date: string
  route_key: string
  destination_country: string
  destination_port: string
  container_type: FreightContainerType
  baseline_freight: number
  source_url: string | null
  fetched_at: string
}

const PERIODS = [7, 30, 90] as const

export function normalizeFreightRows(value: unknown): FreightHistoryPoint[] {
  return Array.isArray(value) ? (value as FreightHistoryPoint[]) : []
}

type FreightRefreshState = {
  tone: 'success' | 'error'
  message: string
} | null

export default function FreightPage() {
  const defaultRoute = FREIGHT_ROUTE_OPTIONS[0]
  const [routeKey, setRouteKey] = useState(defaultRoute.routeKey)
  const [containerType, setContainerType] = useState<FreightContainerType>(defaultRoute.containerType)
  const [days, setDays] = useState<number>(30)
  const [rows, setRows] = useState<FreightHistoryPoint[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshState, setRefreshState] = useState<FreightRefreshState>(null)

  useEffect(() => {
    const route = FREIGHT_ROUTE_OPTIONS.find((item) => item.routeKey === routeKey)
    if (!route || route.containerType === containerType) {
      return
    }
    setContainerType(route.containerType)
  }, [routeKey, containerType])

  const loadRows = useCallback(async () => {
    safeFetchJson<FreightHistoryPoint[]>(
      `/api/freight?route=${routeKey}&container=${containerType}&days=${days}`,
      { fallback: [] },
    ).then((result) => {
      setRows(normalizeFreightRows(result))
    })
  }, [routeKey, containerType, days])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setRefreshState(null)

    try {
      const response = await fetch('/api/fetch/freight', { method: 'POST' })
      const result = (await response.json()) as {
        ok?: boolean
        error?: string
        saved?: number
        reportDate?: string
      }

      if (!response.ok || result.ok === false) {
        setRefreshState({
          tone: 'error',
          message: result.error ?? '运费抓取失败，请稍后重试。',
        })
        return
      }

      await loadRows()
      setRefreshState({
        tone: 'success',
        message: `运费已更新，本期日期 ${result.reportDate ?? '未知'}，写入 ${result.saved ?? 0} 条记录。`,
      })
    } catch {
      setRefreshState({
        tone: 'error',
        message: '运费抓取失败，请稍后重试。',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const selectedRoute = FREIGHT_ROUTE_OPTIONS.find((route) => route.routeKey === routeKey) ?? defaultRoute
  const latestRow = rows[rows.length - 1] ?? null
  const chartData = useMemo(
    () =>
      rows.map((row) => ({
        date: row.date,
        baselineFreight: row.baseline_freight,
      })),
    [rows],
  )

  return (
    <div className="space-y-6">
      <div className="page-enter">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
              运费
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
              先看基于 CCFI 中东指数推导的默认运费，再决定利润测算里的运费口径是否要手工覆盖。
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: 'var(--text)',
              color: 'white',
              opacity: isRefreshing ? 0.7 : 1,
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? '刷新中...' : '立即刷新运费'}
          </button>
        </div>

        {refreshState ? (
          <div
            className="mt-3 rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: refreshState.tone === 'success' ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.25)',
              background: refreshState.tone === 'success' ? 'rgba(22,163,74,0.08)' : 'var(--red-dim)',
              color: refreshState.tone === 'success' ? 'var(--green)' : 'var(--red)',
            }}
          >
            {refreshState.message}
          </div>
        ) : null}
      </div>

      <div className="card p-5 page-enter page-enter-1">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_0.7fr]">
          <label className="flex flex-col gap-1.5 text-sm">
            <span style={{ color: 'var(--text-2)' }}>航线</span>
            <select
              value={routeKey}
              onChange={(event) => setRouteKey(event.currentTarget.value)}
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {FREIGHT_ROUTE_OPTIONS.map((route) => (
                <option key={route.routeKey} value={route.routeKey}>
                  {route.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span style={{ color: 'var(--text-2)' }}>柜型</span>
            <select
              value={containerType}
              onChange={(event) => setContainerType(event.currentTarget.value as FreightContainerType)}
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {FREIGHT_CONTAINER_TYPES.map((item) => (
                <option key={item} value={item}>
                  {FREIGHT_CONTAINER_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-1.5 items-end">
            {PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setDays(period)}
                className="rounded-md px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  background: days === period ? 'var(--surface-3)' : 'transparent',
                  color: days === period ? 'var(--text)' : 'var(--text-3)',
                  border: days === period ? '1px solid var(--border-2)' : '1px solid transparent',
                }}
              >
                {period}日
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <FreightChart
          data={chartData}
          days={days}
          title={`${selectedRoute.chartLabel} 默认运费`}
          onDaysChange={setDays}
        />

        <div className="space-y-5 page-enter page-enter-2">
          <div className="card p-5">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              最新基准运费
            </span>
            <div className="mt-3 text-3xl font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              {latestRow ? latestRow.baseline_freight.toLocaleString('en-US') : '—'}
            </div>
            <div className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>
              {selectedRoute.label}
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                数据来源
              </div>
              <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                {latestRow?.source_url ?? '尚未抓取 CCFI 运费源'}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                最近抓取时间
              </div>
              <div className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>
                {latestRow?.fetched_at ? new Date(latestRow.fetched_at).toLocaleString('zh-CN') : '暂无'}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                数据说明
              </div>
              <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                当前展示的是基于 CCFI 中东指数推导的默认运费，只用于利润测算默认值，不代表你的真实成交价。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
