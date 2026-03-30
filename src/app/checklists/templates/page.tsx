'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChecklistTemplate, ChecklistCategory, ChecklistItemDefinition, ChecklistFrequency, ChecklistItemType, Profile } from '@/lib/types'
import { CHECKLIST_FREQUENCY_LABELS, CHECKLIST_ITEM_TYPE_LABELS, QA_COLORS } from '@/lib/types'

const EMPTY_ITEM: Omit<ChecklistItemDefinition, 'id' | 'sort_order'> = {
  title: '',
  type: 'yes_no',
  required: true,
}

export default function ChecklistTemplatesPage() {
  const supabase = createClient()
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [categories, setCategories] = useState<ChecklistCategory[]>([])
  const [user, setUser] = useState<Profile | null>(null)
  const [filter, setFilter] = useState<{ category: string; frequency: string; status: string }>({ category: '', frequency: '', status: 'active' })
  const [editing, setEditing] = useState<ChecklistTemplate | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [saving, setSaving] = useState(false)

  // Builder state
  const [builderName, setBuilderName] = useState('')
  const [builderDesc, setBuilderDesc] = useState('')
  const [builderCategory, setBuilderCategory] = useState<number | null>(null)
  const [builderFrequency, setBuilderFrequency] = useState<ChecklistFrequency>('daily')
  const [builderQA, setBuilderQA] = useState<number[]>([])
  const [builderItems, setBuilderItems] = useState<ChecklistItemDefinition[]>([])
  const [builderStatus, setBuilderStatus] = useState<'active' | 'draft'>('active')

  const load = async () => {
    const { data: { user: au } } = await supabase.auth.getUser()
    if (au) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', au.id).single()
      if (p) setUser(p as Profile)
    }
    const { data: cats } = await supabase.from('checklist_categories').select('*').order('sort_order')
    if (cats) setCategories(cats)
    const { data: tmpl } = await supabase.from('checklist_templates').select('*, checklist_categories(*)').order('created_at', { ascending: false })
    if (tmpl) setTemplates(tmpl as any)
  }

  useEffect(() => { load() }, [])

  const filtered = templates.filter(t => {
    if (filter.category && t.category_id !== Number(filter.category)) return false
    if (filter.frequency && t.frequency !== filter.frequency) return false
    if (filter.status && t.status !== filter.status) return false
    return true
  })

  const resetBuilder = () => {
    setBuilderName('')
    setBuilderDesc('')
    setBuilderCategory(null)
    setBuilderFrequency('daily')
    setBuilderQA([])
    setBuilderItems([])
    setBuilderStatus('active')
    setEditing(null)
  }

  const openBuilder = (template?: ChecklistTemplate) => {
    if (template) {
      setEditing(template)
      setBuilderName(template.name)
      setBuilderDesc(template.description || '')
      setBuilderCategory(template.category_id || null)
      setBuilderFrequency(template.frequency)
      setBuilderQA(template.related_qa || [])
      setBuilderItems(template.items || [])
      setBuilderStatus(template.status === 'archived' ? 'active' : template.status as 'active' | 'draft')
    } else {
      resetBuilder()
    }
    setShowBuilder(true)
  }

  const addItem = (type: ChecklistItemType = 'yes_no') => {
    const newItem: ChecklistItemDefinition = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: '',
      type,
      required: type !== 'heading',
      sort_order: builderItems.length,
    }
    setBuilderItems([...builderItems, newItem])
  }

  const updateItem = (index: number, updates: Partial<ChecklistItemDefinition>) => {
    const items = [...builderItems]
    items[index] = { ...items[index], ...updates }
    setBuilderItems(items)
  }

  const removeItem = (index: number) => {
    setBuilderItems(builderItems.filter((_, i) => i !== index))
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === builderItems.length - 1)) return
    const items = [...builderItems]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    ;[items[index], items[swapIndex]] = [items[swapIndex], items[index]]
    items.forEach((item, i) => item.sort_order = i)
    setBuilderItems(items)
  }

  const duplicateTemplate = async (template: ChecklistTemplate) => {
    const { id, created_at, updated_at, checklist_categories, profiles, ...rest } = template
    await supabase.from('checklist_templates').insert({
      ...rest,
      name: `${rest.name} (Copy)`,
      is_system_template: false,
      created_by: user?.id,
    })
    await load()
  }

  const saveTemplate = async () => {
    if (!builderName.trim() || builderItems.length === 0) return
    setSaving(true)
    const items = builderItems.map((item, i) => ({ ...item, sort_order: i }))
    const payload = {
      name: builderName.trim(),
      description: builderDesc.trim() || null,
      category_id: builderCategory,
      frequency: builderFrequency,
      items,
      related_qa: builderQA,
      status: builderStatus,
      is_system_template: false,
      created_by: user?.id,
    }

    if (editing) {
      await supabase.from('checklist_templates').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('checklist_templates').insert(payload)
    }

    if (user) {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: editing ? 'updated_checklist_template' : 'created_checklist_template',
        entity_type: 'checklist_template',
        details: `${editing ? 'Updated' : 'Created'} checklist template: ${builderName}`,
      })
    }

    setSaving(false)
    setShowBuilder(false)
    resetBuilder()
    await load()
  }

  const archiveTemplate = async (id: string) => {
    await supabase.from('checklist_templates').update({ status: 'archived' }).eq('id', id)
    await load()
  }

  const isPrivileged = user && ['admin', 'manager', 'ns'].includes(user.role)

  // Builder view
  if (showBuilder) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => { setShowBuilder(false); resetBuilder() }} className="text-sm text-gray-500 hover:text-gray-700 mb-1">&larr; Back to Templates</button>
            <h1 className="text-2xl font-bold">{editing ? 'Edit Template' : 'Create Checklist Template'}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setBuilderStatus('draft'); saveTemplate() }} disabled={saving || !builderName.trim()} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              Save as Draft
            </button>
            <button onClick={saveTemplate} disabled={saving || !builderName.trim() || builderItems.length === 0} className="px-4 py-2 bg-[#470DA8] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </div>

        {/* Template details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Template Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
              <input type="text" value={builderName} onChange={e => setBuilderName(e.target.value)} placeholder="e.g., Daily Opening Checklist" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] focus:border-transparent" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={builderDesc} onChange={e => setBuilderDesc(e.target.value)} rows={2} placeholder="Brief description of when and how this checklist should be used" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={builderCategory || ''} onChange={e => setBuilderCategory(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] focus:border-transparent">
                <option value="">Select category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select value={builderFrequency} onChange={e => setBuilderFrequency(e.target.value as ChecklistFrequency)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] focus:border-transparent">
                {Object.entries(CHECKLIST_FREQUENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Related Quality Areas</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map(qa => (
                  <button key={qa} onClick={() => setBuilderQA(builderQA.includes(qa) ? builderQA.filter(q => q !== qa) : [...builderQA, qa])} className={`px-3 py-1 rounded-full text-xs font-medium border transition ${builderQA.includes(qa) ? 'text-white border-transparent' : 'text-gray-600 border-gray-300 bg-white hover:bg-gray-50'}`} style={builderQA.includes(qa) ? { backgroundColor: QA_COLORS[qa] } : {}}>
                    QA{qa}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Items builder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Checklist Items ({builderItems.length})</h2>
            <div className="flex gap-2">
              <button onClick={() => addItem('heading')} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50">+ Section</button>
              <button onClick={() => addItem('yes_no')} className="px-3 py-1.5 bg-[#470DA8] text-white rounded-lg text-xs font-medium hover:opacity-90">+ Item</button>
            </div>
          </div>

          {builderItems.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm">No items yet. Click &quot;+ Item&quot; or &quot;+ Section&quot; to start building your checklist.</p>
            </div>
          )}

          <div className="space-y-3">
            {builderItems.map((item, index) => (
              <div key={item.id} className={`border rounded-lg p-4 ${item.type === 'heading' ? 'bg-gray-50 border-gray-300' : 'border-gray-200'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 pt-1">
                    <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">&#9650;</button>
                    <button onClick={() => moveItem(index, 'down')} disabled={index === builderItems.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">&#9660;</button>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 font-mono w-6">{index + 1}</span>
                      <input type="text" value={item.title} onChange={e => updateItem(index, { title: e.target.value })} placeholder={item.type === 'heading' ? 'Section heading...' : 'Checklist item text...'} className={`flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] focus:border-transparent ${item.type === 'heading' ? 'font-semibold' : ''}`} />
                      <select value={item.type} onChange={e => updateItem(index, { type: e.target.value as ChecklistItemType })} className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#470DA8] focus:border-transparent">
                        {Object.entries(CHECKLIST_ITEM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>

                    {/* Options for dropdown type */}
                    {item.type === 'dropdown' && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Options (comma-separated)</label>
                        <input type="text" value={(item.options || []).join(', ')} onChange={e => updateItem(index, { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })} placeholder="Option 1, Option 2, Option 3" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#470DA8] focus:border-transparent" />
                      </div>
                    )}

                    {/* Conditional logic */}
                    {item.type !== 'heading' && (
                      <div className="flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={item.required || false} onChange={e => updateItem(index, { required: e.target.checked })} className="rounded border-gray-300 text-[#470DA8] focus:ring-[#470DA8]" />
                          <span className="text-gray-600">Required</span>
                        </label>
                        {builderItems.filter(i => i.type === 'yes_no' && i.id !== item.id).length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Show only if</span>
                            <select value={item.conditional_on || ''} onChange={e => updateItem(index, { conditional_on: e.target.value || undefined, conditional_value: e.target.value ? true : undefined })} className="px-2 py-1 border border-gray-300 rounded text-xs">
                              <option value="">Always show</option>
                              {builderItems.filter(i => i.type === 'yes_no' && i.id !== item.id).map(i => (
                                <option key={i.id} value={i.id}>{i.title || `Item ${builderItems.indexOf(i) + 1}`}</option>
                              ))}
                            </select>
                            {item.conditional_on && (
                              <select value={String(item.conditional_value)} onChange={e => updateItem(index, { conditional_value: e.target.value === 'true' })} className="px-2 py-1 border border-gray-300 rounded text-xs">
                                <option value="true">= Yes</option>
                                <option value="false">= No</option>
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeItem(index)} className="text-gray-400 hover:text-red-500 transition p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {builderItems.length > 0 && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button onClick={() => addItem('yes_no')} className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 rounded-lg text-xs hover:border-[#470DA8] hover:text-[#470DA8] transition">+ Yes/No</button>
              <button onClick={() => addItem('text')} className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 rounded-lg text-xs hover:border-[#470DA8] hover:text-[#470DA8] transition">+ Text</button>
              <button onClick={() => addItem('number')} className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 rounded-lg text-xs hover:border-[#470DA8] hover:text-[#470DA8] transition">+ Number</button>
              <button onClick={() => addItem('photo')} className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 rounded-lg text-xs hover:border-[#470DA8] hover:text-[#470DA8] transition">+ Photo</button>
              <button onClick={() => addItem('dropdown')} className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 rounded-lg text-xs hover:border-[#470DA8] hover:text-[#470DA8] transition">+ Dropdown</button>
              <button onClick={() => addItem('signature')} className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 rounded-lg text-xs hover:border-[#470DA8] hover:text-[#470DA8] transition">+ Signature</button>
              <button onClick={() => addItem('date')} className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 rounded-lg text-xs hover:border-[#470DA8] hover:text-[#470DA8] transition">+ Date</button>
              <button onClick={() => addItem('time')} className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 rounded-lg text-xs hover:border-[#470DA8] hover:text-[#470DA8] transition">+ Time</button>
              <button onClick={() => addItem('heading')} className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 rounded-lg text-xs hover:border-[#470DA8] hover:text-[#470DA8] transition">+ Section</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Template list view
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <a href="/checklists" className="text-sm text-gray-500 hover:text-gray-700">&larr; Checklists</a>
          </div>
          <h1 className="text-2xl font-bold">Checklist Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage checklist templates for your service</p>
        </div>
        {isPrivileged && (
          <button onClick={() => openBuilder()} className="px-4 py-2 bg-[#470DA8] text-white rounded-lg text-sm font-medium hover:opacity-90">
            + New Template
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] focus:border-transparent">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select value={filter.frequency} onChange={e => setFilter({ ...filter, frequency: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] focus:border-transparent">
          <option value="">All Frequencies</option>
          {Object.entries(CHECKLIST_FREQUENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] focus:border-transparent">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">No templates found. {isPrivileged ? 'Create your first template to get started.' : 'Ask your manager to create checklist templates.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => {
            const cat = t.checklist_categories as ChecklistCategory | undefined
            const itemCount = (t.items || []).filter((i: ChecklistItemDefinition) => i.type !== 'heading').length
            return (
              <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat?.icon || '📋'}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{t.name}</h3>
                        {cat && <p className="text-xs text-gray-400">{cat.name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {t.is_system_template && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">System</span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.status === 'active' ? 'bg-green-50 text-green-600' : t.status === 'draft' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                        {t.status}
                      </span>
                    </div>
                  </div>

                  {t.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{t.description}</p>}

                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                    <span>{CHECKLIST_FREQUENCY_LABELS[t.frequency]}</span>
                    <span>{itemCount} items</span>
                  </div>

                  {t.related_qa && t.related_qa.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {t.related_qa.map((qa: number) => (
                        <span key={qa} className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: QA_COLORS[qa] }}>QA{qa}</span>
                      ))}
                    </div>
                  )}

                  {isPrivileged && (
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button onClick={() => openBuilder(t)} className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50">Edit</button>
                      <button onClick={() => duplicateTemplate(t)} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50">Duplicate</button>
                      {t.status !== 'archived' && (
                        <button onClick={() => archiveTemplate(t.id)} className="px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50">Archive</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
