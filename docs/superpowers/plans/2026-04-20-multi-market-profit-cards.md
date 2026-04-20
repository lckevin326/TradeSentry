# Multi-Market Profit Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3 homepage metric cards with 5-market profit rate cards and add a `/markets` comparison page.

**Architecture:** A new `lib/profit/market-defaults.ts` module defines the 5 markets and shared order defaults. A new `GET /api/markets/today` route batch-fetches today+yesterday snapshots for all markets and returns margin data. A Server Component `MarketCardsSection` renders the cards on the homepage. A new `/markets` page shows bar chart, detail table, and trend placeholder.

**Tech Stack:** Next.js 16 App Router (Server Components), Supabase, TypeScript, node:test for lib tests.

---

## Constraint: KW/QA/OM have no freight routes yet

`lib/freight/constants.ts` only defines UAE (Jebel Ali) and SA (Dammam). Before we can show KW/QA/OM margins, we need to add routes and seed freight data. Tasks 1–2 address this.

---

### Task 1: Extend freight constants for KW, QA, OM

**Files:**
- Modify: `lib/freight/constants.ts`

- [ ] **Step 1: Add KW/QA/OM to FREIGHT_COUNTRIES and FREIGHT_ROUTE_LANES**

Replace the content of `lib/freight/constants.ts` from line 1 through the FREIGHT_ROUTE_LANES array:

```typescript
import type { ContainerType, Country } from '../profit'

export const FREIGHT_COUNTRIES = ['UAE', 'SA', 'KW', 'QA', 'OM'] as const satisfies readonly Country[]
export type FreightCountry = (typeof FREIGHT_COUNTRIES)[number]

export const FREIGHT_COUNTRY_LABELS: Record<FreightCountry, string> = {
  UAE: '阿联酋',
  SA: '沙特',
  KW: '科威特',
  QA: '卡塔尔',
  OM: '阿曼',
}

export const FREIGHT_CONTAINER_TYPES = ['20GP', '40GP', '40HQ'] as const satisfies readonly ContainerType[]
export type FreightContainerType = (typeof FREIGHT_CONTAINER_TYPES)[number]

export const FREIGHT_CONTAINER_TYPE_LABELS: Record<FreightContainerType, string> = {
  '20GP': '20GP · 20尺柜',
  '40GP': '40GP · 40尺普柜',
  '40HQ': '40HQ · 40尺高柜',
}

type FreightRouteLane = {
  destinationCountry: FreightCountry
  destinationPort: 'Jebel Ali' | 'Dammam' | 'Shuaiba' | 'Hamad' | 'Sohar'
  destinationPortLabel: string
  countryLabel: string
  chartCountryLabel: string
}

const FREIGHT_ROUTE_LANES = [
  {
    destinationCountry: 'UAE',
    destinationPort: 'Jebel Ali',
    destinationPortLabel: '杰贝阿里',
    countryLabel: '阿联酋',
    chartCountryLabel: 'UAE',
  },
  {
    destinationCountry: 'SA',
    destinationPort: 'Dammam',
    destinationPortLabel: '达曼',
    countryLabel: '沙特',
    chartCountryLabel: 'SA',
  },
  {
    destinationCountry: 'KW',
    destinationPort: 'Shuaiba',
    destinationPortLabel: '舒艾巴',
    countryLabel: '科威特',
    chartCountryLabel: 'KW',
  },
  {
    destinationCountry: 'QA',
    destinationPort: 'Hamad',
    destinationPortLabel: '哈马德',
    countryLabel: '卡塔尔',
    chartCountryLabel: 'QA',
  },
  {
    destinationCountry: 'OM',
    destinationPort: 'Sohar',
    destinationPortLabel: '苏哈尔',
    countryLabel: '阿曼',
    chartCountryLabel: 'OM',
  },
] as const satisfies readonly FreightRouteLane[]
```

The rest of the file (FREIGHT_ROUTE_SHAPES onward) stays unchanged — it auto-generates route keys from the lanes array.

- [ ] **Step 2: Run tests to verify constants still pass**

```bash
node ./lib/profit/test-runner.mjs lib/freight/constants.test.ts
```

