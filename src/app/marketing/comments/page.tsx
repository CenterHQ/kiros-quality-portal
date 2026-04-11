'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, RefreshCw, Heart, Eye, Loader2 } from 'lucide-react'
import { PLATFORM_ICONS } from '@/components/marketing/PlatformIcon'
import type { MarketingComment } from '@/lib/marketing/types'

const TABS = [
  { key: 'unread', label: 'Unread' },
  { key: 'all', label: 'All' },
  { key: 'replied', label: 'Replied' },
]

export default function CommentsPage() {
  const profile = useProfile()
  const [comments, setComments] = useState<MarketingComment[]>([])
  const [activeTab, setActiveTab] = useState('unread')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadComments() }, [])

  async function loadComments() {
    const supabase = createClient()
    const { data } = await supabase
      .from('marketing_comments')
      .select('*')
      .is('parent_comment_id', null)
      .order('comment_time', { ascending: false })
      .limit(100)
    setComments(data || [])
    setLoading(false)
  }

  async function syncComments() {
    setSyncing(true)
    try {
      const res = await fetch('/api/marketing/comments/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      await loadComments()
    } catch (err) {
      console.error('Sync error:', err)
    }
    setSyncing(false)
  }

  async function handleReply(commentId: string) {
    if (!replyText.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/marketing/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, reply: replyText }),
      })
      if (!res.ok) throw new Error('Reply failed')
      setReplyingTo(null)
      setReplyText('')
      await loadComments()
    } catch (err) {
      console.error('Reply error:', err)
    }
    setSaving(false)
  }

  async function markAsRead(commentId: string) {
    const supabase = createClient()
    await supabase
      .from('marketing_comments')
      .update({ is_read: true })
      .eq('id', commentId)
    await loadComments()
  }

  const filtered = comments.filter(c => {
    if (activeTab === 'unread') return !c.is_read
    if (activeTab === 'replied') return c.reply_text !== null
    return true
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Comments"
        description="View and reply to comments on your published posts"
        breadcrumbs={[
          { label: 'Marketing', href: '/marketing' },
          { label: 'Comments' },
        ]}
        actions={
          <button
            onClick={syncComments}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Comments
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({comments.filter(c => {
                if (tab.key === 'unread') return !c.is_read
                if (tab.key === 'replied') return c.reply_text !== null
                return true
              }).length})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="size-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No comments in this category</p>
          {activeTab === 'unread' && comments.length > 0 && (
            <p className="text-xs mt-1">All caught up!</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(comment => (
            <Card key={comment.id}>
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-medium">
                    {(comment.author_name || '?').charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{comment.author_name || 'Unknown'}</span>
                      {PLATFORM_ICONS[comment.platform]}
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.comment_time).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!comment.is_read && (
                        <Badge className="text-[10px] bg-blue-100 text-blue-700">New</Badge>
                      )}
                      {comment.like_count > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Heart className="size-3" /> {comment.like_count}
                        </span>
                      )}
                    </div>

                    {/* Comment text */}
                    <p className="text-sm text-foreground mb-2">{comment.comment_text}</p>

                    {/* Existing reply */}
                    {comment.reply_text && (
                      <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10 mb-2">
                        <p className="text-xs font-medium text-primary mb-0.5">Your reply</p>
                        <p className="text-sm">{comment.reply_text}</p>
                      </div>
                    )}

                    {/* Reply editor */}
                    {replyingTo === comment.id ? (
                      <div className="flex items-end gap-2 mt-2">
                        <textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          rows={2}
                          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleReply(comment.id)}
                            disabled={saving || !replyText.trim()}
                            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs hover:bg-primary/90 disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                          </button>
                          <button
                            onClick={() => { setReplyingTo(null); setReplyText('') }}
                            className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-1">
                        {!comment.reply_text && (
                          <button
                            onClick={() => setReplyingTo(comment.id)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Send className="size-3" /> Reply
                          </button>
                        )}
                        {!comment.is_read && (
                          <button
                            onClick={() => markAsRead(comment.id)}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <Eye className="size-3" /> Mark read
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

