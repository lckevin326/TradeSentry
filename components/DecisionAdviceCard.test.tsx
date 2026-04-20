import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import type { DecisionAdvice } from '../lib/profit'

import DecisionAdviceCard from './DecisionAdviceCard'
import { createIdleAiBriefState } from './ProfitDecisionAiBrief'

const decisionAdvice: DecisionAdvice = {
  status: 'watch',
  statusLabel: '关注',
  summary: '当前利润环境关注，较昨日利润改善 320 元，主因来自运费变化。',
  executiveSummary: '利润处于关注区间，较昨日增加 320 元，主要受运费带动，先复核运费口径。',
  driverBreakdown: [
    { label: '汇率', impactCny: 120, tone: 'positive' },
    { label: '税费', impactCny: -40, tone: 'negative' },
    { label: '运费', impactCny: 320, tone: 'positive' },
  ],
  profitDeltaCny: 320,
  profitDeltaPct: 18.5,
  dominantDriver: 'freight',
  dominantDriverLabel: '运费',
  action: 'review_freight',
  actionLabel: '复核运费',
  warnings: [
    '当前仍在使用基线运费，未手工覆盖前不要直接下判断。',
    '近期存在政策变动，需要确认税费口径是否已反映到测算中。',
  ],
  explanation: ['当前利润率为 9.4% ，对应状态为“关注”。'],
  aiSummary: null,
}

test('DecisionAdviceCard renders status, summary, driver, action, and warnings', () => {
  const markup = renderToStaticMarkup(
    <DecisionAdviceCard
      advice={decisionAdvice}
      aiBrief={{
        status: 'ready',
        brief: {
          analysis: '汇率和运费都在压缩利润，建议先复核运费口径。',
          generatedAt: '2026-04-19T10:00:00.000Z',
          model: 'gemini-3.1-pro',
        },
        error: null,
      }}
    />,
  )

  assert.match(markup, /决策建议/)
  assert.match(markup, /关注/)
  assert.match(markup, /当前利润环境关注，较昨日利润改善 320 元，主因来自运费变化。/)
  assert.match(markup, /利润处于关注区间，较昨日增加 320 元，主要受运费带动，先复核运费口径。/)
  assert.match(markup, /主驱动/)
  assert.match(markup, /运费/)
  assert.match(markup, /建议动作/)
  assert.match(markup, /复核运费/)
  assert.match(markup, /驱动拆解/)
  assert.match(markup, /汇率/)
  assert.match(markup, /320/)
  assert.match(markup, /风险提醒/)
  assert.match(markup, /当前仍在使用基线运费，未手工覆盖前不要直接下判断。/)
  assert.match(markup, /近期存在政策变动，需要确认税费口径是否已反映到测算中。/)
  assert.match(markup, /AI解读/)
  assert.match(markup, /汇率和运费都在压缩利润，建议先复核运费口径。/)
})

test('DecisionAdviceCard never renders aiSummary even when it is present', () => {
  const markup = renderToStaticMarkup(
    <DecisionAdviceCard
      advice={{
        ...decisionAdvice,
        aiSummary: '这是 AI 总结，不应该出现在卡片里。',
      }}
    />,
  )

  assert.doesNotMatch(markup, /这是 AI 总结，不应该出现在卡片里。/)
  assert.match(markup, /当前利润环境关注，较昨日利润改善 320 元，主因来自运费变化。/)
})

test('DecisionAdviceCard renders a clear placeholder without fake advice when advice is null', () => {
  const markup = renderToStaticMarkup(<DecisionAdviceCard advice={null} aiBrief={createIdleAiBriefState()} />)

  assert.match(markup, /决策建议/)
  assert.match(markup, /完成测算后生成建议/)
  assert.match(markup, /完成测算后可生成 AI 解读/)
  assert.doesNotMatch(markup, /主驱动/)
  assert.doesNotMatch(markup, /建议动作/)
  assert.doesNotMatch(markup, /驱动拆解/)
  assert.doesNotMatch(markup, /风险提醒/)
  assert.doesNotMatch(markup, /健康|关注|承压/)
  assert.doesNotMatch(markup, /利润处于关注区间/)
})
