'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Currency } from '@/types'

type RateRow = { date: string; rate: number }

interface Props {
  data: Record<Currency, RateRow[]>
}

const COLORS: Record<Currency, string> = {
  AED: '#f0ab24',
  SAR: '#34d399',
  KWD: '#a78bfa',
  QAR: '#f87171',
  BHD: '#fb923c',
  OMR: '#38bdf8',
}

const CURRENCY_NAMES: Record<Currency, string> = {
  AED: '迪拉姆',
  SAR: '沙特里亚尔',
  KWD: '科威特第纳尔',
  QAR: '卡塔尔里亚尔',
  BHD: '巴林第纳尔',
  OMR: '阿曼里亚尔',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-2)', color: 'var(--text)' }}>
      <div className="mb-1.5" style={{ color: 'var(--text-2)' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 leading-6">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span style={{ color: 'var(--text-2)' }}>CNY/{p.dataKey}</span>
          <span className="ml-auto font-medium" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
            {(p.value as number).toFixed(5)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MultiRateChart({ data }: Props) {
  const dateSet = new Set<string>()
  for (const rows of Object.values(data)) {
    for (const r of rows) dateSet.add(r.date)
  }
  const dates = Array.from(dateSet).sort()

  const merged = dates.map(date => {
    const point: Record<string, string | number> = { date }
    for (const [cur, rows] of Object.entries(data) as [Currency, RateRow[]][]) {
      const found = rows.find(r => r.date === date)
      if (found) point[cur] = found.rate
    }
    return point
  })

  const currencies = Object.keys(data) as Currency[]

  if (merged.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
        暂无数据
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={merged} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} width={55} tickFormatter={(v) => v.toFixed(3)} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-2)', strokeWidth: 1 }} />
        <Legend
          formatter={(value) => (
            <span style={{ color: 'var(--text-2)', fontSize: 11 }}>
              {value} <span style={{ color: 'var(--text-3)' }}>{CURRENCY_NAMES[value as Currency]}</span>
            </span>
          )}
        />
        {currencies.map(cur => (
          <Line
            key={cur}
            type="monotone"
            dataKey={cur}
            stroke={COLORS[cur]}
            dot={false}
            strokeWidth={1.5}
            connectNulls
            activeDot={{ r: 3, fill: COLORS[cur], stroke: 'var(--bg)' }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
