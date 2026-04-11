import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withTokenRefresh } from '@/lib/marketing/token-manager'
import {
  publishToFacebook,
  publishPhotoToFacebook,
  createInstagramMediaContainer,
  publishInstagramMedia,
  checkContainerStatus,
} from '@/lib/marketing/meta-api'
import { createBusinessPost } from '@/lib/marketing/google-api'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can publish content' }, { status: 403 })
    }

    const { contentId } = await request.json()
    if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })

    const serviceClient = createServiceRoleClient()

    // Fetch content
    const { data: content, error: fetchErr } = await serviceClient
      .from('marketing_content')
      .select('*')
      .eq('id', contentId)
      .single()

    if (fetchErr || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Mark as publishing
    await serviceClient
      .from('marketing_content')
      .update({ status: 'publishing' })
      .eq('id', contentId)

    const platformPostIds: Record<string, string> = {}
    const errors: string[] = []

    // Publish to each platform
    for (const platform of content.platforms) {
      try {
        switch (platform) {
          case 'facebook': {
            const { data: account } = await serviceClient
              .from('marketing_social_accounts')
              .select('*')
              .eq('platform', 'facebook')
              .eq('status', 'connected')
              .limit(1)
              .single()
            if (!account) { errors.push('Facebook: No connected account'); break }

            const pageId = (account.metadata as Record<string, string>)?.page_id || account.platform_account_id
            const postId = await withTokenRefresh(account.id, async (token) => {
              if (content.media_urls?.length > 0) {
                return publishPhotoToFacebook(token, pageId, content.media_urls[0], content.body)
              }
              return publishToFacebook(token, pageId, content.body)
            })
            platformPostIds.facebook = postId
            break
          }

          case 'instagram': {
            const { data: account } = await serviceClient
              .from('marketing_social_accounts')
              .select('*')
              .eq('platform', 'instagram')
              .eq('status', 'connected')
              .limit(1)
              .single()
            if (!account) { errors.push('Instagram: No connected account'); break }

            const igId = (account.metadata as Record<string, string>)?.ig_business_id || account.platform_account_id
            if (!content.media_urls?.length) {
              errors.push('Instagram: Image URL required for Instagram posts')
              break
            }

            const containerId = await withTokenRefresh(account.id, async (token) => {
              return createInstagramMediaContainer(token, igId, content.media_urls[0], content.body)
            })

            // Wait for container to be ready (poll up to 30 seconds)
            let ready = false
            for (let i = 0; i < 6; i++) {
              await new Promise(resolve => setTimeout(resolve, 5000))
              const status = await checkContainerStatus(account.access_token, containerId)
              if (status.status_code === 'FINISHED' || !status.status_code) {
                ready = true
                break
              }
              if (status.status_code === 'ERROR') {
                throw new Error('Instagram media processing failed')
              }
            }

            if (!ready) {
              errors.push('Instagram: Media processing timed out')
              break
            }

            const postId = await publishInstagramMedia(account.access_token, igId, containerId)
            platformPostIds.instagram = postId
            break
          }

          case 'google_business': {
            const { data: account } = await serviceClient
              .from('marketing_social_accounts')
              .select('*')
              .eq('platform', 'google_business')
              .eq('status', 'connected')
              .limit(1)
              .single()
            if (!account) { errors.push('Google Business: No connected account'); break }

            const locationName = (account.metadata as Record<string, string>)?.account_name || account.platform_account_id
            const postName = await withTokenRefresh(account.id, async (token) => {
              return createBusinessPost(token, locationName, { summary: content.body })
            })
            platformPostIds.google_business = postName
            break
          }

          default:
            errors.push(`${platform}: Publishing not yet supported`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`${platform}: ${msg}`)
        console.error(`Publish to ${platform} failed:`, err)
      }
    }

    // Update content status
    const allFailed = Object.keys(platformPostIds).length === 0 && errors.length > 0
    await serviceClient
      .from('marketing_content')
      .update({
        status: allFailed ? 'failed' : 'published',
        platform_post_ids: platformPostIds,
        published_at: allFailed ? null : new Date().toISOString(),
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        metadata: { ...(content.metadata as Record<string, unknown>), publish_errors: errors.length > 0 ? errors : undefined },
        updated_at: new Date().toISOString(),
      })
      .eq('id', contentId)

    // Update calendar entry if exists
    if (!allFailed) {
      await serviceClient
        .from('marketing_content_calendar')
        .update({ status: 'published' })
        .eq('content_id', contentId)
    }

    if (allFailed) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      platform_post_ids: platformPostIds,
      warnings: errors.length > 0 ? errors : undefined,
    })
  } catch (error: unknown) {
    console.error('Publish error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
