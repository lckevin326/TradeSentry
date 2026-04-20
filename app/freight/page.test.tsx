import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import FreightPage, { normalizeFreightRows } from './page'

test('freight page renders route controls and detail sections', () => {
  const markup = renderToStaticMarkup(<FreightPage />)

  assert.match(markup, /运费/)
  assert.match(markup, /航线/)
  assert.match(markup, /柜型/)
  assert.match(markup, /最新基准运费/)
  assert.match(markup, /数据来源/)
  assert.match(markup, /最近抓取时间/)
  assert.match(markup, /CCFI 中东指数推导/)
  assert.match(markup, /立即刷新运费/)
})

test('normalizeFreightRows returns empty array for non-array payloads', () => {
  assert.deepEqual(normalizeFreightRows({ error: 'boom' }), [])
  assert.deepEqual(normalizeFreightRows(null), [])
})
