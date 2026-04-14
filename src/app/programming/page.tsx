'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import { PageHeader } from '@/components/ui/page-header'
import {
  BookOpen, FileText, Eye, Lightbulb, CalendarDays,
  Plus, ArrowRight, Filter,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Room {
  id: string
  name: string
  age_group: string | null
}

interface ProgrammingDoc {
  id: string
  title: string
  document_type: string
  topic_folder: string | null
  created_at: string
}

interface QAElement {
  element_code: string
  current_rating: string | null
  status: string | null
}

const PROGRAMMING_DOC_TYPES = [
  'program_plan', 'learning_story', 'observation', 'critical_reflection',
  'curriculum_map', 'transition_statement', 'environment_plan',
  'evidence_summary', 'exceeding_evidence', 'report', 'plan',
]

const DOC_TYPE_LABELS: Record<string, string> = {
  program_plan: 'Program Plan',
  learning_story: 'Learning Story',
  observation: 'Observation',
  critical_reflection: 'Critical Reflection',
  curriculum_map: 'Curriculum Map',
  transition_statement: 'Transition Statement',
  environment_plan: 'Environment Plan',
  evidence_summary: 'Evidence Summary',
  exceeding_evidence: 'Exceeding Evidence',
  report: 'Report',
  plan: 'Plan',
}

const DOC_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  program_plan: { bg: '#DBEAFE', text: '#1E40AF' },
  learning_story: { bg: '#FCE7F3', text: '#9D174D' },
  observation: { bg: '#FEF3C7', text: '#92400E' },
  critical_reflection: { bg: '#E0E7FF', text: '#3730A3' },
  curriculum_map: { bg: '#D1FAE5', text: '#065F46' },
  transition_statement: { bg: '#FEE2E2', text: '#991B1B' },
  environment_plan: { bg: '#CCFBF1', text: '#115E59' },
  evidence_summary: { bg: '#F3E8FF', text: '#6B21A8' },
  exceeding_evidence: { bg: '#D1FAE5', text: '#065F46' },
  report: { bg: '#F3F4F6', text: '#374151' },
  plan: { bg: '#DBEAFE', text: '#1E40AF' },
}

// ─── Quick Action Definitions ───────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label: 'New Weekly Plan',
    icon: CalendarDays,
    prompt: 'Create a weekly program plan',
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  {
    label: 'New Learning Story',
    icon: BookOpen,
    prompt: 'Create a learning story',
    color: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
  },
  {
    label: 'New Observation',
    icon: Eye,
    prompt: 'Create an observation',
    color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  },
  {
    label: 'New Critical Reflection',
    icon: Lightbulb,
    prompt: 'Create a critical reflection',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
  },
]

// ─── PDSA Cycle Phases ──────────────────────────────────────────────────────────

