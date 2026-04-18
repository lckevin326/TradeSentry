import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import type { ProfitResult } from '../lib/profit'

import ProfitSummary from './ProfitSummary'

const todayResult: ProfitResult = {
  revenueCny: 5000,
  costCny: 4206.8,
  profitCny: 793.2,
  marginPct: 15.86,
  freightCny: 140,
  tariffCny: 616.8,
  antiDumpingCny: 0,
  rebateCny: 650,
}

const yesterdayResult: ProfitResult = {
  revenueCny: 4000,
  costCny: 4090,
  profitCny: -90,
  marginPct: -2.25,
  freightCny: 100,
  tariffCny: 410,
  antiDumpingCny: 0,
  rebateCny: 520,
}

test('ProfitSummary renders profit, margin, and yesterday delta cards', () => {
  const markup = renderToStaticMarkup(
    <ProfitSummary
      todayResult={todayResult}
      yesterdayResult={yesterdayResult}
      attribution={{
        fxDeltaCny: 1030,
        dutiesDeltaCny: -102,
        freightDeltaCny: -44.8,
        totalDeltaCny: 883.2,
        dominantDriver: 'fx',
      }}
    />,
  )

  assert.match(markup, /今日利润/)
  assert.match(markup, /¥793/)
  assert.match(markup, /利润率/)
  assert.match(markup, /15\.86%/)
  assert.match(markup, /较昨日/)
  assert.match(markup, /\+¥883/)
})

test('ProfitSummary shows dominant driver text, styling, and compact action\/risk copy', () => {
  const helpingMarkup = renderToStaticMarkup(
    <ProfitSummary
      todayResult={todayResult}
      yesterdayResult={yesterdayResult}
      attribution={{
        fxDeltaCny: 1030,
        dutiesDeltaCny: -102,
        freightDeltaCny: -44.8,
        totalDeltaCny: 883.2,
        dominantDriver: 'fx',
      }}
    />,
  )

  assert.match(helpingMarkup, /主导因子/)
  assert.match(helpingMarkup, /FX/)
  assert.match(helpingMarkup, /Helping/)
  assert.match(helpingMarkup, /动作：保留美元报价节奏/)
  assert.match(helpingMarkup, /风险：汇率回吐会直接压缩利润/)
  assert.match(helpingMarkup, /var\(--green\)/)

  const hurtingMarkup = renderToStaticMarkup(
    <ProfitSummary
      todayResult={todayResult}
      yesterdayResult={yesterdayResult}
      attribution={{
        fxDeltaCny: 120,
        dutiesDeltaCny: -380,
        freightDeltaCny: -44.8,
        totalDeltaCny: -304.8,
        dominantDriver: 'tariff',
      }}
    />,
  )

  assert.match(hurtingMarkup, /Tariff/)
  assert.match(hurtingMarkup, /Hurting/)
  assert.match(hurtingMarkup, /动作：马上复核税负与退税口径/)
  assert.match(hurtingMarkup, /风险：税负继续抬升会吞掉新增订单/)
  assert.match(hurtingMarkup, /var\(--red\)/)
})
