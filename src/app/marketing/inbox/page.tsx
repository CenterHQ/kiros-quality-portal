'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Send, Loader2, RefreshCw, MessageCircle } from 'lucide-react'
import { FacebookIcon, InstagramIcon } from '@/components/marketing/PlatformIcon'
import type { MarketingInboxMessage } from '@/lib/marketing/types'

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: <FacebookIcon className="size-4 text-blue-600" />,
  instagram: <InstagramIcon className="size-4 text-pink-500" />,
}

interface Thread {
  thread_id: string
  platform: 'facebook' | 'instagram'
  sender_name: string
  sender_avatar_url: string | null
  last_message: string
  last_time: string
  unread_count: number
}

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [messages, setMessages] = useState<MarketingInboxMessage[]>([])
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadThreads() }, [])

  useEffect(() => {
    if (activeThread) loadMessages(activeThread)
  }, [activeThread])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadThreads() {
    const supabase = createClient()
    const { data } = await supabase
      .from('marketing_messages_inbox')
      .select('*')
      .order('message_time', { ascending: false })

    if (!data) { setLoading(false); return }

    // Group by thread
    const threadMap = new Map<string, Thread>()
    for (const msg of data) {
      if (!threadMap.has(msg.thread_id)) {
        threadMap.set(msg.thread_id, {
          thread_id: msg.thread_id,
          platform: msg.platform,
          sender_name: msg.sender_name || 'Unknown',
          sender_avatar_url: msg.sender_avatar_url,
          last_message: msg.message_text || '',
          last_time: msg.message_time,
          unread_count: 0,
        })
      }
      if (!msg.is_read && msg.direction === 'inbound') {
        threadMap.get(msg.thread_id)!.unread_count++
      }
    }

    setThreads(Array.from(threadMap.values()))
    setLoading(false)
  }

  async function loadMessages(threadId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('marketing_messages_inbox')
      .select('*')
      .eq('thread_id', threadId)
      .order('message_time', { ascending: true })
    setMessages(data || [])

    // Mark as read
    await supabase
      .from('marketing_messages_inbox')
      .update({ is_read: true })
      .eq('thread_id', threadId)
      .eq('is_read', false)
  }

  async function syncMessages() {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/marketing/inbox/sync', { method: 'POST' })
      const data = await res.json()

      // Build status message
      const parts: string[] = []

      if (!res.ok) {
        parts.push(data.error || 'Sync failed')
      } else if (data.error) {
        parts.push(data.error)
      } else if (data.errors?.length > 0) {
        parts.push(...data.errors)
      }

      // Show debug info
      if (data.debug?.length > 0) {
        parts.push('Debug: ' + data.debug.join(' | '))
      }

      if (data.synced > 0) {
        parts.unshift(`Synced ${data.synced} message(s).`)
      } else if (parts.length === 0) {
        parts.push('No messages found. Make sure your Facebook Page has Messenger conversations and the "Manager messaging" use case is enabled in your Meta App Dashboard.')
      }

      setSyncError(parts.join('\n\n'))
      await loadThreads()
      if (activeThread) await loadMessages(activeThread)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleSendReply() {
    if (!reply.trim() || !activeThread) return
    setSending(true)
    try {
      const res = await fetch('/api/marketing/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: activeThread, message: reply }),
      })
      if (!res.ok) throw new Error('Send failed')
      setReply('')
      await loadMessages(activeThread)
    } catch (err) {
      console.error('Reply error:', err)
    }
    setSending(false)
  }

  const activeThreadData = threads.find(t => t.thread_id === activeThread)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Inbox"
        description="Messages from Facebook Messenger and Instagram DMs"
        breadcrumbs={[
          { label: 'Marketing', href: '/marketing' },
          { label: 'Inbox' },
        ]}
        actions={
          <button
            onClick={syncMessages}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Messages
          </button>
        }
      />

      {syncError && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 whitespace-pre-wrap">
          {syncError}
        </div>
      )}

      <div className="flex border border-border rounded-lg overflow-hidden h-[calc(100vh-14rem)]">
        {/* Thread list */}
        <div className="w-80 border-r border-border flex flex-col shrink-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="size-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Click Sync Messages to pull messages from your connected accounts</p>
              </div>
            ) : (
              threads.map(thread => (
                <button
                  key={thread.thread_id}
                  onClick={() => setActiveThread(thread.thread_id)}
                  className={`w-full text-left p-3 border-b border-border hover:bg-accent/50 transition-colors ${
                    activeThread === thread.thread_id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-medium">
                      {thread.sender_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{thread.sender_name}</span>
                        {PLATFORM_ICONS[thread.platform]}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.last_message}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(thread.last_time).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {thread.unread_count > 0 && (
                          <Badge className="text-[10px] bg-primary text-white px-1.5 py-0">{thread.unread_count}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message area */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeThread && activeThreadData ? (
            <>
              {/* Header */}
              <div className="p-3 border-b border-border flex items-center gap-3">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {activeThreadData.sender_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{activeThreadData.sender_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {PLATFORM_ICONS[activeThreadData.platform]}
                    {activeThreadData.platform === 'facebook' ? 'Messenger' : 'Instagram DM'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-xl px-4 py-2.5 ${
                      msg.direction === 'outbound'
                        ? 'bg-primary text-white'
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm">{msg.message_text}</p>
                      <p className={`text-[10px] mt-1 ${msg.direction === 'outbound' ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.message_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <div className="p-3 border-t border-border">
                <div className="flex items-end gap-2">
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply() } }}
                    placeholder="Type a reply..."
                    rows={1}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!reply.trim() || sending}
                    className="size-9 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 shrink-0"
                  >
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="size-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
