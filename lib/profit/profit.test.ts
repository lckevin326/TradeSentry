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

test('profit contract exports stable runtime choices', () => {
  assert.deepEqual(PROFIT_QUOTE_CURRENCIES, ['USD', 'CNY'])
  assert.deepEqual(PROFIT_TRADE_TERMS, ['FOB', 'CIF', 'EXW', 'DDP'])
  assert.deepEqual(PROFIT_CONTAINER_TYPES, ['20GP', '40GP', '40HQ'])
  assert.deepEqual(PROFIT_DRIVERS, ['fx', 'tariff', 'freight'])
})

test('profit fixtures are executable and bound to the local contract', () => {
  const order: OrderInput = {
    destinationCountry: 'UAE',
    hsCode: '940360',
    tradeTerm: 'FOB',
    quoteCurrency: 'USD',
    quotedAmount: 1200,
    quantity: 10,
    productCost: 700,
    miscFees: 35,
    routeKey: 'shanghai-jebel-ali-20gp',
    containerType: '20GP',
  }

  const snapshot: MarketSnapshot = {
    fxRate: 7.2,
    tariffRatePct: 5,
    antiDumpingRatePct: 1,
    exportRebateRatePct: 2,
    baselineFreight: 180,
    overrideFreight: 200,
  }

  const profit: ProfitResult = {
    revenueCny: 8640,
    costCny: 5400,
    profitCny: 3240,
    marginPct: 37.5,
    freightCny: 200,
    tariffCny: 300,
    antiDumpingCny: 60,
    rebateCny: 144,
  }

  const attribution: AttributionResult = {
    fxDeltaCny: 0,
    tariffDeltaCny: 0,
    freightDeltaCny: 0,
    totalDeltaCny: 0,
    dominantDriver: 'fx',
  }

  assert.equal(order.quoteCurrency, 'USD')
  assert.equal(snapshot.overrideFreight, 200)
  assert.equal(profit.marginPct, 37.5)
  assert.equal(attribution.dominantDriver, 'fx')
  assert.equal(PROFIT_QUOTE_CURRENCIES.includes(order.quoteCurrency), true)
})
