'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QA_COLORS, STATUS_COLORS, type QAElement, type Comment, type Profile } from '@/lib/types'

export default function ElementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [element, setElement] = useState<QAElement | null>(null)
  const [comments, setComments] = useState<(Comment & { profiles: Profile })[]>([])
  const [newComment, setNewComment] = useState('')
  const [user, setUser] = useState<Profile | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
        if (p) setUser(p)
      }

      const { data: el } = await supabase.from('qa_elements').select('*').eq('id', params.id).single()
      if (el) setElement(el)

      const { data: c } = await supabase.from('comments').select('*, profiles(*)').eq('entity_type', 'element').eq('entity_id', String(params.id)).order('created_at', { ascending: true })
      if (c) setComments(c as any)
    }
    load()

    // Realtime comments
    const channel = supabase.channel('element-comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `entity_id=eq.${params.id}` }, async (payload) => {
        const { data } = await supabase.from('comments').select('*, profiles(*)').eq('id', payload.new.id).single()
        if (data) setComments(prev => [...prev, data as any])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [params.id])

  const updateField = useCallback(async (field: string, value: string) => {
    if (!element) return
    await supabase.from('qa_elements').update({ [field]: value }).eq('id', element.id)
    setElement(prev => prev ? { ...prev, [field]: value } : null)
    // Log activity
    if (user) {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: `Updated ${field}`,
        entity_type: 'element',
        entity_id: String(element.id),
        details: `${element.element_code}: ${field} changed to "${value}"`
      })
    }
  }, [element, user])

  const addComment = async () => {
    if (!newComment.trim() || !user || !element) return
    await supabase.from('comments').insert({
      content: newComment,
      user_id: user.id,
      entity_type: 'element',
      entity_id: String(element.id),
    })
    setNewComment('')
    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      action: 'Added comment',
      entity_type: 'element',
      entity_id: String(element.id),
      details: `Comment on ${element.element_code}`
    })
  }

  if (!element) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading...</p></div>

  const qaColor = QA_COLORS[element.qa_number] || '#666'

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; Back to Elements</button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="flex items-center gap-4 p-6 border-b border-gray-200">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: qaColor }}>
            QA{element.qa_number}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{element.element_code} — {element.element_name}</h1>
            <p className="text-sm text-gray-500">{element.standard_number}: {element.standard_name}</p>
          </div>
        </div>

        {/* Status & Rating Controls */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-200 bg-gray-50">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Current Rating</label>
            <select value={element.current_rating} onChange={(e) => updateField('current_rating', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none">
              <option value="not_met">Not Met</option>
              <option value="met">Met</option>
              <option value="working_towards">Working Towards</option>
              <option value="meeting">Meeting NQS</option>
              <option value="exceeding">Exceeding NQS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Uplift Status</label>
            <select value={element.status} onChange={(e) => updateField('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none">
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="action_taken">Action Taken</option>
              <option value="ready_for_review">Ready for Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Due Date</label>
            <input type="date" value={element.due_date || ''} onChange={(e) => updateField('due_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none" />
          </div>
        </div>

        {/* Concept */}
        {element.concept && (
          <div className="p-6 border-b border-gray-200">
            <p className="text-sm text-gray-600 italic">{element.concept}</p>
          </div>
        )}
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Officer Finding */}
        {element.officer_finding && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-red-700 uppercase mb-2">Officer Finding</h3>
            <p className="text-sm text-red-800">{element.officer_finding}</p>
          </div>
        )}

        {/* Meeting NQS Criteria */}
        {element.meeting_criteria && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-green-700 uppercase mb-2">What Meeting NQS Looks Like</h3>
            <p className="text-sm text-green-800 whitespace-pre-line">{element.meeting_criteria}</p>
          </div>
        )}

        {/* Exceeding NQS Criteria */}
        {element.exceeding_criteria && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-purple-700 uppercase mb-2">What Exceeding NQS Looks Like</h3>
            <p className="text-sm text-purple-800 whitespace-pre-line">{element.exceeding_criteria}</p>
          </div>
        )}

        {/* Training Points */}
        {element.training_points && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-amber-700 uppercase mb-2">Training Points</h3>
            <p className="text-sm text-amber-800 whitespace-pre-line">{element.training_points}</p>
          </div>
        )}
      </div>

      {/* Editable Notes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Actions & Notes</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Actions Taken</label>
            <textarea
              value={element.actions_taken || ''}
              onChange={(e) => setElement(prev => prev ? { ...prev, actions_taken: e.target.value } : null)}
              onBlur={(e) => updateField('actions_taken', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none resize-y min-h-[100px]"
              placeholder="Document actions taken to address this element..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
            <textarea
              value={element.notes || ''}
              onChange={(e) => setElement(prev => prev ? { ...prev, notes: e.target.value } : null)}
              onBlur={(e) => updateField('notes', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none resize-y min-h-[100px]"
              placeholder="Additional notes..."
            />
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Discussion ({comments.length})</h2>
        </div>
        <div className="p-6">
          {comments.length > 0 ? (
            <div className="space-y-4 mb-6">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#6b2fa0] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {c.profiles?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.profiles?.full_name || 'Unknown'}</span>
                      <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-4">No comments yet. Start a discussion.</p>
          )}
          <div className="flex gap-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none resize-none"
              placeholder="Add a comment..."
              rows={2}
            />
            <button
              onClick={addComment}
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-[#6b2fa0] text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50 self-end"
            >Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}
