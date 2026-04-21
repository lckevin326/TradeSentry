import type { ContainerType, Country, OrderInput, ProfitQuoteCurrency, TradeTerm } from './index'

export interface MarketConfig {
  key: string
  label: string
  destinationCountry: Country
  routeKey: string
  containerType: ContainerType
}

export const DEFAULT_ORDER_BASE = {
  hsCode: '401120',
  tradeTerm: 'CIF' as TradeTerm,
  quoteCurrency: 'CNY' as ProfitQuoteCurrency,
  quotedAmount: 19000,
  quantity: 200,
  productCost: 14000,
  miscFees: 300,
}

export const MARKETS: MarketConfig[] = [
  { key: 'UAE', label: '迪拜 UAE', destinationCountry: 'UAE', routeKey: 'shanghai-jebel-ali-40hq', containerType: '40HQ' },
  { key: 'SA',  label: '沙特 SA',  destinationCountry: 'SA',  routeKey: 'shanghai-dammam-40hq',    containerType: '40HQ' },
  { key: 'KW',  label: '科威特 KW', destinationCountry: 'KW', routeKey: 'shanghai-shuaiba-40hq',   containerType: '40HQ' },
  { key: 'QA',  label: '卡塔尔 QA', destinationCountry: 'QA', routeKey: 'shanghai-hamad-40hq',     containerType: '40HQ' },
  { key: 'OM',  label: '阿曼 OM',   destinationCountry: 'OM', routeKey: 'shanghai-sohar-40hq',     containerType: '40HQ' },
]

export function buildMarketOrder(market: MarketConfig): OrderInput {
  return {
    ...DEFAULT_ORDER_BASE,
    destinationCountry: market.destinationCountry,
    routeKey: market.routeKey,
    containerType: market.containerType,
  }
}
