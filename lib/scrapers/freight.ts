import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'
import type { Cheerio, CheerioAPI } from 'cheerio'

import {
  type FreightContainerType,
  type FreightCountry,
  type FreightRouteKey,
  getFreightRouteKey,
} from '../freight/constants'

const FREIGHT_TABLE = 'freight_rates'

type FreightWriteRow = {
  date: string
  route_key: FreightRouteKey
  origin_port: string
  destination_country: FreightCountry
  destination_port: 'Jebel Ali' | 'Dammam'
  container_type: FreightContainerType
  baseline_freight: number
  source_url: string
  fetched_at: string
}

type FreightDbClient = {
  from(table: string): {
    upsert(rows: FreightWriteRow[], options: { onConflict: string }): Promise<{ error: { message: string } | null }>
  }
}

function getFreightSourceUrl(): string {
  const sourceUrl = process.env.FREIGHT_SOURCE_URL
  if (!sourceUrl) {
    throw new Error('FREIGHT_SOURCE_URL is not configured')
  }
  return sourceUrl
}

function extractReportDate($: CheerioAPI): string {
  const directDate = $('[data-report-date]').first().attr('data-report-date')
  if (directDate && /^\d{4}-\d{2}-\d{2}$/.test(directDate)) {
    return directDate
  }

  const timeDate = $('time[datetime]').first().attr('datetime')
  if (timeDate) {
    const matched = timeDate.match(/\d{4}-\d{2}-\d{2}/)
    if (matched) return matched[0]
  }

  const text = $('body').text()
  const textMatch = text.match(/(?:Week ending|Updated|As of)\s*(\d{4}-\d{2}-\d{2})/i)
  if (textMatch) {
    return textMatch[1]
  }

  throw new Error('Unable to extract freight report date')
}

