'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { ExchangeRate } from '@/types'

interface Props {
  data: Pick<ExchangeRate, 'date' | 'rate' | 'change_pct'>[]
}

export default function RateChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} tickLine={false} width={60} />
        <Tooltip
          formatter={(v) => [(v as number).toFixed(6), '汇率']}
          labelFormatter={(l) => `日期：${l}`}
        />
        <Line type="monotone" dataKey="rate" stroke="#2563eb" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
