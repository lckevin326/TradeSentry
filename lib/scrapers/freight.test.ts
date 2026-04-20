import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { CCFI_URL } from './ccfi'
import {
  fetchAndSaveFreight,
  saveFreightRows,
  type FreightNormalizedRow,
} from './freight'

test('fetchAndSaveFreight derives fifteen freight rows from the current CCFI snapshot', async () => {
  let capturedRows: FreightNormalizedRow[] = []

  const result = await fetchAndSaveFreight({
    loadCcfiSnapshot: async () => ({
      routeName: 'PERSIAN GULF/RED SEA SERVICE',
      previousDate: '2026-04-10',
      currentDate: '2026-04-17',
      previousIndex: 1834.9,
      currentIndex: 1683.1,
      changePct: -8.3,
    }),
    saveRows: async (rows) => {
      capturedRows = rows
      return { saved: rows.length }
    },
  })

  assert.deepEqual(result, {
    scanned: 30,
    saved: 30,
    reportDate: '2026-04-17',
  })
  assert.deepEqual(capturedRows, [
    {
      date: '2026-04-10',
      routeKey: 'shanghai-jebel-ali-20gp',
      originPort: 'Shanghai',
      destinationCountry: 'UAE',
      destinationPort: 'Jebel Ali',
      containerType: '20GP',
      baselineFreight: 1274,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-jebel-ali-40gp',
      originPort: 'Shanghai',
      destinationCountry: 'UAE',
      destinationPort: 'Jebel Ali',
      containerType: '40GP',
      baselineFreight: 1885,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-jebel-ali-40hq',
      originPort: 'Shanghai',
      destinationCountry: 'UAE',
      destinationPort: 'Jebel Ali',
      containerType: '40HQ',
      baselineFreight: 1987,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-dammam-20gp',
      originPort: 'Shanghai',
      destinationCountry: 'SA',
      destinationPort: 'Dammam',
      containerType: '20GP',
      baselineFreight: 1202,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-dammam-40gp',
      originPort: 'Shanghai',
      destinationCountry: 'SA',
      destinationPort: 'Dammam',
      containerType: '40GP',
      baselineFreight: 1753,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-dammam-40hq',
      originPort: 'Shanghai',
      destinationCountry: 'SA',
      destinationPort: 'Dammam',
      containerType: '40HQ',
      baselineFreight: 1855,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-shuaiba-20gp',
      originPort: 'Shanghai',
      destinationCountry: 'KW',
      destinationPort: 'Shuaiba',
      containerType: '20GP',
      baselineFreight: 1223,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-shuaiba-40gp',
      originPort: 'Shanghai',
      destinationCountry: 'KW',
      destinationPort: 'Shuaiba',
      containerType: '40GP',
      baselineFreight: 1783,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-shuaiba-40hq',
      originPort: 'Shanghai',
      destinationCountry: 'KW',
      destinationPort: 'Shuaiba',
      containerType: '40HQ',
      baselineFreight: 1885,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-hamad-20gp',
      originPort: 'Shanghai',
      destinationCountry: 'QA',
      destinationPort: 'Hamad',
      containerType: '20GP',
      baselineFreight: 1243,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-hamad-40gp',
      originPort: 'Shanghai',
      destinationCountry: 'QA',
      destinationPort: 'Hamad',
      containerType: '40GP',
      baselineFreight: 1814,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-hamad-40hq',
      originPort: 'Shanghai',
      destinationCountry: 'QA',
      destinationPort: 'Hamad',
      containerType: '40HQ',
      baselineFreight: 1916,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-sohar-20gp',
      originPort: 'Shanghai',
      destinationCountry: 'OM',
      destinationPort: 'Sohar',
      containerType: '20GP',
      baselineFreight: 1172,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-sohar-40gp',
      originPort: 'Shanghai',
      destinationCountry: 'OM',
      destinationPort: 'Sohar',
      containerType: '40GP',
      baselineFreight: 1712,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-sohar-40hq',
      originPort: 'Shanghai',
      destinationCountry: 'OM',
      destinationPort: 'Sohar',
      containerType: '40HQ',
      baselineFreight: 1814,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-jebel-ali-20gp',
      originPort: 'Shanghai',
      destinationCountry: 'UAE',
      destinationPort: 'Jebel Ali',
      containerType: '20GP',
      baselineFreight: 1168,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-jebel-ali-40gp',
      originPort: 'Shanghai',
      destinationCountry: 'UAE',
      destinationPort: 'Jebel Ali',
      containerType: '40GP',
      baselineFreight: 1729,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-jebel-ali-40hq',
      originPort: 'Shanghai',
      destinationCountry: 'UAE',
      destinationPort: 'Jebel Ali',
      containerType: '40HQ',
      baselineFreight: 1823,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-dammam-20gp',
      originPort: 'Shanghai',
      destinationCountry: 'SA',
      destinationPort: 'Dammam',
      containerType: '20GP',
      baselineFreight: 1103,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-dammam-40gp',
      originPort: 'Shanghai',
      destinationCountry: 'SA',
      destinationPort: 'Dammam',
      containerType: '40GP',
      baselineFreight: 1608,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-dammam-40hq',
      originPort: 'Shanghai',
      destinationCountry: 'SA',
      destinationPort: 'Dammam',
      containerType: '40HQ',
      baselineFreight: 1701,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-shuaiba-20gp',
      originPort: 'Shanghai',
      destinationCountry: 'KW',
      destinationPort: 'Shuaiba',
      containerType: '20GP',
      baselineFreight: 1122,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-shuaiba-40gp',
      originPort: 'Shanghai',
      destinationCountry: 'KW',
      destinationPort: 'Shuaiba',
      containerType: '40GP',
      baselineFreight: 1636,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-shuaiba-40hq',
      originPort: 'Shanghai',
      destinationCountry: 'KW',
      destinationPort: 'Shuaiba',
      containerType: '40HQ',
      baselineFreight: 1729,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-hamad-20gp',
      originPort: 'Shanghai',
      destinationCountry: 'QA',
      destinationPort: 'Hamad',
      containerType: '20GP',
      baselineFreight: 1140,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-hamad-40gp',
      originPort: 'Shanghai',
      destinationCountry: 'QA',
      destinationPort: 'Hamad',
      containerType: '40GP',
      baselineFreight: 1664,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-hamad-40hq',
      originPort: 'Shanghai',
      destinationCountry: 'QA',
      destinationPort: 'Hamad',
      containerType: '40HQ',
      baselineFreight: 1757,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-sohar-20gp',
      originPort: 'Shanghai',
      destinationCountry: 'OM',
      destinationPort: 'Sohar',
      containerType: '20GP',
      baselineFreight: 1075,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-sohar-40gp',
      originPort: 'Shanghai',
      destinationCountry: 'OM',
      destinationPort: 'Sohar',
      containerType: '40GP',
      baselineFreight: 1570,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-17',
      routeKey: 'shanghai-sohar-40hq',
      originPort: 'Shanghai',
      destinationCountry: 'OM',
      destinationPort: 'Sohar',
      containerType: '40HQ',
      baselineFreight: 1664,
      sourceUrl: CCFI_URL,
    },
  ])
})

