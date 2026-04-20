import type { ContainerType, Country } from '../profit'

export const FREIGHT_COUNTRIES = ['UAE', 'SA', 'KW', 'QA', 'OM'] as const satisfies readonly Country[]
export type FreightCountry = (typeof FREIGHT_COUNTRIES)[number]

export const FREIGHT_COUNTRY_LABELS: Record<FreightCountry, string> = {
  UAE: '阿联酋',
  SA: '沙特',
  KW: '科威特',
  QA: '卡塔尔',
  OM: '阿曼',
}

export const FREIGHT_CONTAINER_TYPES = ['20GP', '40GP', '40HQ'] as const satisfies readonly ContainerType[]
export type FreightContainerType = (typeof FREIGHT_CONTAINER_TYPES)[number]

export const FREIGHT_CONTAINER_TYPE_LABELS: Record<FreightContainerType, string> = {
  '20GP': '20GP · 20尺柜',
  '40GP': '40GP · 40尺普柜',
  '40HQ': '40HQ · 40尺高柜',
}

type FreightRouteLane = {
  destinationCountry: FreightCountry
  destinationPort: 'Jebel Ali' | 'Dammam' | 'Shuaiba' | 'Hamad' | 'Sohar'
  destinationPortLabel: string
  countryLabel: string
  chartCountryLabel: string
}

const FREIGHT_ROUTE_LANES = [
  {
    destinationCountry: 'UAE',
    destinationPort: 'Jebel Ali',
    destinationPortLabel: '杰贝阿里',
    countryLabel: '阿联酋',
    chartCountryLabel: 'UAE',
  },
  {
    destinationCountry: 'SA',
    destinationPort: 'Dammam',
    destinationPortLabel: '达曼',
    countryLabel: '沙特',
    chartCountryLabel: 'SA',
  },
  {
    destinationCountry: 'KW',
    destinationPort: 'Shuaiba',
    destinationPortLabel: '舒艾巴',
    countryLabel: '科威特',
    chartCountryLabel: 'KW',
  },
  {
    destinationCountry: 'QA',
    destinationPort: 'Hamad',
    destinationPortLabel: '哈马德',
    countryLabel: '卡塔尔',
    chartCountryLabel: 'QA',
  },
  {
    destinationCountry: 'OM',
    destinationPort: 'Sohar',
    destinationPortLabel: '苏哈尔',
    countryLabel: '阿曼',
    chartCountryLabel: 'OM',
  },
] as const satisfies readonly FreightRouteLane[]

export interface FreightRouteSelection {
  destinationCountry: FreightCountry
  originPort: 'Shanghai'
  destinationPort: 'Jebel Ali' | 'Dammam' | 'Shuaiba' | 'Hamad' | 'Sohar'
  containerType: FreightContainerType
}

export interface FreightRouteOption extends FreightRouteSelection {
  routeKey: string
  label: string
  chartLabel: string
}

const FREIGHT_ROUTE_SHAPES = FREIGHT_ROUTE_LANES.flatMap(lane =>
  FREIGHT_CONTAINER_TYPES.map(containerType => ({
    destinationCountry: lane.destinationCountry,
    originPort: 'Shanghai' as const,
    destinationPort: lane.destinationPort,
    containerType,
    routeKey: `shanghai-${{ 'Jebel Ali': 'jebel-ali', Dammam: 'dammam', Shuaiba: 'shuaiba', Hamad: 'hamad', Sohar: 'sohar' }[lane.destinationPort]}-${containerType.toLowerCase()}`,
    label: `上海 -> ${lane.destinationPortLabel} · ${containerType}`,
    chartLabel: `${lane.chartCountryLabel} / ${lane.destinationPort} / ${containerType}`,
  })),
)

export const FREIGHT_ROUTE_OPTIONS = FREIGHT_ROUTE_SHAPES as readonly FreightRouteOption[]

export type FreightRouteKey = (typeof FREIGHT_ROUTE_OPTIONS)[number]['routeKey']

export const FREIGHT_ROUTE_KEYS = FREIGHT_ROUTE_OPTIONS.map(route => route.routeKey) as FreightRouteKey[]

export const FREIGHT_ROUTE_LABELS: Record<FreightRouteKey, string> = Object.fromEntries(
  FREIGHT_ROUTE_OPTIONS.map(route => [route.routeKey, route.label]),
) as Record<FreightRouteKey, string>

export const FREIGHT_ROUTE_CHART_LABELS: Record<FreightRouteKey, string> = Object.fromEntries(
  FREIGHT_ROUTE_OPTIONS.map(route => [route.routeKey, route.chartLabel]),
) as Record<FreightRouteKey, string>

export const FREIGHT_ROUTE_BY_KEY: Record<FreightRouteKey, FreightRouteOption> = Object.fromEntries(
  FREIGHT_ROUTE_OPTIONS.map(route => [route.routeKey, route]),
) as Record<FreightRouteKey, FreightRouteOption>

export function getFreightRouteByKey(routeKey: string): FreightRouteOption | null {
  return FREIGHT_ROUTE_BY_KEY[routeKey as FreightRouteKey] ?? null
}

export function getFreightRouteKey(selection: FreightRouteSelection): FreightRouteKey | null {
  return (
    FREIGHT_ROUTE_OPTIONS.find(
      route =>
        route.destinationCountry === selection.destinationCountry &&
        route.originPort === selection.originPort &&
        route.destinationPort === selection.destinationPort &&
        route.containerType === selection.containerType,
    )?.routeKey ?? null
  )
}
