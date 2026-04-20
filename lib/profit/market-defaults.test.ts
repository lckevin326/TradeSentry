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
