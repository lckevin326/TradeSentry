import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import {
  getProfitDecisionPageData,
  getPageDecisionAdvice,
  ProfitDecisionPageContent,
  type ProfitDecisionPageData,
} from './page'
import { buildDecisionAdviceMarketSnapshot } from '../lib/profit/decision-advice'

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
    decisionAdvice: null,
    homeSummary: {
      state: 'pending',
      conclusion: '等待测算',
      keySignals: [],
      focus: '先完成一笔报价测算，再看综合结论。',
    },
    marketsData: null,
  }
}

test('homepage renders calculator and trend context', () => {
  const markup = renderToStaticMarkup(<ProfitDecisionPageContent data={createPageData()} />)

  assert.match(markup, /利润试算/)
  assert.match(markup, /今日出口环境摘要/)
  assert.match(markup, /等待测算/)
  assert.match(markup, /决策建议/)
  assert.match(markup, /完成测算后生成建议/)
  assert.match(markup, /中东航线默认运费/)
  assert.match(markup, /AED 近30日走势/)
  assert.match(markup, /预警中心/)
  assert.match(markup, /政策动态与时间轴/)
  assert.match(markup, /阿联酋轮胎标签规则更新/)
  assert.match(markup, /有税率变化/)
})

test('homepage renders server-provided decision advice without requiring client-side recalculation', () => {
  const data = createPageData()
  data.decisionAdvice = {
    status: 'watch',
    statusLabel: '关注',
    summary: '当前利润环境关注，较昨日利润收缩 120 元，主因来自运费变化。',
    profitDeltaCny: -120,
    profitDeltaPct: -6.2,
    dominantDriver: 'freight',
    dominantDriverLabel: '运费',
    action: 'review_freight',
    actionLabel: '复核运费',
    warnings: ['当前仍在使用基线运费，未手工覆盖前不要直接下判断。'],
    explanation: ['建议先复核运费口径，再决定是否调整报价。'],
    aiSummary: '这段 AI 文案不应该出现',
  }

  const markup = renderToStaticMarkup(<ProfitDecisionPageContent data={data} />)

  assert.match(markup, /决策建议/)
  assert.match(markup, /复核运费/)
  assert.doesNotMatch(markup, /这段 AI 文案不应该出现/)
})

