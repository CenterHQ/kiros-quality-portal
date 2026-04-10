import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromCode, getAppToken, getSiteId, getDriveId } from '@/lib/microsoft-graph'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/admin/sharepoint?error=no_code', request.url))
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://kiros-quality-portal.vercel.app'}/api/sharepoint/callback`

    // Complete the user auth flow (validates the user is who they say they are)
    await getTokenFromCode(code, redirectUri)

    // Use app-only token for Graph API calls (uses Application permissions)
    const appToken = await getAppToken()

    // Get SharePoint site and drive IDs using app token
    const siteId = await getSiteId(appToken)
    const driveId = await getDriveId(appToken, siteId)

    // Store connection in database
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/admin/sharepoint?error=not_authenticated', request.url))

    // Upsert connection (only one active connection)
    // Store app token instead of user token - it's more reliable for background access
    const { error: dbError } = await supabase.from('sharepoint_connection').upsert({
      id: 'f0000000-0000-4000-8000-000000000001',
      tenant_id: process.env.MICROSOFT_TENANT_ID!,
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      site_id: siteId,
      drive_id: driveId,
      access_token: appToken,
      refresh_token: '__app_credentials__',
      token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      connected_by: user?.id,
      site_url: process.env.MICROSOFT_SHAREPOINT_SITE_URL || 'https://kirosgroup.sharepoint.com/sites/operations',
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
