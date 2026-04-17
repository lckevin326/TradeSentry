'use client'
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer
} from 'recharts'
import type { ExchangeRate, Policy } from '@/types'

interface Props {
  rates: Pick<ExchangeRate, 'date' | 'rate'>[]
  policies: Pick<Policy, 'published_at' | 'title'>[]
}

export default function PolicyRateChart({ rates, policies }: Props) {
  const policyDates = new Set(
    policies.map(p => p.published_at?.slice(0, 10)).filter(Boolean)
  )

  return (
    <div className="bg-white rounded-xl border p-4">
      <h2 className="text-sm font-medium text-gray-500 mb-4">政策发布时间 vs CNY/AED 汇率走势</h2>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={rates} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} tickLine={false} width={60} />
          <Tooltip
            formatter={(v) => [(v as number).toFixed(6), 'CNY/AED']}
            labelFormatter={(l) => `日期：${l}`}
          />
          <Line type="monotone" dataKey="rate" stroke="#2563eb" dot={false} strokeWidth={2} name="CNY/AED" />
          {[...policyDates].map(date => (
            <ReferenceLine key={date} x={date} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '政策', position: 'top', fontSize: 10, fill: '#f59e0b' }} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-2">黄色虚线为相关政策发布时间节点</p>
    </div>
  )
}
