'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Policy, PolicyCategory, PolicyAcknowledgement, Profile } from '@/lib/types'
import { POLICY_STATUS_LABELS, REVIEW_FREQUENCY_LABELS, QA_COLORS } from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { QABadge } from '@/components/ui/qa-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { FileText } from 'lucide-react'

type Tab = 'library' | 'review_schedule' | 'acknowledgements'

export default function PoliciesPage() {
  const supabase = createClient()
  const user = useProfile()
  const [policies, setPolicies] = useState<Policy[]>([])
  const [categories, setCategories] = useState<PolicyCategory[]>([])
  const [acknowledgements, setAcknowledgements] = useState<PolicyAcknowledgement[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [tab, setTab] = useState<Tab>('library')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    const [{ data: pol }, { data: cats }, { data: acks }, { data: profs }] = await Promise.all([
      supabase.from('policies').select('*, policy_categories(*), profiles!policies_created_by_fkey(full_name)').order('title'),
      supabase.from('policy_categories').select('*').order('sort_order'),
      supabase.from('policy_acknowledgements').select('*, profiles(full_name)'),
      supabase.from('profiles').select('*'),
    ])
    if (pol) setPolicies(pol as any)
    if (cats) setCategories(cats)
    if (acks) setAcknowledgements(acks as any)
    if (profs) setProfiles(profs)
  }

  useEffect(() => { load() }, [])

  const isPrivileged = user && ['admin', 'manager', 'ns'].includes(user.role)
  const today = new Date().toISOString().split('T')[0]

  const filtered = policies.filter(p => {
    if (categoryFilter && p.category_id !== Number(categoryFilter)) return false
    if (statusFilter && p.status !== statusFilter) return false
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const dueForReview = policies.filter(p => p.next_review_date && p.next_review_date <= today && p.status !== 'archived')
  const upcomingReviews = policies.filter(p => {
    if (!p.next_review_date || p.status === 'archived') return false
    const diff = (new Date(p.next_review_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diff > 0 && diff <= 30
  })

  const getAckRate = (policyId: string, version: number) => {
    const acks = acknowledgements.filter(a => a.policy_id === policyId && a.version_acknowledged === version)
    return { acknowledged: acks.length, total: profiles.length, rate: profiles.length > 0 ? Math.round((acks.length / profiles.length) * 100) : 0 }
  }

  const statusToKey: Record<string, string> = {
    draft: 'not_started',
    under_review: 'in_progress',
    approved: 'scheduled',
    published: 'completed',
    archived: 'cancelled',
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Policy Management"
        description="Create, manage, and track policy acknowledgements"
        actions={
          isPrivileged ? (
            <a href="/policies/new" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">+ New Policy</a>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="animate-fade-in grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 mt-6">
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Policies</p>
          <p className="text-2xl font-bold text-primary">{policies.filter(p => p.status !== 'archived').length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Published</p>
          <p className="text-2xl font-bold text-green-500">{policies.filter(p => p.status === 'published').length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Due for Review</p>
          <p className={`text-2xl font-bold ${dueForReview.length > 0 ? 'text-red-500' : 'text-green-500'}`}>{dueForReview.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Review Coming (30 days)</p>
          <p className={`text-2xl font-bold ${upcomingReviews.length > 0 ? 'text-orange-500' : 'text-green-500'}`}>{upcomingReviews.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
        {([
          { id: 'library', label: 'Policy Library' },
          { id: 'review_schedule', label: `Reviews (${dueForReview.length})` },
          { id: 'acknowledgements', label: 'Acknowledgements' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
        ))}
      </div>

      {/* LIBRARY TAB */}
      {tab === 'library' && (
        <div className="animate-fade-in">
          <div className="flex gap-3 mb-4 flex-wrap">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search policies..." className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent w-full md:w-64" />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm">
              <option value="">All Statuses</option>
              {Object.entries(POLICY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Group by category */}
          {categories.filter(c => filtered.some(p => p.category_id === c.id)).map(cat => (
            <div key={cat.id} className="mb-6">
              <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                <span>{cat.icon}</span> {cat.name}
                <span className="text-xs text-muted-foreground font-normal">({filtered.filter(p => p.category_id === cat.id).length})</span>
              </h3>
              <div className="space-y-2">
                {filtered.filter(p => p.category_id === cat.id).map(policy => {
                  const ack = getAckRate(policy.id, policy.version)
                  const isOverdue = policy.next_review_date && policy.next_review_date <= today
                  return (
                    <a key={policy.id} href={`/policies/${policy.id}`} className="block bg-card rounded-xl shadow-sm border border-border p-4 hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-foreground truncate">{policy.title}</h4>
                            <StatusBadge status={statusToKey[policy.status] || policy.status} size="sm" />
                            {isOverdue && <StatusBadge status="overdue" size="sm" />}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>v{policy.version}</span>
                            <span>{REVIEW_FREQUENCY_LABELS[policy.review_frequency]} review</span>
                            {policy.next_review_date && <span>Next: {new Date(policy.next_review_date).toLocaleDateString()}</span>}
                            {policy.related_qa?.length > 0 && (
                              <span className="flex gap-1">
                                {policy.related_qa.map((qa: number) => (
                                  <QABadge key={qa} qaNumber={qa} showLabel size="sm" />
                                ))}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${ack.rate}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-16 text-right">{ack.acknowledged}/{ack.total}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">acknowledged</p>
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Uncategorized */}
          {filtered.filter(p => !p.category_id).length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground text-sm mb-3">Uncategorized</h3>
              <div className="space-y-2">
                {filtered.filter(p => !p.category_id).map(policy => (
                  <a key={policy.id} href={`/policies/${policy.id}`} className="block bg-card rounded-xl shadow-sm border border-border p-4 hover:shadow-md transition">
                    <h4 className="font-medium text-sm text-foreground">{policy.title}</h4>
                    <StatusBadge status={statusToKey[policy.status] || policy.status} size="sm" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <EmptyState
              icon={<FileText />}
              title="No policies found"
              description={isPrivileged ? 'Create your first policy to get started.' : undefined}
            />
          )}
        </div>
      )}

      {/* REVIEW SCHEDULE TAB */}
      {tab === 'review_schedule' && (
        <div className="animate-fade-in space-y-4">
          {dueForReview.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-semibold text-red-700 text-sm mb-3">Overdue for Review ({dueForReview.length})</h3>
              {dueForReview.map(p => (
                <a key={p.id} href={`/policies/${p.id}`} className="flex items-center justify-between py-2 border-b border-red-100 last:border-0 hover:bg-red-100/50 px-2 rounded">
                  <span className="text-sm text-foreground">{p.title}</span>
                  <span className="text-xs text-red-600">Due: {new Date(p.next_review_date!).toLocaleDateString()}</span>
                </a>
              ))}
            </div>
          )}
          {upcomingReviews.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="font-semibold text-yellow-700 text-sm mb-3">Upcoming Reviews — Next 30 Days ({upcomingReviews.length})</h3>
              {upcomingReviews.map(p => (
                <a key={p.id} href={`/policies/${p.id}`} className="flex items-center justify-between py-2 border-b border-yellow-100 last:border-0 hover:bg-yellow-100/50 px-2 rounded">
                  <span className="text-sm text-foreground">{p.title}</span>
                  <span className="text-xs text-yellow-600">Due: {new Date(p.next_review_date!).toLocaleDateString()}</span>
                </a>
              ))}
            </div>
          )}
          <div className="bg-card rounded-xl shadow-sm border border-border p-4">
            <h3 className="font-semibold text-foreground text-sm mb-3">All Policies — Review Schedule</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">Policy</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Frequency</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Last Reviewed</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Next Review</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {policies.filter(p => p.status !== 'archived').map(p => (
                  <tr key={p.id}>
                    <td className="py-2"><a href={`/policies/${p.id}`} className="text-primary hover:underline">{p.title}</a></td>
                    <td className="py-2 text-muted-foreground">{REVIEW_FREQUENCY_LABELS[p.review_frequency]}</td>
                    <td className="py-2 text-muted-foreground">{p.last_reviewed_at ? new Date(p.last_reviewed_at).toLocaleDateString() : 'Never'}</td>
                    <td className="py-2">{p.next_review_date ? new Date(p.next_review_date).toLocaleDateString() : 'Not set'}</td>
                    <td className="py-2"><StatusBadge status={statusToKey[p.status] || p.status} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACKNOWLEDGEMENTS TAB */}
      {tab === 'acknowledgements' && (
        <div className="animate-fade-in space-y-4">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Policy</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Version</th>
                  {profiles.map(p => (
                    <th key={p.id} className="text-center py-3 px-2 font-medium text-muted-foreground text-xs max-w-[80px] truncate" title={p.full_name}>
                      {p.full_name.split(' ')[0]}
                    </th>
                  ))}
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {policies.filter(p => p.status === 'published').map(policy => {
                  const ack = getAckRate(policy.id, policy.version)
                  return (
                    <tr key={policy.id}>
                      <td className="py-3 px-4 font-medium">{policy.title}</td>
                      <td className="py-3 px-2 text-center text-muted-foreground">v{policy.version}</td>
                      {profiles.map(p => {
                        const hasAcked = acknowledgements.some(a => a.policy_id === policy.id && a.user_id === p.id && a.version_acknowledged === policy.version)
                        return (
                          <td key={p.id} className="py-3 px-2 text-center">
                            <span className={`text-sm ${hasAcked ? 'text-green-500' : 'text-muted-foreground/40'}`}>{hasAcked ? '&#10003;' : '&#9675;'}</span>
                          </td>
                        )
                      })}
                      <td className="py-3 px-2 text-center">
                        <span className={`text-xs font-medium ${ack.rate === 100 ? 'text-green-600' : ack.rate > 50 ? 'text-yellow-600' : 'text-red-600'}`}>{ack.rate}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
