# 关税监控系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个内部运营看板，自动抓取 CNY 兑 GCC 六国货币汇率与商务部/WTO 政策公告，手动触发抓取 HS 4011 轮胎关税，展示趋势曲线与异常告警，移动端适配。

**Architecture:** Next.js 14 App Router 一体化应用，API Routes 同时承担数据抓取与前端数据接口职责。`node-cron` 在本地开发时注册定时任务（汇率/政策每日自动，关税手动触发）。数据持久化至 Supabase（PostgreSQL），前端用 Recharts 绘制折线图。

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Recharts, @supabase/supabase-js, node-cron, cheerio, ExchangeRate-API

---

## 文件结构

```
guan/
├── app/
│   ├── layout.tsx                        # 根布局，导航栏
│   ├── page.tsx                          # Dashboard 总览
│   ├── exchange-rates/
│   │   └── page.tsx                      # 汇率详情页
│   ├── tariffs/
│   │   └── page.tsx                      # 关税详情页
│   └── policies/
│       └── page.tsx                      # 政策动态页
├── app/api/
│   ├── fetch/
│   │   ├── rates/route.ts                # 汇率抓取 API
│   │   ├── tariffs/route.ts              # 关税抓取 API（手动触发）
│   │   └── policies/route.ts             # 政策扫描 API
│   ├── alerts/route.ts                   # Alert 列表 & 标记已读
│   ├── exchange-rates/route.ts           # 汇率历史数据查询
│   ├── tariffs/route.ts                  # 关税历史数据查询
│   └── policies/route.ts                 # 政策列表查询
├── lib/
│   ├── supabase.ts                       # Supabase 客户端（server/browser 两个实例）
│   ├── cron.ts                           # node-cron 定时任务注册
│   └── scrapers/
│       ├── rates.ts                      # 汇率抓取逻辑
│       ├── tariffs.ts                    # 关税抓取逻辑
│       └── policies.ts                   # 政策扫描逻辑
├── components/
│   ├── Nav.tsx                           # 顶部/底部导航
│   ├── AlertBanner.tsx                   # 未读告警横幅
│   ├── RateCard.tsx                      # 汇率数字卡片
│   ├── RateChart.tsx                     # 汇率折线图（Recharts）
│   ├── TariffTable.tsx                   # 关税数据表格
│   ├── PolicyTimeline.tsx                # 政策时间线
│   └── PolicyRateChart.tsx               # 政策与汇率叠加图
├── types/
│   └── index.ts                          # 共享 TypeScript 类型定义
├── instrumentation.ts                    # Next.js 服务启动钩子（注册 cron）
├── vercel.json                           # Vercel Cron 配置（上线时启用）
├── .env.local                            # 环境变量（不提交 git）
└── .env.example                          # 环境变量示例（提交 git）
```

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json` (via `create-next-app`)
- Create: `.env.local`
- Create: `.env.example`
- Create: `types/index.ts`

- [ ] **Step 1: 创建 Next.js 项目**

```bash
cd /Users/liuchao/Product/AI/Product/guan
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

选项确认：TypeScript ✓, Tailwind ✓, App Router ✓, no src dir ✓

- [ ] **Step 2: 安装依赖**

```bash
npm install @supabase/supabase-js recharts cheerio node-cron
npm install -D @types/node-cron
```

- [ ] **Step 3: 创建 `.env.example`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EXCHANGE_RATE_API_KEY=your-api-key
RATE_SPIKE_THRESHOLD=0.5
```

- [ ] **Step 4: 创建 `.env.local`（填入真实值，不提交 git）**

复制 `.env.example`，填入你的 Supabase 项目 URL、anon key、service role key，以及 ExchangeRate-API key（在 https://www.exchangerate-api.com 免费注册获取）。

- [ ] **Step 5: 创建 `types/index.ts`**

```typescript
export type Currency = 'AED' | 'SAR' | 'KWD' | 'QAR' | 'BHD' | 'OMR'
export type Country = 'UAE' | 'SA' | 'KW' | 'QA' | 'BH' | 'OM'
export type AlertType = 'tariff_change' | 'rate_spike' | 'new_policy'
export type Severity = 'high' | 'medium' | 'low'
export type PolicySource = 'mofcom' | 'wto'

