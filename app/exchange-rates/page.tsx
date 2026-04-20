'use client'

import { useCallback, useEffect, useState } from 'react'

import RateChart from '../../components/RateChart'
import MultiRateChart from '../../components/MultiRateChart'
import { safeFetchJson } from '../../lib/http'
import type { Currency, ExchangeRate } from '../../types'

const CURRENCIES: Currency[] = ['USD', 'AED', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR']
const CURRENCY_NAMES: Record<Currency, string> = {
  USD: '美元',
  AED: '迪拉姆',
  SAR: '里亚尔(沙特)',
  KWD: '第纳尔(科威特)',
  QAR: '里亚尔(卡塔尔)',
  BHD: '第纳尔(巴林)',
  OMR: '里亚尔(阿曼)',
}
const PERIODS = [
  { label: '7日', days: 7 },
  { label: '30日', days: 30 },
  { label: '90日', days: 90 },
]
const THRESHOLD = 0.5

type SingleData = Pick<ExchangeRate, 'date' | 'rate' | 'change_pct'>[]
type AllData = Record<Currency, { date: string; rate: number; change_pct?: number | null }[]>
type RefreshRatesResult = {
  ok?: boolean
  error?: string
  inserted?: number
  updated?: number
}
type RefreshState = {
  tone: 'success' | 'error'
  message: string
} | null

const tabBtn = (active: boolean, color?: string) =>
  ({
    padding: '6px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    border: active ? '1px solid var(--border-2)' : '1px solid transparent',
    background: active ? 'var(--surface-3)' : 'transparent',
    color: active ? (color ?? 'var(--gold-l)') : 'var(--text-3)',
    transition: 'all 0.15s',
  }) as React.CSSProperties

export async function fetchExchangeRatesViewData(
  currency: Currency | 'ALL',
  days: number,
  fetcher: typeof fetch = fetch,
): Promise<{ data: SingleData; allData: AllData }> {
  if (currency === 'ALL') {
    const results = await Promise.all(
      CURRENCIES.map((current) =>
        safeFetchJson<SingleData>(`/api/exchange-rates?target=${current}&days=${days}`, {
          fallback: [],
          fetcher,
        }).then((rows) => ({ cur: current, rows })),
      ),
    )

    const combined = {} as AllData
    for (const { cur, rows } of results) {
      combined[cur] = rows.map((row) => ({ date: row.date, rate: row.rate, change_pct: row.change_pct }))
    }

    return { data: [], allData: combined }
  }

  return {
    data: await safeFetchJson<SingleData>(`/api/exchange-rates?target=${currency}&days=${days}`, {
      fallback: [],
      fetcher,
    }),
    allData: {} as AllData,
  }
}

export async function refreshExchangeRates(fetcher: typeof fetch = fetch): Promise<RefreshRatesResult> {
  const response = await fetcher('/api/fetch/rates', { method: 'POST' })
  const result = (await response.json()) as RefreshRatesResult

  if (!response.ok || result.ok === false) {
    throw new Error(result.error ?? '汇率更新失败，请稍后重试。')
  }

  return result
}

export function buildRefreshState(result: RefreshRatesResult): RefreshState {
  return {
    tone: 'success',
    message: `汇率已更新，新增 ${result.inserted ?? 0} 条，更新 ${result.updated ?? 0} 条。`,
  }
}

export function buildRefreshErrorState(error: unknown): RefreshState {
  return {
    tone: 'error',
    message: error instanceof Error ? error.message : '汇率更新失败，请稍后重试。',
  }
}

export async function runExchangeRatesRefreshFlow(
  loadData: () => Promise<void>,
  fetcher: typeof fetch = fetch,
): Promise<RefreshState> {
  const result = await refreshExchangeRates(fetcher)
  await loadData()
  return buildRefreshState(result)
}

export default function ExchangeRatesPage() {
  const [currency, setCurrency] = useState<Currency | 'ALL'>('AED')
  const [days, setDays] = useState(30)
  const [data, setData] = useState<SingleData>([])
  const [allData, setAllData] = useState<AllData>({} as AllData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshState, setRefreshState] = useState<RefreshState>(null)

  const loadData = useCallback(async () => {
    const next = await fetchExchangeRatesViewData(currency, days)
    setData(next.data)
    setAllData(next.allData)
  }, [currency, days])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setRefreshState(null)

    try {
      setRefreshState(await runExchangeRatesRefreshFlow(loadData))
    } catch (error) {
      setRefreshState(buildRefreshErrorState(error))
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-enter">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
              汇率
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
              CNY 兑海湾六国货币实时走势
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
            {isRefreshing ? '更新中...' : '手动更新汇率'}
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

      <div className="flex gap-1.5 flex-wrap page-enter page-enter-1">
        <button onClick={() => setCurrency('ALL')} style={tabBtn(currency === 'ALL')}>
          全部
        </button>
        {CURRENCIES.map((item) => (
          <button key={item} onClick={() => setCurrency(item)} style={tabBtn(currency === item)}>
            {item}
            <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}>{CURRENCY_NAMES[item]}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 page-enter page-enter-2">
        {PERIODS.map((period) => (
          <button
            key={period.days}
            onClick={() => setDays(period.days)}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              border: '1px solid transparent',
              background: days === period.days ? 'var(--surface-3)' : 'transparent',
              color: days === period.days ? 'var(--text)' : 'var(--text-3)',
              transition: 'all 0.15s',
            }}
          >
            {period.label}
          </button>
        ))}
      </div>

      <div className="card p-5 page-enter page-enter-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>
          {currency === 'ALL' ? '全部货币走势' : `CNY / ${currency} · ${CURRENCY_NAMES[currency as Currency]}`}
        </h2>
        {currency === 'ALL' ? <MultiRateChart data={allData} /> : <RateChart data={data} />}
      </div>

      <div className="card overflow-hidden page-enter page-enter-4">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>日期</th>
                {currency === 'ALL' && <th>币种</th>}
                <th className="right">汇率</th>
                <th className="right">涨跌幅</th>
              </tr>
            </thead>
            <tbody>
              {currency === 'ALL'
                ? (() => {
                    const rows: { date: string; cur: Currency; rate: number; change_pct?: number | null }[] = []
                    for (const cur of CURRENCIES) {
                      for (const row of allData[cur] ?? []) {
                        rows.push({ date: row.date, cur, rate: row.rate, change_pct: row.change_pct })
                      }
                    }
                    rows.sort((a, b) => b.date.localeCompare(a.date) || a.cur.localeCompare(b.cur))

                    if (rows.length === 0) {
                      return (
                        <tr>
                          <td colSpan={4} className="text-center py-12" style={{ color: 'var(--text-3)' }}>
                            暂无数据
                          </td>
                        </tr>
                      )
                    }

                    return rows.map((row) => (
                      <tr key={`${row.date}-${row.cur}`}>
                        <td>{row.date}</td>
                        <td>
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded"
                            style={{
                              background: 'var(--surface-3)',
                              color: 'var(--text-2)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            CNY/{row.cur}
                          </span>
                          <span className="ml-2 text-xs" style={{ color: 'var(--text-3)' }}>
                            {CURRENCY_NAMES[row.cur]}
                          </span>
                        </td>
                        <td className="text-right" style={{ fontFamily: 'var(--font-mono)' }}>
                          {row.rate.toFixed(6)}
                        </td>
                        <td
                          className="text-right font-medium"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color:
                              row.change_pct == null
                                ? 'var(--text-3)'
                                : row.change_pct > 0
                                  ? 'var(--green)'
                                  : row.change_pct < 0
                                    ? 'var(--red)'
                                    : 'var(--text-3)',
                          }}
                        >
                          {row.change_pct != null ? `${row.change_pct > 0 ? '+' : ''}${row.change_pct}%` : '—'}
                        </td>
                      </tr>
                    ))
                  })()
                : (() => {
                    const rows = [...data].reverse()
                    if (rows.length === 0) {
                      return (
                        <tr>
                          <td colSpan={3} className="text-center py-12" style={{ color: 'var(--text-3)' }}>
                            暂无数据
                          </td>
                        </tr>
                      )
                    }

                    return rows.map((row) => {
                      const pct = row.change_pct
                      const isSpike = pct != null && Math.abs(pct) > THRESHOLD

                      return (
                        <tr key={row.date} className={isSpike ? 'row-alert' : ''}>
                          <td>{row.date}</td>
                          <td className="text-right" style={{ fontFamily: 'var(--font-mono)' }}>
                            {row.rate?.toFixed(6)}
                          </td>
                          <td
                            className="text-right font-medium"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              color: pct == null ? 'var(--text-3)' : pct > 0 ? 'var(--green)' : 'var(--red)',
                            }}
                          >
                            {pct != null ? `${pct > 0 ? '+' : ''}${pct}%` : '—'}
                          </td>
                        </tr>
                      )
                    })
                  })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
