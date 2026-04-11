import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getMetaAuthUrl } from '@/lib/marketing/meta-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/marketing/meta/callback`
    const state = randomBytes(16).toString('hex')
    const authUrl = getMetaAuthUrl(redirectUri, state)
    return NextResponse.redirect(authUrl)
  } catch (error: unknown) {
    console.error('Meta auth error:', error)
    const msg = error instanceof Error ? error.message : 'Authentication failed'
    return NextResponse.redirect(
      new URL(`/marketing/settings?error=${encodeURIComponent(msg)}`, request.url),
    )
  }
}
