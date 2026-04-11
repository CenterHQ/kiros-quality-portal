import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  exchangeGoogleCode,
  getBusinessAccounts,
  getGA4Properties,
  getYouTubeChannels,
  getGoogleAdsCustomers,
} from '@/lib/marketing/google-api'

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

    const tokens = await exchangeGoogleCode(code)
    const tokenExpiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString()

    // Discover connected Google services and store each as a separate account
    const discoveries = await Promise.allSettled([
      discoverBusinessProfile(supabase, tokens, tokenExpiresAt, user.id),
      discoverGA4(supabase, tokens, tokenExpiresAt, user.id),
      discoverYouTube(supabase, tokens, tokenExpiresAt, user.id),
      discoverGoogleAds(supabase, tokens, tokenExpiresAt, user.id),
    ])

    // Log any discovery errors but don't block
    discoveries.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.warn(`Google discovery ${i} failed:`, result.reason)
      }
    })

    return NextResponse.redirect(
      new URL('/marketing/settings?connected=google', request.url),
    )
  } catch (err: unknown) {
    console.error('Google callback error:', err)
    const msg = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.redirect(
      new URL(`/marketing/settings?error=${encodeURIComponent(msg)}`, request.url),
    )
  }
}

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>
type Tokens = { access_token: string; refresh_token: string | null; expiry_date: number | null }

async function discoverBusinessProfile(
  supabase: SupabaseClient,
  tokens: Tokens,
  tokenExpiresAt: string,
  userId: string,
) {
  const accounts = await getBusinessAccounts(tokens.access_token)
  for (const account of accounts) {
    await supabase.from('marketing_social_accounts').upsert(
      {
        platform: 'google_business',
        platform_account_id: account.name,
        account_name: account.accountName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt,
        scopes: ['business.manage'],
        metadata: { account_name: account.name, account_type: account.type },
        status: 'connected',
        connected_by: userId,
      },
      { onConflict: 'platform,platform_account_id' },
    )
  }
}

async function discoverGA4(
  supabase: SupabaseClient,
  tokens: Tokens,
  tokenExpiresAt: string,
  userId: string,
) {
  const properties = await getGA4Properties(tokens.access_token)
  for (const prop of properties) {
    await supabase.from('marketing_social_accounts').upsert(
      {
        platform: 'google_analytics',
        platform_account_id: prop.propertyId,
        account_name: prop.displayName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt,
        scopes: ['analytics.readonly'],
        metadata: { property_id: prop.propertyId, property_name: prop.name },
        status: 'connected',
        connected_by: userId,
      },
      { onConflict: 'platform,platform_account_id' },
    )
  }
}

async function discoverYouTube(
  supabase: SupabaseClient,
  tokens: Tokens,
  tokenExpiresAt: string,
  userId: string,
) {
  const channels = await getYouTubeChannels(tokens.access_token)
  for (const ch of channels) {
    await supabase.from('marketing_social_accounts').upsert(
      {
        platform: 'youtube',
        platform_account_id: ch.id,
        account_name: ch.title,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt,
        scopes: ['youtube', 'youtube.readonly', 'yt-analytics.readonly'],
        metadata: { channel_id: ch.id, subscriber_count: ch.subscriberCount, video_count: ch.videoCount },
        status: 'connected',
        connected_by: userId,
      },
      { onConflict: 'platform,platform_account_id' },
    )
  }
}

async function discoverGoogleAds(
  supabase: SupabaseClient,
  tokens: Tokens,
  tokenExpiresAt: string,
  userId: string,
) {
  if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) return
  const customers = await getGoogleAdsCustomers(tokens.access_token)
  for (const cust of customers) {
    await supabase.from('marketing_social_accounts').upsert(
      {
        platform: 'google_ads',
        platform_account_id: cust.id,
        account_name: cust.descriptiveName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt,
        scopes: ['adwords'],
        metadata: { customer_id: cust.id },
        status: 'connected',
        connected_by: userId,
      },
      { onConflict: 'platform,platform_account_id' },
    )
  }
}
