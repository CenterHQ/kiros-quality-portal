'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import type { CentreContext, CentreContextType } from '@/lib/types'
import { CONTEXT_TYPE_LABELS, CONTEXT_TYPE_COLORS, QA_COLORS, ROLE_LABELS } from '@/lib/types'

const ALL_CONTEXT_TYPES: CentreContextType[] = [
  'qip_goal', 'qip_strategy', 'philosophy_principle',
  'policy_requirement', 'procedure_step', 'service_value',
  'teaching_approach', 'family_engagement', 'inclusion_practice',
  'safety_protocol', 'environment_feature', 'leadership_goal',
]

const QA_NAMES: Record<number, string> = {
  1: 'Educational Program & Practice',
  2: 'Children\'s Health & Safety',
  3: 'Physical Environment',
  4: 'Staffing Arrangements',
  5: 'Relationships with Children',
  6: 'Partnerships with Families',
  7: 'Governance & Leadership',
}

interface EditingItem {
  id?: string
  context_type: CentreContextType
  title: string
  content: string
  related_qa: number[]
  related_element_codes: string[]
  source_quote: string
  is_active: boolean
}

const EMPTY_ITEM: EditingItem = {
  context_type: 'qip_goal',
  title: '',
  content: '',
  related_qa: [],
  related_element_codes: [],
  source_quote: '',
  is_active: true,
}

