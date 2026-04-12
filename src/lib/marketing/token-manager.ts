// ─── Token Manager ───────────────────────────────────────────────────────────
// Centralized token refresh and validation for all marketing OAuth connections.

import { createServiceRoleClient } from '@/lib/supabase/server'
import { exchangeForLongLivedToken } from './meta-api'
import { refreshGoogleToken } from './google-api'
import type { MarketingSocialAccount, SocialPlatform } from './types'

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minutes before expiry

export async function getAccount(
  platform: SocialPlatform,
): Promise<MarketingSocialAccount | null> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('marketing_social_accounts')
    .select('*')
    .eq('platform', platform)
    .eq('status', 'connected')
    .limit(1)
    .single()
  return data
}

export async function getValidToken(accountId: string): Promise<string> {
  const supabase = createServiceRoleClient()
  const { data: account } = await supabase
    .from('marketing_social_accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (!account) throw new Error('Social account not found')
  if (account.status === 'disconnected') throw new Error('Account is disconnected')

  // Check if token is still valid
  if (account.token_expires_at) {
    const expiresAt = new Date(account.token_expires_at).getTime()
    const now = Date.now()

    if (now + TOKEN_REFRESH_BUFFER_MS < expiresAt) {
      // Token is still valid
      return account.access_token
    }

    // Token needs refresh
    try {
      const refreshed = await refreshToken(account)
      return refreshed
    } catch (error) {
      await markAccountError(accountId, error instanceof Error ? error.message : 'Token refresh failed')
      throw error
    }
  }

  // No expiry set — assume valid (e.g., Facebook Page tokens don't expire)
  return account.access_token
}

async function refreshToken(account: MarketingSocialAccount): Promise<string> {
  const supabase = createServiceRoleClient()
  const platform = account.platform

  if (platform === 'facebook' || platform === 'instagram') {
    // Meta Page tokens obtained via a long-lived user token never expire.
    // If we stored the user token as refresh_token, exchange it for a fresh long-lived user token
    // then re-fetch the page token. Otherwise, the page token is already permanent.
    const userToken = account.refresh_token
    if (!userToken) {
      // No user token stored — page token should be permanent, clear the erroneous expiry
      await supabase
        .from('marketing_social_accounts')
        .update({ token_expires_at: null, updated_at: new Date().toISOString() })
        .eq('id', account.id)
      return account.access_token
    }

    // Exchange the stored user token for a fresh long-lived user token
    const result = await exchangeForLongLivedToken(userToken)

    // Re-fetch page accounts to get fresh page tokens
    const { getPageAccounts } = await import('./meta-api')
    const pages = await getPageAccounts(result.access_token)
    const page = pages.find(p => p.id === account.platform_account_id)

    if (page) {
      // Page token from a long-lived user token is permanent — no expiry
      await supabase
        .from('marketing_social_accounts')
        .update({
          access_token: page.access_token,
          refresh_token: result.access_token,
          token_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id)
      return page.access_token
    }

    // Page not found — just update the user token and keep current page token
    await supabase
      .from('marketing_social_accounts')
      .update({
        refresh_token: result.access_token,
        token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)
    return account.access_token
  }

  if (['google_business', 'google_ads', 'google_analytics', 'youtube'].includes(platform)) {
    if (!account.refresh_token) {
      throw new Error('No refresh token available for Google account')
    }
    const result = await refreshGoogleToken(account.refresh_token)
    const expiresAt = result.expiry_date
      ? new Date(result.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString()

    await supabase
      .from('marketing_social_accounts')
      .update({
        access_token: result.access_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)

    return result.access_token
  }

  throw new Error(`Unsupported platform for token refresh: ${platform}`)
}

export async function markAccountError(accountId: string, error: string): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase
    .from('marketing_social_accounts')
    .update({
      status: 'error',
      metadata: { last_error: error, error_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
}

export async function markAccountExpired(accountId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase
    .from('marketing_social_accounts')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
}

export async function withTokenRefresh<T>(
  accountId: string,
  apiCall: (token: string) => Promise<T>,
): Promise<T> {
  const token = await getValidToken(accountId)
  try {
    return await apiCall(token)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    // Check for auth errors that might be fixed by refreshing
    if (msg.includes('401') || msg.includes('190') || msg.includes('Invalid') || msg.includes('expired')) {
      // Force refresh and retry once
      const supabase = createServiceRoleClient()
      const { data: account } = await supabase
        .from('marketing_social_accounts')
        .select('*')
        .eq('id', accountId)
        .single()

      if (!account) throw error

      const newToken = await refreshToken(account)
      return await apiCall(newToken)
    }
    throw error
  }
}