export interface ExchangeRate {
  id: string
  date: string
  base: string
  target: Currency
  rate: number
  change_pct: number | null
  created_at: string
}

export interface Tariff {
  id: string
  hs_code: string
  country: Country
  rate_pct: number
  prev_rate_pct: number | null
  effective_date: string | null
  changed: boolean
  source_url: string | null
  fetched_at: string
}

export interface Policy {
  id: string
  title: string
  summary: string | null
  source: PolicySource
  country: string | null
  published_at: string
  url: string
  keywords: string[]
  is_relevant: boolean
  created_at: string
}

export interface Alert {
  id: string
  type: AlertType
  ref_table: string | null
  ref_id: string | null
  severity: Severity
  message: string
  is_read: boolean
  created_at: string
}
```

- [ ] **Step 6: 更新 `.gitignore` 确保 `.env.local` 不被提交**

```bash
grep -q ".env.local" .gitignore || echo ".env.local" >> .gitignore
```

- [ ] **Step 7: 初始提交**

```bash
git init
git add -A
git commit -m "feat: init Next.js project with TypeScript, Tailwind, Supabase, Recharts"
```

---

## Task 2: Supabase 数据库建表

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: 在 Supabase Dashboard 创建四张表**

登录 https://supabase.com，进入你的项目 → SQL Editor，执行以下 SQL：

```sql
-- 汇率表
create table exchange_rates (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  base text not null default 'CNY',
  target text not null,
  rate numeric(12,6) not null,
  change_pct numeric(8,4),
  created_at timestamptz default now()
);
create index on exchange_rates (date, target);

-- 关税表
create table tariffs (
  id uuid primary key default gen_random_uuid(),
  hs_code text not null,
  country text not null,
  rate_pct numeric(8,4) not null,
  prev_rate_pct numeric(8,4),
  effective_date date,
  changed boolean default false,
  source_url text,
  fetched_at timestamptz default now()
);
create index on tariffs (hs_code, country, fetched_at desc);

-- 政策表
create table policies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  source text not null,
  country text,
  published_at timestamptz,
  url text unique,
  keywords text[],
  is_relevant boolean default false,
  created_at timestamptz default now()
);
create index on policies (published_at desc, is_relevant);

-- 告警表
create table alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  ref_table text,
  ref_id uuid,
  severity text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);
create index on alerts (is_read, created_at desc);
```

- [ ] **Step 2: 创建 `lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 浏览器端客户端（anon key，受 RLS 限制）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 服务端客户端（service role key，绕过 RLS，仅用于 API Routes）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
```

- [ ] **Step 3: 验证连接**

在 `app/api/health/route.ts` 临时创建：

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error } = await supabaseAdmin.from('alerts').select('id').limit(1)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

```bash
npm run dev
# 访问 http://localhost:3000/api/health，应返回 {"ok":true}
```

- [ ] **Step 4: 提交**

```bash
git add lib/supabase.ts app/api/health/route.ts
git commit -m "feat: add Supabase client and database schema"
```

---

## Task 3: 汇率抓取器

**Files:**
- Create: `lib/scrapers/rates.ts`
- Create: `app/api/fetch/rates/route.ts`

- [ ] **Step 1: 创建 `lib/scrapers/rates.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import type { Currency } from '@/types'

