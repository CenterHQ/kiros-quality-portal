'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Globe, ArrowLeft,
  Save, Send, CheckCircle, XCircle, ExternalLink, Trash2,
} from 'lucide-react'
import { PLATFORM_ICONS } from '@/components/marketing/PlatformIcon'
import type { MarketingContent, ContentStatus } from '@/lib/marketing/types'

const STATUS_COLORS: Record<ContentStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-purple-100 text-purple-700',
  publishing: 'bg-indigo-100 text-indigo-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  archived: 'bg-gray-100 text-gray-500',
}

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const profile = useProfile()
  const [content, setContent] = useState<MarketingContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState('')
  const [title, setTitle] = useState('')
  const [rejectionNote, setRejectionNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadContent()
  }, [id])

  async function loadContent() {
    const supabase = createClient()
    const { data } = await supabase
      .from('marketing_content')
      .select('*, profiles!marketing_content_created_by_fkey(full_name)')
      .eq('id', id)
      .single()
    if (data) {
      setContent(data)
      setBody(data.body)
      setTitle(data.title || '')
    }
    setLoading(false)
  }

  async function handleUpdate() {
    if (!content) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('marketing_content')
      .update({ title: title || null, body, updated_at: new Date().toISOString() })
      .eq('id', content.id)
    await loadContent()
    setEditing(false)
    setSaving(false)
  }

  async function handleApprove() {
    if (!content) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('marketing_content')
      .update({
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', content.id)
    await loadContent()
    setSaving(false)
  }

  async function handleReject() {
    if (!content || !rejectionNote.trim()) return alert('Please provide a rejection note')
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('marketing_content')
      .update({
        status: 'draft',
        rejection_note: rejectionNote,
        updated_at: new Date().toISOString(),
      })
      .eq('id', content.id)
    await loadContent()
    setRejectionNote('')
    setSaving(false)
  }

  async function handleSubmitForReview() {
    if (!content) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('marketing_content')
      .update({ status: 'pending_review', updated_at: new Date().toISOString() })
      .eq('id', content.id)
    await loadContent()
    setSaving(false)
  }

  async function handlePublish() {
    if (!content) return
    setSaving(true)
    try {
      const res = await fetch('/api/marketing/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: content.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Publish failed')
      }
      await loadContent()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!content || !confirm('Are you sure you want to delete this content?')) return
    const supabase = createClient()
    await supabase.from('marketing_content').delete().eq('id', content.id)
    router.push('/marketing/content')
  }

  if (loading) {
    return <div className="space-y-4"><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="h-64 bg-muted animate-pulse rounded-lg" /></div>
  }

  if (!content) {
    return <div className="text-center py-12 text-muted-foreground">Content not found</div>
  }

  const isAdmin = profile?.role === 'admin'
  const canApprove = isAdmin && content.status === 'pending_review'
  const canPublish = isAdmin && (content.status === 'approved' || content.status === 'draft')
  const canEdit = content.status === 'draft' || content.status === 'pending_review'

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={content.title || content.content_type}
        description={`${content.content_type} · Created ${new Date(content.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        breadcrumbs={[
          { label: 'Marketing', href: '/marketing' },
          { label: 'Content', href: '/marketing/content' },
          { label: content.title || content.id.substring(0, 8) },
        ]}
        actions={
          <div className="flex gap-2">
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent">
                Edit
              </button>
            )}
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50">
              <Trash2 className="size-4" />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              {content.platforms.map(p => (
                <span key={p} className="flex items-center gap-1 text-xs">
                  {PLATFORM_ICONS[p]}
                </span>
              ))}
              <Badge className={`text-xs ${STATUS_COLORS[content.status]}`}>
                {content.status.replace('_', ' ')}
              </Badge>
              {content.ai_generated && (
                <Badge className="text-xs bg-purple-100 text-purple-700">AI Generated</Badge>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Save className="size-4 inline mr-1" /> Save
                  </button>
                  <button
                    onClick={() => { setEditing(false); setBody(content.body); setTitle(content.title || '') }}
                    className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{content.body}</p>
                {content.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-4 not-prose">
                    {content.hashtags.map(tag => (
                      <span key={tag} className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {content.rejection_note && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <strong>Rejection note:</strong> {content.rejection_note}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions sidebar */}
        <div className="space-y-4">
          {/* Approval */}
          {canApprove && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  onClick={handleApprove}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="size-4" /> Approve
                </button>
                <div>
                  <textarea
                    value={rejectionNote}
                    onChange={e => setRejectionNote(e.target.value)}
                    placeholder="Rejection note..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none mb-2"
                  />
                  <button
                    onClick={handleReject}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="size-4" /> Reject
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Publish */}
          {canPublish && (
            <Card>
              <CardContent className="pt-6 space-y-2">
                <button
                  onClick={handlePublish}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="size-4" /> Publish Now
                </button>
              </CardContent>
            </Card>
          )}

          {/* Submit for review (non-admin or draft) */}
          {content.status === 'draft' && (
            <Card>
              <CardContent className="pt-6">
                <button
                  onClick={handleSubmitForReview}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                >
                  <Send className="size-4" /> Submit for Review
                </button>
              </CardContent>
            </Card>
          )}

          {/* Meta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span>{content.content_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(content.created_at).toLocaleDateString('en-AU')}</span>
              </div>
              {content.scheduled_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span>{new Date(content.scheduled_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
              {content.published_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Published</span>
                  <span>{new Date(content.published_at).toLocaleDateString('en-AU')}</span>
                </div>
              )}
              {content.platform_post_ids && Object.keys(content.platform_post_ids).length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Platform Links</p>
                  {Object.entries(content.platform_post_ids).map(([platform, postId]) => (
                    <div key={platform} className="flex items-center gap-2 text-xs">
                      {PLATFORM_ICONS[platform]}
                      <span className="truncate">{String(postId)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
