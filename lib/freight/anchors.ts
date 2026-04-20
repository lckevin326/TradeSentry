import {
  type FreightContainerType,
  type FreightCountry,
  type FreightRouteSelection,
  type FreightRouteKey,
  FREIGHT_ROUTE_KEYS,
  getFreightRouteByKey,
} from './constants'

export const FREIGHT_ANCHOR_INDEX = 1800.6

export type FreightRouteAnchor = {
  routeKey: FreightRouteKey
  anchorIndex: number
  anchorFreightCny: number
  originPort: FreightRouteSelection['originPort']
  destinationCountry: FreightCountry
  destinationPort: FreightRouteSelection['destinationPort']
  containerType: FreightContainerType
}

export type DerivedFreightRow = {
  date: string
  route_key: FreightRouteKey
  origin_port: FreightRouteSelection['originPort']
  destination_country: FreightCountry
  destination_port: FreightRouteSelection['destinationPort']
  container_type: FreightContainerType
  baseline_freight: number
}

function createAnchor(routeKey: FreightRouteKey, anchorFreightCny: number): FreightRouteAnchor {
  const route = getFreightRouteByKey(routeKey)
  if (!route) {
    throw new Error(`Unsupported route key: ${routeKey}`)
  }

  return {
    routeKey,
    anchorIndex: FREIGHT_ANCHOR_INDEX,
    anchorFreightCny,
    originPort: route.originPort,
    destinationCountry: route.destinationCountry,
    destinationPort: route.destinationPort,
    containerType: route.containerType,
  }
}

export const FREIGHT_ROUTE_ANCHORS: Record<FreightRouteKey, FreightRouteAnchor> = {
  'shanghai-jebel-ali-20gp': createAnchor('shanghai-jebel-ali-20gp', 1250),
  'shanghai-jebel-ali-40gp': createAnchor('shanghai-jebel-ali-40gp', 1850),
  'shanghai-jebel-ali-40hq': createAnchor('shanghai-jebel-ali-40hq', 1950),
  'shanghai-dammam-20gp': createAnchor('shanghai-dammam-20gp', 1180),
  'shanghai-dammam-40gp': createAnchor('shanghai-dammam-40gp', 1720),
  'shanghai-dammam-40hq': createAnchor('shanghai-dammam-40hq', 1820),
}

function assertPositiveFiniteNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive finite number`)
  }
}

export function deriveFreightFromIndex(input: {
  anchorIndex: number
  currentIndex: number
  anchorFreightCny: number
}): number {
  assertPositiveFiniteNumber(input.anchorIndex, 'anchorIndex')
  assertPositiveFiniteNumber(input.currentIndex, 'currentIndex')
  assertPositiveFiniteNumber(input.anchorFreightCny, 'anchorFreightCny')

  return Math.round(input.anchorFreightCny * (input.currentIndex / input.anchorIndex))
}

export function buildDerivedFreightRows(input: {
  date: string
  currentIndex: number
}): DerivedFreightRow[] {
  return FREIGHT_ROUTE_KEYS.map((routeKey) => {
    const anchor = FREIGHT_ROUTE_ANCHORS[routeKey]

    return {
      date: input.date,
      route_key: anchor.routeKey,
      origin_port: anchor.originPort,
      destination_country: anchor.destinationCountry,
      destination_port: anchor.destinationPort,
      container_type: anchor.containerType,
      baseline_freight: deriveFreightFromIndex({
        anchorIndex: anchor.anchorIndex,
        currentIndex: input.currentIndex,
        anchorFreightCny: anchor.anchorFreightCny,
      }),
    }
  })
}
