'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Plus, Globe, Search, Filter } from 'lucide-react'
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

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Published' },
]

export default function ContentListPage() {
  const [content, setContent] = useState<MarketingContent[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContent()
  }, [])

  async function loadContent() {
    const supabase = createClient()
    const { data } = await supabase
      .from('marketing_content')
      .select('*, profiles!marketing_content_created_by_fkey(full_name)')
      .order('created_at', { ascending: false })
    setContent(data || [])
    setLoading(false)
  }

  const filtered = content.filter(item => {
    if (activeTab !== 'all' && item.status !== activeTab) return false
    if (search) {
      const q = search.toLowerCase()
      return (item.title?.toLowerCase().includes(q) || item.body.toLowerCase().includes(q))
    }
    return true
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Content"
        description="Manage your social media content across all platforms"
        breadcrumbs={[
          { label: 'Marketing', href: '/marketing' },
          { label: 'Content' },
        ]}
        actions={
          <Link
            href="/marketing/content/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" />
            New Content
          </Link>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({content.filter(c => c.status === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search content..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Content List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No content found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <Link
              key={item.id}
              href={`/marketing/content/${item.id}`}
              className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex gap-1 shrink-0">
                  {item.platforms.map(p => (
                    <span key={p}>{PLATFORM_ICONS[p] || <Globe className="size-4" />}</span>
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.ai_generated && <span className="text-xs mr-1">🤖</span>}
                    {item.title || item.body.substring(0, 60)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.content_type} · {new Date(item.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {item.scheduled_at && ` · Scheduled: ${new Date(item.scheduled_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {item.hashtags.length > 0 && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {item.hashtags.length} tags
                  </span>
                )}
                <Badge className={`text-xs ${STATUS_COLORS[item.status] || ''}`}>
                  {item.status.replace('_', ' ')}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
