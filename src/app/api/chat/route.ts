import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ROLE_LABELS: Record<string, string> = {
  admin: 'Approved Provider',
  manager: 'Operations Manager',
  ns: 'Nominated Supervisor',
  el: 'Educational Leader',
  educator: 'Educator',
}

function buildSystemPrompt(role: string, centreContext: string, staffList: string) {
  const roleLabel = ROLE_LABELS[role] || 'Staff Member'
  return `You are the Kiros AI Assistant — the dedicated operations assistant for Kiros Early Education Centre in Bidwill, NSW.

You are an expert in:
- Australian Early Childhood Education and Care (ECEC)
- The National Quality Framework (NQF) and National Quality Standard (NQS)
- The Early Years Learning Framework (EYLF) V2.0
- NSW Education and Care Services National Law and National Regulations
- The Assessment and Rating (A&R) process under ACECQA
- Early childhood centre operations, programming, compliance, and best practice

You are speaking with the ${roleLabel}. Tailor your responses accordingly:
${role === 'admin' ? '- Provide strategic, executive-level insights. Summarise data comprehensively. Support governance decisions.' : ''}
${role === 'manager' ? '- Focus on operational improvements, educator coaching strategies, and practical implementation. When you suggest improvements, use the suggest_improvement tool so it goes through the approval workflow.' : ''}
${role === 'ns' ? '- Support daily operations, compliance monitoring, staff management, and programming oversight. You have authority to create tasks and assign training.' : ''}
${role === 'el' ? '- Focus on pedagogical leadership, programming quality, EYLF alignment, and educator mentoring. Support curriculum decision-making.' : ''}
${role === 'educator' ? '- Provide practical, room-level guidance grounded in centre policies and best practice. Help with daily interactions, programming ideas, and professional development.' : ''}

CENTRE CONTEXT (from Kiros QIP, philosophy, policies, and procedures):
${centreContext}

STAFF MEMBERS:
${staffList}

RULES:
- Always ground your answers in the centre's actual policies, philosophy, QIP goals, and documented practices
- Reference specific NQS element codes (e.g., 1.1.1, 2.2.3) where relevant
- Use Australian English spelling
- When creating tasks or assigning training, confirm the details with the user
- Only discuss early childhood education, centre operations, compliance, and related topics
- Do not discuss topics outside of childcare, education, or centre management
- Cite NSW regulations by number where relevant (e.g., Regulation 77, Regulation 155)
- Today's date is ${new Date().toISOString().split('T')[0]}`
}

