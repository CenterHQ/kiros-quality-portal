'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RegisterDefinition, RegisterEntry, RegisterColumnDef, Profile } from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'
import { useToast } from '@/components/ui/toast'
import Breadcrumbs from '@/components/Breadcrumbs'

export default function RegisterDetailPage() {
  const { id } = useParams()
  const supabase = createClient()
  const user = useProfile()
  const { toast } = useToast()
  const [register, setRegister] = useState<RegisterDefinition | null>(null)
  const [entries, setEntries] = useState<RegisterEntry[]>([])
  const [showAddRow, setShowAddRow] = useState(false)
  const [newRow, setNewRow] = useState<Record<string, unknown>>({})
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown>>({})
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  const load = async () => {
    const { data: reg } = await supabase.from('register_definitions').select('*').eq('id', id).single()
    if (reg) setRegister(reg as any)
    const { data: ent } = await supabase.from('register_entries').select('*').eq('register_id', id).order('sort_order')
    if (ent) setEntries(ent as any)
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    const channel = supabase.channel(`register-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'register_entries', filter: `register_id=eq.${id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  // Sorting & filtering — must be before early return to satisfy hook rules
  const processedEntries = useMemo(() => {
    let result = [...entries]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(e =>
        Object.values(e.row_data).some(v => String(v || '').toLowerCase().includes(term))
      )
    }

    if (sortCol) {
      result.sort((a, b) => {
        const va = String(a.row_data[sortCol] || '')
        const vb = String(b.row_data[sortCol] || '')
        const cmp = va.localeCompare(vb, undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [entries, searchTerm, sortCol, sortDir])

  if (!register) return <div className="max-w-6xl mx-auto py-12 text-center text-muted-foreground">Loading...</div>

  const columns = register.columns.sort((a, b) => a.sort_order - b.sort_order)
  const isPrivileged = user && ['admin', 'manager', 'ns'].includes(user.role)

  const pagedEntries = processedEntries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(processedEntries.length / PAGE_SIZE)

  const toggleSort = (colId: string) => {
    if (sortCol === colId) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(colId)
      setSortDir('asc')
    }
  }

  const initNewRow = () => {
    const defaults: Record<string, unknown> = {}
    for (const col of columns) {
      defaults[col.id] = col.default_value || (col.type === 'checkbox' ? false : '')
    }
    setNewRow(defaults)
    setShowAddRow(true)
  }

  const addRow = async () => {
    // Validate required fields
    for (const col of columns) {
      if (col.required && !newRow[col.id] && newRow[col.id] !== false) {
        toast({ type: 'warning', message: `"${col.name}" is required` })
        return
      }
    }
    const { error } = await supabase.from('register_entries').insert({
      register_id: register.id,
      row_data: newRow,
      sort_order: entries.length,
      created_by: user?.id,
    })
    if (error) { toast({ type: 'error', message: 'Failed to add entry' }); return }
    setShowAddRow(false)
    setNewRow({})
    await load()
  }

  const startEdit = (entry: RegisterEntry) => {
    setEditingRow(entry.id)
    setEditData({ ...entry.row_data })
  }

  const saveEdit = async (entryId: string) => {
    const { error } = await supabase.from('register_entries').update({
      row_data: editData,
      updated_by: user?.id,
    }).eq('id', entryId)
    if (error) { toast({ type: 'error', message: 'Failed to save changes' }); return }
    setEditingRow(null)
    setEditData({})
    await load()
  }

  const deleteRow = async (entryId: string) => {
    if (!confirm('Delete this entry?')) return
    const { error } = await supabase.from('register_entries').delete().eq('id', entryId)
    if (error) { toast({ type: 'error', message: 'Failed to delete entry' }); return }
    await load()
  }

  const exportCSV = () => {
    const headers = columns.map(c => c.name)
    const rows = processedEntries.map(e => columns.map(c => {
      const val = e.row_data[c.id]
      if (c.type === 'checkbox') return val ? 'Yes' : 'No'
      return String(val || '')
    }))
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${register.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderCellInput = (col: RegisterColumnDef, value: unknown, onChange: (val: unknown) => void, compact = false) => {
    const cls = compact
      ? 'w-full px-2 py-1 border border-border rounded text-xs focus:ring-1 focus:ring-primary focus:border-transparent'
      : 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent'

    switch (col.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return <input type={col.type === 'email' ? 'email' : col.type === 'phone' ? 'tel' : col.type === 'url' ? 'url' : 'text'} value={String(value || '')} onChange={e => onChange(e.target.value)} className={cls} />
      case 'number':
      case 'currency':
        return <input type="number" step={col.type === 'currency' ? '0.01' : '1'} value={value !== undefined && value !== null && value !== '' ? String(value) : ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : '')} className={cls} />
      case 'date':
        return <input type="date" value={String(value || '')} onChange={e => onChange(e.target.value)} className={cls} />
      case 'dropdown':
        return (
          <select value={String(value || '')} onChange={e => onChange(e.target.value)} className={cls}>
            <option value="">Select...</option>
            {(col.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        )
      case 'checkbox':
        return <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="rounded border-border text-primary focus:ring-primary" />
      case 'textarea':
        return <textarea value={String(value || '')} onChange={e => onChange(e.target.value)} rows={compact ? 1 : 2} className={cls} />
      default:
        return <input type="text" value={String(value || '')} onChange={e => onChange(e.target.value)} className={cls} />
    }
  }

  const renderCellValue = (col: RegisterColumnDef, value: unknown) => {
    if (value === undefined || value === null || value === '') return <span className="text-muted-foreground">-</span>
    switch (col.type) {
      case 'checkbox': return <span className={value ? 'text-green-500' : 'text-muted-foreground'}>{value ? '&#10003;' : '&#10007;'}</span>
      case 'date': return <span>{new Date(String(value)).toLocaleDateString()}</span>
      case 'currency': return <span>${Number(value).toFixed(2)}</span>
      case 'url': return <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block max-w-[200px]">{String(value)}</a>
      case 'email': return <a href={`mailto:${value}`} className="text-primary hover:underline">{String(value)}</a>
      default: return <span className="truncate block max-w-[200px]">{String(value)}</span>
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <Breadcrumbs items={[
        { label: 'Registers', href: '/registers' },
        { label: register.name },
      ]} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/registers" className="text-sm text-muted-foreground hover:text-foreground mb-1 inline-block">&larr; Back to Registers</Link>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{register.icon}</span>
            <div>
              <h1 className="text-2xl font-bold">{register.name}</h1>
              {register.description && <p className="text-muted-foreground text-sm">{register.description}</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent">Export CSV</button>
          <button onClick={initNewRow} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">+ Add Entry</button>
        </div>
      </div>

      {/* Search and stats */}
      <div className="flex items-center justify-between mb-4">
        <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0) }} placeholder="Search entries..." className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent w-full md:w-64" />
        <span className="text-xs text-muted-foreground">{processedEntries.length} entries</span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs w-10">#</th>
                {columns.map(col => (
                  <th key={col.id} className="text-left py-3 px-3 font-medium text-muted-foreground text-xs cursor-pointer hover:text-primary select-none" onClick={() => toggleSort(col.id)}>
                    <div className="flex items-center gap-1">
                      {col.name}
                      {col.required && <span className="text-red-400">*</span>}
                      {sortCol === col.id && <span className="text-primary">{sortDir === 'asc' ? '&#9650;' : '&#9660;'}</span>}
                    </div>
                  </th>
                ))}
                <th className="text-right py-3 px-3 font-medium text-muted-foreground text-xs w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Add row form */}
              {showAddRow && (
                <tr className="bg-purple-50/50">
                  <td className="py-2 px-3 text-xs text-muted-foreground">New</td>
                  {columns.map(col => (
                    <td key={col.id} className="py-2 px-3">
                      {renderCellInput(col, newRow[col.id], (val) => setNewRow({ ...newRow, [col.id]: val }), true)}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={addRow} className="px-2 py-1 bg-primary text-white rounded text-xs hover:opacity-90">Save</button>
                      <button onClick={() => setShowAddRow(false)} className="px-2 py-1 border border-border text-muted-foreground rounded text-xs hover:bg-accent">Cancel</button>
                    </div>
                  </td>
                </tr>
              )}

              {pagedEntries.length === 0 && !showAddRow && (
                <tr>
                  <td colSpan={columns.length + 2} className="py-12 text-center text-muted-foreground">
                    <p className="text-4xl mb-3">📊</p>
                    <p className="text-sm">No entries yet. Click &quot;+ Add Entry&quot; to start adding data.</p>
                  </td>
                </tr>
              )}

              {pagedEntries.map((entry, idx) => (
                <tr key={entry.id} className="hover:bg-accent transition">
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{page * PAGE_SIZE + idx + 1}</td>
                  {columns.map(col => (
                    <td key={col.id} className="py-2.5 px-3 text-sm">
                      {editingRow === entry.id ? (
                        renderCellInput(col, editData[col.id], (val) => setEditData({ ...editData, [col.id]: val }), true)
                      ) : (
                        renderCellValue(col, entry.row_data[col.id])
                      )}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right">
                    {editingRow === entry.id ? (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => saveEdit(entry.id)} className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:opacity-90">Save</button>
                        <button onClick={() => setEditingRow(null)} className="px-2 py-1 border border-border text-muted-foreground rounded text-xs hover:bg-accent">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end md:opacity-0 md:group-hover:opacity-100">
                        <button onClick={() => startEdit(entry)} className="px-3 py-2 border border-border text-muted-foreground rounded text-xs hover:bg-accent min-h-[44px]">Edit</button>
                        {isPrivileged && (
                          <button onClick={() => deleteRow(entry.id)} className="px-3 py-2 border border-red-200 text-red-400 rounded text-xs hover:bg-red-50 min-h-[44px]">Del</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted">
            <span className="text-xs text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, processedEntries.length)} of {processedEntries.length}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 border border-border rounded text-xs hover:bg-accent disabled:opacity-50">Prev</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`px-3 py-1 border rounded text-xs ${page === i ? 'bg-primary text-white border-primary' : 'border-border hover:bg-accent'}`}>{i + 1}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="px-3 py-1 border border-border rounded text-xs hover:bg-accent disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
