import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

type TariffRow = {
  hs_code: string
  country: string
}

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json([])
  }

  const { searchParams } = new URL(req.url)
  const country = searchParams.get('country')
  const hs_code = searchParams.get('hs_code')

  let query = supabase
    .from('tariffs')
    .select('id, hs_code, country, rate_pct, prev_rate_pct, effective_date, changed, fetched_at')
    .order('fetched_at', { ascending: false })

  if (country) query = query.eq('country', country)
  if (hs_code) query = query.eq('hs_code', hs_code)

  const { data, error } = await query.limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 去重：每组取最新
  const seen = new Set<string>()
  const latest = ((data ?? []) as TariffRow[]).filter(row => {
    const key = `${row.hs_code}-${row.country}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json(latest)
}
