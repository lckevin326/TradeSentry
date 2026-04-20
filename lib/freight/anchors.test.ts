import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { FREIGHT_ROUTE_KEYS } from './constants'
import {
  FREIGHT_ANCHOR_INDEX,
  FREIGHT_ROUTE_ANCHORS,
  buildDerivedFreightRows,
  deriveFreightFromIndex,
} from './anchors'

test('all supported freight route keys have anchor configuration', () => {
  assert.deepEqual(Object.keys(FREIGHT_ROUTE_ANCHORS).sort(), [...FREIGHT_ROUTE_KEYS].sort())
})

test('deriveFreightFromIndex maps the current index to a stable derived freight value', () => {
  assert.equal(
    deriveFreightFromIndex({
      anchorIndex: FREIGHT_ANCHOR_INDEX,
      currentIndex: 1834.9,
      anchorFreightCny: 1250,
    }),
    1274,
  )
})

test('buildDerivedFreightRows derives one row per anchored route', () => {
  const rows = buildDerivedFreightRows({
    date: '2026-04-18',
    currentIndex: 1834.9,
  })

  assert.equal(rows.length, FREIGHT_ROUTE_KEYS.length)
  assert.deepEqual(
    rows.map((row) => row.route_key).sort(),
    [...FREIGHT_ROUTE_KEYS].sort(),
  )
  const firstRow = rows.find((row) => row.route_key === 'shanghai-jebel-ali-20gp')
  assert.deepEqual(firstRow, {
    date: '2026-04-18',
    route_key: 'shanghai-jebel-ali-20gp',
    origin_port: 'Shanghai',
    destination_country: 'UAE',
    destination_port: 'Jebel Ali',
    container_type: '20GP',
    baseline_freight: 1274,
  })
})

test('deriveFreightFromIndex throws when index inputs are not positive numbers', () => {
  assert.throws(
    () =>
      deriveFreightFromIndex({
        anchorIndex: 0,
        currentIndex: 1834.9,
        anchorFreightCny: 1250,
      }),
    /anchorIndex must be a positive finite number/,
  )

  assert.throws(
    () =>
      deriveFreightFromIndex({
        anchorIndex: FREIGHT_ANCHOR_INDEX,
        currentIndex: -1,
        anchorFreightCny: 1250,
      }),
    /currentIndex must be a positive finite number/,
  )

  assert.throws(
    () =>
      deriveFreightFromIndex({
        anchorIndex: FREIGHT_ANCHOR_INDEX,
        currentIndex: 1834.9,
        anchorFreightCny: Number.NaN,
      }),
    /anchorFreightCny must be a positive finite number/,
  )

  assert.throws(
    () =>
      deriveFreightFromIndex({
        anchorIndex: Number.POSITIVE_INFINITY,
        currentIndex: 1834.9,
        anchorFreightCny: 1250,
      }),
    /anchorIndex must be a positive finite number/,
  )
})
