import { strict as assert } from 'node:assert'
import { mock } from 'node:test'
import { test } from 'node:test'

import { postProfitRequest } from './route'

function createMarketData() {
  return {
    fx: {
      today: {
        date: '2026-04-18',
        rate: 0.2,
      },
      yesterday: {
        date: '2026-04-17',
        rate: 0.25,
      },
    },
    tariff: {
      today: {
        date: '2026-04-18',
        ratePct: 12,
        fetchedAt: '2026-04-18T08:00:00.000Z',
      },
      yesterday: {
        date: '2026-04-17',
        ratePct: 10,
        fetchedAt: '2026-04-17T08:00:00.000Z',
      },
    },
    freight: {
      today: {
        date: '2026-04-18',
        routeKey: 'shanghai-jebel-ali-20gp',
        containerType: '20GP',
        baselineFreight: 140,
        sourceUrl: 'https://example.com/freight/today',
        fetchedAt: '2026-04-18T08:00:00.000Z',
      },
      yesterday: {
        date: '2026-04-17',
        routeKey: 'shanghai-jebel-ali-20gp',
        containerType: '20GP',
        baselineFreight: 100,
        sourceUrl: 'https://example.com/freight/yesterday',
        fetchedAt: '2026-04-17T08:00:00.000Z',
      },
    },
  }
}

