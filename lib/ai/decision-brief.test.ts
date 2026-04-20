import { strict as assert } from 'node:assert'
import { afterEach, test } from 'node:test'

import {
  buildDecisionBriefPrompt,
  generateDecisionBrief,
  type DecisionBriefInput,
} from './decision-brief'

const ORIGINAL_ENV = {
  GEMINI_KEY: process.env.GEMINI_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
}

function createInput(overrides: Partial<DecisionBriefInput> = {}): DecisionBriefInput {
  return {
    statusLabel: '关注',
    summary: '当前利润环境关注，较昨日利润收缩 120 元，主因来自汇率变化。',
    executiveSummary: '利润处于关注区间，较昨日减少 120 元，主要受汇率拖累，先做人工复核。',
    dominantDriverLabel: '汇率',
    actionLabel: '人工复核',
    warnings: ['近期存在政策变动，需要确认税费口径是否已反映到测算中。'],
    driverBreakdown: [
      { label: '汇率', impactCny: -80, tone: 'negative' },
      { label: '税费', impactCny: -20, tone: 'negative' },
      { label: '运费', impactCny: -20, tone: 'negative' },
    ],
    todayProfit: 880,
    todayMargin: 8.8,
    profitDeltaCny: -120,
    profitDeltaPct: -12,
    aedRate: 1.96,
    aedChangePct: 0.35,
    baselineFreight: 4200,
    policyCount: 1,
    tariffStatus: '政策观察中',
    ...overrides,
  }
}

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value == null) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

afterEach(() => {
  restoreEnv()
})

test('generateDecisionBrief throws a clear error when no Gemini key is configured', async () => {
  delete process.env.GEMINI_KEY
  delete process.env.GEMINI_API_KEY

  await assert.rejects(
    () => generateDecisionBrief(createInput(), { fetcher: async () => new Response('{}') }),
    /Missing Gemini API key/,
  )
})

test('generateDecisionBrief rejects incomplete structured input', async () => {
  process.env.GEMINI_KEY = 'test-key'

  await assert.rejects(
    () =>
      generateDecisionBrief(createInput({ summary: '   ' }), {
        fetcher: async () => new Response('{}'),
      }),
    /Missing required decision brief fields: summary/,
  )
})

test('generateDecisionBrief rejects malformed driver breakdown items', async () => {
  process.env.GEMINI_KEY = 'test-key'

  await assert.rejects(
    () =>
      generateDecisionBrief(
        createInput({
          driverBreakdown: [{ label: '', impactCny: Number.NaN, tone: 'negative' }],
        }),
        {
          fetcher: async () => new Response('{}'),
        },
      ),
    /Invalid driverBreakdown\[0\]\.label/,
  )
})

test('generateDecisionBrief returns analysis generatedAt and model on success', async () => {
  process.env.GEMINI_KEY = 'primary-key'
  process.env.GEMINI_API_KEY = 'fallback-key'
  process.env.GEMINI_MODEL = 'gemini-custom'

  let capturedRequest: RequestInit | undefined
  let capturedUrl: string | undefined

  const result = await generateDecisionBrief(createInput(), {
    fetcher: async (input: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(input)
      capturedRequest = init

      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '汇率走弱正在压缩利润，先人工复核，再决定是否调整报价。' }],
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      )
    },
  })

  assert.equal(result.analysis, '汇率走弱正在压缩利润，先人工复核，再决定是否调整报价。')
  assert.equal(result.model, 'gemini-custom')
  assert.match(result.generatedAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.match(capturedUrl ?? '', /models\/gemini-custom:generateContent\?key=primary-key$/)
  assert.equal(capturedRequest?.method, 'POST')
})

test('buildDecisionBriefPrompt only depends on structured fields', () => {
  const extendedInput: DecisionBriefInput & {
    pageTitle: string
    domText: string
  } = {
    ...createInput(),
    pageTitle: '利润决策页',
    domText: '整页文本不应该进入 prompt',
  }

  const prompt = buildDecisionBriefPrompt(extendedInput)

  assert.match(prompt, /状态：关注/)
  assert.match(prompt, /主驱动：汇率/)
  assert.match(prompt, /风险提示：近期存在政策变动/)
  assert.doesNotMatch(prompt, /利润决策页/)
  assert.doesNotMatch(prompt, /整页文本不应该进入 prompt/)
})

test('generateDecisionBrief falls back to GEMINI_API_KEY when GEMINI_KEY is absent', async () => {
  delete process.env.GEMINI_KEY
  process.env.GEMINI_API_KEY = 'fallback-only-key'

  let capturedUrl = ''

  await generateDecisionBrief(createInput(), {
    fetcher: async (input: string | URL | Request) => {
      capturedUrl = String(input)

      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '当前依据有限，但利润已在收缩。' }],
              },
            },
          ],
        }),
      )
    },
  })

  assert.match(capturedUrl, /key=fallback-only-key$/)
})

test('generateDecisionBrief uses an official Gemini 3 model by default', async () => {
  process.env.GEMINI_KEY = 'test-key'
  delete process.env.GEMINI_MODEL

  let capturedUrl = ''

  await generateDecisionBrief(createInput(), {
    fetcher: async (input: string | URL | Request) => {
      capturedUrl = String(input)
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'OK' }] } }],
        }),
      )
    },
  })

  assert.match(capturedUrl, /models\/gemini-3-pro-preview:generateContent/)
})

test('generateDecisionBrief preserves non-json upstream failures as useful errors', async () => {
  process.env.GEMINI_KEY = 'test-key'

  await assert.rejects(
    () =>
      generateDecisionBrief(createInput(), {
        fetcher: async () =>
          new Response('<html>bad gateway</html>', {
            status: 502,
            headers: {
              'content-type': 'text/html',
            },
          }),
      }),
    /Gemini request failed with status 502 and a non-JSON response body/,
  )
})

test('generateDecisionBrief surfaces Gemini block reasons when no candidate text is returned', async () => {
  process.env.GEMINI_KEY = 'test-key'

  await assert.rejects(
    () =>
      generateDecisionBrief(createInput(), {
        fetcher: async () =>
          new Response(
            JSON.stringify({
              promptFeedback: {
                blockReason: 'SAFETY',
              },
            }),
          ),
      }),
    /Gemini blocked the decision brief: SAFETY/,
  )
})

test('generateDecisionBrief falls back to curl when fetch cannot reach Gemini', async () => {
  process.env.GEMINI_KEY = 'test-key'
  delete process.env.GEMINI_MODEL

  const result = await generateDecisionBrief(createInput(), {
    fetcher: async () => {
      throw new TypeError('fetch failed')
    },
    curlInvoker: async ({ url, body }) => {
      assert.match(url, /models\/gemini-3-pro-preview:generateContent/)
      assert.match(body, /当前利润环境关注/)
      return JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: '通过 curl 回退成功生成了解读。' }],
            },
          },
        ],
      })
    },
  })

  assert.equal(result.analysis, '通过 curl 回退成功生成了解读。')
  assert.equal(result.model, 'gemini-3-pro-preview')
})
