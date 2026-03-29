'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  STATUS_COLORS,
  ROLE_LABELS,
  type Profile,
  type ComplianceItem,
} from '@/lib/types'

const COMPLIANCE_STATUSES: ComplianceItem['status'][] = [
  'action_required',
  'in_progress',
  'completed',
  'ongoing',
]

export default function CompliancePage() {
  const [items, setItems] = useState<ComplianceItem[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [editingNotes, setEditingNotes] = useState<number | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, itemsRes, profilesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('compliance_items').select('*, profiles(full_name)').order('id'),
      supabase.from('profiles').select('*').order('full_name'),
    ])

    if (profileRes.data) setCurrentUser(profileRes.data)
    if (itemsRes.data) setItems(itemsRes.data)
    if (profilesRes.data) setProfiles(profilesRes.data)
    setLoading(false)
  }

  async function updateField(id: number, field: string, value: string | null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('compliance_items')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: `updated_compliance_${field}`,
        entity_type: 'compliance',
        entity_id: String(id),
        details: `Updated ${field} to "${value}"`,
      })
      loadData()
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6b2fa0]" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Tracking</h1>
        <p className="text-gray-500 text-sm mt-1">
          Monitor and manage regulatory compliance items
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {COMPLIANCE_STATUSES.map(status => {
          const count = items.filter(i => i.status === status).length
          return (
            <div key={status} className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider">{status.replace(/_/g, ' ')}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: STATUS_COLORS[status]?.text }}>
                {count}
              </p>
            </div>
          )
        })}
      </div>

      {/* Compliance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Regulation</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-44">Assigned To</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{item.regulation}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{item.description}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      onChange={(e) => updateField(item.id, 'status', e.target.value)}
                      className="px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-[#6b2fa0] outline-none"
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
                      className="px-2 py-1 rounded-lg text-xs border border-gray-200 cursor-pointer focus:ring-2 focus:ring-[#6b2fa0] outline-none bg-white text-gray-700 w-full"
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
                          className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#6b2fa0] focus:border-transparent outline-none resize-none"
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
                          className="px-2 py-1 bg-[#6b2fa0] text-white text-xs rounded-lg hover:bg-[#5a2788] transition self-start"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => handleNotesClick(item)}
                        className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 transition block min-h-[20px]"
                        title="Click to edit"
                      >
                        {item.notes || 'Click to add notes...'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg font-medium">No compliance items</p>
            <p className="text-sm mt-1">Compliance items will appear here once added.</p>
          </div>
        )}
      </div>
    </div>
  )
}
