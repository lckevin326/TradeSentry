'use client'
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { ExchangeRate, Policy } from '@/types'

interface Props {
  rates: Pick<ExchangeRate, 'date' | 'rate'>[]
  policies: Pick<Policy, 'published_at' | 'title'>[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-2)', color: 'var(--text)' }}>
      <div style={{ color: 'var(--text-2)' }}>{label}</div>
      <div className="font-semibold mt-0.5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-l)' }}>
        {(payload[0].value as number).toFixed(6)}
      </div>
    </div>
  )
}

export default function PolicyRateChart({ rates, policies }: Props) {
  const policyDates = new Set(
    policies.map(p => p.published_at?.slice(0, 10)).filter(Boolean)
  )

  return (
    <div className="card p-5 page-enter page-enter-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
          政策发布 vs CNY/AED 汇率
        </h2>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-3)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-px inline-block" style={{ background: 'var(--gold-l)' }} />
            汇率
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed inline-block" style={{ borderColor: '#fb923c' }} />
            政策
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={rates} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} width={58} tickFormatter={(v) => v.toFixed(4)} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-2)', strokeWidth: 1 }} />
          <Line type="monotone" dataKey="rate" stroke="var(--gold-l)" dot={false} strokeWidth={1.5} activeDot={{ r: 3, fill: 'var(--gold-l)', stroke: 'var(--bg)' }} />
          {[...policyDates].map(date => (
            <ReferenceLine
              key={date}
              x={date}
              stroke="#fb923c"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
