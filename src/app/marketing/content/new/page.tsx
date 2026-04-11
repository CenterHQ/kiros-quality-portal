'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Globe, Bot, Send, Save, CalendarDays } from 'lucide-react'
import { FacebookIcon, InstagramIcon, YouTubeIcon } from '@/components/marketing/PlatformIcon'
import type { ContentType } from '@/lib/marketing/types'

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', icon: <FacebookIcon className="size-4" />, color: 'text-blue-600 border-blue-200 bg-blue-50' },
  { key: 'instagram', label: 'Instagram', icon: <InstagramIcon className="size-4" />, color: 'text-pink-500 border-pink-200 bg-pink-50' },
  { key: 'google_business', label: 'Google Business', icon: <Globe className="size-4" />, color: 'text-green-600 border-green-200 bg-green-50' },
  { key: 'youtube', label: 'YouTube', icon: <YouTubeIcon className="size-4" />, color: 'text-red-600 border-red-200 bg-red-50' },
]

const CONTENT_TYPES: { key: ContentType; label: string }[] = [
  { key: 'post', label: 'Post' },
  { key: 'reel', label: 'Reel' },
  { key: 'story', label: 'Story' },
  { key: 'google_update', label: 'Google Update' },
  { key: 'youtube_video', label: 'YouTube Video' },
]

export default function NewContentPage() {
  const router = useRouter()
  const profile = useProfile()
  const [saving, setSaving] = useState(false)

  const [contentType, setContentType] = useState<ContentType>('post')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [hashtags, setHashtags] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  function togglePlatform(key: string) {
    setPlatforms(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key],
    )
  }

  async function handleSave(status: 'draft' | 'pending_review' | 'publishing') {
    if (!body.trim()) return alert('Content body is required')
    if (platforms.length === 0) return alert('Select at least one platform')

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const hashtagArray = hashtags
        .split(/[\s,#]+/)
        .filter(Boolean)
        .map(t => (t.startsWith('#') ? t : `#${t}`))

      const record: Record<string, unknown> = {
        content_type: contentType,
        title: title || null,
        body,
        platforms,
        hashtags: hashtagArray,
        status,
        created_by: user?.id,
        ai_generated: false,
      }

      if (scheduledAt) {
        record.scheduled_at = new Date(scheduledAt).toISOString()
        if (status === 'draft') record.status = 'draft'
      }

      // If admin publishes directly, set approved fields
      if (status === 'publishing' && profile?.role === 'admin') {
        record.approved_by = user?.id
        record.approved_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('marketing_content')
        .insert(record)
        .select('id')
        .single()

      if (error) throw error

      // Create calendar entry if scheduled
      if (scheduledAt && data) {
        await supabase.from('marketing_content_calendar').insert({
          title: title || body.substring(0, 50),
          date: scheduledAt.split('T')[0],
          time: scheduledAt.split('T')[1]?.substring(0, 5) || null,
          calendar_type: 'post',
          content_id: data.id,
          platforms,
          status: 'planned',
          created_by: user?.id,
        })
      }

      router.push('/marketing/content')
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save content')
    } finally {
      setSaving(false)
    }
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Create Content"
        description="Draft new social media content for your centre"
        breadcrumbs={[
          { label: 'Marketing', href: '/marketing' },
          { label: 'Content', href: '/marketing/content' },
          { label: 'New' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Content type */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Content Type</label>
                <div className="flex gap-2 flex-wrap">
                  {CONTENT_TYPES.map(ct => (
                    <button
                      key={ct.key}
                      onClick={() => setContentType(ct.key)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        contentType === ct.key
                          ? 'bg-primary text-white border-primary'
                          : 'bg-background text-foreground border-border hover:bg-accent'
                      }`}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Give your content a title for internal reference..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Body */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Content</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Write your post content here..."
                  rows={8}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">{body.length} characters</p>
              </div>

              {/* Hashtags */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Hashtags</label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={e => setHashtags(e.target.value)}
                  placeholder="#earlyeducation #childcare #kiros ..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Platforms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Platforms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.key}
                  onClick={() => togglePlatform(p.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    platforms.includes(p.key)
                      ? p.color + ' border-current'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  {p.icon}
                  <span className="font-medium">{p.label}</span>
                  {platforms.includes(p.key) && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="size-4" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {scheduledAt && (
                <button
                  onClick={() => setScheduledAt('')}
                  className="text-xs text-muted-foreground hover:text-foreground mt-1"
                >
                  Clear schedule
                </button>
              )}
            </CardContent>
          </Card>

          {/* AI Assist */}
          <Card>
            <CardContent className="pt-6">
              <a
                href="/marketing/chat"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
              >
                <Bot className="size-4" />
                Generate with Marketing AI
              </a>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                <Save className="size-4" />
                Save Draft
              </button>
              <button
                onClick={() => handleSave('pending_review')}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                <Send className="size-4" />
                Submit for Review
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleSave('publishing')}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Send className="size-4" />
                  Publish Now
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
