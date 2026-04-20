import { NextResponse } from 'next/server'

import { calculateTodayProfit } from '../../../lib/profit/market-data'
import type {
  ContainerType,
  Country,
  OrderInput,
  ProfitQuoteCurrency,
  TradeTerm,
} from '../../../lib/profit/index'

type QuoteRow = {
  id: string
  created_at: string
  destination_country: Country
  hs_code: string
  trade_term: TradeTerm
  quote_currency: ProfitQuoteCurrency
  quoted_amount: number
  quantity: number
  product_cost: number
  misc_fees: number
  route_key: string
  container_type: ContainerType
  override_freight: number | null
  saved_margin_pct: number
  saved_profit_cny: number
  saved_fx_rate: number
  saved_tariff_pct: number
  saved_freight_cny: number
  saved_rebate_pct: number
  note: string | null
}

type SaveQuoteBody = {
  input: OrderInput & { overrideFreight?: number | null }
  savedMarginPct: number
  savedProfitCny: number
  savedFxRate: number
  savedTariffPct: number
  savedFreightCny: number
  savedRebatePct: number
  note?: string
}

export async function POST(request: Request) {
  try {
    const { supabaseAdmin } = await import('../../../lib/supabase')
    const body = (await request.json()) as SaveQuoteBody

    const { error } = await supabaseAdmin.from('quote_history').insert({
      destination_country: body.input.destinationCountry,
      hs_code: body.input.hsCode,
      trade_term: body.input.tradeTerm,
      quote_currency: body.input.quoteCurrency,
      quoted_amount: body.input.quotedAmount,
      quantity: body.input.quantity,
      product_cost: body.input.productCost,
      misc_fees: body.input.miscFees,
      route_key: body.input.routeKey,
      container_type: body.input.containerType,
      override_freight: body.input.overrideFreight ?? null,
      saved_margin_pct: body.savedMarginPct,
      saved_profit_cny: body.savedProfitCny,
      saved_fx_rate: body.savedFxRate,
      saved_tariff_pct: body.savedTariffPct,
      saved_freight_cny: body.savedFreightCny,
      saved_rebate_pct: body.savedRebatePct,
      note: body.note ?? null,
    })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { supabase } = await import('../../../lib/supabase')

    const { data, error } = await supabase
      .from('quote_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const rows = (data ?? []) as QuoteRow[]

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const order: OrderInput = {
          destinationCountry: row.destination_country,
          hsCode: row.hs_code,
          tradeTerm: row.trade_term,
          quoteCurrency: row.quote_currency,
          quotedAmount: row.quoted_amount,
          quantity: row.quantity,
          productCost: row.product_cost,
          miscFees: row.misc_fees,
          routeKey: row.route_key,
          containerType: row.container_type,
        }

        try {
          const todayResult = await calculateTodayProfit(order)
          return { ...row, today_margin_pct: todayResult.marginPct, today_profit_cny: todayResult.profitCny }
        } catch {
          return { ...row, today_margin_pct: null, today_profit_cny: null }
        }
      }),
    )

    return NextResponse.json({ ok: true, quotes: enriched })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
