export type Currency = 'AED' | 'SAR' | 'KWD' | 'QAR' | 'BHD' | 'OMR'
export type Country = 'UAE' | 'SA' | 'KW' | 'QA' | 'BH' | 'OM'
export type AlertType = 'tariff_change' | 'rate_spike' | 'new_policy'
export type Severity = 'high' | 'medium' | 'low'
export type PolicySource = 'mofcom' | 'wto'

export interface ExchangeRate {
  id: string
  date: string
  base: string
  target: Currency
  rate: number
  change_pct: number | null
  created_at: string
}

export interface Tariff {
  id: string
  hs_code: string
  country: Country
  rate_pct: number
  prev_rate_pct: number | null
  effective_date: string | null
  changed: boolean
  source_url: string | null
  fetched_at: string
}

export interface Policy {
  id: string
  title: string
  summary: string | null
  source: PolicySource
  country: string | null
  published_at: string
  url: string
  keywords: string[]
  is_relevant: boolean
  created_at: string
}

export interface Alert {
  id: string
  type: AlertType
  ref_table: string | null
  ref_id: string | null
  severity: Severity
  message: string
  is_read: boolean
  created_at: string
}