export default function ContextManagementPage() {
  const profile = useProfile()
  const supabase = createClient()
  const [items, setItems] = useState<CentreContext[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<CentreContextType | 'all'>('all')
  const [filterQA, setFilterQA] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<EditingItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadItems()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadItems = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('centre_context')
      .select('*')
      .order('context_type')
      .order('title')
    setItems(data || [])
    setLoading(false)
  }

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterType !== 'all' && item.context_type !== filterType) return false
      if (filterQA !== null && !item.related_qa?.includes(filterQA)) return false
      if (search) {
        const s = search.toLowerCase()
        return item.title.toLowerCase().includes(s) || item.content.toLowerCase().includes(s)
      }
      return true
    })
  }, [items, filterType, filterQA, search])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length }
    for (const item of items) {
      counts[item.context_type] = (counts[item.context_type] || 0) + 1
    }
    return counts
  }, [items])

  const activeCount = items.filter(i => i.is_active).length
  const inactiveCount = items.filter(i => !i.is_active).length

  const showFlash = (type: 'success' | 'error', text: string) => {
    setFlash({ type, text })
    setTimeout(() => setFlash(null), 3000)
  }

  const handleSave = async () => {
    if (!editing || !editing.title.trim() || !editing.content.trim()) {
      showFlash('error', 'Title and content are required')
      return
    }

    setSaving(true)
    try {
      if (editing.id) {
        // Update existing
        const { error } = await supabase
          .from('centre_context')
          .update({
            context_type: editing.context_type,
            title: editing.title.trim(),
            content: editing.content.trim(),
            related_qa: editing.related_qa,
            related_element_codes: editing.related_element_codes.filter(c => c.trim()),
            source_quote: editing.source_quote.trim() || null,
            is_active: editing.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id)
        if (error) throw error
        showFlash('success', 'Context item updated')
      } else {
        // Insert new
        const { error } = await supabase
          .from('centre_context')
          .insert({
            context_type: editing.context_type,
            title: editing.title.trim(),
            content: editing.content.trim(),
            related_qa: editing.related_qa,
            related_element_codes: editing.related_element_codes.filter(c => c.trim()),
            source_quote: editing.source_quote.trim() || null,
            is_active: editing.is_active,
            ai_generated: false,
          })
        if (error) throw error
        showFlash('success', 'Context item created')
      }
      setEditing(null)
      loadItems()
    } catch (err) {
      showFlash('error', `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this context item? The AI will no longer reference it.')) return
    const { error } = await supabase.from('centre_context').delete().eq('id', id)
    if (error) {
      showFlash('error', 'Failed to delete')
    } else {
      showFlash('success', 'Deleted')
      loadItems()
    }
  }

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    await supabase.from('centre_context').update({ is_active: !currentlyActive }).eq('id', id)
    loadItems()
  }

  const startEditing = (item: CentreContext) => {
    setEditing({
      id: item.id,
      context_type: item.context_type,
      title: item.title,
      content: item.content,
      related_qa: item.related_qa || [],
      related_element_codes: item.related_element_codes || [],
      source_quote: item.source_quote || '',
      is_active: item.is_active,
    })
  }

  if (!['admin', 'ns'].includes(profile.role)) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">Only the Approved Provider and Nominated Supervisor can manage centre context.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Centre Context Management</h1>
          <p className="text-sm text-muted-foreground">
            This is what the AI knows about your centre. Edit, add, or remove items to make responses accurate and specific to Kiros.
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY_ITEM })}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 bg-primary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Context Item
        </button>
      </div>

      {/* Flash message */}
      {flash && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${flash.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {flash.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
          <div className="text-xs text-muted-foreground">Total Items</div>
          <div className="text-2xl font-bold text-foreground">{items.length}</div>
        </div>
        <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
          <div className="text-xs text-muted-foreground">Active (AI Uses)</div>
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
        </div>
        <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
          <div className="text-xs text-muted-foreground">Inactive</div>
          <div className="text-2xl font-bold text-muted-foreground">{inactiveCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl shadow-sm p-4 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search context items..."
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${filterType === 'all' ? 'text-white bg-primary' : 'bg-muted text-foreground hover:bg-accent'}`}
          >
            All ({typeCounts.all || 0})
          </button>
          {ALL_CONTEXT_TYPES.map(type => {
            const colors = CONTEXT_TYPE_COLORS[type]
            const isActive = filterType === type
            return (
              <button
                key={type}
                onClick={() => setFilterType(isActive ? 'all' : type)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${isActive ? 'ring-2 ring-offset-1' : 'hover:opacity-80'}`}
                style={{ backgroundColor: colors.bg, color: colors.text, ...(isActive ? { ringColor: colors.text } : {}) }}
              >
                {CONTEXT_TYPE_LABELS[type]} ({typeCounts[type] || 0})
              </button>
            )
          })}
        </div>

        {/* QA filter */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground py-1">QA:</span>
          {[1, 2, 3, 4, 5, 6, 7].map(qa => (
            <button
              key={qa}
              onClick={() => setFilterQA(filterQA === qa ? null : qa)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${filterQA === qa ? 'text-white' : 'bg-muted text-foreground hover:bg-accent'}`}
              style={filterQA === qa ? { backgroundColor: QA_COLORS[qa] } : undefined}
            >
              QA{qa}
            </button>
          ))}
        </div>
      </div>

      {/* Edit/Add Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{editing.id ? 'Edit Context Item' : 'Add New Context Item'}</h2>
                <button onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-accent">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Context Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Context Type</label>
                <select
                  value={editing.context_type}
                  onChange={e => setEditing({ ...editing, context_type: e.target.value as CentreContextType })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  {ALL_CONTEXT_TYPES.map(type => (
                    <option key={type} value={type}>{CONTEXT_TYPE_LABELS[type]}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {editing.context_type === 'qip_goal' && 'A specific improvement goal from your Quality Improvement Plan'}
                  {editing.context_type === 'qip_strategy' && 'A strategy or approach for achieving a QIP goal'}
                  {editing.context_type === 'philosophy_principle' && 'A core principle from your K.I.R.O.S philosophy'}
                  {editing.context_type === 'policy_requirement' && 'A key requirement from a centre policy that staff must follow'}
                  {editing.context_type === 'procedure_step' && 'A step-by-step procedure for a specific operation'}
                  {editing.context_type === 'service_value' && 'A core value that guides your service\'s approach'}
                  {editing.context_type === 'teaching_approach' && 'A documented teaching or pedagogical approach used at the centre'}
                  {editing.context_type === 'family_engagement' && 'A family engagement practice or process'}
                  {editing.context_type === 'inclusion_practice' && 'An inclusion practice for children with additional needs'}
                  {editing.context_type === 'safety_protocol' && 'A safety, emergency, or health protocol'}
                  {editing.context_type === 'environment_feature' && 'A physical environment feature or setup approach'}
                  {editing.context_type === 'leadership_goal' && 'A leadership or governance improvement goal'}
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Short descriptive title (e.g., 'Embed complete planning cycle across all rooms')"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Content</label>
                <textarea
                  value={editing.content}
                  onChange={e => setEditing({ ...editing, content: e.target.value })}
                  placeholder="Detailed description that the AI will reference when answering questions. Be specific — include actual practices, names, procedures, and standards used at your centre."
                  rows={5}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">The more specific and accurate this is, the better the AI&apos;s responses will be.</p>
              </div>

              {/* Related QA Areas */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Related Quality Areas</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(qa => (
                    <button
                      key={qa}
                      type="button"
                      onClick={() => {
                        const qas = editing.related_qa.includes(qa)
                          ? editing.related_qa.filter(q => q !== qa)
                          : [...editing.related_qa, qa]
                        setEditing({ ...editing, related_qa: qas })
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        editing.related_qa.includes(qa) ? 'text-white' : 'bg-muted text-foreground'
                      }`}
                      style={editing.related_qa.includes(qa) ? { backgroundColor: QA_COLORS[qa] } : undefined}
                    >
                      QA{qa}: {QA_NAMES[qa]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Element Codes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Related NQS Element Codes</label>
                <input
                  type="text"
                  value={editing.related_element_codes.join(', ')}
                  onChange={e => setEditing({ ...editing, related_element_codes: e.target.value.split(',').map(c => c.trim()) })}
                  placeholder="e.g., 1.1.1, 1.3.2, 2.2.3"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <p className="text-xs text-muted-foreground mt-1">Comma-separated NQS element codes this item relates to</p>
              </div>

              {/* Source Quote */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Source Quote (optional)</label>
                <textarea
                  value={editing.source_quote}
                  onChange={e => setEditing({ ...editing, source_quote: e.target.value })}
                  placeholder="A direct quote from a policy, QIP, or other document that supports this context item"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 resize-y"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editing.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${editing.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-foreground">{editing.is_active ? 'Active — AI will use this' : 'Inactive — AI will ignore this'}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editing.title.trim() || !editing.content.trim()}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 bg-primary"
                >
                  {saving ? 'Saving...' : editing.id ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{filteredItems.length} items</span>
          <span className="text-xs text-muted-foreground">Click to expand &middot; The AI reads all active items when responding</span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-muted-foreground mt-2">Loading context...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No items match your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map(item => {
              const colors = CONTEXT_TYPE_COLORS[item.context_type]
              const isExpanded = expandedId === item.id

              return (
                <div key={item.id} className={`${!item.is_active ? 'opacity-50' : ''}`}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap mt-0.5"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {CONTEXT_TYPE_LABELS[item.context_type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{item.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{item.content.substring(0, 120)}...</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.related_qa?.map(qa => (
                          <span key={qa} className="text-[10px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: QA_COLORS[qa] }}>
                            QA{qa}
                          </span>
                        ))}
                        {!item.is_active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inactive</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 bg-muted/50">
                      <div className="pl-[calc(theme(spacing.2)+theme(spacing.0.5))]">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.content}</p>

                        {item.source_quote && (
                          <blockquote className="mt-2 text-xs text-muted-foreground italic border-l-2 border-purple-300 pl-3 py-1 bg-purple-50/50 rounded-r">
                            &ldquo;{item.source_quote}&rdquo;
                          </blockquote>
                        )}

                        {item.related_element_codes?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">Elements:</span>
                            {item.related_element_codes.map(code => (
                              <span key={code} className="text-xs px-2 py-0.5 bg-muted text-foreground rounded">{code}</span>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); startEditing(item) }}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleActive(item.id, item.is_active) }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              item.is_active
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-green-200 text-green-700 hover:bg-green-50'
                            }`}
                          >
                            {item.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                          <span className="text-[10px] text-gray-300 ml-auto">
                            {item.ai_generated ? 'AI Generated' : 'Manual'} &middot; {new Date(item.created_at).toLocaleDateString('en-AU')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
        <h3 className="text-sm font-semibold text-purple-800 mb-3">How Centre Context Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-purple-700 leading-relaxed">
          <div>
            <div className="font-medium mb-1">1. You define the context</div>
            <p>Add items that describe your centre&apos;s actual practices, policies, QIP goals, philosophy, and procedures. The more specific and accurate, the better.</p>
          </div>
          <div>
            <div className="font-medium mb-1">2. AI reads active items</div>
            <p>When anyone uses the Kiros AI Chat, all active context items are loaded into the AI&apos;s system prompt. This grounds its responses in your centre&apos;s reality.</p>
          </div>
          <div>
            <div className="font-medium mb-1">3. Responses become centre-specific</div>
            <p>Instead of generic ECEC advice, the AI references your QIP goals, philosophy, policies, and documented practices by name.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
