'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { ExchangeRate } from '@/types'

interface Props {
  data: Pick<ExchangeRate, 'date' | 'rate' | 'change_pct'>[]
}

type TooltipPayloadEntry = {
  value?: number
}

type TooltipProps = {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-2)', color: 'var(--text)' }}>
      <div style={{ color: 'var(--text-2)' }}>{label}</div>
      <div className="font-semibold mt-0.5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-l)' }}>
        {(payload[0]?.value ?? 0).toFixed(6)}
      </div>
    </div>
  )
}

export default function RateChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
        暂无数据
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'var(--text-3)' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 10, fill: 'var(--text-3)' }}
          tickLine={false}
          axisLine={false}
          width={58}
          tickFormatter={(v) => v.toFixed(4)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-2)', strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="var(--gold-l)"
          dot={false}
          strokeWidth={1.5}
          activeDot={{ r: 3, fill: 'var(--gold-l)', stroke: 'var(--bg)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
