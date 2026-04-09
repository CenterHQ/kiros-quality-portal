'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChecklistTemplate, ChecklistInstance, ChecklistCategory, SmartTicket, Profile, ChecklistItemDefinition } from '@/lib/types'
import { CHECKLIST_FREQUENCY_LABELS, QA_COLORS } from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'

type Tab = 'today' | 'upcoming' | 'history' | 'tickets'

export default function ChecklistsPage() {
  const supabase = createClient()
  const user = useProfile()
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [instances, setInstances] = useState<ChecklistInstance[]>([])
  const [categories, setCategories] = useState<ChecklistCategory[]>([])
  const [tickets, setTickets] = useState<SmartTicket[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [tab, setTab] = useState<Tab>('today')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0])
  const [categoryFilter, setCategoryFilter] = useState('')

  const load = async () => {
    const [{ data: tmpl }, { data: inst }, { data: cats }, { data: tix }, { data: profs }] = await Promise.all([
      supabase.from('checklist_templates').select('*, checklist_categories(*)').eq('status', 'active').order('name'),
      supabase.from('checklist_instances').select('*, checklist_templates(*, checklist_categories(*)), profiles!checklist_instances_assigned_to_fkey(full_name)').order('due_date', { ascending: false }),
      supabase.from('checklist_categories').select('*').order('sort_order'),
      supabase.from('smart_tickets').select('*, profiles!smart_tickets_assigned_to_fkey(full_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ])
    if (tmpl) setTemplates(tmpl as any)
    if (inst) setInstances(inst as any)
    if (cats) setCategories(cats)
    if (tix) setTickets(tix as any)
    if (profs) setProfiles(profs)
  }

  useEffect(() => {
    load()
    const channel = supabase.channel('checklists-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_instances' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'smart_tickets' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const todayInstances = instances.filter(i => i.due_date === today && i.status !== 'skipped')
  const upcomingInstances = instances.filter(i => i.due_date > today && i.status === 'pending')
  const historyInstances = instances.filter(i => i.status === 'completed' || i.status === 'skipped' || i.due_date < today)
  const overdueInstances = instances.filter(i => i.due_date < today && i.status !== 'completed' && i.status !== 'skipped')
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress')

  const completedToday = todayInstances.filter(i => i.status === 'completed').length
  const totalToday = todayInstances.length
  const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0

  const createInstance = async () => {
    if (!selectedTemplate) return
    const tmpl = templates.find(t => t.id === selectedTemplate)
    if (!tmpl) return
    const applicableItems = (tmpl.items || []).filter((i: ChecklistItemDefinition) => i.type !== 'heading')
    await supabase.from('checklist_instances').insert({
      template_id: selectedTemplate,
      name: tmpl.name,
      due_date: dueDate,
      assigned_to: assignTo || null,
      items_snapshot: tmpl.items,
      total_items: applicableItems.length,
      status: 'pending',
    })
    if (user) {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: 'created_checklist_instance',
        entity_type: 'checklist_instance',
        details: `Created checklist: ${tmpl.name} due ${dueDate}`,
      })
    }
    setShowCreate(false)
    setSelectedTemplate('')
    setAssignTo('')
    await load()
  }

  const skipInstance = async (id: string) => {
    await supabase.from('checklist_instances').update({ status: 'skipped' }).eq('id', id)
    await load()
  }

  const updateTicketStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { status }
    if (status === 'resolved') {
      updates.resolved_by = user?.id
      updates.resolved_at = new Date().toISOString()
    }
    await supabase.from('smart_tickets').update(updates).eq('id', id)
    await load()
  }

  const isPrivileged = user && ['admin', 'manager', 'ns'].includes(user.role)

  const filteredInstances = (list: ChecklistInstance[]) => {
    if (!categoryFilter) return list
    return list.filter(i => {
      const tmpl = i.checklist_templates as ChecklistTemplate | undefined
      const cat = tmpl?.checklist_categories as ChecklistCategory | undefined
      return cat?.id === Number(categoryFilter)
    })
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Operational Checklists</h1>
          <p className="text-gray-500 text-sm mt-1">Daily, weekly, and compliance checklists</p>
        </div>
        <div className="flex gap-2">
          <a href="/checklists/templates" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
            Manage Templates
          </a>
          {isPrivileged && (
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#470DA8] text-white rounded-lg text-sm font-medium hover:opacity-90">
              + Assign Checklist
            </button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Today&apos;s Progress</p>
          <p className="text-2xl font-bold text-[#470DA8]">{completedToday}/{totalToday}</p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#470DA8] rounded-full transition-all" style={{ width: `${completionRate}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{completionRate}% complete</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Overdue</p>
          <p className={`text-2xl font-bold ${overdueInstances.length > 0 ? 'text-red-500' : 'text-green-500'}`}>{overdueInstances.length}</p>
          <p className="text-xs text-gray-400 mt-1">checklists past due</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Upcoming</p>
          <p className="text-2xl font-bold text-blue-500">{upcomingInstances.length}</p>
          <p className="text-xs text-gray-400 mt-1">scheduled checklists</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Open Tickets</p>
          <p className={`text-2xl font-bold ${openTickets.length > 0 ? 'text-orange-500' : 'text-green-500'}`}>{openTickets.length}</p>
          <p className="text-xs text-gray-400 mt-1">from failed items</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Templates</p>
          <p className="text-2xl font-bold text-gray-700">{templates.length}</p>
          <p className="text-xs text-gray-400 mt-1">active templates</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setCategoryFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${!categoryFilter ? 'bg-[#470DA8] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>All</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setCategoryFilter(String(c.id))} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${categoryFilter === String(c.id) ? 'text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`} style={categoryFilter === String(c.id) ? { backgroundColor: c.color } : {}}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { id: 'today', label: `Today (${todayInstances.length})` },
          { id: 'upcoming', label: `Upcoming (${upcomingInstances.length})` },
          { id: 'history', label: 'History' },
          { id: 'tickets', label: `Tickets (${openTickets.length})` },
        ] as { id: Tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white shadow-sm text-[#470DA8]' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'today' && (
        <div className="space-y-3">
          {overdueInstances.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-red-700 text-sm mb-2">Overdue Checklists ({overdueInstances.length})</h3>
              {filteredInstances(overdueInstances).map(i => (
                <InstanceRow key={i.id} instance={i} onSkip={skipInstance} isPrivileged={!!isPrivileged} />
              ))}
            </div>
          )}
          {filteredInstances(todayInstances).length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-sm">No checklists due today. {isPrivileged && 'Assign checklists from templates to get started.'}</p>
            </div>
          ) : (
            filteredInstances(todayInstances).map(i => (
              <InstanceRow key={i.id} instance={i} onSkip={skipInstance} isPrivileged={!!isPrivileged} />
            ))
          )}
        </div>
      )}

      {tab === 'upcoming' && (
        <div className="space-y-3">
          {filteredInstances(upcomingInstances).length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-sm">No upcoming checklists scheduled.</p>
            </div>
          ) : (
            filteredInstances(upcomingInstances).map(i => (
              <InstanceRow key={i.id} instance={i} onSkip={skipInstance} isPrivileged={!!isPrivileged} />
            ))
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {filteredInstances(historyInstances).slice(0, 50).map(i => (
            <InstanceRow key={i.id} instance={i} onSkip={skipInstance} isPrivileged={!!isPrivileged} />
          ))}
          {historyInstances.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📜</p>
              <p className="text-sm">No completed checklists yet.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'tickets' && (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">🎫</p>
              <p className="text-sm">No smart tickets. Tickets are auto-generated when checklist items fail.</p>
            </div>
          ) : (
            tickets.map(t => (
              <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        t.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        t.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>{t.priority}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.status === 'open' ? 'bg-red-50 text-red-600' :
                        t.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                        t.status === 'resolved' ? 'bg-green-50 text-green-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>{t.status.replace('_', ' ')}</span>
                    </div>
                    <h4 className="font-medium text-sm text-gray-900">{t.title}</h4>
                    {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
                    <p className="text-xs text-gray-400 mt-2">Created {new Date(t.created_at).toLocaleDateString()}</p>
                  </div>
                  {isPrivileged && t.status !== 'resolved' && t.status !== 'closed' && (
                    <div className="flex gap-1">
                      {t.status === 'open' && (
                        <button onClick={() => updateTicketStatus(t.id, 'in_progress')} className="px-3 py-1 border border-blue-300 text-blue-600 rounded-lg text-xs hover:bg-blue-50">Start</button>
                      )}
                      <button onClick={() => updateTicketStatus(t.id, 'resolved')} className="px-3 py-1 border border-green-300 text-green-600 rounded-lg text-xs hover:bg-green-50">Resolve</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create instance modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-lg mb-4">Assign Checklist</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template *</label>
                <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] focus:border-transparent">
                  <option value="">Select template...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({CHECKLIST_FREQUENCY_LABELS[t.frequency]})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
                <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] focus:border-transparent">
                  <option value="">Anyone can complete</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] focus:border-transparent" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={createInstance} disabled={!selectedTemplate} className="px-4 py-2 bg-[#470DA8] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InstanceRow({ instance: i, onSkip, isPrivileged }: { instance: ChecklistInstance; onSkip: (id: string) => void; isPrivileged: boolean }) {
  const tmpl = i.checklist_templates as ChecklistTemplate | undefined
  const cat = tmpl?.checklist_categories as ChecklistCategory | undefined
  const assignee = (i as any).profiles?.full_name
  const progress = i.total_items > 0 ? Math.round((i.completed_items / i.total_items) * 100) : 0
  const isOverdue = i.due_date < new Date().toISOString().split('T')[0] && i.status !== 'completed' && i.status !== 'skipped'

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-4 ${isOverdue ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-lg">{cat?.icon || '📋'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm text-gray-900 truncate">{i.name}</h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                i.status === 'completed' ? 'bg-green-50 text-green-600' :
                i.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                i.status === 'skipped' ? 'bg-gray-100 text-gray-500' :
                isOverdue ? 'bg-red-50 text-red-600' :
                'bg-yellow-50 text-yellow-600'
              }`}>
                {isOverdue && i.status === 'pending' ? 'overdue' : i.status.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
              <span>Due: {new Date(i.due_date).toLocaleDateString()}</span>
              {assignee && <span>Assigned: {assignee}</span>}
              {i.status === 'completed' && <span>Completed: {new Date(i.completed_at!).toLocaleDateString()}</span>}
              {i.failed_items > 0 && <span className="text-red-500">{i.failed_items} failed</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {i.status !== 'completed' && i.status !== 'skipped' && (
            <>
              <div className="w-24">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#470DA8] rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 text-right">{progress}%</p>
              </div>
              <a href={`/checklists/${i.id}`} className="px-3 py-1.5 bg-[#470DA8] text-white rounded-lg text-xs font-medium hover:opacity-90">
                {i.status === 'in_progress' ? 'Continue' : 'Start'}
              </a>
              {isPrivileged && (
                <button onClick={() => onSkip(i.id)} className="px-3 py-1.5 border border-gray-300 text-gray-500 rounded-lg text-xs hover:bg-gray-50">Skip</button>
              )}
            </>
          )}
          {i.status === 'completed' && (
            <a href={`/checklists/${i.id}`} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50">View</a>
          )}
        </div>
      </div>
    </div>
  )
}
