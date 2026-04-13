import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { actionId, confirmed, pendingAction } = await request.json()
    // pendingAction contains: { action_type, description, details }

    if (!pendingAction) {
      return NextResponse.json({ error: 'Missing pending action data' }, { status: 400 })
    }

    // Log the action (confirmed or cancelled)
    await supabase.from('activity_log').insert({
      user_id: user.id,
      action: confirmed
        ? `Confirmed AI action: ${pendingAction.description}`
        : `Cancelled AI action: ${pendingAction.description}`,
      entity_type: 'ai_action',
      entity_id: actionId,
      details: JSON.stringify({ ...pendingAction, confirmed }),
    })

    if (!confirmed) {
      return NextResponse.json({ success: true, status: 'cancelled', message: 'Action cancelled.' })
    }

    // Execute the confirmed action
    const { action_type, details } = pendingAction

    switch (action_type) {
      case 'create_task': {
        let assignedTo = null
        if (details.assigned_to_name) {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles').select('id')
            .ilike('full_name', `%${details.assigned_to_name}%`)
            .limit(1).single()
          if (profileErr && profileErr.code !== 'PGRST116') return NextResponse.json({ error: `Staff lookup failed: ${profileErr.message}` }, { status: 500 })
          if (!profile) return NextResponse.json({ error: `Staff member "${details.assigned_to_name}" not found` }, { status: 404 })
          assignedTo = profile.id
        }
        const { data, error } = await supabase.from('tasks').insert({
          title: details.title,
          description: details.description || null,
          priority: details.priority || 'medium',
          assigned_to: assignedTo,
          created_by: user.id,
          due_date: details.due_date || null,
          status: 'todo',
          sort_order: 0,
        }).select().single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, status: 'confirmed', message: `Task "${details.title}" created successfully.`, result: data })
      }

      case 'assign_training': {
        const { data: mod, error: modErr } = await supabase
          .from('lms_modules').select('id, title')
          .ilike('title', `%${details.module_title}%`)
          .eq('status', 'published').limit(1).single()
        if (modErr && modErr.code !== 'PGRST116') return NextResponse.json({ error: `Module lookup failed: ${modErr.message}` }, { status: 500 })
        const { data: staff, error: staffErr } = await supabase
          .from('profiles').select('id, full_name')
          .ilike('full_name', `%${details.staff_name}%`)
          .limit(1).single()
        if (staffErr && staffErr.code !== 'PGRST116') return NextResponse.json({ error: `Staff lookup failed: ${staffErr.message}` }, { status: 500 })
        if (!mod || !staff) return NextResponse.json({ error: 'Module or staff not found' }, { status: 404 })
        const { error } = await supabase.from('lms_enrollments').upsert({
          user_id: staff.id, module_id: mod.id, assigned_by: user.id,
          due_date: details.due_date || null, status: 'not_started',
        }, { onConflict: 'user_id,module_id' })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, status: 'confirmed', message: `"${mod.title}" assigned to ${staff.full_name}.` })
      }

      case 'update_item': {
        const { item_type, item_id, updates } = details
        const TABLE_MAP: Record<string, string> = {
          task: 'tasks',
          compliance_item: 'compliance_items',
          qa_element: 'qa_elements',
        }
        const table = TABLE_MAP[item_type]
        if (!table) {
          return NextResponse.json({ error: `Invalid item type: ${item_type}` }, { status: 400 })
        }
        const { data, error } = await supabase.from(table).update(updates).eq('id', item_id).select('id').maybeSingle()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!data) return NextResponse.json({ error: `${item_type} with ID ${item_id} not found` }, { status: 404 })
        return NextResponse.json({ success: true, status: 'confirmed', message: `${item_type} updated successfully.` })
      }

      case 'create_checklist_instance': {
        const { data: template, error: tplErr } = await supabase
          .from('checklist_templates').select('id, name, items')
          .ilike('name', `%${details.template_name}%`)
          .limit(1).single()
        if (tplErr && tplErr.code !== 'PGRST116') return NextResponse.json({ error: `Template lookup failed: ${tplErr.message}` }, { status: 500 })
        if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        if (!template.items || !Array.isArray(template.items)) {
          return NextResponse.json({ error: 'Template has no checklist items defined' }, { status: 400 })
        }
        let assignedTo = null
        if (details.assigned_to_name) {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles').select('id')
            .ilike('full_name', `%${details.assigned_to_name}%`)
            .limit(1).single()
          if (profileErr && profileErr.code !== 'PGRST116') return NextResponse.json({ error: `Staff lookup failed: ${profileErr.message}` }, { status: 500 })
          if (!profile) return NextResponse.json({ error: `Staff member "${details.assigned_to_name}" not found` }, { status: 404 })
          assignedTo = profile.id
        }
        const items = template.items as Array<Record<string, unknown>>
        const { error } = await supabase.from('checklist_instances').insert({
          template_id: template.id,
          name: template.name,
          due_date: details.due_date || new Date().toISOString().split('T')[0],
          status: 'pending',
          assigned_to: assignedTo,
          responses: {},
          items_snapshot: template.items,
          total_items: items.filter((i: Record<string, unknown>) => i.type !== 'heading').length,
          completed_items: 0,
          failed_items: 0,
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, status: 'confirmed', message: `Checklist "${template.name}" created.` })
      }

      default:
        return NextResponse.json({ error: `Unknown action type: ${action_type}` }, { status: 400 })
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