test('homepage renders summary and attribution sections when calculation data is available', () => {
  const data = createPageData()
  data.initialCalculation = {
    input: {
      destinationCountry: 'UAE',
      hsCode: '401110',
      tradeTerm: 'FOB',
      quoteCurrency: 'USD',
      quotedAmount: 1000,
      quantity: 10,
      productCost: 4000,
      miscFees: 100,
      routeKey: 'shanghai-jebel-ali-20gp',
      containerType: '20GP',
      overrideFreight: null,
    },
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
  data.decisionAdvice = {
    status: 'healthy',
    statusLabel: '健康',
    summary: '当前利润环境健康，较昨日利润改善 883.2 元，主因来自汇率变化，改善明显。',
    profitDeltaCny: 883.2,
    profitDeltaPct: -981.33,
    dominantDriver: 'fx',
    dominantDriverLabel: '汇率',
    action: 'hold_quote',
    actionLabel: '维持报价',
    warnings: ['近期存在政策变动，需要确认税费口径是否已反映到测算中。'],
    explanation: ['当前利润率为 15.86% ，对应状态为“健康”。'],
    aiSummary: null,
  }

  const markup = renderToStaticMarkup(<ProfitDecisionPageContent data={data} />)

  assert.match(markup, /决策建议/)
  assert.match(markup, /维持报价/)
  assert.match(markup, /今日利润/)
  assert.match(markup, /归因拆解/)
  assert.match(markup, /主导因子/)
  assert.match(markup, /FX/)
})

test('homepage renders decision advice before profit calculator and trend section when advice is available', () => {
  const data = createPageData()
  data.initialCalculation = {
    input: {
      destinationCountry: 'UAE',
      hsCode: '401110',
      tradeTerm: 'FOB',
      quoteCurrency: 'USD',
      quotedAmount: 1000,
      quantity: 10,
      productCost: 4000,
      miscFees: 100,
      routeKey: 'shanghai-jebel-ali-20gp',
      containerType: '20GP',
      overrideFreight: null,
    },
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
  data.decisionAdvice = {
    status: 'healthy',
    statusLabel: '健康',
    summary: '当前利润环境健康，较昨日利润改善 883.2 元，主因来自汇率变化，改善明显。',
    profitDeltaCny: 883.2,
    profitDeltaPct: -981.33,
    dominantDriver: 'fx',
    dominantDriverLabel: '汇率',
    action: 'hold_quote',
    actionLabel: '维持报价',
    warnings: ['近期存在政策变动，需要确认税费口径是否已反映到测算中。'],
    explanation: ['当前利润率为 15.86% ，对应状态为“健康”。'],
    aiSummary: '这是 AI 总结，不应该出现在首页卡片里。',
  }

  const markup = renderToStaticMarkup(<ProfitDecisionPageContent data={data} />)
  const adviceIndex = markup.indexOf('决策建议')
  const calculatorIndex = markup.indexOf('利润试算')
  const fxTrendIndex = markup.indexOf('AED 近30日走势')

  assert.notEqual(adviceIndex, -1)
  assert.notEqual(calculatorIndex, -1)
  assert.notEqual(fxTrendIndex, -1)
  assert.ok(adviceIndex < fxTrendIndex)
  assert.ok(adviceIndex < calculatorIndex)
  assert.doesNotMatch(markup, /这是 AI 总结，不应该出现在首页卡片里。/)
})

test('homepage renders home summary between metrics and decision advice', () => {
  const data = createPageData()
  data.homeSummary = {
    state: 'ready',
    conclusion: '今日整体出口环境偏中性。',
    keySignals: ['汇率：AED 1.9800，日变动 -0.12%。', '运费：当前默认运费 ¥1680。', '政策：2 条相关政策，关税状态为有税率变化。'],
    focus: '近期存在政策变动，需要确认税费口径是否已反映到测算中。',
  }

  const markup = renderToStaticMarkup(<ProfitDecisionPageContent data={data} />)
  const summaryIndex = markup.indexOf('今日出口环境摘要')
  const adviceIndex = markup.indexOf('决策建议')
  const trendIndex = markup.indexOf('AED 近30日走势')

  assert.notEqual(summaryIndex, -1)
  assert.notEqual(adviceIndex, -1)
  assert.notEqual(trendIndex, -1)
  assert(summaryIndex < adviceIndex)
  assert(adviceIndex < trendIndex)
})

test('page data includes decision advice when calculation input is complete', () => {
  const seedData = createPageData()
  seedData.initialCalculation = {
    input: {
      destinationCountry: 'UAE',
      hsCode: '401110',
      tradeTerm: 'FOB',
      quoteCurrency: 'USD',
      quotedAmount: 1000,
      quantity: 10,
      productCost: 4000,
      miscFees: 100,
      routeKey: 'shanghai-jebel-ali-20gp',
      containerType: '20GP',
      overrideFreight: null,
    },
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

  const advice = getPageDecisionAdvice(seedData.initialCalculation, seedData.recentPolicies.length)

  assert.ok(advice)
  assert.equal(advice.status, 'healthy')
  assert.equal(advice.dominantDriver, 'fx')
  assert.equal(advice.action, 'hold_quote')
})

test('getProfitDecisionPageData includes decision advice when seed calculation input is complete', async () => {
  const seedData = createPageData()
  seedData.initialCalculation = {
    input: {
      destinationCountry: 'UAE',
      hsCode: '401110',
      tradeTerm: 'FOB',
      quoteCurrency: 'USD',
      quotedAmount: 1000,
      quantity: 10,
      productCost: 4000,
      miscFees: 100,
      routeKey: 'shanghai-jebel-ali-20gp',
      containerType: '20GP',
      overrideFreight: null,
    },
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

  const data = await getProfitDecisionPageData({ seedData })

  assert.ok(data.decisionAdvice)
  assert.equal(data.decisionAdvice.status, 'healthy')
  assert.equal(data.decisionAdvice.dominantDriver, 'fx')
  assert.equal(data.decisionAdvice.action, 'hold_quote')
  assert.equal(data.homeSummary.state, 'ready')
  assert.equal(data.homeSummary.conclusion, '利润处于健康区间，较昨日增加 883.2 元，主要受汇率带动，维持当前报价。')
  assert.deepEqual(data.homeSummary.keySignals, [
    '汇率：AED 1.9800，日变动 -0.12%。',
    '运费：当前默认运费 ¥1680。',
    '政策：2 条相关政策，关税状态为有税率变化。',
  ])
  assert.equal(data.homeSummary.focus, '近期存在政策变动，需要确认税费口径是否已反映到测算中。')
})

test('page data keeps decision advice null when calculation input is incomplete', () => {
  const data = createPageData()
  data.initialCalculation = {
    input: {
      destinationCountry: 'UAE',
      hsCode: '401110',
      tradeTerm: 'FOB',
      quoteCurrency: 'USD',
      quotedAmount: 1000,
      quantity: 10,
      productCost: 4000,
      miscFees: 100,
      routeKey: 'shanghai-jebel-ali-20gp',
      containerType: '20GP',
      overrideFreight: null,
    },
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
    yesterdayResult: null,
    comparison: null,
    attribution: null,
    selectedMarketValues: null,
  }

  const advice = getPageDecisionAdvice(data.initialCalculation, data.recentPolicies.length)

  assert.equal(advice, null)
})

test('buildDecisionAdviceMarketSnapshot keeps override freight from calculation input', () => {
  const snapshot = buildDecisionAdviceMarketSnapshot({
    input: {
      destinationCountry: 'UAE',
      hsCode: '401110',
      tradeTerm: 'FOB',
      quoteCurrency: 'USD',
      quotedAmount: 1000,
      quantity: 10,
      productCost: 4000,
      miscFees: 100,
      routeKey: 'shanghai-jebel-ali-20gp',
      containerType: '20GP',
      overrideFreight: 2120,
    },
    todayResult: {
      revenueCny: 5000,
      costCny: 4206.8,
      profitCny: 793.2,
      marginPct: 15.86,
      freightCny: 2120,
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
      fxDeltaCny: 0,
      dutiesDeltaCny: 0,
      freightDeltaCny: 2020,
      totalDeltaCny: 2020,
      dominantDriver: 'freight',
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
  })

  assert.deepEqual(snapshot, {
    fxRate: 5,
    tariffRatePct: 12,
    antiDumpingRatePct: 0,
    exportRebateRatePct: 13,
    baselineFreight: 140,
    overrideFreight: 2120,
  })
})

test('getPageDecisionAdvice uses calculation freight semantics instead of page baseline', () => {
  const advice = getPageDecisionAdvice(
    {
      input: {
        destinationCountry: 'UAE',
        hsCode: '401110',
        tradeTerm: 'FOB',
        quoteCurrency: 'USD',
        quotedAmount: 1000,
        quantity: 10,
        productCost: 4000,
        miscFees: 100,
        routeKey: 'shanghai-jebel-ali-20gp',
        containerType: '20GP',
        overrideFreight: 2120,
      },
      todayResult: {
        revenueCny: 5000,
        costCny: 4206.8,
        profitCny: 793.2,
        marginPct: 15.86,
        freightCny: 2120,
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
        fxDeltaCny: 0,
        dutiesDeltaCny: 0,
        freightDeltaCny: 2020,
        totalDeltaCny: 2020,
        dominantDriver: 'freight',
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
    },
    2,
  )

  assert.ok(advice)
  assert.equal(advice.action, 'review_freight')
  assert.equal(advice.warnings.includes('当前仍在使用基线运费，未手工覆盖前不要直接下判断。'), false)
})

test('homepage falls back to empty decision data when supabase env is missing', async () => {
  const data = await getProfitDecisionPageData({ supabaseConfigured: false })

  assert.equal(data.baselineFreight, 0)
  assert.equal(data.aedRate, null)
  assert.deepEqual(data.fxChartData, [])
  assert.deepEqual(data.freightChartData, [])
  assert.deepEqual(data.recentPolicies, [])
  assert.equal(data.tariffStatus.dateLabel, '未配置数据源')
  assert.equal(data.tariffStatus.statusLabel, 'Supabase 环境变量缺失')
  assert.equal(data.decisionAdvice, null)
  assert.deepEqual(data.homeSummary, {
    state: 'pending',
    conclusion: '等待测算',
    keySignals: [],
    focus: '先完成一笔报价测算，再看综合结论。',
  })
})