const PDSA_PHASES = [
  {
    label: 'Plan',
    description: 'Identify learning goals, plan experiences, gather resources',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgLight: 'bg-blue-50',
  },
  {
    label: 'Do',
    description: 'Implement planned experiences and intentional teaching',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgLight: 'bg-green-50',
  },
  {
    label: 'Study',
    description: 'Observe, document, and analyse children\'s learning',
    color: 'bg-amber-500',
    textColor: 'text-amber-700',
    bgLight: 'bg-amber-50',
  },
  {
    label: 'Act',
    description: 'Reflect, evaluate, and adjust the program',
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    bgLight: 'bg-purple-50',
  },
]

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ProgrammingPage() {
  const profile = useProfile()
  const router = useRouter()
  const supabase = createClient()

  const [docs, setDocs] = useState<ProgrammingDoc[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [qa1Elements, setQa1Elements] = useState<QAElement[]>([])
  const [docsThisMonth, setDocsThisMonth] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [roomFilter, setRoomFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalAction, setModalAction] = useState<typeof QUICK_ACTIONS[0] | null>(null)
  const [modalRoom, setModalRoom] = useState('')
  const [modalTopic, setModalTopic] = useState('')
  const [modalNotes, setModalNotes] = useState('')

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true)

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [docsRes, roomsRes, qa1Res, countRes] = await Promise.all([
      supabase
        .from('ai_generated_documents')
        .select('id, title, document_type, topic_folder, created_at')
        .in('document_type', PROGRAMMING_DOC_TYPES)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('rooms').select('id, name, age_group'),
      supabase.from('qa_elements').select('element_code, current_rating, status').eq('qa_number', 1),
      supabase
        .from('ai_generated_documents')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth),
    ])

    setDocs((docsRes.data as ProgrammingDoc[] | null) || [])
    setRooms((roomsRes.data as Room[] | null) || [])
    setQa1Elements((qa1Res.data as QAElement[] | null) || [])
    setDocsThisMonth(countRes.count || 0)
    setLoading(false)
  }

  const openQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    setModalAction(action)
    setModalRoom(rooms[0]?.name || '')
    setModalTopic('')
    setModalNotes('')
    setShowModal(true)
  }

  const handleModalSubmit = () => {
    if (!modalAction) return
    const parts = [modalAction.prompt]
    if (modalRoom) parts[0] += ` for the ${modalRoom} room`
    if (modalTopic) parts.push(`Focus on: ${modalTopic}`)
    if (modalNotes) parts.push(`Notes: ${modalNotes}`)
    const message = parts.join('. ')
    router.push(`/chat?message=${encodeURIComponent(message)}`)
  }

  const filteredDocs = docs.filter(d => {
    if (roomFilter !== 'all' && d.topic_folder !== roomFilter) return false
    if (typeFilter !== 'all' && d.document_type !== typeFilter) return false
    return true
  })

  const activeQA1Goals = qa1Elements.filter(e => e.status === 'in_progress' || e.status === 'action_required').length

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  if (!['admin', 'manager', 'ns', 'el', 'educator'].includes(profile.role)) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">You do not have access to the programming section.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Programming & Pedagogy"
        description="Educational Leadership Hub"
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => openQuickAction(action)}
              className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${action.color}`}
            >
              <div className="shrink-0">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{action.label}</div>
              </div>
              <Plus className="size-4 ml-auto shrink-0 opacity-60" />
            </button>
          )
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="text-xs text-muted-foreground font-medium">Docs This Month</div>
          <div className="text-2xl font-bold text-foreground mt-1">{loading ? '...' : docsThisMonth}</div>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="text-xs text-muted-foreground font-medium">Active Rooms</div>
          <div className="text-2xl font-bold text-foreground mt-1">{loading ? '...' : rooms.length}</div>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="text-xs text-muted-foreground font-medium">Recent Documents</div>
          <div className="text-2xl font-bold text-foreground mt-1">{loading ? '...' : docs.length}</div>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="text-xs text-muted-foreground font-medium">QA1 Active Goals</div>
          <div className="text-2xl font-bold text-foreground mt-1">{loading ? '...' : activeQA1Goals}</div>
        </div>
      </div>

      {/* Programming Cycle Widget */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Programming Cycle (Plan-Do-Study-Act)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PDSA_PHASES.map((phase, i) => (
            <div key={phase.label} className={`rounded-xl p-4 ${phase.bgLight} relative`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${phase.color}`} />
                <span className={`text-sm font-bold ${phase.textColor}`}>{phase.label}</span>
                {i < PDSA_PHASES.length - 1 && (
                  <ArrowRight className={`size-3.5 ml-auto ${phase.textColor} opacity-50 hidden lg:block`} />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{phase.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Programming Documents */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Programming Documents</h2>
            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-muted-foreground" />
              <select
                value={roomFilter}
                onChange={e => setRoomFilter(e.target.value)}
                className="px-2 py-1 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="all">All Rooms</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-2 py-1 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="all">All Types</option>
                {PROGRAMMING_DOC_TYPES.map(t => (
                  <option key={t} value={t}>{DOC_TYPE_LABELS[t] || t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-muted-foreground mt-2">Loading documents...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="size-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No programming documents found</p>
            <p className="text-xs text-muted-foreground mt-1">Use the quick actions above to generate your first document</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredDocs.map(doc => {
              const colors = DOC_TYPE_COLORS[doc.document_type] || { bg: '#F3F4F6', text: '#374151' }
              return (
                <button
                  key={doc.id}
                  onClick={() => router.push(`/documents/library?search=${encodeURIComponent(doc.title)}`)}
                  className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">{doc.title}</span>
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-medium shrink-0"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                      </span>
                    </div>
                    {doc.topic_folder && (
                      <div className="text-xs text-muted-foreground mt-0.5">{doc.topic_folder}</div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{formatDate(doc.created_at)}</div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Action Modal */}
      {showModal && modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{modalAction.label}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-accent">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Room</label>
                <select
                  value={modalRoom}
                  onChange={e => setModalRoom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">Select a room...</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.name}>
                      {r.name}{r.age_group ? ` (${r.age_group})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Topic / Focus</label>
                <input
                  type="text"
                  value={modalTopic}
                  onChange={e => setModalTopic(e.target.value)}
                  placeholder="e.g., Sustainability, Numeracy, Belonging"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Additional Notes</label>
                <textarea
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  rows={3}
                  placeholder="Any specific context, children's interests, or requirements..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalSubmit}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary/90 transition-colors"
                >
                  Open in AI Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
