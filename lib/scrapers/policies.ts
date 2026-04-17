import { chromium } from 'playwright'
import { supabaseAdmin } from '@/lib/supabase'
import type { PolicySource } from '@/types'

const KEYWORDS = ['轮胎', '橡胶', '4011', 'tire', 'GCC', 'UAE', '关税', 'tariff', '外贸', '进出口']

function isRelevant(text: string): boolean {
  const lower = text.toLowerCase()
  return KEYWORDS.some(kw => lower.includes(kw.toLowerCase()))
}

function matchedKeywords(text: string): string[] {
  const lower = text.toLowerCase()
  return KEYWORDS.filter(kw => lower.includes(kw.toLowerCase()))
}

interface PolicyItem {
  title: string
  summary: string | null
  source: PolicySource
  published_at: string
  url: string
}

// 商务部稳外贸政策页面（Playwright，绕过反爬）
async function fetchMofcomPolicies(page: import('playwright').Page): Promise<PolicyItem[]> {
  const items: PolicyItem[] = []
  try {
    await page.goto('https://www.mofcom.gov.cn/zcfb/wwmwwzzccs/index.html', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })
    await page.waitForTimeout(3000)

    const links = await page.evaluate(() => {
      const results: { title: string; href: string; date: string }[] = []
      for (const a of Array.from(document.querySelectorAll('a'))) {
        const container = a.parentElement
        const fullText = container?.textContent || ''
        const dateMatch = fullText.match(/\[(\d{4}-\d{2}-\d{2})\]/)
        const title = a.textContent?.trim() || ''
        if (dateMatch && title.length > 5 && a.href.includes('http')) {
          results.push({ title, date: dateMatch[1], href: a.href })
        }
      }
      return results.slice(0, 20)
    })

    for (const link of links) {
      if (link.title && link.href) {
        items.push({
          title: link.title,
          summary: null,
          source: 'mofcom',
          published_at: link.date ? new Date(link.date).toISOString() : new Date().toISOString(),
          url: link.href,
        })
      }
    }
  } catch (e) {
    console.warn('[policies] mofcom fetch failed:', e instanceof Error ? e.message : e)
  }
  return items
}

// WTO 新闻页面（Playwright）
async function fetchWtoPolicies(page: import('playwright').Page): Promise<PolicyItem[]> {
  const items: PolicyItem[] = []
  try {
    // WTO 关税和贸易政策新闻
    await page.goto('https://www.wto.org/english/tratop_e/tariffs_e/tariffs_e.htm', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })
    await page.waitForTimeout(3000)

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).filter(a => {
        const text = a.textContent?.trim() || ''
        const href = a.href || ''
        return text.length > 10 && href.includes('wto.org') && !href.includes('#')
      }).slice(0, 20).map(a => ({
        title: a.textContent?.trim() ?? '',
        href: a.href,
      }))
    })

    for (const link of links) {
      if (link.title && link.href) {
        items.push({
          title: link.title,
          summary: null,
          source: 'wto',
          published_at: new Date().toISOString(),
          url: link.href,
        })
      }
    }
  } catch (e) {
    console.warn('[policies] WTO fetch failed:', e instanceof Error ? e.message : e)
  }
  return items
}

export async function fetchAndSavePolicies(): Promise<{ scanned: number; saved: number; relevant: number }> {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' })

  let allItems: PolicyItem[] = []
  try {
    const [mofcom, wto] = await Promise.all([
      fetchMofcomPolicies(page),
      fetchWtoPolicies(page),
    ])
    allItems = [...mofcom, ...wto]
  } finally {
    await browser.close()
  }

  let saved = 0
  let relevant = 0

  for (const item of allItems) {
    const combined = `${item.title} ${item.summary ?? ''}`
    const relevantFlag = isRelevant(combined)
    const keywords = matchedKeywords(combined)

    const { error } = await supabaseAdmin.from('policies').upsert({
      ...item,
      is_relevant: relevantFlag,
      keywords,
    }, { onConflict: 'url', ignoreDuplicates: true })

    if (!error) {
      saved++
      if (relevantFlag) {
        relevant++
        await supabaseAdmin.from('alerts').insert({
          type: 'new_policy',
          severity: 'medium',
          message: `新政策：${item.title}（来源：${item.source === 'mofcom' ? '商务部' : 'WTO'}）`,
        })
      }
    }
  }

  return { scanned: allItems.length, saved, relevant }
}
