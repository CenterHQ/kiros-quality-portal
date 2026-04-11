'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  STATUS_COLORS,
  ROLE_LABELS,
  type Profile,
  type ComplianceItem,
} from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'
import { useToast } from '@/components/ui/toast'
import CentreContextPanel from '@/components/CentreContextPanel'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'

const COMPLIANCE_STATUSES: ComplianceItem['status'][] = [
  'action_required',
  'in_progress',
  'completed',
  'ongoing',
]

export default function CompliancePage() {
  const [items, setItems] = useState<ComplianceItem[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const currentUser = useProfile()
  const [editingNotes, setEditingNotes] = useState<number | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [itemsRes, profilesRes] = await Promise.all([
      supabase.from('compliance_items').select('*, profiles(full_name)').order('id'),
      supabase.from('profiles').select('*').order('full_name'),
    ])

    if (itemsRes.data) setItems(itemsRes.data)
    if (profilesRes.data) setProfiles(profilesRes.data)
    setLoading(false)
  }

  async function updateField(id: number, field: string, value: string | null) {
    const { error } = await supabase
      .from('compliance_items')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      const { error: logErr } = await supabase.from('activity_log').insert({
        user_id: currentUser.id,
        action: `updated_compliance_${field}`,
        entity_type: 'compliance',
        entity_id: String(id),
        details: `Updated ${field} to "${value}"`,
      })
      if (logErr) console.error('Failed to log activity:', logErr)
      loadData()
      toast({ type: 'success', message: `${field === 'notes' ? 'Notes saved' : field === 'status' ? 'Status updated' : 'Updated'} successfully` })
    } else {
      toast({ type: 'error', message: 'Failed to update' })
    }
  }

  function handleNotesClick(item: ComplianceItem) {
    setEditingNotes(item.id)
    setNotesValue(item.notes || '')
  }

  function handleNotesSave(id: number) {
    updateField(id, 'notes', notesValue || null)
    setEditingNotes(null)
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
      <PageHeader
        title="Compliance Tracking"
        description="Monitor and manage regulatory compliance items"
        className="mb-6"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-in">
        {COMPLIANCE_STATUSES.map(status => {
          const count = items.filter(i => i.status === status).length
          return (
            <div key={status} className="bg-card rounded-xl shadow-sm border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{status.replace(/_/g, ' ')}</p>
              <p className="text-2xl font-bold mt-1 flex items-center gap-2">
                <StatusBadge status={status} size="sm" />
                {count}
              </p>
            </div>
          )
        })}
      </div>

      {/* Compliance Table */}
      {items.length === 0 ? (
        <EmptyState
          title="No compliance items"
          description="Compliance items will appear here once added."
          className="my-8"
        />
      ) : (
        <div className="animate-fade-in">
          {/* Desktop table view */}
          <div className="hidden md:block bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Regulation</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-40">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-44">Assigned To</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-accent transition">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-foreground">{item.regulation}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground/80">{item.description}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.status}
                          onChange={(e) => updateField(item.id, 'status', e.target.value)}
                          className="px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-primary outline-none"
                          style={{
                            backgroundColor: STATUS_COLORS[item.status]?.bg,
                            color: STATUS_COLORS[item.status]?.text,
                          }}
                        >
                          {COMPLIANCE_STATUSES.map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.assigned_to || ''}
                          onChange={(e) => updateField(item.id, 'assigned_to', e.target.value || null)}
                          className="px-2 py-1 rounded-lg text-xs border border-border cursor-pointer focus:ring-2 focus:ring-primary outline-none bg-card text-foreground w-full"
                        >
                          <option value="">Unassigned</option>
                          {profiles.map(p => (
                            <option key={p.id} value={p.id}>{p.full_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {editingNotes === item.id ? (
                          <div className="flex gap-1">
                            <textarea
                              value={notesValue}
                              onChange={(e) => setNotesValue(e.target.value)}
                              className="flex-1 px-2 py-1 border border-border rounded-lg text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                              rows={2}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleNotesSave(item.id)
                                }
                                if (e.key === 'Escape') setEditingNotes(null)
                              }}
                            />
                            <button
                              onClick={() => handleNotesSave(item.id)}
                              className="px-2 py-1 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 transition self-start"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => handleNotesClick(item)}
                            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition block min-h-[20px]"
                            title="Click to edit"
                          >
                            {item.notes || 'Click to add notes...'}
                          </span>
                        )}
                        <div className="mt-2">
                          <CentreContextPanel
                            contextTypes={['policy_requirement', 'procedure_step', 'safety_protocol']}
                            title="Procedure Guidance"
                            limit={2}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card view */}
          <div className="flex flex-col gap-3 md:hidden">
            {items.map(item => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{item.regulation}</span>
                  <select
                    value={item.status}
                    onChange={(e) => updateField(item.id, 'status', e.target.value)}
                    className="shrink-0 px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-primary outline-none"
                    style={{
                      backgroundColor: STATUS_COLORS[item.status]?.bg,
                      color: STATUS_COLORS[item.status]?.text,
                    }}
                  >
                    {COMPLIANCE_STATUSES.map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <p className="text-xs text-foreground/80">{item.description}</p>

                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Assigned To</label>
                    <select
                      value={item.assigned_to || ''}
                      onChange={(e) => updateField(item.id, 'assigned_to', e.target.value || null)}
                      className="w-full px-2 py-1.5 rounded-lg text-xs border border-border cursor-pointer focus:ring-2 focus:ring-primary outline-none bg-card text-foreground"
                    >
                      <option value="">Unassigned</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Notes</label>
                    {editingNotes === item.id ? (
                      <div className="flex gap-1">
                        <textarea
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          className="flex-1 px-2 py-1 border border-border rounded-lg text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                          rows={2}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleNotesSave(item.id)
                            }
                            if (e.key === 'Escape') setEditingNotes(null)
                          }}
                        />
                        <button
                          onClick={() => handleNotesSave(item.id)}
                          className="px-2 py-1 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 transition self-start"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => handleNotesClick(item)}
                        className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition block min-h-[20px]"
                        title="Click to edit"
                      >
                        {item.notes || 'Click to add notes...'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-1">
                  <CentreContextPanel
                    contextTypes={['policy_requirement', 'procedure_step', 'safety_protocol']}
                    title="Procedure Guidance"
                    limit={2}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
