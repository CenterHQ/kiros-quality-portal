import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/microsoft-graph'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Debug mode: check env vars and test credentials
  const debug = request.nextUrl.searchParams.get('debug')
  if (debug === '1') {
    const info: any = {
      hasClientId: !!process.env.MICROSOFT_CLIENT_ID,
      clientIdPrefix: process.env.MICROSOFT_CLIENT_ID?.substring(0, 8) || 'NOT SET',
      hasTenantId: !!process.env.MICROSOFT_TENANT_ID,
      tenantIdPrefix: process.env.MICROSOFT_TENANT_ID?.substring(0, 8) || 'NOT SET',
      hasClientSecret: !!process.env.MICROSOFT_CLIENT_SECRET,
      secretLength: process.env.MICROSOFT_CLIENT_SECRET?.length || 0,
      secretFirstChar: process.env.MICROSOFT_CLIENT_SECRET?.charAt(0) || 'N/A',
      secretLastChar: process.env.MICROSOFT_CLIENT_SECRET?.charAt((process.env.MICROSOFT_CLIENT_SECRET?.length || 1) - 1) || 'N/A',
    }

    // Test: try to get auth URL (this is what fails)
    try {
      const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://kiros-quality-portal.vercel.app'}/api/sharepoint/callback`
      const { getAuthUrl: testGetAuthUrl } = await import('@/lib/microsoft-graph')
      const url = await testGetAuthUrl(redirectUri)
      info.authUrlGenerated = true
      info.authUrlPrefix = url.substring(0, 80)
    } catch (e: any) {
      info.authUrlGenerated = false
      info.authError = e.message
      info.authErrorStack = e.stack?.split('\n').slice(0, 3)
    }

    // Test: direct token endpoint call to get better error
    try {
      const tokenUrl = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`
      const body = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      })
      const tokenRes = await fetch(tokenUrl, { method: 'POST', body })
      const tokenData = await tokenRes.json()
      if (tokenData.error) {
        info.directTokenTest = 'FAILED'
        info.tokenError = tokenData.error
        info.tokenErrorDesc = tokenData.error_description
      } else {
        info.directTokenTest = 'SUCCESS'
      }
    } catch (e: any) {
      info.directTokenTest = 'ERROR: ' + e.message
    }

    return NextResponse.json(info)
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
