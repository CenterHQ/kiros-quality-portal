'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, BadgeDollarSign, Globe } from 'lucide-react'
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

const PLATFORM_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  meta_ads: { label: 'Meta Ads', icon: <FacebookIcon className="size-4 text-blue-600" /> },
  google_ads: { label: 'Google Ads', icon: <Globe className="size-4 text-green-600" /> },
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
]

export default function AdsPage() {
  const [campaigns, setCampaigns] = useState<MarketingAdCampaign[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCampaigns()
  }, [])

  async function loadCampaigns() {
    const supabase = createClient()
    const { data } = await supabase
      .from('marketing_ad_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
    setCampaigns(data || [])
    setLoading(false)
  }

  const filtered = campaigns.filter(c =>
    activeTab === 'all' || c.status === activeTab,
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Ad Campaigns"
        description="Manage advertising campaigns across Meta and Google Ads"
        breadcrumbs={[
          { label: 'Marketing', href: '/marketing' },
          { label: 'Ads' },
        ]}
        actions={
          <Link
            href="/marketing/ads/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" />
            New Campaign
          </Link>
        }
      />

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
              ({campaigns.filter(c => tab.key === 'all' || c.status === tab.key).length})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BadgeDollarSign className="size-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No campaigns found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(campaign => {
            const platformInfo = PLATFORM_LABELS[campaign.platform]
            return (
              <Link key={campaign.id} href={`/marketing/ads/${campaign.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {platformInfo?.icon}
                        <span className="text-xs text-muted-foreground">{platformInfo?.label}</span>
                      </div>
                      <Badge className={`text-xs ${STATUS_COLORS[campaign.status]}`}>
                        {campaign.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-semibold mb-1">{campaign.name}</h3>
                    {campaign.objective && (
                      <p className="text-xs text-muted-foreground capitalize mb-2">{campaign.objective}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {campaign.budget_amount && (
                        <span>
                          {campaign.budget_currency} {campaign.budget_amount} / {campaign.budget_type}
                        </span>
                      )}
                      {campaign.start_date && (
                        <span>{campaign.start_date} → {campaign.end_date || 'ongoing'}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
