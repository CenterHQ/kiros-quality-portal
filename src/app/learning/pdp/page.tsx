'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import {
  QA_COLORS,
  ROLE_LABELS,
  type LmsPdpGoal,
  type LmsPdpGoalStatus,
  type LmsPdpReview,
  type LmsPdpReviewStatus,
  type LmsModule,
  type LmsPathway,
  type LmsEnrollment,
  type LmsPathwayEnrollment,
  type Profile,
} from '@/lib/types'

type ActiveTab = 'goals' | 'reviews' | 'staff'

const GOAL_BORDER_COLORS: Record<LmsPdpGoalStatus, string> = {
  active: '#3b82f6',
  completed: '#22c55e',
  deferred: '#9ca3af',
}

const GOAL_STATUS_LABELS: Record<LmsPdpGoalStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  deferred: 'Deferred',
}

const REVIEW_STATUS_LABELS: Record<LmsPdpReviewStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  acknowledged: 'Acknowledged',
}

const REVIEW_STATUS_COLORS: Record<LmsPdpReviewStatus, { bg: string; text: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280' },
  submitted: { bg: '#edf8fc', text: '#5bc0de' },
  reviewed: { bg: '#fef8ec', text: '#f0ad4e' },
  acknowledged: { bg: '#edf7ed', text: '#5cb85c' },
}

// ---------- Signature Pad Component ----------

