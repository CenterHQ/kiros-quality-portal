import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withTokenRefresh } from '@/lib/marketing/token-manager'
import { replyToComment } from '@/lib/marketing/meta-api'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['admin', 'manager', 'ns'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { commentId, reply } = await request.json()
    if (!commentId || !reply?.trim()) {
      return NextResponse.json({ error: 'commentId and reply required' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Get the comment
    const { data: comment } = await serviceClient
      .from('marketing_comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

    // Get the connected account
    const { data: account } = await serviceClient
      .from('marketing_social_accounts')
      .select('*')
      .eq('platform', comment.platform)
      .eq('status', 'connected')
      .limit(1)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'No connected account found' }, { status: 400 })
    }

    // Reply via Meta API
    const replyId = await withTokenRefresh(account.id, async (token) => {
      return replyToComment(token, comment.comment_id, reply)
    })

    // Update the comment in DB
    await serviceClient
      .from('marketing_comments')
      .update({
        reply_text: reply,
        replied_at: new Date().toISOString(),
        replied_by: user.id,
        is_read: true,
      })
      .eq('id', commentId)

    // Store the reply as a child comment
    await serviceClient.from('marketing_comments').upsert({
      platform: comment.platform,
      post_id: comment.post_id,
      content_id: comment.content_id,
      comment_id: replyId,
      parent_comment_id: comment.comment_id,
      author_name: account.account_name,
      author_id: account.platform_account_id,
      comment_text: reply,
      is_read: true,
      comment_time: new Date().toISOString(),
    }, { onConflict: 'comment_id' })

    return NextResponse.json({ success: true, replyId })
  } catch (error: unknown) {
    console.error('Comment reply error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Reply failed' }, { status: 500 })
  }
}
