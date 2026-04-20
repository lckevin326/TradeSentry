import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import type { AttributionResult } from '../lib/profit'

import ProfitAttribution from './ProfitAttribution'

test('ProfitAttribution renders FX, tariff, and freight contributions', () => {
  const attribution: AttributionResult = {
    fxDeltaCny: 1030,
    dutiesDeltaCny: -102,
    freightDeltaCny: -44.8,
    totalDeltaCny: 883.2,
    dominantDriver: 'fx',
  }

  const markup = renderToStaticMarkup(<ProfitAttribution attribution={attribution} />)

  assert.match(markup, /归因拆解/)
  assert.match(markup, /FX/)
  assert.match(markup, /\+¥1,030/)
  assert.match(markup, /Tariff/)
  assert.match(markup, /-¥102/)
  assert.match(markup, /Freight/)
  assert.match(markup, /-¥44\.8/)
})

test('ProfitAttribution shows positive\/negative and helping\/hurting wording with styling', () => {
  const markup = renderToStaticMarkup(
    <ProfitAttribution
      attribution={{
        fxDeltaCny: 1030,
        dutiesDeltaCny: -102,
        freightDeltaCny: 44.8,
        totalDeltaCny: 972.8,
        dominantDriver: 'fx',
      }}
    />,
  )

  assert.match(markup, /Positive/)
  assert.match(markup, /Negative/)
  assert.match(markup, /Helping/)
  assert.match(markup, /Hurting/)
  assert.match(markup, /var\(--green\)/)
  assert.match(markup, /var\(--red\)/)
})
