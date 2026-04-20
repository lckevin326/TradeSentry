import { strict as assert } from 'node:assert'
import { test } from 'node:test'

test('buildYesterdayDateString returns 1 day before given date', async () => {
  const { buildYesterdayDateString } = await import('./market-data.ts')
  assert.equal(buildYesterdayDateString('2026-04-20'), '2026-04-19')
})

test('buildYesterdayDateString handles month boundary', async () => {
  const { buildYesterdayDateString } = await import('./market-data.ts')
  assert.equal(buildYesterdayDateString('2026-05-01'), '2026-04-30')
})