test('saveFreightRows batches the full normalized dataset into one upsert', async () => {
  const normalized: FreightNormalizedRow[] = [
    {
      date: '2026-04-10',
      routeKey: 'shanghai-jebel-ali-20gp',
      originPort: 'Shanghai',
      destinationCountry: 'UAE',
      destinationPort: 'Jebel Ali',
      containerType: '20GP',
      baselineFreight: 1250,
      sourceUrl: CCFI_URL,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-jebel-ali-40hq',
      originPort: 'Shanghai',
      destinationCountry: 'UAE',
      destinationPort: 'Jebel Ali',
      containerType: '40HQ',
      baselineFreight: 1520,
      sourceUrl: CCFI_URL,
    },
  ]

  const calls: unknown[] = []
  const db = {
    from(table: string) {
      calls.push(table)
      return {
        async upsert(rows: unknown[], options: { onConflict: string }) {
          calls.push({ rows, options })
          return { error: null }
        },
      }
    },
  }

  const result = await saveFreightRows(normalized, db)

  assert.deepEqual(result, { saved: 2 })
  assert.equal(calls.length, 2)
  assert.equal(calls[0], 'freight_rates')

  const writeCall = calls[1] as { rows: Array<{ fetched_at: string }>; options: { onConflict: string } }
  assert.equal(writeCall.options.onConflict, 'date,route_key')
  assert.equal(writeCall.rows.length, 2)
  assert.deepEqual(
    writeCall.rows.map((row) => ({ ...row, fetched_at: '<dynamic>' })),
    [
      {
        date: '2026-04-10',
        route_key: 'shanghai-jebel-ali-20gp',
        origin_port: 'Shanghai',
        destination_country: 'UAE',
        destination_port: 'Jebel Ali',
        container_type: '20GP',
        baseline_freight: 1250,
        source_url: CCFI_URL,
        fetched_at: '<dynamic>',
      },
      {
        date: '2026-04-10',
        route_key: 'shanghai-jebel-ali-40hq',
        origin_port: 'Shanghai',
        destination_country: 'UAE',
        destination_port: 'Jebel Ali',
        container_type: '40HQ',
        baseline_freight: 1520,
        source_url: CCFI_URL,
        fetched_at: '<dynamic>',
      },
    ],
  )
})

test('saveFreightRows returns zero without touching the database for empty input', async () => {
  let called = false
  const db = {
    from() {
      called = true
      return {
        async upsert() {
          return { error: null }
        },
      }
    },
  }

  const result = await saveFreightRows([], db)

  assert.deepEqual(result, { saved: 0 })
  assert.equal(called, false)
})

test('saveFreightRows throws on duplicate date and route combinations', async () => {
  await assert.rejects(
    () =>
      saveFreightRows([
        {
          date: '2026-04-10',
          routeKey: 'shanghai-jebel-ali-20gp',
          originPort: 'Shanghai',
          destinationCountry: 'UAE',
          destinationPort: 'Jebel Ali',
          containerType: '20GP',
          baselineFreight: 1250,
          sourceUrl: CCFI_URL,
        },
        {
          date: '2026-04-10',
          routeKey: 'shanghai-jebel-ali-20gp',
          originPort: 'Shanghai',
          destinationCountry: 'UAE',
          destinationPort: 'Jebel Ali',
          containerType: '20GP',
          baselineFreight: 1260,
          sourceUrl: CCFI_URL,
        },
      ]),
    /duplicate date:routeKey pairs/,
  )
})

test('saveFreightRows throws when the database upsert fails', async () => {
  const db = {
    from() {
      return {
        async upsert() {
          return { error: { message: 'db down' } }
        },
      }
    },
  }

  await assert.rejects(
    () =>
      saveFreightRows([
        {
          date: '2026-04-10',
          routeKey: 'shanghai-jebel-ali-20gp',
          originPort: 'Shanghai',
          destinationCountry: 'UAE',
          destinationPort: 'Jebel Ali',
          containerType: '20GP',
          baselineFreight: 1250,
          sourceUrl: CCFI_URL,
        },
      ], db),
    /Freight save failed: db down/,
  )
})
