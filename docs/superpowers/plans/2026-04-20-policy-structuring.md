# Policy Structuring + Impact Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-powered structured fields to policies (impact level, affected countries, effective date, quantified impact) and display them in an impact matrix on `/policies`.

**Architecture:** When `fetchAndSavePolicies` saves a policy, it calls `enrichPolicyWithAI` from `lib/ai/policy-tagger.ts`, which calls Gemini to produce a JSON payload; the 5 structured fields are written back to the `policies` row. A separate backfill route processes historical rows where `ai_tagged_at IS NULL`. The frontend adds structured badges to `PolicyTimeline` and a new `PolicyImpactMatrix` table above it.

**Tech Stack:** Next.js 16 App Router, Supabase, Gemini API (same key as decision-brief: `GEMINI_KEY` / `GEMINI_API_KEY`), Node.js built-in test runner (`node:test` + `node:assert`).

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `docs/sql/2026-04-20-alter-policies-structured-fields.sql` | ALTER TABLE migration |
| Modify | `types/index.ts` | Add 5 new fields to `Policy` interface |
| Create | `lib/ai/policy-tagger.ts` | AI tagging logic (prompt + parse + enrich) |
| Create | `lib/ai/policy-tagger.test.ts` | Unit tests for tagger |
| Modify | `lib/scrapers/policies.ts` | Call `enrichPolicyWithAI` after each upsert |
| Create | `app/api/fetch/policy-tags/route.ts` | Backfill endpoint for existing policies |
| Modify | `components/PolicyTimeline.tsx` | Render impact_level, affected_countries, quantified_impact |
| Create | `components/PolicyImpactMatrix.tsx` | Policy × market impact table |
| Modify | `app/policies/page.tsx` | Add `PolicyImpactMatrix` above timeline |

---

## Task 1: SQL Migration

**Files:**
- Create: `docs/sql/2026-04-20-alter-policies-structured-fields.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Add structured AI fields to policies table
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS impact_level      text CHECK (impact_level IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS affected_countries text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS effective_date    date,
  ADD COLUMN IF NOT EXISTS quantified_impact text,
  ADD COLUMN IF NOT EXISTS ai_tagged_at      timestamptz;
```

Save to `docs/sql/2026-04-20-alter-policies-structured-fields.sql`.

- [ ] **Step 2: Execute in Supabase SQL Editor**

Go to Supabase → SQL Editor → paste and run the migration. Expected: no error, `ALTER TABLE` success message.

- [ ] **Step 3: Commit**

```bash
git add docs/sql/2026-04-20-alter-policies-structured-fields.sql
git commit -m "sql: add structured AI fields to policies table"
```

---

## Task 2: Update Policy TypeScript Type

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add the 5 new fields to the `Policy` interface**

In `types/index.ts`, replace the existing `Policy` interface:

```typescript
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
  // AI-structured fields (null until tagged)
  impact_level: 'high' | 'medium' | 'low' | null
  affected_countries: string[]
  effective_date: string | null
  quantified_impact: string | null
  ai_tagged_at: string | null
}
```

- [ ] **Step 2: Run tests to confirm nothing breaks**

```bash
npm test
```

