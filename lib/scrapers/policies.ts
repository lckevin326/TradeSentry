import * as cheerio from 'cheerio'
import { supabaseAdmin } from '@/lib/supabase'
import type { PolicySource } from '@/types'

const KEYWORDS = ['轮胎', '橡胶', '4011', 'tire', 'GCC', 'UAE', '关税', 'tariff']

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

async function fetchMofcomPolicies(): Promise<PolicyItem[]> {
  const res = await fetch('http://www.mofcom.gov.cn/article/zcfb/', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) return []
  const html = await res.text()
  const $ = cheerio.load(html)
  const items: PolicyItem[] = []

  $('ul.list li').slice(0, 20).each((_, el) => {
    const a = $(el).find('a')
    const title = a.text().trim()
    const href = a.attr('href') ?? ''
    const dateText = $(el).find('span').text().trim()
    const url = href.startsWith('http') ? href : `http://www.mofcom.gov.cn${href}`
    if (title && href) {
      items.push({
        title,
        summary: null,
        source: 'mofcom',
        published_at: dateText ? new Date(dateText).toISOString() : new Date().toISOString(),
        url,
      })
    }
  })

  return items
}

async function fetchWtoPolicies(): Promise<PolicyItem[]> {
  const searchUrl = 'https://docs.wto.org/dol2fe/Pages/FE_Search/FE_S_S006.aspx?DataSource=Cat&query=tire+tariff&Language=English&Context=FomerScriptedSearch'
  const res2 = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res2.ok) return []
  const html = await res2.text()
  const $ = cheerio.load(html)
  const items: PolicyItem[] = []

  $('table tr').slice(1, 21).each((_, el) => {
    const cells = $(el).find('td')
    const title = cells.eq(1).text().trim()
    const href = cells.eq(1).find('a').attr('href') ?? ''
    const dateText = cells.eq(3).text().trim()
    if (title && href) {
      items.push({
        title,
        summary: null,
        source: 'wto',
        published_at: dateText ? new Date(dateText).toISOString() : new Date().toISOString(),
        url: href.startsWith('http') ? href : `https://docs.wto.org${href}`,
      })
    }
  })

  return items
}

export async function fetchAndSavePolicies(): Promise<{ scanned: number; saved: number; relevant: number }> {
  const allItems = [
    ...(await fetchMofcomPolicies()),
    ...(await fetchWtoPolicies()),
  ]

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
          message: `新政策：${item.title}（来源：${item.source}）`,
        })
      }
    }
  }

  return { scanned: allItems.length, saved, relevant }
}
