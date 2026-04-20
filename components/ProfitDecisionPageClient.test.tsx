import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import type { ProfitCalculationResponse } from './ProfitCalculator'
import ProfitDecisionPageClient from './ProfitDecisionPageClient'
import {
  buildDecisionBriefInput,
  deriveLiveDecisionState,
  requestDecisionAiBrief,
  runDecisionAiBriefFlow,
} from './ProfitDecisionPageClient'
import { createReadyAiBriefState } from './ProfitDecisionAiBrief'

function createCalculation(): ProfitCalculationResponse {
  return {
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
}

function createClientProps() {
  const calculation = createCalculation()
  const { decisionAdvice, homeSummary } = deriveLiveDecisionState({
    calculation,
    policyCount: 2,
    aedRate: {
      rate: 1.98,
      change_pct: -0.12,
      date: '2026-04-18',
    },
    baselineFreight: 1680,
    tariffStatus: {
      dateLabel: '2026-04-18',
      statusLabel: '有税率变化',
    },
  })

  return {
    baselineFreight: 1680,
    aedRate: {
      rate: 1.98,
      change_pct: -0.12,
      date: '2026-04-18',
    },
    fxChartData: [{ date: '2026-04-18', rate: 1.98, change_pct: -0.12 }],
    freightChartData: [{ date: '2026-04-18', baselineFreight: 1680 }],
    tariffStatus: {
      dateLabel: '2026-04-18',
      statusLabel: '有税率变化',
    },
    recentPolicies: [{ id: 'p1', title: '政策更新', published_at: '2026-04-18' }],
    initialCalculation: calculation,
    decisionAdvice,
    homeSummary,
  }
}

test('deriveLiveDecisionState keeps home summary and decision advice in sync after recalculation', () => {
  const result = deriveLiveDecisionState({
    calculation: createCalculation(),
    policyCount: 2,
    aedRate: {
      rate: 1.98,
      change_pct: -0.12,
      date: '2026-04-18',
    },
    baselineFreight: 1680,
    tariffStatus: {
      dateLabel: '2026-04-18',
      statusLabel: '有税率变化',
    },
  })

  assert.ok(result.decisionAdvice)
  assert.equal(result.homeSummary.state, 'ready')
  assert.equal(result.homeSummary.conclusion, result.decisionAdvice.executiveSummary ?? result.decisionAdvice.summary)
  assert.equal(result.homeSummary.focus, result.decisionAdvice.warnings[0])
  assert.deepEqual(result.homeSummary.keySignals, [
    '汇率：AED 1.9800，日变动 -0.12%。',
    '运费：当前默认运费 ¥1680。',
    '政策：2 条相关政策，关税状态为有税率变化。',
  ])
})

test('deriveLiveDecisionState falls back to pending home summary when recalculation is incomplete', () => {
  const result = deriveLiveDecisionState({
    calculation: {
      input: createCalculation().input,
      todayResult: null,
      yesterdayResult: null,
      attribution: null,
      selectedMarketValues: createCalculation().selectedMarketValues,
    },
    policyCount: 1,
    aedRate: null,
    baselineFreight: 0,
    tariffStatus: {
      dateLabel: '暂无',
      statusLabel: '暂无更新',
    },
  })

  assert.equal(result.decisionAdvice, null)
  assert.deepEqual(result.homeSummary, {
    state: 'pending',
    conclusion: '等待测算',
    keySignals: [],
    focus: '先完成一笔报价测算，再看综合结论。',
  })
})

test('buildDecisionBriefInput returns structured payload when decision context is complete', () => {
  const { decisionAdvice } = deriveLiveDecisionState({
    calculation: createCalculation(),
    policyCount: 2,
    aedRate: {
      rate: 1.98,
      change_pct: -0.12,
      date: '2026-04-18',
    },
    baselineFreight: 1680,
    tariffStatus: {
      dateLabel: '2026-04-18',
      statusLabel: '有税率变化',
    },
  })

  const payload = buildDecisionBriefInput({
    calculation: createCalculation(),
    decisionAdvice,
    aedRate: {
      rate: 1.98,
      change_pct: -0.12,
      date: '2026-04-18',
    },
    baselineFreight: 1680,
    tariffStatus: {
      dateLabel: '2026-04-18',
      statusLabel: '有税率变化',
    },
    policyCount: 2,
  })

  assert.ok(payload)
  assert.equal(payload.statusLabel, '健康')
  assert.equal(payload.dominantDriverLabel, '汇率')
  assert.equal(payload.baselineFreight, 1680)
  assert.equal(payload.policyCount, 2)
})

test('buildDecisionBriefInput returns null when calculation context is incomplete', () => {
  const payload = buildDecisionBriefInput({
    calculation: null,
    decisionAdvice: null,
    aedRate: null,
    baselineFreight: 0,
    tariffStatus: {
      dateLabel: '暂无',
      statusLabel: '暂无更新',
    },
    policyCount: 0,
  })

  assert.equal(payload, null)
})

test('requestDecisionAiBrief posts structured payload to decision brief api', async () => {
  const requests: Array<{
    input: string | URL | Request
    init?: RequestInit
  }> = []

  const payload = buildDecisionBriefInput({
    calculation: createCalculation(),
    decisionAdvice: deriveLiveDecisionState({
      calculation: createCalculation(),
      policyCount: 2,
      aedRate: {
        rate: 1.98,
        change_pct: -0.12,
        date: '2026-04-18',
      },
      baselineFreight: 1680,
      tariffStatus: {
        dateLabel: '2026-04-18',
        statusLabel: '有税率变化',
      },
    }).decisionAdvice,
    aedRate: {
      rate: 1.98,
      change_pct: -0.12,
      date: '2026-04-18',
    },
    baselineFreight: 1680,
    tariffStatus: {
      dateLabel: '2026-04-18',
      statusLabel: '有税率变化',
    },
    policyCount: 2,
  })

  assert.ok(payload)

  const result = await requestDecisionAiBrief(payload, async (input, init) => {
    requests.push({ input, init })

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          analysis: '汇率拖累利润，建议先人工复核。',
          generatedAt: '2026-04-19T10:00:00.000Z',
          model: 'gemini-3.1-pro',
        },
      }),
    )
  })

  assert.equal(result.analysis, '汇率拖累利润，建议先人工复核。')
  assert.equal(requests[0]?.input, '/api/ai/decision-brief')
  assert.equal(requests[0]?.init?.method, 'POST')
})