const CURRENCIES: Currency[] = ['AED', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR']
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
```

注意：`upsert` 需要在 Supabase 上为 `exchange_rates` 表的 `(date, target)` 添加唯一约束：

```sql
alter table exchange_rates add constraint exchange_rates_date_target_key unique (date, target);
```

- [ ] **Step 2: 创建 `app/api/fetch/rates/route.ts`**

```typescript
import { fetchAndSaveRates } from '@/lib/scrapers/rates'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const result = await fetchAndSaveRates()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: 手动测试**

```bash
curl -X POST http://localhost:3000/api/fetch/rates
# 预期返回：{"ok":true,"saved":6,"alerts":0}
# 然后去 Supabase Dashboard → Table Editor → exchange_rates 确认有 6 条记录
```

- [ ] **Step 4: 提交**

```bash
git add lib/scrapers/rates.ts app/api/fetch/rates/route.ts
git commit -m "feat: add exchange rate scraper and fetch API"
```

---

## Task 4: 关税抓取器

**Files:**
- Create: `lib/scrapers/tariffs.ts`
- Create: `app/api/fetch/tariffs/route.ts`

- [ ] **Step 1: 创建 `lib/scrapers/tariffs.ts`**

MacMap 提供可直接调用的 JSON API，URL 规律如下：
- 报告方（出口国）：中国 = 156
- 合作方（进口国）：UAE=784, SA=682, KW=414, QA=634, BH=48, OM=512
- HS 编码：4011xx

```typescript
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
```

> **注意**：MacMap 的 JSON API 端点需在实际运行时验证。如果返回 HTML（JS 渲染），`failed` 计数会增加，此时在 Supabase alerts 表中手动插入一条 `type='tariff_change'` 的 alert 作为提醒，或后续引入 Playwright。

- [ ] **Step 2: 创建 `app/api/fetch/tariffs/route.ts`**

```typescript
import { fetchAndSaveTariffs } from '@/lib/scrapers/tariffs'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const result = await fetchAndSaveTariffs()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: 手动测试**

```bash
curl -X POST http://localhost:3000/api/fetch/tariffs
# 预期返回：{"ok":true,"checked":36,"changed":0,"failed":N}
# 去 Supabase tariffs 表检查记录，rate_pct 字段若全为 null 说明 MacMap 返回了 HTML
# 此时检查 network tab，找到真实 API 端点，更新 fetchOneTariff 中的 URL
```

- [ ] **Step 4: 提交**

```bash
git add lib/scrapers/tariffs.ts app/api/fetch/tariffs/route.ts
git commit -m "feat: add tariff scraper and manual trigger API"
```

---

## Task 5: 政策扫描器

**Files:**
- Create: `lib/scrapers/policies.ts`
- Create: `app/api/fetch/policies/route.ts`

- [ ] **Step 1: 创建 `lib/scrapers/policies.ts`**

```typescript
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
  const res = await fetch('https://docs.wto.org/dol2fe/Pages/SS/directdoc.aspx?filename=q:/WT/DS/finding.xml&Open=True', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  // WTO 通报页结构多变，此处抓取通报列表搜索页
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
```

- [ ] **Step 2: 创建 `app/api/fetch/policies/route.ts`**

```typescript
import { fetchAndSavePolicies } from '@/lib/scrapers/policies'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const result = await fetchAndSavePolicies()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: 手动测试**

```bash
curl -X POST http://localhost:3000/api/fetch/policies
# 预期返回：{"ok":true,"scanned":N,"saved":N,"relevant":N}
# 去 Supabase policies 表检查，is_relevant=true 的条目是否合理
```

- [ ] **Step 4: 提交**

```bash
git add lib/scrapers/policies.ts app/api/fetch/policies/route.ts
git commit -m "feat: add policy scanner for mofcom and WTO"
```

---

## Task 6: 定时任务注册

**Files:**
- Create: `lib/cron.ts`
- Create: `instrumentation.ts`
- Create: `vercel.json`

- [ ] **Step 1: 创建 `lib/cron.ts`**

```typescript
import cron from 'node-cron'

export function registerCronJobs() {
  // 每日 09:00 抓取汇率
  cron.schedule('0 9 * * *', async () => {
    console.log('[cron] Fetching exchange rates...')
    try {
      await fetch('http://localhost:3000/api/fetch/rates', { method: 'POST' })
    } catch (e) {
      console.error('[cron] Rate fetch failed:', e)
    }
  }, { timezone: 'Asia/Shanghai' })

  // 每日 10:00 扫描政策
  cron.schedule('0 10 * * *', async () => {
    console.log('[cron] Scanning policies...')
    try {
      await fetch('http://localhost:3000/api/fetch/policies', { method: 'POST' })
    } catch (e) {
      console.error('[cron] Policy scan failed:', e)
    }
  }, { timezone: 'Asia/Shanghai' })

  console.log('[cron] Jobs registered: rates@09:00, policies@10:00 (Asia/Shanghai)')
}
```

- [ ] **Step 2: 创建 `instrumentation.ts`（Next.js 服务启动钩子）**

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerCronJobs } = await import('./lib/cron')
    registerCronJobs()
  }
}
```

- [ ] **Step 3: 在 `next.config.ts` 启用 instrumentation**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true,
  },
}

export default nextConfig
```

