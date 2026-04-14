'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import { PageHeader } from '@/components/ui/page-header'

type CandidateStatus = 'invited' | 'in_progress' | 'submitted' | 'reviewed' | 'shortlisted' | 'interview' | 'offered' | 'hired' | 'rejected' | 'withdrawn'

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

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'knowledge', label: 'Knowledge Results' },
  { id: 'disc', label: 'DISC Profile' },
  { id: 'personality', label: 'Personality Analysis' },
  { id: 'team_fit', label: 'Team Fit' },
  { id: 'recommendation', label: 'AI Recommendation' },
] as const

type TabId = (typeof TABS)[number]['id']

interface DiscProfile {
  disc_d: number
  disc_i: number
  disc_s: number
  disc_c: number
  primary_type: string
  secondary_type: string
}

interface PersonalityAnalysis {
  communication_style?: string
  conflict_approach?: string
  leadership_tendency?: string
  motivational_drivers?: string[]
  stress_responses?: string
  strengths?: string[]
  growth_areas?: string[]
  narrative?: string
  score?: number
  knowledge_scores?: Array<{ question_id: string; score: number; feedback: string }>
}

interface TeamFitAnalysis {
  team_fit_score?: number
  team_dynamics?: string
  collaboration_strengths?: string[]
  potential_friction_points?: string[]
  recommendation?: string
}

interface Candidate {
  id: string
  full_name: string
  email: string
  phone: string | null
  status: CandidateStatus
  access_token: string | null
  knowledge_responses: Array<{ question_id: string; answer: string; time_taken?: number }> | null
  knowledge_score: number | null
  disc_profile: DiscProfile | null
  personality_analysis: PersonalityAnalysis | null
  team_fit_analysis: TeamFitAnalysis | null
  overall_rank: number | null
  ai_recommendation: string | null
  reviewer_notes: string | null
  referred_by: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  position_id: string
  recruitment_positions: {
    title: string
    role: string
    question_bank: Array<{ id: string; question: string; scoring_rubric?: string }> | null
    personality_questions: Array<{ id: string; question: string; category?: string }> | null
  } | null
}

interface ReferrerProfile {
  full_name: string
}

// ============================================================================
// SVG Radar Chart Component
// ============================================================================

function RadarChart({ d, i, s, c }: { d: number; i: number; s: number; c: number }) {
  const size = 240
  const center = size / 2
  const maxRadius = 90

  // 4 axes: top=D, right=I, bottom=S, left=C
  const axes = [
    { label: 'D', value: d, angle: -Math.PI / 2 },
    { label: 'I', value: i, angle: 0 },
    { label: 'S', value: s, angle: Math.PI / 2 },
    { label: 'C', value: c, angle: Math.PI },
  ]

  const getPoint = (angle: number, radius: number) => ({
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  })

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0]

  // Data polygon
  const dataPoints = axes.map(a => getPoint(a.angle, (a.value / 100) * maxRadius))
  const dataPath = dataPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Grid rings */}
      {rings.map(r => {
        const pts = axes.map(a => getPoint(a.angle, r * maxRadius))
        const path = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
        return <path key={r} d={path} fill="none" stroke="currentColor" className="text-border" strokeWidth={1} />
      })}

      {/* Axis lines */}
      {axes.map(a => {
        const end = getPoint(a.angle, maxRadius)
        return <line key={a.label} x1={center} y1={center} x2={end.x} y2={end.y} stroke="currentColor" className="text-border" strokeWidth={1} />
      })}

      {/* Data polygon */}
      <path d={dataPath} fill="rgba(124, 58, 237, 0.2)" stroke="#7C3AED" strokeWidth={2} />

      {/* Data points */}
      {dataPoints.map((p, idx) => (
        <circle key={idx} cx={p.x} cy={p.y} r={4} fill="#7C3AED" />
      ))}

      {/* Axis labels */}
      {axes.map(a => {
        const labelPos = getPoint(a.angle, maxRadius + 18)
        return (
          <text
            key={a.label}
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground text-xs font-bold"
          >
            {a.label} ({a.value})
          </text>
        )
      })}
    </svg>
  )
}

