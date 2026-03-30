'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Policy, PolicyCategory, PolicyAcknowledgement, Profile } from '@/lib/types'
import { POLICY_STATUS_LABELS, REVIEW_FREQUENCY_LABELS, QA_COLORS } from '@/lib/types'

type Tab = 'library' | 'review_schedule' | 'acknowledgements'

export default function PoliciesPage() {
  const supabase = createClient()
  const [user, setUser] = useState<Profile | null>(null)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [categories, setCategories] = useState<PolicyCategory[]>([])
  const [acknowledgements, setAcknowledgements] = useState<PolicyAcknowledgement[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [tab, setTab] = useState<Tab>('library')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    const { data: { user: au } } = await supabase.auth.getUser()
    if (au) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', au.id).single()
      if (p) setUser(p as Profile)
    }
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

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    under_review: 'bg-yellow-50 text-yellow-600',
    approved: 'bg-blue-50 text-blue-600',
    published: 'bg-green-50 text-green-600',
    archived: 'bg-gray-100 text-gray-400',
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Policy Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create, manage, and track policy acknowledgements</p>
        </div>
        {isPrivileged && (
          <a href="/policies/new" className="px-4 py-2 bg-[#470DA8] text-white rounded-lg text-sm font-medium hover:opacity-90">+ New Policy</a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Policies</p>
          <p className="text-2xl font-bold text-[#470DA8]">{policies.filter(p => p.status !== 'archived').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Published</p>
          <p className="text-2xl font-bold text-green-500">{policies.filter(p => p.status === 'published').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Due for Review</p>
          <p className={`text-2xl font-bold ${dueForReview.length > 0 ? 'text-red-500' : 'text-green-500'}`}>{dueForReview.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Review Coming (30 days)</p>
          <p className={`text-2xl font-bold ${upcomingReviews.length > 0 ? 'text-orange-500' : 'text-green-500'}`}>{upcomingReviews.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { id: 'library', label: 'Policy Library' },
          { id: 'review_schedule', label: `Reviews (${dueForReview.length})` },
          { id: 'acknowledgements', label: 'Acknowledgements' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white shadow-sm text-[#470DA8]' : 'text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
        ))}
      </div>

      {/* LIBRARY TAB */}
      {tab === 'library' && (
        <>
          <div className="flex gap-3 mb-4 flex-wrap">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search policies..." className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] focus:border-transparent w-64" />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Statuses</option>
              {Object.entries(POLICY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Group by category */}
          {categories.filter(c => filtered.some(p => p.category_id === c.id)).map(cat => (
            <div key={cat.id} className="mb-6">
              <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                <span>{cat.icon}</span> {cat.name}
                <span className="text-xs text-gray-400 font-normal">({filtered.filter(p => p.category_id === cat.id).length})</span>
              </h3>
              <div className="space-y-2">
                {filtered.filter(p => p.category_id === cat.id).map(policy => {
                  const ack = getAckRate(policy.id, policy.version)
                  const isOverdue = policy.next_review_date && policy.next_review_date <= today
                  return (
                    <a key={policy.id} href={`/policies/${policy.id}`} className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-gray-900 truncate">{policy.title}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[policy.status]}`}>
                              {POLICY_STATUS_LABELS[policy.status]}
                            </span>
                            {isOverdue && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600">Review Overdue</span>}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>v{policy.version}</span>
                            <span>{REVIEW_FREQUENCY_LABELS[policy.review_frequency]} review</span>
                            {policy.next_review_date && <span>Next: {new Date(policy.next_review_date).toLocaleDateString()}</span>}
                            {policy.related_qa?.length > 0 && (
                              <span className="flex gap-1">
                                {policy.related_qa.map(qa => (
                                  <span key={qa} className="px-1 py-0.5 rounded text-[9px] font-medium text-white" style={{ backgroundColor: QA_COLORS[qa] }}>QA{qa}</span>
                                ))}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#470DA8] rounded-full" style={{ width: `${ack.rate}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 w-16 text-right">{ack.acknowledged}/{ack.total}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">acknowledged</p>
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
              <h3 className="font-semibold text-gray-700 text-sm mb-3">Uncategorized</h3>
              <div className="space-y-2">
                {filtered.filter(p => !p.category_id).map(policy => (
                  <a key={policy.id} href={`/policies/${policy.id}`} className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                    <h4 className="font-medium text-sm text-gray-900">{policy.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[policy.status]}`}>{POLICY_STATUS_LABELS[policy.status]}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-sm">No policies found. {isPrivileged && 'Create your first policy to get started.'}</p>
            </div>
          )}
        </>
      )}

      {/* REVIEW SCHEDULE TAB */}
      {tab === 'review_schedule' && (
        <div className="space-y-4">
          {dueForReview.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-semibold text-red-700 text-sm mb-3">Overdue for Review ({dueForReview.length})</h3>
              {dueForReview.map(p => (
                <a key={p.id} href={`/policies/${p.id}`} className="flex items-center justify-between py-2 border-b border-red-100 last:border-0 hover:bg-red-100/50 px-2 rounded">
                  <span className="text-sm text-gray-900">{p.title}</span>
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
                  <span className="text-sm text-gray-900">{p.title}</span>
                  <span className="text-xs text-yellow-600">Due: {new Date(p.next_review_date!).toLocaleDateString()}</span>
                </a>
              ))}
            </div>
          )}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-700 text-sm mb-3">All Policies — Review Schedule</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-600">Policy</th>
                  <th className="text-left py-2 font-medium text-gray-600">Frequency</th>
                  <th className="text-left py-2 font-medium text-gray-600">Last Reviewed</th>
                  <th className="text-left py-2 font-medium text-gray-600">Next Review</th>
                  <th className="text-left py-2 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {policies.filter(p => p.status !== 'archived').map(p => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2"><a href={`/policies/${p.id}`} className="text-[#470DA8] hover:underline">{p.title}</a></td>
                    <td className="py-2 text-gray-500">{REVIEW_FREQUENCY_LABELS[p.review_frequency]}</td>
                    <td className="py-2 text-gray-500">{p.last_reviewed_at ? new Date(p.last_reviewed_at).toLocaleDateString() : 'Never'}</td>
                    <td className="py-2">{p.next_review_date ? new Date(p.next_review_date).toLocaleDateString() : 'Not set'}</td>
                    <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[p.status]}`}>{POLICY_STATUS_LABELS[p.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACKNOWLEDGEMENTS TAB */}
      {tab === 'acknowledgements' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Policy</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600">Version</th>
                  {profiles.map(p => (
                    <th key={p.id} className="text-center py-3 px-2 font-medium text-gray-600 text-xs max-w-[80px] truncate" title={p.full_name}>
                      {p.full_name.split(' ')[0]}
                    </th>
                  ))}
                  <th className="text-center py-3 px-2 font-medium text-gray-600">Rate</th>
                </tr>
              </thead>
              <tbody>
                {policies.filter(p => p.status === 'published').map(policy => {
                  const ack = getAckRate(policy.id, policy.version)
                  return (
                    <tr key={policy.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 font-medium">{policy.title}</td>
                      <td className="py-3 px-2 text-center text-gray-400">v{policy.version}</td>
                      {profiles.map(p => {
                        const hasAcked = acknowledgements.some(a => a.policy_id === policy.id && a.user_id === p.id && a.version_acknowledged === policy.version)
                        return (
                          <td key={p.id} className="py-3 px-2 text-center">
                            <span className={`text-sm ${hasAcked ? 'text-green-500' : 'text-gray-300'}`}>{hasAcked ? '&#10003;' : '&#9675;'}</span>
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
