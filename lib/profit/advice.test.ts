import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import type { AttributionResult, MarketSnapshot, ProfitResult } from './index'
import { buildDecisionAdvice } from './advice'

function createProfitResult(overrides: Partial<ProfitResult> = {}): ProfitResult {
  return {
    revenueCny: 10000,
    costCny: 8500,
    profitCny: 1500,
    marginPct: 15,
    freightCny: 500,
    tariffCny: 300,
    antiDumpingCny: 100,
    rebateCny: 50,
    ...overrides,
  }
}

function createAttribution(overrides: Partial<AttributionResult> = {}): AttributionResult {
  return {
    fxDeltaCny: 0,
    dutiesDeltaCny: 0,
    freightDeltaCny: 0,
    totalDeltaCny: 0,
    dominantDriver: 'fx',
    ...overrides,
  }
}

function createMarketSnapshot(overrides: Partial<MarketSnapshot> = {}): MarketSnapshot {
  return {
    fxRate: 7.1,
    tariffRatePct: 10,
    antiDumpingRatePct: 5,
    exportRebateRatePct: 2,
    baselineFreight: 500,
    overrideFreight: null,
    ...overrides,
  }
}

test('buildDecisionAdvice returns healthy when margin is at least 15%', () => {
  const advice = buildDecisionAdvice({
    todayResult: createProfitResult({ marginPct: 18, profitCny: 1800 }),
    yesterdayResult: createProfitResult({ marginPct: 16, profitCny: 1600 }),
    attribution: createAttribution({ fxDeltaCny: 200, totalDeltaCny: 200 }),
    marketSnapshot: createMarketSnapshot(),
    recentPoliciesCount: 0,
  })

  assert.equal(advice.status, 'healthy')
  assert.equal(advice.action, 'hold_quote')
  assert.equal(advice.dominantDriver, 'fx')
})

test('buildDecisionAdvice keeps healthy when margin is high even if profit drops sharply vs yesterday', () => {
  const advice = buildDecisionAdvice({
    todayResult: createProfitResult({ marginPct: 16, profitCny: 1600 }),
    yesterdayResult: createProfitResult({ marginPct: 24, profitCny: 2400 }),
    attribution: createAttribution({
      fxDeltaCny: -500,
      dutiesDeltaCny: -150,
      freightDeltaCny: -150,
      totalDeltaCny: -800,
      dominantDriver: 'fx',
    }),
    marketSnapshot: createMarketSnapshot(),
    recentPoliciesCount: 0,
  })

  assert.equal(advice.status, 'healthy')
})

test('buildDecisionAdvice treats 15% margin as healthy', () => {
  const advice = buildDecisionAdvice({
    todayResult: createProfitResult({ marginPct: 15, profitCny: 1500 }),
    yesterdayResult: createProfitResult({ marginPct: 14, profitCny: 1400 }),
    attribution: createAttribution({ fxDeltaCny: 100, totalDeltaCny: 100 }),
    marketSnapshot: createMarketSnapshot(),
    recentPoliciesCount: 0,
  })

  assert.equal(advice.status, 'healthy')
})

test('buildDecisionAdvice returns watch when margin is between 8% and 15%', () => {
  const advice = buildDecisionAdvice({
    todayResult: createProfitResult({ marginPct: 10, profitCny: 1000 }),
    yesterdayResult: createProfitResult({ marginPct: 11, profitCny: 1100 }),
    attribution: createAttribution({ fxDeltaCny: -100, totalDeltaCny: -100 }),
    marketSnapshot: createMarketSnapshot(),
    recentPoliciesCount: 0,
  })

  assert.equal(advice.status, 'watch')
})

test('buildDecisionAdvice treats 8% margin as watch', () => {
  const advice = buildDecisionAdvice({
    todayResult: createProfitResult({ marginPct: 8, profitCny: 800 }),
    yesterdayResult: createProfitResult({ marginPct: 9, profitCny: 900 }),
    attribution: createAttribution({ fxDeltaCny: -100, totalDeltaCny: -100 }),
    marketSnapshot: createMarketSnapshot(),
    recentPoliciesCount: 0,
  })

  assert.equal(advice.status, 'watch')
})

test('buildDecisionAdvice returns pressure when margin is below 8%', () => {
  const advice = buildDecisionAdvice({
    todayResult: createProfitResult({ marginPct: 6, profitCny: 600 }),
    yesterdayResult: createProfitResult({ marginPct: 9, profitCny: 900 }),
    attribution: createAttribution({ dutiesDeltaCny: -300, totalDeltaCny: -300, dominantDriver: 'tariff' }),
    marketSnapshot: createMarketSnapshot(),
    recentPoliciesCount: 0,
  })

  assert.equal(advice.status, 'pressure')
})

test('buildDecisionAdvice uses upstream tariff naming for non-mixed dominant driver', () => {
  const advice = buildDecisionAdvice({
    todayResult: createProfitResult({ marginPct: 7, profitCny: 700 }),
    yesterdayResult: createProfitResult({ marginPct: 9, profitCny: 900 }),
    attribution: createAttribution({
      dutiesDeltaCny: -240,
      fxDeltaCny: -20,
      freightDeltaCny: -20,
      totalDeltaCny: -280,
      dominantDriver: 'tariff',
    }),
    marketSnapshot: createMarketSnapshot(),
    recentPoliciesCount: 0,
  })

  assert.equal(advice.dominantDriver, 'tariff')
})

