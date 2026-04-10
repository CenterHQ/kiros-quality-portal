import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET: Fetch suggestions for current user/role
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // For admin/ns: show all pending suggestions (approval queue)
  // For others: show suggestions targeting their role or them specifically
  let query = supabase
    .from('ai_suggestions')
    .select('*, profiles!ai_suggestions_suggested_by_fkey(full_name, role), reviewer_profiles:profiles!ai_suggestions_reviewed_by_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(20)

  if (['admin', 'ns'].includes(profile.role)) {
    // Show all non-dismissed suggestions
    query = query.neq('status', 'dismissed')
  } else {
    // Show suggestions for this user or role, exclude dismissed
    query = query
      .neq('status', 'dismissed')
      .or(`target_user_id.eq.${user.id},target_role.eq.${profile.role},suggested_by.eq.${user.id}`)
  }

  const { data } = await query
  return NextResponse.json({ suggestions: data || [] })
}

// PATCH: Update suggestion status (approve/reject/dismiss/action)
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { suggestionId, status, review_note } = await request.json()

  const updates: Record<string, unknown> = { status }
  if (['approved', 'rejected'].includes(status)) {
    updates.reviewed_by = user.id
    updates.reviewed_at = new Date().toISOString()
    if (review_note) updates.review_note = review_note
  }

  const { data, error } = await supabase
    .from('ai_suggestions')
    .update(updates)
    .eq('id', suggestionId)
    .select('*, profiles!ai_suggestions_suggested_by_fkey(full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If approved with action_payload, execute the action
  if (status === 'approved' && data.action_type && data.action_payload) {
    const payload = data.action_payload as Record<string, unknown>

    if (data.action_type === 'create_task' && payload.title) {
      const { error: taskErr } = await supabase.from('tasks').insert({
        title: payload.title,
        description: payload.description || data.content,
        priority: payload.priority || 'medium',
        status: 'todo',
        sort_order: 0,
        created_by: user.id,
        due_date: payload.due_date || null,
      })
      if (!taskErr) {
        await supabase.from('ai_suggestions').update({ status: 'actioned' }).eq('id', suggestionId)
      }
    }

    if (data.action_type === 'assign_training' && payload.module_title && payload.staff_name) {
      const { data: mod, error: modErr } = await supabase.from('lms_modules').select('id').ilike('title', `%${payload.module_title}%`).limit(1).single()
      const { data: staff, error: staffErr } = await supabase.from('profiles').select('id').ilike('full_name', `%${payload.staff_name}%`).limit(1).single()
      if (modErr && modErr.code !== 'PGRST116') console.error('Module lookup failed:', modErr.message)
      if (staffErr && staffErr.code !== 'PGRST116') console.error('Staff lookup failed:', staffErr.message)
      if (mod && staff) {
        const { error: enrollErr } = await supabase.from('lms_enrollments').upsert({
          user_id: staff.id,
          module_id: mod.id,
          assigned_by: user.id,
          status: 'not_started',
          due_date: payload.due_date || null,
        }, { onConflict: 'user_id,module_id' })
        if (!enrollErr) {
          await supabase.from('ai_suggestions').update({ status: 'actioned' }).eq('id', suggestionId)
        }
      }
    }
  }

  return NextResponse.json({ suggestion: data })
}
