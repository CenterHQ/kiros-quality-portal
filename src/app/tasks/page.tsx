'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabase/client'
import { type Task, type Profile } from '@/lib/types'

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#999' },
  { id: 'in_progress', label: 'In Progress', color: '#5bc0de' },
  { id: 'review', label: 'Review', color: '#f0ad4e' },
  { id: 'done', label: 'Done', color: '#5cb85c' },
]

const PRIORITIES = { low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴' }
const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }

export default function TaskBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '' })
  const [user, setUser] = useState<Profile | null>(null)
  const [view, setView] = useState<'board' | 'list'>('board')
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const supabase = createClient()

  const loadTasks = async () => {
    const { data: t } = await supabase.from('tasks').select('*').order('sort_order')
    if (t) setTasks(t as any)
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user: au } } = await supabase.auth.getUser()
      if (au) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', au.id).single()
        if (p) setUser(p)
      }
      await loadTasks()
      const { data: pr } = await supabase.from('profiles').select('*')
      if (pr) setProfiles(pr)
    }
    load()

    const channel = supabase.channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadTasks)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const taskId = result.draggableId
    const newStatus = result.destination.droppableId

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t))

    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null
    }).eq('id', taskId)

    if (user) {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: `Moved task to ${newStatus.replace(/_/g, ' ')}`,
        entity_type: 'task',
        entity_id: taskId,
      })
    }
  }

  const updateTask = async (taskId: string, field: string, value: any) => {
    await supabase.from('tasks').update({ [field]: value }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t))
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const createTask = async () => {
    if (!newTask.title.trim() || !user) return
    await supabase.from('tasks').insert({
      title: newTask.title,
      description: newTask.description || null,
      priority: newTask.priority,
      assigned_to: newTask.assigned_to || null,
      due_date: newTask.due_date || null,
      created_by: user.id,
      status: 'todo',
    })
    setNewTask({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '' })
    setShowAdd(false)
    await loadTasks()
  }

  const getProfileName = (id: string | null | undefined) => {
    if (!id) return null
    return profiles.find(p => p.id === id)?.full_name || null
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Task Board</h1>
          <p className="text-gray-500 text-sm mt-1">{tasks.length} tasks — {tasks.filter(t => t.status === 'done').length} completed</p>
        </div>
        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView('board')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === 'board' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              Board
            </button>
            <button onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              List
            </button>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-[#470DA8] text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
            + Add Task
          </button>
        </div>
      </div>

      {/* Add Task Form */}
      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Task title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] outline-none" />
            <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] outline-none">
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <select value={newTask.assigned_to} onChange={e => setNewTask({...newTask, assigned_to: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] outline-none">
              <option value="">Unassigned</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            <input type="date" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] outline-none" />
            <textarea placeholder="Description (optional)" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] outline-none md:col-span-2" rows={2} />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createTask} className="px-4 py-2 bg-[#470DA8] text-white rounded-lg text-sm font-medium hover:opacity-90">Create Task</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      {/* ===== BOARD VIEW ===== */}
      {view === 'board' && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4" style={{ minWidth: '1200px' }}>
              {COLUMNS.map(col => {
                const colTasks = tasks.filter(t => t.status === col.id)
                return (
                  <div key={col.id} className="flex-1 min-w-[280px] bg-gray-100 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-3 px-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                      <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                      <span className="text-xs text-gray-400 ml-auto">{colTasks.length}</span>
                    </div>
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}
                          className={`space-y-2 min-h-[200px] rounded-lg p-1 transition ${snapshot.isDraggingOver ? 'bg-purple-50' : ''}`}>
                          {colTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                  className={`bg-white rounded-lg shadow-sm border border-gray-200 cursor-grab ${snapshot.isDragging ? 'shadow-lg ring-2 ring-[#470DA8]' : ''}`}>
                                  {/* Card Header — always visible */}
                                  <div className="p-3" onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}>
                                    <div className="flex items-start gap-2">
                                      <span className="mt-0.5">{PRIORITIES[task.priority as keyof typeof PRIORITIES]}</span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                                        {task.description && expandedTask !== task.id && (
                                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{PRIORITY_LABELS[task.priority] || task.priority}</span>
                                          {task.due_date && (
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${task.due_date < today && task.status !== 'done' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                              {new Date(task.due_date).toLocaleDateString()}
                                            </span>
                                          )}
                                          {getProfileName(task.assigned_to) && (
                                            <span className="text-xs text-gray-400">{getProfileName(task.assigned_to)}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expanded Detail */}
                                  {expandedTask === task.id && (
                                    <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3" onClick={e => e.stopPropagation()}>
                                      {task.description && (
                                        <div>
                                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</p>
                                          <p className="text-sm text-gray-700 whitespace-pre-line">{task.description}</p>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-0.5">Status</label>
                                          <select value={task.status} onChange={e => updateTask(task.id, 'status', e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-[#470DA8] outline-none">
                                            {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-0.5">Priority</label>
                                          <select value={task.priority} onChange={e => updateTask(task.id, 'priority', e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-[#470DA8] outline-none">
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-0.5">Assigned To</label>
                                          <select value={task.assigned_to || ''} onChange={e => updateTask(task.id, 'assigned_to', e.target.value || null)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-[#470DA8] outline-none">
                                            <option value="">Unassigned</option>
                                            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-0.5">Due Date</label>
                                          <input type="date" value={task.due_date || ''} onChange={e => updateTask(task.id, 'due_date', e.target.value || null)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-[#470DA8] outline-none" />
                                        </div>
                                      </div>
                                      <button onClick={() => deleteTask(task.id)} className="text-xs text-red-500 hover:text-red-700">Delete task</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}
            </div>
          </div>
        </DragDropContext>
      )}

      {/* ===== LIST VIEW ===== */}
      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-8"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Task</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-28">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-24">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-36">Assigned To</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-28">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3">
                    <span>{PRIORITIES[task.priority as keyof typeof PRIORITIES]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)} className="text-left w-full">
                      <p className={`text-sm font-medium ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</p>
                      {expandedTask === task.id && task.description ? (
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{task.description}</p>
                      ) : task.description ? (
                        <p className="text-xs text-gray-400 mt-0.5">{task.description.substring(0, 80)}{task.description.length > 80 ? '...' : ''}</p>
                      ) : null}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <select value={task.status} onChange={e => updateTask(task.id, 'status', e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-[#470DA8] outline-none bg-white">
                      {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select value={task.priority} onChange={e => updateTask(task.id, 'priority', e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-[#470DA8] outline-none bg-white">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select value={task.assigned_to || ''} onChange={e => updateTask(task.id, 'assigned_to', e.target.value || null)}
                      className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-[#470DA8] outline-none bg-white w-full">
                      <option value="">Unassigned</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {task.due_date && task.due_date < today && task.status !== 'done' && (
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Overdue" />
                      )}
                      <input type="date" value={task.due_date || ''} onChange={e => updateTask(task.id, 'due_date', e.target.value || null)}
                        className="px-1 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-[#470DA8] outline-none bg-white w-full" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
