'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { FacebookIcon } from '@/components/marketing/PlatformIcon'
import type { MarketingAdCampaign, CampaignStatus } from '@/lib/marketing/types'

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-blue-100 text-blue-700',
  completed: 'bg-purple-100 text-purple-700',
  archived: 'bg-gray-100 text-gray-500',
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const profile = useProfile()
  const [campaign, setCampaign] = useState<MarketingAdCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCampaign() }, [id])

  async function loadCampaign() {
    const supabase = createClient()
    const { data } = await supabase
      .from('marketing_ad_campaigns')
      .select('*')
      .eq('id', id)
      .single()
    setCampaign(data)
    setLoading(false)
  }

  async function updateStatus(status: CampaignStatus) {
    if (!campaign) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'active' && profile?.role === 'admin') {
      updates.approved_by = user?.id
      updates.approved_at = new Date().toISOString()
    }
    await supabase.from('marketing_ad_campaigns').update(updates).eq('id', campaign.id)
    await loadCampaign()
    setSaving(false)
  }

  async function handleDelete() {
    if (!campaign || !confirm('Delete this campaign?')) return
    const supabase = createClient()
    await supabase.from('marketing_ad_campaigns').delete().eq('id', campaign.id)
    router.push('/marketing/ads')
  }

  if (loading) return <div className="h-64 bg-muted animate-pulse rounded-lg" />
  if (!campaign) return <div className="text-center py-12 text-muted-foreground">Campaign not found</div>

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={campaign.name}
        description={`${campaign.platform === 'meta_ads' ? 'Meta' : 'Google'} Ads Campaign`}
        breadcrumbs={[
          { label: 'Marketing', href: '/marketing' },
          { label: 'Ads', href: '/marketing/ads' },
          { label: campaign.name },
        ]}
        actions={
          <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50">
            <Trash2 className="size-4" />
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {campaign.platform === 'meta_ads' ? <FacebookIcon className="size-4 text-blue-600" /> : <Globe className="size-4 text-green-600" />}
              Campaign Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className={`mt-1 ${STATUS_COLORS[campaign.status]}`}>{campaign.status.replace('_', ' ')}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Objective</p>
                <p className="text-sm font-medium capitalize">{campaign.objective || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-sm font-medium">
                  {campaign.budget_amount ? `${campaign.budget_currency} ${campaign.budget_amount} / ${campaign.budget_type}` : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date Range</p>
                <p className="text-sm font-medium">
                  {campaign.start_date ? `${campaign.start_date} → ${campaign.end_date || 'ongoing'}` : 'Not set'}
                </p>
              </div>
            </div>

            {campaign.target_audience && Object.keys(campaign.target_audience).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Target Audience</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                  {JSON.stringify(campaign.target_audience, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {campaign.status === 'draft' && (
                <button
                  onClick={() => updateStatus('pending_review')}
                  disabled={saving}
                  className="w-full px-4 py-2 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-50"
                >
                  Submit for Review
                </button>
              )}
              {campaign.status === 'pending_review' && isAdmin && (
                <>
                  <button
                    onClick={() => updateStatus('active')}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="size-4" /> Approve & Activate
                  </button>
                  <button
                    onClick={() => updateStatus('draft')}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="size-4" /> Reject
                  </button>
                </>
              )}
              {campaign.status === 'active' && (
                <button
                  onClick={() => updateStatus('paused')}
                  disabled={saving}
                  className="w-full px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent disabled:opacity-50"
                >
                  Pause Campaign
                </button>
              )}
              {campaign.status === 'paused' && (
                <button
                  onClick={() => updateStatus('active')}
                  disabled={saving}
                  className="w-full px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Resume Campaign
                </button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform</span>
                <span>{campaign.platform === 'meta_ads' ? 'Meta Ads' : 'Google Ads'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(campaign.created_at).toLocaleDateString('en-AU')}</span>
              </div>
              {campaign.platform_campaign_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform ID</span>
                  <span className="text-xs font-mono">{campaign.platform_campaign_id}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
