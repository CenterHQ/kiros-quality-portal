'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabase/client'
import { STATUS_COLORS, type Task, type Profile } from '@/lib/types'

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#999' },
  { id: 'in_progress', label: 'In Progress', color: '#5bc0de' },
  { id: 'review', label: 'Review', color: '#f0ad4e' },
  { id: 'done', label: 'Done', color: '#5cb85c' },
]

const PRIORITIES = { low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴' }

export default function TaskBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '' })
  const [user, setUser] = useState<Profile | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user: au } } = await supabase.auth.getUser()
      if (au) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', au.id).single()
        if (p) setUser(p)
      }
      const { data: t } = await supabase.from('tasks').select('*, profiles(full_name)').order('sort_order')
      if (t) setTasks(t as any)
      const { data: pr } = await supabase.from('profiles').select('*')
      if (pr) setProfiles(pr)
    }
    load()

    // Realtime
    const channel = supabase.channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
        const { data } = await supabase.from('tasks').select('*, profiles(full_name)').order('sort_order')
        if (data) setTasks(data as any)
      })
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
        action: `Moved task to ${newStatus}`,
        entity_type: 'task',
        entity_id: taskId,
      })
    }
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

    // Refresh
    const { data } = await supabase.from('tasks').select('*, profiles(full_name)').order('sort_order')
    if (data) setTasks(data as any)
  }

  return (
    <div className="max-w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Task Board</h1>
          <p className="text-gray-500 text-sm mt-1">Drag tasks between columns to update status</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-[#6b2fa0] text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
          + Add Task
        </button>
      </div>

      {/* Add Task Form */}
      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Task title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none" />
            <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none">
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <select value={newTask.assigned_to} onChange={e => setNewTask({...newTask, assigned_to: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none">
              <option value="">Unassigned</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            <input type="date" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none" />
            <textarea placeholder="Description (optional)" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none md:col-span-2" rows={2} />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createTask} className="px-4 py-2 bg-[#6b2fa0] text-white rounded-lg text-sm font-medium hover:opacity-90">Create Task</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id)
            return (
              <div key={col.id} className="bg-gray-100 rounded-xl p-3 min-h-[300px]">
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
                              className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-grab ${snapshot.isDragging ? 'shadow-lg ring-2 ring-[#6b2fa0]' : ''}`}>
                              <div className="flex items-start gap-2">
                                <span>{PRIORITIES[task.priority as keyof typeof PRIORITIES]}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                                  {task.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>}
                                  <div className="flex items-center gap-2 mt-2">
                                    {task.profiles && <span className="text-xs text-gray-400">{(task.profiles as any).full_name}</span>}
                                    {task.due_date && <span className="text-xs text-gray-400">{new Date(task.due_date).toLocaleDateString()}</span>}
                                  </div>
                                </div>
                              </div>
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
      </DragDropContext>
    </div>
  )
}
