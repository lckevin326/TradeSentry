import { supabaseAdmin } from '@/lib/supabase'
import type { Country } from '@/types'

const COUNTRY_CODES: Record<Country, string> = {
  UAE: '784',
  SA:  '682',
  KW:  '414',
  QA:  '634',
  BH:  '48',
  OM:  '512',
}

const HS_CODES = ['401110', '401120', '401140', '401150', '401170', '401180']
const REPORTER = '156' // 中国

interface MacMapResult {
  country: Country
  hs_code: string
  rate_pct: number | null
  source_url: string
}

async function fetchOneTariff(country: Country, hsCode: string): Promise<MacMapResult> {
  const partnerCode = COUNTRY_CODES[country]
  const url = `https://www.macmap.org/api/results/query?reporter=${REPORTER}&partner=${partnerCode}&product=${hsCode}&indicator=1`

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
  })

  // MacMap 可能返回 HTML（JS 渲染），此时 rate_pct 为 null，后续人工处理
  if (!res.ok || !res.headers.get('content-type')?.includes('json')) {
    return { country, hs_code: hsCode, rate_pct: null, source_url: url }
  }

  const data = await res.json()
  // MacMap JSON 结构：data.results[0].duty_rate 或 data.simpleAverage，根据实际返回调整
  const rate = data?.results?.[0]?.duty_rate ?? data?.simpleAverage ?? null
  return {
    country,
    hs_code: hsCode,
    rate_pct: rate !== null ? parseFloat(rate) : null,
    source_url: url,
  }
}

export async function fetchAndSaveTariffs(): Promise<{ checked: number; changed: number; failed: number }> {
  let changed = 0
  let failed = 0
  const results: MacMapResult[] = []

  for (const country of Object.keys(COUNTRY_CODES) as Country[]) {
    for (const hs of HS_CODES) {
      const result = await fetchOneTariff(country, hs)
      results.push(result)
      // 礼貌延迟，避免被封
      await new Promise(r => setTimeout(r, 500))
    }
  }

  for (const result of results) {
    if (result.rate_pct === null) {
      failed++
      continue
    }

    // 查询数据库最新一条
    const { data: latest } = await supabaseAdmin
      .from('tariffs')
      .select('rate_pct')
      .eq('hs_code', result.hs_code)
      .eq('country', result.country)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single()

    const prev_rate_pct = latest?.rate_pct ?? null
    const isChanged = prev_rate_pct !== null && prev_rate_pct !== result.rate_pct

    await supabaseAdmin.from('tariffs').insert({
      hs_code: result.hs_code,
      country: result.country,
      rate_pct: result.rate_pct,
      prev_rate_pct,
      changed: isChanged,
      source_url: result.source_url,
    })

    if (isChanged) {
      changed++
      await supabaseAdmin.from('alerts').insert({
        type: 'tariff_change',
        severity: 'high',
        message: `${result.country} HS ${result.hs_code} 关税变化：${prev_rate_pct}% → ${result.rate_pct}%`,
      })
    }
  }

  return { checked: results.length, changed, failed }
}
