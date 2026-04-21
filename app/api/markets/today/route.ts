import { NextResponse } from 'next/server'
import { calculateAttribution, calculateProfitResult } from '../../../../lib/profit/calculate'
import { buildMarketOrder, MARKETS } from '../../../../lib/profit/market-defaults'
import { buildYesterdayDateString, loadAllMarketSnapshots } from '../../../../lib/profit/market-data'
import type { AttributionResult, ProfitResult } from '../../../../lib/profit/index'

/** 检查今日汇率是否已抓取，若缺失则自动触发补漏抓取 */
async function ensureTodayRates(todayDate: string): Promise<void> {
  const { supabase } = await import('../../../../lib/supabase')
  const { data } = await supabase
    .from('exchange_rates')
    .select('date')
    .eq('date', todayDate)
    .limit(1)
    .single()

  if (!data) {
    // 今天还没有汇率数据，静默触发补漏
    try {
      const { fetchAndSaveRates } = await import('../../../../lib/scrapers/rates')
      await fetchAndSaveRates()
    } catch (_) {
      // 补漏失败不阻断主流程，用最近一次数据兜底
    }
  }
}

export interface MarketTodayResult {
  key: string
  label: string
  today: ProfitResult | null
  yesterday: ProfitResult | null
  deltaMarginPct: number | null
  attribution: AttributionResult | null
  status: 'ok' | 'cautious' | 'pause' | 'unavailable'
}

export interface MarketsApiResponse {
  date: string
  markets: MarketTodayResult[]
}

function deriveStatus(marginPct: number | null): MarketTodayResult['status'] {
  if (marginPct == null) return 'unavailable'
  if (marginPct >= 13) return 'ok'
  if (marginPct >= 10) return 'cautious'
  return 'pause'
}

export async function GET(): Promise<NextResponse<MarketsApiResponse>> {
  const todayDate = new Date().toISOString().slice(0, 10)

  // 懒加载补漏：Cron 失败时由首次页面访问触发补抓
  await ensureTodayRates(todayDate)

  const orders = MARKETS.map(m => ({ ...buildMarketOrder(m), key: m.key }))
  const snapshots = await loadAllMarketSnapshots(orders, todayDate)

  const markets: MarketTodayResult[] = MARKETS.map((market, i) => {
    const order = orders[i]
    const snap = snapshots.get(market.key)

    if (!snap || !snap.today) {
      return {
        key: market.key,
        label: market.label,
        today: null,
        yesterday: null,
        deltaMarginPct: null,
        attribution: null,
        status: 'unavailable',
      }
    }

    const todayResult = calculateProfitResult(order, snap.today)
    const yesterdayResult = snap.yesterday ? calculateProfitResult(order, snap.yesterday) : null
    const deltaMarginPct =
      yesterdayResult != null
        ? Math.round((todayResult.marginPct - yesterdayResult.marginPct) * 100) / 100
        : null
    const attribution =
      snap.yesterday ? calculateAttribution(order, snap.yesterday, snap.today) : null

    return {
      key: market.key,
      label: market.label,
      today: todayResult,
      yesterday: yesterdayResult,
      deltaMarginPct,
      attribution,
      status: deriveStatus(todayResult.marginPct),
    }
  })

  return NextResponse.json({ date: todayDate, markets })
}
