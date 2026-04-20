import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import {
  FREIGHT_CONTAINER_TYPES,
  FREIGHT_CONTAINER_TYPE_LABELS,
  FREIGHT_COUNTRY_LABELS,
  FREIGHT_COUNTRIES,
  FREIGHT_ROUTE_BY_KEY,
  FREIGHT_ROUTE_CHART_LABELS,
  FREIGHT_ROUTE_OPTIONS,
  FREIGHT_ROUTE_KEYS,
  FREIGHT_ROUTE_LABELS,
  getFreightRouteByKey,
  getFreightRouteKey,
} from './constants'

test('freight constants define supported destination countries and container types', () => {
  assert.deepEqual(FREIGHT_COUNTRIES, ['UAE', 'SA', 'KW', 'QA', 'OM'])
  assert.deepEqual(FREIGHT_CONTAINER_TYPES, ['20GP', '40GP', '40HQ'])
  assert.deepEqual(FREIGHT_COUNTRY_LABELS, {
    UAE: '阿联酋',
    SA: '沙特',
    KW: '科威特',
    QA: '卡塔尔',
    OM: '阿曼',
  })
  assert.deepEqual(FREIGHT_CONTAINER_TYPE_LABELS, {
    '20GP': '20GP · 20尺柜',
    '40GP': '40GP · 40尺普柜',
    '40HQ': '40HQ · 40尺高柜',
  })
})

test('freight routes are uniquely keyed and fully cover the supported country/container pairs', () => {
  const routeKeys = FREIGHT_ROUTE_OPTIONS.map(route => route.routeKey)
  const routePairs = FREIGHT_ROUTE_OPTIONS.map(route => `${route.destinationCountry}:${route.containerType}`)

  assert.equal(FREIGHT_ROUTE_OPTIONS.length, FREIGHT_COUNTRIES.length * FREIGHT_CONTAINER_TYPES.length)
  assert.equal(new Set(routeKeys).size, routeKeys.length)
  assert.equal(new Set(routePairs).size, routePairs.length)
  assert.deepEqual(new Set(routeKeys), new Set(FREIGHT_ROUTE_KEYS))
})

test('freight route selection round-trips through the registry', () => {
  for (const route of FREIGHT_ROUTE_OPTIONS) {
    assert.equal(getFreightRouteKey(route), route.routeKey)
    assert.equal(getFreightRouteByKey(route.routeKey), route)
    assert.equal(FREIGHT_ROUTE_BY_KEY[route.routeKey], route)
    assert.equal(FREIGHT_ROUTE_LABELS[route.routeKey], route.label)
    assert.equal(FREIGHT_ROUTE_CHART_LABELS[route.routeKey], route.chartLabel)
  }

  const routeKey = getFreightRouteKey({
    destinationCountry: 'UAE',
    originPort: 'Shanghai',
    destinationPort: 'Jebel Ali',
    containerType: '40HQ',
  })

  assert.equal(routeKey, 'shanghai-jebel-ali-40hq')
  assert.equal(getFreightRouteByKey(routeKey)?.label, '上海 -> 杰贝阿里 · 40HQ')
  assert.equal(getFreightRouteByKey(routeKey)?.chartLabel, 'UAE / Jebel Ali / 40HQ')
  assert.equal(getFreightRouteByKey(routeKey)?.destinationCountry, 'UAE')
})
