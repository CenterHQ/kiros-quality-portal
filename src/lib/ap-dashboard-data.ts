import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function fetchServiceOverview(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: elements } = await supabase
    .from('qa_elements')
    .select('qa_number, qa_name, element_code, element_name, current_rating, status')
    .order('qa_number')
    .order('element_code')

  const total = elements?.length || 0
  const met = elements?.filter(e => ['met', 'meeting', 'exceeding'].includes(e.current_rating)).length || 0
  const notMet = elements?.filter(e => e.current_rating === 'not_met').length || 0

  return { elements: elements || [], total, met, notMet }
}

export async function fetchQipGoalProgress(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const [{ data: goals }, { data: elements }, { data: tasks }, { data: compliance }, { data: enrollments }] = await Promise.all([
    supabase.from('centre_context').select('*').eq('context_type', 'qip_goal').eq('is_active', true).order('title'),
    supabase.from('qa_elements').select('qa_number, element_code, current_rating, status'),
    supabase.from('tasks').select('status, qa_element_id'),
    supabase.from('compliance_items').select('status'),
    supabase.from('lms_enrollments').select('status, lms_modules(related_qa)'),
  ])

  return (goals || []).map(goal => {
    // Element progress (40% weight)
    const relatedElements = (elements || []).filter(el =>
      goal.related_element_codes?.includes(el.element_code) || goal.related_qa?.includes(el.qa_number)
    )
    const elementsCompleted = relatedElements.filter(el =>
      ['met', 'meeting', 'exceeding'].includes(el.current_rating) || el.status === 'completed'
    ).length
    const elementScore = relatedElements.length > 0 ? elementsCompleted / relatedElements.length : 0

    // Task progress (30% weight)
    const allTasks = tasks || []
    const doneTasks = allTasks.filter(t => t.status === 'done').length
    const taskScore = allTasks.length > 0 ? doneTasks / allTasks.length : 0

    // Compliance progress (20% weight)
    const allCompliance = compliance || []
    const resolvedCompliance = allCompliance.filter(c => ['completed', 'ongoing'].includes(c.status)).length
    const complianceScore = allCompliance.length > 0 ? resolvedCompliance / allCompliance.length : 0

    // Training progress (10% weight)
    const allEnrollments = enrollments || []
    const completedEnrollments = allEnrollments.filter(e => e.status === 'completed').length
    const trainingScore = allEnrollments.length > 0 ? completedEnrollments / allEnrollments.length : 0

    const overallProgress = Math.round(
      (elementScore * 0.4 + taskScore * 0.3 + complianceScore * 0.2 + trainingScore * 0.1) * 100
    )

    return {
      ...goal,
      progress: overallProgress,
      elementsMet: elementsCompleted,
      elementsTotal: relatedElements.length,
      tasksDone: doneTasks,
      tasksTotal: allTasks.length,
    }
  })
}

export async function fetchStaffCompliance(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const [{ data: profiles }, { data: quals }, { data: enrollments }, { data: policies }, { data: acks }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role').order('full_name'),
    supabase.from('staff_qualifications').select('user_id, qualification_type, expiry_date, status'),
    supabase.from('lms_enrollments').select('user_id, status').eq('status', 'completed'),
    supabase.from('policies').select('id').eq('status', 'published'),
    supabase.from('policy_acknowledgements').select('user_id, policy_id'),
  ])

  const staff = (profiles || []).filter(p => p.role !== 'admin')
  const mandatoryQuals = ['first_aid', 'cpr', 'anaphylaxis', 'asthma', 'child_protection', 'wwcc', 'food_safety']
  const publishedPolicyCount = policies?.length || 0

  const staffData = staff.map(s => {
    const userQuals = (quals || []).filter(q => q.user_id === s.id)
    const currentQuals = userQuals.filter(q => q.status === 'current')
    const expiredQuals = userQuals.filter(q => q.status === 'expired')
    const expiringQuals = userQuals.filter(q => q.status === 'expiring_soon')
    const completedTraining = (enrollments || []).filter(e => e.user_id === s.id).length
    const acknowledgedPolicies = (acks || []).filter(a => a.user_id === s.id).length

    return {
      id: s.id,
      name: s.full_name,
      role: s.role,
      qualsTotal: mandatoryQuals.length,
      qualsCurrent: currentQuals.length,
      qualsExpired: expiredQuals.length,
      qualsExpiring: expiringQuals.length,
      trainingCompleted: completedTraining,
      policiesAcknowledged: acknowledgedPolicies,
      policiesTotal: publishedPolicyCount,
      isFullyCompliant: currentQuals.length >= mandatoryQuals.length && expiredQuals.length === 0,
    }
  })

  const fullyCompliant = staffData.filter(s => s.isFullyCompliant).length
  const withGaps = staffData.filter(s => !s.isFullyCompliant).length
  const expiringSoon = staffData.filter(s => s.qualsExpiring > 0).length

  return { staff: staffData, fullyCompliant, withGaps, expiringSoon, total: staff.length }
}

export async function fetchOperationalHealth(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const today = new Date().toISOString().split('T')[0]

  const [{ data: checklistsToday }, { data: overdueTasks }, { data: overdueActions }, { data: tickets }, { data: activity }] = await Promise.all([
    supabase.from('checklist_instances').select('status').eq('due_date', today),
    supabase.from('tasks').select('id').lt('due_date', today).neq('status', 'done'),
    supabase.from('element_actions').select('id').lt('due_date', today).neq('status', 'completed'),
    supabase.from('smart_tickets').select('id, priority').in('status', ['open', 'in_progress']),
    supabase.from('activity_log').select('action, entity_type, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(10),
  ])

  const checklistTotal = checklistsToday?.length || 0
  const checklistCompleted = checklistsToday?.filter(c => c.status === 'completed').length || 0

  return {
    checklistsToday: { total: checklistTotal, completed: checklistCompleted },
    overdueTasks: overdueTasks?.length || 0,
    overdueActions: overdueActions?.length || 0,
    openTickets: tickets?.length || 0,
    criticalTickets: tickets?.filter(t => t.priority === 'critical').length || 0,
    recentActivity: activity || [],
  }
}

export async function fetchPendingSuggestions(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data } = await supabase
    .from('ai_suggestions')
    .select('*, profiles!ai_suggestions_suggested_by_fkey(full_name, role)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10)

  return data || []
}
