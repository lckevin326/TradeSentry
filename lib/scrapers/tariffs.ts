import { chromium } from 'playwright'
import { supabaseAdmin } from '@/lib/supabase'
import type { Country } from '@/types'

// GCC 国家代码（作为进口方/reporter）
const COUNTRY_CODES: Record<Country, string> = {
  UAE: '784',
  SA:  '682',
  KW:  '414',
  QA:  '634',
  BH:  '48',
  OM:  '512',
}

const HS_CODES = ['401110', '401120', '401140', '401150', '401170', '401180']
const CHINA = '156' // 中国（出口方/partner）

interface MacMapResult {
  country: Country
  hs_code: string
  rate_pct: number | null
  source_url: string
}

async function fetchOneTariff(
  page: import('playwright').Page,
  country: Country,
  hsCode: string
): Promise<MacMapResult> {
  const reporterCode = COUNTRY_CODES[country]
  const url = `https://www.macmap.org/en/query/results?reporter=${reporterCode}&partner=${CHINA}&product=${hsCode}&indicator=1`

  let rate_pct: number | null = null

  // 拦截 customduties API 响应，提取 MaxMFNDutiesApplied
  const handler = async (resp: import('playwright').Response) => {
    if (
      resp.url().includes('customduties') &&
      resp.url().includes(`reporter=${reporterCode}`)
    ) {
      try {
        const data = await resp.json()
        const raw: string | null = data?.MaxMFNDutiesApplied ?? null
        if (raw) {
          const match = raw.match(/(\d+(?:\.\d+)?)/)
          if (match) rate_pct = parseFloat(match[1])
        }
      } catch (_) {}
    }
  }

  page.on('response', handler)

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    // 等待 API 调用完成（最多 15 秒）
    await page.waitForTimeout(15000)
  } catch (_) {
    // timeout 不影响已拦截到的数据
  } finally {
    page.off('response', handler)
  }

  return { country, hs_code: hsCode, rate_pct, source_url: url }
}

export async function fetchAndSaveTariffs(): Promise<{ checked: number; changed: number; failed: number }> {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' })

  let changed = 0
  let failed = 0
  const results: MacMapResult[] = []

  try {
    for (const country of Object.keys(COUNTRY_CODES) as Country[]) {
      for (const hs of HS_CODES) {
        console.log(`[tariffs] Fetching ${country} HS${hs}...`)
        const result = await fetchOneTariff(page, country, hs)
        results.push(result)
        if (result.rate_pct === null) {
          console.warn(`[tariffs] No rate for ${country} HS${hs}`)
        } else {
          console.log(`[tariffs] ${country} HS${hs} = ${result.rate_pct}%`)
        }
      }
    }
  } finally {
    await browser.close()
  }

  for (const result of results) {
    if (result.rate_pct === null) {
      failed++
      continue
    }

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
