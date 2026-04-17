import type { MarketSnapshot, OrderInput, ProfitDriver, ProfitResult } from './index'

export interface ProfitComparisonResult {
  yesterday: ProfitResult
  today: ProfitResult
  deltas: {
    profit: {
      cny: number
      marginPct: number
    }
    operating: {
      revenueCny: number
      freightCny: number
    }
    duties: {
      tariffCny: number
      antiDumpingCny: number
      rebateCny: number
    }
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function selectFreight(snapshot: MarketSnapshot): number {
  return snapshot.overrideFreight ?? snapshot.baselineFreight
}

function revenueCny(order: OrderInput, snapshot: MarketSnapshot): number {
  return order.quoteCurrency === 'CNY' ? order.quotedAmount : order.quotedAmount * snapshot.fxRate
}

function fobValueCny(tradeTerm: OrderInput['tradeTerm'], freightCny: number, revenueCnyValue: number): number {
  switch (tradeTerm) {
    case 'FOB':
      return revenueCnyValue
    case 'CIF':
      return Math.max(0, revenueCnyValue - freightCny)
  }
}

function cifValueCny(tradeTerm: OrderInput['tradeTerm'], freightCny: number, revenueCnyValue: number): number {
  switch (tradeTerm) {
    case 'FOB':
      return revenueCnyValue + freightCny
    case 'CIF':
      return revenueCnyValue
  }
}

export function calculateProfitResult(order: OrderInput, snapshot: MarketSnapshot): ProfitResult {
  const freightCny = selectFreight(snapshot)
  const revenue = revenueCny(order, snapshot)
  const cifValue = cifValueCny(order.tradeTerm, freightCny, revenue)
  const fobValue = fobValueCny(order.tradeTerm, freightCny, revenue)

  const tariffCny = cifValue * (snapshot.tariffRatePct / 100)
  const antiDumpingCny = cifValue * (snapshot.antiDumpingRatePct / 100)
  const rebateCny = fobValue * (snapshot.exportRebateRatePct / 100)

  const costCny = order.productCost + order.miscFees + freightCny + tariffCny + antiDumpingCny - rebateCny
  const profitCny = revenue - costCny
  const marginPct = revenue === 0 ? 0 : round2((profitCny / revenue) * 100)

  return {
    revenueCny: round2(revenue),
    costCny: round2(costCny),
    profitCny: round2(profitCny),
    marginPct,
    freightCny: round2(freightCny),
    tariffCny: round2(tariffCny),
    antiDumpingCny: round2(antiDumpingCny),
    rebateCny: round2(rebateCny),
  }
}

export function calculateProfitComparison(
  order: OrderInput,
  yesterday: MarketSnapshot,
  today: MarketSnapshot,
): ProfitComparisonResult {
  const yesterdayResult = calculateProfitResult(order, yesterday)
  const todayResult = calculateProfitResult(order, today)

  return {
    yesterday: yesterdayResult,
    today: todayResult,
    deltas: {
      profit: {
        cny: round2(todayResult.profitCny - yesterdayResult.profitCny),
        marginPct: round2(todayResult.marginPct - yesterdayResult.marginPct),
      },
      operating: {
        revenueCny: round2(todayResult.revenueCny - yesterdayResult.revenueCny),
        freightCny: round2(todayResult.freightCny - yesterdayResult.freightCny),
      },
      duties: {
        tariffCny: round2(todayResult.tariffCny - yesterdayResult.tariffCny),
        antiDumpingCny: round2(todayResult.antiDumpingCny - yesterdayResult.antiDumpingCny),
        rebateCny: round2(todayResult.rebateCny - yesterdayResult.rebateCny),
      },
    },
  }
}

export function dominantProfitDriver(deltas: {
  fxDeltaCny: number
  tariffDeltaCny: number
  freightDeltaCny: number
}): ProfitDriver {
  const candidates: Array<[ProfitDriver, number]> = [
    ['fx', Math.abs(deltas.fxDeltaCny)],
    ['tariff', Math.abs(deltas.tariffDeltaCny)],
    ['freight', Math.abs(deltas.freightDeltaCny)],
  ]

  return candidates.reduce((winner, candidate) => (candidate[1] > winner[1] ? candidate : winner))[0]
}