Expected: all constants tests pass. The new routes are additive — existing keys are unchanged.

- [ ] **Step 3: Commit**

```bash
git add lib/freight/constants.ts
git commit -m "feat: add KW/QA/OM freight route constants"
```

---

### Task 2: Seed initial freight estimates for KW/QA/OM

**Files:**
- Create: `docs/sql/2026-04-20-seed-kw-qa-om-freight.sql`

These are one-time seed estimates based on CCFI Middle East index. KW/QA are closer to UAE than SA; OM is similar distance.

- [ ] **Step 1: Write the SQL seed file**

```sql
-- Seed estimated freight for KW, QA, OM based on CCFI Middle East baseline
-- Apply to Supabase SQL editor once. Values are estimates; CCFI updates will overwrite over time.
-- Source: CCFI Persian Gulf lane, approximate multipliers vs Jebel Ali baseline.

-- Get today's UAE/Jebel Ali rates as reference and insert KW/QA/OM at similar levels.
-- Approximate adjustments: KW ≈ UAE+5%, QA ≈ UAE+3%, OM ≈ UAE+8% (slightly longer route)

DO $$
DECLARE
  ref_20gp numeric;
  ref_40gp numeric;
  ref_40hq numeric;
  today_date date := CURRENT_DATE;
BEGIN
  SELECT baseline_freight INTO ref_20gp
  FROM freight_rates
  WHERE route_key = 'shanghai-jebel-ali-20gp'
  ORDER BY date DESC LIMIT 1;

  SELECT baseline_freight INTO ref_40gp
  FROM freight_rates
  WHERE route_key = 'shanghai-jebel-ali-40gp'
  ORDER BY date DESC LIMIT 1;

  SELECT baseline_freight INTO ref_40hq
  FROM freight_rates
  WHERE route_key = 'shanghai-jebel-ali-40hq'
  ORDER BY date DESC LIMIT 1;

  -- Only insert if we have reference data
  IF ref_20gp IS NOT NULL THEN
    INSERT INTO freight_rates (route_key, container_type, baseline_freight, date, source)
    VALUES
      ('shanghai-shuaiba-20gp',  '20GP', round(ref_20gp  * 1.05), today_date, 'seed-estimate'),
      ('shanghai-shuaiba-40gp',  '40GP', round(ref_40gp  * 1.05), today_date, 'seed-estimate'),
      ('shanghai-shuaiba-40hq',  '40HQ', round(ref_40hq  * 1.05), today_date, 'seed-estimate'),
      ('shanghai-hamad-20gp',    '20GP', round(ref_20gp  * 1.03), today_date, 'seed-estimate'),
      ('shanghai-hamad-40gp',    '40GP', round(ref_40gp  * 1.03), today_date, 'seed-estimate'),
      ('shanghai-hamad-40hq',    '40HQ', round(ref_40hq  * 1.03), today_date, 'seed-estimate'),
      ('shanghai-sohar-20gp',    '20GP', round(ref_20gp  * 1.08), today_date, 'seed-estimate'),
      ('shanghai-sohar-40gp',    '40GP', round(ref_40gp  * 1.08), today_date, 'seed-estimate'),
      ('shanghai-sohar-40hq',    '40HQ', round(ref_40hq  * 1.08), today_date, 'seed-estimate')
    ON CONFLICT (route_key, container_type, date) DO NOTHING;
  END IF;
END $$;
```

> **Note:** Run this SQL in the Supabase SQL editor once to populate freight data for KW/QA/OM markets.

- [ ] **Step 2: Commit**

```bash
git add docs/sql/2026-04-20-seed-kw-qa-om-freight.sql
git commit -m "docs: add SQL seed for KW/QA/OM freight estimates"
```

---

### Task 3: Market defaults module

