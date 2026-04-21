# Profit Decision Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the homepage into a profit decision page that calculates order contribution profit, compares today vs yesterday, and attributes the change to FX, tariff, and freight.

**Architecture:** Add a reusable profit-calculation domain layer that combines manual order inputs with historical market data from existing sources plus a new freight source. Keep current detail pages intact and use the homepage as the orchestration surface for calculation, attribution, and trend display.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase, Playwright scrapers, Recharts

---

### Task 1: Define Profit Domain Types

**Files:**
- Modify: `types/index.ts`
- Test: `lib/profit/profit.test.ts`

**Step 1: Write the failing test**

Add a test file that imports the planned order input and result types through the calculation module and fails because the module/types do not exist yet.

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/profit/profit.test.ts`
Expected: FAIL because the module or exported types are missing.

**Step 3: Write minimal implementation**

Add typed shapes for:

- `OrderInput`
- `MarketSnapshot`
- `ProfitResult`
- `AttributionResult`

Include fields for:

- destination country
- HS code
- trade term
- quote currency
- quoted amount and quantity
- product cost
- misc fees
- route/container selection
- baseline freight and override freight
- FX rate
- tariff rates
- export rebate rate

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/profit/profit.test.ts`
Expected: PASS for import/type smoke coverage.

**Step 5: Commit**

```bash
git add types/index.ts lib/profit/profit.test.ts
git commit -m "feat: define profit calculation domain types"
```

### Task 2: Build Profit Calculation Module

**Files:**
- Create: `lib/profit/calculate.ts`
- Test: `lib/profit/profit.test.ts`

**Step 1: Write the failing test**

Add tests for:

- profit calculation using baseline freight
- profit calculation using overridden freight
- margin calculation
- yesterday vs today comparison

Include fixture-style numbers that make it obvious when a term is added or omitted incorrectly.

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/profit/profit.test.ts`
Expected: FAIL because `calculateProfitResult` does not exist or returns wrong values.

**Step 3: Write minimal implementation**

Implement:

- revenue calculation in CNY
- CIF-based import tariff calculation
- anti-dumping calculation
- FOB-based export rebate calculation
- freight selection rule:
  override if present, else baseline
- profit and margin calculation
- helper to compare two `MarketSnapshot` values using one `OrderInput`

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/profit/profit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/profit/calculate.ts lib/profit/profit.test.ts
git commit -m "feat: add reusable profit calculation logic"
```

### Task 3: Build Attribution Logic

**Files:**
- Modify: `lib/profit/calculate.ts`
- Test: `lib/profit/profit.test.ts`

**Step 1: Write the failing test**

Add tests that start from yesterday's snapshot and verify separate contribution values for:

- FX
- tariff
- freight

Use numbers where only one factor changes at a time and a combined case where all three change.

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/profit/profit.test.ts`
Expected: FAIL because attribution is missing or does not reconcile with delta expectations.

**Step 3: Write minimal implementation**

Implement `calculateAttribution` that:

- computes yesterday baseline result
- applies today's FX only
- applies today's tariff values
- applies today's freight values
- stores per-factor delta values
- returns dominant driver based on absolute delta

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/profit/profit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/profit/calculate.ts lib/profit/profit.test.ts
git commit -m "feat: add profit delta attribution"
```

### Task 4: Add Freight Data Types and Source Mapping

**Files:**
- Modify: `types/index.ts`
- Create: `lib/freight/constants.ts`
- Test: `lib/freight/constants.test.ts`

**Step 1: Write the failing test**

Add tests that verify supported freight dimensions are defined for:

- destination country
- route key
- container type

Also verify that a route selection resolves to a stable key used by UI and API.

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/freight/constants.test.ts`
Expected: FAIL because constants do not exist yet.

**Step 3: Write minimal implementation**

Add canonical definitions for:

- supported countries
- supported routes
- supported container types
- labels used in forms and charts

Do not over-generalize beyond UAE and Saudi if that is the only supported freight coverage initially.

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/freight/constants.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add types/index.ts lib/freight/constants.ts lib/freight/constants.test.ts
git commit -m "feat: define freight route dimensions"
```

### Task 5: Implement Freight Ingestion

