import type { DecisionAdvice } from './advice'

type LatestRate = {
  rate: number | null
  change_pct: number | null
  date: string | null
}

type TariffStatus = {
  dateLabel: string
  statusLabel: string
}

export interface HomeSummary {
  state: 'pending' | 'ready'
  conclusion: string
  keySignals: [string, string, string] | []
  focus: string
}

interface DeriveHomeSummaryInput {
  decisionAdvice: DecisionAdvice | null
  aedRate: LatestRate | null
  baselineFreight: number
  tariffStatus: TariffStatus
  recentPoliciesCount: number
}

function formatRateSignal(aedRate: LatestRate | null): string {
  if (aedRate?.rate == null) {
    return '汇率：AED 暂无最新数据。'
  }

  const changeText =
    aedRate.change_pct == null ? '暂无日变动数据' : `日变动 ${aedRate.change_pct > 0 ? '+' : ''}${aedRate.change_pct.toFixed(2)}%`

  return `汇率：AED ${aedRate.rate.toFixed(4)}，${changeText}。`
}

function formatFreightSignal(baselineFreight: number): string {
  return baselineFreight > 0 ? `运费：当前默认运费 ¥${baselineFreight}。` : '运费：默认运费待抓取。'
}

function formatPolicySignal(recentPoliciesCount: number, tariffStatus: TariffStatus): string {
  return `政策：${recentPoliciesCount} 条相关政策，关税状态为${tariffStatus.statusLabel}。`
}

export function deriveHomeSummary(input: DeriveHomeSummaryInput): HomeSummary {
  if (!input.decisionAdvice) {
    return {
      state: 'pending',
      conclusion: '等待测算',
      keySignals: [],
      focus: '先完成一笔报价测算，再看综合结论。',
    }
  }

  return {
    state: 'ready',
    conclusion: input.decisionAdvice.executiveSummary ?? input.decisionAdvice.summary,
    keySignals: [
      formatRateSignal(input.aedRate),
      formatFreightSignal(input.baselineFreight),
      formatPolicySignal(input.recentPoliciesCount, input.tariffStatus),
    ],
    focus: input.decisionAdvice.warnings[0] ?? `当前建议动作：${input.decisionAdvice.actionLabel}。`,
  }
}
