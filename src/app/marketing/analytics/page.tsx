'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  TrendingUp, Users, Eye, MousePointer,
  Globe, BarChart3, BadgeDollarSign,
} from 'lucide-react'
import { FacebookIcon, InstagramIcon, YouTubeIcon } from '@/components/marketing/PlatformIcon'
import type { MarketingAnalyticsCache } from '@/lib/marketing/types'

const PLATFORM_TABS = [
  { key: 'overview', label: 'Overview', icon: <TrendingUp className="size-4" /> },
  { key: 'facebook', label: 'Facebook', icon: <FacebookIcon className="size-4" /> },
  { key: 'instagram', label: 'Instagram', icon: <InstagramIcon className="size-4" /> },
  { key: 'google_business', label: 'Google Business', icon: <Globe className="size-4" /> },
  { key: 'google_ads', label: 'Google Ads', icon: <BadgeDollarSign className="size-4" /> },
  { key: 'google_analytics', label: 'GA4', icon: <BarChart3 className="size-4" /> },
  { key: 'youtube', label: 'YouTube', icon: <YouTubeIcon className="size-4" /> },
]

const DATE_RANGES = [
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
]

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<MarketingAnalyticsCache[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  async function loadAnalytics() {
    setLoading(true)
    const supabase = createClient()
    const startDate = new Date(Date.now() - parseInt(dateRange) * 86400000).toISOString().split('T')[0]
    const endDate = new Date().toISOString().split('T')[0]

    const { data } = await supabase
      .from('marketing_analytics_cache')
      .select('*')
      .gte('date_range_start', startDate)
      .lte('date_range_end', endDate)
      .order('fetched_at', { ascending: false })

    setAnalytics(data || [])
    setLoading(false)
  }

  const filteredAnalytics = activeTab === 'overview'
    ? analytics
    : analytics.filter(a => a.platform === activeTab)

  // Aggregate overview metrics
  const overviewMetrics = {
    totalReach: 0,
    totalEngagement: 0,
    totalImpressions: 0,
    totalFollowers: 0,
  }

  for (const a of analytics) {
    const data = a.data as Record<string, number>
    overviewMetrics.totalReach += data.reach || 0
    overviewMetrics.totalEngagement += data.engagement || 0
    overviewMetrics.totalImpressions += data.impressions || 0
    overviewMetrics.totalFollowers += data.followers || 0
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Analytics"
        description="Track marketing performance across all platforms"
        breadcrumbs={[
          { label: 'Marketing', href: '/marketing' },
          { label: 'Analytics' },
        ]}
        actions={
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            {DATE_RANGES.map(dr => (
              <button
                key={dr.key}
                onClick={() => setDateRange(dr.key)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  dateRange === dr.key ? 'bg-primary text-white' : 'hover:bg-accent'
                }`}
              >
                {dr.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Platform tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {PLATFORM_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : analytics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="size-8 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="text-sm font-medium mb-1">No analytics data yet</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Analytics data is synced automatically from your connected accounts. Make sure you have accounts connected in Settings and wait for the first sync.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview stats */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Reach"
                value={overviewMetrics.totalReach.toLocaleString()}
                icon={<Eye className="size-5" />}
              />
              <StatCard
                title="Engagement"
                value={overviewMetrics.totalEngagement.toLocaleString()}
                icon={<MousePointer className="size-5" />}
              />
              <StatCard
                title="Impressions"
                value={overviewMetrics.totalImpressions.toLocaleString()}
                icon={<TrendingUp className="size-5" />}
              />
              <StatCard
                title="Followers"
                value={overviewMetrics.totalFollowers.toLocaleString()}
                icon={<Users className="size-5" />}
              />
            </div>
          )}

          {/* Analytics data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAnalytics.map(entry => (
              <Card key={entry.id}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    {PLATFORM_TABS.find(t => t.key === entry.platform)?.icon}
                    {entry.metric_type.replace(/_/g, ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {entry.date_range_start} to {entry.date_range_end}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(entry.data as Record<string, unknown>).map(([key, value]) => (
                        <div key={key} className="p-2 rounded bg-muted/50">
                          <div className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</div>
                          <div className="text-sm font-semibold">{typeof value === 'number' ? value.toLocaleString() : String(value)}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Last updated: {new Date(entry.fetched_at).toLocaleString('en-AU')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