Expected: all existing tests still pass (the new fields are optional-compatible since existing mock data doesn't include them — TypeScript may warn but runtime tests pass).

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "types: add AI structured fields to Policy interface"
```

---

## Task 3: AI Policy Tagger Module

**Files:**
- Create: `lib/ai/policy-tagger.ts`
- Create: `lib/ai/policy-tagger.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `lib/ai/policy-tagger.test.ts`:

```typescript
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  buildPolicyTagPrompt,
  parsePolicyTagResponse,
  type PolicyTagResult,
} from './policy-tagger'

test('buildPolicyTagPrompt includes title and summary in output', () => {
  const prompt = buildPolicyTagPrompt('UAE 提高轮胎进口关税', '自2025年起对4011商品加征5%关税')
  assert.ok(prompt.includes('UAE 提高轮胎进口关税'))
  assert.ok(prompt.includes('自2025年起对4011商品加征5%关税'))
})

test('buildPolicyTagPrompt works with null summary', () => {
  const prompt = buildPolicyTagPrompt('WTO 轮胎贸易通报', null)
  assert.ok(prompt.includes('WTO 轮胎贸易通报'))
})

test('parsePolicyTagResponse extracts valid JSON from Gemini response', () => {
  const geminiPayload = {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            impact_level: 'high',
            affected_countries: ['UAE', 'SA'],
            effective_date: '2025-01-01',
            quantified_impact: '+5% 关税',
          })
        }]
      }
    }]
  }
  const result = parsePolicyTagResponse(geminiPayload)
  assert.equal(result.impact_level, 'high')
  assert.deepEqual(result.affected_countries, ['UAE', 'SA'])
  assert.equal(result.effective_date, '2025-01-01')
  assert.equal(result.quantified_impact, '+5% 关税')
})

test('parsePolicyTagResponse returns null fields when JSON is malformed', () => {
  const geminiPayload = {
    candidates: [{
      content: { parts: [{ text: 'not json at all' }] }
    }]
  }
  const result = parsePolicyTagResponse(geminiPayload)
  assert.equal(result.impact_level, null)
  assert.deepEqual(result.affected_countries, [])
  assert.equal(result.effective_date, null)
  assert.equal(result.quantified_impact, null)
})

test('parsePolicyTagResponse returns null fields when impact_level is invalid', () => {
  const geminiPayload = {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            impact_level: 'critical',  // not in allowed set
            affected_countries: ['UAE'],
            effective_date: null,
            quantified_impact: null,
          })
        }]
      }
    }]
  }
  const result = parsePolicyTagResponse(geminiPayload)
  assert.equal(result.impact_level, null)
})

test('parsePolicyTagResponse filters out invalid country codes', () => {
  const geminiPayload = {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            impact_level: 'medium',
            affected_countries: ['UAE', 'INVALID', 'SA'],
            effective_date: null,
            quantified_impact: null,
          })
        }]
      }
    }]
  }
  const result = parsePolicyTagResponse(geminiPayload)
  assert.deepEqual(result.affected_countries, ['UAE', 'SA'])
})

test('enrichPolicyWithAI returns structured result using injected caller', async () => {
  const { enrichPolicyWithAI } = await import('./policy-tagger')
  const fakeResult: PolicyTagResult = {
    impact_level: 'medium',
    affected_countries: ['UAE'],
    effective_date: null,
    quantified_impact: '+2% 关税',
  }
  const result = await enrichPolicyWithAI(
    { title: 'WTO 通报', summary: null },
    {
      caller: async () => ({
        candidates: [{
          content: { parts: [{ text: JSON.stringify(fakeResult) }] }
        }]
      })
    }
  )
  assert.equal(result.impact_level, 'medium')
  assert.deepEqual(result.affected_countries, ['UAE'])
  assert.equal(result.quantified_impact, '+2% 关税')
})

test('enrichPolicyWithAI returns null fields on caller failure', async () => {
  const { enrichPolicyWithAI } = await import('./policy-tagger')
  const result = await enrichPolicyWithAI(
    { title: 'WTO 通报', summary: null },
    {
      caller: async () => { throw new Error('network error') }
    }
  )
  assert.equal(result.impact_level, null)
  assert.deepEqual(result.affected_countries, [])
  assert.equal(result.effective_date, null)
  assert.equal(result.quantified_impact, null)
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```

Expected: errors like `Cannot find module './policy-tagger'`.

- [ ] **Step 3: Implement `lib/ai/policy-tagger.ts`**

```typescript
const VALID_IMPACT_LEVELS = ['high', 'medium', 'low'] as const
const VALID_COUNTRIES = ['UAE', 'SA', 'KW', 'QA', 'BH', 'OM'] as const

export type ImpactLevel = typeof VALID_IMPACT_LEVELS[number]

export interface PolicyTagResult {
  impact_level: ImpactLevel | null
  affected_countries: string[]
  effective_date: string | null
  quantified_impact: string | null
}

type GeminiPayload = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
  }>
}

type TaggerDeps = {
  caller?: (prompt: string) => Promise<GeminiPayload>
}

export function buildPolicyTagPrompt(title: string, summary: string | null): string {
  const summaryPart = summary ? `摘要：${summary}` : '摘要：无'
  return [
    '你是中国轮胎出口贸易分析助手。',
    '分析以下政策，判断其对中国轮胎出口到 GCC 六国（UAE/SA/KW/QA/BH/OM）的影响。',
    '严格按 JSON 格式输出，不要加任何解释文字。',
    '',
    '输出格式：',
    '{',
    '  "impact_level": "high" | "medium" | "low",',
    '  "affected_countries": ["UAE", "SA", ...],',
    '  "effective_date": "YYYY-MM-DD" | null,',
    '  "quantified_impact": "估算影响，如 +2% 关税 或 退税率降低 1%" | null',
    '}',
    '',
    '规则：',
    '- impact_level: high=直接影响关税/退税/禁令, medium=间接影响贸易环境, low=背景参考信息',
    '- affected_countries: 只从 UAE/SA/KW/QA/BH/OM 中选，不相关则返回空数组 []',
    '- effective_date: 从文本提取，无法提取则 null',
    '- quantified_impact: 给出数值范围估算，无法估算则 null',
    '',
    `政策标题：${title}`,
    summaryPart,
  ].join('\n')
}

export function parsePolicyTagResponse(payload: GeminiPayload): PolicyTagResult {
  const nullResult: PolicyTagResult = {
    impact_level: null,
    affected_countries: [],
    effective_date: null,
    quantified_impact: null,
  }

  try {
    const text = payload?.candidates?.[0]?.content?.parts?.find(p => typeof p.text === 'string')?.text?.trim()
    if (!text) return nullResult

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(cleaned) as Record<string, unknown>

    const impact_level = VALID_IMPACT_LEVELS.includes(parsed.impact_level as ImpactLevel)
      ? (parsed.impact_level as ImpactLevel)
      : null

    const affected_countries = Array.isArray(parsed.affected_countries)
      ? (parsed.affected_countries as string[]).filter(c => VALID_COUNTRIES.includes(c as typeof VALID_COUNTRIES[number]))
      : []

    const effective_date = typeof parsed.effective_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.effective_date)
      ? parsed.effective_date
      : null

    const quantified_impact = typeof parsed.quantified_impact === 'string' && parsed.quantified_impact.length > 0
      ? parsed.quantified_impact
      : null

    return { impact_level, affected_countries, effective_date, quantified_impact }
  } catch {
    return nullResult
  }
}

async function callGemini(prompt: string): Promise<GeminiPayload> {
  const key = process.env.GEMINI_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()
  if (!key) throw new Error('Missing Gemini API key')

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3-pro-preview'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })

  return response.json() as Promise<GeminiPayload>
}

export async function enrichPolicyWithAI(
  policy: { title: string; summary: string | null },
  deps: TaggerDeps = {},
): Promise<PolicyTagResult> {
  const caller = deps.caller ?? callGemini
  const prompt = buildPolicyTagPrompt(policy.title, policy.summary)

  try {
    const payload = await caller(prompt)
    return parsePolicyTagResponse(payload)
  } catch {
    return { impact_level: null, affected_countries: [], effective_date: null, quantified_impact: null }
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: all tests pass including the new 7 policy-tagger tests.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/policy-tagger.ts lib/ai/policy-tagger.test.ts
git commit -m "feat: add AI policy tagger module with prompt builder and response parser"
```

---

## Task 4: Wire Tagger into Policies Scraper

**Files:**
- Modify: `lib/scrapers/policies.ts`

- [ ] **Step 1: Add import and call `enrichPolicyWithAI` after each successful upsert**

In `lib/scrapers/policies.ts`, add the import at the top of the file (after existing imports):

```typescript
import { enrichPolicyWithAI } from '@/lib/ai/policy-tagger'
```

Then in `fetchAndSavePolicies`, replace the upsert block:

```typescript
    const { error, data: upsertData } = await supabaseAdmin.from('policies').upsert({
      ...item,
      is_relevant: relevantFlag,
      keywords,
    }, { onConflict: 'url', ignoreDuplicates: true }).select('id').single()

    if (!error && upsertData) {
      saved++
      if (relevantFlag) {
        relevant++
        await supabaseAdmin.from('alerts').insert({
          type: 'new_policy',
          severity: 'medium',
          message: `新政策：${item.title}（来源：${item.source === 'mofcom' ? '商务部' : 'WTO'}）`,
        })
      }

      // AI enrichment — failure does not block the scrape
      try {
        const tags = await enrichPolicyWithAI({ title: item.title, summary: item.summary })
        await supabaseAdmin.from('policies').update({
          impact_level: tags.impact_level,
          affected_countries: tags.affected_countries,
          effective_date: tags.effective_date,
          quantified_impact: tags.quantified_impact,
          ai_tagged_at: new Date().toISOString(),
        }).eq('id', upsertData.id)
      } catch {
        // Silently skip — backfill route can retry later
      }
    }
```

- [ ] **Step 2: Run tests to confirm nothing breaks**

```bash
npm test
```

Expected: all existing tests still pass (scraper tests mock supabaseAdmin, tagger is not called in unit tests).

- [ ] **Step 3: Commit**

```bash
git add lib/scrapers/policies.ts
git commit -m "feat: enrich policies with AI structured tags after scrape save"
```

---

## Task 5: Backfill Endpoint

**Files:**
- Create: `app/api/fetch/policy-tags/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { enrichPolicyWithAI } from '@/lib/ai/policy-tagger'

async function handler() {
  const { data: policies, error } = await supabaseAdmin
    .from('policies')
    .select('id, title, summary')
    .is('ai_tagged_at', null)
    .order('published_at', { ascending: false })
    .limit(50)  // process in batches to avoid timeout

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  let processed = 0
  let failed = 0

  for (const policy of (policies ?? [])) {
    try {
      const tags = await enrichPolicyWithAI({ title: policy.title, summary: policy.summary })
      await supabaseAdmin.from('policies').update({
        impact_level: tags.impact_level,
        affected_countries: tags.affected_countries,
        effective_date: tags.effective_date,
        quantified_impact: tags.quantified_impact,
        ai_tagged_at: new Date().toISOString(),
      }).eq('id', policy.id)
      processed++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ ok: true, processed, failed })
}

// GET: Vercel Cron compatible
export const GET = handler
// POST: manual trigger
export const POST = handler
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/api/fetch/policy-tags/route.ts
git commit -m "feat: add policy-tags backfill endpoint for historical enrichment"
```

---

## Task 6: Update PolicyTimeline to Show Structured Fields

**Files:**
- Modify: `components/PolicyTimeline.tsx`

- [ ] **Step 1: Add impact level badge, affected countries chips, and quantified impact text**

Replace the full content of `components/PolicyTimeline.tsx`:

```typescript
import type { Policy, PolicySource } from '@/types'

interface Props {
  data: Policy[]
  source: PolicySource | ''
  onSourceChange: (s: PolicySource | '') => void
}

const SOURCE_TABS = [
  { value: '' as const,        label: '全部',  color: 'var(--text-2)' },
  { value: 'mofcom' as const,  label: '商务部', color: '#fb923c' },
  { value: 'wto' as const,     label: 'WTO',   color: '#a78bfa' },
]

const IMPACT_CONFIG = {
  high:   { label: '高影响', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  medium: { label: '中影响', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  low:    { label: '低影响', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

export default function PolicyTimeline({ data, source, onSourceChange }: Props) {
  return (
    <div className="space-y-4">
      {/* Source filter */}
      <div className="flex gap-2">
        {SOURCE_TABS.map(t => {
          const active = source === t.value
          return (
            <button
              key={t.value}
              onClick={() => onSourceChange(t.value)}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? 'var(--surface-3)' : 'transparent',
                color: active ? t.color : 'var(--text-3)',
                border: `1px solid ${active ? 'var(--border-2)' : 'transparent'}`,
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {data.length === 0 && (
          <div className="text-center py-14 text-sm" style={{ color: 'var(--text-3)' }}>
            暂无相关政策数据
          </div>
        )}
        {data.map((p, i) => {
          const isMofcom = p.source === 'mofcom'
          const dotColor = isMofcom ? '#fb923c' : '#a78bfa'
          const impact = p.impact_level ? IMPACT_CONFIG[p.impact_level] : null
          return (
            <div
              key={p.id}
              className="flex gap-4 group page-enter"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              {/* Timeline indicator */}
              <div className="flex flex-col items-center pt-1 shrink-0 w-4">
                <div
                  className="w-2 h-2 rounded-full shrink-0 transition-all"
                  style={{
                    background: impact ? impact.color : dotColor,
                    boxShadow: `0 0 0 3px var(--bg), 0 0 0 4px ${(impact ? impact.color : dotColor)}30`,
                  }}
                />
                {i < data.length - 1 && (
                  <div className="flex-1 w-px mt-2" style={{ background: 'var(--border)' }} />
                )}
              </div>

              {/* Content */}
              <div
                className="flex-1 min-w-0 mb-3 p-4 rounded-lg transition-all cursor-default"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {/* Source badge */}
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded"
                    style={{ background: isMofcom ? 'rgba(251,146,60,0.15)' : 'rgba(167,139,250,0.15)', color: dotColor }}
                  >
                    {isMofcom ? '商务部' : 'WTO'}
                  </span>

                  {/* Impact level badge */}
                  {impact && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded"
                      style={{ background: impact.bg, color: impact.color }}
                    >
                      {impact.label}
                    </span>
                  )}

                  {/* Date */}
                  <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                    {p.published_at ? new Date(p.published_at).toLocaleDateString('zh-CN') : '—'}
                  </span>

                  {/* Keywords */}
                  {p.keywords?.slice(0, 3).map(kw => (
                    <span
                      key={kw}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>

                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium leading-snug line-clamp-2 block transition-colors hover:underline"
                  style={{ color: 'var(--text)' }}
                >
                  {p.title}
                </a>

                {p.summary && (
                  <p className="mt-1.5 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-2)' }}>
                    {p.summary}
                  </p>
                )}

                {/* Structured info row */}
                {(p.affected_countries?.length > 0 || p.quantified_impact) && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {/* Affected countries */}
                    {p.affected_countries?.map(c => (
                      <span
                        key={c}
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
                      >
                        {c}
                      </span>
                    ))}
                    {/* Quantified impact */}
                    {p.quantified_impact && (
                      <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                        {p.quantified_impact}（AI 估算，仅供参考）
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add components/PolicyTimeline.tsx
git commit -m "feat: show impact level, affected countries, and quantified impact in PolicyTimeline"
```

---

## Task 7: PolicyImpactMatrix Component

**Files:**
- Create: `components/PolicyImpactMatrix.tsx`

- [ ] **Step 1: Create the component**

```typescript
import type { Policy } from '@/types'

interface Props {
  policies: Policy[]
}

const MATRIX_MARKETS = ['UAE', 'SA', 'KW', 'QA', 'OM'] as const

export default function PolicyImpactMatrix({ policies }: Props) {
  // Only show high/medium impact policies from last 90 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const relevant = policies.filter(p =>
    (p.impact_level === 'high' || p.impact_level === 'medium') &&
    new Date(p.published_at) >= cutoff
  )

  if (relevant.length === 0) {
    return (
      <div
        className="p-6 rounded-xl text-center text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-3)' }}
      >
        近 90 天暂无高/中影响政策
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>政策 × 市场影响矩阵</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>近 90 天高/中影响政策，AI 估算仅供参考</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th
                className="text-left px-4 py-2.5 font-medium w-1/2"
                style={{ color: 'var(--text-2)' }}
              >
                政策
              </th>
              {MATRIX_MARKETS.map(m => (
                <th
                  key={m}
                  className="px-3 py-2.5 font-medium text-center w-16"
                  style={{ color: 'var(--text-2)' }}
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {relevant.map((p, i) => {
              const isHigh = p.impact_level === 'high'
              return (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: i < relevant.length - 1 ? '1px solid var(--border)' : 'none',
                    background: isHigh ? 'rgba(239,68,68,0.04)' : 'transparent',
                  }}
                >
                  <td className="px-4 py-3">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium line-clamp-1 hover:underline"
                      style={{ color: 'var(--text)' }}
                    >
                      {p.title}
                    </a>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span style={{ color: isHigh ? '#ef4444' : '#f59e0b' }}>
                        {isHigh ? '高影响' : '中影响'}
                      </span>
                      <span style={{ color: 'var(--text-3)' }}>·</span>
                      <span style={{ color: 'var(--text-3)' }}>
                        {new Date(p.published_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </td>
                  {MATRIX_MARKETS.map(m => {
                    const affected = p.affected_countries?.includes(m)
                    return (
                      <td key={m} className="px-3 py-3 text-center">
                        {affected ? (
                          <div>
                            <span style={{ color: '#ef4444' }}>✓</span>
                            {p.quantified_impact && (
                              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                                {p.quantified_impact}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--border-2)' }}>—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add components/PolicyImpactMatrix.tsx
git commit -m "feat: add PolicyImpactMatrix component showing policy x market grid"
```

---

## Task 8: Update /policies Page

**Files:**
- Modify: `app/policies/page.tsx`

- [ ] **Step 1: Import and add `PolicyImpactMatrix` above the timeline**

Replace the full content of `app/policies/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import PolicyTimeline from '@/components/PolicyTimeline'
import PolicyRateChart from '@/components/PolicyRateChart'
import PolicyImpactMatrix from '@/components/PolicyImpactMatrix'
import { safeFetchJson } from '@/lib/http'
import type { Policy, ExchangeRate, PolicySource } from '@/types'

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [rates, setRates] = useState<Pick<ExchangeRate, 'date' | 'rate'>[]>([])
  const [source, setSource] = useState<PolicySource | ''>('')

  useEffect(() => {
    const srcParam = source ? `&source=${source}` : ''
    safeFetchJson<Policy[]>(`/api/policies?relevant=false${srcParam}`, { fallback: [] }).then(setPolicies)
  }, [source])

  useEffect(() => {
    safeFetchJson<Pick<ExchangeRate, 'date' | 'rate'>[]>(
      '/api/exchange-rates?target=AED&days=90',
      { fallback: [] },
    ).then(setRates)
  }, [])

  return (
    <div className="space-y-6">
      <div className="page-enter">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>政策</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>商务部 · WTO 涉轮胎相关政策动态</p>
      </div>
      <PolicyRateChart rates={rates} policies={policies} />
      <PolicyImpactMatrix policies={policies} />
      <PolicyTimeline data={policies} source={source} onSourceChange={setSource} />
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/policies/page.tsx
git commit -m "feat: add PolicyImpactMatrix to policies page"
```

---

## Final Step: Run full test suite

- [ ] **Run all tests**

```bash
npm test
```

Expected output:
```
ℹ tests 71+   (64 existing + 7 new policy-tagger tests)
ℹ pass  71+
ℹ fail  0
```

- [ ] **Trigger backfill for existing policies** (once you've run `POST /api/fetch/policy-tags` manually):

```bash
curl -X POST http://localhost:3000/api/fetch/policy-tags
```

Expected: `{"ok":true,"processed":N,"failed":0}`
