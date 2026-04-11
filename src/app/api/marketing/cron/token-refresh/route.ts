import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { exchangeForLongLivedToken } from '@/lib/marketing/meta-api'
import { refreshGoogleToken } from '@/lib/marketing/google-api'

export const dynamic = 'force-dynamic'

// Runs daily at 3 AM via Vercel Cron
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Find accounts with tokens expiring within 7 days
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: expiringAccounts } = await supabase
    .from('marketing_social_accounts')
    .select('*')
    .eq('status', 'connected')
    .not('token_expires_at', 'is', null)
    .lt('token_expires_at', sevenDaysFromNow)

  if (!expiringAccounts || expiringAccounts.length === 0) {
    return NextResponse.json({ message: 'No tokens need refreshing', count: 0 })
  }

  let refreshed = 0
  let failed = 0

  for (const account of expiringAccounts) {
    try {
      if (['facebook', 'instagram'].includes(account.platform)) {
        // Meta: refresh the long-lived user token
        const userToken = (account.metadata as Record<string, string>)?.user_token || account.access_token
        const result = await exchangeForLongLivedToken(userToken)
        const expiresAt = new Date(Date.now() + result.expires_in * 1000).toISOString()

        await supabase
          .from('marketing_social_accounts')
          .update({
            access_token: result.access_token,
            token_expires_at: expiresAt,
            metadata: { ...(account.metadata as Record<string, unknown>), user_token: result.access_token },
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id)

        refreshed++
      } else if (['google_business', 'google_ads', 'google_analytics', 'youtube'].includes(account.platform)) {
        if (account.refresh_token) {
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

          refreshed++
        }
      }
    } catch (err) {
      console.error(`Token refresh failed for ${account.id} (${account.platform}):`, err)
      await supabase
        .from('marketing_social_accounts')
        .update({
          status: 'expired',
          metadata: {
            ...(account.metadata as Record<string, unknown>),
            last_refresh_error: err instanceof Error ? err.message : 'Unknown error',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id)
      failed++
    }
  }

  return NextResponse.json({ message: 'Token refresh complete', refreshed, failed })
}
