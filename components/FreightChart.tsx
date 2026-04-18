'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface FreightChartPoint {
  date: string
  baselineFreight: number
}

interface FreightChartProps {
  data: FreightChartPoint[]
  days: number
  title: string
  onDaysChange?: (days: number) => void
}

const PERIOD_OPTIONS = [7, 30, 90] as const

type TooltipPayloadEntry = {
  value?: number
}

type TooltipProps = {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function formatFreight(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}

export function sliceFreightSeries(data: FreightChartPoint[], days: number): FreightChartPoint[] {
  if (data.length === 0) {
    return []
  }

  const lastDate = new Date(data[data.length - 1].date)
  const cutoff = new Date(lastDate)
  cutoff.setDate(cutoff.getDate() - days)

  return data.filter((point) => new Date(point.date) > cutoff)
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{ background: 'var(--surface-3)', border: '1px solid var(--border-2)', color: 'var(--text)' }}
    >
      <div style={{ color: 'var(--text-2)' }}>{label}</div>
      <div
        className="mt-0.5 font-semibold"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-l)' }}
      >
        ¥{formatFreight(payload[0]?.value ?? 0)}
      </div>
    </div>
  )
}

export default function FreightChart({
  data,
  days,
  title,
  onDaysChange,
}: FreightChartProps) {
  const slicedData = sliceFreightSeries(data, days)

  return (
    <div className="card p-5 page-enter page-enter-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            {title}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
            以历史基准运费观察航线波动，不把市场均价误当成真实成交价。
          </p>
        </div>

        <div className="flex gap-1.5">
          {PERIOD_OPTIONS.map((period) => {
            const active = period === days

            return (
              <button
                key={period}
                type="button"
                onClick={() => onDaysChange?.(period)}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: active ? 'var(--surface-3)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--text-3)',
                  border: active ? '1px solid var(--border-2)' : '1px solid transparent',
                }}
              >
                {period}日
              </button>
            )
          })}
        </div>
      </div>

      {slicedData.length === 0 ? (
        <div className="flex h-[240px] items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
          暂无运费数据
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={slicedData} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--text-3)' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-3)' }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(value) => formatFreight(value)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-2)', strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="baselineFreight"
              stroke="var(--blue)"
              dot={false}
              strokeWidth={1.8}
              activeDot={{ r: 3, fill: 'var(--blue)', stroke: 'var(--bg)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
