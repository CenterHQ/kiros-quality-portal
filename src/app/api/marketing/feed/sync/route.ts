import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withTokenRefresh } from '@/lib/marketing/token-manager'
import { getPostEngagement, getPostComments } from '@/lib/marketing/meta-api'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['admin', 'manager', 'ns'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = createServiceRoleClient()

    // Get published content with platform post IDs
    const { data: publishedContent } = await serviceClient
      .from('marketing_content')
      .select('id, platform_post_ids, platforms')
      .eq('status', 'published')
      .not('platform_post_ids', 'eq', '{}')
      .order('published_at', { ascending: false })
      .limit(30)

    // Get connected accounts
    const { data: fbAccount } = await serviceClient
      .from('marketing_social_accounts')
      .select('*')
      .eq('platform', 'facebook')
      .eq('status', 'connected')
      .limit(1)
      .single()

    let synced = 0

    for (const content of publishedContent || []) {
      const postIds = content.platform_post_ids as Record<string, string>

      // Facebook engagement
      if (postIds.facebook && fbAccount) {
        try {
          const engagement = await withTokenRefresh(fbAccount.id, async (token) => {
            return getPostEngagement(token, postIds.facebook)
          })

          // Also get comment count
          const comments = await withTokenRefresh(fbAccount.id, async (token) => {
            return getPostComments(token, postIds.facebook)
          }).catch(() => [])

          await serviceClient.from('marketing_post_engagement').upsert({
            content_id: content.id,
            platform: 'facebook',
            platform_post_id: postIds.facebook,
            likes: engagement.likes,
            comments: comments.length,
            shares: engagement.shares,
            reach: engagement.reach,
            impressions: engagement.impressions,
            last_synced_at: new Date().toISOString(),
          }, { onConflict: 'content_id,platform' })

          synced++
        } catch (err) {
          console.error(`Engagement sync failed for ${postIds.facebook}:`, err)
        }
      }
    }

    return NextResponse.json({ success: true, synced })
  } catch (error: unknown) {
    console.error('Feed sync error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Sync failed' }, { status: 500 })
  }
}
