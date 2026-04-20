import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json([])
  }

  const { searchParams } = new URL(req.url)
  const target = searchParams.get('target') ?? 'AED'
  const days = parseInt(searchParams.get('days') ?? '30')

  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('date, rate, change_pct')
    .eq('target', target)
    .gte('date', since)
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
