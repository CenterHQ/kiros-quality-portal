'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RegisterDefinition, RegisterColumnDef, RegisterColumnType, Profile } from '@/lib/types'
import { REGISTER_COLUMN_TYPE_LABELS } from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'

export default function RegistersPage() {
  const supabase = createClient()
  const user = useProfile()
  const [registers, setRegisters] = useState<RegisterDefinition[]>([])
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({})
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingReg, setEditingReg] = useState<RegisterDefinition | null>(null)
  const [saving, setSaving] = useState(false)

  // Builder state
  const [regName, setRegName] = useState('')
  const [regDesc, setRegDesc] = useState('')
  const [regIcon, setRegIcon] = useState('📋')
  const [regColumns, setRegColumns] = useState<RegisterColumnDef[]>([])

  const load = async () => {
    const { data: regs } = await supabase.from('register_definitions').select('*').eq('status', 'active').order('name')
    if (regs) {
      setRegisters(regs as any)
      // Get entry counts
      const counts: Record<string, number> = {}
      for (const reg of regs) {
        const { count } = await supabase.from('register_entries').select('*', { count: 'exact', head: true }).eq('register_id', reg.id)
        counts[reg.id] = count || 0
      }
      setEntryCounts(counts)
    }
  }

  useEffect(() => { load() }, [])

  const isPrivileged = user && ['admin', 'manager', 'ns'].includes(user.role)

  const resetBuilder = () => {
    setRegName('')
    setRegDesc('')
    setRegIcon('📋')
    setRegColumns([])
    setEditingReg(null)
  }

  const openBuilder = (reg?: RegisterDefinition) => {
    if (reg) {
      setEditingReg(reg)
      setRegName(reg.name)
      setRegDesc(reg.description || '')
      setRegIcon(reg.icon)
      setRegColumns(reg.columns)
    } else {
      resetBuilder()
    }
    setShowBuilder(true)
  }

  const addColumn = () => {
    setRegColumns([...regColumns, {
      id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      type: 'text',
      required: false,
      sort_order: regColumns.length,
    }])
  }

  const updateColumn = (index: number, updates: Partial<RegisterColumnDef>) => {
    const cols = [...regColumns]
    cols[index] = { ...cols[index], ...updates }
    setRegColumns(cols)
  }

  const removeColumn = (index: number) => {
    setRegColumns(regColumns.filter((_, i) => i !== index))
  }

  const moveColumn = (index: number, dir: 'up' | 'down') => {
    if ((dir === 'up' && index === 0) || (dir === 'down' && index === regColumns.length - 1)) return
    const cols = [...regColumns]
    const swap = dir === 'up' ? index - 1 : index + 1
    ;[cols[index], cols[swap]] = [cols[swap], cols[index]]
    cols.forEach((c, i) => c.sort_order = i)
    setRegColumns(cols)
  }

  const saveRegister = async () => {
    if (!regName.trim() || regColumns.length === 0) return
    setSaving(true)
    const columns = regColumns.map((c, i) => ({ ...c, sort_order: i }))
    const payload = {
      name: regName.trim(),
      description: regDesc.trim() || null,
      icon: regIcon,
      columns,
      is_system_template: false,
      created_by: user?.id,
    }
    if (editingReg) {
      await supabase.from('register_definitions').update(payload).eq('id', editingReg.id)
    } else {
      await supabase.from('register_definitions').insert(payload)
    }
    if (user) {
      await supabase.from('activity_log').insert({
        user_id: user.id, action: editingReg ? 'updated_register' : 'created_register', entity_type: 'register',
        details: `${editingReg ? 'Updated' : 'Created'} register: ${regName}`,
      })
    }
    setSaving(false)
    setShowBuilder(false)
    resetBuilder()
    await load()
  }

  const duplicateRegister = async (reg: RegisterDefinition) => {
    await supabase.from('register_definitions').insert({
      name: `${reg.name} (Copy)`,
      description: reg.description,
      icon: reg.icon,
      columns: reg.columns,
      is_system_template: false,
      created_by: user?.id,
    })
    await load()
  }

  const archiveRegister = async (id: string) => {
    await supabase.from('register_definitions').update({ status: 'archived' }).eq('id', id)
    await load()
  }

  const ICON_OPTIONS = ['📋', '💻', '👤', '🧪', '🔧', '💊', '🚗', '🔑', '📱', '🏷️', '📦', '🗂️', '🎒', '⚡', '🌡️']

  if (showBuilder) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => { setShowBuilder(false); resetBuilder() }} className="text-sm text-gray-500 hover:text-gray-700 mb-1">&larr; Back to Registers</button>
            <h1 className="text-2xl font-bold">{editingReg ? 'Edit Register' : 'Create Register'}</h1>
          </div>
          <button onClick={saveRegister} disabled={saving || !regName.trim() || regColumns.length === 0} className="px-4 py-2 bg-[#470DA8] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saving...' : editingReg ? 'Update Register' : 'Create Register'}
          </button>
        </div>

        {/* Register details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Register Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Register Name *</label>
              <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="e.g., Device Register" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
              <div className="flex flex-wrap gap-1">
                {ICON_OPTIONS.map(icon => (
                  <button key={icon} onClick={() => setRegIcon(icon)} className={`w-8 h-8 rounded flex items-center justify-center text-lg transition ${regIcon === icon ? 'bg-[#470DA8] ring-2 ring-[#470DA8] ring-offset-1' : 'bg-gray-100 hover:bg-gray-200'}`}>{icon}</button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={regDesc} onChange={e => setRegDesc(e.target.value)} placeholder="Brief description of what this register tracks" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8]" />
            </div>
          </div>
        </div>

        {/* Column builder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Columns ({regColumns.length})</h2>
            <button onClick={addColumn} className="px-3 py-1.5 bg-[#470DA8] text-white rounded-lg text-xs font-medium hover:opacity-90">+ Add Column</button>
          </div>

          {regColumns.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-sm">No columns defined yet. Click &quot;+ Add Column&quot; to design your register structure.</p>
            </div>
          )}

          <div className="space-y-3">
            {regColumns.map((col, index) => (
              <div key={col.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 pt-1">
                    <button onClick={() => moveColumn(index, 'up')} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">&#9650;</button>
                    <button onClick={() => moveColumn(index, 'down')} disabled={index === regColumns.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">&#9660;</button>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Column Name *</label>
                      <input type="text" value={col.name} onChange={e => updateColumn(index, { name: e.target.value })} placeholder="Column name" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Type</label>
                      <select value={col.type} onChange={e => updateColumn(index, { type: e.target.value as RegisterColumnType })} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8]">
                        {Object.entries(REGISTER_COLUMN_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Required</label>
                      <label className="flex items-center gap-2 mt-1.5">
                        <input type="checkbox" checked={col.required} onChange={e => updateColumn(index, { required: e.target.checked })} className="rounded border-gray-300 text-[#470DA8] focus:ring-[#470DA8]" />
                        <span className="text-sm text-gray-600">Required</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Default Value</label>
                      <input type="text" value={col.default_value || ''} onChange={e => updateColumn(index, { default_value: e.target.value || undefined })} placeholder="Optional" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8]" />
                    </div>
                    {col.type === 'dropdown' && (
                      <div className="md:col-span-4">
                        <label className="block text-xs text-gray-500 mb-1">Dropdown Options (comma-separated)</label>
                        <input type="text" value={(col.options || []).join(', ')} onChange={e => updateColumn(index, { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })} placeholder="Option 1, Option 2, Option 3" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8]" />
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeColumn(index)} className="text-gray-400 hover:text-red-500 transition p-1 mt-4">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Registers</h1>
          <p className="text-gray-500 text-sm mt-1">Custom data registers and tracking tables</p>
        </div>
        {isPrivileged && (
          <button onClick={() => openBuilder()} className="px-4 py-2 bg-[#470DA8] text-white rounded-lg text-sm font-medium hover:opacity-90">+ New Register</button>
        )}
      </div>

      {registers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">No registers yet. Create a new register or run the migration to load templates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {registers.map(reg => (
            <div key={reg.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{reg.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{reg.name}</h3>
                      {reg.description && <p className="text-xs text-gray-400 mt-0.5">{reg.description}</p>}
                    </div>
                  </div>
                  {reg.is_system_template && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">Template</span>}
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                  <span>{reg.columns.length} columns</span>
                  <span>{entryCounts[reg.id] || 0} entries</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {reg.columns.slice(0, 5).map((col: RegisterColumnDef) => (
                    <span key={col.id} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">{col.name}</span>
                  ))}
                  {reg.columns.length > 5 && <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">+{reg.columns.length - 5} more</span>}
                </div>

                <div className="flex gap-2">
                  <a href={`/registers/${reg.id}`} className="flex-1 px-3 py-1.5 bg-[#470DA8] text-white rounded-lg text-xs font-medium text-center hover:opacity-90">
                    Open
                  </a>
                  {isPrivileged && (
                    <>
                      <button onClick={() => openBuilder(reg)} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50">Edit</button>
                      <button onClick={() => duplicateRegister(reg)} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50">Copy</button>
                      <button onClick={() => archiveRegister(reg.id)} className="px-3 py-1.5 border border-red-200 text-red-400 rounded-lg text-xs font-medium hover:bg-red-50">Archive</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
