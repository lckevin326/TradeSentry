'use client'
import { useEffect, useState } from 'react'
import RateChart from '@/components/RateChart'
import MultiRateChart from '@/components/MultiRateChart'
import type { Currency, ExchangeRate } from '@/types'

const CURRENCIES: Currency[] = ['AED', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR']
const CURRENCY_NAMES: Record<Currency, string> = {
  AED: '迪拉姆',
  SAR: '里亚尔(沙特)',
  KWD: '第纳尔(科威特)',
  QAR: '里亚尔(卡塔尔)',
  BHD: '第纳尔(巴林)',
  OMR: '里亚尔(阿曼)',
}
const PERIODS = [
  { label: '7日',  days: 7 },
  { label: '30日', days: 30 },
  { label: '90日', days: 90 },
]
const THRESHOLD = 0.5

type SingleData = Pick<ExchangeRate, 'date' | 'rate' | 'change_pct'>[]
type AllData = Record<Currency, { date: string; rate: number; change_pct?: number | null }[]>

const tabBtn = (active: boolean, color?: string) => ({
  padding: '6px 14px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  border: active ? '1px solid var(--border-2)' : '1px solid transparent',
  background: active ? 'var(--surface-3)' : 'transparent',
  color: active ? (color ?? 'var(--gold-l)') : 'var(--text-3)',
  transition: 'all 0.15s',
} as React.CSSProperties)

export default function ExchangeRatesPage() {
  const [currency, setCurrency] = useState<Currency | 'ALL'>('AED')
  const [days, setDays] = useState(30)
  const [data, setData] = useState<SingleData>([])
  const [allData, setAllData] = useState<AllData>({} as AllData)

  useEffect(() => {
    if (currency === 'ALL') {
      Promise.all(
        CURRENCIES.map(c =>
          fetch(`/api/exchange-rates?target=${c}&days=${days}`)
            .then(r => r.json())
            .then((rows: SingleData) => ({ cur: c, rows }))
        )
      ).then(results => {
        const combined = {} as AllData
        for (const { cur, rows } of results) {
          combined[cur] = rows.map(r => ({ date: r.date, rate: r.rate, change_pct: r.change_pct }))
        }
        setAllData(combined)
      })
    } else {
      fetch(`/api/exchange-rates?target=${currency}&days=${days}`)
        .then(r => r.json())
        .then(setData)
    }
  }, [currency, days])

  return (
    <div className="space-y-6">
      <div className="page-enter">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>汇率</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>CNY 兑海湾六国货币实时走势</p>
      </div>

      {/* Currency tabs */}
      <div className="flex gap-1.5 flex-wrap page-enter page-enter-1">
        <button onClick={() => setCurrency('ALL')} style={tabBtn(currency === 'ALL')}>全部</button>
        {CURRENCIES.map(c => (
          <button key={c} onClick={() => setCurrency(c)} style={tabBtn(currency === c)}>
            {c}
            <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}>{CURRENCY_NAMES[c]}</span>
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex gap-1.5 page-enter page-enter-2">
        {PERIODS.map(p => (
          <button
            key={p.days}
            onClick={() => setDays(p.days)}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              border: '1px solid transparent',
              background: days === p.days ? 'var(--surface-3)' : 'transparent',
              color: days === p.days ? 'var(--text)' : 'var(--text-3)',
              transition: 'all 0.15s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-5 page-enter page-enter-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>
          {currency === 'ALL' ? '全部货币走势' : `CNY / ${currency} · ${CURRENCY_NAMES[currency as Currency]}`}
        </h2>
        {currency === 'ALL'
          ? <MultiRateChart data={allData} />
          : <RateChart data={data} />
        }
      </div>

      {/* Data table */}
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
              {currency === 'ALL' ? (() => {
                // Flatten all currencies, sort by date desc then currency
                const rows: { date: string; cur: Currency; rate: number; change_pct?: number | null }[] = []
                for (const cur of CURRENCIES) {
                  for (const r of (allData[cur] ?? [])) {
                    rows.push({ date: r.date, cur, rate: r.rate, change_pct: r.change_pct })
                  }
                }
                rows.sort((a, b) => b.date.localeCompare(a.date) || a.cur.localeCompare(b.cur))
                if (rows.length === 0) return (
                  <tr><td colSpan={4} className="text-center py-12" style={{ color: 'var(--text-3)' }}>暂无数据</td></tr>
                )
                return rows.map((row, i) => (
                  <tr key={`${row.date}-${row.cur}`}>
                    <td>{row.date}</td>
                    <td>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                        CNY/{row.cur}
                      </span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-3)' }}>{CURRENCY_NAMES[row.cur]}</span>
                    </td>
                    <td className="text-right" style={{ fontFamily: 'var(--font-mono)' }}>{row.rate.toFixed(6)}</td>
                    <td
                      className="text-right font-medium"
                      style={{ fontFamily: 'var(--font-mono)', color: row.change_pct == null ? 'var(--text-3)' : row.change_pct > 0 ? 'var(--green)' : row.change_pct < 0 ? 'var(--red)' : 'var(--text-3)' }}
                    >
                      {row.change_pct != null ? `${row.change_pct > 0 ? '+' : ''}${row.change_pct}%` : '—'}
                    </td>
                  </tr>
                ))
              })() : (() => {
                const rows = [...data].reverse()
                if (rows.length === 0) return (
                  <tr><td colSpan={3} className="text-center py-12" style={{ color: 'var(--text-3)' }}>暂无数据</td></tr>
                )
                return rows.map(row => {
                  const pct = row.change_pct
                  const isSpike = pct != null && Math.abs(pct) > THRESHOLD
                  return (
                    <tr key={row.date} className={isSpike ? 'row-alert' : ''}>
                      <td>{row.date}</td>
                      <td className="text-right" style={{ fontFamily: 'var(--font-mono)' }}>{row.rate?.toFixed(6)}</td>
                      <td
                        className="text-right font-medium"
                        style={{ fontFamily: 'var(--font-mono)', color: pct == null ? 'var(--text-3)' : pct > 0 ? 'var(--green)' : 'var(--red)' }}
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
