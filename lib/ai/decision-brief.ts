import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

export type DecisionBriefTone = 'positive' | 'negative' | 'neutral'

export type DecisionBriefDriverItem = {
  label: string
  impactCny: number
  tone: DecisionBriefTone
}

export interface DecisionBriefInput {
  statusLabel: string
  summary: string
  executiveSummary: string
  dominantDriverLabel: string
  actionLabel: string
  warnings: string[]
  driverBreakdown: DecisionBriefDriverItem[]
  todayProfit: number
  todayMargin: number
  profitDeltaCny: number
  profitDeltaPct: number
  aedRate: number | null
  aedChangePct: number | null
  baselineFreight: number | null
  policyCount: number
  tariffStatus: string
}

export interface DecisionBriefResult {
  analysis: string
  generatedAt: string
  model: string
}

export class DecisionBriefValidationError extends Error {}

export class DecisionBriefConfigurationError extends Error {}

export class DecisionBriefUpstreamError extends Error {}

type GenerateDecisionBriefDeps = {
  fetcher?: typeof fetch
  now?: () => Date
  curlInvoker?: (input: { url: string; body: string }) => Promise<string>
}

const DEFAULT_GEMINI_MODEL = 'gemini-3-pro-preview'
const VALID_DRIVER_TONES: DecisionBriefTone[] = ['positive', 'negative', 'neutral']
const execFileAsync = promisify(execFile)

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) {
    return '暂无'
  }

  return value.toFixed(digits)
}