- [ ] **Step 4: 创建 `vercel.json`（生产用，暂不激活）**

```json
{
  "crons": [
    {
      "path": "/api/fetch/rates",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/fetch/policies",
      "schedule": "0 2 * * *"
    }
  ]
}
```

注：Vercel Cron 时区为 UTC，`01:00 UTC = 09:00 CST`，`02:00 UTC = 10:00 CST`。

- [ ] **Step 5: 验证**

```bash
npm run dev
# 控制台应出现：[cron] Jobs registered: rates@09:00, policies@10:00 (Asia/Shanghai)
```

- [ ] **Step 6: 提交**

```bash
git add lib/cron.ts instrumentation.ts next.config.ts vercel.json
git commit -m "feat: register node-cron jobs via Next.js instrumentation hook"
```

---

## Task 7: 数据查询 API Routes

**Files:**
- Create: `app/api/exchange-rates/route.ts`
- Create: `app/api/tariffs/route.ts`
- Create: `app/api/policies/route.ts`
- Create: `app/api/alerts/route.ts`
- Delete: `app/api/health/route.ts`（临时文件，可删除）

- [ ] **Step 1: 创建 `app/api/exchange-rates/route.ts`**

```typescript
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const target = searchParams.get('target') ?? 'AED'
  const days = parseInt(searchParams.get('days') ?? '30')

  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('date, rate, change_pct')
    .eq('target', target)
    .gte('date', since)
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: 创建 `app/api/tariffs/route.ts`**

```typescript
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const country = searchParams.get('country')
  const hs_code = searchParams.get('hs_code')

  let query = supabase
    .from('tariffs')
    .select('id, hs_code, country, rate_pct, prev_rate_pct, effective_date, changed, fetched_at')
    .order('fetched_at', { ascending: false })

  if (country) query = query.eq('country', country)
  if (hs_code) query = query.eq('hs_code', hs_code)

  // 每个 hs_code+country 组合只取最新一条
  const { data, error } = await query.limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 去重：每组取最新
  const seen = new Set<string>()
  const latest = (data ?? []).filter(row => {
    const key = `${row.hs_code}-${row.country}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json(latest)
}
```

- [ ] **Step 3: 创建 `app/api/policies/route.ts`**

```typescript
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source')
  const relevantOnly = searchParams.get('relevant') !== 'false'

  let query = supabase
    .from('policies')
    .select('id, title, summary, source, country, published_at, url, keywords, is_relevant')
    .order('published_at', { ascending: false })
    .limit(50)

  if (relevantOnly) query = query.eq('is_relevant', true)
  if (source) query = query.eq('source', source)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: 创建 `app/api/alerts/route.ts`**

```typescript
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabaseAdmin
    .from('alerts')
    .update({ is_read: true })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: 测试所有查询接口**

```bash
curl "http://localhost:3000/api/exchange-rates?target=AED&days=7"
curl "http://localhost:3000/api/tariffs"
curl "http://localhost:3000/api/policies"
curl "http://localhost:3000/api/alerts"
# 均应返回 JSON 数组（可为空）
```

- [ ] **Step 6: 提交**

```bash
git add app/api/exchange-rates app/api/tariffs app/api/policies app/api/alerts
git commit -m "feat: add data query API routes for frontend consumption"
```

---

## Task 8: 共用组件

**Files:**
- Create: `components/Nav.tsx`
- Create: `components/AlertBanner.tsx`
- Create: `components/RateCard.tsx`
- Create: `components/RateChart.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: 创建 `components/Nav.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: '总览' },
  { href: '/exchange-rates', label: '汇率' },
  { href: '/tariffs', label: '关税' },
  { href: '/policies', label: '政策' },
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <>
      {/* 桌面端顶部导航 */}
      <nav className="hidden md:flex items-center gap-6 px-6 py-4 border-b bg-white sticky top-0 z-10">
        <span className="font-bold text-lg">关税监控</span>
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm font-medium transition-colors ${pathname === l.href ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {/* 移动端底部 Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex border-t bg-white z-10">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex-1 py-3 text-center text-xs font-medium transition-colors ${pathname === l.href ? 'text-blue-600' : 'text-gray-500'}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
```

- [ ] **Step 2: 创建 `components/AlertBanner.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import type { Alert } from '@/types'

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    fetch('/api/alerts').then(r => r.json()).then(setAlerts)
  }, [])

  if (alerts.length === 0) return null

  const dismiss = async (id: string) => {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const colorMap: Record<string, string> = {
    high: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    low: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  return (
    <div className="space-y-2 mb-4">
      {alerts.map(alert => (
        <div key={alert.id} className={`flex items-start justify-between p-3 rounded border text-sm ${colorMap[alert.severity]}`}>
          <span>{alert.message}</span>
          <button onClick={() => dismiss(alert.id)} className="ml-4 opacity-60 hover:opacity-100 shrink-0">✕</button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: 创建 `components/RateCard.tsx`**

```tsx
interface RateCardProps {
  label: string
  value: string
  sub?: string
  highlight?: 'up' | 'down' | null
}

export default function RateCard({ label, value, sub, highlight }: RateCardProps) {
  const subColor = highlight === 'up' ? 'text-green-600' : highlight === 'down' ? 'text-red-600' : 'text-gray-500'
  return (
    <div className="bg-white rounded-xl border p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {sub && <span className={`text-sm font-medium ${subColor}`}>{sub}</span>}
    </div>
  )
}
```

- [ ] **Step 4: 创建 `components/RateChart.tsx`**

```tsx
'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { ExchangeRate } from '@/types'

interface Props {
  data: Pick<ExchangeRate, 'date' | 'rate' | 'change_pct'>[]
}

export default function RateChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} tickLine={false} width={60} />
        <Tooltip
          formatter={(v: number) => [v.toFixed(6), '汇率']}
          labelFormatter={(l: string) => `日期：${l}`}
        />
        <Line type="monotone" dataKey="rate" stroke="#2563eb" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 5: 更新 `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: '关税监控',
  description: '外贸轮胎出口关税、汇率、政策监控',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="bg-gray-50 min-h-screen">
        <Nav />
        <main className="max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-6">
          {children}
        </main>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: 验证**

```bash
npm run dev
# 访问 http://localhost:3000，确认导航栏渲染正常
# 缩小浏览器到 375px 宽，确认底部 Tab Bar 出现
```

- [ ] **Step 7: 提交**

```bash
git add components/ app/layout.tsx
git commit -m "feat: add Nav, AlertBanner, RateCard, RateChart components"
```

---

## Task 9: Dashboard 总览页

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 编写 `app/page.tsx`**

```tsx
import AlertBanner from '@/components/AlertBanner'
import RateCard from '@/components/RateCard'
import RateChart from '@/components/RateChart'
import { supabase } from '@/lib/supabase'

export const revalidate = 300 // 5 分钟重新验证

async function getLatestRate(target: string) {
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate, change_pct, date')
    .eq('target', target)
    .order('date', { ascending: false })
    .limit(1)
    .single()
  return data
}

async function getLatestTariffUpdate() {
  const { data } = await supabase
    .from('tariffs')
    .select('fetched_at, changed')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

async function getRecentPolicyCount() {
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const { count } = await supabase
    .from('policies')
    .select('id', { count: 'exact', head: true })
    .eq('is_relevant', true)
    .gte('created_at', since)
  return count ?? 0
}

async function getChartData(target: string) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('exchange_rates')
    .select('date, rate, change_pct')
    .eq('target', target)
    .gte('date', since)
    .order('date', { ascending: true })
  return data ?? []
}

export default async function DashboardPage() {
  const [aedRate, tariffUpdate, policyCount, chartData] = await Promise.all([
    getLatestRate('AED'),
    getLatestTariffUpdate(),
    getRecentPolicyCount(),
    getChartData('AED'),
  ])

  const changePct = aedRate?.change_pct
  const changeStr = changePct != null
    ? `${changePct > 0 ? '+' : ''}${changePct}%`
    : '暂无数据'
  const highlight = changePct == null ? null : changePct > 0 ? 'up' : 'down'

  const tariffDate = tariffUpdate?.fetched_at
    ? new Date(tariffUpdate.fetched_at).toLocaleDateString('zh-CN')
    : '尚未抓取'
  const tariffStatus = tariffUpdate?.changed ? '有变化' : '无变化'

  return (
    <div className="space-y-6">
      <AlertBanner />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RateCard
          label="CNY / AED 今日汇率"
          value={aedRate?.rate?.toFixed(6) ?? '--'}
          sub={changeStr}
          highlight={highlight}
        />
        <RateCard
          label="最近关税更新"
          value={tariffDate}
          sub={tariffUpdate ? tariffStatus : '点击关税页手动更新'}
        />
        <RateCard
          label="近 7 日新增政策"
          value={String(policyCount)}
          sub="条相关政策公告"
        />
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-4">CNY/AED 近 30 日汇率走势</h2>
        <RateChart data={chartData} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证**

```bash
# 确保已运行过 POST /api/fetch/rates 有数据
# 访问 http://localhost:3000
# 应看到三张卡片和汇率折线图
```

- [ ] **Step 3: 提交**

```bash
git add app/page.tsx
git commit -m "feat: build dashboard overview page with rate cards and chart"
```

---

## Task 10: 汇率详情页

**Files:**
- Create: `app/exchange-rates/page.tsx`

- [ ] **Step 1: 创建 `app/exchange-rates/page.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import RateChart from '@/components/RateChart'
import type { Currency, ExchangeRate } from '@/types'

const CURRENCIES: Currency[] = ['AED', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR']
const PERIODS = [
  { label: '7日', days: 7 },
  { label: '30日', days: 30 },
  { label: '90日', days: 90 },
]

const THRESHOLD = 0.5

export default function ExchangeRatesPage() {
  const [currency, setCurrency] = useState<Currency>('AED')
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Pick<ExchangeRate, 'date' | 'rate' | 'change_pct'>[]>([])

  useEffect(() => {
    fetch(`/api/exchange-rates?target=${currency}&days=${days}`)
      .then(r => r.json())
      .then(setData)
  }, [currency, days])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">汇率详情</h1>

      {/* 货币对切换 */}
      <div className="flex gap-2 flex-wrap">
        {CURRENCIES.map(c => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${currency === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
          >
            CNY/{c}
          </button>
        ))}
      </div>

      {/* 时间区间切换 */}
      <div className="flex gap-2">
        {PERIODS.map(p => (
          <button
            key={p.days}
            onClick={() => setDays(p.days)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${days === p.days ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 折线图 */}
      <div className="bg-white rounded-xl border p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-4">CNY/{currency} 汇率走势</h2>
        <RateChart data={data} />
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">日期</th>
                <th className="px-4 py-3 text-right">汇率</th>
                <th className="px-4 py-3 text-right">涨跌幅</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...data].reverse().map(row => {
                const pct = row.change_pct
                const isSpike = pct != null && Math.abs(pct) > THRESHOLD
                return (
                  <tr key={row.date} className={isSpike ? 'bg-yellow-50' : ''}>
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3 text-right font-mono">{row.rate?.toFixed(6)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${pct == null ? 'text-gray-400' : pct > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pct != null ? `${pct > 0 ? '+' : ''}${pct}%` : '--'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证**

```bash
# 访问 http://localhost:3000/exchange-rates
# 切换货币对和时间区间，图表和表格应同步更新
# 缩小到手机宽度，确认表格可横向滚动
```

- [ ] **Step 3: 提交**

```bash
git add app/exchange-rates/page.tsx
git commit -m "feat: build exchange rates detail page with chart and table"
```

---

## Task 11: 关税详情页

**Files:**
- Create: `components/TariffTable.tsx`
- Create: `app/tariffs/page.tsx`

- [ ] **Step 1: 创建 `components/TariffTable.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { Tariff, Country } from '@/types'

const COUNTRIES: Country[] = ['UAE', 'SA', 'KW', 'QA', 'BH', 'OM']
const HS_CODES = ['401110', '401120', '401140', '401150', '401170', '401180']

interface Props {
  data: Tariff[]
  onRefresh: () => void
  loading: boolean
}

export default function TariffTable({ data, onRefresh, loading }: Props) {
  const [country, setCountry] = useState<Country | ''>('')
  const [hs, setHs] = useState('')

  const filtered = data.filter(row =>
    (!country || row.country === country) &&
    (!hs || row.hs_code === hs)
  )

  return (
    <div className="space-y-4">
      {/* 筛选器 */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select
            value={country}
            onChange={e => setCountry(e.target.value as Country | '')}
            className="text-sm border rounded px-2 py-1.5 bg-white"
          >
            <option value="">全部国家</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={hs}
            onChange={e => setHs(e.target.value)}
            className="text-sm border rounded px-2 py-1.5 bg-white"
          >
            <option value="">全部 HS 编码</option>
            {HS_CODES.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '更新中…' : '手动更新关税'}
        </button>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">国家</th>
                <th className="px-4 py-3 text-left">HS 编码</th>
                <th className="px-4 py-3 text-right">当前税率</th>
                <th className="px-4 py-3 text-right">上次税率</th>
                <th className="px-4 py-3 text-right">变化</th>
                <th className="px-4 py-3 text-left">更新时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无数据，请点击「手动更新关税」</td></tr>
              )}
              {filtered.map(row => {
                const diff = row.prev_rate_pct != null ? row.rate_pct - row.prev_rate_pct : null
                return (
                  <tr key={row.id} className={row.changed ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3 font-medium">{row.country}</td>
                    <td className="px-4 py-3 font-mono">{row.hs_code}</td>
                    <td className="px-4 py-3 text-right font-mono">{row.rate_pct}%</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-400">{row.prev_rate_pct != null ? `${row.prev_rate_pct}%` : '--'}</td>
                    <td className={`px-4 py-3 text-right font-mono ${diff == null ? 'text-gray-400' : diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)}%` : '--'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(row.fetched_at).toLocaleDateString('zh-CN')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 `app/tariffs/page.tsx`**

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import TariffTable from '@/components/TariffTable'
import type { Tariff } from '@/types'

export default function TariffsPage() {
  const [data, setData] = useState<Tariff[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(() => {
    fetch('/api/tariffs').then(r => r.json()).then(setData)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleRefresh = async () => {
    setLoading(true)
    await fetch('/api/fetch/tariffs', { method: 'POST' })
    await loadData()
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">关税详情</h1>
      <TariffTable data={data} onRefresh={handleRefresh} loading={loading} />
    </div>
  )
}
```

- [ ] **Step 3: 验证**

```bash
# 访问 http://localhost:3000/tariffs
# 点击「手动更新关税」，按钮变为「更新中…」，完成后表格刷新
# 筛选国家/HS 编码，表格应正确过滤
```

- [ ] **Step 4: 提交**

```bash
git add components/TariffTable.tsx app/tariffs/page.tsx
git commit -m "feat: build tariff detail page with filter and manual refresh"
```

---

## Task 12: 政策动态页

**Files:**
- Create: `components/PolicyTimeline.tsx`
- Create: `components/PolicyRateChart.tsx`
- Create: `app/policies/page.tsx`

- [ ] **Step 1: 创建 `components/PolicyTimeline.tsx`**

```tsx
import type { Policy, PolicySource } from '@/types'

interface Props {
  data: Policy[]
  source: PolicySource | ''
  onSourceChange: (s: PolicySource | '') => void
}

export default function PolicyTimeline({ data, source, onSourceChange }: Props) {
  return (
    <div className="space-y-4">
      {/* 来源筛选 */}
      <div className="flex gap-2">
        {(['', 'mofcom', 'wto'] as const).map(s => (
          <button
            key={s}
            onClick={() => onSourceChange(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${source === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            {s === '' ? '全部' : s === 'mofcom' ? '商务部' : 'WTO'}
          </button>
        ))}
      </div>

      {/* 时间线 */}
      <div className="space-y-3">
        {data.length === 0 && (
          <div className="text-center text-gray-400 py-8">暂无相关政策数据</div>
        )}
        {data.map(p => (
          <div key={p.id} className="bg-white rounded-xl border p-4 flex gap-4">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
              <div className="w-px flex-1 bg-gray-200" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs text-gray-400">
                  {p.published_at ? new Date(p.published_at).toLocaleDateString('zh-CN') : '--'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.source === 'mofcom' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                  {p.source === 'mofcom' ? '商务部' : 'WTO'}
                </span>
                {p.keywords?.map(kw => (
                  <span key={kw} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{kw}</span>
                ))}
              </div>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:text-blue-600 line-clamp-2 block">
                {p.title}
              </a>
              {p.summary && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.summary}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 `components/PolicyRateChart.tsx`**

```tsx
'use client'
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend
} from 'recharts'
import type { ExchangeRate, Policy } from '@/types'

interface Props {
  rates: Pick<ExchangeRate, 'date' | 'rate'>[]
  policies: Pick<Policy, 'published_at' | 'title'>[]
}

export default function PolicyRateChart({ rates, policies }: Props) {
  const policyDates = new Set(
    policies.map(p => p.published_at?.slice(0, 10)).filter(Boolean)
  )

  return (
    <div className="bg-white rounded-xl border p-4">
      <h2 className="text-sm font-medium text-gray-500 mb-4">政策发布时间 vs CNY/AED 汇率走势</h2>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={rates} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} tickLine={false} width={60} />
          <Tooltip
            formatter={(v: number) => [v.toFixed(6), 'CNY/AED']}
            labelFormatter={(l: string) => `日期：${l}`}
          />
          <Line type="monotone" dataKey="rate" stroke="#2563eb" dot={false} strokeWidth={2} name="CNY/AED" />
          {[...policyDates].map(date => (
            <ReferenceLine key={date} x={date} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '政策', position: 'top', fontSize: 10, fill: '#f59e0b' }} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-2">黄色虚线为相关政策发布时间节点</p>
    </div>
  )
}
```

- [ ] **Step 3: 创建 `app/policies/page.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import PolicyTimeline from '@/components/PolicyTimeline'
import PolicyRateChart from '@/components/PolicyRateChart'
import type { Policy, ExchangeRate, PolicySource } from '@/types'

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [rates, setRates] = useState<Pick<ExchangeRate, 'date' | 'rate'>[]>([])
  const [source, setSource] = useState<PolicySource | ''>('')

  useEffect(() => {
    const srcParam = source ? `&source=${source}` : ''
    fetch(`/api/policies?relevant=true${srcParam}`)
      .then(r => r.json()).then(setPolicies)
  }, [source])

  useEffect(() => {
    fetch('/api/exchange-rates?target=AED&days=90')
      .then(r => r.json()).then(setRates)
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">政策动态</h1>
      <PolicyRateChart rates={rates} policies={policies} />
      <PolicyTimeline data={policies} source={source} onSourceChange={setSource} />
    </div>
  )
}
```

- [ ] **Step 4: 验证**

```bash
# 访问 http://localhost:3000/policies
# 应看到叠加图（有汇率数据后图表有内容）和时间线列表
# 切换来源筛选，列表更新
```

- [ ] **Step 5: 提交**

```bash
git add components/PolicyTimeline.tsx components/PolicyRateChart.tsx app/policies/page.tsx
git commit -m "feat: build policy timeline page with rate overlay chart"
```

---

## Task 13: 清理与收尾

**Files:**
- Delete: `app/api/health/route.ts`

- [ ] **Step 1: 删除临时 health check 接口**

```bash
rm app/api/health/route.ts
```

- [ ] **Step 2: 全量本地测试**

```bash
npm run build
# 确认 build 无 TypeScript 错误
npm run start
# 访问四个页面，确认均正常渲染
```

- [ ] **Step 3: 验证移动端适配**

使用 Chrome DevTools，切换到 iPhone SE（375×667）和 iPhone 14 Pro（393×852）：
- `/`：三张卡片垂直堆叠，底部 Tab Bar 可见
- `/exchange-rates`：图表自适应，表格可横向滚动
- `/tariffs`：表格可横向滚动，按钮在筛选器右侧
- `/policies`：时间线单列，图表自适应

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: cleanup temp files, verify build and mobile layout"
```

---

## 自检结果

| 规格要求 | 覆盖任务 |
|---------|---------|
| 汇率自动抓取（每日）| Task 3, 6 |
| 关税手动触发抓取 | Task 4, 11 |
| 政策自动扫描（每日）| Task 5, 6 |
| 异常告警生成与标记已读 | Task 3/4/5, 7, 8 |
| Dashboard 总览 + 汇率图 | Task 9 |
| 汇率详情页（曲线+表格）| Task 10 |
| 关税详情页（筛选+手动刷新）| Task 11 |
| 政策动态页（时间线+对比图）| Task 12 |
| 移动端适配 | Task 8, 13 |
| 本地 → Vercel 迁移路径 | Task 6 |
| MacMap 失败降级处理 | Task 4（failed 计数 + 日志）|
