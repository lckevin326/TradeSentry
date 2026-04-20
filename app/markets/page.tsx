import { MARKETS, DEFAULT_ORDER_BASE, buildMarketOrder } from '../../lib/profit/market-defaults'
import { loadAllMarketSnapshots } from '../../lib/profit/market-data'
import { calculateAttribution, calculateProfitResult } from '../../lib/profit/calculate'
import type { MarketTodayResult } from '../api/markets/today/route'
import { isSupabaseConfigured } from '../../lib/supabase'

export const revalidate = 300

const STATUS_STYLES = {
  ok:          { color: '#2a9d59', badge: '#edf7f1', badgeText: '可接单' },
  cautious:    { color: '#c87d00', badge: '#fff8e6', badgeText: '谨慎'   },
  pause:       { color: '#d04040', badge: '#fef0f0', badgeText: '暂停'   },
  unavailable: { color: '#aaa',    badge: '#f5f5f5', badgeText: '暂无数据' },
}

const MARKET_FX_CURRENCY: Record<string, string> = {
  UAE: 'AED', SA: 'SAR', KW: 'KWD', QA: 'QAR', OM: 'OMR',
}

async function getMarketsData(): Promise<MarketTodayResult[]> {
  if (!isSupabaseConfigured) return []
  const todayDate = new Date().toISOString().slice(0, 10)
  const orders = MARKETS.map(m => ({ ...buildMarketOrder(m), key: m.key }))
  const snapshots = await loadAllMarketSnapshots(orders, todayDate)

  return MARKETS.map((market, i) => {
    const order = orders[i]
    const snap = snapshots.get(market.key)
    if (!snap || !snap.today) {
      return { key: market.key, label: market.label, today: null, yesterday: null, deltaMarginPct: null, attribution: null, status: 'unavailable' as const }
    }
    const todayResult = calculateProfitResult(order, snap.today)
    const yesterdayResult = snap.yesterday ? calculateProfitResult(order, snap.yesterday) : null
    const deltaMarginPct = yesterdayResult != null
      ? Math.round((todayResult.marginPct - yesterdayResult.marginPct) * 100) / 100
      : null
    const attribution = snap.yesterday ? calculateAttribution(order, snap.yesterday, snap.today) : null
    const status = todayResult.marginPct >= 13 ? 'ok' : todayResult.marginPct >= 10 ? 'cautious' : 'pause'
    return { key: market.key, label: market.label, today: todayResult, yesterday: yesterdayResult, deltaMarginPct, attribution, status: status as 'ok' | 'cautious' | 'pause' }
  })
}

function BarChart({ markets }: { markets: MarketTodayResult[] }) {
  const maxMargin = Math.max(...markets.map(m => m.today?.marginPct ?? 0), 20)

  return (
    <div className="card p-5 page-enter">
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>
        今日利润率对比
      </h2>
      <div className="flex items-end gap-4" style={{ height: 120 }}>
        {markets.map(m => {
          const marginPct = m.today?.marginPct ?? 0
          const heightPct = maxMargin > 0 ? (marginPct / maxMargin) * 100 : 0
          const colors = STATUS_STYLES[m.status]
          return (
            <div key={m.key} className="flex flex-col items-center flex-1 gap-1">
              <span className="text-xs font-semibold" style={{ color: colors.color }}>
                {m.today ? `${marginPct.toFixed(1)}%` : '—'}
              </span>
              <div className="w-full rounded-t" style={{ height: `${heightPct}%`, background: colors.color, minHeight: m.today ? 4 : 0 }} />
              <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{m.key}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-2 text-right text-[10px]" style={{ color: 'var(--text-3)' }}>
        警戒线 &lt;10% · 建议下限 13%
      </div>
    </div>
  )
}

function DetailTable({ markets }: { markets: MarketTodayResult[] }) {
  return (
    <div className="card overflow-hidden page-enter page-enter-1">
      <div className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
        各市场驱动因子明细
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase" style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
              <th className="text-left px-5 py-2 font-semibold">市场</th>
              <th className="text-right px-3 py-2 font-semibold">结算货币</th>
              <th className="text-right px-3 py-2 font-semibold">运费/柜</th>
              <th className="text-right px-3 py-2 font-semibold">关税</th>
              <th className="text-right px-3 py-2 font-semibold">利润率</th>
              <th className="text-right px-3 py-2 font-semibold">vs昨日</th>
              <th className="text-center px-5 py-2 font-semibold">建议</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((m, idx) => {
              const colors = STATUS_STYLES[m.status]
              const delta = m.deltaMarginPct
              const deltaColor = delta == null ? 'var(--text-3)' : delta > 0 ? '#2a9d59' : delta < 0 ? '#d04040' : 'var(--text-2)'
              const deltaText = delta == null ? '—' : delta > 0 ? `▲ ${delta.toFixed(1)}%` : delta < 0 ? `▼ ${Math.abs(delta).toFixed(1)}%` : '持平'
              return (
                <tr key={m.key} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                  <td className="px-5 py-3 font-semibold" style={{ color: 'var(--text)' }}>{m.label}</td>
                  <td className="px-3 py-3 text-right text-[11px]" style={{ color: 'var(--text-3)' }}>
                    {MARKET_FX_CURRENCY[m.key] ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-right" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                    {m.today ? `¥${m.today.freightCny.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-3 py-3 text-right" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                    {m.today ? `¥${m.today.tariffCny.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold" style={{ color: colors.color, fontFamily: 'var(--font-mono)' }}>
                    {m.today ? `${m.today.marginPct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-3 py-3 text-right text-[11px]" style={{ color: deltaColor }}>
                    {deltaText}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: colors.badge, color: colors.color }}>
                      {colors.badgeText}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 text-[11px]" style={{ color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}>
        以默认参数计算：报价 ¥{DEFAULT_ORDER_BASE.quotedAmount.toLocaleString()} / {DEFAULT_ORDER_BASE.quantity}条 / 40HQ
      </div>
    </div>
  )
}

export default async function MarketsPage() {
  const markets = await getMarketsData()

  return (
    <div className="space-y-6">
      <div className="page-enter">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>市场对比</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
          5大海湾市场今日利润率 · 以默认参数估算
        </p>
      </div>

      {markets.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: 'var(--text-2)' }}>
          数据加载失败，请检查数据库连接
        </div>
      ) : (
        <>
          <BarChart markets={markets} />
          <DetailTable markets={markets} />

          <div className="card p-5 page-enter page-enter-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
              近14日利润率趋势
            </h2>
            <div className="py-8 text-center text-sm" style={{ color: 'var(--text-3)' }}>
              历史趋势图即将上线 · 数据积累中
            </div>
          </div>
        </>
      )}
    </div>
  )
}