function formatSigned(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) {
    return '暂无'
  }

  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`
}

function resolveGeminiApiKey() {
  const key = process.env.GEMINI_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()

  if (!key) {
    throw new DecisionBriefConfigurationError('Missing Gemini API key. Set GEMINI_KEY or GEMINI_API_KEY.')
  }

  return key
}

export function validateDecisionBriefInput(input: DecisionBriefInput) {
  const requiredStringFields: Array<keyof DecisionBriefInput> = [
    'statusLabel',
    'summary',
    'executiveSummary',
    'dominantDriverLabel',
    'actionLabel',
    'tariffStatus',
  ]

  const missing = requiredStringFields.filter((field) => {
    const value = input[field]
    return typeof value !== 'string' || value.trim().length === 0
  })

  if (missing.length > 0) {
    throw new DecisionBriefValidationError(`Missing required decision brief fields: ${missing.join(', ')}`)
  }

  if (!Array.isArray(input.warnings)) {
    throw new DecisionBriefValidationError('Decision brief warnings must be an array.')
  }

  if (!Array.isArray(input.driverBreakdown) || input.driverBreakdown.length === 0) {
    throw new DecisionBriefValidationError('Decision brief driverBreakdown must contain at least one item.')
  }

  input.driverBreakdown.forEach((item, index) => {
    if (typeof item.label !== 'string' || item.label.trim().length === 0) {
      throw new DecisionBriefValidationError(`Invalid driverBreakdown[${index}].label`)
    }

    if (typeof item.impactCny !== 'number' || !Number.isFinite(item.impactCny)) {
      throw new DecisionBriefValidationError(`Invalid driverBreakdown[${index}].impactCny`)
    }

    if (!VALID_DRIVER_TONES.includes(item.tone)) {
      throw new DecisionBriefValidationError(`Invalid driverBreakdown[${index}].tone`)
    }
  })
}

export function buildDecisionBriefPrompt(input: DecisionBriefInput) {
  validateDecisionBriefInput(input)

  const warningsText = input.warnings.length > 0 ? input.warnings.join('；') : '暂无额外风险提示'
  const driverText = input.driverBreakdown
    .map((item) => `${item.label} ${item.impactCny > 0 ? '+' : ''}${item.impactCny} 元`)
    .join('；')

  return [
    '你是外贸经营分析助手。你只负责解释，不负责改写系统结论。',
    '请基于以下结构化信息，输出 2 到 4 句中文经营解读。',
    '要求：',
    '1. 不新增页面里没有的数据。',
    '2. 不改写或推翻既有状态和建议动作。',
    '3. 语气偏经营判断，不写技术实现，不分点。',
    '4. 如果依据有限，要明确说明“当前依据有限”。',
    '',
    `状态：${input.statusLabel}`,
    `摘要：${input.summary}`,
    `经营摘要：${input.executiveSummary}`,
    `主驱动：${input.dominantDriverLabel}`,
    `建议动作：${input.actionLabel}`,
    `风险提示：${warningsText}`,
    `驱动拆解：${driverText}`,
    `当前利润：${formatNumber(input.todayProfit)} 元`,
    `当前利润率：${formatNumber(input.todayMargin)}%`,
    `较昨日利润变化：${formatSigned(input.profitDeltaCny)} 元`,
    `较昨日利润率变化：${formatSigned(input.profitDeltaPct)}%`,
    `AED 汇率：${formatNumber(input.aedRate, 4)}`,
    `AED 日变动：${formatSigned(input.aedChangePct)}%`,
    `默认运费：${formatNumber(input.baselineFreight)} 元`,
    `政策数量：${input.policyCount}`,
    `关税状态：${input.tariffStatus}`,
  ].join('\n')
}

function extractAnalysisFromGeminiPayload(payload: unknown) {
  const blockedReason = (payload as { promptFeedback?: { blockReason?: string } })?.promptFeedback?.blockReason
  if (blockedReason) {
    throw new DecisionBriefUpstreamError(`Gemini blocked the decision brief: ${blockedReason}`)
  }

  const providerErrorMessage = (payload as { error?: { message?: string } })?.error?.message
  if (providerErrorMessage) {
    throw new DecisionBriefUpstreamError(providerErrorMessage)
  }

  const text = (payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string
        }>
      }
    }>
  })?.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text?.trim()

  if (!text) {
    throw new DecisionBriefUpstreamError('Gemini returned no candidate text for the decision brief.')
  }

  return text
}

async function invokeGeminiWithCurl(input: {
  url: string
  body: string
  curlInvoker?: (input: { url: string; body: string }) => Promise<string>
}) {
  if (input.curlInvoker) {
    return input.curlInvoker({ url: input.url, body: input.body })
  }

  const { stdout } = await execFileAsync('curl', [
    '-sS',
    '-X',
    'POST',
    input.url,
    '-H',
    'Content-Type: application/json',
    '--data',
    input.body,
  ])

  return stdout
}

export async function generateDecisionBrief(
  input: DecisionBriefInput,
  deps: GenerateDecisionBriefDeps = {},
): Promise<DecisionBriefResult> {
  validateDecisionBriefInput(input)

  const apiKey = resolveGeminiApiKey()
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL
  const fetcher = deps.fetcher ?? fetch
  const now = deps.now ?? (() => new Date())
  const prompt = buildDecisionBriefPrompt(input)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const requestBody = JSON.stringify({
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  })

  let response: Response
  try {
    response = await fetcher(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    })
  } catch (error) {
    const curlRaw = await invokeGeminiWithCurl({
      url,
      body: requestBody,
      curlInvoker: deps.curlInvoker,
    })

    let curlPayload: unknown = {}
    if (curlRaw.trim()) {
      curlPayload = JSON.parse(curlRaw) as unknown
    }

    return {
      analysis: extractAnalysisFromGeminiPayload(curlPayload),
      generatedAt: now().toISOString(),
      model,
    }
  }

  const rawBody = await response.text()
  let payload: unknown = {}

  if (rawBody.trim()) {
    try {
      payload = JSON.parse(rawBody) as unknown
    } catch {
      if (!response.ok) {
        throw new DecisionBriefUpstreamError(
          `Gemini request failed with status ${response.status} and a non-JSON response body.`,
        )
      }

      throw new DecisionBriefUpstreamError('Gemini returned a non-JSON success payload.')
    }
  }

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } })?.error?.message || `Gemini request failed with status ${response.status}`
    throw new DecisionBriefUpstreamError(message)
  }

  return {
    analysis: extractAnalysisFromGeminiPayload(payload),
    generatedAt: now().toISOString(),
    model,
  }
}
