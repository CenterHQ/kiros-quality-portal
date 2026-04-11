import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withTokenRefresh } from '@/lib/marketing/token-manager'
import { getPageConversations, getConversationMessages } from '@/lib/marketing/meta-api'

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

    // Get connected Facebook accounts
    const { data: fbAccounts } = await serviceClient
      .from('marketing_social_accounts')
      .select('*')
      .eq('platform', 'facebook')
      .eq('status', 'connected')

    let synced = 0

    for (const account of fbAccounts || []) {
      const pageId = (account.metadata as Record<string, string>)?.page_id || account.platform_account_id

      try {
        const conversations = await withTokenRefresh(account.id, async (token) => {
          return getPageConversations(token, pageId)
        })

        for (const conv of conversations) {
          const messages = await withTokenRefresh(account.id, async (token) => {
            return getConversationMessages(token, conv.id)
          })

          const participant = conv.participants?.data?.find(p => p.id !== pageId)

          for (const msg of messages) {
            const isFromPage = msg.from.id === pageId

            await serviceClient.from('marketing_messages_inbox').upsert({
              platform: 'facebook',
              thread_id: conv.id,
              sender_id: msg.from.id,
              sender_name: msg.from.name,
              message_text: msg.message,
              direction: isFromPage ? 'outbound' : 'inbound',
              platform_message_id: msg.id,
              is_read: isFromPage,
              message_time: msg.created_time,
            }, { onConflict: 'platform_message_id' })

            synced++
          }
        }
      } catch (err) {
        console.error(`Inbox sync failed for account ${account.id}:`, err)
      }
    }

    return NextResponse.json({ success: true, synced })
  } catch (error: unknown) {
    console.error('Inbox sync error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Sync failed' }, { status: 500 })
  }
}