function parseFreightAmount(raw: string | null | undefined): number {
  if (!raw) {
    throw new Error('Missing baseline freight value')
  }

  const numeric = raw.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
  if (!numeric) {
    throw new Error(`Invalid baseline freight value: ${raw}`)
  }

  const value = Number.parseFloat(numeric[0])
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid baseline freight value: ${raw}`)
  }

  return value
}

function parseContainerType(raw: string | null | undefined): FreightContainerType {
  if (raw === '20GP' || raw === '40GP' || raw === '40HQ') {
    return raw
  }

  throw new Error(`Unsupported container type: ${raw ?? 'unknown'}`)
}

function parseDestinationCountry(raw: string | null | undefined): FreightCountry {
  if (raw === 'UAE' || raw === 'SA') {
    return raw
  }

  throw new Error(`Unsupported destination country: ${raw ?? 'unknown'}`)
}

function parseDestinationPort(raw: string | null | undefined): 'Jebel Ali' | 'Dammam' {
  if (raw === 'Jebel Ali' || raw === 'Dammam') {
    return raw
  }

  throw new Error(`Unsupported destination port: ${raw ?? 'unknown'}`)
}

function normalizeHeader(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function headerIndexFor(headerText: string): 'originPort' | 'destinationCountry' | 'destinationPort' | 'containerType' | 'baselineFreight' | null {
  const header = normalizeHeader(headerText)

  if (/(origin|from|loading port)/.test(header)) return 'originPort'
  if (/(destination country|country)/.test(header)) return 'destinationCountry'
  if (/(destination port|port of discharge|discharge|destination)/.test(header)) return 'destinationPort'
  if (/(container|equipment|box)/.test(header)) return 'containerType'
  if (/(freight|rate|price|amount)/.test(header)) return 'baselineFreight'

  return null
}

function buildHeaderMap(
  $: CheerioAPI,
  table: Cheerio<AnyNode>,
): Partial<Record<'originPort' | 'destinationCountry' | 'destinationPort' | 'containerType' | 'baselineFreight', number>> {
  const headerCells = table.find('thead th').toArray()
  const cells = headerCells.length > 0 ? headerCells : table.find('tr').first().find('th').toArray()
  const map: Partial<Record<'originPort' | 'destinationCountry' | 'destinationPort' | 'containerType' | 'baselineFreight', number>> = {}

  cells.forEach((cell, index) => {
    const key = headerIndexFor($(cell).text())
    if (key && map[key] === undefined) {
      map[key] = index
    }
  })

  return map
}

function cellAt(cells: string[], index: number | undefined): string | undefined {
  if (index === undefined) return undefined
  const value = cells[index]?.trim()
  return value ? value : undefined
}

function findFreightCell(cells: string[]): string | undefined {
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const value = cells[index]?.trim()
    if (value && /\d/.test(value)) {
      return value
    }
  }

  return undefined
}

function getTableRows(table: Cheerio<AnyNode>, $: CheerioAPI): Cheerio<AnyNode> {
  const bodyRows = table.find('tbody tr')
  if (bodyRows.length > 0) {
    return bodyRows
  }

  return table
    .find('tr')
    .filter((_, row) => $(row).find('td').length > 0)
}

export interface FreightParsedRow {
  reportDate: string
  originPort: string
  destinationCountry: FreightCountry
  destinationPort: 'Jebel Ali' | 'Dammam'
  containerType: FreightContainerType
  baselineFreight: number
  sourceUrl: string
}

export interface FreightWeeklyReport {
  reportDate: string
  rows: FreightParsedRow[]
}

export interface FreightNormalizedRow extends Omit<FreightParsedRow, 'reportDate'> {
  date: string
  routeKey: FreightRouteKey
}

export function parseFreightWeeklyHtml(html: string, sourceUrl: string): FreightWeeklyReport {
  const $ = cheerio.load(html)
  const reportDate = extractReportDate($)
  const rows: FreightParsedRow[] = []

  $('table').each((_, tableElement: AnyNode) => {
    const table = $(tableElement)
    const headerMap = buildHeaderMap($, table)

    getTableRows(table, $).each((_, element: AnyNode) => {
      const row = $(element)
      const cells = row.find('td').toArray().map((cell: AnyNode) => $(cell).text().trim())

      if (cells.length === 0) {
        return
      }

      const originPort = row.attr('data-origin-port')?.trim() || cellAt(cells, headerMap.originPort) || cellAt(cells, 0) || 'Shanghai'
      const destinationCountryRaw =
        row.attr('data-destination-country')?.trim() ||
        cellAt(cells, headerMap.destinationCountry) ||
        cellAt(cells, 1)
      const destinationPortRaw =
        row.attr('data-destination-port')?.trim() ||
        cellAt(cells, headerMap.destinationPort) ||
        cellAt(cells, 2)
      const containerTypeRaw =
        row.attr('data-container-type')?.trim() ||
        cellAt(cells, headerMap.containerType) ||
        cellAt(cells, 3)
      const freightRaw =
        row.attr('data-baseline-freight')?.trim() ||
        cellAt(cells, headerMap.baselineFreight) ||
        findFreightCell(cells)

      if (!destinationCountryRaw || !destinationPortRaw || !containerTypeRaw || !freightRaw) {
        return
      }

      rows.push({
        reportDate,
        originPort,
        destinationCountry: parseDestinationCountry(destinationCountryRaw),
        destinationPort: parseDestinationPort(destinationPortRaw),
        containerType: parseContainerType(containerTypeRaw),
        baselineFreight: parseFreightAmount(freightRaw),
        sourceUrl,
      })
    })
  })

  if (rows.length === 0) {
    throw new Error('No freight rows found in source HTML')
  }

  return { reportDate, rows }
}

export function normalizeFreightRows(
  rows: FreightParsedRow[],
  date: string,
  sourceUrl: string,
): FreightNormalizedRow[] {
  return rows.map(row => {
    const routeKey = getFreightRouteKey({
      destinationCountry: row.destinationCountry,
      originPort: row.originPort as 'Shanghai',
      destinationPort: row.destinationPort,
      containerType: row.containerType,
    })

    if (!routeKey) {
      throw new Error(
        `Unsupported freight route: ${row.originPort} -> ${row.destinationPort} / ${row.containerType}`,
      )
    }

    return {
      originPort: row.originPort,
      destinationCountry: row.destinationCountry,
      destinationPort: row.destinationPort,
      containerType: row.containerType,
      baselineFreight: row.baselineFreight,
      sourceUrl,
      date,
      routeKey,
    }
  })
}

export async function saveFreightRows(
  records: FreightNormalizedRow[],
  db?: FreightDbClient,
): Promise<{ saved: number }> {
  if (records.length === 0) {
    return { saved: 0 }
  }

  const client = db ?? (await import('../supabase')).supabaseAdmin
  const fetchedAt = new Date().toISOString()
  const payload = Array.from(
    new Map(
      records.map(record => [
        `${record.date}:${record.routeKey}`,
        {
          date: record.date,
          route_key: record.routeKey,
          origin_port: record.originPort,
          destination_country: record.destinationCountry,
          destination_port: record.destinationPort,
          container_type: record.containerType,
          baseline_freight: record.baselineFreight,
          source_url: record.sourceUrl,
          fetched_at: fetchedAt,
        } satisfies FreightWriteRow,
      ]),
    ).values(),
  )

  const { error } = await client.from(FREIGHT_TABLE).upsert(payload, { onConflict: 'date,route_key' })
  if (error) {
    throw new Error(`Freight save failed: ${error.message}`)
  }

  return { saved: payload.length }
}

export async function fetchAndSaveFreight(): Promise<{ scanned: number; saved: number; reportDate: string }> {
  const sourceUrl = getFreightSourceUrl()
  const response = await fetch(sourceUrl)
  if (!response.ok) {
    throw new Error(`Freight source error: ${response.status}`)
  }

  const html = await response.text()
  const parsed = parseFreightWeeklyHtml(html, sourceUrl)
  const normalized = normalizeFreightRows(parsed.rows, parsed.reportDate, sourceUrl)
  const { saved } = await saveFreightRows(normalized)

  return { scanned: normalized.length, saved, reportDate: parsed.reportDate }
}
