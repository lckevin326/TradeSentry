import type { ProfitCalculationResponse } from '../../components/ProfitCalculator'
import type { MarketSnapshot } from './index'
import { buildDecisionAdvice, type DecisionAdvice } from './advice'

export function buildDecisionAdviceMarketSnapshot(
  calculation: ProfitCalculationResponse | null,
): MarketSnapshot | null {
  if (!calculation?.selectedMarketValues?.today || !calculation.input) {
    return null
  }

  return {
    fxRate: calculation.selectedMarketValues.today.fxRate,
    tariffRatePct: calculation.selectedMarketValues.today.tariffRatePct,
    antiDumpingRatePct: 0,
    exportRebateRatePct: calculation.selectedMarketValues.today.rebateRatePct,
    baselineFreight: calculation.selectedMarketValues.today.freightCny,
    overrideFreight: calculation.input.overrideFreight,
  }
}

export function deriveDecisionAdvice(
  calculation: ProfitCalculationResponse | null,
  recentPoliciesCount: number,
): DecisionAdvice | null {
  if (
    !calculation?.todayResult ||
    !calculation.yesterdayResult ||
    !calculation.attribution ||
    !calculation.selectedMarketValues?.today
  ) {
    return null
  }

  const marketSnapshot = buildDecisionAdviceMarketSnapshot(calculation)

  if (!marketSnapshot) {
    return null
  }

  return buildDecisionAdvice({
    todayResult: calculation.todayResult,
    yesterdayResult: calculation.yesterdayResult,
    attribution: calculation.attribution,
    marketSnapshot,
    recentPoliciesCount,
  })
}