**Files:**
- Create: `lib/profit/market-defaults.ts`
- Create: `lib/profit/market-defaults.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/profit/market-defaults.test.ts
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { MARKETS, DEFAULT_ORDER_BASE, buildMarketOrder } from './market-defaults'

test('MARKETS has exactly 5 entries with required fields', () => {
  assert.equal(MARKETS.length, 5)
  for (const m of MARKETS) {
    assert.ok(m.key, `missing key`)
    assert.ok(m.label, `missing label`)
    assert.ok(m.destinationCountry, `missing destinationCountry`)
    assert.ok(m.routeKey, `missing routeKey`)
  }
})

test('buildMarketOrder merges defaults with market config', () => {
  const order = buildMarketOrder(MARKETS[0])
  assert.equal(order.destinationCountry, MARKETS[0].destinationCountry)
  assert.equal(order.quoteCurrency, DEFAULT_ORDER_BASE.quoteCurrency)
  assert.equal(order.routeKey, MARKETS[0].routeKey)
  assert.equal(order.hsCode, DEFAULT_ORDER_BASE.hsCode)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node ./lib/profit/test-runner.mjs lib/profit/market-defaults.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement market-defaults.ts**

```typescript
// lib/profit/market-defaults.ts
import type { ContainerType, Country, OrderInput, ProfitQuoteCurrency, TradeTerm } from './index'

export interface MarketConfig {
  key: string
  label: string
  destinationCountry: Country
  routeKey: string
  containerType: ContainerType
}

export const DEFAULT_ORDER_BASE = {
  hsCode: '4011209000',
  tradeTerm: 'CIF' as TradeTerm,
  quoteCurrency: 'CNY' as ProfitQuoteCurrency,
  quotedAmount: 19000,   // ¥95/条 × 200条
  quantity: 200,
  productCost: 14000,    // ¥70/条 × 200条
  miscFees: 300,
}

export const MARKETS: MarketConfig[] = [
  { key: 'UAE', label: '迪拜 UAE', destinationCountry: 'UAE', routeKey: 'shanghai-jebel-ali-40hq', containerType: '40HQ' },
  { key: 'SA',  label: '沙特 SA',  destinationCountry: 'SA',  routeKey: 'shanghai-dammam-40hq',    containerType: '40HQ' },
  { key: 'KW',  label: '科威特 KW', destinationCountry: 'KW', routeKey: 'shanghai-shuaiba-40hq',   containerType: '40HQ' },
  { key: 'QA',  label: '卡塔尔 QA', destinationCountry: 'QA', routeKey: 'shanghai-hamad-40hq',     containerType: '40HQ' },
  { key: 'OM',  label: '阿曼 OM',   destinationCountry: 'OM', routeKey: 'shanghai-sohar-40hq',     containerType: '40HQ' },
]

