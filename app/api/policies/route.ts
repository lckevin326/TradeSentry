import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source')
  const relevantOnly = searchParams.get('relevant') !== 'false'

  let query = supabase
    .from('policies')
    .select('id, title, summary, source, country, published_at, url, keywords, is_relevant')
    .order('published_at', { ascending: false })
    .limit(50)

  if (relevantOnly) query = query.eq('is_relevant', true)
  if (source) query = query.eq('source', source)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
