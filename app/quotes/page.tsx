import Link from 'next/link'

type QuoteRecord = {
  id: string
  created_at: string
  destination_country: string
  hs_code: string
  quote_currency: string
  quoted_amount: number
  quantity: number
  route_key: string
  container_type: string
  saved_margin_pct: number
  saved_profit_cny: number
  saved_fx_rate: number
  today_margin_pct: number | null
  today_profit_cny: number | null
  note: string | null
}

async function fetchQuotes(): Promise<QuoteRecord[]> {
  try {
    const { supabase } = await import('../../lib/supabase')
    const { calculateTodayProfit } = await import('../../lib/profit/market-data')

    const { data, error } = await supabase
      .from('quote_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error || !data) return []

    const rows = data as QuoteRecord[]

    return Promise.all(
      rows.map(async (row) => {
        try {
          const today = await calculateTodayProfit({
            destinationCountry: row.destination_country as 'UAE' | 'SA' | 'KW' | 'QA' | 'BH' | 'OM',
            hsCode: row.hs_code,
            tradeTerm: 'FOB',
            quoteCurrency: row.quote_currency as 'USD' | 'CNY',
            quotedAmount: row.quoted_amount,
            quantity: row.quantity,
            productCost: 0,
            miscFees: 0,
            routeKey: row.route_key,
            containerType: row.container_type as '20GP' | '40GP' | '40HQ',
          })
          return { ...row, today_margin_pct: today.marginPct, today_profit_cny: today.profitCny }
        } catch {
          return { ...row, today_margin_pct: null, today_profit_cny: null }
        }
      }),
    )
  } catch {
    return []
  }
}

function formatDate(isoString: string): string {
  return isoString.slice(0, 10)
}

function marginColor(pct: number | null): string {
  if (pct == null) return 'var(--text-3)'
  if (pct >= 13) return 'var(--green)'
  if (pct >= 10) return 'var(--gold-l)'
  return 'var(--red)'
}

function deltaBadge(saved: number, today: number | null) {
  if (today == null) return null
  const delta = today - saved
  const sign = delta > 0 ? '+' : ''
  const color = delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text-3)'
  const bg = delta > 0 ? 'var(--green-dim)' : delta < 0 ? 'var(--red-dim)' : 'var(--surface-2)'
  return { text: `${sign}${delta.toFixed(1)}%`, color, bg }
}

export const revalidate = 60

export default async function QuotesPage() {
  const quotes = await fetchQuotes()

  return (
    <div className="space-y-6">
      <div className="page-enter flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
            报价历史
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
            每条记录用今日市场汇率、运费实时重算利润率，方便判断历史报价是否仍然安全。
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          ← 返回测算
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <p className="text-base font-medium" style={{ color: 'var(--text-2)' }}>
            还没有保存过报价
          </p>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            在利润决策页完成测算后，点击「保存此次报价」即可在这里看到历史记录。
          </p>
          <Link
            href="/"
            className="inline-block mt-2 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: 'var(--text)', color: 'white' }}
          >
            去试算 →
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>日期</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>市场</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>报价</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>数量</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>保存时利润率</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>今日重算</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>变化</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>航线</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q, i) => {
                  const badge = deltaBadge(q.saved_margin_pct, q.today_margin_pct)
                  return (
                    <tr
                      key={q.id}
                      style={{ borderBottom: i < quotes.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      <td className="px-4 py-3" style={{ color: 'var(--text-3)' }}>
                        {formatDate(q.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>
                        {q.destination_country}
                        <span className="ml-1.5 text-xs" style={{ color: 'var(--text-3)' }}>
                          {q.quote_currency}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--text)' }}>
                        {q.quoted_amount.toLocaleString()} {q.quote_currency}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: 'var(--text-2)' }}>
                        {q.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: marginColor(q.saved_margin_pct) }}>
                        {q.saved_margin_pct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: marginColor(q.today_margin_pct) }}>
                        {q.today_margin_pct != null ? `${q.today_margin_pct.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {badge ? (
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                            style={{ color: badge.color, background: badge.bg }}
                          >
                            {badge.text}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-3)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-3)' }}>
                        {q.route_key} · {q.container_type}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              「今日重算」用当前最新汇率和运费对同一报价重新计算利润率，成本为零（纯报价测算）。颜色：
              <span className="font-medium" style={{ color: 'var(--green)' }}>绿 ≥ 13%</span>
              {' · '}
              <span className="font-medium" style={{ color: 'var(--gold-l)' }}>黄 ≥ 10%</span>
              {' · '}
              <span className="font-medium" style={{ color: 'var(--red)' }}>红 &lt; 10%</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