function SignaturePad({
  onSave,
  existingSignature,
  label,
}: {
  onSave: (dataUrl: string) => void
  existingSignature?: string | null
  label: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  function getPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    setIsDrawing(true)
    setHasDrawn(true)
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  function stopDraw() {
    setIsDrawing(false)
  }

  function clearCanvas() {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !canvasRef.current) return
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setHasDrawn(false)
  }

  function saveSignature() {
    if (!canvasRef.current || !hasDrawn) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSave(dataUrl)
  }

  if (existingSignature) {
    return (
      <div>
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        <img src={existingSignature} alt="Signature" className="border border-border rounded bg-card h-20" />
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        className="border border-border rounded bg-card cursor-crosshair w-full max-w-[400px]"
        style={{ touchAction: 'none' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={clearCanvas}
          className="px-3 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted"
        >
          Clear
        </button>
        <button
          onClick={saveSignature}
          disabled={!hasDrawn}
          className="px-3 py-1 text-xs rounded text-white disabled:opacity-50 bg-primary"
        >
          Save Signature
        </button>
      </div>
    </div>
  )
}

// ---------- Main Page ----------

export default function PdpPage() {
  const currentUser = useProfile()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<ActiveTab>('goals')

  // Goal state
  const [goals, setGoals] = useState<LmsPdpGoal[]>([])
  const [allModules, setAllModules] = useState<LmsModule[]>([])
  const [allPathways, setAllPathways] = useState<LmsPathway[]>([])
  const [moduleEnrollments, setModuleEnrollments] = useState<LmsEnrollment[]>([])
  const [pathwayEnrollments, setPathwayEnrollments] = useState<LmsPathwayEnrollment[]>([])
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null)

  // Review state
  const [reviews, setReviews] = useState<LmsPdpReview[]>([])

  // Staff review state (admin/manager)
  const [allStaff, setAllStaff] = useState<Profile[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [staffGoals, setStaffGoals] = useState<LmsPdpGoal[]>([])
  const [showCreateReview, setShowCreateReview] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // New goal form
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    related_qa: [] as number[],
    target_date: '',
    linked_module_ids: [] as string[],
    linked_pathway_ids: [] as string[],
  })

  // Edit goal form
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    target_date: '',
    status: 'active' as LmsPdpGoalStatus,
    evidence_notes: '',
  })

  // New review form
  const [reviewForm, setReviewForm] = useState({
    user_id: '',
    review_period: '',
    goals_summary: '',
    strengths: '',
    areas_for_growth: '',
    agreed_actions: '',
  })

  // Draft review edit
  const [draftReviewEdit, setDraftReviewEdit] = useState<{ id: string; goals_summary: string } | null>(null)

  const isPrivileged = ['admin', 'manager', 'ns', 'el'].includes(currentUser.role)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [goalsRes, modulesRes, pathwaysRes, reviewsRes, meRes, peRes] = await Promise.all([
      supabase.from('lms_pdp_goals').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
      supabase.from('lms_modules').select('*').eq('status', 'published').order('title'),
      supabase.from('lms_pathways').select('*').eq('status', 'published').order('title'),
      supabase
        .from('lms_pdp_reviews')
        .select('*, profiles:user_id(id, full_name), reviewer_profiles:reviewer_id(id, full_name)')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false }),
      supabase.from('lms_enrollments').select('*').eq('user_id', currentUser.id),
      supabase.from('lms_pathway_enrollments').select('*').eq('user_id', currentUser.id),
    ])

    if (goalsRes.data) setGoals(goalsRes.data)
    if (modulesRes.data) setAllModules(modulesRes.data)
    if (pathwaysRes.data) setAllPathways(pathwaysRes.data)
    if (reviewsRes.data) setReviews(reviewsRes.data)
    if (meRes.data) setModuleEnrollments(meRes.data)
    if (peRes.data) setPathwayEnrollments(peRes.data)

    if (isPrivileged) {
      const { data: staffData } = await supabase.from('profiles').select('*').order('full_name')
      if (staffData) setAllStaff(staffData)
    }
    setLoading(false)
  }, [currentUser.id, isPrivileged])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Load staff goals when selected
  useEffect(() => {
    if (!selectedStaffId) {
      setStaffGoals([])
      return
    }
    supabase
      .from('lms_pdp_goals')
      .select('*')
      .eq('user_id', selectedStaffId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setStaffGoals(data)
      })
  }, [selectedStaffId])

  // ---------- Goal Actions ----------

  async function handleAddGoal() {
    if (!goalForm.title.trim()) return
    setSaving(true)
    const { error } = await supabase.from('lms_pdp_goals').insert({
      user_id: currentUser.id,
      title: goalForm.title,
      description: goalForm.description || null,
      related_qa: goalForm.related_qa,
      target_date: goalForm.target_date || null,
      status: 'active',
      linked_module_ids: goalForm.linked_module_ids,
      linked_pathway_ids: goalForm.linked_pathway_ids,
      evidence_notes: null,
    })
    if (!error) {
      await supabase.from('activity_log').insert({
        user_id: currentUser.id,
        action: 'created_pdp_goal',
        entity_type: 'lms_pdp_goal',
        details: goalForm.title,
      })
      setGoalForm({ title: '', description: '', related_qa: [], target_date: '', linked_module_ids: [], linked_pathway_ids: [] })
      setShowAddGoal(false)
      await loadData()
    }
    setSaving(false)
  }

  function startEditGoal(goal: LmsPdpGoal) {
    setEditingGoalId(goal.id)
    setEditForm({
      title: goal.title,
      description: goal.description || '',
      target_date: goal.target_date || '',
      status: goal.status,
      evidence_notes: goal.evidence_notes || '',
    })
  }

  async function handleSaveGoalEdit(goalId: string) {
    setSaving(true)
    await supabase.from('lms_pdp_goals').update({
      title: editForm.title,
      description: editForm.description || null,
      target_date: editForm.target_date || null,
      status: editForm.status,
      evidence_notes: editForm.evidence_notes || null,
    }).eq('id', goalId)
    setEditingGoalId(null)
    await loadData()
    setSaving(false)
  }

  // ---------- Review Actions ----------

  async function handleSubmitDraftReview(reviewId: string, goalsSummary: string) {
    setSaving(true)
    await supabase.from('lms_pdp_reviews').update({
      goals_summary: goalsSummary,
      status: 'submitted',
    }).eq('id', reviewId)
    setDraftReviewEdit(null)
    await loadData()
    setSaving(false)
  }

  async function handleStaffSignature(reviewId: string, dataUrl: string) {
    setSaving(true)
    await supabase.from('lms_pdp_reviews').update({
      staff_signature: dataUrl,
      status: 'acknowledged',
    }).eq('id', reviewId)
    await loadData()
    setSaving(false)
  }

  // ---------- Staff Review Actions ----------

  async function handleCreateReview() {
    if (!reviewForm.user_id || !reviewForm.review_period) return
    setSaving(true)
    const { error } = await supabase.from('lms_pdp_reviews').insert({
      user_id: reviewForm.user_id,
      reviewer_id: currentUser.id,
      review_period: reviewForm.review_period,
      goals_summary: reviewForm.goals_summary || null,
      strengths: reviewForm.strengths || null,
      areas_for_growth: reviewForm.areas_for_growth || null,
      agreed_actions: reviewForm.agreed_actions || null,
      status: 'draft',
    })
    if (!error) {
      await supabase.from('activity_log').insert({
        user_id: currentUser.id,
        action: 'created_pdp_review',
        entity_type: 'lms_pdp_review',
        details: `Review for ${reviewForm.review_period}`,
      })
      setReviewForm({ user_id: '', review_period: '', goals_summary: '', strengths: '', areas_for_growth: '', agreed_actions: '' })
      setShowCreateReview(false)
      await loadData()
    }
    setSaving(false)
  }

  async function handleReviewerSignature(reviewId: string, dataUrl: string) {
    setSaving(true)
    await supabase.from('lms_pdp_reviews').update({
      reviewer_signature: dataUrl,
      status: 'reviewed',
      reviewed_at: new Date().toISOString(),
    }).eq('id', reviewId)
    await loadData()
    setSaving(false)
  }

  // ---------- Helpers ----------

  function getModuleTitle(moduleId: string): string {
    return allModules.find((m) => m.id === moduleId)?.title || 'Unknown Module'
  }

  function getModuleStatus(moduleId: string): string {
    return moduleEnrollments.find((e) => e.module_id === moduleId)?.status || 'not_started'
  }

  function getPathwayTitle(pathwayId: string): string {
    return allPathways.find((p) => p.id === pathwayId)?.title || 'Unknown Pathway'
  }

  function getPathwayStatus(pathwayId: string): string {
    return pathwayEnrollments.find((e) => e.pathway_id === pathwayId)?.status || 'not_started'
  }

  function toggleQA(qa: number, arr: number[], setter: (v: number[]) => void) {
    setter(arr.includes(qa) ? arr.filter((q) => q !== qa) : [...arr, qa])
  }

  function toggleMulti(id: string, arr: string[], setter: (v: string[]) => void) {
    setter(arr.includes(id) ? arr.filter((i) => i !== id) : [...arr, id])
  }

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-72" />
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'goals', label: 'My Goals' },
    { key: 'reviews', label: 'My Reviews' },
  ]
  if (isPrivileged) tabs.push({ key: 'staff', label: 'Review Staff' })

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Professional Development Plan</h1>
        <p className="text-muted-foreground mt-1">Manage your goals, track your progress, and participate in PDP reviews.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== MY GOALS TAB ==================== */}
      {activeTab === 'goals' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Goals</h2>
            <button
              onClick={() => setShowAddGoal(!showAddGoal)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-primary"
            >
              {showAddGoal ? 'Cancel' : '+ Add Goal'}
            </button>
          </div>

          {/* Add Goal Form */}
          {showAddGoal && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-5 mb-5">
              <h3 className="font-semibold text-foreground mb-3">New Goal</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
                  <input
                    type="text"
                    value={goalForm.title}
                    onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g. Improve documentation for QA1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                  <textarea
                    value={goalForm.description}
                    onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Related QA Areas</label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((qa) => (
                      <button
                        key={qa}
                        type="button"
                        onClick={() => toggleQA(qa, goalForm.related_qa, (v) => setGoalForm({ ...goalForm, related_qa: v }))}
                        className="text-xs font-semibold px-3 py-1 rounded-full border-2 transition-colors"
                        style={{
                          borderColor: QA_COLORS[qa],
                          backgroundColor: goalForm.related_qa.includes(qa) ? QA_COLORS[qa] : 'transparent',
                          color: goalForm.related_qa.includes(qa) ? '#fff' : QA_COLORS[qa],
                        }}
                      >
                        QA{qa}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Target Date</label>
                  <input
                    type="date"
                    value={goalForm.target_date}
                    onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                    className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Link Modules</label>
                  <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                    {allModules.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted px-1 py-0.5 rounded">
                        <input
                          type="checkbox"
                          checked={goalForm.linked_module_ids.includes(m.id)}
                          onChange={() => toggleMulti(m.id, goalForm.linked_module_ids, (v) => setGoalForm({ ...goalForm, linked_module_ids: v }))}
                          className="rounded border-border"
                        />
                        <span className="truncate">{m.title}</span>
                      </label>
                    ))}
                    {allModules.length === 0 && <p className="text-xs text-muted-foreground">No modules available</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Link Pathways</label>
                  <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                    {allPathways.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted px-1 py-0.5 rounded">
                        <input
                          type="checkbox"
                          checked={goalForm.linked_pathway_ids.includes(p.id)}
                          onChange={() => toggleMulti(p.id, goalForm.linked_pathway_ids, (v) => setGoalForm({ ...goalForm, linked_pathway_ids: v }))}
                          className="rounded border-border"
                        />
                        <span className="truncate">{p.title}</span>
                      </label>
                    ))}
                    {allPathways.length === 0 && <p className="text-xs text-muted-foreground">No pathways available</p>}
                  </div>
                </div>
                <button
                  onClick={handleAddGoal}
                  disabled={saving || !goalForm.title.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 bg-primary"
                >
                  {saving ? 'Saving...' : 'Create Goal'}
                </button>
              </div>
            </div>
          )}

          {/* Goals List */}
          {goals.length === 0 ? (
            <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
              <p className="text-muted-foreground">No goals yet. Add your first professional development goal to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                const isEditing = editingGoalId === goal.id

                return (
                  <div
                    key={goal.id}
                    className="bg-card rounded-xl shadow-sm border border-border overflow-hidden"
                    style={{ borderLeft: `4px solid ${GOAL_BORDER_COLORS[goal.status]}` }}
                  >
                    <div className="p-5">
                      {isEditing ? (
                        /* Edit mode */
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                          <textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            rows={2}
                            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Description"
                          />
                          <div className="flex gap-3 flex-wrap">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Target Date</label>
                              <input
                                type="date"
                                value={editForm.target_date}
                                onChange={(e) => setEditForm({ ...editForm, target_date: e.target.value })}
                                className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Status</label>
                              <select
                                value={editForm.status}
                                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as LmsPdpGoalStatus })}
                                className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="deferred">Deferred</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Evidence Notes</label>
                            <textarea
                              value={editForm.evidence_notes}
                              onChange={(e) => setEditForm({ ...editForm, evidence_notes: e.target.value })}
                              rows={3}
                              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Record evidence of progress..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveGoalEdit(goal.id)}
                              disabled={saving}
                              className="px-3 py-1.5 text-sm font-medium rounded-lg text-white disabled:opacity-50 bg-primary"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingGoalId(null)}
                              className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-semibold text-foreground">{goal.title}</h3>
                                <span
                                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: GOAL_BORDER_COLORS[goal.status] + '20',
                                    color: GOAL_BORDER_COLORS[goal.status],
                                  }}
                                >
                                  {GOAL_STATUS_LABELS[goal.status]}
                                </span>
                              </div>
                              {goal.description && <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>}
                            </div>
                            <button
                              onClick={() => startEditGoal(goal)}
                              className="text-xs font-medium px-2 py-1 rounded hover:bg-muted text-muted-foreground flex-shrink-0"
                            >
                              Edit
                            </button>
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-3 flex-wrap mb-3">
                            {(goal.related_qa || []).map((qa) => (
                              <span
                                key={qa}
                                className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: QA_COLORS[qa] || '#666' }}
                              >
                                QA{qa}
                              </span>
                            ))}
                            {goal.target_date && (
                              <span className="text-xs text-muted-foreground">
                                Target: {new Date(goal.target_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {/* Linked modules */}
                          {goal.linked_module_ids?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Linked Modules</p>
                              <div className="flex flex-wrap gap-1.5">
                                {goal.linked_module_ids.map((mId) => {
                                  const status = getModuleStatus(mId)
                                  return (
                                    <span
                                      key={mId}
                                      className="text-xs px-2 py-0.5 rounded-full border flex items-center gap-1"
                                      style={{
                                        borderColor: status === 'completed' ? '#22c55e' : '#d1d5db',
                                        color: status === 'completed' ? '#22c55e' : '#6b7280',
                                      }}
                                    >
                                      {status === 'completed' && (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                      {getModuleTitle(mId)}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Linked pathways */}
                          {goal.linked_pathway_ids?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Linked Pathways</p>
                              <div className="flex flex-wrap gap-1.5">
                                {goal.linked_pathway_ids.map((pId) => {
                                  const status = getPathwayStatus(pId)
                                  return (
                                    <span
                                      key={pId}
                                      className="text-xs px-2 py-0.5 rounded-full border flex items-center gap-1"
                                      style={{
                                        borderColor: status === 'completed' ? '#22c55e' : '#d1d5db',
                                        color: status === 'completed' ? '#22c55e' : '#6b7280',
                                      }}
                                    >
                                      {status === 'completed' && (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                      {getPathwayTitle(pId)}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Evidence notes toggle */}
                          {goal.evidence_notes && (
                            <div>
                              <button
                                onClick={() =>
                                  setExpandedEvidenceId(expandedEvidenceId === goal.id ? null : goal.id)
                                }
                                className="text-xs font-medium hover:underline text-primary"
                              >
                                {expandedEvidenceId === goal.id ? 'Hide Evidence Notes' : 'Show Evidence Notes'}
                              </button>
                              {expandedEvidenceId === goal.id && (
                                <p className="mt-1 text-sm text-muted-foreground bg-muted rounded p-3 whitespace-pre-wrap">
                                  {goal.evidence_notes}
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== MY REVIEWS TAB ==================== */}
      {activeTab === 'reviews' && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">My Reviews</h2>
          {reviews.length === 0 ? (
            <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
              <p className="text-muted-foreground">No reviews yet. Your supervisor will create your PDP review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const statusColor = REVIEW_STATUS_COLORS[review.status]
                const reviewerName =
                  (review.reviewer_profiles as unknown as Profile)?.full_name || 'Unassigned'
                const isDraft = review.status === 'draft'
                const isReviewed = review.status === 'reviewed'

                return (
                  <div key={review.id} className="bg-card rounded-xl shadow-sm border border-border p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {review.review_period || 'Review'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Reviewer: {reviewerName}
                          {review.reviewed_at &&
                            ` | Reviewed: ${new Date(review.reviewed_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                      >
                        {REVIEW_STATUS_LABELS[review.status]}
                      </span>
                    </div>

                    {/* Draft: editable goals_summary + submit */}
                    {isDraft && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Goals Summary</label>
                          <textarea
                            value={draftReviewEdit?.id === review.id ? draftReviewEdit.goals_summary : review.goals_summary || ''}
                            onChange={(e) =>
                              setDraftReviewEdit({ id: review.id, goals_summary: e.target.value })
                            }
                            onFocus={() => {
                              if (draftReviewEdit?.id !== review.id)
                                setDraftReviewEdit({ id: review.id, goals_summary: review.goals_summary || '' })
                            }}
                            rows={3}
                            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Summarise your goals and progress for this review period..."
                          />
                        </div>
                        <button
                          onClick={() =>
                            handleSubmitDraftReview(
                              review.id,
                              draftReviewEdit?.id === review.id
                                ? draftReviewEdit.goals_summary
                                : review.goals_summary || ''
                            )
                          }
                          disabled={saving}
                          className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 bg-primary"
                        >
                          {saving ? 'Submitting...' : 'Submit for Review'}
                        </button>
                      </div>
                    )}

                    {/* Reviewed: show feedback + signature pad */}
                    {isReviewed && (
                      <div className="space-y-3">
                        {review.goals_summary && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Goals Summary</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{review.goals_summary}</p>
                          </div>
                        )}
                        {review.strengths && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Strengths</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{review.strengths}</p>
                          </div>
                        )}
                        {review.areas_for_growth && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Areas for Growth</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{review.areas_for_growth}</p>
                          </div>
                        )}
                        {review.agreed_actions && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Agreed Actions</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{review.agreed_actions}</p>
                          </div>
                        )}
                        <div className="pt-2 border-t border-border">
                          <SignaturePad
                            label="Staff Acknowledgement Signature"
                            existingSignature={review.staff_signature}
                            onSave={(dataUrl) => handleStaffSignature(review.id, dataUrl)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Acknowledged or Submitted: read-only summary */}
                    {(review.status === 'acknowledged' || review.status === 'submitted') && (
                      <div className="space-y-3">
                        {review.goals_summary && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Goals Summary</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{review.goals_summary}</p>
                          </div>
                        )}
                        {review.strengths && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Strengths</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{review.strengths}</p>
                          </div>
                        )}
                        {review.areas_for_growth && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Areas for Growth</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{review.areas_for_growth}</p>
                          </div>
                        )}
                        {review.agreed_actions && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Agreed Actions</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{review.agreed_actions}</p>
                          </div>
                        )}
                        {review.staff_signature && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Staff Signature</p>
                            <img src={review.staff_signature} alt="Staff signature" className="border border-border rounded bg-card h-16 mt-1" />
                          </div>
                        )}
                        {review.reviewer_signature && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Reviewer Signature</p>
                            <img src={review.reviewer_signature} alt="Reviewer signature" className="border border-border rounded bg-card h-16 mt-1" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== REVIEW STAFF TAB ==================== */}
      {activeTab === 'staff' && isPrivileged && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-foreground">Review Staff PDPs</h2>
            <button
              onClick={() => setShowCreateReview(!showCreateReview)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-primary"
            >
              {showCreateReview ? 'Cancel' : '+ Create Review'}
            </button>
          </div>

          {/* Create Review Form */}
          {showCreateReview && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-5 mb-5">
              <h3 className="font-semibold text-foreground mb-3">New PDP Review</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Staff Member *</label>
                  <select
                    value={reviewForm.user_id}
                    onChange={(e) => setReviewForm({ ...reviewForm, user_id: e.target.value })}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select staff member...</option>
                    {allStaff
                      .filter((s) => s.id !== currentUser.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({ROLE_LABELS[s.role] || s.role})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Review Period *</label>
                  <input
                    type="text"
                    value={reviewForm.review_period}
                    onChange={(e) => setReviewForm({ ...reviewForm, review_period: e.target.value })}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g. Q2 2026"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Goals Summary</label>
                  <textarea
                    value={reviewForm.goals_summary}
                    onChange={(e) => setReviewForm({ ...reviewForm, goals_summary: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Strengths</label>
                  <textarea
                    value={reviewForm.strengths}
                    onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Areas for Growth</label>
                  <textarea
                    value={reviewForm.areas_for_growth}
                    onChange={(e) => setReviewForm({ ...reviewForm, areas_for_growth: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Agreed Actions</label>
                  <textarea
                    value={reviewForm.agreed_actions}
                    onChange={(e) => setReviewForm({ ...reviewForm, agreed_actions: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleCreateReview}
                  disabled={saving || !reviewForm.user_id || !reviewForm.review_period}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 bg-primary"
                >
                  {saving ? 'Creating...' : 'Create Review'}
                </button>
              </div>
            </div>
          )}

          {/* Staff selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1">View Staff Member Goals</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select staff member...</option>
              {allStaff
                .filter((s) => s.id !== currentUser.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({ROLE_LABELS[s.role] || s.role})
                  </option>
                ))}
            </select>
          </div>

          {/* Staff goals */}
          {selectedStaffId && (
            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-semibold text-foreground">
                {allStaff.find((s) => s.id === selectedStaffId)?.full_name}&#39;s Goals
              </h3>
              {staffGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No goals found for this staff member.</p>
              ) : (
                staffGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="bg-card rounded-xl shadow-sm border border-border p-4"
                    style={{ borderLeft: `4px solid ${GOAL_BORDER_COLORS[goal.status]}` }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground text-sm">{goal.title}</h4>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: GOAL_BORDER_COLORS[goal.status] + '20',
                          color: GOAL_BORDER_COLORS[goal.status],
                        }}
                      >
                        {GOAL_STATUS_LABELS[goal.status]}
                      </span>
                    </div>
                    {goal.description && <p className="text-xs text-muted-foreground">{goal.description}</p>}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {(goal.related_qa || []).map((qa) => (
                        <span
                          key={qa}
                          className="text-xs font-semibold px-1.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: QA_COLORS[qa] || '#666' }}
                        >
                          QA{qa}
                        </span>
                      ))}
                      {goal.target_date && (
                        <span className="text-xs text-muted-foreground">
                          Target: {new Date(goal.target_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Staff reviews with reviewer signature */}
          {selectedStaffId && (
            <StaffReviewsList
              staffId={selectedStaffId}
              supabase={supabase}
              currentUser={currentUser}
              onSignature={handleReviewerSignature}
              saving={saving}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Sub-component for staff reviews ----------

function StaffReviewsList({
  staffId,
  supabase,
  currentUser,
  onSignature,
  saving,
}: {
  staffId: string
  supabase: ReturnType<typeof createClient>
  currentUser: Profile
  onSignature: (reviewId: string, dataUrl: string) => void
  saving: boolean
}) {
  const [staffReviews, setStaffReviews] = useState<LmsPdpReview[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!staffId) return
    setLoading(true)
    supabase
      .from('lms_pdp_reviews')
      .select('*, profiles:user_id(id, full_name), reviewer_profiles:reviewer_id(id, full_name)')
      .eq('user_id', staffId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setStaffReviews(data)
        setLoading(false)
      })
  }, [staffId])

  if (loading) return <p className="text-sm text-muted-foreground">Loading reviews...</p>
  if (staffReviews.length === 0) return <p className="text-sm text-muted-foreground">No reviews found for this staff member.</p>

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Reviews</h3>
      {staffReviews.map((review) => {
        const statusColor = REVIEW_STATUS_COLORS[review.status]
        const canSign =
          review.reviewer_id === currentUser.id &&
          (review.status === 'submitted' || review.status === 'draft') &&
          !review.reviewer_signature

        return (
          <div key={review.id} className="bg-card rounded-xl shadow-sm border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-foreground text-sm">{review.review_period || 'Review'}</h4>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
              >
                {REVIEW_STATUS_LABELS[review.status]}
              </span>
            </div>
            {review.goals_summary && (
              <div className="mb-2">
                <p className="text-xs font-medium text-muted-foreground">Goals Summary</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{review.goals_summary}</p>
              </div>
            )}
            {review.strengths && (
              <div className="mb-2">
                <p className="text-xs font-medium text-muted-foreground">Strengths</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{review.strengths}</p>
              </div>
            )}
            {review.areas_for_growth && (
              <div className="mb-2">
                <p className="text-xs font-medium text-muted-foreground">Areas for Growth</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{review.areas_for_growth}</p>
              </div>
            )}
            {review.agreed_actions && (
              <div className="mb-2">
                <p className="text-xs font-medium text-muted-foreground">Agreed Actions</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{review.agreed_actions}</p>
              </div>
            )}
            {review.reviewer_signature && (
              <div className="mb-2">
                <p className="text-xs font-medium text-muted-foreground">Reviewer Signature</p>
                <img src={review.reviewer_signature} alt="Reviewer signature" className="border border-border rounded bg-card h-16 mt-1" />
              </div>
            )}
            {review.staff_signature && (
              <div className="mb-2">
                <p className="text-xs font-medium text-muted-foreground">Staff Signature</p>
                <img src={review.staff_signature} alt="Staff signature" className="border border-border rounded bg-card h-16 mt-1" />
              </div>
            )}
            {canSign && (
              <div className="pt-2 border-t border-border">
                <SignaturePad
                  label="Sign as Reviewer"
                  onSave={(dataUrl) => onSignature(review.id, dataUrl)}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

