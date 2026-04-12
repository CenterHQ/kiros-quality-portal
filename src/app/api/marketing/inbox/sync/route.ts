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

    if (!fbAccounts || fbAccounts.length === 0) {
      return NextResponse.json({
        success: false,
        synced: 0,
        error: 'No connected Facebook accounts found. Go to Marketing > Settings to connect your Facebook Page.',
      })
    }

    let synced = 0
    const errors: string[] = []

    for (const account of fbAccounts) {
      const pageId = (account.metadata as Record<string, string>)?.page_id || account.platform_account_id

      try {
        const conversations = await withTokenRefresh(account.id, async (token) => {
          return getPageConversations(token, pageId)
        })

        if (conversations.length === 0) {
          errors.push(`${account.account_name}: No conversations found. This may require the "pages_messaging" permission — enable the "Manage messaging" use case in your Meta App Dashboard.`)
          continue
        }

        for (const conv of conversations) {
          try {
            const messages = await withTokenRefresh(account.id, async (token) => {
              return getConversationMessages(token, conv.id)
            })

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
          } catch (msgErr) {
            console.error(`Failed to fetch messages for conversation ${conv.id}:`, msgErr)
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error(`Inbox sync failed for account ${account.id}:`, msg)

        if (msg.includes('190') || msg.includes('OAuthException')) {
          errors.push(`${account.account_name}: Permission denied. Enable the "Manage messaging" use case in your Meta App Dashboard and reconnect.`)
        } else if (msg.includes('100') || msg.includes('Unsupported')) {
          errors.push(`${account.account_name}: Messaging API not available. You need the "pages_messaging" permission — go to Meta App Dashboard > Use Cases > "Manager messaging" and customize it.`)
        } else {
          errors.push(`${account.account_name}: ${msg}`)
        }
      }
    }

    return NextResponse.json({ success: synced > 0, synced, errors })
  } catch (error: unknown) {
    console.error('Inbox sync error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Sync failed' }, { status: 500 })
  }
}
