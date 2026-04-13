'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'

// ── Types ──────────────────────────────────────────────────────────────────────

type PromptSection = 'identity' | 'expertise' | 'role_instructions' | 'response_rules' | 'document_templates' | 'custom'
type PromptRole = 'admin' | 'manager' | 'ns' | 'el' | 'educator' | null

interface SystemPrompt {
  id: string
  section: PromptSection
  role: PromptRole
  title: string
  template: string
  variables: string[]
  sort_order: number
  is_active: boolean
  version: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

interface EditingPrompt {
  id?: string
  section: PromptSection
  role: PromptRole
  title: string
  template: string
  variables: string
  sort_order: number
  is_active: boolean
  version?: number
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ALL_SECTIONS: PromptSection[] = [
  'identity', 'expertise', 'role_instructions', 'response_rules', 'document_templates', 'custom',
]

const SECTION_LABELS: Record<PromptSection, string> = {
  identity: 'Identity',
  expertise: 'Expertise',
  role_instructions: 'Role Instructions',
  response_rules: 'Response Rules',
  document_templates: 'Document Templates',
  custom: 'Custom',
}

const SECTION_COLORS: Record<PromptSection, { bg: string; text: string }> = {
  identity: { bg: '#EDE9FE', text: '#6D28D9' },
  expertise: { bg: '#DBEAFE', text: '#1D4ED8' },
  role_instructions: { bg: '#FEF3C7', text: '#B45309' },
  response_rules: { bg: '#D1FAE5', text: '#047857' },
  document_templates: { bg: '#FCE7F3', text: '#BE185D' },
  custom: { bg: '#F3F4F6', text: '#374151' },
}

const ALL_ROLES: { value: PromptRole; label: string }[] = [
  { value: null, label: 'Global (all roles)' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'ns', label: 'Nominated Supervisor' },
  { value: 'el', label: 'Educational Leader' },
  { value: 'educator', label: 'Educator' },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  ns: 'Nominated Supervisor',
  el: 'Educational Leader',
  educator: 'Educator',
}

const EMPTY_PROMPT: EditingPrompt = {
  section: 'custom',
  role: null,
  title: '',
  template: '',
  variables: '[]',
  sort_order: 0,
  is_active: true,
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AIPromptsPage() {
  const profile = useProfile()
  const supabase = createClient()

  const [prompts, setPrompts] = useState<SystemPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSection, setFilterSection] = useState<PromptSection | 'all'>('all')
  const [filterRole, setFilterRole] = useState<PromptRole | 'all'>('all')
  const [editing, setEditing] = useState<EditingPrompt | null>(null)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewRole, setPreviewRole] = useState<string>('admin')
  const [previewPrompt, setPreviewPrompt] = useState<string>('')
  const [previewLoading, setPreviewLoading] = useState(false)

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadPrompts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ai_system_prompts')
      .select('*')
      .order('sort_order')
      .order('section')
      .order('title')
    setPrompts(data || [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadPrompts()
  }, [loadPrompts])

  // ── Filters ────────────────────────────────────────────────────────────────