const ALL_TOOLS: (Anthropic.Tool & { allowedRoles: string[] })[] = [
  {
    name: 'search_centre_context',
    description: 'Search the centre\'s QIP goals, philosophy, policies, procedures, and teaching approaches for relevant information.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'What to search for' },
        context_types: { type: 'array', items: { type: 'string' }, description: 'Filter by type: qip_goal, qip_strategy, philosophy_principle, policy_requirement, procedure_step, service_value, teaching_approach, family_engagement, inclusion_practice, safety_protocol, environment_feature, leadership_goal' },
        qa_numbers: { type: 'array', items: { type: 'integer' }, description: 'Filter by QA area (1-7)' },
      },
      required: ['query'],
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'create_task',
    description: 'Create a new task on the task board. Confirm details with the user before calling.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        assigned_to_name: { type: 'string', description: 'Full name of person to assign to' },
        due_date: { type: 'string', description: 'Due date as YYYY-MM-DD' },
      },
      required: ['title'],
    },
    allowedRoles: ['admin', 'ns', 'manager'],
  },
  {
    name: 'assign_training',
    description: 'Enroll a staff member in an LMS training module.',
    input_schema: {
      type: 'object' as const,
      properties: {
        module_title: { type: 'string', description: 'Title or keyword of the training module' },
        staff_name: { type: 'string', description: 'Full name of the staff member' },
        due_date: { type: 'string', description: 'Due date as YYYY-MM-DD' },
      },
      required: ['module_title', 'staff_name'],
    },
    allowedRoles: ['admin', 'ns', 'manager', 'el'],
  },
  {
    name: 'get_overdue_items',
    description: 'Get overdue tasks, training assignments, and checklist items.',
    input_schema: {
      type: 'object' as const,
      properties: {
        item_type: { type: 'string', enum: ['tasks', 'training', 'checklists', 'all'], description: 'Type of items to check' },
      },
      required: ['item_type'],
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'get_qa_progress',
    description: 'Get progress summary for a specific Quality Area (1-7) or all areas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        qa_number: { type: 'integer', description: 'QA number 1-7. Omit for all areas.' },
      },
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'get_staff_training_status',
    description: 'Get training completion and qualification status for a specific staff member or all staff.',
    input_schema: {
      type: 'object' as const,
      properties: {
        staff_name: { type: 'string', description: 'Full name of staff member. Omit for all staff summary.' },
      },
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el'],
  },
  {
    name: 'get_dashboard_summary',
    description: 'Get a comprehensive summary of all centre metrics: QA elements, tasks, compliance, training, checklists.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
    allowedRoles: ['admin'],
  },
  {
    name: 'suggest_improvement',
    description: 'Submit an improvement suggestion for the Nominated Supervisor or Approved Provider to review. Use this when proposing changes to training, programming, checklists, or operations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Short title for the suggestion' },
        content: { type: 'string', description: 'Detailed description of the improvement' },
        action_type: { type: 'string', enum: ['create_task', 'assign_training', 'create_checklist', 'update_element', 'view_item'] },
        action_payload: { type: 'object', description: 'Data needed to action the suggestion if approved' },
        related_qa: { type: 'array', items: { type: 'integer' }, description: 'Related QA areas (1-7)' },
      },
      required: ['title', 'content'],
    },
    allowedRoles: ['manager', 'el', 'educator'],
  },
]

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string
): Promise<string> {
  switch (toolName) {
    case 'search_centre_context': {
      let query = supabase.from('centre_context').select('context_type, title, content, related_qa, related_element_codes, source_quote').eq('is_active', true)
      if (Array.isArray(toolInput.context_types) && toolInput.context_types.length) {
        query = query.in('context_type', toolInput.context_types)
      }
      if (Array.isArray(toolInput.qa_numbers) && toolInput.qa_numbers.length) {
        query = query.overlaps('related_qa', toolInput.qa_numbers)
      }
      const { data } = await query.limit(10)
      return JSON.stringify(data || [])
    }

    case 'create_task': {
      let assignedTo = null
      if (toolInput.assigned_to_name) {
        const { data: profile } = await supabase
          .from('profiles').select('id, full_name')
          .ilike('full_name', `%${toolInput.assigned_to_name}%`)
          .limit(1).single()
        assignedTo = profile?.id
      }
      const { data, error } = await supabase.from('tasks').insert({
        title: toolInput.title,
        description: (toolInput.description as string) || null,
        priority: (toolInput.priority as string) || 'medium',
        assigned_to: assignedTo,
        created_by: userId,
        due_date: (toolInput.due_date as string) || null,
        status: 'todo',
        sort_order: 0,
      }).select().single()
      if (error) return JSON.stringify({ error: error.message })
      await supabase.from('activity_log').insert({
        user_id: userId,
        action: `AI Assistant created task: ${toolInput.title}`,
        entity_type: 'task',
        entity_id: data.id,
      })
      return JSON.stringify({ success: true, task_id: data.id, title: data.title })
    }

    case 'assign_training': {
      const { data: mod } = await supabase
        .from('lms_modules').select('id, title')
        .ilike('title', `%${toolInput.module_title}%`)
        .eq('status', 'published')
        .limit(1).single()
      const { data: staff } = await supabase
        .from('profiles').select('id, full_name')
        .ilike('full_name', `%${toolInput.staff_name}%`)
        .limit(1).single()
      if (!mod) return JSON.stringify({ error: `No published module found matching "${toolInput.module_title}"` })
      if (!staff) return JSON.stringify({ error: `No staff member found matching "${toolInput.staff_name}"` })
      const { data, error } = await supabase.from('lms_enrollments').upsert({
        user_id: staff.id,
        module_id: mod.id,
        assigned_by: userId,
        due_date: (toolInput.due_date as string) || null,
        status: 'not_started',
      }, { onConflict: 'user_id,module_id' }).select().single()
      if (error) return JSON.stringify({ error: error.message })
      await supabase.from('activity_log').insert({
        user_id: userId,
        action: `AI Assistant assigned "${mod.title}" to ${staff.full_name}`,
        entity_type: 'lms_enrollment',
        entity_id: data.id,
      })
      return JSON.stringify({ success: true, module: mod.title, staff: staff.full_name })
    }

    case 'get_overdue_items': {
      const today = new Date().toISOString().split('T')[0]
      const results: Record<string, unknown> = {}
      const itemType = toolInput.item_type as string
      if (itemType === 'tasks' || itemType === 'all') {
        const { data } = await supabase.from('tasks').select('title, priority, due_date, status, profiles(full_name)')
          .lt('due_date', today).neq('status', 'done').limit(10)
        results.overdue_tasks = data || []
      }
      if (itemType === 'training' || itemType === 'all') {
        const { data } = await supabase.from('lms_enrollments').select('due_date, status, lms_modules(title), profiles(full_name)')
          .lt('due_date', today).neq('status', 'completed').limit(10)
        results.overdue_training = data || []
      }
      if (itemType === 'checklists' || itemType === 'all') {
        const { data } = await supabase.from('checklist_instances').select('name, due_date, status')
          .lt('due_date', today).in('status', ['pending', 'in_progress']).limit(10)
        results.overdue_checklists = data || []
      }
      return JSON.stringify(results)
    }

    case 'get_qa_progress': {
      let query = supabase.from('qa_elements').select('qa_number, qa_name, element_code, element_name, current_rating, status')
      if (toolInput.qa_number) {
        query = query.eq('qa_number', toolInput.qa_number)
      }
      const { data } = await query.order('qa_number').order('element_code')
      const summary = (data || []).reduce((acc: Record<number, { name: string; met: number; not_met: number; total: number }>, el) => {
        if (!acc[el.qa_number]) acc[el.qa_number] = { name: el.qa_name, met: 0, not_met: 0, total: 0 }
        acc[el.qa_number].total++
        if (el.current_rating === 'met' || el.current_rating === 'meeting' || el.current_rating === 'exceeding') acc[el.qa_number].met++
        else acc[el.qa_number].not_met++
        return acc
      }, {})
      return JSON.stringify({ elements: data, summary })
    }

    case 'get_staff_training_status': {
      let profileQuery = supabase.from('profiles').select('id, full_name, role')
      if (toolInput.staff_name) {
        profileQuery = profileQuery.ilike('full_name', `%${toolInput.staff_name}%`)
      }
      const { data: profiles } = await profileQuery.limit(20)
      if (!profiles?.length) return JSON.stringify({ error: 'No staff found' })

      const userIds = profiles.map(p => p.id)
      const { data: enrollments } = await supabase.from('lms_enrollments')
        .select('user_id, status, lms_modules(title, tier)')
        .in('user_id', userIds)
      const { data: quals } = await supabase.from('staff_qualifications')
        .select('user_id, qualification_type, expiry_date, status')
        .in('user_id', userIds)

      const result = profiles.map(p => ({
        name: p.full_name,
        role: p.role,
        training: (enrollments || []).filter(e => e.user_id === p.id).map(e => ({
          module: (e.lms_modules as unknown as { title: string } | null)?.title,
          status: e.status,
        })),
        qualifications: (quals || []).filter(q => q.user_id === p.id).map(q => ({
          type: q.qualification_type,
          expiry: q.expiry_date,
          status: q.status,
        })),
      }))
      return JSON.stringify(result)
    }

    case 'get_dashboard_summary': {
      const [elements, tasks, compliance, enrollments, checklists] = await Promise.all([
        supabase.from('qa_elements').select('qa_number, current_rating, status'),
        supabase.from('tasks').select('status, priority'),
        supabase.from('compliance_items').select('status'),
        supabase.from('lms_enrollments').select('status'),
        supabase.from('checklist_instances').select('status').gte('due_date', new Date().toISOString().split('T')[0]),
      ])
      return JSON.stringify({
        elements: {
          total: elements.data?.length || 0,
          met: elements.data?.filter(e => ['met', 'meeting', 'exceeding'].includes(e.current_rating)).length || 0,
          not_met: elements.data?.filter(e => e.current_rating === 'not_met').length || 0,
        },
        tasks: {
          total: tasks.data?.length || 0,
          done: tasks.data?.filter(t => t.status === 'done').length || 0,
          in_progress: tasks.data?.filter(t => t.status === 'in_progress').length || 0,
        },
        compliance: {
          total: compliance.data?.length || 0,
          action_required: compliance.data?.filter(c => c.status === 'action_required').length || 0,
          completed: compliance.data?.filter(c => c.status === 'completed').length || 0,
        },
        training: {
          total: enrollments.data?.length || 0,
          completed: enrollments.data?.filter(e => e.status === 'completed').length || 0,
          in_progress: enrollments.data?.filter(e => e.status === 'in_progress').length || 0,
        },
        checklists_today: {
          total: checklists.data?.length || 0,
          completed: checklists.data?.filter(c => c.status === 'completed').length || 0,
        },
      })
    }

    case 'suggest_improvement': {
      const { data, error } = await supabase.from('ai_suggestions').insert({
        suggested_by: userId,
        suggestion_type: 'qip_improvement',
        title: toolInput.title,
        content: toolInput.content,
        action_type: (toolInput.action_type as string) || null,
        action_payload: (toolInput.action_payload as Record<string, unknown>) || {},
        related_qa: (toolInput.related_qa as number[]) || [],
        status: 'pending',
      }).select().single()
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ success: true, suggestion_id: data.id, message: 'Suggestion submitted for NS/AP review.' })
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { conversationId, message } = await request.json()

    // Ensure conversation exists
    let convId = conversationId
    if (!convId) {
      const { data: conv } = await supabase.from('chat_conversations').insert({
        user_id: user.id,
        title: message.substring(0, 80),
      }).select().single()
      convId = conv?.id
    }

    // Save user message
    await supabase.from('chat_messages').insert({
      conversation_id: convId,
      role: 'user',
      content: message,
    })

    // Load conversation history (last 20 messages)
    const { data: history } = await supabase.from('chat_messages')
      .select('role, content, metadata')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(20)

    // Build messages for Claude (exclude tool_call/tool_result from simple history)
    const messages: Anthropic.MessageParam[] = (history || [])
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    // Load centre context for system prompt
    const { data: contextItems } = await supabase.from('centre_context')
      .select('context_type, title, content')
      .eq('is_active', true)
      .limit(30)

    const centreContext = (contextItems || [])
      .map(c => `[${c.context_type}] ${c.title}: ${c.content}`)
      .join('\n\n')

    // Load staff list
    const { data: staff } = await supabase.from('profiles').select('full_name, role').order('full_name')
    const staffList = (staff || []).map(s => `${s.full_name} (${ROLE_LABELS[s.role] || s.role})`).join(', ')

    // Filter tools by role
    const allowedTools: Anthropic.Tool[] = ALL_TOOLS
      .filter(t => t.allowedRoles.includes(profile.role))
      .map(({ allowedRoles: _, ...tool }) => tool)

    const systemPrompt = buildSystemPrompt(profile.role, centreContext, staffList)

    // Call Claude with tool-use loop
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools: allowedTools,
      messages,
    })

    let iterations = 0
    while (response.stop_reason === 'tool_use' && iterations < 5) {
      const toolUseBlocks = response.content.filter((b): b is Anthropic.ContentBlock & { type: 'tool_use' } => b.type === 'tool_use')
      const toolResultContent: Anthropic.ToolResultBlockParam[] = []

      for (const block of toolUseBlocks) {
        const result = await executeTool(block.name, block.input as Record<string, unknown>, supabase, user.id)

        // Persist tool interactions
        await supabase.from('chat_messages').insert([
          { conversation_id: convId, role: 'tool_call', content: JSON.stringify({ name: block.name, input: block.input }), metadata: { tool_use_id: block.id } },
          { conversation_id: convId, role: 'tool_result', content: result, metadata: { tool_use_id: block.id } },
        ])

        toolResultContent.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        })
      }

      messages.push({ role: 'assistant', content: response.content as Anthropic.ContentBlockParam[] })
      messages.push({ role: 'user', content: toolResultContent })

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        tools: allowedTools,
        messages,
      })
      iterations++
    }

    // Extract final text response
    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    // Save assistant response
    await supabase.from('chat_messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: textContent,
    })

    return NextResponse.json({
      conversationId: convId,
      message: textContent,
    })

  } catch (error: unknown) {
    console.error('Chat error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
