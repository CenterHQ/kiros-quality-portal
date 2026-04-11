import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Megaphone, PenSquare, Star,
  BadgeDollarSign, Bot, Plus,
  Globe,
} from 'lucide-react'
import { PLATFORM_ICONS } from '@/components/marketing/PlatformIcon'
import type { ContentStatus } from '@/lib/marketing/types'

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

export default async function MarketingHubPage() {
  const supabase = await createServerSupabaseClient()

  const [
    { data: content },
    { data: reviews },
    { data: campaigns },
    { data: accounts },
    { data: calendarEntries },
  ] = await Promise.all([
    supabase.from('marketing_content').select('id, title, content_type, platforms, status, scheduled_at, published_at, created_at, ai_generated, profiles!marketing_content_created_by_fkey(full_name)').order('created_at', { ascending: false }).limit(10),
    supabase.from('marketing_reviews').select('id, platform, reviewer_name, rating, review_text, response_status, created_at').order('created_at', { ascending: false }).limit(10),
    supabase.from('marketing_ad_campaigns').select('id, name, platform, status, budget_amount, budget_currency, start_date, end_date').order('created_at', { ascending: false }).limit(10),
    supabase.from('marketing_social_accounts').select('id, platform, account_name, status'),
    supabase.from('marketing_content_calendar').select('id, title, date, calendar_type, platforms, status').gte('date', new Date().toISOString().split('T')[0]).order('date').limit(5),
  ])

  const contentList = content || []
  const reviewsList = reviews || []
  const campaignsList = campaigns || []
  const accountsList = accounts || []

  const publishedCount = contentList.filter(c => c.status === 'published').length
  const _pendingReviewCount = contentList.filter(c => c.status === 'pending_review').length
  const scheduledCount = contentList.filter(c => c.status === 'scheduled').length
  const unreadReviews = reviewsList.filter(r => r.response_status === 'unread').length
  const activeCampaigns = campaignsList.filter(c => c.status === 'active').length
  const connectedAccounts = accountsList.filter(a => a.status === 'connected').length

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Marketing Hub"
        description="Manage your centre's social media presence, content, and advertising"
        actions={
          <div className="flex gap-2">
            <Link
              href="/marketing/content/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" />
              New Content
            </Link>
            <Link
              href="/marketing/chat"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Bot className="size-4" />
              Marketing AI
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Connected Accounts"
          value={connectedAccounts}
          icon={<Megaphone className="size-5" />}
          description={`${accountsList.length} total`}
        />
        <StatCard
          title="Published Posts"
          value={publishedCount}
          icon={<PenSquare className="size-5" />}
          description={`${scheduledCount} scheduled`}
        />
        <StatCard
          title="Unread Reviews"
          value={unreadReviews}
          icon={<Star className="size-5" />}
          description={`${reviewsList.length} total`}
        />
        <StatCard
          title="Active Campaigns"
          value={activeCampaigns}
          icon={<BadgeDollarSign className="size-5" />}
          description={`${campaignsList.length} total`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Content */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Content</CardTitle>
              <Link href="/marketing/content" className="text-sm text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {contentList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PenSquare className="size-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No content yet. Create your first post!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contentList.slice(0, 5).map(item => (
                  <Link
                    key={item.id}
                    href={`/marketing/content/${item.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex gap-1">
                        {(item.platforms as string[]).map(p => (
                          <span key={p}>{PLATFORM_ICONS[p] || <Globe className="size-4" />}</span>
                        ))}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.title || item.content_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.ai_generated && '🤖 '}
                          {new Date(item.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <Badge className={`text-xs shrink-0 ${STATUS_COLORS[item.status as ContentStatus] || ''}`}>
                      {(item.status as string).replace('_', ' ')}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Review Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Review Alerts</CardTitle>
                <Link href="/marketing/reviews" className="text-sm text-primary hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent>
              {unreadReviews === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No unread reviews</p>
              ) : (
                <div className="space-y-3">
                  {reviewsList.filter(r => r.response_status === 'unread').slice(0, 3).map(review => (
                    <div key={review.id} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        {PLATFORM_ICONS[review.platform]}
                        <span className="text-sm font-medium">{review.reviewer_name || 'Anonymous'}</span>
                        {review.rating && (
                          <span className="text-xs text-amber-600">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{review.review_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Upcoming</CardTitle>
                <Link href="/marketing/calendar" className="text-sm text-primary hover:underline">Calendar</Link>
              </div>
            </CardHeader>
            <CardContent>
              {(!calendarEntries || calendarEntries.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nothing scheduled</p>
              ) : (
                <div className="space-y-2">
                  {calendarEntries.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                      <div className="text-center shrink-0 w-10">
                        <div className="text-xs text-muted-foreground">{new Date(entry.date + 'T00:00').toLocaleDateString('en-AU', { month: 'short' })}</div>
                        <div className="text-lg font-bold">{new Date(entry.date + 'T00:00').getDate()}</div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{entry.title}</p>
                        <div className="flex gap-1">
                          {(entry.platforms as string[]).map(p => (
                            <span key={p}>{PLATFORM_ICONS[p]}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Accounts</CardTitle>
                <Link href="/marketing/settings" className="text-sm text-primary hover:underline">Manage</Link>
              </div>
            </CardHeader>
            <CardContent>
              {accountsList.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No accounts connected</p>
                  <Link href="/marketing/settings" className="text-sm text-primary hover:underline">Connect accounts</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {accountsList.map(account => (
                    <div key={account.id} className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-2">
                        {PLATFORM_ICONS[account.platform]}
                        <span className="text-sm">{account.account_name}</span>
                      </div>
                      <div className={`size-2 rounded-full ${account.status === 'connected' ? 'bg-green-500' : account.status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
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
