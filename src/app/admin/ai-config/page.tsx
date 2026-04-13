'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'

// ============================================================
// Types
// ============================================================

interface ConfigRow {
  config_key: string
  config_value: string
  value_type: string
  label: string
  description: string
  category: string
  validation_min?: number | null
  validation_max?: number | null
  updated_at: string
}

interface ToolPermRow {
  id: string
  tool_name: string
  tool_type: string
  description: string
  allowed_roles: string[]
  is_active: boolean
  updated_at: string
}

interface DocStyleRow {
  id: string
  format: string
  styles: Record<string, unknown>
  updated_at: string
}

interface ServiceDetailRow {
  id: string
  detail_key: string
  detail_value: string
  updated_at: string
}

type Flash = { type: 'success' | 'error'; text: string } | null

// ============================================================
// Constants
// ============================================================

const TABS = [
  { id: 'model', label: 'Model & Thinking', prefix: 'model.' },
  { id: 'chat', label: 'Chat', prefix: 'chat.' },
  { id: 'agent', label: 'Agent Defaults', prefix: 'agent.' },
  { id: 'upload', label: 'Uploads', prefix: 'upload.' },
  { id: 'learning', label: 'Learning', prefix: 'learning.' },
  { id: 'brand', label: 'Brand', prefix: 'brand.' },
  { id: 'doc_styles', label: 'Document Styling', prefix: null },
  { id: 'tool_perms', label: 'Tool Permissions', prefix: null },
  { id: 'display', label: 'Display', prefix: 'display.' },
  { id: 'marketing', label: 'Marketing', prefix: 'marketing.' },
  { id: 'widget', label: 'Widget', prefix: 'widget.' },
  { id: 'report', label: 'Reports', prefix: 'report.' },
  { id: 'cron', label: 'Cron & Jobs', prefix: 'cron.' },
  { id: 'service', label: 'Service Details', prefix: null },
  { id: 'system', label: 'System', prefix: null },
] as const

const SYSTEM_PREFIXES = ['dashboard.', 'compliance.', 'integration.', 'sharepoint.']
const ROLES = ['admin', 'manager', 'ns', 'el', 'educator'] as const
const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

// ============================================================
// Component
// ============================================================