function createRequest(body: unknown) {
  return new Request('http://localhost/api/profit', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

function createRawRequest(body: string) {
  return new Request('http://localhost/api/profit', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body,
  })
}

test('POST /api/profit returns today, yesterday, attribution, and selected market values', async () => {
  const response = await postProfitRequest(
    createRequest({
      destinationCountry: 'UAE',
      hsCode: '401110',
      tradeTerm: 'FOB',
      quoteCurrency: 'USD',
      quotedAmount: 1000,
      quantity: 10,
      productCost: 4000,
      miscFees: 100,
      routeKey: 'shanghai-jebel-ali-20gp',
      containerType: '20GP',
    }),
    {
      now: () => new Date('2026-04-18T10:00:00.000Z'),
      loadMarketData: async () => createMarketData(),
    },
  )

  assert.equal(response.status, 200)

  const json = await response.json()

  assert.deepEqual(json.todayResult, {
    revenueCny: 5000,
    costCny: 4206.8,
    profitCny: 793.2,
    marginPct: 15.86,
    freightCny: 140,
    tariffCny: 616.8,
    antiDumpingCny: 0,
    rebateCny: 650,
  })
  assert.deepEqual(json.yesterdayResult, {
    revenueCny: 4000,
    costCny: 4090,
    profitCny: -90,
    marginPct: -2.25,
    freightCny: 100,
    tariffCny: 410,
    antiDumpingCny: 0,
    rebateCny: 520,
  })
  assert.deepEqual(json.attribution, {
    fxDeltaCny: 1030,
    dutiesDeltaCny: -102,
    freightDeltaCny: -44.8,
    totalDeltaCny: 883.2,
    dominantDriver: 'fx',
  })
  assert.deepEqual(json.selectedMarketValues, {
    today: {
      fxRate: 5,
      fxSourceRate: 0.2,
      fxSourceDate: '2026-04-18',
      fxSourceKind: 'market_rate',
      tariffRatePct: 12,
      tariffSourceDate: '2026-04-18',
      tariffSourceFetchedAt: '2026-04-18T08:00:00.000Z',
      freightCny: 140,
      freightSourceDate: '2026-04-18',
      freightSourceFetchedAt: '2026-04-18T08:00:00.000Z',
      freightSourceUrl: 'https://example.com/freight/today',
      rebateRatePct: 13,
      rebateSource: 'fixture',
    },
    yesterday: {
      fxRate: 4,
      fxSourceRate: 0.25,
      fxSourceDate: '2026-04-17',
      fxSourceKind: 'market_rate',
      tariffRatePct: 10,
      tariffSourceDate: '2026-04-17',
      tariffSourceFetchedAt: '2026-04-17T08:00:00.000Z',
      freightCny: 100,
      freightSourceDate: '2026-04-17',
      freightSourceFetchedAt: '2026-04-17T08:00:00.000Z',
      freightSourceUrl: 'https://example.com/freight/yesterday',
      rebateRatePct: 13,
      rebateSource: 'fixture',
    },
  })
})

test('POST /api/profit marks synthetic CNY FX values as synthetic and preserves source metadata', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service'

  const { supabase } = await import('../../../lib/supabase')
  const selectQueriesByTable: Record<string, string[]> = {}

  const fromMock = mock.method(supabase, 'from', (table: string) => {
    const rowsByTable: Record<string, unknown[]> = {
      tariffs: [
        {
          date: '2026-04-18',
          fetched_at: '2026-04-18T08:00:00.000Z',
          rate_pct: 12,
        },
        {
          date: '2026-04-17',
          fetched_at: '2026-04-17T08:00:00.000Z',
          rate_pct: 10,
        },
      ],
      freight_rates: [
        {
          date: '2026-04-18',
          baseline_freight: 140,
          fetched_at: '2026-04-18T08:00:00.000Z',
          source_url: 'https://example.com/freight/today',
        },
        {
          date: '2026-04-17',
          baseline_freight: 100,
          fetched_at: '2026-04-17T08:00:00.000Z',
          source_url: 'https://example.com/freight/yesterday',
        },
      ],
    }

    return {
      select(query?: string) {
        if (typeof query === 'string') {
          ;(selectQueriesByTable[table] ??= []).push(query)
        }
        return this
      },
      eq() {
        return this
      },
      order() {
        return this
      },
      async limit() {
        return {
          data: rowsByTable[table] ?? [],
          error: null,
        }
      },
    }
  })

  try {
    const response = await postProfitRequest(
      createRequest({
        destinationCountry: 'UAE',
        hsCode: '401110',
        tradeTerm: 'FOB',
        quoteCurrency: 'CNY',
        quotedAmount: 1000,
        quantity: 10,
        productCost: 4000,
        miscFees: 100,
        routeKey: 'shanghai-jebel-ali-20gp',
        containerType: '20GP',
      }),
    )

    assert.equal(response.status, 200)

    const json = await response.json()

    assert.equal(json.selectedMarketValues.today.fxRate, 1)
    assert.equal(json.selectedMarketValues.today.fxSourceRate, 1)
    assert.equal(json.selectedMarketValues.today.fxSourceKind, 'synthetic_cny_parity')
    assert.equal(json.selectedMarketValues.yesterday.fxRate, 1)
    assert.equal(json.selectedMarketValues.yesterday.fxSourceKind, 'synthetic_cny_parity')
    assert.equal(json.selectedMarketValues.today.tariffSourceFetchedAt, '2026-04-18T08:00:00.000Z')
    assert.equal(json.selectedMarketValues.today.freightSourceFetchedAt, '2026-04-18T08:00:00.000Z')
    assert.equal(json.selectedMarketValues.today.freightSourceUrl, 'https://example.com/freight/today')
    assert.ok(
      selectQueriesByTable.freight_rates?.some(
        (query) => query.includes('fetched_at') && query.includes('source_url'),
      ),
    )
  } finally {
    fromMock.mock.restore()
  }
})

test('POST /api/profit falls back to the single latest FX record for first-day quote currencies', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service'

  const { supabase } = await import('../../../lib/supabase')

  const fromMock = mock.method(supabase, 'from', (table: string) => {
    const rowsByTable: Record<string, unknown[]> = {
      exchange_rates: [
        {
          date: '2026-04-18',
          rate: 0.1463,
        },
      ],
      tariffs: [
        {
          date: '2026-04-18',
          fetched_at: '2026-04-18T08:00:00.000Z',
          rate_pct: 12,
        },
        {
          date: '2026-04-17',
          fetched_at: '2026-04-17T08:00:00.000Z',
          rate_pct: 10,
        },
      ],
      freight_rates: [
        {
          date: '2026-04-17',
          baseline_freight: 1168,
          fetched_at: '2026-04-18T08:00:00.000Z',
          source_url: 'https://example.com/freight/today',
        },
        {
          date: '2026-04-10',
          baseline_freight: 1274,
          fetched_at: '2026-04-17T08:00:00.000Z',
          source_url: 'https://example.com/freight/yesterday',
        },
      ],
    }

    return {
      select() {
        return this
      },
      eq() {
        return this
      },
      order() {
        return this
      },
      async limit() {
        return {
          data: rowsByTable[table] ?? [],
          error: null,
        }
      },
    }
  })

  try {
    const response = await postProfitRequest(
      createRequest({
        destinationCountry: 'UAE',
        hsCode: '401110',
        tradeTerm: 'FOB',
        quoteCurrency: 'USD',
        quotedAmount: 1000,
        quantity: 10,
        productCost: 4000,
        miscFees: 100,
        routeKey: 'shanghai-jebel-ali-20gp',
        containerType: '20GP',
      }),
    )

    assert.equal(response.status, 200)

    const json = await response.json()
    assert.equal(json.selectedMarketValues.today.fxSourceRate, 0.1463)
    assert.equal(json.selectedMarketValues.yesterday.fxSourceRate, 0.1463)
  } finally {
    fromMock.mock.restore()
  }
})