  const filteredPrompts = useMemo(() => {
    return prompts.filter(p => {
      if (filterSection !== 'all' && p.section !== filterSection) return false
      if (filterRole !== 'all') {
        if (filterRole === null && p.role !== null) return false
        if (filterRole !== null && p.role !== filterRole) return false
      }
      return true
    })
  }, [prompts, filterSection, filterRole])

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: prompts.length }
    for (const p of prompts) {
      counts[p.section] = (counts[p.section] || 0) + 1
    }
    return counts
  }, [prompts])

  const activeCount = prompts.filter(p => p.is_active).length
  const inactiveCount = prompts.filter(p => !p.is_active).length

  // ── Flash ──────────────────────────────────────────────────────────────────

  const showFlash = useCallback((type: 'success' | 'error', text: string) => {
    setFlash({ type, text })
    setTimeout(() => setFlash(null), 3000)
  }, [])

  // ── Preview ────────────────────────────────────────────────────────────────

  const fetchPreview = useCallback(async (role: string) => {
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/admin/preview-prompt?role=${encodeURIComponent(role)}`)
      if (!res.ok) throw new Error('Failed to fetch prompt')
      const data = await res.json()
      setPreviewPrompt(data.prompt || '')
    } catch (err) {
      setPreviewPrompt(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    setPreviewLoading(false)
  }, [])

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editing || !editing.title.trim() || !editing.template.trim()) {
      showFlash('error', 'Title and template are required')
      return
    }

    let parsedVariables: string[]
    try {
      parsedVariables = JSON.parse(editing.variables)
      if (!Array.isArray(parsedVariables)) throw new Error('Variables must be a JSON array')
    } catch {
      showFlash('error', 'Variables must be a valid JSON array (e.g. ["var1", "var2"])')
      return
    }

    setSaving(true)
    try {
      if (editing.id) {
        const { error } = await supabase
          .from('ai_system_prompts')
          .update({
            section: editing.section,
            role: editing.role,
            title: editing.title.trim(),
            template: editing.template,
            variables: parsedVariables,
            sort_order: editing.sort_order,
            is_active: editing.is_active,
            version: (editing.version || 1) + 1,
            updated_by: profile.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id)
        if (error) throw error
        showFlash('success', 'Prompt section updated')
      } else {
        const { error } = await supabase
          .from('ai_system_prompts')
          .insert({
            section: editing.section,
            role: editing.role,
            title: editing.title.trim(),
            template: editing.template,
            variables: parsedVariables,
            sort_order: editing.sort_order,
            is_active: editing.is_active,
            version: 1,
            created_by: profile.id,
          })
        if (error) throw error
        showFlash('success', 'Prompt section created')
      }
      setEditing(null)
      loadPrompts()
    } catch (err) {
      showFlash('error', `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prompt section? This cannot be undone and will affect AI behaviour.')) return
    const { error } = await supabase.from('ai_system_prompts').delete().eq('id', id)
    if (error) {
      showFlash('error', 'Failed to delete')
    } else {
      showFlash('success', 'Prompt section deleted')
      if (expandedId === id) setExpandedId(null)
      loadPrompts()
    }
  }

  const startEditing = (prompt: SystemPrompt) => {
    setEditing({
      id: prompt.id,
      section: prompt.section,
      role: prompt.role,
      title: prompt.title,
      template: prompt.template,
      variables: JSON.stringify(prompt.variables || [], null, 2),
      sort_order: prompt.sort_order,
      is_active: prompt.is_active,
      version: prompt.version,
    })
  }

  // ── Access check ───────────────────────────────────────────────────────────

  if (profile.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">Only administrators can manage AI system prompts.</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI System Prompts</h1>
          <p className="text-sm text-muted-foreground">
            Manage the system prompt sections that control Kiros AI behaviour
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPreviewOpen(true); fetchPreview(previewRole) }}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 border border-border text-foreground hover:bg-accent"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview Full Prompt
          </button>
          <button
            onClick={() => setEditing({ ...EMPTY_PROMPT })}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 bg-primary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Section
          </button>
        </div>
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
          <div className="text-xs text-muted-foreground">Total Sections</div>
          <div className="text-2xl font-bold text-foreground">{prompts.length}</div>
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
        {/* Section filter pills */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground py-1 mr-1">Section:</span>
          <button
            onClick={() => setFilterSection('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${filterSection === 'all' ? 'text-white bg-primary' : 'bg-muted text-foreground hover:bg-accent'}`}
          >
            All ({sectionCounts.all || 0})
          </button>
          {ALL_SECTIONS.map(section => {
            const colors = SECTION_COLORS[section]
            const isActive = filterSection === section
            return (
              <button
                key={section}
                onClick={() => setFilterSection(isActive ? 'all' : section)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${isActive ? 'ring-2 ring-offset-1' : 'hover:opacity-80'}`}
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {SECTION_LABELS[section]} ({sectionCounts[section] || 0})
              </button>
            )
          })}
        </div>

        {/* Role filter pills */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground py-1 mr-1">Role:</span>
          <button
            onClick={() => setFilterRole('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${filterRole === 'all' ? 'text-white bg-primary' : 'bg-muted text-foreground hover:bg-accent'}`}
          >
            All
          </button>
          {ALL_ROLES.map(r => (
            <button
              key={r.value ?? 'global'}
              onClick={() => setFilterRole(filterRole === r.value ? 'all' : r.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${filterRole === r.value ? 'text-white bg-purple-600' : 'bg-muted text-foreground hover:bg-accent'}`}
            >
              {r.label}
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
                <h2 className="text-lg font-semibold text-foreground">
                  {editing.id ? 'Edit Prompt Section' : 'Add New Prompt Section'}
                </h2>
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
                  placeholder="e.g., 'Core Identity & Personality'"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              {/* Section */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Section</label>
                <select
                  value={editing.section}
                  onChange={e => setEditing({ ...editing, section: e.target.value as PromptSection })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  {ALL_SECTIONS.map(section => (
                    <option key={section} value={section}>{SECTION_LABELS[section]}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {editing.section === 'identity' && 'Defines who the AI is -- name, personality, tone of voice'}
                  {editing.section === 'expertise' && 'Knowledge domains and professional expertise the AI draws on'}
                  {editing.section === 'role_instructions' && 'Role-specific instructions for different user types'}
                  {editing.section === 'response_rules' && 'Rules governing how the AI formats and structures responses'}
                  {editing.section === 'document_templates' && 'Templates for generating documents, reports, and exports'}
                  {editing.section === 'custom' && 'Custom prompt sections for specialised behaviour'}
                </p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select
                  value={editing.role ?? ''}
                  onChange={e => setEditing({ ...editing, role: e.target.value === '' ? null : e.target.value as PromptRole })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  {ALL_ROLES.map(r => (
                    <option key={r.value ?? 'global'} value={r.value ?? ''}>{r.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Global sections apply to all users. Role-specific sections are only included when that role is chatting.
                </p>
              </div>

              {/* Template */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Template</label>
                <textarea
                  value={editing.template}
                  onChange={e => setEditing({ ...editing, template: e.target.value })}
                  placeholder="The system prompt text. Use {{variable_name}} for dynamic values."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 resize-y font-mono min-h-[300px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {'{{variable_name}}'} syntax for dynamic values that get replaced at runtime.
                </p>
              </div>

              {/* Variables */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Variables (JSON array)</label>
                <textarea
                  value={editing.variables}
                  onChange={e => setEditing({ ...editing, variables: e.target.value })}
                  placeholder='["centre_name", "user_name", "user_role"]'
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 resize-y font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  JSON array of variable names used in this template. These are resolved at runtime.
                </p>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Sort Order</label>
                <input
                  type="number"
                  value={editing.sort_order}
                  onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-32 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lower numbers appear first in the assembled system prompt.
                </p>
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
                <span className="text-sm text-foreground">
                  {editing.is_active ? 'Active -- included in AI system prompt' : 'Inactive -- excluded from AI system prompt'}
                </span>
              </div>

              {/* Version info */}
              {editing.id && editing.version && (
                <p className="text-xs text-muted-foreground">
                  Current version: {editing.version} (will become v{editing.version + 1} on save)
                </p>
              )}

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
                  disabled={saving || !editing.title.trim() || !editing.template.trim()}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 bg-primary"
                >
                  {saving ? 'Saving...' : editing.id ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">Assembled System Prompt</h2>
                <select
                  value={previewRole}
                  onChange={e => { setPreviewRole(e.target.value); fetchPreview(e.target.value) }}
                  className="px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="ns">Nominated Supervisor</option>
                  <option value="el">Educational Leader</option>
                  <option value="educator">Educator</option>
                </select>
              </div>
              <button onClick={() => setPreviewOpen(false)} className="p-1 rounded-lg hover:bg-accent">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">
                      This is the full prompt assembled for the <strong>{previewRole}</strong> role. Dynamic variables (centre context, staff list, service details) are shown as placeholders.
                    </p>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-4">{previewPrompt.length.toLocaleString()} chars</span>
                  </div>
                  <pre className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono bg-muted border border-border rounded-lg p-4 overflow-x-auto">
                    {previewPrompt}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prompts List */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{filteredPrompts.length} prompt sections</span>
          <span className="text-xs text-muted-foreground">Click to expand &middot; Active sections are assembled into the AI system prompt</span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-muted-foreground mt-2">Loading prompts...</p>
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No prompt sections match your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredPrompts.map(prompt => {
              const sectionColors = SECTION_COLORS[prompt.section]
              const isExpanded = expandedId === prompt.id

              return (
                <div key={prompt.id} className={`${!prompt.is_active ? 'opacity-50' : ''}`}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : prompt.id)}
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap mt-0.5"
                        style={{ backgroundColor: sectionColors.bg, color: sectionColors.text }}
                      >
                        {SECTION_LABELS[prompt.section]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{prompt.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {prompt.template.substring(0, 120)}{prompt.template.length > 120 ? '...' : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {prompt.role && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            {ROLE_LABELS[prompt.role] || prompt.role}
                          </span>
                        )}
                        {!prompt.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">Inactive</span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          v{prompt.version}
                        </span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 bg-muted/50">
                      <div>
                        <pre className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono bg-card border border-border rounded-lg p-4 overflow-x-auto max-h-[400px] overflow-y-auto">
                          {prompt.template}
                        </pre>

                        {prompt.variables && prompt.variables.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">Variables:</span>
                            {prompt.variables.map((v: string) => (
                              <span key={v} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded font-mono">
                                {`{{${v}}}`}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Sort order: {prompt.sort_order}</span>
                          <span>&middot;</span>
                          <span>Version {prompt.version}</span>
                          <span>&middot;</span>
                          <span>{prompt.role ? `${ROLE_LABELS[prompt.role] || prompt.role} only` : 'Global'}</span>
                          <span>&middot;</span>
                          <span>Updated {new Date(prompt.updated_at).toLocaleDateString('en-AU')}</span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); startEditing(prompt) }}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(prompt.id) }}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
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
        <h3 className="text-sm font-semibold text-purple-800 mb-3">How AI System Prompts Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-purple-700 leading-relaxed">
          <div>
            <div className="font-medium mb-1">1. Sections define behaviour</div>
            <p>Each section controls a different aspect of the AI -- its identity, expertise, how it responds to different roles, formatting rules, and document templates.</p>
          </div>
          <div>
            <div className="font-medium mb-1">2. Assembled at runtime</div>
            <p>Active sections are combined in sort order to build the full system prompt. Role-specific sections are only included for matching users. Variables like {'{{centre_name}}'} are replaced dynamically.</p>
          </div>
          <div>
            <div className="font-medium mb-1">3. Version controlled</div>
            <p>Each edit increments the version number so you can track changes over time. Deactivate sections to temporarily disable them without deleting.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
