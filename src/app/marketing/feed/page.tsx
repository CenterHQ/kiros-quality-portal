'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageSquare, Share2, Eye, MousePointer, RefreshCw, ExternalLink } from 'lucide-react'
import { PLATFORM_ICONS } from '@/components/marketing/PlatformIcon'
import type { MarketingContent, MarketingPostEngagement } from '@/lib/marketing/types'

interface PostWithEngagement extends MarketingContent {
  engagement?: MarketingPostEngagement[]
}

export default function FeedPage() {
  const [posts, setPosts] = useState<PostWithEngagement[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => { loadPosts() }, [])

  async function loadPosts() {
    const supabase = createClient()
    const { data } = await supabase
      .from('marketing_content')
      .select('*, marketing_post_engagement(*)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50)

    setPosts((data || []).map(p => ({
      ...p,
      engagement: p.marketing_post_engagement || [],
    })))
    setLoading(false)
  }

  async function syncEngagement() {
    setSyncing(true)
    try {
      const res = await fetch('/api/marketing/feed/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      await loadPosts()
    } catch (err) {
      console.error('Sync error:', err)
    }
    setSyncing(false)
  }

  function getTotalEngagement(post: PostWithEngagement) {
    const eng = post.engagement || []
    return {
      likes: eng.reduce((s, e) => s + e.likes, 0),
      comments: eng.reduce((s, e) => s + e.comments, 0),
      shares: eng.reduce((s, e) => s + e.shares, 0),
      reach: eng.reduce((s, e) => s + e.reach, 0),
      impressions: eng.reduce((s, e) => s + e.impressions, 0),
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Post Feed"
        description="View your published posts and their engagement across platforms"
        breadcrumbs={[
          { label: 'Marketing', href: '/marketing' },
          { label: 'Feed' },
        ]}
        actions={
          <button
            onClick={syncEngagement}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Engagement
          </button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Share2 className="size-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No published posts yet</p>
          <Link href="/marketing/content/new" className="text-sm text-primary hover:underline mt-2 inline-block">
            Create your first post
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => {
            const totals = getTotalEngagement(post)
            return (
              <Card key={post.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Media preview */}
                    {post.media_urls.length > 0 && (
                      <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                        <img
                          src={post.media_urls[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-1">
                          {post.platforms.map(p => (
                            <span key={p}>{PLATFORM_ICONS[p]}</span>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {post.published_at && new Date(post.published_at).toLocaleDateString('en-AU', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        {post.ai_generated && (
                          <Badge className="text-[10px] bg-purple-100 text-purple-700">AI</Badge>
                        )}
                        <Link
                          href={`/marketing/content/${post.id}`}
                          className="text-xs text-primary hover:underline ml-auto flex items-center gap-1"
                        >
                          <ExternalLink className="size-3" /> View
                        </Link>
                      </div>

                      {/* Post body */}
                      <p className="text-sm text-foreground line-clamp-3 mb-3">
                        {post.title ? <span className="font-medium">{post.title}: </span> : null}
                        {post.body}
                      </p>

                      {/* Hashtags */}
                      {post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {post.hashtags.slice(0, 5).map(tag => (
                            <span key={tag} className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                          {post.hashtags.length > 5 && (
                            <span className="text-[10px] text-muted-foreground">+{post.hashtags.length - 5}</span>
                          )}
                        </div>
                      )}

                      {/* Engagement metrics */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="size-3.5" />
                          {totals.likes.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-3.5" />
                          {totals.comments.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="size-3.5" />
                          {totals.shares.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="size-3.5" />
                          {totals.reach.toLocaleString()} reach
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointer className="size-3.5" />
                          {totals.impressions.toLocaleString()} impressions
                        </span>
                      </div>

                      {/* Per-platform breakdown */}
                      {(post.engagement || []).length > 1 && (
                        <div className="mt-2 pt-2 border-t border-border flex gap-4">
                          {(post.engagement || []).map(eng => (
                            <div key={eng.platform} className="flex items-center gap-2 text-xs">
                              {PLATFORM_ICONS[eng.platform]}
                              <span>{eng.likes} likes · {eng.comments} comments</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Platform post links */}
                      {post.platform_post_ids && Object.keys(post.platform_post_ids).length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {Object.entries(post.platform_post_ids).map(([platform, postId]) => (
                            <a
                              key={platform}
                              href={platform === 'facebook' ? `https://facebook.com/${postId}` : `https://instagram.com/p/${postId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                            >
                              {PLATFORM_ICONS[platform]} View on {platform}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
