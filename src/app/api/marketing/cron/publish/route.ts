import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { withTokenRefresh } from '@/lib/marketing/token-manager'
import { publishToFacebook, publishPhotoToFacebook, createInstagramMediaContainer, publishInstagramMedia } from '@/lib/marketing/meta-api'
import { createBusinessPost } from '@/lib/marketing/google-api'

export const dynamic = 'force-dynamic'

// Runs every 5 minutes via Vercel Cron
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends Authorization header for cron jobs)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Find scheduled content that's due
  const { data: scheduled } = await supabase
    .from('marketing_content')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(10)

  if (!scheduled || scheduled.length === 0) {
    return NextResponse.json({ message: 'No content to publish', count: 0 })
  }

  let published = 0
  let failed = 0

  for (const content of scheduled) {
    try {
      await supabase
        .from('marketing_content')
        .update({ status: 'publishing' })
        .eq('id', content.id)

      const platformPostIds: Record<string, string> = {}
      const errors: string[] = []

      for (const platform of content.platforms) {
        try {
          if (platform === 'facebook') {
            const { data: account } = await supabase
              .from('marketing_social_accounts')
              .select('*')
              .eq('platform', 'facebook')
              .eq('status', 'connected')
              .limit(1)
              .single()

            if (account) {
              const pageId = (account.metadata as Record<string, string>)?.page_id || account.platform_account_id
              const postId = await withTokenRefresh(account.id, async (token) => {
                if (content.media_urls?.length > 0) {
                  return publishPhotoToFacebook(token, pageId, content.media_urls[0], content.body)
                }
                return publishToFacebook(token, pageId, content.body)
              })
              platformPostIds.facebook = postId
            }
          } else if (platform === 'instagram') {
            const { data: account } = await supabase
              .from('marketing_social_accounts')
              .select('*')
              .eq('platform', 'instagram')
              .eq('status', 'connected')
              .limit(1)
              .single()

            if (account && content.media_urls?.length > 0) {
              const igId = (account.metadata as Record<string, string>)?.ig_business_id || account.platform_account_id
              const containerId = await withTokenRefresh(account.id, async (token) => {
                return createInstagramMediaContainer(token, igId, content.media_urls[0], content.body)
              })
              // Wait briefly for processing
              await new Promise(r => setTimeout(r, 10000))
              const postId = await publishInstagramMedia(account.access_token, igId, containerId)
              platformPostIds.instagram = postId
            }
          } else if (platform === 'google_business') {
            const { data: account } = await supabase
              .from('marketing_social_accounts')
              .select('*')
              .eq('platform', 'google_business')
              .eq('status', 'connected')
              .limit(1)
              .single()

            if (account) {
              const locationName = (account.metadata as Record<string, string>)?.account_name || account.platform_account_id
              const postName = await withTokenRefresh(account.id, async (token) => {
                return createBusinessPost(token, locationName, { summary: content.body })
              })
              platformPostIds.google_business = postName
            }
          }
        } catch (err) {
          errors.push(`${platform}: ${err instanceof Error ? err.message : 'Failed'}`)
        }
      }

      const allFailed = Object.keys(platformPostIds).length === 0 && errors.length > 0
      await supabase
        .from('marketing_content')
        .update({
          status: allFailed ? 'failed' : 'published',
          platform_post_ids: platformPostIds,
          published_at: allFailed ? null : new Date().toISOString(),
          metadata: { ...(content.metadata as Record<string, unknown>), publish_errors: errors.length > 0 ? errors : undefined },
          updated_at: new Date().toISOString(),
        })
        .eq('id', content.id)

      if (!allFailed) {
        published++
        await supabase
          .from('marketing_content_calendar')
          .update({ status: 'published' })
          .eq('content_id', content.id)
      } else {
        failed++
      }
    } catch (err) {
      console.error(`Cron publish error for ${content.id}:`, err)
      await supabase.from('marketing_content').update({ status: 'failed' }).eq('id', content.id)
      failed++
    }
  }

  return NextResponse.json({ message: 'Cron publish complete', published, failed })
}
