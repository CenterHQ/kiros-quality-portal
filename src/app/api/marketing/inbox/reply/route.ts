import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withTokenRefresh } from '@/lib/marketing/token-manager'
import { sendPageMessage } from '@/lib/marketing/meta-api'

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

    const { threadId, message } = await request.json()
    if (!threadId || !message?.trim()) {
      return NextResponse.json({ error: 'threadId and message required' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Get the thread to find the sender and platform
    const { data: threadMsgs } = await serviceClient
      .from('marketing_messages_inbox')
      .select('*')
      .eq('thread_id', threadId)
      .eq('direction', 'inbound')
      .order('message_time', { ascending: false })
      .limit(1)

    if (!threadMsgs || threadMsgs.length === 0) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    const threadMsg = threadMsgs[0]
    const recipientId = threadMsg.sender_id

    // Get the Facebook account
    const { data: account } = await serviceClient
      .from('marketing_social_accounts')
      .select('*')
      .eq('platform', threadMsg.platform)
      .eq('status', 'connected')
      .limit(1)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'No connected account found' }, { status: 400 })
    }

    const pageId = (account.metadata as Record<string, string>)?.page_id || account.platform_account_id

    // Send message via Meta API
    const messageId = await withTokenRefresh(account.id, async (token) => {
      return sendPageMessage(token, pageId, recipientId, message)
    })

    // Save outbound message to DB
    await serviceClient.from('marketing_messages_inbox').insert({
      platform: threadMsg.platform,
      thread_id: threadId,
      sender_id: pageId,
      sender_name: account.account_name,
      message_text: message,
      direction: 'outbound',
      platform_message_id: messageId,
      is_read: true,
      replied_at: new Date().toISOString(),
      replied_by: user.id,
      message_time: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, messageId })
  } catch (error: unknown) {
    console.error('Reply error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Reply failed' }, { status: 500 })
  }
}
