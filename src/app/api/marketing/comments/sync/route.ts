import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withTokenRefresh } from '@/lib/marketing/token-manager'
import { getPostComments, getPagePosts } from '@/lib/marketing/meta-api'

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

    // Get connected Facebook account
    const { data: fbAccount } = await serviceClient
      .from('marketing_social_accounts')
      .select('*')
      .eq('platform', 'facebook')
      .eq('status', 'connected')
      .limit(1)
      .single()

    if (!fbAccount) {
      return NextResponse.json({ error: 'No connected Facebook account. Go to Marketing > Settings to connect.' })
    }

    const pageId = (fbAccount.metadata as Record<string, string>)?.page_id || fbAccount.platform_account_id
    let synced = 0
    const errors: string[] = []
    const debug: string[] = []

    // 1. Sync comments from Page posts (fetched directly from Graph API)
    try {
      const posts = await withTokenRefresh(fbAccount.id, async (token) => {
        return getPagePosts(token, pageId, 25)
      })
      debug.push(`Found ${posts.length} post(s) on Page`)

      for (const post of posts) {
        if (post.comments?.summary?.total_count === 0) continue

        try {
          const comments = await withTokenRefresh(fbAccount.id, async (token) => {
            return getPostComments(token, post.id)
          })
          debug.push(`Post ${post.id}: ${comments.length} comment(s)`)

          for (const comment of comments) {
            const { error: insertErr } = await serviceClient.from('marketing_comments').upsert({
              platform: 'facebook',
              post_id: post.id,
              comment_id: comment.id,
              author_name: comment.from?.name || 'Unknown',
              author_id: comment.from?.id,
              comment_text: comment.message,
              comment_time: comment.created_time,
            }, { onConflict: 'comment_id' })
            if (!insertErr) synced++
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          debug.push(`Comment fetch error for post ${post.id}: ${msg}`)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`Failed to fetch Page posts: ${msg}`)
    }

    // 2. Also sync comments from portal-published content (if any)
    const { data: publishedContent } = await serviceClient
      .from('marketing_content')
      .select('id, platform_post_ids, platforms')
      .eq('status', 'published')
      .not('platform_post_ids', 'eq', '{}')
      .order('published_at', { ascending: false })
      .limit(20)

    for (const content of publishedContent || []) {
      const postIds = content.platform_post_ids as Record<string, string>
      if (!postIds.facebook) continue

      try {
        const comments = await withTokenRefresh(fbAccount.id, async (token) => {
          return getPostComments(token, postIds.facebook)
        })
        for (const comment of comments) {
          const { error: insertErr } = await serviceClient.from('marketing_comments').upsert({
            platform: 'facebook',
            post_id: postIds.facebook,
            content_id: content.id,
            comment_id: comment.id,
            author_name: comment.from?.name || 'Unknown',
            author_id: comment.from?.id,
            comment_text: comment.message,
            comment_time: comment.created_time,
          }, { onConflict: 'comment_id' })
          if (!insertErr) synced++
        }
      } catch (err) {
        debug.push(`Content sync error for ${postIds.facebook}: ${err instanceof Error ? err.message : 'Unknown'}`)
      }
    }

    return NextResponse.json({
      success: synced > 0,
      synced,
      errors: errors.length > 0 ? errors : undefined,
      debug,
    })
  } catch (error: unknown) {
    console.error('Comment sync error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Sync failed' }, { status: 500 })
  }
}