export function buildMarketOrder(market: MarketConfig): OrderInput {
  return {
    ...DEFAULT_ORDER_BASE,
    destinationCountry: market.destinationCountry,
    routeKey: market.routeKey,
    containerType: market.containerType,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
node ./lib/profit/test-runner.mjs lib/profit/market-defaults.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/profit/market-defaults.ts lib/profit/market-defaults.test.ts
git commit -m "feat: add market defaults module for 5-market comparison"
```

---

### Task 4: Batch market snapshot fetcher

Extend `lib/profit/market-data.ts` with a function that fetches today+yesterday snapshots for all 5 markets in a single DB round-trip per table.

**Files:**
- Modify: `lib/profit/market-data.ts`
- Create: `lib/profit/market-snapshot-batch.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/profit/market-snapshot-batch.test.ts
import { strict as assert } from 'node:assert'
import { test, mock } from 'node:test'

test('buildYesterdayDateString returns a date string 1 day before given date', async () => {
  const { buildYesterdayDateString } = await import('./market-data.ts')
  const result = buildYesterdayDateString('2026-04-20')
  assert.equal(result, '2026-04-19')
})

test('buildYesterdayDateString handles month boundary', async () => {
  const { buildYesterdayDateString } = await import('./market-data.ts')
  assert.equal(buildYesterdayDateString('2026-05-01'), '2026-04-30')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node ./lib/profit/test-runner.mjs lib/profit/market-snapshot-batch.test.ts
```

Expected: FAIL — `buildYesterdayDateString` not exported.

- [ ] **Step 3: Add `buildYesterdayDateString` and batch snapshot loader to market-data.ts**

Add these exports at the bottom of `lib/profit/market-data.ts`:

```typescript
export function buildYesterdayDateString(today: string): string {
  const d = new Date(today + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

async function fetchFxOnDate(currencies: string[], asOfDate: string): Promise<Map<string, number>> {
  const { supabase } = await import('../supabase')
  const { data } = await supabase
    .from('exchange_rates')
    .select('target, rate, date')
    .in('target', currencies)
    .lte('date', asOfDate)
    .order('date', { ascending: false })

  const seen = new Set<string>()
  const result = new Map<string, number>()
  for (const row of (data ?? []) as { target: string; rate: number; date: string }[]) {
    if (!seen.has(row.target)) {
      seen.add(row.target)
      result.set(row.target, row.rate)
    }
  }
  return result
}

async function fetchTariffOnDate(
  pairs: { country: string; hsCode: string }[],
  asOfDate: string,
): Promise<Map<string, number>> {
  const { supabase } = await import('../supabase')
  const countries = [...new Set(pairs.map(p => p.country))]
  const hsCodes = [...new Set(pairs.map(p => p.hsCode))]
  const { data } = await supabase
    .from('tariffs')
    .select('country, hs_code, rate_pct, fetched_at')
    .in('country', countries)
    .in('hs_code', hsCodes)
    .lte('fetched_at', asOfDate + 'T23:59:59Z')
    .order('fetched_at', { ascending: false })

  const seen = new Set<string>()
  const result = new Map<string, number>()
  for (const row of (data ?? []) as { country: string; hs_code: string; rate_pct: number }[]) {
    const key = `${row.country}:${row.hs_code}`
    if (!seen.has(key)) {
      seen.add(key)
      result.set(key, row.rate_pct)
    }
  }
  return result
}

async function fetchFreightOnDate(
  routeKeys: string[],
  containerType: string,
  asOfDate: string,
): Promise<Map<string, number>> {
  const { supabase } = await import('../supabase')
  const { data } = await supabase
    .from('freight_rates')
    .select('route_key, baseline_freight, date')
    .in('route_key', routeKeys)
    .eq('container_type', containerType)
    .lte('date', asOfDate)
    .order('date', { ascending: false })

  const seen = new Set<string>()
  const result = new Map<string, number>()
  for (const row of (data ?? []) as { route_key: string; baseline_freight: number }[]) {
    if (!seen.has(row.route_key)) {
      seen.add(row.route_key)
      result.set(row.route_key, row.baseline_freight)
    }
  }
  return result
}

export interface BatchMarketSnapshot {
  today: MarketSnapshot | null
  yesterday: MarketSnapshot | null
}

export async function loadAllMarketSnapshots(
  orders: Array<OrderInput & { key: string }>,
  todayDate: string,
): Promise<Map<string, BatchMarketSnapshot>> {
  const { getExportRebateRateByHsCode } = await import('../rebates')
  const yesterdayDate = buildYesterdayDateString(todayDate)

  const currencies = [...new Set(orders.filter(o => o.quoteCurrency !== 'CNY').map(o => o.quoteCurrency))]
  const tariffPairs = orders.map(o => ({ country: o.destinationCountry, hsCode: o.hsCode }))
  const routeKeys = orders.map(o => o.routeKey)
  const containerType = orders[0].containerType

  const [todayFx, yesterdayFx, todayTariff, yesterdayTariff, todayFreight, yesterdayFreight] = await Promise.all([
    fetchFxOnDate(currencies, todayDate),
    fetchFxOnDate(currencies, yesterdayDate),
    fetchTariffOnDate(tariffPairs, todayDate),
    fetchTariffOnDate(tariffPairs, yesterdayDate),
    fetchFreightOnDate(routeKeys, containerType, todayDate),
    fetchFreightOnDate(routeKeys, containerType, yesterdayDate),
  ])

  const result = new Map<string, BatchMarketSnapshot>()

  for (const order of orders) {
    function buildSnapshot(
      fxMap: Map<string, number>,
      tariffMap: Map<string, number>,
      freightMap: Map<string, number>,
    ): MarketSnapshot | null {
      const freightCny = freightMap.get(order.routeKey)
      const tariffRatePct = tariffMap.get(`${order.destinationCountry}:${order.hsCode}`)
      if (freightCny == null || tariffRatePct == null) return null

      let fxRate: number
      if (order.quoteCurrency === 'CNY') {
        fxRate = 1
      } else {
        const fxSource = fxMap.get(order.quoteCurrency)
        if (fxSource == null) return null
        fxRate = 1 / fxSource
      }

      const { ratePct: exportRebateRatePct } = getExportRebateRateByHsCode(order.hsCode)

      return {
        fxRate,
        tariffRatePct,
        antiDumpingRatePct: 0,
        exportRebateRatePct,
        baselineFreight: freightCny,
        overrideFreight: null,
      }
    }

    result.set(order.key, {
      today: buildSnapshot(todayFx, todayTariff, todayFreight),
      yesterday: buildSnapshot(yesterdayFx, yesterdayTariff, yesterdayFreight),
    })
  }

  return result
}
```

- [ ] **Step 4: Run tests**

```bash
node ./lib/profit/test-runner.mjs lib/profit/market-snapshot-batch.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run full test suite to check no regressions**

```bash
node ./lib/profit/test-runner.mjs
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/profit/market-data.ts lib/profit/market-snapshot-batch.test.ts
git commit -m "feat: add batch market snapshot loader for multi-market comparison"
```

---

### Task 5: API route GET /api/markets/today

**Files:**
- Create: `app/api/markets/today/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/markets/today/route.ts
import { NextResponse } from 'next/server'
import { calculateAttribution, calculateProfitResult } from '../../../../lib/profit/calculate'
import { buildMarketOrder, MARKETS } from '../../../../lib/profit/market-defaults'
import { buildYesterdayDateString, loadAllMarketSnapshots } from '../../../../lib/profit/market-data'
import type { AttributionResult, ProfitResult } from '../../../../lib/profit/index'

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
  const yesterdayDate = buildYesterdayDateString(todayDate)

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
```

- [ ] **Step 2: Verify build passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/markets/today/route.ts
git commit -m "feat: add GET /api/markets/today endpoint"
```

---

### Task 6: MarketCardsSection component

**Files:**
- Create: `components/MarketCardsSection.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/MarketCardsSection.tsx
import Link from 'next/link'
import type { MarketTodayResult } from '../app/api/markets/today/route'

interface Props {
  markets: MarketTodayResult[]
  date: string
}

const STATUS_COLORS = {
  ok:          { border: '#2a9d59', text: '#2a9d59', badge: '#edf7f1', badgeText: '可接单' },
  cautious:    { border: '#c87d00', text: '#c87d00', badge: '#fff8e6', badgeText: '谨慎'   },
  pause:       { border: '#d04040', text: '#d04040', badge: '#fef0f0', badgeText: '暂停'   },
  unavailable: { border: '#ccc',    text: '#aaa',    badge: '#f5f5f5', badgeText: '暂无数据' },
}

function formatDelta(delta: number | null): { text: string; color: string } {
  if (delta == null) return { text: '—', color: 'var(--text-3)' }
  if (delta > 0)  return { text: `▲ ${delta.toFixed(1)}% vs 昨日`, color: '#2a9d59' }
  if (delta < 0)  return { text: `▼ ${Math.abs(delta).toFixed(1)}% vs 昨日`, color: '#d04040' }
  return { text: '— 基本持平', color: 'var(--text-2)' }
}

function AttributionRow({ markets }: { markets: MarketTodayResult[] }) {
  // Use UAE market attribution as the representative driver
  const uae = markets.find(m => m.key === 'UAE')
  if (!uae?.attribution) return null

  const { fxDeltaCny, freightDeltaCny, dutiesDeltaCny, dominantDriver } = uae.attribution
  const revenue = uae.today?.revenueCny ?? 1

  const fxMarginDelta = Math.round((fxDeltaCny / revenue) * 1000) / 10
  const freightMarginDelta = Math.round((freightDeltaCny / revenue) * 1000) / 10
  const dutyMarginDelta = Math.round((dutiesDeltaCny / revenue) * 1000) / 10

  const driverLabel: Record<string, string> = { fx: '汇率', freight: '运费指数', tariff: '关税' }

  return (
    <div className="card p-3 flex flex-wrap gap-x-4 gap-y-1 items-center text-xs">
      <span className="font-semibold" style={{ color: 'var(--text-2)' }}>今日变化主因：</span>
      <span style={{ color: fxMarginDelta === 0 ? 'var(--text-2)' : fxMarginDelta > 0 ? '#2a9d59' : '#d04040' }}>
        汇率 CNY/AED {fxMarginDelta > 0 ? '+' : ''}{fxMarginDelta}% → 利润率
      </span>
      <span style={{ color: 'var(--border)' }}>|</span>
      <span style={{ color: freightMarginDelta === 0 ? 'var(--text-2)' : freightMarginDelta > 0 ? '#2a9d59' : '#d04040' }}>
        运费 {freightMarginDelta > 0 ? '+' : ''}{freightMarginDelta}% → 利润率
      </span>
      <span style={{ color: 'var(--border)' }}>|</span>
      <span style={{ color: dutyMarginDelta === 0 ? '#2a9d59' : '#d04040' }}>
        关税 {dutyMarginDelta === 0 ? '— 无变化' : `${dutyMarginDelta > 0 ? '+' : ''}${dutyMarginDelta}%`}
      </span>
      <Link
        href="/markets"
        className="ml-auto text-[11px] whitespace-nowrap"
        style={{ color: 'var(--gold-l)' }}
      >
        查看市场详情 →
      </Link>
    </div>
  )
}

export default function MarketCardsSection({ markets, date }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {markets.map(market => {
          const colors = STATUS_COLORS[market.status]
          const delta = formatDelta(market.deltaMarginPct)
          const marginText = market.today ? `${market.today.marginPct.toFixed(1)}%` : '—'

          return (
            <div
              key={market.key}
              className="card p-4 flex flex-col gap-1"
              style={{ borderTop: `3px solid ${colors.border}` }}
            >
              <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                {market.label}
              </span>
              <span
                className="text-2xl font-semibold leading-none mt-1"
                style={{ color: colors.text }}
              >
                {marginText}
              </span>
              <span className="text-[11px] mt-0.5" style={{ color: delta.color }}>
                {delta.text}
              </span>
              <span
                className="mt-2 self-start text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: colors.badge, color: colors.text }}
              >
                {colors.badgeText}
              </span>
            </div>
          )
        })}
      </div>

      <AttributionRow markets={markets} />
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/MarketCardsSection.tsx
git commit -m "feat: add MarketCardsSection component for homepage"
```

---

### Task 7: Update homepage

Replace the 3 metric cards in `app/page.tsx` with `MarketCardsSection`.

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add fetchMarketsToday helper and import MarketCardsSection**

At the top of `app/page.tsx`, add the import:

```typescript
import MarketCardsSection from '../components/MarketCardsSection'
import type { MarketsApiResponse } from './api/markets/today/route'
```

Add this async helper function before `getProfitDecisionPageData`:

```typescript
async function fetchMarketsToday(): Promise<MarketsApiResponse | null> {
  const { supabase } = await import('../lib/supabase')
  // Directly call the logic (not via HTTP) to avoid self-fetch overhead in Server Components
  const todayDate = new Date().toISOString().slice(0, 10)
  const { buildYesterdayDateString, loadAllMarketSnapshots } = await import('../lib/profit/market-data')
  const { buildMarketOrder, MARKETS } = await import('../lib/profit/market-defaults')
  const { calculateAttribution, calculateProfitResult } = await import('../lib/profit/calculate')

  try {
    const orders = MARKETS.map(m => ({ ...buildMarketOrder(m), key: m.key }))
    const snapshots = await loadAllMarketSnapshots(orders, todayDate)

    const markets = MARKETS.map((market, i) => {
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

    return { date: todayDate, markets }
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Add marketsData to getProfitDecisionPageData**

In `getProfitDecisionPageData`, add `marketsData` to the returned type and data. First update the `ProfitDecisionPageData` interface:

```typescript
export interface ProfitDecisionPageData {
  // ... existing fields ...
  marketsData: MarketsApiResponse | null   // add this field
}
```

In the `supabaseConfigured = false` early return, add `marketsData: null`.

In the main data fetch, add `marketsData` to the returned object:

```typescript
const [aedRate, tariffUpdate, fxChartData, freightChartData, recentPolicies, marketsData] = await Promise.all([
  getLatestRate('AED'),
  getLatestTariffUpdate(),
  getChartData('AED'),
  getFreightChartData('shanghai-jebel-ali-20gp', '20GP'),
  getRecentPolicies(),
  fetchMarketsToday(),
])
```

And include `marketsData` in the returned `data` object.

- [ ] **Step 3: Remove the 4 old metric cards from ProfitDecisionPageClient.tsx**

The 4 old cards (当前利润, 人民币/AED, 中东运费, 政策) are rendered in `components/ProfitDecisionPageClient.tsx` at the `<div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">` block starting around line 260.

Delete the entire `<div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">...</div>` block (the 4 RateCard components). Keep the `<AlertBanner />` and the page title div above it. Keep everything below the 4 cards unchanged.

- [ ] **Step 4: Add MarketCardsSection to DashboardPage**

In `app/page.tsx`, update `DashboardPage` to render MarketCardsSection above the existing content:

```typescript
export default async function DashboardPage() {
  const data = await getProfitDecisionPageData()
  return (
    <>
      {data.marketsData && (
        <MarketCardsSection markets={data.marketsData.markets} date={data.marketsData.date} />
      )}
      <ProfitDecisionPageContent data={data} />
    </>
  )
}
```

> **Note:** `ProfitDecisionPageContent` calls `ProfitDecisionPageClient` which uses `className="space-y-6"`. The MarketCardsSection renders above it. No extra wrapper div needed — the layout container from `app/layout.tsx` provides the padding.

- [ ] **Step 4: Verify TypeScript passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/ProfitDecisionPageClient.tsx
git commit -m "feat: add multi-market cards to homepage"
```

---

### Task 8: /markets page

**Files:**
- Create: `app/markets/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/markets/page.tsx
import Link from 'next/link'
import { MARKETS, DEFAULT_ORDER_BASE, buildMarketOrder } from '../../lib/profit/market-defaults'
import { buildYesterdayDateString, loadAllMarketSnapshots } from '../../lib/profit/market-data'
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

          {/* Trend chart placeholder */}
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
```

- [ ] **Step 2: Verify TypeScript passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/markets/page.tsx
git commit -m "feat: add /markets multi-market comparison page"
```

---

### Task 9: Add nav entry for /markets

**Files:**
- Modify: `components/Nav.tsx`

- [ ] **Step 1: Add the nav link**

In `components/Nav.tsx`, add a new entry to the `links` array after the `{ href: '/', label: '总览' }` entry:

```typescript
{
  href: '/markets',
  label: '市场对比',
  icon: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
},
```

- [ ] **Step 2: Run full test suite**

```bash
node ./lib/profit/test-runner.mjs
```

Expected: all tests pass.

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/Nav.tsx
git commit -m "feat: add 市场对比 nav entry"
```

---

## Final verification

- [ ] Run `node ./lib/profit/test-runner.mjs` — all tests pass
- [ ] Run `npx tsc --noEmit` — no type errors
- [ ] Apply the SQL seed in Supabase (`docs/sql/2026-04-20-seed-kw-qa-om-freight.sql`)
- [ ] Start dev server: `npm run dev` and visit `http://localhost:3000` — 5 market cards visible
- [ ] Visit `http://localhost:3000/markets` — bar chart + table rendered
- [ ] Verify nav shows 市场对比 link

---

## Out of scope

- 14-day trend chart real data (requires `profit_snapshots` table — feature point 6)
- User-configurable default parameters (future iteration)
- Updating KW/QA/OM freight data via CCFI scraper (requires scraper extension)
