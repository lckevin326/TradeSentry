import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import {
  PROFIT_CONTAINER_TYPES,
  PROFIT_DRIVERS,
  PROFIT_QUOTE_CURRENCIES,
  PROFIT_TRADE_TERMS,
  type AttributionResult,
  type MarketSnapshot,
  type OrderInput,
  type ProfitResult,
} from './index'
import { calculateAttribution, calculateProfitComparison, calculateProfitResult, dominantProfitDriver } from './calculate'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

test('profit contract exports stable runtime choices', () => {
  assert.deepEqual(PROFIT_QUOTE_CURRENCIES, ['USD', 'CNY'])
  assert.deepEqual(PROFIT_TRADE_TERMS, ['FOB', 'CIF'])
  assert.deepEqual(PROFIT_CONTAINER_TYPES, ['20GP', '40GP', '40HQ'])
  assert.deepEqual(PROFIT_DRIVERS, ['fx', 'tariff', 'freight'])
})

test('calculateProfitResult uses baseline freight when no override exists', () => {
  const order: OrderInput = {
    destinationCountry: 'UAE',
    hsCode: '940360',
    tradeTerm: 'FOB',
    quoteCurrency: 'USD',
    quotedAmount: 1000,
    quantity: 10,
    productCost: 4000,
    miscFees: 100,
    routeKey: 'shanghai-jebel-ali-20gp',
    containerType: '20GP',
  }

  const snapshot: MarketSnapshot = {
    fxRate: 7,
    tariffRatePct: 10,
    antiDumpingRatePct: 5,
    exportRebateRatePct: 2,
    baselineFreight: 100,
    overrideFreight: null,
  }

  const result = calculateProfitResult(order, snapshot)

  assert.deepEqual(result, {
    revenueCny: 7000,
    costCny: 5125,
    profitCny: 1875,
    marginPct: 26.79,
    freightCny: 100,
    tariffCny: 710,
    antiDumpingCny: 355,
    rebateCny: 140,
  } satisfies ProfitResult)
})

test('calculateProfitResult uses overridden freight when present', () => {
  const order: OrderInput = {
    destinationCountry: 'UAE',
    hsCode: '940360',
    tradeTerm: 'CIF',
    quoteCurrency: 'USD',
    quotedAmount: 1000,
    quantity: 10,
    productCost: 3600,
    miscFees: 100,
    routeKey: 'shanghai-jebel-ali-20gp',
    containerType: '20GP',
  }

  const snapshot: MarketSnapshot = {
    fxRate: 8,
    tariffRatePct: 10,
    antiDumpingRatePct: 5,
    exportRebateRatePct: 2,
    baselineFreight: 120,
    overrideFreight: 180,
  }

  const result = calculateProfitResult(order, snapshot)

  assert.deepEqual(result, {
    revenueCny: 8000,
    costCny: 4923.6,
    profitCny: 3076.4,
    marginPct: 38.46,
    freightCny: 180,
    tariffCny: 800,
    antiDumpingCny: 400,
    rebateCny: 156.4,
  } satisfies ProfitResult)
})

test('calculateProfitResult computes margin from profit and revenue', () => {
  const order: OrderInput = {
    destinationCountry: 'SA',
    hsCode: '940360',
    tradeTerm: 'FOB',
    quoteCurrency: 'CNY',
    quotedAmount: 10000,
    quantity: 10,
    productCost: 4700,
    miscFees: 100,
    routeKey: 'shanghai-dammam-40hq',
    containerType: '40HQ',
  }

  const snapshot: MarketSnapshot = {
    fxRate: 1,
    tariffRatePct: 0,
    antiDumpingRatePct: 0,
    exportRebateRatePct: 0,
    baselineFreight: 200,
    overrideFreight: null,
  }

  const result = calculateProfitResult(order, snapshot)

  assert.equal(result.profitCny, 5000)
  assert.equal(result.marginPct, 50)
})

