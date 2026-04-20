import { supabaseAdmin } from '@/lib/supabase'
import type { Currency } from '@/types'

const CURRENCIES: Currency[] = ['USD', 'AED', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR']
const THRESHOLD = parseFloat(process.env.RATE_SPIKE_THRESHOLD ?? '0.5')

export async function fetchAndSaveRates(): Promise<{ saved: number; alerts: number }> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY!
  const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/CNY`)
  if (!res.ok) throw new Error(`ExchangeRate-API error: ${res.status}`)
  const data = await res.json()

  const today = new Date().toISOString().slice(0, 10)
  let savedCount = 0
  let alertCount = 0

  for (const currency of CURRENCIES) {
    const rate: number = data.conversion_rates[currency]
    if (!rate) continue

    // 查询昨日汇率
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const { data: prev } = await supabaseAdmin
      .from('exchange_rates')
      .select('rate')
      .eq('target', currency)
      .eq('date', yesterday)
      .single()

    const change_pct = prev?.rate
      ? parseFloat((((rate - prev.rate) / prev.rate) * 100).toFixed(4))
      : null

    await supabaseAdmin.from('exchange_rates').upsert({
      date: today,
      base: 'CNY',
      target: currency,
      rate,
      change_pct,
    }, { onConflict: 'date,target' })
    savedCount++

    // 生成告警
    if (change_pct !== null && Math.abs(change_pct) > THRESHOLD) {
      const severity = Math.abs(change_pct) > 1 ? 'high' : 'medium'
      await supabaseAdmin.from('alerts').insert({
        type: 'rate_spike',
        severity,
        message: `CNY/${currency} 汇率单日波动 ${change_pct > 0 ? '+' : ''}${change_pct}%（今日 ${rate}）`,
      })
      alertCount++
    }
  }

  return { saved: savedCount, alerts: alertCount }
}