test('POST /api/profit rejects invalid order input', async () => {
  const response = await postProfitRequest(
    createRequest({
      destinationCountry: 'UAE',
      hsCode: '401110',
      tradeTerm: 'FOB',
      quoteCurrency: 'USD',
      quotedAmount: 0,
      quantity: 10,
      productCost: 4000,
      miscFees: 100,
      routeKey: 'shanghai-jebel-ali-20gp',
      containerType: '20GP',
    }),
    {
      now: () => new Date('2026-04-18T10:00:00.000Z'),
      loadMarketData: async () => createMarketData(),
    },
  )

  assert.equal(response.status, 400)

  const json = await response.json()
  assert.equal(json.ok, false)
  assert.match(json.error, /quotedAmount/i)
})

test('POST /api/profit applies manual freight override when provided', async () => {
  const response = await postProfitRequest(
    createRequest({
      destinationCountry: 'UAE',
      hsCode: '401110',
      tradeTerm: 'FOB',
      quoteCurrency: 'USD',
      quotedAmount: 1000,
      quantity: 10,
      productCost: 4000,
      miscFees: 100,
      routeKey: 'shanghai-jebel-ali-20gp',
      containerType: '20GP',
      overrideFreight: 220,
    }),
    {
      now: () => new Date('2026-04-18T10:00:00.000Z'),
      loadMarketData: async () => createMarketData(),
    },
  )

  assert.equal(response.status, 200)

  const json = await response.json()

  assert.equal(json.todayResult.freightCny, 220)
  assert.equal(json.yesterdayResult.freightCny, 220)
})

test('POST /api/profit rejects unsupported freight route keys', async () => {
  const response = await postProfitRequest(
    createRequest({
      destinationCountry: 'UAE',
      hsCode: '401110',
      tradeTerm: 'FOB',
      quoteCurrency: 'USD',
      quotedAmount: 1000,
      quantity: 10,
      productCost: 4000,
      miscFees: 100,
      routeKey: 'shanghai-invalid-route',
      containerType: '20GP',
    }),
    {
      now: () => new Date('2026-04-18T10:00:00.000Z'),
      loadMarketData: async () => createMarketData(),
    },
  )

  assert.equal(response.status, 400)

  const json = await response.json()
  assert.equal(json.ok, false)
  assert.match(json.error, /Unsupported routeKey/i)
})

test('POST /api/profit rejects malformed JSON with a clean client error', async () => {
  const response = await postProfitRequest(createRawRequest('{"destinationCountry":'))

  assert.equal(response.status, 400)

  const json = await response.json()
  assert.equal(json.ok, false)
  assert.equal(json.error, 'Invalid JSON body')
})

test('POST /api/profit rejects freight routes incompatible with destination country and container type', async () => {
  const response = await postProfitRequest(
    createRequest({
      destinationCountry: 'UAE',
      hsCode: '401110',
      tradeTerm: 'FOB',
      quoteCurrency: 'USD',
      quotedAmount: 1000,
      quantity: 10,
      productCost: 4000,
      miscFees: 100,
      routeKey: 'shanghai-dammam-40hq',
      containerType: '20GP',
    }),
    {
      now: () => new Date('2026-04-18T10:00:00.000Z'),
      loadMarketData: async () => createMarketData(),
    },
  )

  assert.equal(response.status, 422)

  const json = await response.json()
  assert.equal(json.ok, false)
  assert.match(json.error, /not compatible with destinationCountry/i)
})