test('calculateProfitComparison compares yesterday and today with one order', () => {
  const order: OrderInput = {
    destinationCountry: 'UAE',
    hsCode: '940360',
    tradeTerm: 'FOB',
    quoteCurrency: 'USD',
    quotedAmount: 1000,
    quantity: 10,
    productCost: 4000,
    miscFees: 100,
    routeKey: 'shanghai-jebel-ali-20gp',
    containerType: '20GP',
  }

  const yesterday: MarketSnapshot = {
    fxRate: 7,
    tariffRatePct: 10,
    antiDumpingRatePct: 5,
    exportRebateRatePct: 2,
    baselineFreight: 100,
    overrideFreight: null,
  }

  const today: MarketSnapshot = {
    fxRate: 7.2,
    tariffRatePct: 10,
    antiDumpingRatePct: 5,
    exportRebateRatePct: 2,
    baselineFreight: 100,
    overrideFreight: 140,
  }

  const comparison = calculateProfitComparison(order, yesterday, today)

  assert.deepEqual(comparison.yesterday, {
    revenueCny: 7000,
    costCny: 5125,
    profitCny: 1875,
    marginPct: 26.79,
    freightCny: 100,
    tariffCny: 710,
    antiDumpingCny: 355,
    rebateCny: 140,
  } satisfies ProfitResult)
  assert.deepEqual(comparison.today, {
    revenueCny: 7200,
    costCny: 5197,
    profitCny: 2003,
    marginPct: 27.82,
    freightCny: 140,
    tariffCny: 734,
    antiDumpingCny: 367,
    rebateCny: 144,
  } satisfies ProfitResult)
  assert.deepEqual(
    comparison.deltas,
    {
      profit: {
        cny: 128,
        marginPct: 1.03,
      },
      operating: {
        revenueCny: 200,
        freightCny: 40,
      },
      duties: {
        tariffCny: 24,
        antiDumpingCny: 12,
        rebateCny: 4,
      },
    },
  )
})

test('calculateAttribution isolates the FX contribution from yesterday baseline', () => {
  const order: OrderInput = {
    destinationCountry: 'UAE',
    hsCode: '940360',
    tradeTerm: 'FOB',
    quoteCurrency: 'USD',
    quotedAmount: 1000,
    quantity: 10,
    productCost: 4000,
    miscFees: 100,
    routeKey: 'shanghai-jebel-ali-20gp',
    containerType: '20GP',
  }

  const yesterday: MarketSnapshot = {
    fxRate: 7,
    tariffRatePct: 10,
    antiDumpingRatePct: 5,
    exportRebateRatePct: 2,
    baselineFreight: 100,
    overrideFreight: null,
  }

  const today: MarketSnapshot = {
    fxRate: 7.2,
    tariffRatePct: 10,
    antiDumpingRatePct: 5,
    exportRebateRatePct: 2,
    baselineFreight: 100,
    overrideFreight: null,
  }

  assert.deepEqual(calculateAttribution(order, yesterday, today), {
    fxDeltaCny: 174,
    dutiesDeltaCny: 0,
    freightDeltaCny: 0,
    totalDeltaCny: 174,
    dominantDriver: 'fx',
  } satisfies AttributionResult)
})

test('calculateAttribution isolates the duties contribution from yesterday baseline', () => {
  const order: OrderInput = {
    destinationCountry: 'UAE',
    hsCode: '940360',
    tradeTerm: 'FOB',
    quoteCurrency: 'USD',
    quotedAmount: 1000,
    quantity: 10,
    productCost: 4000,
    miscFees: 100,
    routeKey: 'shanghai-jebel-ali-20gp',
    containerType: '20GP',
  }

  const yesterday: MarketSnapshot = {
    fxRate: 7,
    tariffRatePct: 10,
    antiDumpingRatePct: 5,
    exportRebateRatePct: 2,
    baselineFreight: 100,
    overrideFreight: null,
  }

  const today: MarketSnapshot = {
    fxRate: 7,
    tariffRatePct: 12,
    antiDumpingRatePct: 6,
    exportRebateRatePct: 2,
    baselineFreight: 100,
    overrideFreight: null,
  }

  assert.deepEqual(calculateAttribution(order, yesterday, today), {
    fxDeltaCny: 0,
    dutiesDeltaCny: -213,
    freightDeltaCny: 0,
    totalDeltaCny: -213,
    dominantDriver: 'tariff',
  } satisfies AttributionResult)
})

