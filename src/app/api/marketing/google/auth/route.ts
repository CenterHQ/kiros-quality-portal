import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getGoogleAuthUrl } from '@/lib/marketing/google-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const state = randomBytes(16).toString('hex')
    const authUrl = getGoogleAuthUrl(state)
    return NextResponse.redirect(authUrl)
  } catch (error: unknown) {
    console.error('Google auth error:', error)
    const msg = error instanceof Error ? error.message : 'Authentication failed'
    return NextResponse.redirect(
      new URL(`/marketing/settings?error=${encodeURIComponent(msg)}`, request.url),
    )
  }
}
