import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// ============================================================================
// POST — Execute onboarding for approved candidate
// Auth required (admin/manager/ns)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'manager', 'ns'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { candidate_id } = await request.json()

    if (!candidate_id) {
      return NextResponse.json({ error: 'candidate_id is required' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Load candidate + position
    const { data: candidate, error: candError } = await serviceClient
      .from('recruitment_candidates')
      .select('*, recruitment_positions(title, role)')
      .eq('id', candidate_id)
      .single()

    if (candError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    if (!['shortlisted', 'offered', 'hired'].includes(candidate.status)) {
      return NextResponse.json({ error: 'Candidate must be shortlisted, offered, or hired to onboard' }, { status: 400 })
    }

    const position = candidate.recruitment_positions as { title: string; role: string }

    // ---- Step 1: Create auth user ----
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: candidate.email,
      user_metadata: {
        full_name: candidate.full_name,
        role: position.role,
      },
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: `Failed to create user: ${authError.message}` }, { status: 500 })
    }

    const newUserId = authData.user.id
    // Profile auto-created by database trigger — do NOT insert into profiles

    // ---- Step 2: Assign mandatory training modules ----
    const { data: mandatoryModules } = await serviceClient
      .from('lms_modules')
      .select('id, title')
      .eq('is_mandatory', true)
      .eq('status', 'published')

    let trainingAssigned = 0
    if (mandatoryModules && mandatoryModules.length > 0) {
      const enrollments = mandatoryModules.map((mod) => ({
        user_id: newUserId,
        module_id: mod.id,
        assigned_by: user.id,
        status: 'not_started',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks
      }))

      const { error: enrollError } = await serviceClient
        .from('lms_enrollments')
        .upsert(enrollments, { onConflict: 'user_id,module_id' })

      if (enrollError) {
        console.error('[Recruitment Onboard] Training assignment failed:', enrollError.message)
      } else {
        trainingAssigned = mandatoryModules.length
      }
    }

    // ---- Step 3: Create induction checklist instance ----
    let checklistCreated = false
    const { data: inductionTemplate } = await serviceClient
      .from('checklist_templates')
      .select('id, name, items')
      .ilike('name', '%Staff Induction%')
      .eq('status', 'active')
      .limit(1)
      .single()

    if (inductionTemplate && inductionTemplate.items) {
      const items = inductionTemplate.items as Array<Record<string, unknown>>
      const { error: checklistError } = await serviceClient
        .from('checklist_instances')
        .insert({
          template_id: inductionTemplate.id,
          name: `${inductionTemplate.name} - ${candidate.full_name}`,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week
          status: 'pending',
          assigned_to: newUserId,
          responses: {},
          items_snapshot: inductionTemplate.items,
          total_items: items.filter((i) => i.type !== 'heading').length,
          completed_items: 0,
          failed_items: 0,
        })

      if (checklistError) {
        console.error('[Recruitment Onboard] Checklist creation failed:', checklistError.message)
      } else {
        checklistCreated = true
      }
    }

    // ---- Step 4: Create orientation tasks ----
    const orientationTasks = [
      {
        title: `Complete onboarding for ${candidate.full_name}`,
        description: `New ${position.role} starting: ${candidate.full_name}. Ensure all induction steps are completed.`,
        priority: 'high' as const,
        assigned_to: user.id,
        created_by: user.id,
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'todo',
        sort_order: 0,
      },
      {
        title: `IT setup for ${candidate.full_name}`,
        description: `Set up email, system access, and platform login for new ${position.role}.`,
        priority: 'high' as const,
        assigned_to: user.id,
        created_by: user.id,
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'todo',
        sort_order: 1,
      },
      {
        title: `Room introduction for ${candidate.full_name}`,
        description: `Introduce ${candidate.full_name} to room team, children, and families.`,
        priority: 'medium' as const,
        assigned_to: user.id,
        created_by: user.id,
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'todo',
        sort_order: 2,
      },
    ]

    const { data: createdTasks, error: tasksError } = await serviceClient
      .from('tasks')
      .insert(orientationTasks)
      .select('id')

    if (tasksError) {
      console.error('[Recruitment Onboard] Task creation failed:', tasksError.message)
    }

    // ---- Step 5: Update candidate status ----
    const { error: statusError } = await serviceClient
      .from('recruitment_candidates')
      .update({
        status: 'hired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate_id)

    if (statusError) {
      console.error('[Recruitment Onboard] Status update failed:', statusError.message)
    }

    return NextResponse.json({
      user_id: newUserId,
      training_assigned: trainingAssigned,
      checklist_created: checklistCreated,
      tasks_created: createdTasks?.length || 0,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Recruitment Onboard]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
