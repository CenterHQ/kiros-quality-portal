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

    // Use service role to bypass RLS for reading accounts
    const serviceClient = createServiceRoleClient()

    // Get connected Facebook accounts
    const { data: fbAccounts, error: dbErr } = await serviceClient
      .from('marketing_social_accounts')
      .select('*')
      .eq('platform', 'facebook')
      .eq('status', 'connected')

    if (dbErr) {
      return NextResponse.json({ error: `Database error: ${dbErr.message}. Have you run the marketing migration?` }, { status: 500 })
    }

    if (!fbAccounts || fbAccounts.length === 0) {
      // Check if there are ANY accounts (maybe status is wrong)
      const { data: allAccounts } = await serviceClient
        .from('marketing_social_accounts')
        .select('platform, status, account_name')

      if (!allAccounts || allAccounts.length === 0) {
        return NextResponse.json({
          error: 'No social accounts found at all. Go to Marketing > Settings and connect your Facebook Page first.',
        })
      }

      return NextResponse.json({
        error: `No connected Facebook accounts. Found ${allAccounts.length} account(s) but none are Facebook with status "connected": ${allAccounts.map(a => `${a.platform} (${a.status})`).join(', ')}`,
      })
    }

    let synced = 0
    const errors: string[] = []
    const debug: string[] = [`Found ${fbAccounts.length} Facebook account(s)`]

    for (const account of fbAccounts) {
      const pageId = (account.metadata as Record<string, string>)?.page_id || account.platform_account_id
      debug.push(`Processing page: ${account.account_name} (${pageId})`)

      try {
        const conversations = await withTokenRefresh(account.id, async (token) => {
          return getPageConversations(token, pageId)
        })

        debug.push(`Found ${conversations.length} conversation(s) for ${account.account_name}`)

        if (conversations.length === 0) {
          errors.push(`${account.account_name}: No conversations found. Either the page has no Messenger messages, or the "pages_messaging" permission is missing. Go to Meta App Dashboard > Use Cases > "Manager messaging" to enable it, then reconnect at /marketing/settings.`)
          continue
        }

        for (const conv of conversations) {
          try {
            const messages = await withTokenRefresh(account.id, async (token) => {
              return getConversationMessages(token, conv.id)
            })

            debug.push(`Conversation ${conv.id}: ${messages.length} message(s)`)

            for (const msg of messages) {
              const isFromPage = msg.from.id === pageId

              const { error: insertErr } = await serviceClient.from('marketing_messages_inbox').upsert({
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

              if (insertErr) {
                debug.push(`Insert error: ${insertErr.message}`)
              } else {
                synced++
              }
            }
          } catch (msgErr) {
            const errMsg = msgErr instanceof Error ? msgErr.message : 'Unknown error'
            debug.push(`Message fetch error for conv ${conv.id}: ${errMsg}`)
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        debug.push(`API error for ${account.account_name}: ${msg}`)

        if (msg.includes('190') || msg.includes('OAuthException') || msg.includes('Invalid')) {
          errors.push(`${account.account_name}: Token invalid or expired. Reconnect at /marketing/settings.`)
        } else if (msg.includes('100') || msg.includes('Unsupported') || msg.includes('permission')) {
          errors.push(`${account.account_name}: Permission denied. Enable "Manager messaging" in your Meta App Dashboard, then reconnect.`)
        } else {
          errors.push(`${account.account_name}: ${msg}`)
        }
      }
    }

    return NextResponse.json({
      success: synced > 0,
      synced,
      errors: errors.length > 0 ? errors : undefined,
      debug,
    })
  } catch (error: unknown) {
    console.error('Inbox sync error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Sync failed' }, { status: 500 })
  }
}
