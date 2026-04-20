import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import {
  DecisionBriefConfigurationError,
  DecisionBriefUpstreamError,
  DecisionBriefValidationError,
} from '../../../../lib/ai/decision-brief'
import { postDecisionBriefRequest } from './route'

function createRequest(body: unknown) {
  return new Request('http://localhost/api/ai/decision-brief', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

function createRawRequest(body: string) {
  return new Request('http://localhost/api/ai/decision-brief', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body,
  })
}

test('POST /api/ai/decision-brief returns structured result on success', async () => {
  const response = await postDecisionBriefRequest(
    createRequest({
      statusLabel: '关注',
      summary: '当前利润环境关注。',
      executiveSummary: '利润处于关注区间，先做人工复核。',
      dominantDriverLabel: '汇率',
      actionLabel: '人工复核',
      warnings: ['近期存在政策变动。'],
      driverBreakdown: [{ label: '汇率', impactCny: -80, tone: 'negative' }],
      todayProfit: 880,
      todayMargin: 8.8,
      profitDeltaCny: -120,
      profitDeltaPct: -12,
      aedRate: 1.96,
      aedChangePct: 0.35,
      baselineFreight: 4200,
      policyCount: 1,
      tariffStatus: '政策观察中',
    }),
    {
      generateBrief: async () => ({
        analysis: '汇率拖累利润，建议先人工复核。',
        generatedAt: '2026-04-19T10:00:00.000Z',
        model: 'gemini-3.1-pro',
      }),
    },
  )

  assert.equal(response.status, 200)
  const json = await response.json()
  assert.deepEqual(json, {
    ok: true,
    data: {
      analysis: '汇率拖累利润，建议先人工复核。',
      generatedAt: '2026-04-19T10:00:00.000Z',
      model: 'gemini-3.1-pro',
    },
  })
})

test('POST /api/ai/decision-brief returns 400 for invalid input', async () => {
  const response = await postDecisionBriefRequest(
    createRequest({
      summary: '',
    }),
    {
      generateBrief: async () => {
        throw new DecisionBriefValidationError('Missing required decision brief fields: summary')
      },
    },
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'Missing required decision brief fields: summary',
  })
})

test('POST /api/ai/decision-brief returns 400 for malformed json bodies', async () => {
  const response = await postDecisionBriefRequest(createRawRequest('{'))

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'Request body must be valid JSON',
  })
})

test('POST /api/ai/decision-brief returns 500 when Gemini key is not configured', async () => {
  const response = await postDecisionBriefRequest(createRequest({ summary: 'x' }), {
    generateBrief: async () => {
      throw new DecisionBriefConfigurationError('Missing Gemini API key. Set GEMINI_KEY or GEMINI_API_KEY.')
    },
  })

  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'Missing Gemini API key. Set GEMINI_KEY or GEMINI_API_KEY.',
  })
})

test('POST /api/ai/decision-brief returns 502 for upstream Gemini failures', async () => {
  const response = await postDecisionBriefRequest(createRequest({ summary: 'x' }), {
    generateBrief: async () => {
      throw new DecisionBriefUpstreamError('Gemini request failed with status 503')
    },
  })

  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'Gemini request failed with status 503',
  })
})

test('POST /api/ai/decision-brief returns 500 for unexpected internal errors', async () => {
  const response = await postDecisionBriefRequest(createRequest({ summary: 'x' }), {
    generateBrief: async () => {
      throw new Error('Unexpected local failure')
    },
  })

  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'Unexpected local failure',
  })
})
