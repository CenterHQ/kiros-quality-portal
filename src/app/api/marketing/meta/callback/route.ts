import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
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
    // Use cookie-based client for auth check only
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/marketing/settings?error=not_authenticated', request.url))
    }

    // Use service role client for DB writes (bypasses RLS — cookies can be lost after OAuth redirect)
    const serviceClient = createServiceRoleClient()

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/marketing/meta/callback`

    // Exchange code for short-lived token
    const shortLived = await exchangeCodeForToken(code, redirectUri)

    // Exchange for long-lived token (60-day expiry)
    const longLived = await exchangeForLongLivedToken(shortLived.access_token)
    const tokenExpiresAt = new Date(Date.now() + longLived.expires_in * 1000).toISOString()

    // Fetch managed pages and their Instagram business accounts
    const pages = await getPageAccounts(longLived.access_token)

    if (pages.length === 0) {
      return NextResponse.redirect(
        new URL('/marketing/settings?error=No+Facebook+Pages+found.+Make+sure+your+account+manages+at+least+one+Page.', request.url),
      )
    }

    const errors: string[] = []

    // Store each page as a facebook account, and its IG business account if linked
    for (const page of pages) {
      // Facebook Page
      const { error: fbErr } = await serviceClient.from('marketing_social_accounts').upsert(
        {
          platform: 'facebook',
          platform_account_id: page.id,
          account_name: page.name,
          access_token: page.access_token,
          refresh_token: longLived.access_token,
          token_expires_at: tokenExpiresAt,
          scopes: ['pages_show_list', 'pages_read_engagement', 'pages_messaging'],
          metadata: { page_id: page.id, user_token: longLived.access_token },
          status: 'connected',
          connected_by: user.id,
        },
        { onConflict: 'platform,platform_account_id' },
      )

      if (fbErr) {
        console.error('Failed to save Facebook account:', fbErr)
        errors.push(`Facebook (${page.name}): ${fbErr.message}`)
      }

      // Instagram Business Account (if linked)
      if (page.instagram_business_account?.id) {
        const { error: igErr } = await serviceClient.from('marketing_social_accounts').upsert(
          {
            platform: 'instagram',
            platform_account_id: page.instagram_business_account.id,
            account_name: `${page.name} (Instagram)`,
            access_token: page.access_token,
            refresh_token: longLived.access_token,
            token_expires_at: tokenExpiresAt,
            scopes: ['instagram_basic', 'instagram_manage_comments'],
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

        if (igErr) {
          console.error('Failed to save Instagram account:', igErr)
          errors.push(`Instagram: ${igErr.message}`)
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.redirect(
        new URL(`/marketing/settings?error=${encodeURIComponent(errors.join('; '))}`, request.url),
      )
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
