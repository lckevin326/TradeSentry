import type { AttributionResult, MarketSnapshot, ProfitDriver, ProfitResult } from './index'

export type AdviceStatus = 'healthy' | 'watch' | 'pressure'
export type AdviceDriver = ProfitDriver | 'mixed'
export type AdviceAction = 'hold_quote' | 'raise_quote' | 'review_freight' | 'manual_check'

export interface DriverBreakdownItem {
  label: string
  impactCny: number
  tone: 'positive' | 'negative' | 'neutral'
}

export interface DecisionAdvice {
  status: AdviceStatus
  statusLabel: string
  summary: string
  executiveSummary?: string
  driverBreakdown?: DriverBreakdownItem[]
  profitDeltaCny: number
  profitDeltaPct: number
  dominantDriver: AdviceDriver
  dominantDriverLabel: string
  action: AdviceAction
  actionLabel: string
  warnings: string[]
  explanation: string[]
  aiSummary?: string | null
}

export interface DecisionAdviceInput {
  todayResult: ProfitResult
  yesterdayResult: ProfitResult
  attribution: AttributionResult
  marketSnapshot: MarketSnapshot
  recentPoliciesCount: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function buildStatus(todayMarginPct: number): AdviceStatus {
  if (todayMarginPct >= 15) {
    return 'healthy'
  }

  if (todayMarginPct >= 8) {
    return 'watch'
  }

  return 'pressure'
}

function deltaForDriver(attribution: AttributionResult, driver: ProfitDriver): number {
  switch (driver) {
    case 'fx':
      return attribution.fxDeltaCny
    case 'tariff':
      return attribution.dutiesDeltaCny
    case 'freight':
      return attribution.freightDeltaCny
  }
}

function mapDominantDriver(attribution: AttributionResult): AdviceDriver {
  const totalAbs =
    Math.abs(attribution.fxDeltaCny) + Math.abs(attribution.dutiesDeltaCny) + Math.abs(attribution.freightDeltaCny)

  if (totalAbs === 0) {
    return 'mixed'
  }

  const dominantDriver = attribution.dominantDriver
  const dominantValue = Math.abs(deltaForDriver(attribution, dominantDriver))

  return dominantValue >= totalAbs * 0.5 ? dominantDriver : 'mixed'
}

function buildAction(status: AdviceStatus, dominantDriver: AdviceDriver): AdviceAction {
  if (dominantDriver === 'freight') {
    return 'review_freight'
  }

  if (status === 'healthy' && dominantDriver === 'fx') {
    return 'hold_quote'
  }

  if (status === 'watch' && dominantDriver === 'fx') {
    return 'manual_check'
  }

  if (status === 'pressure' && dominantDriver === 'fx') {
    return 'raise_quote'
  }

  return 'manual_check'
}

function statusLabel(status: AdviceStatus): string {
  switch (status) {
    case 'healthy':
      return '健康'
    case 'watch':
      return '关注'
    case 'pressure':
      return '承压'
  }
}

function driverLabel(driver: AdviceDriver): string {
  switch (driver) {
    case 'fx':
      return '汇率'
    case 'freight':
      return '运费'
    case 'tariff':
      return '税费'
    case 'mixed':
      return '多因子'
  }
}

function actionLabel(action: AdviceAction): string {
  switch (action) {
    case 'hold_quote':
      return '维持报价'
    case 'raise_quote':
      return '上调报价'
    case 'review_freight':
      return '复核运费'
    case 'manual_check':
      return '人工复核'
  }
}

function executiveStatusLabel(status: AdviceStatus): string {
  switch (status) {
    case 'healthy':
      return '健康区间'
    case 'watch':
      return '关注区间'
    case 'pressure':
      return '承压区间'
  }
}

function actionSummary(action: AdviceAction): string {
  switch (action) {
    case 'hold_quote':
      return '维持当前报价。'
    case 'raise_quote':
      return '优先上调报价。'
    case 'review_freight':
      return '先复核运费口径。'
    case 'manual_check':
      return '先做人工复核。'
  }
}

function formatCny(value: number): string {
  return String(round2(value))
}

function buildDriverBreakdown(attribution: AttributionResult): DriverBreakdownItem[] {
  const drivers: ProfitDriver[] = ['fx', 'tariff', 'freight']

  return drivers.map((driver) => {
    const impactCny = round2(deltaForDriver(attribution, driver))

    return {
      label: driverLabel(driver),
      impactCny,
      tone: impactCny > 0 ? 'positive' : impactCny < 0 ? 'negative' : 'neutral',
    }
  })
}

function buildExecutiveSummary(
  status: AdviceStatus,
  dominantDriver: AdviceDriver,
  action: AdviceAction,
  profitDeltaCny: number,
): string {
  const deltaText = `较昨日${profitDeltaCny >= 0 ? '增加' : '减少'} ${formatCny(Math.abs(profitDeltaCny))} 元`
  const driverText =
    dominantDriver === 'mixed'
      ? '由汇率、税费、运费共同作用'
      : `主要受${driverLabel(dominantDriver)}${profitDeltaCny >= 0 ? '带动' : '拖累'}`

  return `利润处于${executiveStatusLabel(status)}，${deltaText}，${driverText}，${actionSummary(action)}`
}

function buildSummary(status: AdviceStatus, driver: AdviceDriver, profitDeltaCny: number, profitDeltaPct: number): string {
  const direction = profitDeltaCny >= 0 ? '改善' : '收缩'
  const driverText = driver === 'mixed' ? '多因子共同影响' : `主因来自${driverLabel(driver)}变化`
  const deltaText = `较昨日利润${direction}${Math.abs(profitDeltaCny)} 元`
  const trendText = profitDeltaPct >= 10 ? '，改善明显。' : profitDeltaPct <= -10 ? '，收缩明显。' : '。'

  return `当前利润环境${statusLabel(status)}，${deltaText}，${driverText}${trendText}`
}

function buildWarnings(input: DecisionAdviceInput, status: AdviceStatus, driver: AdviceDriver): string[] {
  const warnings: string[] = []

  if (status === 'pressure') {
    warnings.push('当前利润率已经偏低，继续沿用原报价容易压缩利润空间。')
  }

  if (driver === 'freight' && input.marketSnapshot.overrideFreight == null) {
    warnings.push('当前仍在使用基线运费，未手工覆盖前不要直接下判断。')
  }

  if (input.recentPoliciesCount > 0) {
    warnings.push('近期存在政策变动，需要确认税费口径是否已反映到测算中。')
  }

  if (warnings.length === 0 && driver === 'mixed') {
    warnings.push('当前变化不是单一因素驱动，不能只盯一个参数。')
  }

  return warnings
}

function buildExplanation(input: DecisionAdviceInput, status: AdviceStatus, driver: AdviceDriver, action: AdviceAction): string[] {
  const explanation = [
    `当前利润率为 ${input.todayResult.marginPct}% ，对应状态为“${statusLabel(status)}”。`,
    `较昨日利润变化 ${round2(input.todayResult.profitCny - input.yesterdayResult.profitCny)} 元，主驱动为${driverLabel(driver)}。`,
    `当前建议动作是“${actionLabel(action)}”。`,
  ]

  if (action === 'review_freight') {
    explanation[2] = '建议先复核运费口径，再决定是否调整报价。'
  }

  if (action === 'raise_quote') {
    explanation[2] = '利润已经承压，优先评估上调报价而不是硬扛成本波动。'
  }

  return explanation
}

export function buildDecisionAdvice(input: DecisionAdviceInput): DecisionAdvice {
  const profitDeltaCny = round2(input.todayResult.profitCny - input.yesterdayResult.profitCny)
  const profitDeltaPct =
    input.yesterdayResult.profitCny === 0 ? 0 : round2((profitDeltaCny / input.yesterdayResult.profitCny) * 100)
  const dominantDriver = mapDominantDriver(input.attribution)
  const status = buildStatus(input.todayResult.marginPct)
  const action = buildAction(status, dominantDriver)

  return {
    status,
    statusLabel: statusLabel(status),
    summary: buildSummary(status, dominantDriver, profitDeltaCny, profitDeltaPct),
    executiveSummary: buildExecutiveSummary(status, dominantDriver, action, profitDeltaCny),
    driverBreakdown: buildDriverBreakdown(input.attribution),
    profitDeltaCny,
    profitDeltaPct,
    dominantDriver,
    dominantDriverLabel: driverLabel(dominantDriver),
    action,
    actionLabel: actionLabel(action),
    warnings: buildWarnings(input, status, dominantDriver),
    explanation: buildExplanation(input, status, dominantDriver, action),
    aiSummary: null,
  }
}
