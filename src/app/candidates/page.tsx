'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import { PageHeader } from '@/components/ui/page-header'

type CandidateStatus = 'invited' | 'in_progress' | 'submitted' | 'reviewed' | 'shortlisted' | 'interview' | 'offered' | 'hired' | 'rejected' | 'withdrawn'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'invited', label: 'Invited' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
] as const

type TabId = (typeof STATUS_TABS)[number]['id']

const COMPLETED_STATUSES: CandidateStatus[] = ['submitted', 'reviewed', 'shortlisted', 'interview']
const APPROVED_STATUSES: CandidateStatus[] = ['offered', 'hired']

const STATUS_COLORS: Record<CandidateStatus, { bg: string; text: string }> = {
  invited: { bg: '#DBEAFE', text: '#1E40AF' },
  in_progress: { bg: '#FEF3C7', text: '#92400E' },
  submitted: { bg: '#E0E7FF', text: '#3730A3' },
  reviewed: { bg: '#D1FAE5', text: '#065F46' },
  shortlisted: { bg: '#D1FAE5', text: '#065F46' },
  interview: { bg: '#FCE7F3', text: '#9D174D' },
  offered: { bg: '#D1FAE5', text: '#065F46' },
  hired: { bg: '#D1FAE5', text: '#065F46' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
  withdrawn: { bg: '#F3F4F6', text: '#6B7280' },
}

const DISC_LABELS: Record<string, string> = {
  D: 'Dominance',
  I: 'Influence',
  S: 'Steadiness',
  C: 'Conscientiousness',
}

const ROLE_OPTIONS = [
  { value: 'educator', label: 'Educator' },
  { value: 'room_leader', label: 'Room Leader' },
  { value: 'ect', label: 'ECT' },
  { value: 'el', label: 'Educational Leader' },
  { value: 'ns', label: 'Nominated Supervisor' },
  { value: 'cook', label: 'Cook' },
  { value: 'admin', label: 'Admin' },
  { value: 'casual', label: 'Casual' },
]

interface Position {
  id: string
  title: string
  role: string
  status: string
}

interface Candidate {
  id: string
  full_name: string
  email: string
  phone: string | null
  status: CandidateStatus
  knowledge_score: number | null
  overall_rank: number | null
  disc_profile: { primary_type?: string } | null
  created_at: string
  recruitment_positions: { title: string; role: string } | null
  position_id: string
}

export default function CandidatesPage() {
  const profile = useProfile()
  const router = useRouter()
  const supabase = createClient()

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Modal state
  const [showCreatePosition, setShowCreatePosition] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create position form
  const [newPosition, setNewPosition] = useState({ title: '', role: 'educator', room: '', description: '', requirements: '' })

  // Invite form
  const [invite, setInvite] = useState({ position_id: '', full_name: '', email: '', phone: '', referred_by_name: '' })
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const showFlash = (type: 'success' | 'error', text: string) => {
    setFlash({ type, text })
    setTimeout(() => setFlash(null), 4000)
  }

  const loadData = async () => {
    setLoading(true)
    const [candRes, posRes] = await Promise.all([
      supabase
        .from('recruitment_candidates')
        .select('*, recruitment_positions(title, role)')
        .order('created_at', { ascending: false }),
      supabase
        .from('recruitment_positions')
        .select('id, title, role, status'),
    ])
    setCandidates((candRes.data as Candidate[] | null) || [])
    setPositions((posRes.data as Position[] | null) || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      // Tab filter
      if (activeTab === 'invited' && c.status !== 'invited') return false
      if (activeTab === 'in_progress' && c.status !== 'in_progress') return false
      if (activeTab === 'completed' && !COMPLETED_STATUSES.includes(c.status)) return false
      if (activeTab === 'approved' && !APPROVED_STATUSES.includes(c.status)) return false
      if (activeTab === 'rejected' && c.status !== 'rejected') return false

      // Position filter
      if (positionFilter !== 'all' && c.position_id !== positionFilter) return false

      return true
    })
  }, [candidates, activeTab, positionFilter])

  const tabCounts = useMemo(() => {
    const counts: Record<TabId, number> = { all: candidates.length, invited: 0, in_progress: 0, completed: 0, approved: 0, rejected: 0 }
    for (const c of candidates) {
      if (c.status === 'invited') counts.invited++
      else if (c.status === 'in_progress') counts.in_progress++
      else if (COMPLETED_STATUSES.includes(c.status)) counts.completed++
      else if (APPROVED_STATUSES.includes(c.status)) counts.approved++
      else if (c.status === 'rejected') counts.rejected++
    }
    return counts
  }, [candidates])

  const handleCreatePosition = async () => {
    if (!newPosition.title.trim() || !newPosition.role) {
      showFlash('error', 'Title and role are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/recruitment/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPosition.title.trim(),
          role: newPosition.role,
          room: newPosition.room.trim() || null,
          description: newPosition.description.trim() || null,
          requirements: newPosition.requirements.trim() || null,
          status: 'open',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create position')
      showFlash('success', 'Position created')
      setShowCreatePosition(false)
      setNewPosition({ title: '', role: 'educator', room: '', description: '', requirements: '' })
      loadData()
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Failed to create position')
    }
    setSaving(false)
  }

  const handleInvite = async () => {
    if (!invite.position_id || !invite.full_name.trim() || !invite.email.trim()) {
      showFlash('error', 'Position, name, and email are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/recruitment/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position_id: invite.position_id,
          full_name: invite.full_name.trim(),
          email: invite.email.trim(),
          phone: invite.phone.trim() || null,
          referred_by_name: invite.referred_by_name.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to invite candidate')
      const baseUrl = window.location.origin
      setInviteLink(`${baseUrl}${data.invite_url}`)
      showFlash('success', 'Candidate invited successfully')
      loadData()
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Failed to invite')
    }
    setSaving(false)
  }

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      showFlash('success', 'Link copied to clipboard')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  if (!['admin', 'manager', 'ns'].includes(profile.role)) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">Only admins, managers, and nominated supervisors can access recruitment.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Recruitment"
        description="Manage positions, candidates, and hiring pipeline"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreatePosition(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
            >
              New Position
            </button>
            <button
              onClick={() => { setShowInvite(true); setInviteLink(null); setInvite({ position_id: positions.find(p => p.status === 'open')?.id || '', full_name: '', email: '', phone: '', referred_by_name: '' }) }}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary/90 transition-colors"
            >
              Invite Candidate
            </button>
          </div>
        }
      />

      {/* Flash message */}
      {flash && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${flash.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {flash.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-px">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-card border border-b-0 border-border text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-muted-foreground">({tabCounts[tab.id]})</span>
          </button>
        ))}
      </div>

      {/* Position filter */}
      <div className="flex items-center gap-3">
        <select
          value={positionFilter}
          onChange={e => setPositionFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
        >
          <option value="all">All Positions</option>
          {positions.map(p => (
            <option key={p.id} value={p.id}>{p.title} ({p.role})</option>
          ))}
        </select>
      </div>

      {/* Candidate cards */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">Loading candidates...</p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No candidates match the current filters</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredCandidates.map(c => {
            const colors = STATUS_COLORS[c.status] || { bg: '#F3F4F6', text: '#6B7280' }
            const discType = c.disc_profile?.primary_type
            return (
              <button
                key={c.id}
                onClick={() => router.push(`/candidates/${c.id}`)}
                className="w-full text-left bg-card rounded-xl shadow-sm border border-border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{c.full_name}</span>
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{c.email}</div>
                    {c.recruitment_positions && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c.recruitment_positions.title} ({c.recruitment_positions.role})
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-right">
                    {c.overall_rank !== null && (
                      <div>
                        <div className="text-xs text-muted-foreground">Score</div>
                        <div className="text-sm font-bold text-foreground">{c.overall_rank}/100</div>
                      </div>
                    )}
                    {discType && (
                      <div>
                        <div className="text-xs text-muted-foreground">DISC</div>
                        <div className="text-sm font-bold text-foreground" title={DISC_LABELS[discType] || discType}>
                          {discType}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground">Date</div>
                      <div className="text-xs text-foreground">{formatDate(c.created_at)}</div>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Create Position Modal */}
      {showCreatePosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Create Position</h2>
                <button onClick={() => setShowCreatePosition(false)} className="p-1 rounded-lg hover:bg-accent">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                <input
                  type="text"
                  value={newPosition.title}
                  onChange={e => setNewPosition({ ...newPosition, title: e.target.value })}
                  placeholder="e.g., Full-Time Educator - Nursery"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select
                  value={newPosition.role}
                  onChange={e => setNewPosition({ ...newPosition, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Room</label>
                <input
                  type="text"
                  value={newPosition.room}
                  onChange={e => setNewPosition({ ...newPosition, room: e.target.value })}
                  placeholder="e.g., Nursery, Toddlers, Preschool"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea
                  value={newPosition.description}
                  onChange={e => setNewPosition({ ...newPosition, description: e.target.value })}
                  rows={3}
                  placeholder="Position description..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Requirements</label>
                <textarea
                  value={newPosition.requirements}
                  onChange={e => setNewPosition({ ...newPosition, requirements: e.target.value })}
                  rows={3}
                  placeholder="Key requirements for the role..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  onClick={() => setShowCreatePosition(false)}
                  className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePosition}
                  disabled={saving || !newPosition.title.trim()}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Candidate Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Invite Candidate</h2>
                <button onClick={() => { setShowInvite(false); setInviteLink(null) }} className="p-1 rounded-lg hover:bg-accent">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Position</label>
                <select
                  value={invite.position_id}
                  onChange={e => setInvite({ ...invite, position_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">Select a position...</option>
                  {positions.filter(p => p.status === 'open').map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  value={invite.full_name}
                  onChange={e => setInvite({ ...invite, full_name: e.target.value })}
                  placeholder="Candidate's full name"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={invite.email}
                  onChange={e => setInvite({ ...invite, email: e.target.value })}
                  placeholder="candidate@example.com"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={invite.phone}
                  onChange={e => setInvite({ ...invite, phone: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Referrer Name</label>
                <input
                  type="text"
                  value={invite.referred_by_name}
                  onChange={e => setInvite({ ...invite, referred_by_name: e.target.value })}
                  placeholder="Optional - staff member who referred"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              {inviteLink && (
                <div className="bg-muted rounded-lg p-3 space-y-2">
                  <label className="block text-sm font-medium text-foreground">Invite Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="flex-1 px-3 py-2 text-xs border border-border rounded-lg bg-card text-foreground font-mono"
                    />
                    <button
                      onClick={copyLink}
                      className="px-3 py-2 text-xs font-medium text-white rounded-lg bg-primary hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  onClick={() => { setShowInvite(false); setInviteLink(null) }}
                  className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  {inviteLink ? 'Done' : 'Cancel'}
                </button>
                {!inviteLink && (
                  <button
                    onClick={handleInvite}
                    disabled={saving || !invite.position_id || !invite.full_name.trim() || !invite.email.trim()}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Inviting...' : 'Send Invite'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
