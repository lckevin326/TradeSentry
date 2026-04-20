import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import HomeSummaryCard from './HomeSummaryCard'
import { createIdleAiBriefState } from './ProfitDecisionAiBrief'

test('HomeSummaryCard renders conclusion, signals, and focus in ready state', () => {
  const markup = renderToStaticMarkup(
    <HomeSummaryCard
      summary={{
        state: 'ready',
        conclusion: '今日整体出口环境偏中性。',
        keySignals: ['汇率：AED 1.9800，日变动 -0.12%。', '运费：当前默认运费 ¥1680。', '政策：2 条相关政策，关税状态为有税率变化。'],
        focus: '近期存在政策变动，需要确认税费口径是否已反映到测算中。',
      }}
    />,
  )

  assert.match(markup, /今日出口环境摘要/)
  assert.match(markup, /今日整体出口环境偏中性/)
  assert.match(markup, /三条关键信号/)
  assert.match(markup, /当日关注项/)
  assert.match(markup, /汇率：AED 1.9800/)
  assert.match(markup, /近期存在政策变动/)
})

test('HomeSummaryCard renders AI brief action state', () => {
  const markup = renderToStaticMarkup(
    <HomeSummaryCard
      summary={{
        state: 'ready',
        conclusion: '今日整体出口环境偏中性。',
        keySignals: ['汇率：AED 1.9800，日变动 -0.12%。', '运费：当前默认运费 ¥1680。', '政策：2 条相关政策，关税状态为有税率变化。'],
        focus: '近期存在政策变动，需要确认税费口径是否已反映到测算中。',
      }}
      aiBrief={createIdleAiBriefState()}
      onGenerateAiBrief={() => undefined}
      aiBriefDisabled={false}
    />,
  )

  assert.match(markup, /AI解读/)
  assert.match(markup, /生成 AI 解读/)
  assert.doesNotMatch(markup, /disabled/)
})

test('HomeSummaryCard renders waiting state without fake signals', () => {
  const markup = renderToStaticMarkup(
    <HomeSummaryCard
      summary={{
        state: 'pending',
        conclusion: '等待测算',
        keySignals: [],
        focus: '先完成一笔报价测算，再看综合结论。',
      }}
      aiBrief={createIdleAiBriefState()}
      aiBriefDisabled
      onGenerateAiBrief={() => undefined}
    />,
  )

  assert.match(markup, /等待测算/)
  assert.match(markup, /先完成一笔报价测算，再看综合结论/)
  assert.match(markup, /完成测算后可生成 AI 解读/)
  assert.doesNotMatch(markup, /三条关键信号/)
  assert.doesNotMatch(markup, /当日关注项/)
})
