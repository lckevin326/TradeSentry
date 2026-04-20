import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import {
  formatFreightStorageError,
  FREIGHT_TABLE_SETUP_SQL_PATH,
} from './storage-error'

test('formatFreightStorageError translates missing freight table errors into setup guidance', () => {
  assert.equal(
    formatFreightStorageError("Freight save failed: Could not find the table 'public.freight_rates' in the schema cache"),
    `缺少 freight_rates 表。请先在 Supabase SQL Editor 执行 ${FREIGHT_TABLE_SETUP_SQL_PATH}，再点击“立即刷新运费”。`,
  )
})

test('formatFreightStorageError preserves unrelated errors', () => {
  assert.equal(formatFreightStorageError('Freight save failed: db down'), 'Freight save failed: db down')
})