export default function AIConfigPage() {
  const profile = useProfile()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<string>('model')
  const [configRows, setConfigRows] = useState<ConfigRow[]>([])
  const [editedValues, setEditedValues] = useState<Map<string, string>>(new Map())
  const [toolPerms, setToolPerms] = useState<ToolPermRow[]>([])
  const [editedPerms, setEditedPerms] = useState<Map<string, string[]>>(new Map())
  const [docStyles, setDocStyles] = useState<DocStyleRow[]>([])
  const [editedStyles, setEditedStyles] = useState<Map<string, Record<string, unknown>>>(new Map())
  const [serviceDetails, setServiceDetails] = useState<ServiceDetailRow[]>([])
  const [editedService, setEditedService] = useState<Map<string, string>>(new Map())
  const [newServiceKey, setNewServiceKey] = useState('')
  const [newServiceValue, setNewServiceValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<Flash>(null)

  const showFlash = useCallback((type: 'success' | 'error', text: string) => {
    setFlash({ type, text })
    setTimeout(() => setFlash(null), 4000)
  }, [])

  // ---- Load data ----

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [configRes, toolRes, styleRes, serviceRes] = await Promise.all([
      supabase.from('ai_config').select('*').order('config_key'),
      supabase.from('ai_tool_permissions').select('*').order('tool_name'),
      supabase.from('ai_document_styles').select('*').order('format'),
      supabase.from('service_details').select('*').order('detail_key'),
    ])
    if (configRes.data) setConfigRows(configRes.data as ConfigRow[])
    if (toolRes.data) setToolPerms(toolRes.data as ToolPermRow[])
    if (styleRes.data) setDocStyles(styleRes.data as DocStyleRow[])
    if (serviceRes.data) setServiceDetails(serviceRes.data as ServiceDetailRow[])
    setEditedValues(new Map())
    setEditedPerms(new Map())
    setEditedStyles(new Map())
    setEditedService(new Map())
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAll() }, [loadAll])

  // ---- Helpers ----

  const configForTab = (tabId: string): ConfigRow[] => {
    if (tabId === 'system') {
      return configRows.filter(r => SYSTEM_PREFIXES.some(p => r.config_key.startsWith(p)))
    }
    const tab = TABS.find(t => t.id === tabId)
    if (!tab || !tab.prefix) return []
    return configRows.filter(r => r.config_key.startsWith(tab.prefix!))
  }

  const getEditedValue = (key: string, original: string): string => {
    return editedValues.has(key) ? editedValues.get(key)! : original
  }

  const setConfigValue = (key: string, value: string) => {
    setEditedValues(prev => {
      const next = new Map(prev)
      next.set(key, value)
      return next
    })
  }

  const isColourField = (key: string): boolean => {
    return key.includes('colour') || key.includes('color')
  }

  const validateHex = (value: string): boolean => HEX_REGEX.test(value)

  const validateNumeric = (value: string, row: ConfigRow): string | null => {
    const num = row.value_type === 'int' ? parseInt(value, 10) : parseFloat(value)
    if (isNaN(num)) return 'Must be a valid number'
    if (row.validation_min != null && num < row.validation_min) return `Minimum: ${row.validation_min}`
    if (row.validation_max != null && num > row.validation_max) return `Maximum: ${row.validation_max}`
    return null
  }

  const hasChanges = (tabId: string): boolean => {
    if (tabId === 'doc_styles') return editedStyles.size > 0
    if (tabId === 'tool_perms') return editedPerms.size > 0
    if (tabId === 'service') return editedService.size > 0
    const rows = configForTab(tabId)
    return rows.some(r => editedValues.has(r.config_key))
  }

  // ---- Validation ----

  const validateTab = (tabId: string): string[] => {
    const errors: string[] = []
    if (tabId === 'doc_styles' || tabId === 'tool_perms' || tabId === 'service') return errors
    const rows = configForTab(tabId)
    for (const row of rows) {
      if (!editedValues.has(row.config_key)) continue
      const val = editedValues.get(row.config_key)!
      if ((row.value_type === 'int' || row.value_type === 'float') && val.trim() !== '') {
        const err = validateNumeric(val, row)
        if (err) errors.push(`${row.label || row.config_key}: ${err}`)
      }
      if (isColourField(row.config_key) && row.value_type === 'string' && val.trim() !== '') {
        if (!validateHex(val)) errors.push(`${row.label || row.config_key}: Invalid hex colour (e.g. #470DA8)`)
      }
      if (row.value_type === 'json' && val.trim() !== '') {
        try { JSON.parse(val) } catch { errors.push(`${row.label || row.config_key}: Invalid JSON`) }
      }
    }
    return errors
  }

  // ---- Save config rows ----

  const saveConfig = async (tabId: string) => {
    const errors = validateTab(tabId)
    if (errors.length > 0) {
      showFlash('error', errors.join('; '))
      return
    }

    setSaving(true)
    try {
      const rows = configForTab(tabId)
      const changed = rows.filter(r => editedValues.has(r.config_key))
      for (const row of changed) {
        const newVal = editedValues.get(row.config_key)!
        // Optimistic lock: check updated_at hasn't changed
        const { data: current } = await supabase
          .from('ai_config')
          .select('updated_at')
          .eq('config_key', row.config_key)
          .single()
        if (current && current.updated_at !== row.updated_at) {
          showFlash('error', `"${row.label || row.config_key}" was modified by another user. Please refresh.`)
          setSaving(false)
          return
        }
        const { error } = await supabase
          .from('ai_config')
          .update({ config_value: newVal, updated_at: new Date().toISOString() })
          .eq('config_key', row.config_key)
        if (error) throw new Error(`Failed to save ${row.config_key}: ${error.message}`)
      }
      showFlash('success', `Saved ${changed.length} setting${changed.length !== 1 ? 's' : ''}`)
      await loadAll()
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  // ---- Save tool permissions ----

  const saveToolPerms = async () => {
    setSaving(true)
    try {
      for (const [toolName, roles] of Array.from(editedPerms.entries())) {
        const perm = toolPerms.find(p => p.tool_name === toolName)
        if (!perm) continue
        const { data: current } = await supabase
          .from('ai_tool_permissions')
          .select('updated_at')
          .eq('id', perm.id)
          .single()
        if (current && current.updated_at !== perm.updated_at) {
          showFlash('error', `"${toolName}" was modified by another user. Please refresh.`)
          setSaving(false)
          return
        }
        const { error } = await supabase
          .from('ai_tool_permissions')
          .update({ allowed_roles: roles, updated_at: new Date().toISOString() })
          .eq('id', perm.id)
        if (error) throw new Error(`Failed to save ${toolName}: ${error.message}`)
      }
      showFlash('success', `Saved ${editedPerms.size} tool permission${editedPerms.size !== 1 ? 's' : ''}`)
      await loadAll()
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  // ---- Save doc styles ----

  const saveDocStyles = async () => {
    setSaving(true)
    try {
      for (const [format, styles] of Array.from(editedStyles.entries())) {
        const doc = docStyles.find(d => d.format === format)
        if (!doc) continue
        const { data: current } = await supabase
          .from('ai_document_styles')
          .select('updated_at')
          .eq('id', doc.id)
          .single()
        if (current && current.updated_at !== doc.updated_at) {
          showFlash('error', `"${format}" styles were modified by another user. Please refresh.`)
          setSaving(false)
          return
        }
        const { error } = await supabase
          .from('ai_document_styles')
          .update({ styles, updated_at: new Date().toISOString() })
          .eq('id', doc.id)
        if (error) throw new Error(`Failed to save ${format}: ${error.message}`)
      }
      showFlash('success', 'Document styles saved')
      await loadAll()
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  // ---- Save service details ----

  const saveServiceDetails = async () => {
    setSaving(true)
    try {
      for (const [id, value] of Array.from(editedService.entries())) {
        const row = serviceDetails.find(r => r.id === id)
        if (!row) continue
        const { data: current } = await supabase
          .from('service_details')
          .select('updated_at')
          .eq('id', row.id)
          .single()
        if (current && current.updated_at !== row.updated_at) {
          showFlash('error', `"${row.detail_key}" was modified by another user. Please refresh.`)
          setSaving(false)
          return
        }
        const { error } = await supabase
          .from('service_details')
          .update({ detail_value: value, updated_at: new Date().toISOString() })
          .eq('id', row.id)
        if (error) throw new Error(`Failed to save ${row.detail_key}: ${error.message}`)
      }
      showFlash('success', 'Service details saved')
      await loadAll()
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  const addServiceDetail = async () => {
    if (!newServiceKey.trim()) {
      showFlash('error', 'Key is required')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('service_details').insert({
        detail_key: newServiceKey.trim(),
        detail_value: newServiceValue.trim(),
      })
      if (error) throw new Error(error.message)
      setNewServiceKey('')
      setNewServiceValue('')
      showFlash('success', 'Service detail added')
      await loadAll()
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Add failed')
    }
    setSaving(false)
  }

  const removeServiceDetail = async (id: string) => {
    if (!confirm('Remove this service detail?')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('service_details').delete().eq('id', id)
      if (error) throw new Error(error.message)
      showFlash('success', 'Service detail removed')
      await loadAll()
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Remove failed')
    }
    setSaving(false)
  }

  // ---- Render helpers ----

  const renderConfigInput = (row: ConfigRow) => {
    const value = getEditedValue(row.config_key, row.config_value)
    const isChanged = editedValues.has(row.config_key)
    const isColour = isColourField(row.config_key) && row.value_type === 'string'
    const baseClass = `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 ${isChanged ? 'border-purple-400 bg-purple-50' : 'border-border'}`

    switch (row.value_type) {
      case 'bool':
        return (
          <button
            type="button"
            onClick={() => setConfigValue(row.config_key, value === 'true' ? 'false' : 'true')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value === 'true' ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${value === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        )

      case 'int':
        return (
          <input
            type="number"
            value={value}
            onChange={e => setConfigValue(row.config_key, e.target.value)}
            min={row.validation_min ?? undefined}
            max={row.validation_max ?? undefined}
            step={1}
            className={baseClass}
          />
        )

      case 'float':
        return (
          <input
            type="number"
            value={value}
            onChange={e => setConfigValue(row.config_key, e.target.value)}
            min={row.validation_min ?? undefined}
            max={row.validation_max ?? undefined}
            step={0.01}
            className={baseClass}
          />
        )

      case 'json':
        return (
          <textarea
            value={value}
            onChange={e => setConfigValue(row.config_key, e.target.value)}
            rows={4}
            className={`${baseClass} font-mono text-xs resize-y`}
          />
        )

      case 'text':
        return (
          <textarea
            value={value}
            onChange={e => setConfigValue(row.config_key, e.target.value)}
            rows={5}
            className={`${baseClass} resize-y`}
          />
        )

      default: // string
        if (isColour) {
          return (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={validateHex(value) ? value : '#000000'}
                onChange={e => setConfigValue(row.config_key, e.target.value)}
                className="h-10 w-12 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={value}
                onChange={e => setConfigValue(row.config_key, e.target.value)}
                placeholder="#470DA8"
                className={`${baseClass} flex-1`}
              />
              {value && !validateHex(value) && (
                <span className="text-xs text-red-500">Invalid hex</span>
              )}
            </div>
          )
        }
        return (
          <input
            type="text"
            value={value}
            onChange={e => setConfigValue(row.config_key, e.target.value)}
            className={baseClass}
          />
        )
    }
  }

  const renderConfigSection = (tabId: string) => {
    const rows = configForTab(tabId)
    if (rows.length === 0) {
      return <p className="text-sm text-muted-foreground py-4">No configuration keys found for this category.</p>
    }
    return (
      <div className="space-y-6">
        {rows.map(row => (
          <div key={row.config_key} className="space-y-1">
            <div className="flex items-baseline gap-2">
              <label className="text-sm font-medium text-foreground">{row.label || row.config_key}</label>
              <span className="text-xs text-muted-foreground font-mono">{row.config_key}</span>
            </div>
            {row.description && (
              <p className="text-xs text-muted-foreground">{row.description}</p>
            )}
            {renderConfigInput(row)}
            {(row.validation_min != null || row.validation_max != null) && (
              <p className="text-xs text-muted-foreground">
                {row.validation_min != null && `Min: ${row.validation_min}`}
                {row.validation_min != null && row.validation_max != null && ' | '}
                {row.validation_max != null && `Max: ${row.validation_max}`}
              </p>
            )}
          </div>
        ))}
        <div className="pt-4 border-t border-border flex items-center gap-3">
          <button
            onClick={() => saveConfig(tabId)}
            disabled={saving || !hasChanges(tabId)}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {hasChanges(tabId) && (
            <button
              onClick={() => {
                setEditedValues(prev => {
                  const next = new Map(prev)
                  rows.forEach(r => next.delete(r.config_key))
                  return next
                })
              }}
              className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              Discard
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderToolPermissions = () => {
    if (toolPerms.length === 0) {
      return <p className="text-sm text-muted-foreground py-4">No tool permissions found.</p>
    }
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium text-foreground">Tool</th>
                <th className="text-left py-2 px-3 font-medium text-foreground">Type</th>
                {ROLES.map(role => (
                  <th key={role} className="text-center py-2 px-3 font-medium text-foreground capitalize">{role}</th>
                ))}
                <th className="text-center py-2 px-3 font-medium text-foreground">Active</th>
              </tr>
            </thead>
            <tbody>
              {toolPerms.map(perm => {
                const currentRoles = editedPerms.has(perm.tool_name) ? editedPerms.get(perm.tool_name)! : perm.allowed_roles
                const isEdited = editedPerms.has(perm.tool_name)
                return (
                  <tr key={perm.id} className={`border-b border-border hover:bg-accent/50 ${isEdited ? 'bg-purple-50' : ''}`}>
                    <td className="py-2 px-3">
                      <div className="font-medium text-foreground">{perm.tool_name}</div>
                      {perm.description && <div className="text-xs text-muted-foreground">{perm.description}</div>}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{perm.tool_type}</td>
                    {ROLES.map(role => (
                      <td key={role} className="text-center py-2 px-3">
                        <input
                          type="checkbox"
                          checked={currentRoles.includes(role)}
                          onChange={e => {
                            const next = e.target.checked
                              ? [...currentRoles, role]
                              : currentRoles.filter(r => r !== role)
                            setEditedPerms(prev => {
                              const m = new Map(prev)
                              m.set(perm.tool_name, next)
                              return m
                            })
                          }}
                          className="w-4 h-4 accent-purple-600"
                        />
                      </td>
                    ))}
                    <td className="text-center py-2 px-3">
                      <span className={`inline-block w-2 h-2 rounded-full ${perm.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="pt-4 border-t border-border flex items-center gap-3">
          <button
            onClick={saveToolPerms}
            disabled={saving || !hasChanges('tool_perms')}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {hasChanges('tool_perms') && (
            <button
              onClick={() => setEditedPerms(new Map())}
              className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              Discard
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderDocStyles = () => {
    if (docStyles.length === 0) {
      return <p className="text-sm text-muted-foreground py-4">No document styles found.</p>
    }
    return (
      <div className="space-y-6">
        {docStyles.map(doc => {
          const currentStyles = editedStyles.has(doc.format) ? editedStyles.get(doc.format)! : doc.styles
          const isEdited = editedStyles.has(doc.format)
          return (
            <details key={doc.id} className={`border rounded-xl overflow-hidden ${isEdited ? 'border-purple-400' : 'border-border'}`}>
              <summary className="px-4 py-3 bg-muted/50 cursor-pointer text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">
                {doc.format.toUpperCase()} Styles
                {isEdited && <span className="ml-2 text-xs text-purple-600">(modified)</span>}
              </summary>
              <div className="p-4 space-y-4">
                {Object.entries(currentStyles).map(([key, val]) => {
                  const isColour = key.includes('colour') || key.includes('color') || key.includes('Color') || key.includes('Colour')
                  const isNumber = typeof val === 'number'
                  const strVal = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)

                  return (
                    <div key={key} className="space-y-1">
                      <label className="text-sm font-medium text-foreground">{key}</label>
                      {isColour && typeof val === 'string' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={validateHex(strVal) ? strVal : '#000000'}
                            onChange={e => {
                              const next = { ...currentStyles, [key]: e.target.value }
                              setEditedStyles(prev => { const m = new Map(prev); m.set(doc.format, next); return m })
                            }}
                            className="h-10 w-12 rounded border border-border cursor-pointer"
                          />
                          <input
                            type="text"
                            value={strVal}
                            onChange={e => {
                              const next = { ...currentStyles, [key]: e.target.value }
                              setEditedStyles(prev => { const m = new Map(prev); m.set(doc.format, next); return m })
                            }}
                            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                          />
                        </div>
                      ) : isNumber ? (
                        <input
                          type="number"
                          value={val as number}
                          onChange={e => {
                            const next = { ...currentStyles, [key]: parseFloat(e.target.value) || 0 }
                            setEditedStyles(prev => { const m = new Map(prev); m.set(doc.format, next); return m })
                          }}
                          step={Number.isInteger(val) ? 1 : 0.1}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                        />
                      ) : typeof val === 'object' ? (
                        <textarea
                          value={strVal}
                          onChange={e => {
                            try {
                              const parsed = JSON.parse(e.target.value)
                              const next = { ...currentStyles, [key]: parsed }
                              setEditedStyles(prev => { const m = new Map(prev); m.set(doc.format, next); return m })
                            } catch {
                              // Allow editing even if not valid JSON yet
                            }
                          }}
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 font-mono text-xs resize-y"
                        />
                      ) : (
                        <input
                          type="text"
                          value={strVal}
                          onChange={e => {
                            const next = { ...currentStyles, [key]: e.target.value }
                            setEditedStyles(prev => { const m = new Map(prev); m.set(doc.format, next); return m })
                          }}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </details>
          )
        })}
        <div className="pt-4 border-t border-border flex items-center gap-3">
          <button
            onClick={saveDocStyles}
            disabled={saving || !hasChanges('doc_styles')}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {hasChanges('doc_styles') && (
            <button
              onClick={() => setEditedStyles(new Map())}
              className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              Discard
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderServiceDetails = () => {
    return (
      <div className="space-y-4">
        {serviceDetails.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No service details found.</p>
        ) : (
          <div className="space-y-3">
            {serviceDetails.map(row => {
              const value = editedService.has(row.id) ? editedService.get(row.id)! : row.detail_value
              const isEdited = editedService.has(row.id)
              return (
                <div key={row.id} className={`flex items-start gap-3 p-3 border rounded-lg ${isEdited ? 'border-purple-400 bg-purple-50' : 'border-border'}`}>
                  <div className="flex-shrink-0 w-48">
                    <span className="text-sm font-medium text-foreground">{row.detail_key}</span>
                  </div>
                  <input
                    type="text"
                    value={value}
                    onChange={e => {
                      setEditedService(prev => {
                        const m = new Map(prev)
                        m.set(row.id, e.target.value)
                        return m
                      })
                    }}
                    className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                  <button
                    onClick={() => removeServiceDetail(row.id)}
                    className="px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Add new row */}
        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
          <h3 className="text-sm font-medium text-foreground">Add New Detail</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newServiceKey}
              onChange={e => setNewServiceKey(e.target.value)}
              placeholder="Key"
              className="w-48 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <input
              type="text"
              value={newServiceValue}
              onChange={e => setNewServiceValue(e.target.value)}
              placeholder="Value"
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <button
              onClick={addServiceDetail}
              disabled={saving || !newServiceKey.trim()}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Save existing edits */}
        {hasChanges('service') && (
          <div className="pt-4 border-t border-border flex items-center gap-3">
            <button
              onClick={saveServiceDetails}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => setEditedService(new Map())}
              className="px-4 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              Discard
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'doc_styles': return renderDocStyles()
      case 'tool_perms': return renderToolPermissions()
      case 'service': return renderServiceDetails()
      default: return renderConfigSection(activeTab)
    }
  }

  // ---- Access guard ----

  if (profile.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">Only admins can manage AI configuration.</p>
      </div>
    )
  }

  // ---- Main render ----

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Manage all AI settings, tool permissions, document styles, and service details
        </p>
      </div>

      {/* Flash message */}
      {flash && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${flash.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {flash.text}
        </div>
      )}

      {/* Tab bar */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="overflow-x-auto">
          <div className="flex border-b border-border min-w-max">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-sm text-muted-foreground mt-2">Loading configuration...</p>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>
    </div>
  )
}
