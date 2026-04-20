import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import {
  CURRENT_TIRE_HS_CODES,
  EXPORT_REBATE_FALLBACK_HS_CODES,
  DEFAULT_EXPORT_REBATE_RATE_PCT,
  getExportRebateRateByHsCode,
} from './rebates'

test('rebate lookup returns the fixture rate and source for supported tire HS codes with data', () => {
  assert.deepEqual(getExportRebateRateByHsCode('401110'), {
    hsCode: '401110',
    normalizedHsCode: '401110',
    ratePct: 13,
    source: 'fixture',
  })
  assert.deepEqual(getExportRebateRateByHsCode('4011.20'), {
    hsCode: '4011.20',
    normalizedHsCode: '401120',
    ratePct: 13,
    source: 'fixture',
  })
  assert.deepEqual(CURRENT_TIRE_HS_CODES, ['401110', '401120', '401140', '401150', '401170', '401180'])
})

test('rebate lookup only falls back for the explicitly allowed supported code', () => {
  assert.equal(DEFAULT_EXPORT_REBATE_RATE_PCT, 0)
  assert.deepEqual(EXPORT_REBATE_FALLBACK_HS_CODES, ['401150'])
  assert.deepEqual(getExportRebateRateByHsCode('401150'), {
    hsCode: '401150',
    normalizedHsCode: '401150',
    ratePct: 0,
    source: 'fallback',
  })

  for (const hsCode of CURRENT_TIRE_HS_CODES) {
    const lookup = getExportRebateRateByHsCode(hsCode)

    if (EXPORT_REBATE_FALLBACK_HS_CODES.includes(hsCode)) {
      assert.equal(lookup.source, 'fallback')
      assert.equal(lookup.ratePct, DEFAULT_EXPORT_REBATE_RATE_PCT)
      continue
    }

    assert.equal(lookup.source, 'fixture')
    assert.equal(lookup.ratePct, 13)
  }
})

test('rebate lookup rejects unsupported HS codes explicitly', () => {
  assert.throws(() => getExportRebateRateByHsCode('870899'), /unsupported tire HS code/i)
})
