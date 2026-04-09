'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QA_COLORS } from '@/lib/types'
import CentreContextPanel from '@/components/CentreContextPanel'

export default function ReportsPage() {
  const [elements, setElements] = useState<any[]>([])
  const [actions, setActions] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [compliance, setCompliance] = useState<any[]>([])
  const [training, setTraining] = useState<any[]>([])
  const [forms, setForms] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exportType, setExportType] = useState('elements')
  const [exportStatus, setExportStatus] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [el, act, t, c, tr, f, al, p, m] = await Promise.all([
        supabase.from('qa_elements').select('*').order('element_code'),
        supabase.from('element_actions').select('*, profiles(full_name)').order('element_id').order('sort_order'),
        supabase.from('tasks').select('*, profiles(full_name)').order('created_at'),
        supabase.from('compliance_items').select('*').order('id'),
        supabase.from('training_assignments').select('*, training_modules(title), profiles(full_name)'),
        supabase.from('form_submissions').select('*, profiles(full_name)').order('created_at', { ascending: false }),
        supabase.from('activity_log').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(500),
        supabase.from('profiles').select('*'),
        supabase.from('training_modules').select('*').order('sort_order'),
      ])
      if (el.data) setElements(el.data)
      if (act.data) setActions(act.data)
      if (t.data) setTasks(t.data)
      if (c.data) setCompliance(c.data)
      if (tr.data) setTraining(tr.data)
      if (f.data) setForms(f.data)
      if (al.data) setActivity(al.data)
      if (p.data) setProfiles(p.data)
      if (m.data) setModules(m.data)
      setLoading(false)
    }
    load()
  }, [])

  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) { setExportStatus('No data to export'); return }
    const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object')
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h]
        if (val === null || val === undefined) return ''
        const str = String(val).replace(/"/g, '""')
        return str.includes(',') || str.includes('\n') ? `"${str}"` : str
      }).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportStatus(`Exported ${data.length} rows to ${a.download}`)
  }

  const handleExport = async () => {
    const map: Record<string, { data: any[]; name: string }> = {
      elements: { data: elements, name: 'qa_elements' },
      actions: { data: actions, name: 'element_actions' },
      tasks: { data: tasks, name: 'tasks' },
      compliance: { data: compliance, name: 'compliance_items' },
      training: { data: training, name: 'training_assignments' },
      forms: { data: forms, name: 'form_submissions' },
      activity: { data: activity, name: 'activity_log' },
    }
    if (exportType === 'qip_goals' || exportType === 'centre_context') {
      const contextType = exportType === 'qip_goals' ? 'qip_goal' : undefined
      const { data: contextData } = await supabase
        .from('centre_context')
        .select('*')
        .then(res => {
          if (contextType && res.data) {
            return { ...res, data: res.data.filter((r: any) => r.context_type === contextType) }
          }
          return res
        })
      if (contextData) {
        downloadCSV(contextData, exportType)
      } else {
        setExportStatus('No data to export')
      }
      return
    }
    const sel = map[exportType]
    if (sel) downloadCSV(sel.data, sel.name)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#470DA8]" /></div>

  // Calculate stats
  const notMetCount = elements.filter(e => e.current_rating === 'not_met').length
  const metCount = elements.filter(e => e.current_rating === 'met').length
  const meetingCount = elements.filter(e => e.current_rating === 'meeting').length
  const exceedingCount = elements.filter(e => e.current_rating === 'exceeding').length
  const totalActions = actions.length
  const completedActions = actions.filter(a => a.status === 'completed').length
  const actionPct = totalActions ? Math.round((completedActions / totalActions) * 100) : 0
  const complianceOpen = compliance.filter(c => c.status === 'action_required').length

  // Per-QA progress
  const qaProgress = [1,2,3,4,5,6,7].map(qa => {
    const qaActions = actions.filter(a => {
      const el = elements.find(e => e.id === a.element_id)
      return el && el.qa_number === qa
    })
    const done = qaActions.filter(a => a.status === 'completed').length
    const total = qaActions.length
    return { qa, done, total, pct: total ? Math.round((done/total)*100) : 0, name: elements.find(e => e.qa_number === qa)?.qa_name || '' }
  })

  // Overdue items
  const today = new Date().toISOString().split('T')[0]
  const overdueActions = actions.filter(a => a.due_date && a.due_date < today && a.status !== 'completed')
  const upcomingActions = actions.filter(a => a.due_date && a.due_date >= today && a.due_date <= new Date(Date.now() + 14*86400000).toISOString().split('T')[0] && a.status !== 'completed')

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Track progress, export data, and monitor uplift status</p>
        </div>
        <button onClick={() => window.print()} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Print Report</button>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-red-500">{notMetCount}</p>
          <p className="text-xs text-gray-500 mt-1">Not Met</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-green-500">{metCount}</p>
          <p className="text-xs text-gray-500 mt-1">Met</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{meetingCount}</p>
          <p className="text-xs text-gray-500 mt-1">Meeting</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{exceedingCount}</p>
          <p className="text-xs text-gray-500 mt-1">Exceeding</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-[#470DA8]">{actionPct}%</p>
          <p className="text-xs text-gray-500 mt-1">Actions Done</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-red-500">{complianceOpen}</p>
          <p className="text-xs text-gray-500 mt-1">Compliance Open</p>
        </div>
      </div>

      {/* Per-QA Progress */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="px-6 py-4 border-b"><h2 className="font-semibold">Progress by Quality Area</h2></div>
        <div className="p-6 space-y-4">
          {qaProgress.map(qp => (
            <div key={qp.qa} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ backgroundColor: QA_COLORS[qp.qa] }}>QA{qp.qa}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 truncate">{qp.name}</span>
                  <span className="text-xs text-gray-500">{qp.done}/{qp.total} actions ({qp.pct}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${qp.pct}%`, backgroundColor: QA_COLORS[qp.qa] }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Overdue Items */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="px-6 py-4 border-b"><h2 className="font-semibold text-red-600">Overdue Items ({overdueActions.length})</h2></div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {overdueActions.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No overdue items</p> : (
              <div className="space-y-2">
                {overdueActions.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
                    <span className="text-xs text-red-600 font-medium whitespace-nowrap">{a.due_date}</span>
                    <span className="text-sm text-gray-700 truncate flex-1">{a.title}</span>
                    {a.profiles && <span className="text-xs text-gray-400">{a.profiles.full_name}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming (Next 14 Days) */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="px-6 py-4 border-b"><h2 className="font-semibold text-amber-600">Due Next 14 Days ({upcomingActions.length})</h2></div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {upcomingActions.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No upcoming items</p> : (
              <div className="space-y-2">
                {upcomingActions.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg">
                    <span className="text-xs text-amber-600 font-medium whitespace-nowrap">{a.due_date}</span>
                    <span className="text-sm text-gray-700 truncate flex-1">{a.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Training Matrix */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="px-6 py-4 border-b"><h2 className="font-semibold">Training Completion Matrix</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2 font-semibold text-gray-500">Educator</th>
                {modules.map(m => (
                  <th key={m.id} className="text-center px-2 py-2 font-semibold text-gray-500 whitespace-nowrap">M{m.sort_order}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.filter(p => p.role !== 'admin').map(p => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-700">{p.full_name}</td>
                  {modules.map(m => {
                    const assignment = training.find(t => t.module_id === m.id && t.user_id === p.id)
                    return (
                      <td key={m.id} className="text-center px-2 py-2">
                        {!assignment ? <span className="text-gray-300">&mdash;</span> :
                         assignment.status === 'completed' ? <span className="text-green-500 font-bold">&#10003;</span> :
                         assignment.status === 'in_progress' ? <span className="text-amber-500">&#9679;</span> :
                         <span className="text-blue-500">&#9675;</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t bg-gray-50 flex gap-4 text-xs text-gray-500">
          <span><span className="text-green-500 font-bold">&#10003;</span> Completed</span>
          <span><span className="text-amber-500">&#9679;</span> In Progress</span>
          <span><span className="text-blue-500">&#9675;</span> Assigned</span>
          <span><span className="text-gray-300">&mdash;</span> Not Assigned</span>
        </div>
      </div>

      {/* CSV Export */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="px-6 py-4 border-b"><h2 className="font-semibold">Export Data</h2></div>
        <div className="p-6">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data to Export</label>
              <select value={exportType} onChange={e => setExportType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] outline-none">
                <option value="elements">QA Elements ({elements.length} rows)</option>
                <option value="actions">Element Actions ({actions.length} rows)</option>
                <option value="tasks">Tasks ({tasks.length} rows)</option>
                <option value="compliance">Compliance Items ({compliance.length} rows)</option>
                <option value="training">Training Assignments ({training.length} rows)</option>
                <option value="forms">Form Submissions ({forms.length} rows)</option>
                <option value="activity">Activity Log ({activity.length} rows)</option>
                <option value="qip_goals">QIP Goals Progress</option>
                <option value="centre_context">Centre Context</option>
              </select>
            </div>
            <button onClick={handleExport}
              className="px-6 py-2 bg-[#470DA8] text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
              Download CSV
            </button>
          </div>
          {exportStatus && <p className="text-sm text-green-600 mt-3">{exportStatus}</p>}
        </div>
      </div>
    </div>
  )
}
