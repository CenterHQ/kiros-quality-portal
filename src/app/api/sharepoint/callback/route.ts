import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromCode, getSiteId, getDriveId } from '@/lib/microsoft-graph'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/admin/sharepoint?error=no_code', request.url))
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://kiros-quality-portal.vercel.app'}/api/sharepoint/callback`
    const result = await getTokenFromCode(code, redirectUri)

    const accessToken = result.accessToken
    // MSAL v2 doesn't expose refresh token directly in the response object
    // We need to extract it from the token cache
    const msalClient = (await import('@/lib/microsoft-graph')).getMsalClient()
    const cache = msalClient.getTokenCache().serialize()
    const cacheData = JSON.parse(cache)
    const refreshTokens = cacheData.RefreshToken || {}
    const refreshToken = Object.values(refreshTokens)[0] as any
    const refreshTokenValue = refreshToken?.secret || ''

    // Get SharePoint site and drive IDs
    const siteId = await getSiteId(accessToken)
    const driveId = await getDriveId(accessToken, siteId)

    // Store connection in database
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Upsert connection (only one active connection)
    const { error: dbError } = await supabase.from('sharepoint_connection').upsert({
      id: '00000000-0000-4000-8000-sharepoint01',
      tenant_id: process.env.MICROSOFT_TENANT_ID!,
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      site_id: siteId,
      drive_id: driveId,
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      token_expires_at: result.expiresOn?.toISOString(),
      connected_by: user?.id,
      site_url: 'https://kirosgroup.sharepoint.com/sites/operations',
      status: 'connected',
    }, { onConflict: 'id' })

    if (dbError) {
      console.error('DB error storing connection:', dbError)
      return NextResponse.redirect(new URL('/admin/sharepoint?error=db_error', request.url))
    }

    return NextResponse.redirect(new URL('/admin/sharepoint?connected=true', request.url))
  } catch (error: any) {
    console.error('SharePoint callback error:', error)
    return NextResponse.redirect(new URL(`/admin/sharepoint?error=${encodeURIComponent(error.message)}`, request.url))
  }
}
