import { NextRequest, NextResponse } from 'next/server'
import { syncAllDocuments } from '@/lib/document-sync'

export const maxDuration = 120

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (or allow in development)
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await syncAllDocuments()
  return NextResponse.json(result)
}
