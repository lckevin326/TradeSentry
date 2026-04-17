export const CURRENT_TIRE_HS_CODES = ['401110', '401120', '401140', '401150', '401170', '401180'] as const

export const DEFAULT_EXPORT_REBATE_RATE_PCT = 0

export const EXPORT_REBATE_FALLBACK_HS_CODES = ['401150'] as const

export const EXPORT_REBATE_SOURCE_NOTE =
  'Manual source path: replace the fixture below from the official export rebate table when a live source is added.'

const EXPORT_REBATE_RATE_FIXTURE: Partial<Record<(typeof CURRENT_TIRE_HS_CODES)[number], number>> = {
  401110: 13,
  401120: 13,
  401140: 13,
  401170: 13,
  401180: 13,
  // 401150 is intentionally left out to exercise the fallback path until a real source is wired up.
}

const CURRENT_TIRE_HS_CODE_SET = new Set<string>(CURRENT_TIRE_HS_CODES)
const EXPORT_REBATE_FALLBACK_HS_CODE_SET = new Set<string>(EXPORT_REBATE_FALLBACK_HS_CODES)

export type ExportRebateRateLookupResult = {
  hsCode: string
  normalizedHsCode: string
  ratePct: number
  source: 'fixture' | 'fallback'
}

function normalizeHsCode(hsCode: string): string {
  return hsCode.trim().replace(/[^\d]/g, '')
}

export function getExportRebateRateByHsCode(hsCode: string): ExportRebateRateLookupResult {
  const normalizedHsCode = normalizeHsCode(hsCode)

  if (!CURRENT_TIRE_HS_CODE_SET.has(normalizedHsCode)) {
    throw new RangeError(`Unsupported tire HS code: ${hsCode}`)
  }

  const fixtureRate = EXPORT_REBATE_RATE_FIXTURE[normalizedHsCode as keyof typeof EXPORT_REBATE_RATE_FIXTURE]

  if (fixtureRate !== undefined) {
    return {
      hsCode,
      normalizedHsCode,
      ratePct: fixtureRate,
      source: 'fixture',
    }
  }

  if (!EXPORT_REBATE_FALLBACK_HS_CODE_SET.has(normalizedHsCode)) {
    throw new RangeError(`Missing export rebate fixture for supported tire HS code: ${hsCode}`)
  }

  return {
    hsCode,
    normalizedHsCode,
    ratePct: DEFAULT_EXPORT_REBATE_RATE_PCT,
    source: 'fallback',
  }
}
