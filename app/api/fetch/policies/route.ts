import { fetchAndSavePolicies } from '@/lib/scrapers/policies'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const result = await fetchAndSavePolicies()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
