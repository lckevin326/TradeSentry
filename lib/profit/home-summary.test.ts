import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import type { DecisionAdvice } from './advice'
import { deriveHomeSummary } from './home-summary'

function createDecisionAdvice(): DecisionAdvice {
  return {
    status: 'healthy',
    statusLabel: '健康',
    summary: '当前利润环境健康，较昨日利润改善 883.2 元，主因来自汇率变化，改善明显。',
    executiveSummary: '利润处于健康区间，较昨日增加 883.2 元，主要受汇率带动，维持当前报价。',
    driverBreakdown: [
      { label: '汇率', impactCny: 1030, tone: 'positive' },
      { label: '税费', impactCny: -102, tone: 'negative' },
      { label: '运费', impactCny: -44.8, tone: 'negative' },
    ],
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
}

test('deriveHomeSummary builds conclusion, three signals, and focus from existing advice and page context', () => {
  const summary = deriveHomeSummary({
    decisionAdvice: createDecisionAdvice(),
    aedRate: {
      rate: 1.98,
      change_pct: -0.12,
      date: '2026-04-18',
    },
    baselineFreight: 1680,
    tariffStatus: {
      dateLabel: '2026/4/18',
      statusLabel: '有税率变化',
    },
    recentPoliciesCount: 2,
  })

  assert.equal(summary.state, 'ready')
  assert.equal(summary.conclusion, '利润处于健康区间，较昨日增加 883.2 元，主要受汇率带动，维持当前报价。')
  assert.deepEqual(summary.keySignals, [
    '汇率：AED 1.9800，日变动 -0.12%。',
    '运费：当前默认运费 ¥1680。',
    '政策：2 条相关政策，关税状态为有税率变化。',
  ])
  assert.equal(summary.focus, '近期存在政策变动，需要确认税费口径是否已反映到测算中。')
})

test('deriveHomeSummary returns waiting state when decision advice is absent', () => {
  const summary = deriveHomeSummary({
    decisionAdvice: null,
    aedRate: {
      rate: 1.98,
      change_pct: -0.12,
      date: '2026-04-18',
    },
    baselineFreight: 1680,
    tariffStatus: {
      dateLabel: '2026/4/18',
      statusLabel: '有税率变化',
    },
    recentPoliciesCount: 2,
  })

  assert.equal(summary.state, 'pending')
  assert.equal(summary.conclusion, '等待测算')
  assert.deepEqual(summary.keySignals, [])
  assert.equal(summary.focus, '先完成一笔报价测算，再看综合结论。')
})
