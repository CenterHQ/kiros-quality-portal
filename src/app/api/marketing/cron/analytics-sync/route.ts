import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { withTokenRefresh } from '@/lib/marketing/token-manager'
import { getPageInsights, getInstagramInsights, getCampaignInsights, getAdCampaigns } from '@/lib/marketing/meta-api'
import { queryGA4, getYouTubeChannelAnalytics, getBusinessReviews } from '@/lib/marketing/google-api'

export const dynamic = 'force-dynamic'

// Runs daily at 6 AM via Vercel Cron
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Get all connected accounts
  const { data: accounts } = await supabase
    .from('marketing_social_accounts')
    .select('*')
    .eq('status', 'connected')

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ message: 'No connected accounts', count: 0 })
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]
  let synced = 0
  let errors = 0

  for (const account of accounts) {
    try {
      switch (account.platform) {
        case 'facebook': {
          const pageId = (account.metadata as Record<string, string>)?.page_id || account.platform_account_id
          const insights = await withTokenRefresh(account.id, async (token) => {
            return getPageInsights(token, pageId, [
              'page_impressions', 'page_engaged_users', 'page_fans',
              'page_views_total', 'page_post_engagements',
            ])
          })
          await upsertAnalytics(supabase, 'facebook', 'page_insights', yesterday, today, {
            impressions: insights.find(i => i.name === 'page_impressions')?.values?.[0]?.value || 0,
            engagement: insights.find(i => i.name === 'page_engaged_users')?.values?.[0]?.value || 0,
            followers: insights.find(i => i.name === 'page_fans')?.values?.[0]?.value || 0,
            views: insights.find(i => i.name === 'page_views_total')?.values?.[0]?.value || 0,
          })
          synced++
          break
        }

        case 'instagram': {
          const igId = (account.metadata as Record<string, string>)?.ig_business_id || account.platform_account_id
          const insights = await withTokenRefresh(account.id, async (token) => {
            return getInstagramInsights(token, igId, [
              'impressions', 'reach', 'follower_count', 'profile_views',
            ])
          })
          await upsertAnalytics(supabase, 'instagram', 'account_insights', yesterday, today, {
            impressions: insights.find(i => i.name === 'impressions')?.values?.[0]?.value || 0,
            reach: insights.find(i => i.name === 'reach')?.values?.[0]?.value || 0,
            followers: insights.find(i => i.name === 'follower_count')?.values?.[0]?.value || 0,
          })
          synced++
          break
        }

        case 'google_analytics': {
          const propertyId = (account.metadata as Record<string, string>)?.property_id
          if (!propertyId) break
          const report = await withTokenRefresh(account.id, async (token) => {
            return queryGA4(token, {
              propertyId,
              dimensions: [],
              metrics: ['sessions', 'totalUsers', 'newUsers', 'bounceRate', 'averageSessionDuration'],
              startDate: yesterday,
              endDate: today,
            })
          })
          const row = report.rows?.[0]
          if (row) {
            await upsertAnalytics(supabase, 'google_analytics', 'traffic', yesterday, today, {
              sessions: parseInt(row.metricValues[0]?.value || '0'),
              total_users: parseInt(row.metricValues[1]?.value || '0'),
              new_users: parseInt(row.metricValues[2]?.value || '0'),
              bounce_rate: parseFloat(row.metricValues[3]?.value || '0'),
              avg_session_duration: parseFloat(row.metricValues[4]?.value || '0'),
            })
          }
          synced++
          break
        }

        case 'youtube': {
          const channelId = (account.metadata as Record<string, string>)?.channel_id
          if (!channelId) break
          const analytics = await withTokenRefresh(account.id, async (token) => {
            return getYouTubeChannelAnalytics(token, channelId, yesterday, today)
          })
          await upsertAnalytics(supabase, 'youtube', 'channel_analytics', yesterday, today, analytics)
          synced++
          break
        }

        case 'google_business': {
          // Sync reviews
          const locationName = (account.metadata as Record<string, string>)?.account_name
          if (!locationName) break
          try {
            const reviews = await withTokenRefresh(account.id, async (token) => {
              return getBusinessReviews(token, locationName)
            })
            for (const review of reviews) {
              await supabase.from('marketing_reviews').upsert({
                platform: 'google_business',
                platform_review_id: review.reviewId,
                reviewer_name: review.reviewer?.displayName || 'Google User',
                rating: starRatingToNumber(review.starRating),
                review_text: review.comment,
                review_date: review.createTime,
                response_status: review.reviewReply ? 'responded' : 'unread',
                response_text: review.reviewReply?.comment || null,
                response_published_at: review.reviewReply?.updateTime || null,
              }, { onConflict: 'platform_review_id' })
            }
          } catch (err) {
            console.warn('Google reviews sync failed:', err)
          }
          synced++
          break
        }
      }
    } catch (err) {
      console.error(`Analytics sync failed for ${account.platform} (${account.id}):`, err)
      errors++
    }
  }

  return NextResponse.json({ message: 'Analytics sync complete', synced, errors })
}

type SupabaseClient = ReturnType<typeof createServiceRoleClient>

async function upsertAnalytics(
  supabase: SupabaseClient,
  platform: string,
  metricType: string,
  startDate: string,
  endDate: string,
  data: Record<string, unknown>,
) {
  await supabase.from('marketing_analytics_cache').upsert({
    platform,
    metric_type: metricType,
    date_range_start: startDate,
    date_range_end: endDate,
    data,
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'platform,metric_type,date_range_start,date_range_end' })
}

function starRatingToNumber(rating: string): number {
  const map: Record<string, number> = {
    ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
  }
  return map[rating] || 0
}
