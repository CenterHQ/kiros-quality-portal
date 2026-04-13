'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'

const LEARNING_TYPES = [
  'correction',
  'preference',
  'domain_insight',
  'process_knowledge',
  'relationship',
  'context_update',
] as const

type LearningType = (typeof LEARNING_TYPES)[number]

const LEARNING_TYPE_LABELS: Record<LearningType, string> = {
  correction: 'Correction',
  preference: 'Preference',
  domain_insight: 'Domain Insight',
  process_knowledge: 'Process Knowledge',
  relationship: 'Relationship',
  context_update: 'Context Update',
}

const LEARNING_TYPE_COLORS: Record<LearningType, { bg: string; text: string }> = {
  correction: { bg: '#FEE2E2', text: '#991B1B' },
  preference: { bg: '#E0E7FF', text: '#3730A3' },
  domain_insight: { bg: '#D1FAE5', text: '#065F46' },
  process_knowledge: { bg: '#FEF3C7', text: '#92400E' },
  relationship: { bg: '#FCE7F3', text: '#9D174D' },
  context_update: { bg: '#DBEAFE', text: '#1E40AF' },
}

const QA_COLORS: Record<number, string> = {
  1: '#7C3AED', 2: '#2563EB', 3: '#059669', 4: '#D97706',
  5: '#DC2626', 6: '#EC4899', 7: '#6366F1',
}

const QA_NAMES: Record<number, string> = {
  1: 'Educational Program & Practice',
  2: 'Children\'s Health & Safety',
  3: 'Physical Environment',
  4: 'Staffing Arrangements',
  5: 'Relationships with Children',
  6: 'Partnerships with Families',
  7: 'Governance & Leadership',
}

interface AiLearning {
  id: string
  learning_type: LearningType
  category: string | null
  title: string
  content: string
  original_context: string | null
  source_conversation_id: string | null
  learned_from_user_id: string | null
  learned_from_role: string | null
  applies_to_roles: string[]
  confidence: number
  times_reinforced: number
  times_contradicted: number
  last_used_at: string | null
  expires_at: string | null
  is_active: boolean
  superseded_by: string | null
  tags: string[]
  qa_areas: number[]
  created_at: string
  updated_at: string
}

interface EditingLearning {
  id: string
  title: string
  content: string
  category: string
  confidence: number
  tags: string
  qa_areas: number[]
  is_active: boolean
}

