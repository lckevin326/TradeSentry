import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { ProfitDecisionPageContent, type ProfitDecisionPageData } from './page'

function createPageData(): ProfitDecisionPageData {
  return {
    baselineFreight: 1680,
    aedRate: {
      rate: 1.98,
      change_pct: -0.12,
      date: '2026-04-18',
    },
    fxChartData: [
      { date: '2026-04-16', rate: 2.01, change_pct: 0.1 },
      { date: '2026-04-17', rate: 2.0, change_pct: -0.05 },
      { date: '2026-04-18', rate: 1.98, change_pct: -0.12 },
    ],
    freightChartData: [
      { date: '2026-04-04', baselineFreight: 1520 },
      { date: '2026-04-11', baselineFreight: 1600 },
      { date: '2026-04-18', baselineFreight: 1680 },
    ],
    tariffStatus: {
      dateLabel: '2026/4/18',
      statusLabel: '有税率变化',
    },
    recentPolicies: [
      { id: 'p1', title: '阿联酋轮胎标签规则更新', published_at: '2026-04-18' },
      { id: 'p2', title: '商务部更新出口合规提醒', published_at: '2026-04-17' },
    ],
    initialCalculation: null,
  }
}

test('homepage renders calculator and trend context', () => {
  const markup = renderToStaticMarkup(<ProfitDecisionPageContent data={createPageData()} />)

  assert.match(markup, /利润试算/)
  assert.match(markup, /中东航线基准运费/)
  assert.match(markup, /AED 近30日走势/)
  assert.match(markup, /政策与税率观察/)
  assert.match(markup, /阿联酋轮胎标签规则更新/)
  assert.match(markup, /有税率变化/)
})

test('homepage renders summary and attribution sections when calculation data is available', () => {
  const data = createPageData()
  data.initialCalculation = {
    todayResult: {
      revenueCny: 5000,
      costCny: 4206.8,
      profitCny: 793.2,
      marginPct: 15.86,
      freightCny: 140,
      tariffCny: 616.8,
      antiDumpingCny: 0,
      rebateCny: 650,
    },
    yesterdayResult: {
      revenueCny: 4000,
      costCny: 4090,
      profitCny: -90,
      marginPct: -2.25,
      freightCny: 100,
      tariffCny: 410,
      antiDumpingCny: 0,
      rebateCny: 520,
    },
    attribution: {
      fxDeltaCny: 1030,
      dutiesDeltaCny: -102,
      freightDeltaCny: -44.8,
      totalDeltaCny: 883.2,
      dominantDriver: 'fx',
    },
    selectedMarketValues: {
      today: {
        fxRate: 5,
        fxSourceRate: 0.2,
        fxSourceDate: '2026-04-18',
        fxSourceKind: 'market_rate',
        tariffRatePct: 12,
        tariffSourceDate: '2026-04-18',
        tariffSourceFetchedAt: '2026-04-18T08:00:00.000Z',
        freightCny: 140,
        freightSourceDate: '2026-04-18',
        freightSourceFetchedAt: '2026-04-18T08:00:00.000Z',
        freightSourceUrl: 'https://example.com/freight/today',
        rebateRatePct: 13,
        rebateSource: 'fixture',
      },
      yesterday: {
        fxRate: 4,
        fxSourceRate: 0.25,
        fxSourceDate: '2026-04-17',
        fxSourceKind: 'market_rate',
        tariffRatePct: 10,
        tariffSourceDate: '2026-04-17',
        tariffSourceFetchedAt: '2026-04-17T08:00:00.000Z',
        freightCny: 100,
        freightSourceDate: '2026-04-17',
        freightSourceFetchedAt: '2026-04-17T08:00:00.000Z',
        freightSourceUrl: 'https://example.com/freight/yesterday',
        rebateRatePct: 13,
        rebateSource: 'fixture',
      },
    },
  }

  const markup = renderToStaticMarkup(<ProfitDecisionPageContent data={data} />)

  assert.match(markup, /今日利润/)
  assert.match(markup, /归因拆解/)
  assert.match(markup, /主导因子/)
  assert.match(markup, /FX/)
})
