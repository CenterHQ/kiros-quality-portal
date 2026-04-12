'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, BarChart3, BadgeDollarSign, Plug, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { FacebookIcon, InstagramIcon, YouTubeIcon } from '@/components/marketing/PlatformIcon'
import type { MarketingSocialAccount } from '@/lib/marketing/types'

const PLATFORM_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  facebook: { label: 'Facebook', icon: <FacebookIcon className="size-5" />, color: 'text-blue-600' },
  instagram: { label: 'Instagram', icon: <InstagramIcon className="size-5" />, color: 'text-pink-500' },
  google_business: { label: 'Google Business', icon: <Globe className="size-5" />, color: 'text-green-600' },
  google_ads: { label: 'Google Ads', icon: <BadgeDollarSign className="size-5" />, color: 'text-yellow-600' },
  google_analytics: { label: 'Google Analytics', icon: <BarChart3 className="size-5" />, color: 'text-orange-500' },
  youtube: { label: 'YouTube', icon: <YouTubeIcon className="size-5" />, color: 'text-red-600' },
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  connected: { label: 'Connected', className: 'bg-green-100 text-green-700' },
  disconnected: { label: 'Disconnected', className: 'bg-gray-100 text-gray-600' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700' },
  expired: { label: 'Expired', className: 'bg-amber-100 text-amber-700' },
}

export default function MarketingSettingsPage() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<MarketingSocialAccount[]>([])
  const [, setLoading] = useState(true)

  const connectedParam = searchParams.get('connected')
  const errorParam = searchParams.get('error')

  useEffect(() => {
    loadAccounts()
  }, [])

  async function loadAccounts() {
    try {
      const res = await fetch('/api/marketing/accounts', { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) {
        setAccounts(json.accounts || [])
      } else {
        console.error('Failed to load accounts:', json.error)
        setAccounts([])
      }
    } catch (err) {
      console.error('Load accounts error:', err)
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  async function disconnectAccount(id: string) {
    if (!confirm('Are you sure you want to disconnect this account?')) return
    const res = await fetch(`/api/marketing/accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'disconnected' }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(`Disconnect failed: ${json.error || res.statusText}`)
      return
    }
    loadAccounts()
  }

  async function deleteAccount(id: string) {
    if (!confirm('Are you sure you want to permanently remove this account?')) return
    const res = await fetch(`/api/marketing/accounts/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(`Remove failed: ${json.error || res.statusText}`)
      return
    }
    loadAccounts()
  }

  const metaAccounts = accounts.filter(a => ['facebook', 'instagram'].includes(a.platform))
  const googleAccounts = accounts.filter(a => ['google_business', 'google_ads', 'google_analytics', 'youtube'].includes(a.platform))

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Marketing Settings"
        description="Connect and manage your social media and advertising accounts"
        breadcrumbs={[
          { label: 'Marketing', href: '/marketing' },
          { label: 'Settings' },
        ]}
      />

      {/* Status messages */}
      {connectedParam && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
          <CheckCircle className="size-5 shrink-0" />
          <p className="text-sm">
            {connectedParam === 'meta'
              ? 'Meta accounts connected successfully! Your Facebook Pages and Instagram accounts are now linked.'
              : 'Google accounts connected successfully! Your services have been discovered and linked.'}
          </p>
        </div>
      )}
      {errorParam && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-sm">Connection error: {errorParam}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meta (Facebook + Instagram) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FacebookIcon className="size-5 text-blue-600" />
                Meta (Facebook & Instagram)
              </CardTitle>
              <a
                href="/api/marketing/meta/auth"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plug className="size-3.5" />
                {metaAccounts.length > 0 ? 'Reconnect' : 'Connect'}
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {metaAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No Meta accounts connected. Click Connect to link your Facebook Pages and Instagram.
              </p>
            ) : (
              <div className="space-y-3">
                {metaAccounts.map(account => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    onDisconnect={disconnectAccount}
                    onDelete={deleteAccount}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="size-5 text-green-600" />
                Google Services
              </CardTitle>
              <a
                href="/api/marketing/google/auth"
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
              >
                <Plug className="size-3.5" />
                {googleAccounts.length > 0 ? 'Reconnect' : 'Connect'}
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {googleAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No Google accounts connected. Click Connect to link Business Profile, Analytics, YouTube, and Ads.
              </p>
            ) : (
              <div className="space-y-3">
                {googleAccounts.map(account => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    onDisconnect={disconnectAccount}
                    onDelete={deleteAccount}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AccountRow({
  account,
  onDisconnect,
  onDelete,
}: {
  account: MarketingSocialAccount
  onDisconnect: (id: string) => void
  onDelete: (id: string) => void
}) {
  const config = PLATFORM_CONFIG[account.platform]
  const statusBadge = STATUS_BADGES[account.status]

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <div className={config?.color}>{config?.icon}</div>
        <div>
          <p className="text-sm font-medium">{account.account_name}</p>
          <p className="text-xs text-muted-foreground">{config?.label}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={`text-xs ${statusBadge?.className || ''}`}>
          {statusBadge?.label || account.status}
        </Badge>
        {account.status === 'connected' && (
          <button
            onClick={() => onDisconnect(account.id)}
            className="text-muted-foreground hover:text-amber-600 transition-colors"
            title="Disconnect"
          >
            <Plug className="size-4" />
          </button>
        )}
        <button
          onClick={() => onDelete(account.id)}
          className="text-muted-foreground hover:text-red-600 transition-colors"
          title="Remove"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}