export default function AiLearningsPage() {
  const profile = useProfile()
  const supabase = createClient()
  const [items, setItems] = useState<AiLearning[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<LearningType | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active')
  const [editing, setEditing] = useState<EditingLearning | null>(null)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadItems()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadItems = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ai_learnings')
      .select('*')
      .order('created_at', { ascending: false })
    setItems((data as AiLearning[] | null) || [])
    setLoading(false)
  }

  const categories = useMemo(() => {
    const cats = new Set<string>()
    for (const item of items) {
      if (item.category) cats.add(item.category)
    }
    return Array.from(cats).sort()
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterType !== 'all' && item.learning_type !== filterType) return false
      if (filterCategory !== 'all' && item.category !== filterCategory) return false
      if (filterActive === 'active' && !item.is_active) return false
      if (filterActive === 'inactive' && item.is_active) return false
      if (search) {
        const s = search.toLowerCase()
        return item.title.toLowerCase().includes(s) || item.content.toLowerCase().includes(s)
      }
      return true
    })
  }, [items, filterType, filterCategory, filterActive, search])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      if (item.is_active) {
        counts[item.learning_type] = (counts[item.learning_type] || 0) + 1
      }
    }
    return counts
  }, [items])

  const totalActive = items.filter(i => i.is_active).length

  const showFlash = (type: 'success' | 'error', text: string) => {
    setFlash({ type, text })
    setTimeout(() => setFlash(null), 3000)
  }

  const startEditing = (item: AiLearning) => {
    setEditing({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category || '',
      confidence: item.confidence,
      tags: (item.tags || []).join(', '),
      qa_areas: item.qa_areas || [],
      is_active: item.is_active,
    })
  }

  const handleSave = async () => {
    if (!editing || !editing.title.trim() || !editing.content.trim()) {
      showFlash('error', 'Title and content are required')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('ai_learnings')
        .update({
          title: editing.title.trim(),
          content: editing.content.trim(),
          category: editing.category.trim() || null,
          confidence: editing.confidence,
          tags: editing.tags.split(',').map(t => t.trim()).filter(Boolean),
          qa_areas: editing.qa_areas,
          is_active: editing.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id)
      if (error) throw error
      showFlash('success', 'Learning updated')
      setEditing(null)
      loadItems()
    } catch (err) {
      showFlash('error', `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    setSaving(false)
  }

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    const { error } = await supabase
      .from('ai_learnings')
      .update({ is_active: !currentlyActive, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      showFlash('error', 'Failed to toggle active state')
      return
    }
    showFlash('success', currentlyActive ? 'Learning deactivated' : 'Learning activated')
    loadItems()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  if (!['admin', 'ns'].includes(profile.role)) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">Only admins and nominated supervisors can manage AI learnings.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Learnings</h1>
        <p className="text-sm text-muted-foreground">
          View and manage what Kiros AI has learned from conversations
        </p>
      </div>

      {/* Flash message */}
      {flash && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${flash.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {flash.text}
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-card rounded-xl shadow-sm p-3 border border-border">
          <div className="text-xs text-muted-foreground">Total Active</div>
          <div className="text-xl font-bold text-foreground">{totalActive}</div>
        </div>
        {LEARNING_TYPES.map(type => {
          const colors = LEARNING_TYPE_COLORS[type]
          return (
            <div key={type} className="bg-card rounded-xl shadow-sm p-3 border border-border">
              <div className="text-xs text-muted-foreground">{LEARNING_TYPE_LABELS[type]}s</div>
              <div className="text-xl font-bold" style={{ color: colors.text }}>
                {typeCounts[type] || 0}
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl shadow-sm p-4 border border-border space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title or content..."
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as LearningType | 'all')}
            className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="all">All Types</option>
            {LEARNING_TYPES.map(type => (
              <option key={type} value={type}>{LEARNING_TYPE_LABELS[type]}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterActive}
            onChange={e => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="all">Active & Inactive</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Edit Learning</h2>
                <button onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-accent">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Content</label>
                <textarea
                  value={editing.content}
                  onChange={e => setEditing({ ...editing, content: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 resize-y"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                <input
                  type="text"
                  value={editing.category}
                  onChange={e => setEditing({ ...editing, category: e.target.value })}
                  placeholder="e.g., QA1, staffing, programming, compliance"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              {/* Confidence */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Confidence: {Math.round(editing.confidence * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={editing.confidence}
                  onChange={e => setEditing({ ...editing, confidence: parseFloat(e.target.value) })}
                  className="w-full accent-purple-600"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editing.tags}
                  onChange={e => setEditing({ ...editing, tags: e.target.value })}
                  placeholder="e.g., programming, nqs, room_leaders"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              {/* QA Areas */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Quality Areas</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(qa => (
                    <button
                      key={qa}
                      type="button"
                      onClick={() => {
                        const qas = editing.qa_areas.includes(qa)
                          ? editing.qa_areas.filter(q => q !== qa)
                          : [...editing.qa_areas, qa]
                        setEditing({ ...editing, qa_areas: qas })
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        editing.qa_areas.includes(qa) ? 'text-white' : 'bg-muted text-foreground'
                      }`}
                      style={editing.qa_areas.includes(qa) ? { backgroundColor: QA_COLORS[qa] } : undefined}
                    >
                      QA{qa}: {QA_NAMES[qa]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editing.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-card transition-transform ${editing.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-foreground">{editing.is_active ? 'Active' : 'Inactive'}</span>
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
                  {saving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items table */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{filteredItems.length} learnings</span>
          <span className="text-xs text-muted-foreground">Click a row to expand</span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-muted-foreground mt-2">Loading learnings...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No learnings match your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map(item => {
              const colors = LEARNING_TYPE_COLORS[item.learning_type]
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
                        {LEARNING_TYPE_LABELS[item.learning_type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{item.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.content.length > 100 ? item.content.substring(0, 100) + '...' : item.content}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                        {item.category && (
                          <span className="px-1.5 py-0.5 rounded bg-muted text-foreground">{item.category}</span>
                        )}
                        <span className="text-muted-foreground">{Math.round(item.confidence * 100)}%</span>
                        {item.times_reinforced > 0 && (
                          <span className="text-green-600" title="Times reinforced">+{item.times_reinforced}</span>
                        )}
                        {item.qa_areas?.map(qa => (
                          <span key={qa} className="px-1.5 py-0.5 rounded text-white text-xs" style={{ backgroundColor: QA_COLORS[qa] }}>
                            QA{qa}
                          </span>
                        ))}
                        {!item.is_active && (
                          <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inactive</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 bg-muted/50">
                      <div className="pl-[calc(theme(spacing.2)+theme(spacing.0.5))]">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.content}</p>

                        {item.original_context && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="font-medium">Original context:</span>
                            <p className="italic mt-0.5">{item.original_context}</p>
                          </div>
                        )}

                        {/* Detail grid */}
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Confidence</span>
                            <div className="font-medium text-foreground">{Math.round(item.confidence * 100)}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Reinforced</span>
                            <div className="font-medium text-foreground">{item.times_reinforced} times</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Contradicted</span>
                            <div className="font-medium text-foreground">{item.times_contradicted} times</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last Used</span>
                            <div className="font-medium text-foreground">{formatDate(item.last_used_at)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Created</span>
                            <div className="font-medium text-foreground">{formatDate(item.created_at)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Updated</span>
                            <div className="font-medium text-foreground">{formatDate(item.updated_at)}</div>
                          </div>
                          {item.learned_from_role && (
                            <div>
                              <span className="text-muted-foreground">Learned From</span>
                              <div className="font-medium text-foreground">{item.learned_from_role}</div>
                            </div>
                          )}
                          {item.expires_at && (
                            <div>
                              <span className="text-muted-foreground">Expires</span>
                              <div className="font-medium text-foreground">{formatDate(item.expires_at)}</div>
                            </div>
                          )}
                        </div>

                        {(item.tags?.length ?? 0) > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">Tags:</span>
                            {item.tags.map(tag => (
                              <span key={tag} className="text-xs px-2 py-0.5 bg-muted text-foreground rounded">{tag}</span>
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
                          <span className="text-xs text-gray-300 ml-auto">
                            {formatDate(item.created_at)}
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
    </div>
  )
}
