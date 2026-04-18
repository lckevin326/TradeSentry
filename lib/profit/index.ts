export const PROFIT_COUNTRIES = ['UAE', 'SA', 'KW', 'QA', 'BH', 'OM'] as const
export type Country = (typeof PROFIT_COUNTRIES)[number]

export const PROFIT_QUOTE_CURRENCIES = ['USD', 'CNY'] as const
export type ProfitQuoteCurrency = (typeof PROFIT_QUOTE_CURRENCIES)[number]

export const PROFIT_TRADE_TERMS = ['FOB', 'CIF'] as const
export type TradeTerm = (typeof PROFIT_TRADE_TERMS)[number]

export const PROFIT_CONTAINER_TYPES = ['20GP', '40GP', '40HQ'] as const
export type ContainerType = (typeof PROFIT_CONTAINER_TYPES)[number]

export const PROFIT_DRIVERS = ['fx', 'tariff', 'freight'] as const
export type ProfitDriver = (typeof PROFIT_DRIVERS)[number]

export interface OrderInput {
  destinationCountry: Country
  hsCode: string
  tradeTerm: TradeTerm
  quoteCurrency: ProfitQuoteCurrency
  quotedAmount: number
  quantity: number
  productCost: number
  miscFees: number
  routeKey: string
  containerType: ContainerType
}

export interface ProfitCalculationInput extends OrderInput {
  overrideFreight: number | null
}

export interface MarketSnapshot {
  fxRate: number
  tariffRatePct: number
  antiDumpingRatePct: number
  exportRebateRatePct: number
  baselineFreight: number
  overrideFreight: number | null
}

export interface ProfitResult {
  revenueCny: number
  costCny: number
  profitCny: number
  marginPct: number
  freightCny: number
  tariffCny: number
  antiDumpingCny: number
  rebateCny: number
}

export interface AttributionResult {
  fxDeltaCny: number
  dutiesDeltaCny: number
  freightDeltaCny: number
  totalDeltaCny: number
  dominantDriver: ProfitDriver
}
