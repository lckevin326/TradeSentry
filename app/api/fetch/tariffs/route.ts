import { fetchAndSaveTariffs } from '@/lib/scrapers/tariffs'
import { NextResponse } from 'next/server'

async function handler() {
  try {
    const result = await fetchAndSaveTariffs()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

// GET: called by Vercel Cron
export const GET = handler
// POST: called manually / from other routes
export const POST = handler
