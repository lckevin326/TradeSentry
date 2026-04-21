import { fetchAndSaveFreight } from '../../../../lib/scrapers/freight'
import { formatFreightStorageError } from '../../../../lib/freight/storage-error'
import { NextResponse } from 'next/server'

export async function postFetchFreightRequest(
  runFetchAndSaveFreight: typeof fetchAndSaveFreight = fetchAndSaveFreight,
) {
  try {
    const result = await runFetchAndSaveFreight()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = formatFreightStorageError(err instanceof Error ? err.message : 'Unknown error')
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

// GET: called by Vercel Cron
export async function GET() {
  return postFetchFreightRequest()
}
// POST: called manually / from other routes
export async function POST() {
  return postFetchFreightRequest()
}
