import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getPageAccounts,
} from '@/lib/marketing/meta-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/marketing/settings?error=${encodeURIComponent(error)}`, request.url),
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/marketing/settings?error=no_code', request.url),
    )
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/marketing/settings?error=not_authenticated', request.url))
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/marketing/meta/callback`

    // Exchange code for short-lived token
    const shortLived = await exchangeCodeForToken(code, redirectUri)

    // Exchange for long-lived token (60-day expiry)
    const longLived = await exchangeForLongLivedToken(shortLived.access_token)
    const tokenExpiresAt = new Date(Date.now() + longLived.expires_in * 1000).toISOString()

    // Fetch managed pages and their Instagram business accounts
    const pages = await getPageAccounts(longLived.access_token)

    // Store each page as a facebook account, and its IG business account if linked
    for (const page of pages) {
      // Facebook Page
      await supabase.from('marketing_social_accounts').upsert(
        {
          platform: 'facebook',
          platform_account_id: page.id,
          account_name: page.name,
          access_token: page.access_token, // Page tokens don't expire when derived from long-lived user token
          refresh_token: longLived.access_token, // Store user token for refresh
          token_expires_at: tokenExpiresAt,
          scopes: ['pages_manage_posts', 'pages_read_engagement', 'read_insights'],
          metadata: { page_id: page.id, user_token: longLived.access_token },
          status: 'connected',
          connected_by: user.id,
        },
        { onConflict: 'platform,platform_account_id' },
      )

      // Instagram Business Account (if linked)
      if (page.instagram_business_account?.id) {
        await supabase.from('marketing_social_accounts').upsert(
          {
            platform: 'instagram',
            platform_account_id: page.instagram_business_account.id,
            account_name: `${page.name} (Instagram)`,
            access_token: page.access_token,
            refresh_token: longLived.access_token,
            token_expires_at: tokenExpiresAt,
            scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'],
            metadata: {
              ig_business_id: page.instagram_business_account.id,
              page_id: page.id,
              page_access_token: page.access_token,
            },
            status: 'connected',
            connected_by: user.id,
          },
          { onConflict: 'platform,platform_account_id' },
        )
      }
    }

    return NextResponse.redirect(
      new URL('/marketing/settings?connected=meta', request.url),
    )
  } catch (err: unknown) {
    console.error('Meta callback error:', err)
    const msg = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.redirect(
      new URL(`/marketing/settings?error=${encodeURIComponent(msg)}`, request.url),
    )
  }
}
