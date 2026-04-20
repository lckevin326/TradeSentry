import { load } from 'cheerio'

export const CCFI_URL = 'https://www.sse.net.cn/index/singleIndex?indexType=ccfi'
export const CCFI_PERSIAN_GULF_ROUTE = 'PERSIAN GULF/RED SEA SERVICE'

const DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/g
const NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/

export interface PersianGulfCcfiSnapshot {
  routeName: string
  previousDate: string
  currentDate: string
  previousIndex: number
  currentIndex: number
  changePct: number
}

export async function fetchCcfiPageHtml(fetcher: typeof fetch = fetch): Promise<string> {
  const response = await fetcher(CCFI_URL, {
    headers: {
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch CCFI page: ${response.status}`)
  }

  return response.text()
}

function parseCcfiNumber(raw: string | undefined): number {
  const normalized = raw?.trim() ?? ''
  if (!NUMBER_PATTERN.test(normalized)) {
    throw new Error(`Unable to parse CCFI number from ${raw ?? 'unknown value'}`)
  }

  const value = Number.parseFloat(normalized)
  if (!Number.isFinite(value)) {
    throw new Error(`Unable to parse CCFI number from ${raw ?? 'unknown value'}`)
  }
  return value
}

export function parsePersianGulfCcfi(html: string): PersianGulfCcfiSnapshot {
  const $ = load(html)
  const tables = $('table').toArray()

  for (const table of tables) {
    const rows = $(table).find('tr').toArray()
    let previousDate: string | null = null
    let currentDate: string | null = null

    for (const row of rows) {
      const dates = $(row).text().match(DATE_PATTERN)
      if (dates && dates.length >= 2) {
        previousDate = dates[0] ?? null
        currentDate = dates[1] ?? null
        break
      }
    }

    if (!previousDate || !currentDate) {
      continue
    }

    for (const row of rows) {
      const cells = $(row)
        .find('th, td')
        .toArray()
        .map((cell) => $(cell).text().replace(/\s+/g, ' ').trim())
        .filter(Boolean)

      if (cells.length < 4 || !cells[0]?.includes(CCFI_PERSIAN_GULF_ROUTE)) {
        continue
      }

      return {
        routeName: CCFI_PERSIAN_GULF_ROUTE,
        previousDate,
        currentDate,
        previousIndex: parseCcfiNumber(cells[1]),
        currentIndex: parseCcfiNumber(cells[2]),
        changePct: parseCcfiNumber(cells[3]),
      }
    }
  }

  for (const row of $('tr').toArray()) {
    const cells = $(row)
      .find('th, td')
      .toArray()
      .map((cell) => $(cell).text().replace(/\s+/g, ' ').trim())
      .filter(Boolean)

    if (cells[0]?.includes(CCFI_PERSIAN_GULF_ROUTE)) {
      throw new Error(`Unable to bind CCFI dates to route row for ${CCFI_PERSIAN_GULF_ROUTE}`)
    }
  }

  throw new Error(`Unable to find route row for ${CCFI_PERSIAN_GULF_ROUTE}`)
}
