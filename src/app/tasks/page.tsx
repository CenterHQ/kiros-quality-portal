'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabase/client'
import { type Task, type Profile, type Comment } from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'
import CentreContextPanel from '@/components/CentreContextPanel'
import { PageHeader } from '@/components/ui/page-header'
import { PriorityBadge } from '@/components/ui/priority-badge'

const COLUMNS = [
  { id: 'todo', label: 'To Do', dot: 'bg-gray-400' },
  { id: 'in_progress', label: 'In Progress', dot: 'bg-blue-500' },
  { id: 'done', label: 'Done', dot: 'bg-green-500' },
]

const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }

export default function TaskBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '' })
  const user = useProfile()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [mobileCol, setMobileCol] = useState('todo')
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const supabase = createClient()

  const loadTasks = async () => {
    const { data: t } = await supabase.from('tasks').select('*').order('sort_order')
    if (t) setTasks(t as any)
  }

  const loadComments = async () => {
    const { data: c } = await supabase.from('comments').select('*, profiles(full_name, role)').eq('entity_type', 'task').order('created_at', { ascending: true })
    if (c) setComments(c as any)
  }

  useEffect(() => {
    const load = async () => {
      await loadTasks()
      await loadComments()
      const { data: pr } = await supabase.from('profiles').select('*')
      if (pr) setProfiles(pr)
    }
    load()

    const channel = supabase.channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadTasks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, loadComments)
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

  const addComment = async (taskId: string) => {
    if (!newComment.trim() || !user) return
    setSubmittingComment(true)
    await supabase.from('comments').insert({
      content: newComment.trim(),
      user_id: user.id,
      entity_type: 'task',
      entity_id: taskId,
    })
    setNewComment('')
    setSubmittingComment(false)
    await loadComments()
  }

  const deleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId)
    await loadComments()
  }

  const getTaskComments = (taskId: string) => comments.filter(c => c.entity_id === taskId)

  const getProfileName = (id: string | null | undefined) => {
    if (!id) return null
    return profiles.find(p => p.id === id)?.full_name || null
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-full mx-auto">
      <PageHeader
        title="Task Board"
        description={`${tasks.length} tasks \u2014 ${tasks.filter(t => t.status === 'done').length} completed`}
        className="mb-6"
        actions={
          <div className="flex gap-2">
            {/* View Toggle */}
            <div className="flex bg-muted rounded-lg p-0.5">
              <button onClick={() => setView('board')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === 'board' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>
                Board
              </button>
              <button onClick={() => setView('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === 'list' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>
                List
              </button>
            </div>
            <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">
              + Add Task
            </button>
          </div>
        }
      />

      {/* Add Task Form */}
      {showAdd && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Task title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
              className="px-4 py-2 border border-border rounded-lg text-sm text-foreground bg-card focus:ring-2 focus:ring-primary outline-none" />
            <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}
              className="px-4 py-2 border border-border rounded-lg text-sm text-foreground bg-card focus:ring-2 focus:ring-primary outline-none">
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <select value={newTask.assigned_to} onChange={e => setNewTask({...newTask, assigned_to: e.target.value})}
              className="px-4 py-2 border border-border rounded-lg text-sm text-foreground bg-card focus:ring-2 focus:ring-primary outline-none">
              <option value="">Unassigned</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            <input type="date" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})}
              className="px-4 py-2 border border-border rounded-lg text-sm text-foreground bg-card focus:ring-2 focus:ring-primary outline-none" />
            <textarea placeholder="Description (optional)" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}
              className="px-4 py-2 border border-border rounded-lg text-sm text-foreground bg-card focus:ring-2 focus:ring-primary outline-none md:col-span-2" rows={2} />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createTask} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">Create Task</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80">Cancel</button>
          </div>
        </div>
      )}

      {/* ===== BOARD VIEW ===== */}
      {view === 'board' && (
        <DragDropContext onDragEnd={onDragEnd}>
          {/* Mobile column tabs */}
          <div className="flex md:hidden gap-1 mb-3 bg-muted rounded-lg p-1">
            {COLUMNS.map(col => (
              <button key={col.id} onClick={() => setMobileCol(col.id)}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition ${mobileCol === col.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>
                {col.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col md:flex-row md:gap-4 gap-4">
              {COLUMNS.map(col => {
                const colTasks = tasks.filter(t => t.status === col.id)
                return (
                  <div key={col.id} className={`flex-1 min-w-0 bg-muted rounded-lg p-3 ${mobileCol !== col.id ? 'hidden md:block' : ''}`}>
                    <div className="flex items-center gap-2 mb-3 px-2">
                      <div className={`w-3 h-3 rounded-full ${col.dot}`} />
                      <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                      <span className="text-xs text-muted-foreground ml-auto">{colTasks.length}</span>
                    </div>
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}
                          className={`space-y-2 min-h-[200px] rounded-lg p-1 transition ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}>
                          {colTasks.map((task, index) => {
                            const taskComments = getTaskComments(task.id)
                            return (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                  className={`bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-grab ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}>
                                  {/* Card Header -- always visible */}
                                  <div className="p-3" onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}>
                                    <div className="flex items-start gap-2">
                                      <PriorityBadge priority={task.priority as 'low' | 'medium' | 'high' | 'urgent'} showLabel={false} className="mt-0.5 px-0 py-0 bg-transparent" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">{task.title}</p>
                                        {task.description && expandedTask !== task.id && (
                                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                          <PriorityBadge priority={task.priority as 'low' | 'medium' | 'high' | 'urgent'} />
                                          {task.due_date && (
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${task.due_date < today && task.status !== 'done' ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'}`}>
                                              {new Date(task.due_date).toLocaleDateString()}
                                            </span>
                                          )}
                                          {getProfileName(task.assigned_to) && (
                                            <span className="text-xs text-muted-foreground">{getProfileName(task.assigned_to)}</span>
                                          )}
                                          {taskComments.length > 0 && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                              {taskComments.length}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expanded Detail */}
                                  {expandedTask === task.id && (
                                    <div className="px-3 pb-3 border-t border-border pt-3 space-y-3" onClick={e => e.stopPropagation()}>
                                      {task.description && (
                                        <div>
                                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Description</p>
                                          <p className="text-sm text-foreground whitespace-pre-line">{task.description}</p>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-xs text-muted-foreground mb-0.5">Status</label>
                                          <select value={task.status} onChange={e => updateTask(task.id, 'status', e.target.value)}
                                            className="w-full px-2 py-1 border border-border rounded text-xs bg-card text-foreground focus:ring-2 focus:ring-primary outline-none">
                                            {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-muted-foreground mb-0.5">Priority</label>
                                          <select value={task.priority} onChange={e => updateTask(task.id, 'priority', e.target.value)}
                                            className="w-full px-2 py-1 border border-border rounded text-xs bg-card text-foreground focus:ring-2 focus:ring-primary outline-none">
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-muted-foreground mb-0.5">Assigned To</label>
                                          <select value={task.assigned_to || ''} onChange={e => updateTask(task.id, 'assigned_to', e.target.value || null)}
                                            className="w-full px-2 py-1 border border-border rounded text-xs bg-card text-foreground focus:ring-2 focus:ring-primary outline-none">
                                            <option value="">Unassigned</option>
                                            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-muted-foreground mb-0.5">Due Date</label>
                                          <input type="date" value={task.due_date || ''} onChange={e => updateTask(task.id, 'due_date', e.target.value || null)}
                                            className="w-full px-2 py-1 border border-border rounded text-xs bg-card text-foreground focus:ring-2 focus:ring-primary outline-none" />
                                        </div>
                                      </div>

                                      {/* Centre Context */}
                                      <div className="mt-3">
                                        <CentreContextPanel
                                          qaNumbers={task.qa_elements ? [task.qa_elements.qa_number] : undefined}
                                          contextTypes={['qip_goal', 'qip_strategy', 'procedure_step']}
                                          title="Related Context"
                                          limit={2}
                                          enabled={!!task.qa_element_id}
                                        />
                                      </div>

                                      {/* Comments / Brainstorming Section */}
                                      <div className="pt-2 border-t border-border">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Comments &amp; Ideas</p>

                                        {/* Existing comments */}
                                        {taskComments.length > 0 && (
                                          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                                            {taskComments.map(c => (
                                              <div key={c.id} className="bg-muted rounded-lg p-2.5 group/comment">
                                                <div className="flex items-start justify-between">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <span className="text-xs font-medium text-foreground">{(c.profiles as any)?.full_name || 'Unknown'}</span>
                                                      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground whitespace-pre-line">{c.content}</p>
                                                  </div>
                                                  {user && c.user_id === user.id && (
                                                    <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover/comment:opacity-100 text-muted-foreground hover:text-red-500 transition text-xs ml-2 shrink-0">
                                                      &#10005;
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Add comment */}
                                        <div className="flex gap-2">
                                          <input
                                            type="text"
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(task.id) } }}
                                            placeholder="Add a comment or idea..."
                                            className="flex-1 px-2.5 py-1.5 border border-border rounded-lg text-xs bg-card text-foreground focus:ring-2 focus:ring-primary outline-none"
                                          />
                                          <button
                                            onClick={() => addComment(task.id)}
                                            disabled={!newComment.trim() || submittingComment}
                                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
                                          >
                                            Post
                                          </button>
                                        </div>
                                      </div>

                                      <button onClick={() => deleteTask(task.id)} className="text-xs text-red-500 hover:text-red-700">Delete task</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          )})}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}
            </div>
        </DragDropContext>
      )}

      {/* ===== LIST VIEW ===== */}
      {view === 'list' && (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-8"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Task</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-28">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-24">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-36">Assigned To</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-28">Due Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.map(task => {
                const taskComments = getTaskComments(task.id)
                const isExpanded = expandedTask === task.id
                return (
                  <tr key={task.id} className="group">
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.priority as 'low' | 'medium' | 'high' | 'urgent'} showLabel={false} className="px-0 py-0 bg-transparent" />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="text-left w-full">
                        <p className={`text-sm font-medium ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.title}</p>
                        {!isExpanded && task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.description.substring(0, 80)}{task.description.length > 80 ? '...' : ''}</p>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <select value={task.status} onChange={e => updateTask(task.id, 'status', e.target.value)}
                        className="px-2 py-1 border border-border rounded text-xs focus:ring-2 focus:ring-primary outline-none bg-card text-foreground">
                        {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select value={task.priority} onChange={e => updateTask(task.id, 'priority', e.target.value)}
                        className="px-2 py-1 border border-border rounded text-xs focus:ring-2 focus:ring-primary outline-none bg-card text-foreground">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select value={task.assigned_to || ''} onChange={e => updateTask(task.id, 'assigned_to', e.target.value || null)}
                        className="px-2 py-1 border border-border rounded text-xs focus:ring-2 focus:ring-primary outline-none bg-card text-foreground w-full">
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
                          className="px-1 py-1 border border-border rounded text-xs focus:ring-2 focus:ring-primary outline-none bg-card text-foreground w-full" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {taskComments.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          {taskComments.length}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Expanded comment section for list view - shown below table */}
          {expandedTask && (
            <div className="border-t border-border p-4 bg-muted">
              {(() => {
                const task = tasks.find(t => t.id === expandedTask)
                if (!task) return null
                const taskComments = getTaskComments(task.id)
                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
                        {task.description && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{task.description}</p>}
                      </div>
                      <button onClick={() => setExpandedTask(null)} className="text-muted-foreground hover:text-foreground text-sm">&#10005;</button>
                    </div>
                    {/* Centre Context */}
                    <div className="mt-3 mb-3">
                      <CentreContextPanel
                        qaNumbers={task.qa_elements ? [task.qa_elements.qa_number] : undefined}
                        contextTypes={['qip_goal', 'qip_strategy', 'procedure_step']}
                        title="Related Context"
                        limit={2}
                        enabled={!!task.qa_element_id}
                      />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Comments &amp; Ideas</p>
                    {taskComments.length > 0 && (
                      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                        {taskComments.map(c => (
                          <div key={c.id} className="bg-card rounded-lg p-2.5 border border-border group/comment">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium text-foreground">{(c.profiles as any)?.full_name || 'Unknown'}</span>
                                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-xs text-muted-foreground whitespace-pre-line">{c.content}</p>
                              </div>
                              {user && c.user_id === user.id && (
                                <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover/comment:opacity-100 text-muted-foreground hover:text-red-500 transition text-xs ml-2 shrink-0">
                                  &#10005;
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(task.id) } }}
                        placeholder="Add a comment or idea..."
                        className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary outline-none"
                      />
                      <button
                        onClick={() => addComment(task.id)}
                        disabled={!newComment.trim() || submittingComment}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
                      >
                        Post
                      </button>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="text-xs text-red-500 hover:text-red-700 mt-3">Delete task</button>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
