'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  QA_COLORS,
  STATUS_COLORS,
  ROLE_LABELS,
  type Profile,
  type TrainingModule,
  type TrainingAssignment,
} from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'

export default function TrainingPage() {
  const [modules, setModules] = useState<TrainingModule[]>([])
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const currentUser = useProfile()
  const [assigningModuleId, setAssigningModuleId] = useState<number | null>(null)
  const [assignForm, setAssignForm] = useState({ user_id: '', due_date: '' })
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [modulesRes, assignmentsRes, profilesRes] = await Promise.all([
      supabase.from('training_modules').select('*').order('sort_order'),
      supabase.from('training_assignments').select('*, profiles(id, full_name, email, role), training_modules(*)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name'),
    ])

    if (modulesRes.data) setModules(modulesRes.data)
    if (assignmentsRes.data) setAssignments(assignmentsRes.data)
    if (profilesRes.data) setProfiles(profilesRes.data)
    setLoading(false)
  }

  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager'

  function getModuleAssignments(moduleId: number) {
    return assignments.filter(a => a.module_id === moduleId)
  }

  function parseQANumbers(related_qa?: string): number[] {
    if (!related_qa) return []
    return related_qa.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
  }

  async function handleAssign(moduleId: number) {
    if (!assignForm.user_id) return
    const { error } = await supabase.from('training_assignments').insert({
      module_id: moduleId,
      user_id: assignForm.user_id,
      assigned_by: currentUser.id,
      due_date: assignForm.due_date || null,
      status: 'assigned',
    })

    if (!error) {
      await supabase.from('activity_log').insert({
        user_id: currentUser.id,
        action: 'assigned_training',
        entity_type: 'training',
        entity_id: String(moduleId),
        details: `Assigned training module to user`,
      })
      setAssigningModuleId(null)
      setAssignForm({ user_id: '', due_date: '' })
      loadData()
    }
  }

  async function handleMarkComplete(assignmentId: string) {
    const { error } = await supabase
      .from('training_assignments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', assignmentId)

    if (!error) {
      await supabase.from('activity_log').insert({
        user_id: currentUser.id,
        action: 'completed_training',
        entity_type: 'training',
        entity_id: assignmentId,
        details: 'Marked training assignment as completed',
      })
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Training Modules</h1>
        <p className="text-gray-500 text-sm mt-1">
          Professional development and training programs for quality improvement
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {modules.map((mod, idx) => {
          const modAssignments = getModuleAssignments(mod.id)
          const qaNumbers = parseQANumbers(mod.related_qa)
          const completedCount = modAssignments.filter(a => a.status === 'completed').length

          return (
            <div key={mod.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Module Header */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{mod.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {mod.duration_hours && (
                          <span className="text-xs text-gray-400">
                            {mod.duration_hours}h duration
                          </span>
                        )}
                        {qaNumbers.map(n => (
                          <span
                            key={n}
                            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: QA_COLORS[n] || '#999' }}
                          >
                            QA{n}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {modAssignments.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {completedCount}/{modAssignments.length} completed
                    </span>
                  )}
                </div>
                {mod.description && (
                  <p className="text-sm text-gray-600 mt-3">{mod.description}</p>
                )}
              </div>

              {/* Assignments List */}
              <div className="px-6 py-3">
                {modAssignments.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Assignments</p>
                    {modAssignments.map(a => {
                      const profile = a.profiles as unknown as Profile
                      const isOwn = currentUser?.id === a.user_id
                      const isOverdue = a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed'

                      return (
                        <div key={a.id} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                              {profile?.full_name?.[0] || '?'}
                            </div>
                            <span className="text-sm text-gray-700">{profile?.full_name || 'Unknown'}</span>
                            {a.due_date && (
                              <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                Due {new Date(a.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: STATUS_COLORS[isOverdue ? 'overdue' : a.status]?.bg,
                                color: STATUS_COLORS[isOverdue ? 'overdue' : a.status]?.text,
                              }}
                            >
                              {isOverdue ? 'overdue' : a.status.replace(/_/g, ' ')}
                            </span>
                            {isOwn && a.status !== 'completed' && (
                              <button
                                onClick={() => handleMarkComplete(a.id)}
                                className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition font-medium"
                              >
                                Mark Complete
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-1">No assignments yet</p>
                )}

                {/* Assign Button / Form */}
                {isAdminOrManager && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {assigningModuleId === mod.id ? (
                      <div className="space-y-2">
                        <select
                          value={assignForm.user_id}
                          onChange={(e) => setAssignForm(f => ({ ...f, user_id: e.target.value }))}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        >
                          <option value="">Select user...</option>
                          {profiles.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.full_name} ({ROLE_LABELS[p.role] || p.role})
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={assignForm.due_date}
                          onChange={(e) => setAssignForm(f => ({ ...f, due_date: e.target.value }))}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          placeholder="Due date (optional)"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAssign(mod.id)}
                            className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 transition font-medium"
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => { setAssigningModuleId(null); setAssignForm({ user_id: '', due_date: '' }) }}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningModuleId(mod.id)}
                        className="text-xs text-primary hover:text-primary/90 font-medium transition"
                      >
                        + Assign to User
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {modules.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-medium">No training modules yet</p>
          <p className="text-sm mt-1">Training modules will appear here once created.</p>
        </div>
      )}
    </div>
  )
}
