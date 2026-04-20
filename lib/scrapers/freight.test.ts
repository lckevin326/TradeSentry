import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import {
  parseFreightWeeklyHtml,
  normalizeFreightRows,
  saveFreightRows,
} from './freight'

const fixtureUrl = new URL('./fixtures/freight-weekly.html', import.meta.url)
const fixtureHtml = readFileSync(fixtureUrl, 'utf8')
const sourceUrl = 'https://source.example/weekly-freight'

test('freight parser extracts the weekly report date and raw row payloads', () => {
  const parsed = parseFreightWeeklyHtml(fixtureHtml, sourceUrl)

  assert.equal(parsed.reportDate, '2026-04-10')
  assert.equal(parsed.rows.length, 3)
  assert.deepEqual(parsed.rows[0], {
    reportDate: '2026-04-10',
    originPort: 'Shanghai',
    destinationCountry: 'UAE',
    destinationPort: 'Jebel Ali',
    containerType: '20GP',
    baselineFreight: 1250,
    sourceUrl,
  })
})

test('freight normalizer converts rows into route/date/container records', () => {
  const parsed = parseFreightWeeklyHtml(fixtureHtml, sourceUrl)
  const normalized = normalizeFreightRows(parsed.rows, parsed.reportDate, sourceUrl)

  assert.deepEqual(normalized, [
    {
      date: '2026-04-10',
      routeKey: 'shanghai-jebel-ali-20gp',
      originPort: 'Shanghai',
      destinationCountry: 'UAE',
      destinationPort: 'Jebel Ali',
      containerType: '20GP',
      baselineFreight: 1250,
      sourceUrl,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-jebel-ali-40hq',
      originPort: 'Shanghai',
      destinationCountry: 'UAE',
      destinationPort: 'Jebel Ali',
      containerType: '40HQ',
      baselineFreight: 1520,
      sourceUrl,
    },
    {
      date: '2026-04-10',
      routeKey: 'shanghai-dammam-40gp',
      originPort: 'Shanghai',
      destinationCountry: 'SA',
      destinationPort: 'Dammam',
      containerType: '40GP',
      baselineFreight: 980,
      sourceUrl,
    },
  ])
})

test('freight parser falls back to header labels when columns are reordered', () => {
  const fallbackFixtureUrl = new URL('./fixtures/freight-weekly-reordered.html', import.meta.url)
  const fallbackHtml = readFileSync(fallbackFixtureUrl, 'utf8')
  const parsed = parseFreightWeeklyHtml(fallbackHtml, sourceUrl)

  assert.equal(parsed.reportDate, '2026-04-17')
  assert.deepEqual(parsed.rows, [
    {
      reportDate: '2026-04-17',
      originPort: 'Shanghai',
      destinationCountry: 'UAE',
      destinationPort: 'Jebel Ali',
      containerType: '20GP',
      baselineFreight: 1330,
      sourceUrl,
    },
    {
      reportDate: '2026-04-17',
      originPort: 'Shanghai',
      destinationCountry: 'SA',
      destinationPort: 'Dammam',
      containerType: '40HQ',
      baselineFreight: 1010,
      sourceUrl,
    },
  ])
})

test('freight save batches the full normalized dataset into one upsert', async () => {
  const normalized = normalizeFreightRows(
    [
      {
        reportDate: '2026-04-10',
        originPort: 'Shanghai',
        destinationCountry: 'UAE',
        destinationPort: 'Jebel Ali',
        containerType: '20GP',
        baselineFreight: 1250,
        sourceUrl,
      },
      {
        reportDate: '2026-04-10',
        originPort: 'Shanghai',
        destinationCountry: 'UAE',
        destinationPort: 'Jebel Ali',
        containerType: '40HQ',
        baselineFreight: 1520,
        sourceUrl,
      },
    ],
    '2026-04-10',
    sourceUrl,
  )

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
    writeCall.rows.map(row => ({ ...row, fetched_at: '<dynamic>' })),
    [
      {
        date: '2026-04-10',
        route_key: 'shanghai-jebel-ali-20gp',
        origin_port: 'Shanghai',
        destination_country: 'UAE',
        destination_port: 'Jebel Ali',
        container_type: '20GP',
        baseline_freight: 1250,
        source_url: sourceUrl,
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
        source_url: sourceUrl,
        fetched_at: '<dynamic>',
      },
    ],
  )
})
