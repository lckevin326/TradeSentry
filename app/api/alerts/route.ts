import { isSupabaseConfigured, supabase, supabaseAdmin } from '../../../lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json([])
  }

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false, error: 'Supabase 环境变量缺失' }, { status: 503 })
  }

  const { id } = await req.json()
  const { error } = await supabaseAdmin
    .from('alerts')
    .update({ is_read: true })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