**Files:**
- Create: `lib/scrapers/freight.ts`
- Create: `app/api/fetch/freight/route.ts`
- Modify: `lib/cron.ts`
- Test: `lib/scrapers/freight.test.ts`

**Step 1: Write the failing test**

Add parser-focused tests that use saved HTML or extracted payload fixtures from the freight source and verify:

- date extraction
- route extraction
- baseline freight extraction

Prefer parser-unit tests over live-network tests.

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/scrapers/freight.test.ts`
Expected: FAIL because parser or fetch module does not exist.

**Step 3: Write minimal implementation**

Implement freight fetch/save flow that:

- reads weekly freight data from the selected source
- normalizes to route/container/date records
- upserts into Supabase
- exposes a POST fetch endpoint similar to existing rates/tariffs/policies fetch routes
- optionally adds a cron registration slot appropriate for source frequency

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/scrapers/freight.test.ts`
Expected: PASS for parser/normalization coverage.

**Step 5: Commit**

```bash
git add lib/scrapers/freight.ts app/api/fetch/freight/route.ts lib/cron.ts lib/scrapers/freight.test.ts
git commit -m "feat: ingest baseline freight data"
```

### Task 6: Expose Freight History API

**Files:**
- Create: `app/api/freight/route.ts`
- Test: `app/api/freight/route.test.ts`

**Step 1: Write the failing test**

Add API tests for:

- query by route
- query by container type
- query by day range
- empty-state response

**Step 2: Run test to verify it fails**

Run: `npm test -- app/api/freight/route.test.ts`
Expected: FAIL because the route does not exist.

**Step 3: Write minimal implementation**

Implement a GET route that:

- accepts route/container/day filters
- reads freight history from Supabase
- returns ordered rows for charting and baseline selection

Match response style used by `app/api/exchange-rates/route.ts`.

**Step 4: Run test to verify it passes**

Run: `npm test -- app/api/freight/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/freight/route.ts app/api/freight/route.test.ts
git commit -m "feat: add freight history API"
```

### Task 7: Add Export Rebate Data Access

**Files:**
- Create: `lib/rebates.ts`
- Test: `lib/rebates.test.ts`

**Step 1: Write the failing test**

Add tests for:

- rebate lookup by HS code
- default/fallback behavior when a rebate rate is missing

If a real source is not yet available, define fixture-backed lookup behavior and document the manual source path.

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/rebates.test.ts`
Expected: FAIL because the lookup module does not exist.

**Step 3: Write minimal implementation**

Implement a narrow rebate lookup utility that:

- supports current tire HS codes only
- returns a consistent numeric rate
- makes unsupported HS codes explicit rather than silently guessing

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/rebates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/rebates.ts lib/rebates.test.ts
git commit -m "feat: add export rebate lookup"
```

### Task 8: Build Profit Decision API

**Files:**
- Create: `app/api/profit/route.ts`
- Test: `app/api/profit/route.test.ts`

**Step 1: Write the failing test**

Add API tests for POST requests that submit an order input and verify response contains:

- today's result
- yesterday's result
- attribution
- selected market values

**Step 2: Run test to verify it fails**

Run: `npm test -- app/api/profit/route.test.ts`
Expected: FAIL because the route does not exist.

**Step 3: Write minimal implementation**

Implement a POST route that:

- validates user input
- reads today's and yesterday's FX/tariff/freight data
- gets rebate rate
- composes `MarketSnapshot` objects
- calls calculation and attribution helpers
- returns a UI-ready response

**Step 4: Run test to verify it passes**

Run: `npm test -- app/api/profit/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/profit/route.ts app/api/profit/route.test.ts
git commit -m "feat: add profit decision API"
```

### Task 9: Build Profit Calculator Component

**Files:**
- Create: `components/ProfitCalculator.tsx`
- Test: `components/ProfitCalculator.test.tsx`

**Step 1: Write the failing test**

Add component tests that verify:

- default values render
- changing trade term or quote currency updates form state
- baseline freight is shown
- manual freight override is possible
- submit triggers calculation request

**Step 2: Run test to verify it fails**

