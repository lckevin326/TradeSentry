import Link from 'next/link'
import type { MarketTodayResult } from '../app/api/markets/today/route'

interface Props {
  markets: MarketTodayResult[]
  date: string
}

const STATUS_COLORS = {
  ok:          { border: '#2a9d59', text: '#2a9d59', badge: '#edf7f1', badgeText: '可接单' },
  cautious:    { border: '#c87d00', text: '#c87d00', badge: '#fff8e6', badgeText: '谨慎'   },
  pause:       { border: '#d04040', text: '#d04040', badge: '#fef0f0', badgeText: '暂停'   },
  unavailable: { border: '#ccc',    text: '#aaa',    badge: '#f5f5f5', badgeText: '暂无数据' },
}

function formatDelta(delta: number | null): { text: string; color: string } {
  if (delta == null) return { text: '—', color: 'var(--text-3)' }
  if (delta > 0)  return { text: `▲ ${delta.toFixed(1)}% vs 昨日`, color: '#2a9d59' }
  if (delta < 0)  return { text: `▼ ${Math.abs(delta).toFixed(1)}% vs 昨日`, color: '#d04040' }
  return { text: '— 基本持平', color: 'var(--text-2)' }
}

function AttributionRow({ markets }: { markets: MarketTodayResult[] }) {
  const uae = markets.find(m => m.key === 'UAE')
  if (!uae?.attribution) return null

  const { fxDeltaCny, freightDeltaCny, dutiesDeltaCny } = uae.attribution
  const revenue = uae.today?.revenueCny ?? 1

  const fxMarginDelta = Math.round((fxDeltaCny / revenue) * 1000) / 10
  const freightMarginDelta = Math.round((freightDeltaCny / revenue) * 1000) / 10
  const dutyMarginDelta = Math.round((dutiesDeltaCny / revenue) * 1000) / 10

  return (
    <div className="card p-3 flex flex-wrap gap-x-4 gap-y-1 items-center text-xs">
      <span className="font-semibold" style={{ color: 'var(--text-2)' }}>今日变化主因：</span>
      <span style={{ color: fxMarginDelta === 0 ? 'var(--text-2)' : fxMarginDelta > 0 ? '#2a9d59' : '#d04040' }}>
        汇率 CNY/AED {fxMarginDelta > 0 ? '+' : ''}{fxMarginDelta}% → 利润率
      </span>
      <span style={{ color: 'var(--border)' }}>|</span>
      <span style={{ color: freightMarginDelta === 0 ? 'var(--text-2)' : freightMarginDelta > 0 ? '#2a9d59' : '#d04040' }}>
        运费 {freightMarginDelta > 0 ? '+' : ''}{freightMarginDelta}% → 利润率
      </span>
      <span style={{ color: 'var(--border)' }}>|</span>
      <span style={{ color: dutyMarginDelta === 0 ? '#2a9d59' : '#d04040' }}>
        关税 {dutyMarginDelta === 0 ? '— 无变化' : `${dutyMarginDelta > 0 ? '+' : ''}${dutyMarginDelta}%`}
      </span>
      <Link
        href="/markets"
        className="ml-auto text-[11px] whitespace-nowrap"
        style={{ color: 'var(--gold-l)' }}
      >
        查看市场详情 →
      </Link>
    </div>
  )
}

export default function MarketCardsSection({ markets, date }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {markets.map(market => {
          const colors = STATUS_COLORS[market.status]
          const delta = formatDelta(market.deltaMarginPct)
          const marginText = market.today ? `${market.today.marginPct.toFixed(1)}%` : '—'

          return (
            <div
              key={market.key}
              className="card p-4 flex flex-col gap-1"
              style={{ borderTop: `3px solid ${colors.border}` }}
            >
              <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                {market.label}
              </span>
              <span
                className="text-2xl font-semibold leading-none mt-1"
                style={{ color: colors.text }}
              >
                {marginText}
              </span>
              <span className="text-[11px] mt-0.5" style={{ color: delta.color }}>
                {delta.text}
              </span>
              <span
                className="mt-2 self-start text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: colors.badge, color: colors.text }}
              >
                {colors.badgeText}
              </span>
            </div>
          )
        })}
      </div>

      <AttributionRow markets={markets} />
    </div>
  )
}