test('runDecisionAiBriefFlow returns ready state after successful generation', async () => {
  const payload = buildDecisionBriefInput({
    calculation: createCalculation(),
    decisionAdvice: deriveLiveDecisionState({
      calculation: createCalculation(),
      policyCount: 2,
      aedRate: {
        rate: 1.98,
        change_pct: -0.12,
        date: '2026-04-18',
      },
      baselineFreight: 1680,
      tariffStatus: {
        dateLabel: '2026-04-18',
        statusLabel: '有税率变化',
      },
    }).decisionAdvice,
    aedRate: {
      rate: 1.98,
      change_pct: -0.12,
      date: '2026-04-18',
    },
    baselineFreight: 1680,
    tariffStatus: {
      dateLabel: '2026-04-18',
      statusLabel: '有税率变化',
    },
    policyCount: 2,
  })

  assert.ok(payload)

  const nextState = await runDecisionAiBriefFlow(payload, createReadyAiBriefState({
    analysis: '旧解读',
    generatedAt: '2026-04-18T10:00:00.000Z',
    model: 'gemini-3.1-pro',
  }), async () => ({
    analysis: '新解读',
    generatedAt: '2026-04-19T10:00:00.000Z',
    model: 'gemini-3.1-pro',
  }))

  assert.equal(nextState.status, 'ready')
  assert.equal(nextState.brief?.analysis, '新解读')
})

test('runDecisionAiBriefFlow keeps previous brief when generation fails', async () => {
  const payload = buildDecisionBriefInput({
    calculation: createCalculation(),
    decisionAdvice: deriveLiveDecisionState({
      calculation: createCalculation(),
      policyCount: 2,
      aedRate: {
        rate: 1.98,
        change_pct: -0.12,
        date: '2026-04-18',
      },
      baselineFreight: 1680,
      tariffStatus: {
        dateLabel: '2026-04-18',
        statusLabel: '有税率变化',
      },
    }).decisionAdvice,
    aedRate: {
      rate: 1.98,
      change_pct: -0.12,
      date: '2026-04-18',
    },
    baselineFreight: 1680,
    tariffStatus: {
      dateLabel: '2026-04-18',
      statusLabel: '有税率变化',
    },
    policyCount: 2,
  })

  assert.ok(payload)

  const nextState = await runDecisionAiBriefFlow(payload, createReadyAiBriefState({
    analysis: '旧解读',
    generatedAt: '2026-04-18T10:00:00.000Z',
    model: 'gemini-3.1-pro',
  }), async () => {
    throw new Error('Gemini timeout')
  })

  assert.equal(nextState.status, 'error')
  assert.equal(nextState.brief?.analysis, '旧解读')
  assert.equal(nextState.error, 'Gemini timeout')
})

test('ProfitDecisionPageClient renders the same AI brief in home summary and decision advice when shared state is ready', () => {
  const markup = renderToStaticMarkup(
    <ProfitDecisionPageClient
      {...createClientProps()}
      initialAiBriefState={createReadyAiBriefState({
        analysis: '汇率和运费都在压缩利润，建议先人工复核。',
        generatedAt: '2026-04-19T10:00:00.000Z',
        model: 'gemini-3.1-pro',
      })}
    />,
  )

  const matches = markup.match(/汇率和运费都在压缩利润，建议先人工复核。/g) ?? []
  assert.equal(matches.length, 2)
})
