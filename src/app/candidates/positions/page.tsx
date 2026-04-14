'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import { PageHeader } from '@/components/ui/page-header'

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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#F3F4F6', text: '#6B7280' },
  open: { bg: '#D1FAE5', text: '#065F46' },
  closed: { bg: '#FEE2E2', text: '#991B1B' },
  filled: { bg: '#DBEAFE', text: '#1E40AF' },
}

interface Question {
  id: string
  question: string
  scoring_rubric?: string
}

interface Position {
  id: string
  title: string
  role: string
  room: string | null
  description: string | null
  requirements: string | null
  status: string
  question_bank: Question[]
  personality_questions: Array<{ id: string; question: string; category?: string }>
  candidate_count: number
  created_at: string
  updated_at: string
}

export default function PositionsPage() {
  const profile = useProfile()
  const supabase = createClient()

  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Edit modal
  const [editing, setEditing] = useState<Position | null>(null)
  const [editForm, setEditForm] = useState({ title: '', role: '', room: '', description: '', requirements: '' })
  const [saving, setSaving] = useState(false)

  // Expanded position (to show question bank)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const showFlash = (type: 'success' | 'error', text: string) => {
    setFlash({ type, text })
    setTimeout(() => setFlash(null), 4000)
  }

  const loadPositions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/recruitment/positions')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setPositions(data.positions || [])
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Failed to load positions')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPositions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  const startEditing = (pos: Position) => {
    setEditing(pos)
    setEditForm({
      title: pos.title,
      role: pos.role,
      room: pos.room || '',
      description: pos.description || '',
      requirements: pos.requirements || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editing || !editForm.title.trim()) {
      showFlash('error', 'Title is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/recruitment/positions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          title: editForm.title.trim(),
          role: editForm.role,
          room: editForm.room.trim() || null,
          description: editForm.description.trim() || null,
          requirements: editForm.requirements.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      showFlash('success', 'Position updated')
      setEditing(null)
      loadPositions()
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Failed to update')
    }
    setSaving(false)
  }

  const handleClosePosition = async (posId: string) => {
    try {
      const res = await fetch('/api/recruitment/positions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: posId, status: 'closed' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to close')
      showFlash('success', 'Position closed')
      loadPositions()
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Failed to close position')
    }
  }

  const handleGenerateQuestions = async (posId: string) => {
    setGenerating(true)
    try {
      // Call the candidates API to generate questions via AI
      const res = await fetch('/api/recruitment/positions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: posId,
          question_bank: 'generate', // Signal to backend to generate via AI
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      showFlash('success', 'Questions updated')
      loadPositions()
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Failed to generate questions')
    }
    setGenerating(false)
  }

  if (!['admin', 'manager', 'ns'].includes(profile.role)) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">Only admins, managers, and nominated supervisors can manage positions.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Positions"
        description="Manage recruitment positions and question banks"
        breadcrumbs={[
          { label: 'Recruitment', href: '/candidates' },
          { label: 'Positions' },
        ]}
      />

      {/* Flash */}
      {flash && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${flash.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {flash.text}
        </div>
      )}

      {/* Positions list */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">Loading positions...</p>
        </div>
      ) : positions.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No positions created yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map(pos => {
            const colors = STATUS_COLORS[pos.status] || { bg: '#F3F4F6', text: '#6B7280' }
            const isExpanded = expandedId === pos.id
            const questions = pos.question_bank || []

            return (
              <div key={pos.id} className="bg-card rounded-xl shadow-sm border border-border">
                {/* Position header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{pos.title}</span>
                        <span
                          className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {pos.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{pos.role}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {pos.candidate_count} candidate{pos.candidate_count !== 1 ? 's' : ''} | Created {formatDate(pos.created_at)}
                        {pos.room && ` | Room: ${pos.room}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => startEditing(pos)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
                      >
                        Edit
                      </button>
                      {pos.status === 'open' && (
                        <button
                          onClick={() => handleClosePosition(pos.id)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
                        >
                          Close Position
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : pos.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
                      >
                        {isExpanded ? 'Hide Questions' : `Questions (${questions.length})`}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded question bank */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Question Bank</h3>
                      <button
                        onClick={() => handleGenerateQuestions(pos.id)}
                        disabled={generating}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {generating ? 'Generating...' : 'Generate Questions'}
                      </button>
                    </div>

                    {questions.length > 0 ? (
                      <div className="space-y-2">
                        {questions.map((q, idx) => (
                          <div key={q.id || idx} className="bg-card rounded-lg p-3 border border-border">
                            <div className="text-sm text-foreground">{idx + 1}. {q.question}</div>
                            {q.scoring_rubric && (
                              <div className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">Rubric:</span> {q.scoring_rubric}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No questions in the bank. Click &quot;Generate Questions&quot; to create them with AI.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Edit Position</h2>
                <button onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-accent">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
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
                  value={editForm.room}
                  onChange={e => setEditForm({ ...editForm, room: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Requirements</label>
                <textarea
                  value={editForm.requirements}
                  onChange={e => setEditForm({ ...editForm, requirements: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editForm.title.trim()}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
