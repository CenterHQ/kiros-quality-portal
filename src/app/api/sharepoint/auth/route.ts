import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/microsoft-graph'

export async function GET(request: NextRequest) {
  // Debug mode: check env vars are set
  const debug = request.nextUrl.searchParams.get('debug')
  if (debug === '1') {
    return NextResponse.json({
      hasClientId: !!process.env.MICROSOFT_CLIENT_ID,
      clientIdPrefix: process.env.MICROSOFT_CLIENT_ID?.substring(0, 8) || 'NOT SET',
      hasTenantId: !!process.env.MICROSOFT_TENANT_ID,
      tenantIdPrefix: process.env.MICROSOFT_TENANT_ID?.substring(0, 8) || 'NOT SET',
      hasClientSecret: !!process.env.MICROSOFT_CLIENT_SECRET,
      secretLength: process.env.MICROSOFT_CLIENT_SECRET?.length || 0,
    })
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://kiros-quality-portal.vercel.app'}/api/sharepoint/callback`
    const authUrl = await getAuthUrl(redirectUri)
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('SharePoint auth error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