test('buildDecisionAdvice suggests review_freight when freight is the dominant driver', () => {
  const advice = buildDecisionAdvice({
    todayResult: createProfitResult({ marginPct: 12, profitCny: 1200 }),
    yesterdayResult: createProfitResult({ marginPct: 13, profitCny: 1300 }),
    attribution: createAttribution({
      freightDeltaCny: -260,
      fxDeltaCny: -80,
      dutiesDeltaCny: -40,
      totalDeltaCny: -380,
      dominantDriver: 'freight',
    }),
    marketSnapshot: createMarketSnapshot({ overrideFreight: 900 }),
    recentPoliciesCount: 0,
  })

  assert.equal(advice.status, 'watch')
  assert.equal(advice.dominantDriver, 'freight')
  assert.equal(advice.action, 'review_freight')
  assert.match(advice.summary, /运费/)
  assert.equal(advice.executiveSummary, '利润处于关注区间，较昨日减少 100 元，主要受运费拖累，先复核运费口径。')
  assert.deepEqual(advice.driverBreakdown, [
    { label: '汇率', impactCny: -80, tone: 'negative' },
    { label: '税费', impactCny: -40, tone: 'negative' },
    { label: '运费', impactCny: -260, tone: 'negative' },
  ])
})

test('buildDecisionAdvice keeps review_freight for pressure when freight is the dominant driver', () => {
  const advice = buildDecisionAdvice({
    todayResult: createProfitResult({ marginPct: 6, profitCny: 600 }),
    yesterdayResult: createProfitResult({ marginPct: 9, profitCny: 900 }),
    attribution: createAttribution({
      freightDeltaCny: -300,
      fxDeltaCny: -40,
      dutiesDeltaCny: -20,
      totalDeltaCny: -360,
      dominantDriver: 'freight',
    }),
    marketSnapshot: createMarketSnapshot(),
    recentPoliciesCount: 2,
  })

  assert.equal(advice.status, 'pressure')
  assert.equal(advice.dominantDriver, 'freight')
  assert.equal(advice.action, 'review_freight')
})

test('buildDecisionAdvice suggests raise_quote when FX dominates under pressure', () => {
  const advice = buildDecisionAdvice({
    todayResult: createProfitResult({ marginPct: 6, profitCny: 600 }),
    yesterdayResult: createProfitResult({ marginPct: 9, profitCny: 900 }),
    attribution: createAttribution({
      fxDeltaCny: -260,
      dutiesDeltaCny: -60,
      freightDeltaCny: -40,
      totalDeltaCny: -360,
      dominantDriver: 'fx',
    }),
    marketSnapshot: createMarketSnapshot(),
    recentPoliciesCount: 0,
  })

  assert.equal(advice.status, 'pressure')
  assert.equal(advice.dominantDriver, 'fx')
  assert.equal(advice.action, 'raise_quote')
})

test('buildDecisionAdvice returns mixed when attribution deltas are all zero', () => {
  const advice = buildDecisionAdvice({
    todayResult: createProfitResult({ marginPct: 11, profitCny: 1100 }),
    yesterdayResult: createProfitResult({ marginPct: 11, profitCny: 1100 }),
    attribution: createAttribution({
      fxDeltaCny: 0,
      dutiesDeltaCny: 0,
      freightDeltaCny: 0,
      totalDeltaCny: 0,
      dominantDriver: 'fx',
    }),
    marketSnapshot: createMarketSnapshot(),
    recentPoliciesCount: 0,
  })

  assert.equal(advice.dominantDriver, 'mixed')
})

test('buildDecisionAdvice treats a driver at exactly 50% of total change as dominant', () => {
  const advice = buildDecisionAdvice({
    todayResult: createProfitResult({ marginPct: 9, profitCny: 900 }),
    yesterdayResult: createProfitResult({ marginPct: 10, profitCny: 1000 }),
    attribution: createAttribution({
      fxDeltaCny: -100,
      dutiesDeltaCny: -60,
      freightDeltaCny: -40,
      totalDeltaCny: -200,
      dominantDriver: 'fx',
    }),
    marketSnapshot: createMarketSnapshot(),
    recentPoliciesCount: 0,
  })

  assert.equal(advice.dominantDriver, 'fx')
})

test('buildDecisionAdvice returns mixed when no single driver exceeds half of total change', () => {
  const advice = buildDecisionAdvice({
    todayResult: createProfitResult({ marginPct: 11, profitCny: 1100 }),
    yesterdayResult: createProfitResult({ marginPct: 12, profitCny: 1200 }),
    attribution: createAttribution({
      fxDeltaCny: -120,
      dutiesDeltaCny: -100,
      freightDeltaCny: -80,
      totalDeltaCny: -300,
      dominantDriver: 'fx',
    }),
    marketSnapshot: createMarketSnapshot(),
    recentPoliciesCount: 1,
  })

  assert.equal(advice.status, 'watch')
  assert.equal(advice.dominantDriver, 'mixed')
  assert.equal(advice.action, 'manual_check')
  assert.equal(advice.executiveSummary, '利润处于关注区间，较昨日减少 100 元，由汇率、税费、运费共同作用，先做人工复核。')
  assert.deepEqual(advice.driverBreakdown, [
    { label: '汇率', impactCny: -120, tone: 'negative' },
    { label: '税费', impactCny: -100, tone: 'negative' },
    { label: '运费', impactCny: -80, tone: 'negative' },
  ])
  assert.doesNotMatch(advice.executiveSummary, /主要受(?:汇率|税费|运费)/)
})
