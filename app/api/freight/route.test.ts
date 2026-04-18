import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import {
  fetchFreightHistory,
  parseFreightHistoryQuery,
  type FreightHistoryQueryOptions,
} from './route'

type FreightHistoryRow = {
  date: string
  route_key: string
  origin_port: string
  destination_country: string
  destination_port: string
  container_type: string
  baseline_freight: number
  source_url: string | null
  fetched_at: string
}

function createFreightDb(result: { data: FreightHistoryRow[] | null; error: { message: string } | null }) {
  const calls: Array<unknown[]> = []

  type FreightQueryBuilder = {
    select(columns: string): FreightQueryBuilder
    order(column: string, options: { ascending: boolean }): FreightQueryBuilder
    eq(column: string, value: string): FreightQueryBuilder
    gte(column: string, value: string): Promise<typeof result>
  }

  const builder: FreightQueryBuilder = {
    select(columns: string) {
      calls.push(['select', columns])
      return builder
    },
    order(column: string, options: { ascending: boolean }) {
      calls.push(['order', column, options])
      return builder
    },
    eq(column: string, value: string) {
      calls.push(['eq', column, value])
      return builder
    },
    gte(column: string, value: string) {
      calls.push(['gte', column, value])
      return Promise.resolve(result)
    },
  }

  return {
    calls,
    from(table: string) {
      calls.push(['from', table])
      return builder
    },
  }
}

const sampleRow: FreightHistoryRow = {
  date: '2026-04-10',
  route_key: 'shanghai-jebel-ali-20gp',
  origin_port: 'Shanghai',
  destination_country: 'UAE',
  destination_port: 'Jebel Ali',
  container_type: '20GP',
  baseline_freight: 1250,
  source_url: 'https://example.com/freight',
  fetched_at: '2026-04-10T12:00:00.000Z',
}

function assertQueryCalls(
  calls: Array<unknown[]>,
  expectedSince: string,
  expectedFilters: Array<[string, string, string]> = [],
) {
  const expected = [
    ['from', 'freight_rates'],
    [
      'select',
      'date, route_key, origin_port, destination_country, destination_port, container_type, baseline_freight, source_url, fetched_at',
    ],
    ...expectedFilters,
    ['order', 'date', { ascending: true }],
    ['order', 'fetched_at', { ascending: true }],
    ['gte', 'date', expectedSince],
  ]

  assert.deepEqual(calls, expected)
}

test('freight history queries by route', async () => {
  const db = createFreightDb({ data: [sampleRow], error: null })
  const options: FreightHistoryQueryOptions = {
    route: 'shanghai-jebel-ali-20gp',
    days: 30,
    now: Date.parse('2026-04-18T00:00:00Z'),
  }

  const result = await fetchFreightHistory(db, options)

  assert.deepEqual(result, { data: [sampleRow], error: null })
  assertQueryCalls(db.calls, '2026-03-19', [['eq', 'route_key', 'shanghai-jebel-ali-20gp']])
})

test('freight history queries by container type', async () => {
  const db = createFreightDb({ data: [sampleRow], error: null })

  const result = await fetchFreightHistory(db, {
    container: '40HQ',
    days: 14,
    now: Date.parse('2026-04-18T00:00:00Z'),
  })

  assert.deepEqual(result, { data: [sampleRow], error: null })
  assertQueryCalls(db.calls, '2026-04-04', [['eq', 'container_type', '40HQ']])
})

test('freight history combines route and container filters in one query', async () => {
  const db = createFreightDb({ data: [sampleRow], error: null })

  const result = await fetchFreightHistory(db, {
    route: 'shanghai-jebel-ali-20gp',
    container: '20GP',
    days: 14,
    now: Date.parse('2026-04-18T00:00:00Z'),
  })

  assert.deepEqual(result, { data: [sampleRow], error: null })
  assertQueryCalls(db.calls, '2026-04-04', [
    ['eq', 'route_key', 'shanghai-jebel-ali-20gp'],
    ['eq', 'container_type', '20GP'],
  ])
})

test('freight history queries by day range', async () => {
  const db = createFreightDb({ data: [sampleRow], error: null })

  const result = await fetchFreightHistory(db, {
    days: 7,
    now: Date.parse('2026-04-18T00:00:00Z'),
  })

  assert.deepEqual(result, { data: [sampleRow], error: null })
  assertQueryCalls(db.calls, '2026-04-11')
})

test('freight history rounds fractional positive days up to a one-day query', async () => {
  const db = createFreightDb({ data: [sampleRow], error: null })

  const result = await fetchFreightHistory(db, {
    days: 0.2,
    now: Date.parse('2026-04-18T00:00:00Z'),
  })

  assert.deepEqual(result, { data: [sampleRow], error: null })
  assertQueryCalls(db.calls, '2026-04-17')
})

test('freight query parsing supports aliases and defaults', () => {
  const aliasParams = new URLSearchParams('routeKey=shanghai-jebel-ali-20gp&containerType=40HQ&days=12.5')
  assert.deepEqual(parseFreightHistoryQuery(aliasParams), {
    route: 'shanghai-jebel-ali-20gp',
    container: '40HQ',
    days: 12.5,
  })

  const defaultParams = new URLSearchParams()
  assert.deepEqual(parseFreightHistoryQuery(defaultParams), {
    route: null,
    container: null,
    days: 30,
  })
})

test('freight history returns an empty array when there are no rows', async () => {
  const db = createFreightDb({ data: null, error: null })

  const result = await fetchFreightHistory(db, {
    days: 30,
    now: Date.parse('2026-04-18T00:00:00Z'),
  })

  assert.deepEqual(result, { data: [], error: null })
})
