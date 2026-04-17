'use client'
import { useEffect, useState } from 'react'
import RateChart from '@/components/RateChart'
import type { Currency, ExchangeRate } from '@/types'

const CURRENCIES: Currency[] = ['AED', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR']
const PERIODS = [
  { label: '7日', days: 7 },
  { label: '30日', days: 30 },
  { label: '90日', days: 90 },
]

const THRESHOLD = 0.5

export default function ExchangeRatesPage() {
  const [currency, setCurrency] = useState<Currency>('AED')
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Pick<ExchangeRate, 'date' | 'rate' | 'change_pct'>[]>([])

  useEffect(() => {
    fetch(`/api/exchange-rates?target=${currency}&days=${days}`)
      .then(r => r.json())
      .then(setData)
  }, [currency, days])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">汇率详情</h1>

      {/* 货币对切换 */}
      <div className="flex gap-2 flex-wrap">
        {CURRENCIES.map(c => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${currency === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
          >
            CNY/{c}
          </button>
        ))}
      </div>

      {/* 时间区间切换 */}
      <div className="flex gap-2">
        {PERIODS.map(p => (
          <button
            key={p.days}
            onClick={() => setDays(p.days)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${days === p.days ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 折线图 */}
      <div className="bg-white rounded-xl border p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-4">CNY/{currency} 汇率走势</h2>
        <RateChart data={data} />
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">日期</th>
                <th className="px-4 py-3 text-right">汇率</th>
                <th className="px-4 py-3 text-right">涨跌幅</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...data].reverse().map(row => {
                const pct = row.change_pct
                const isSpike = pct != null && Math.abs(pct) > THRESHOLD
                return (
                  <tr key={row.date} className={isSpike ? 'bg-yellow-50' : ''}>
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3 text-right font-mono">{row.rate?.toFixed(6)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${pct == null ? 'text-gray-400' : pct > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pct != null ? `${pct > 0 ? '+' : ''}${pct}%` : '--'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