Run: `npm test -- components/ProfitCalculator.test.tsx`
Expected: FAIL because the component does not exist.

**Step 3: Write minimal implementation**

Create a controlled client component for the order input form with:

- typed local form state
- clear grouping of order inputs vs system-derived values
- baseline freight display plus override input
- submit handler to call the profit API

**Step 4: Run test to verify it passes**

Run: `npm test -- components/ProfitCalculator.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/ProfitCalculator.tsx components/ProfitCalculator.test.tsx
git commit -m "feat: add profit calculator UI"
```

### Task 10: Build Profit Result and Attribution Components

**Files:**
- Create: `components/ProfitSummary.tsx`
- Create: `components/ProfitAttribution.tsx`
- Test: `components/ProfitSummary.test.tsx`
- Test: `components/ProfitAttribution.test.tsx`

**Step 1: Write the failing test**

Add tests that verify:

- summary cards render profit, margin, and yesterday delta
- attribution cards render FX, tariff, freight contributions
- dominant driver styling/text is shown

**Step 2: Run test to verify it fails**

Run: `npm test -- components/ProfitSummary.test.tsx components/ProfitAttribution.test.tsx`
Expected: FAIL because components do not exist.

**Step 3: Write minimal implementation**

Implement:

- summary card cluster
- attribution card cluster
- clear positive/negative styling
- compact explanatory copy

**Step 4: Run test to verify it passes**

Run: `npm test -- components/ProfitSummary.test.tsx components/ProfitAttribution.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/ProfitSummary.tsx components/ProfitAttribution.tsx components/ProfitSummary.test.tsx components/ProfitAttribution.test.tsx
git commit -m "feat: add profit result display components"
```

### Task 11: Add Freight Trend Visualization

**Files:**
- Create: `components/FreightChart.tsx`
- Test: `components/FreightChart.test.tsx`

**Step 1: Write the failing test**

Add tests that verify:

- chart accepts ordered freight history data
- empty state is rendered correctly
- selected period changes the displayed data slice

**Step 2: Run test to verify it fails**

Run: `npm test -- components/FreightChart.test.tsx`
Expected: FAIL because the component does not exist.

**Step 3: Write minimal implementation**

Implement a chart component aligned with the existing visual style and data shape used by current charts.

**Step 4: Run test to verify it passes**

Run: `npm test -- components/FreightChart.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/FreightChart.tsx components/FreightChart.test.tsx
git commit -m "feat: add freight trend chart"
```

### Task 12: Replace Homepage with Profit Decision Page

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/AlertBanner.tsx` (only if needed for layout integration)
- Test: `app/page.test.tsx`

**Step 1: Write the failing test**

Add page-level tests for:

- calculator renders on homepage
- result/attribution sections render after calculation data is available
- existing monitoring context still appears in the trends section

**Step 2: Run test to verify it fails**

Run: `npm test -- app/page.test.tsx`
Expected: FAIL because the homepage still renders the old dashboard.

**Step 3: Write minimal implementation**

Update the homepage to:

- keep the page shell and visual language
- render the calculator at top
- render summary + attribution in the main decision area
- render trend blocks for FX, freight, and tariff/policy markers below
- preserve the existing alert banner if it still fits the new structure

**Step 4: Run test to verify it passes**

Run: `npm test -- app/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add app/page.tsx components/AlertBanner.tsx app/page.test.tsx
git commit -m "feat: turn homepage into profit decision page"
```

### Task 13: Verify End-to-End Behavior

**Files:**
- No code changes required unless defects are found

**Step 1: Run targeted tests**

Run:

```bash
npm test -- lib/profit/profit.test.ts
npm test -- lib/scrapers/freight.test.ts
npm test -- app/api/profit/route.test.ts
npm test -- components/ProfitCalculator.test.tsx
npm test -- app/page.test.tsx
```

Expected: PASS

**Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: no new lint errors

**Step 3: Run app smoke check**

Run:

```bash
npm run build
```

Expected: successful production build

**Step 4: Fix any failures**

If any command fails, fix only the concrete issue, rerun the failed command, and avoid expanding scope.

**Step 5: Commit**

```bash
git add .
git commit -m "test: verify profit decision page flow"
```
