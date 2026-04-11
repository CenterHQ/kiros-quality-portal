'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Globe, Bot, Send, CheckCircle, XCircle } from 'lucide-react'
import { PLATFORM_ICONS } from '@/components/marketing/PlatformIcon'
import type { MarketingReview, ReviewResponseStatus } from '@/lib/marketing/types'

const STATUS_COLORS: Record<ReviewResponseStatus, string> = {
  unread: 'bg-red-100 text-red-700',
  read: 'bg-gray-100 text-gray-700',
  draft_response: 'bg-blue-100 text-blue-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  responded: 'bg-green-100 text-green-700',
  ignored: 'bg-gray-100 text-gray-500',
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'draft_response', label: 'Draft Response' },
  { key: 'pending_approval', label: 'Pending Approval' },
  { key: 'responded', label: 'Responded' },
]

export default function ReviewsPage() {
  const profile = useProfile()
  const [reviews, setReviews] = useState<MarketingReview[]>([])
  const [activeTab, setActiveTab] = useState('unread')
  const [loading, setLoading] = useState(true)
  const [editingReview, setEditingReview] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadReviews() }, [])

  async function loadReviews() {
    const supabase = createClient()
    const { data } = await supabase
      .from('marketing_reviews')
      .select('*')
      .order('created_at', { ascending: false })
    setReviews(data || [])
    setLoading(false)
  }

  const filtered = reviews.filter(r =>
    activeTab === 'all' || r.response_status === activeTab,
  )

  async function handleSaveResponse(reviewId: string, status: ReviewResponseStatus) {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('marketing_reviews')
      .update({
        response_text: responseText,
        response_status: status,
        response_drafted_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
    setEditingReview(null)
    setResponseText('')
    await loadReviews()
    setSaving(false)
  }

  async function handleApprove(reviewId: string) {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('marketing_reviews')
      .update({
        response_status: 'responded',
        response_approved_by: user?.id,
        response_published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
    await loadReviews()
    setSaving(false)
  }

  async function handleMarkRead(reviewId: string) {
    const supabase = createClient()
    await supabase
      .from('marketing_reviews')
      .update({ response_status: 'read', updated_at: new Date().toISOString() })
      .eq('id', reviewId)
    await loadReviews()
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Reviews"
        description="Monitor and respond to reviews across Google Business and Facebook"
        breadcrumbs={[
          { label: 'Marketing', href: '/marketing' },
          { label: 'Reviews' },
        ]}
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
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({reviews.filter(r => tab.key === 'all' || r.response_status === tab.key).length})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Star className="size-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No reviews in this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(review => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {PLATFORM_ICONS[review.platform]}
                    <div>
                      <span className="text-sm font-medium">{review.reviewer_name || 'Anonymous'}</span>
                      {review.rating && (
                        <div className="text-xs text-amber-500">
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.review_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.review_date).toLocaleDateString('en-AU')}
                      </span>
                    )}
                    <Badge className={`text-xs ${STATUS_COLORS[review.response_status]}`}>
                      {review.response_status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {review.review_text && (
                  <p className="text-sm text-foreground mb-3">{review.review_text}</p>
                )}

                {/* AI Draft Response */}
                {review.ai_draft_response && (
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 mb-3">
                    <p className="text-xs font-medium text-purple-700 mb-1 flex items-center gap-1">
                      <Bot className="size-3" /> AI Suggested Response
                    </p>
                    <p className="text-sm text-purple-900">{review.ai_draft_response}</p>
                  </div>
                )}

                {/* Existing response */}
                {review.response_text && editingReview !== review.id && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-3">
                    <p className="text-xs font-medium text-blue-700 mb-1">Your Response</p>
                    <p className="text-sm">{review.response_text}</p>
                  </div>
                )}

                {/* Response editor */}
                {editingReview === review.id ? (
                  <div className="space-y-2 mt-3">
                    <textarea
                      value={responseText}
                      onChange={e => setResponseText(e.target.value)}
                      rows={3}
                      placeholder="Write your response..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveResponse(review.id, 'draft_response')}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent disabled:opacity-50"
                      >
                        Save Draft
                      </button>
                      <button
                        onClick={() => handleSaveResponse(review.id, 'pending_approval')}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-50"
                      >
                        Submit for Approval
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleSaveResponse(review.id, 'responded')}
                          disabled={saving}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50"
                        >
                          Publish Response
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingReview(null); setResponseText('') }}
                        className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-accent"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-2">
                    {review.response_status === 'unread' && (
                      <button
                        onClick={() => handleMarkRead(review.id)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Mark as read
                      </button>
                    )}
                    {['unread', 'read'].includes(review.response_status) && (
                      <button
                        onClick={() => {
                          setEditingReview(review.id)
                          setResponseText(review.ai_draft_response || review.response_text || '')
                        }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Send className="size-3" /> Draft Response
                      </button>
                    )}
                    {review.response_status === 'pending_approval' && isAdmin && (
                      <button
                        onClick={() => handleApprove(review.id)}
                        disabled={saving}
                        className="text-xs text-green-600 hover:underline flex items-center gap-1"
                      >
                        <CheckCircle className="size-3" /> Approve & Publish
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
