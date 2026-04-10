import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/microsoft-graph'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://kiros-quality-portal.vercel.app'}/api/sharepoint/callback`
    const authUrl = await getAuthUrl(redirectUri)
    return NextResponse.redirect(authUrl)
  } catch (error: unknown) {
    console.error('SharePoint auth error:', error)
    const msg = error instanceof Error ? error.message : 'Authentication failed'
    return NextResponse.redirect(new URL(`/admin/sharepoint?error=${encodeURIComponent(msg)}`, request.url))
  }
}
