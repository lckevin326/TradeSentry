import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import ProfitDecisionAiBrief, {
  createErrorAiBriefState,
  createIdleAiBriefState,
  createLoadingAiBriefState,
  createReadyAiBriefState,
} from './ProfitDecisionAiBrief'

test('ProfitDecisionAiBrief renders empty state and action button', () => {
  const markup = renderToStaticMarkup(
    <ProfitDecisionAiBrief state={createIdleAiBriefState()} onGenerate={() => undefined} disabled />
  )

  assert.match(markup, /AI解读/)
  assert.match(markup, /生成 AI 解读/)
  assert.match(markup, /可手动生成 AI 解读/)
  assert.match(markup, /disabled/)
})

test('ProfitDecisionAiBrief renders generated analysis', () => {
  const markup = renderToStaticMarkup(
    <ProfitDecisionAiBrief
      state={createReadyAiBriefState({
        analysis: '汇率拖累利润，建议先人工复核。',
        generatedAt: '2026-04-19T10:00:00.000Z',
        model: 'gemini-3.1-pro',
      })}
    />,
  )

  assert.match(markup, /汇率拖累利润，建议先人工复核/)
  assert.match(markup, /gemini-3.1-pro/)
  assert.match(markup, /2026-04-19T10:00:00.000Z/)
})

test('ProfitDecisionAiBrief state helpers preserve prior brief across loading and error', () => {
  const readyState = createReadyAiBriefState({
    analysis: '汇率拖累利润，建议先人工复核。',
    generatedAt: '2026-04-19T10:00:00.000Z',
    model: 'gemini-3.1-pro',
  })
  const loadingState = createLoadingAiBriefState(readyState)
  const errorState = createErrorAiBriefState(loadingState, 'Gemini timeout')

  assert.equal(loadingState.status, 'loading')
  assert.equal(loadingState.brief?.analysis, '汇率拖累利润，建议先人工复核。')
  assert.equal(errorState.status, 'error')
  assert.equal(errorState.brief?.analysis, '汇率拖累利润，建议先人工复核。')
  assert.equal(errorState.error, 'Gemini timeout')
})