// ============================================================================
// Score colour helper
// ============================================================================

function scoreColor(score: number): string {
  if (score >= 8) return 'text-green-600'
  if (score >= 5) return 'text-amber-600'
  return 'text-red-600'
}

function scoreBg(score: number): string {
  if (score >= 8) return 'bg-green-50'
  if (score >= 5) return 'bg-amber-50'
  return 'bg-red-50'
}

// ============================================================================
// Main Component
// ============================================================================

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const profile = useProfile()
  const router = useRouter()
  const supabase = createClient()

  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [referrer, setReferrer] = useState<ReferrerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [scoring, setScoring] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [onboarding, setOnboarding] = useState(false)

  const showFlash = (type: 'success' | 'error', text: string) => {
    setFlash({ type, text })
    setTimeout(() => setFlash(null), 4000)
  }

  const loadCandidate = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('recruitment_candidates')
      .select('*, recruitment_positions(title, role, question_bank, personality_questions)')
      .eq('id', id)
      .single()

    if (error || !data) {
      setLoading(false)
      return
    }

    setCandidate(data as unknown as Candidate)

    // Load referrer name
    if (data.referred_by) {
      const { data: ref } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.referred_by)
        .single()
      if (ref) setReferrer(ref)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (id) loadCandidate()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const handleScore = async () => {
    if (!candidate) return
    setScoring(true)
    try {
      const res = await fetch('/api/recruitment/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidate.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to score')
      showFlash('success', `Scoring complete. Overall: ${data.scores?.overall}/100`)
      loadCandidate()
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Scoring failed')
    }
    setScoring(false)
  }

  const handleApprove = async () => {
    if (!candidate) return
    const { error } = await supabase
      .from('recruitment_candidates')
      .update({ status: 'offered', updated_at: new Date().toISOString() })
      .eq('id', candidate.id)
    if (error) {
      showFlash('error', 'Failed to approve')
      return
    }
    showFlash('success', 'Candidate approved')
    loadCandidate()
  }

  const handleReject = async () => {
    if (!candidate) return
    setRejecting(true)
    const { error } = await supabase
      .from('recruitment_candidates')
      .update({
        status: 'rejected',
        reviewer_notes: rejectNotes.trim() || null,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate.id)
    if (error) {
      showFlash('error', 'Failed to reject')
    } else {
      showFlash('success', 'Candidate rejected')
      setShowRejectModal(false)
      setRejectNotes('')
      loadCandidate()
    }
    setRejecting(false)
  }

  const handleOnboard = async () => {
    if (!candidate) return
    setOnboarding(true)
    try {
      const res = await fetch('/api/recruitment/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidate.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to onboard')
      showFlash('success', `Onboarding started. ${data.training_assigned} training modules assigned, ${data.tasks_created} tasks created.`)
      loadCandidate()
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Onboarding failed')
    }
    setOnboarding(false)
  }

  const handleDownloadReport = () => {
    showFlash('info' as 'success', 'PDF report generation coming soon')
  }

  const copyInviteLink = () => {
    if (candidate?.access_token) {
      const link = `${window.location.origin}/apply/${candidate.access_token}`
      navigator.clipboard.writeText(link)
      showFlash('success', 'Invite link copied to clipboard')
    }
  }

  if (!['admin', 'manager', 'ns'].includes(profile.role)) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">Only admins, managers, and nominated supervisors can access recruitment.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-sm text-muted-foreground mt-2">Loading candidate...</p>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">Candidate Not Found</h1>
        <button onClick={() => router.push('/candidates')} className="text-sm text-primary hover:underline mt-2">
          Back to Recruitment
        </button>
      </div>
    )
  }

  const statusColors = STATUS_COLORS[candidate.status] || { bg: '#F3F4F6', text: '#6B7280' }
  const disc = candidate.disc_profile
  const pa = candidate.personality_analysis
  const tf = candidate.team_fit_analysis
  const questionBank = candidate.recruitment_positions?.question_bank || []
  const knowledgeScores = pa?.knowledge_scores || []

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title={candidate.full_name}
        description={candidate.recruitment_positions ? `${candidate.recruitment_positions.title} (${candidate.recruitment_positions.role})` : undefined}
        breadcrumbs={[
          { label: 'Recruitment', href: '/candidates' },
          { label: candidate.full_name },
        ]}
      />

      {/* Flash */}
      {flash && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${flash.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {flash.text}
        </div>
      )}

      {/* Actions bar (always visible) */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
          >
            {candidate.status.replace('_', ' ')}
          </span>

          <div className="flex-1" />

          <button
            onClick={handleScore}
            disabled={scoring}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            {scoring ? 'Scoring...' : 'Score Candidate'}
          </button>

          <button
            onClick={handleApprove}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            Approve
          </button>

          <button
            onClick={() => setShowRejectModal(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Reject
          </button>

          {['offered', 'hired', 'shortlisted'].includes(candidate.status) && (
            <button
              onClick={handleOnboard}
              disabled={onboarding}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {onboarding ? 'Starting...' : 'Start Onboarding'}
            </button>
          )}

          <button
            onClick={handleDownloadReport}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
          >
            Download Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map(tab => (
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
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        {/* ============== OVERVIEW TAB ============== */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Full Name</label>
                <div className="text-sm font-medium text-foreground">{candidate.full_name}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <div className="text-sm font-medium text-foreground">{candidate.email}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Phone</label>
                <div className="text-sm font-medium text-foreground">{candidate.phone || '-'}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Position</label>
                <div className="text-sm font-medium text-foreground">
                  {candidate.recruitment_positions ? `${candidate.recruitment_positions.title} (${candidate.recruitment_positions.role})` : '-'}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <div>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
                  >
                    {candidate.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Created</label>
                <div className="text-sm font-medium text-foreground">{formatDate(candidate.created_at)}</div>
              </div>
              {candidate.reviewed_at && (
                <div>
                  <label className="text-xs text-muted-foreground">Reviewed</label>
                  <div className="text-sm font-medium text-foreground">{formatDate(candidate.reviewed_at)}</div>
                </div>
              )}
              {referrer && (
                <div>
                  <label className="text-xs text-muted-foreground">Referred By</label>
                  <div className="text-sm font-medium text-foreground">{referrer.full_name}</div>
                </div>
              )}
            </div>

            {candidate.access_token && (
              <div className="mt-4">
                <label className="text-xs text-muted-foreground mb-1 block">Invite Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/apply/${candidate.access_token}`}
                    className="flex-1 px-3 py-2 text-xs border border-border rounded-lg bg-muted text-foreground font-mono"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="px-3 py-2 text-xs font-medium text-white rounded-lg bg-primary hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {candidate.reviewer_notes && (
              <div className="mt-4">
                <label className="text-xs text-muted-foreground mb-1 block">Reviewer Notes</label>
                <p className="text-sm text-foreground bg-muted rounded-lg p-3">{candidate.reviewer_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* ============== KNOWLEDGE RESULTS TAB ============== */}
        {activeTab === 'knowledge' && (
          <div className="p-6 space-y-4">
            {candidate.knowledge_score !== null && (
              <div className="flex items-center gap-4 mb-4">
                <div className="text-sm text-muted-foreground">Overall Knowledge Score:</div>
                <div className={`text-2xl font-bold ${candidate.knowledge_score >= 70 ? 'text-green-600' : candidate.knowledge_score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {Math.round(candidate.knowledge_score)}%
                </div>
              </div>
            )}

            {knowledgeScores.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Question</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Answer</th>
                      <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">Score</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {knowledgeScores.map((ks, idx) => {
                      const q = questionBank.find(qb => qb.id === ks.question_id)
                      const resp = (candidate.knowledge_responses || []).find(r => r.question_id === ks.question_id)
                      return (
                        <tr key={idx} className={`border-b border-border ${scoreBg(ks.score)}`}>
                          <td className="py-2 px-3 text-foreground max-w-xs">{q?.question || `Question ${idx + 1}`}</td>
                          <td className="py-2 px-3 text-foreground max-w-sm">
                            <span className="line-clamp-3">{resp?.answer || '-'}</span>
                          </td>
                          <td className={`py-2 px-3 text-center font-bold ${scoreColor(ks.score)}`}>
                            {ks.score}/10
                          </td>
                          <td className="py-2 px-3 text-muted-foreground max-w-xs">{ks.feedback}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No knowledge results available. Score the candidate first.</p>
            )}
          </div>
        )}

        {/* ============== DISC PROFILE TAB ============== */}
        {activeTab === 'disc' && (
          <div className="p-6 space-y-6">
            {disc ? (
              <>
                <div className="flex flex-col md:flex-row items-start gap-8">
                  <div className="flex-shrink-0">
                    <RadarChart
                      d={disc.disc_d}
                      i={disc.disc_i}
                      s={disc.disc_s}
                      c={disc.disc_c}
                    />
                  </div>
                  <div className="space-y-3 flex-1">
                    <div>
                      <span className="text-xs text-muted-foreground">Primary Type</span>
                      <div className="text-lg font-bold text-foreground">{disc.primary_type}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Secondary Type</span>
                      <div className="text-lg font-bold text-foreground">{disc.secondary_type}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {[
                        { label: 'Dominance', value: disc.disc_d, color: '#DC2626' },
                        { label: 'Influence', value: disc.disc_i, color: '#F59E0B' },
                        { label: 'Steadiness', value: disc.disc_s, color: '#10B981' },
                        { label: 'Conscientiousness', value: disc.disc_c, color: '#3B82F6' },
                      ].map(item => (
                        <div key={item.label} className="bg-muted rounded-lg p-3">
                          <div className="text-xs text-muted-foreground">{item.label}</div>
                          <div className="text-xl font-bold" style={{ color: item.color }}>{item.value}</div>
                          <div className="mt-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {pa && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                    {pa.communication_style && (
                      <div>
                        <label className="text-xs text-muted-foreground">Communication Style</label>
                        <p className="text-sm text-foreground mt-0.5">{pa.communication_style}</p>
                      </div>
                    )}
                    {pa.conflict_approach && (
                      <div>
                        <label className="text-xs text-muted-foreground">Conflict Approach</label>
                        <p className="text-sm text-foreground mt-0.5">{pa.conflict_approach}</p>
                      </div>
                    )}
                    {pa.leadership_tendency && (
                      <div>
                        <label className="text-xs text-muted-foreground">Leadership Tendency</label>
                        <p className="text-sm text-foreground mt-0.5">{pa.leadership_tendency}</p>
                      </div>
                    )}
                    {pa.motivational_drivers && pa.motivational_drivers.length > 0 && (
                      <div>
                        <label className="text-xs text-muted-foreground">Motivational Drivers</label>
                        <ul className="text-sm text-foreground mt-0.5 list-disc list-inside">
                          {pa.motivational_drivers.map((d, i) => <li key={i}>{d}</li>)}
                        </ul>
                      </div>
                    )}
                    {pa.stress_responses && (
                      <div className="sm:col-span-2">
                        <label className="text-xs text-muted-foreground">Stress Responses</label>
                        <p className="text-sm text-foreground mt-0.5">{pa.stress_responses}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No DISC profile available. Score the candidate first.</p>
            )}
          </div>
        )}

        {/* ============== PERSONALITY ANALYSIS TAB ============== */}
        {activeTab === 'personality' && (
          <div className="p-6 space-y-6">
            {pa?.narrative ? (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Personality Narrative</h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{pa.narrative}</p>
                </div>

                {pa.strengths && pa.strengths.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Key Strengths</h3>
                    <div className="flex flex-wrap gap-2">
                      {pa.strengths.map((s, i) => (
                        <span key={i} className="px-3 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {pa.growth_areas && pa.growth_areas.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Growth Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {pa.growth_areas.map((g, i) => (
                        <span key={i} className="px-3 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No personality analysis available. Score the candidate first.</p>
            )}
          </div>
        )}

        {/* ============== TEAM FIT TAB ============== */}
        {activeTab === 'team_fit' && (
          <div className="p-6 space-y-6">
            {tf ? (
              <>
                {tf.team_fit_score !== undefined && (
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-sm text-muted-foreground">Team Fit Score:</span>
                    <span className={`text-2xl font-bold ${tf.team_fit_score >= 70 ? 'text-green-600' : tf.team_fit_score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {tf.team_fit_score}/100
                    </span>
                  </div>
                )}

                {tf.team_dynamics && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Compatibility Analysis</h3>
                    <p className="text-sm text-foreground leading-relaxed">{tf.team_dynamics}</p>
                  </div>
                )}

                {tf.recommendation && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Recommended Placement</h3>
                    <p className="text-sm text-foreground leading-relaxed">{tf.recommendation}</p>
                  </div>
                )}

                {tf.potential_friction_points && tf.potential_friction_points.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Potential Friction Points</h3>
                    <ul className="text-sm text-foreground list-disc list-inside space-y-1">
                      {tf.potential_friction_points.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}

                {tf.collaboration_strengths && tf.collaboration_strengths.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Collaboration Strengths</h3>
                    <ul className="text-sm text-foreground list-disc list-inside space-y-1">
                      {tf.collaboration_strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No team fit analysis available. Score the candidate first.</p>
            )}
          </div>
        )}

        {/* ============== AI RECOMMENDATION TAB ============== */}
        {activeTab === 'recommendation' && (
          <div className="p-6 space-y-6">
            {candidate.overall_rank !== null ? (
              <>
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-xs text-muted-foreground">Overall Rank</span>
                    <div className={`text-4xl font-bold ${candidate.overall_rank >= 70 ? 'text-green-600' : candidate.overall_rank >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {candidate.overall_rank}/100
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Recommendation</span>
                    <div className="text-sm font-medium text-foreground mt-1">
                      {candidate.overall_rank >= 70 ? 'Hire' : candidate.overall_rank >= 50 ? 'Consider' : 'Do Not Hire'}
                    </div>
                  </div>
                </div>

                {/* Weight breakdown */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Score Breakdown</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-xs text-muted-foreground">Knowledge</div>
                      <div className="text-2xl font-bold text-foreground mt-1">{Math.round(candidate.knowledge_score || 0)}%</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-xs text-muted-foreground">Personality</div>
                      <div className="text-2xl font-bold text-foreground mt-1">{pa?.score || 0}%</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-xs text-muted-foreground">Team Fit</div>
                      <div className="text-2xl font-bold text-foreground mt-1">{tf?.team_fit_score || 0}%</div>
                    </div>
                  </div>
                </div>

                {candidate.ai_recommendation && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">AI Summary</h3>
                    <p className="text-sm text-foreground leading-relaxed bg-muted rounded-lg p-4">{candidate.ai_recommendation}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No AI recommendation yet. Score the candidate first.</p>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Reject Candidate</h2>
              <p className="text-sm text-muted-foreground">Are you sure you want to reject {candidate.full_name}?</p>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Notes (optional)</label>
                <textarea
                  value={rejectNotes}
                  onChange={e => setRejectNotes(e.target.value)}
                  rows={3}
                  placeholder="Reason for rejection..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  onClick={() => { setShowRejectModal(false); setRejectNotes('') }}
                  className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {rejecting ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
