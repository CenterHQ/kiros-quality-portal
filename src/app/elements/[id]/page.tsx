'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QA_COLORS, STATUS_COLORS, type QAElement, type Comment, type Profile } from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'
import CentreContextPanel from '@/components/CentreContextPanel'
import Breadcrumbs from '@/components/Breadcrumbs'

interface ElementAction {
  id: string
  element_id: number
  title: string
  description?: string
  steps?: string[]
  prerequisites?: string
  evidence_required?: string
  evidence_files?: string[]
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed'
  assigned_to?: string | null
  due_date?: string | null
  created_at: string
  updated_at: string
}

interface Tag {
  id: string
  name: string
  color?: string
}

interface EntityTag {
  id: string
  tag_id: string
  entity_type: string
  entity_id: string
}

export default function ElementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [element, setElement] = useState<QAElement | null>(null)
  const [comments, setComments] = useState<(Comment & { profiles: Profile })[]>([])
  const [newComment, setNewComment] = useState('')
  const user = useProfile()
  const supabase = createClient()

  // Element Actions state
  const [elementActions, setElementActions] = useState<ElementAction[]>([])
  const [expandedActions, setExpandedActions] = useState<string[]>([])
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [actionTags, setActionTags] = useState<Record<string, Tag[]>>({})
  const [showNewActionForm, setShowNewActionForm] = useState(false)
  const [newAction, setNewAction] = useState({
    title: '',
    description: '',
    steps: '',
    prerequisites: '',
    evidence_required: '',
    assigned_to: '',
    due_date: '',
  })

  useEffect(() => {
    const load = async () => {
      const { data: el } = await supabase.from('qa_elements').select('*').eq('id', params.id).single()
      if (el) setElement(el)

      const { data: c } = await supabase.from('comments').select('*, profiles(*)').eq('entity_type', 'element').eq('entity_id', String(params.id)).order('created_at', { ascending: true })
      if (c) setComments(c as any)

      // Fetch element actions
      const { data: actions } = await supabase
        .from('element_actions')
        .select('*')
        .eq('element_id', Number(params.id))
        .order('created_at', { ascending: true })
      if (actions) setElementActions(actions as ElementAction[])

      // Fetch all profiles for assignment dropdown
      const { data: profiles } = await supabase.from('profiles').select('*').order('full_name')
      if (profiles) setAllProfiles(profiles)

      // Fetch tags
      const { data: tags } = await supabase.from('tags').select('*').order('name')
      if (tags) setAllTags(tags)

      // Fetch entity_tags for actions
      if (actions && actions.length > 0) {
        const actionIds = actions.map((a: any) => a.id)
        const { data: eTags } = await supabase
          .from('entity_tags')
          .select('*, tags(*)')
          .eq('entity_type', 'element_action')
          .in('entity_id', actionIds)
        if (eTags) {
          const tagMap: Record<string, Tag[]> = {}
          eTags.forEach((et: any) => {
            if (!tagMap[et.entity_id]) tagMap[et.entity_id] = []
            if (et.tags) tagMap[et.entity_id].push(et.tags)
          })
          setActionTags(tagMap)
        }
      }
    }
    load()

    // Realtime comments
    const channel = supabase.channel('element-comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `entity_id=eq.${params.id}` }, async (payload) => {
        const { data } = await supabase.from('comments').select('*, profiles(*)').eq('id', payload.new.id).single()
        if (data) setComments(prev => [...prev, data as any])
      })
      .subscribe()

    // Realtime element_actions
    const actionsChannel = supabase.channel('element-actions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'element_actions', filter: `element_id=eq.${params.id}` }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          setElementActions(prev => [...prev, payload.new as ElementAction])
        } else if (payload.eventType === 'UPDATE') {
          setElementActions(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } as ElementAction : a))
        } else if (payload.eventType === 'DELETE') {
          setElementActions(prev => prev.filter(a => a.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(actionsChannel)
    }
  }, [params.id])

  const updateField = useCallback(async (field: string, value: string) => {
    if (!element) return
    await supabase.from('qa_elements').update({ [field]: value }).eq('id', element.id)
    setElement(prev => prev ? { ...prev, [field]: value } : null)
    // Log activity
    if (user) {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: `Updated ${field}`,
        entity_type: 'element',
        entity_id: String(element.id),
        details: `${element.element_code}: ${field} changed to "${value}"`
      })
    }
  }, [element, user])

  const addComment = async () => {
    if (!newComment.trim() || !user || !element) return
    await supabase.from('comments').insert({
      content: newComment,
      user_id: user.id,
      entity_type: 'element',
      entity_id: String(element.id),
    })
    setNewComment('')
    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      action: 'Added comment',
      entity_type: 'element',
      entity_id: String(element.id),
      details: `Comment on ${element.element_code}`
    })
  }

  // Element Action helpers
  const toggleActionStatus = async (action: ElementAction) => {
    const newStatus = action.status === 'completed' ? 'not_started' : 'completed'
    await supabase.from('element_actions').update({ status: newStatus }).eq('id', action.id)
    setElementActions(prev => prev.map(a => a.id === action.id ? { ...a, status: newStatus } : a))
    if (user && element) {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: newStatus === 'completed' ? 'Completed action' : 'Reopened action',
        entity_type: 'element_action',
        entity_id: action.id,
        details: `${element.element_code}: "${action.title}" marked ${newStatus}`
      })
    }
  }

  const updateAction = async (actionId: string, field: string, value: string | null) => {
    await supabase.from('element_actions').update({ [field]: value }).eq('id', actionId)
    setElementActions(prev => prev.map(a => a.id === actionId ? { ...a, [field]: value } : a))
  }

  const toggleExpand = (actionId: string) => {
    setExpandedActions(prev =>
      prev.includes(actionId) ? prev.filter(id => id !== actionId) : [...prev, actionId]
    )
  }

  const addAction = async () => {
    if (!newAction.title.trim() || !element) return
    const steps = newAction.steps.trim()
      ? newAction.steps.split('\n').map(s => s.trim()).filter(Boolean)
      : []
    const { data, error } = await supabase.from('element_actions').insert({
      element_id: element.id,
      title: newAction.title.trim(),
      description: newAction.description.trim() || null,
      steps: steps.length > 0 ? steps : null,
      prerequisites: newAction.prerequisites.trim() || null,
      evidence_required: newAction.evidence_required.trim() || null,
      assigned_to: newAction.assigned_to || null,
      due_date: newAction.due_date || null,
      status: 'not_started',
    }).select().single()
    if (data) {
      setElementActions(prev => [...prev, data as ElementAction])
      setNewAction({ title: '', description: '', steps: '', prerequisites: '', evidence_required: '', assigned_to: '', due_date: '' })
      setShowNewActionForm(false)
    }
    if (user) {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: 'Created action',
        entity_type: 'element_action',
        entity_id: data?.id || '',
        details: `${element.element_code}: "${newAction.title}"`
      })
    }
  }

  const completedActionCount = elementActions.filter(a => a.status === 'completed').length
  const totalActionCount = elementActions.length
  const actionProgress = totalActionCount > 0 ? Math.round((completedActionCount / totalActionCount) * 100) : 0

  if (!element) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>

  const qaColor = QA_COLORS[element.qa_number] || '#666'

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: 'QA Elements', href: '/elements' },
        { label: `QA${element.qa_number}`, href: `/elements?qa=${element.qa_number}` },
        { label: element.element_code },
      ]} />

      {/* Header */}
      <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">&larr; Back to Elements</button>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mb-6">
        <div className="flex items-center gap-4 p-6 border-b border-border">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: qaColor }}>
            QA{element.qa_number}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{element.element_code} — {element.element_name}</h1>
            <p className="text-sm text-muted-foreground">{element.standard_number}: {element.standard_name}</p>
          </div>
        </div>

        {/* Status & Rating Controls */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-border bg-muted">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Current Rating</label>
            <select value={element.current_rating} onChange={(e) => updateField('current_rating', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none">
              <option value="not_met">Not Met</option>
              <option value="met">Met</option>
              <option value="working_towards">Working Towards</option>
              <option value="meeting">Meeting NQS</option>
              <option value="exceeding">Exceeding NQS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Uplift Status</label>
            <select value={element.status} onChange={(e) => updateField('status', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none">
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="action_taken">Action Taken</option>
              <option value="ready_for_review">Ready for Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Due Date</label>
            <input type="date" value={element.due_date || ''} onChange={(e) => updateField('due_date', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
        </div>

        {/* Concept */}
        {element.concept && (
          <div className="p-6 border-b border-border">
            <p className="text-sm text-muted-foreground italic">{element.concept}</p>
          </div>
        )}
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Officer Finding */}
        {element.officer_finding && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-red-700 uppercase mb-2">Officer Finding</h3>
            <p className="text-sm text-red-800">{element.officer_finding}</p>
          </div>
        )}

        {/* Meeting NQS Criteria */}
        {element.meeting_criteria && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-green-700 uppercase mb-2">What Meeting NQS Looks Like</h3>
            <p className="text-sm text-green-800 whitespace-pre-line">{element.meeting_criteria}</p>
          </div>
        )}

        {/* Exceeding NQS Criteria */}
        {element.exceeding_criteria && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-purple-700 uppercase mb-2">What Exceeding NQS Looks Like</h3>
            <p className="text-sm text-purple-800 whitespace-pre-line">{element.exceeding_criteria}</p>
          </div>
        )}

        {/* Training Points */}
        {element.training_points && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-amber-700 uppercase mb-2">Training Points</h3>
            <p className="text-sm text-amber-800 whitespace-pre-line">{element.training_points}</p>
          </div>
        )}
      </div>

      {/* Centre Context */}
      <div className="mt-6">
        <CentreContextPanel
          elementCodes={[element.element_code]}
          qaNumbers={[element.qa_number]}
          contextTypes={['policy_requirement', 'procedure_step', 'teaching_approach', 'qip_goal', 'qip_strategy']}
          title={`Kiros Context for ${element.element_code}`}
          limit={4}
        />
      </div>

      {/* Editable Notes */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Actions & Notes</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Actions Taken</label>
            <textarea
              value={element.actions_taken || ''}
              onChange={(e) => setElement(prev => prev ? { ...prev, actions_taken: e.target.value } : null)}
              onBlur={(e) => updateField('actions_taken', e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none resize-y min-h-[100px]"
              placeholder="Document actions taken to address this element..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</label>
            <textarea
              value={element.notes || ''}
              onChange={(e) => setElement(prev => prev ? { ...prev, notes: e.target.value } : null)}
              onBlur={(e) => updateField('notes', e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none resize-y min-h-[100px]"
              placeholder="Additional notes..."
            />
          </div>
        </div>
      </div>

      {/* Element Actions Checklist */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Actions Checklist</h2>
            <span className="text-sm text-muted-foreground">{completedActionCount}/{totalActionCount} complete</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${actionProgress}%` }} />
          </div>
        </div>
        <div className="divide-y divide-border">
          {elementActions.map(action => (
            <div key={action.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button onClick={() => toggleActionStatus(action)}
                  aria-label={action.status === 'completed' ? 'Mark action incomplete' : 'Mark action complete'}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
                    action.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-border hover:border-primary'
                  }`}>
                  {action.status === 'completed' && <span className="text-xs">&#10003;</span>}
                </button>
                <div className="flex-1 min-w-0">
                  {/* Title and toggle */}
                  <button onClick={() => toggleExpand(action.id)} className="text-left w-full">
                    <p className={`text-sm font-medium ${action.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {action.title}
                    </p>
                    {action.description && !expandedActions.includes(action.id) && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{action.description}</p>
                    )}
                  </button>
                  {/* Tags */}
                  {actionTags[action.id] && actionTags[action.id].length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {actionTags[action.id].map(tag => (
                        <span key={tag.id} className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Expanded content */}
                  {expandedActions.includes(action.id) && (
                    <div className="mt-3 space-y-3">
                      {action.description && <p className="text-sm text-muted-foreground">{action.description}</p>}
                      {/* Steps */}
                      {action.steps && action.steps.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Steps</p>
                          <ol className="list-decimal list-inside space-y-1">
                            {action.steps.map((step: string, i: number) => (
                              <li key={i} className="text-sm text-muted-foreground">{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {/* Prerequisites */}
                      {action.prerequisites && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Prerequisites</p>
                          <p className="text-sm text-muted-foreground">{action.prerequisites}</p>
                        </div>
                      )}
                      {/* Evidence Required */}
                      {action.evidence_required && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Evidence Required</p>
                          <p className="text-sm text-muted-foreground">{action.evidence_required}</p>
                        </div>
                      )}
                      {/* Evidence Files */}
                      {action.evidence_files && action.evidence_files.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Evidence Files</p>
                          <ul className="space-y-1">
                            {action.evidence_files.map((file: string, i: number) => (
                              <li key={i} className="text-sm text-blue-600 underline">{file}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Status, Assigned, Due Date */}
                      <div className="flex gap-3 flex-wrap">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-0.5">Status</label>
                          <select value={action.status} onChange={e => updateAction(action.id, 'status', e.target.value)}
                            className="px-2 py-1 border border-border rounded text-xs focus:ring-2 focus:ring-primary outline-none">
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="blocked">Blocked</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-0.5">Assigned To</label>
                          <select value={action.assigned_to || ''} onChange={e => updateAction(action.id, 'assigned_to', e.target.value || null)}
                            className="px-2 py-1 border border-border rounded text-xs focus:ring-2 focus:ring-primary outline-none">
                            <option value="">Unassigned</option>
                            {allProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-0.5">Due Date</label>
                          <input type="date" value={action.due_date || ''} onChange={e => updateAction(action.id, 'due_date', e.target.value || null)}
                            className="px-2 py-1 border border-border rounded text-xs focus:ring-2 focus:ring-primary outline-none" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Due date badge */}
                {action.due_date && (
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    action.due_date < new Date().toISOString().split('T')[0] && action.status !== 'completed'
                      ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'
                  }`}>{action.due_date}</span>
                )}
              </div>
            </div>
          ))}
          {elementActions.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No actions yet. Add one below.</div>
          )}
        </div>
        {/* Add new action */}
        <div className="px-6 py-4 border-t border-border bg-muted">
          {!showNewActionForm ? (
            <button onClick={() => setShowNewActionForm(true)}
              className="text-sm text-primary font-medium hover:underline">
              + Add Action
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Title *</label>
                <input type="text" value={newAction.title} onChange={e => setNewAction(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Action title..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Description</label>
                <textarea value={newAction.description} onChange={e => setNewAction(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none resize-y min-h-[60px]"
                  placeholder="Describe this action..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Steps (one per line)</label>
                <textarea value={newAction.steps} onChange={e => setNewAction(prev => ({ ...prev, steps: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none resize-y min-h-[60px]"
                  placeholder="Step 1&#10;Step 2&#10;Step 3" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Prerequisites</label>
                  <input type="text" value={newAction.prerequisites} onChange={e => setNewAction(prev => ({ ...prev, prerequisites: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="What needs to happen first..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Evidence Required</label>
                  <input type="text" value={newAction.evidence_required} onChange={e => setNewAction(prev => ({ ...prev, evidence_required: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="What evidence is needed..." />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Assigned To</label>
                  <select value={newAction.assigned_to} onChange={e => setNewAction(prev => ({ ...prev, assigned_to: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none">
                    <option value="">Unassigned</option>
                    {allProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Due Date</label>
                  <input type="date" value={newAction.due_date} onChange={e => setNewAction(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addAction} disabled={!newAction.title.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
                  Add Action
                </button>
                <button onClick={() => { setShowNewActionForm(false); setNewAction({ title: '', description: '', steps: '', prerequisites: '', evidence_required: '', assigned_to: '', due_date: '' }) }}
                  className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Discussion ({comments.length})</h2>
        </div>
        <div className="p-6">
          {comments.length > 0 ? (
            <div className="space-y-4 mb-6">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {c.profiles?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.profiles?.full_name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">No comments yet. Start a discussion.</p>
          )}
          <div className="flex gap-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              placeholder="Add a comment..."
              rows={2}
            />
            <button
              onClick={addComment}
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50 self-end"
            >Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}