test('calculateAttribution isolates the freight contribution from yesterday baseline', () => {
  const order: OrderInput = {
    destinationCountry: 'UAE',
    hsCode: '940360',
    tradeTerm: 'FOB',
    quoteCurrency: 'USD',
    quotedAmount: 1000,
    quantity: 10,
    productCost: 4000,
    miscFees: 100,
    routeKey: 'shanghai-jebel-ali-20gp',
    containerType: '20GP',
  }

  const yesterday: MarketSnapshot = {
    fxRate: 7,
    tariffRatePct: 10,
    antiDumpingRatePct: 5,
    exportRebateRatePct: 2,
    baselineFreight: 100,
    overrideFreight: null,
  }

  const today: MarketSnapshot = {
    fxRate: 7,
    tariffRatePct: 10,
    antiDumpingRatePct: 5,
    exportRebateRatePct: 2,
    baselineFreight: 100,
    overrideFreight: 140,
  }

  assert.deepEqual(calculateAttribution(order, yesterday, today), {
    fxDeltaCny: 0,
    dutiesDeltaCny: 0,
    freightDeltaCny: -46,
    totalDeltaCny: -46,
    dominantDriver: 'freight',
  } satisfies AttributionResult)
})

test('calculateAttribution decomposes combined changes into additive contributions', () => {
  const order: OrderInput = {
    destinationCountry: 'UAE',
    hsCode: '940360',
    tradeTerm: 'FOB',
    quoteCurrency: 'USD',
    quotedAmount: 1000,
    quantity: 10,
    productCost: 4000,
    miscFees: 100,
    routeKey: 'shanghai-jebel-ali-20gp',
    containerType: '20GP',
  }

  const yesterday: MarketSnapshot = {
    fxRate: 7,
    tariffRatePct: 10,
    antiDumpingRatePct: 5,
    exportRebateRatePct: 2,
    baselineFreight: 100,
    overrideFreight: null,
  }

  const today: MarketSnapshot = {
    fxRate: 7.2,
    tariffRatePct: 12,
    antiDumpingRatePct: 6,
    exportRebateRatePct: 2,
    baselineFreight: 100,
    overrideFreight: 140,
  }

  assert.deepEqual(calculateAttribution(order, yesterday, today), {
    fxDeltaCny: 174,
    dutiesDeltaCny: -219,
    freightDeltaCny: -47.2,
    totalDeltaCny: -92.2,
    dominantDriver: 'tariff',
  } satisfies AttributionResult)
})

test('calculateAttribution keeps the duties bucket honest when tariff rate is unchanged', () => {
  const order: OrderInput = {
    destinationCountry: 'UAE',
    hsCode: '940360',
    tradeTerm: 'FOB',
    quoteCurrency: 'USD',
    quotedAmount: 1000,
    quantity: 10,
    productCost: 4000,
    miscFees: 100,
    routeKey: 'shanghai-jebel-ali-20gp',
    containerType: '20GP',
  }

  const yesterday: MarketSnapshot = {
    fxRate: 7,
    tariffRatePct: 10,
    antiDumpingRatePct: 5,
    exportRebateRatePct: 2,
    baselineFreight: 100,
    overrideFreight: null,
  }

  const today: MarketSnapshot = {
    fxRate: 7,
    tariffRatePct: 10,
    antiDumpingRatePct: 8,
    exportRebateRatePct: 0,
    baselineFreight: 100,
    overrideFreight: null,
  }

  const attribution = calculateAttribution(order, yesterday, today)

  assert.deepEqual(attribution, {
    fxDeltaCny: 0,
    dutiesDeltaCny: -353,
    freightDeltaCny: 0,
    totalDeltaCny: -353,
    dominantDriver: 'tariff',
  } satisfies AttributionResult)
  assert.equal(
    round2(attribution.fxDeltaCny + attribution.dutiesDeltaCny + attribution.freightDeltaCny),
    attribution.totalDeltaCny,
  )
})

test('dominantProfitDriver picks the largest absolute delta', () => {
  assert.equal(
    dominantProfitDriver({
      fxDeltaCny: -18,
      dutiesDeltaCny: 24,
      freightDeltaCny: 12,
    }),
    'tariff',
  )
})

test('profit attribution type remains compatible with exported contract', () => {
  const attribution: AttributionResult = {
    fxDeltaCny: 0,
    dutiesDeltaCny: 0,
    freightDeltaCny: 0,
    totalDeltaCny: 0,
    dominantDriver: 'fx',
  }

  assert.equal(attribution.dominantDriver, 'fx')
})
