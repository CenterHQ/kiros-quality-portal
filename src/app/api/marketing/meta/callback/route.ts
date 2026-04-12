import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getPageAccounts,
  inspectToken,
  metaFetch,
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

    // Exchange for long-lived user token (60-day expiry)
    const longLived = await exchangeForLongLivedToken(shortLived.access_token)

    // Inspect the token to check granted scopes
    const tokenInfo = await inspectToken(longLived.access_token)
    const grantedScopes = tokenInfo?.scopes || []

    // Fetch managed pages and their Instagram business accounts
    // Page tokens from /me/accounts with a long-lived user token are permanent (never expire)
    const pages = await getPageAccounts(longLived.access_token)

    if (pages.length === 0) {
      // Fetch debug info to diagnose why no pages were returned
      const debugParts: string[] = [`Scopes: [${grantedScopes.join(', ')}]`]
      try {
        const me = await metaFetch<{ id: string; name: string }>(longLived.access_token, '/me?fields=id,name')
        debugParts.push(`User: ${me.name} (${me.id})`)
      } catch { /* ignore */ }

      // Fetch raw /me/accounts to see what Meta actually returns
      try {
        const rawAccounts = await metaFetch<Record<string, unknown>>(longLived.access_token, '/me/accounts')
        debugParts.push(`/me/accounts: ${JSON.stringify(rawAccounts)}`)
      } catch (e) {
        debugParts.push(`/me/accounts error: ${e instanceof Error ? e.message : String(e)}`)
      }

      // Check if user has businesses (Business Manager)
      try {
        const businesses = await metaFetch<Record<string, unknown>>(longLived.access_token, '/me/businesses?fields=id,name')
        debugParts.push(`/me/businesses: ${JSON.stringify(businesses)}`)
      } catch (e) {
        debugParts.push(`/me/businesses: ${e instanceof Error ? e.message : 'N/A'}`)
      }

      const errorMsg = `No Facebook Pages found. ${debugParts.join(' | ')}. During the OAuth dialog, make sure you select at least one Page to grant access to.`
      return NextResponse.redirect(
        new URL(`/marketing/settings?error=${encodeURIComponent(errorMsg)}`, request.url),
      )
    }

    const errors: string[] = []

    // Store each page as a facebook account, and its IG business account if linked
    for (const page of pages) {
      // Facebook Page — page tokens from long-lived user tokens are permanent (no expiry)
      const { error: fbErr } = await serviceClient.from('marketing_social_accounts').upsert(
        {
          platform: 'facebook',
          platform_account_id: page.id,
          account_name: page.name,
          access_token: page.access_token,
          refresh_token: longLived.access_token,
          token_expires_at: null,
          scopes: ['pages_show_list', 'pages_read_engagement', 'pages_messaging'],
          metadata: { page_id: page.id },
          status: 'connected',
          connected_by: user.id,
        },
        { onConflict: 'platform,platform_account_id' },
      )

      if (fbErr) {
        console.error('Failed to save Facebook account:', fbErr)
        errors.push(`Facebook (${page.name}): ${fbErr.message}`)
      }

      // Instagram Business Account (if linked) — also uses page token, so no expiry
      if (page.instagram_business_account?.id) {
        const { error: igErr } = await serviceClient.from('marketing_social_accounts').upsert(
          {
            platform: 'instagram',
            platform_account_id: page.instagram_business_account.id,
            account_name: `${page.name} (Instagram)`,
            access_token: page.access_token,
            refresh_token: longLived.access_token,
            token_expires_at: null,
            scopes: ['instagram_basic', 'instagram_manage_comments'],
            metadata: {
              ig_business_id: page.instagram_business_account.id,
              page_id: page.id,
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
