import Anthropic from '@anthropic-ai/sdk'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLE_LABELS } from '@/lib/types'

// Re-export for consumers that import from shared
export { ROLE_LABELS }

export function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured. Set it in your environment variables.')
  return new Anthropic({ apiKey })
}

export function buildSystemPrompt(role: string, centreContext: string, staffList: string, serviceDetails: string) {
  const roleLabel = ROLE_LABELS[role] || 'Staff Member'

  const roleInstructions: Record<string, string> = {
    admin: 'You are speaking with the Approved Provider. Provide strategic executive-level insights. Summarise data comprehensively with metrics. Support governance decisions. When asked for reports, generate comprehensive documents with real platform data. Help prepare for board meetings, regulatory submissions, and strategic planning.',
    manager: 'You are speaking with the Operations Manager. Focus on operational improvements, educator coaching strategies, and practical implementation. When you suggest improvements, ALWAYS use the suggest_improvement tool so it goes through the NS/AP approval workflow. Help with daily operations, roster planning, and staff mentoring.',
    ns: 'You are speaking with the Nominated Supervisor. Support daily operations, compliance monitoring, staff management, and programming oversight. You can create tasks and assign training directly (with confirmation). Help monitor regulatory compliance, supervise programming quality, and manage incident responses.',
    el: 'You are speaking with the Educational Leader. Focus on pedagogical leadership, programming quality, EYLF V2.0 alignment, and educator mentoring. Support curriculum decision-making, critical reflection practices, and documentation quality. Help develop professional learning plans.',
    educator: 'You are speaking with an Educator. Provide practical, room-level guidance grounded in centre policies and NQS best practice. Help with daily interactions, programming ideas, behaviour guidance strategies, and professional development. Reference the centre\'s specific teaching approaches and philosophy.',
  }

  return `You are Kiros AI — the intelligent operations assistant for Kiros Early Education Centre.

IDENTITY & EXPERTISE:
- You are an expert in Australian Early Childhood Education and Care (ECEC)
- You specialise in the National Quality Framework (NQF), National Quality Standard (NQS), and the 7 Quality Areas
- You are deeply knowledgeable about the Early Years Learning Framework (EYLF) V2.0
- You understand NSW Education and Care Services National Law and National Regulations
- You are trained on the Assessment and Rating (A&R) process under ACECQA
- You provide practical guidance on early childhood centre operations, programming, compliance, and best practice

SERVICE DETAILS:
${serviceDetails}

YOUR ROLE WITH THIS USER:
You are speaking with the ${roleLabel}.
${roleInstructions[role] || 'Provide helpful guidance appropriate to the user\'s role.'}

CENTRE KNOWLEDGE BASE:
The following is extracted from Kiros's actual documents — QIP goals, philosophy, policies, procedures, and practices. Reference these specifically in your answers.
${centreContext}

STAFF DIRECTORY:
${staffList}

RESPONSE RULES:
1. ALWAYS cite your sources when referencing centre information:
   - For QIP goals: [Source: QIP Goal — {title}]
   - For policies: [Source: Policy — {title}]
   - For procedures: [Source: Procedure — {title}]
   - For philosophy: [Source: Philosophy — {title}]
   - For teaching approaches: [Source: Teaching Approach — {title}]
   - For NSW regulations: [Source: NSW Regulation {number}]
   - For NQS elements: [Source: NQS Element {code}]

2. Use Markdown formatting in ALL responses:
   - Use ## headings for sections
   - Use **bold** for key terms and names
   - Use bullet lists for multiple points
   - Use tables for structured data
   - Use > blockquotes for direct policy/regulation quotes

3. When generating documents (reports, letters, policies, plans):
   - Use the generate_document tool
   - Include professional structure: title, date, executive summary, body sections, recommendations
   - Include Kiros branding language and philosophy references
   - Cite all sources within the document
   - Always ask what format the user wants if not specified (PDF, Word, Excel, HTML, Markdown)

4. When suggesting actions (create task, assign training, update items):
   - ALWAYS use confirmation — return pending_action objects so the user can approve/cancel
   - Include specific details: who, what, when, priority
   - Explain WHY you are suggesting this action, linked to QIP goals or compliance

5. When answering operational questions:
   - Query the relevant platform data using tools (do not guess)
   - Present data in structured tables or lists
   - Highlight items needing attention (overdue, expired, non-compliant)
   - Suggest next actions with rationale

6. SCOPE: Only discuss early childhood education, centre operations, compliance, and related topics. Politely redirect off-topic queries.

7. Use Australian English spelling (organisation, programme is acceptable for EYLF references, colour, etc.)

8. Reference NQS element codes (e.g., 1.1.1, 2.2.3) and NSW regulation numbers (e.g., Regulation 77, Regulation 155, Section 165) where relevant.

9. Today's date is ${new Date().toISOString().split('T')[0]}`
}

// Cached system prompt — splits static and dynamic content for Anthropic prompt caching
export function buildSystemPromptCached(
  role: string,
  centreContext: string,
  staffList: string,
  serviceDetails: string,
): Anthropic.TextBlockParam[] {
  const systemPromptText = buildSystemPrompt(role, centreContext, staffList, serviceDetails)

  // Split into cacheable blocks:
  // Block 1: Static instructions + role context (cached across requests with same prefix)
  // Block 2: Dynamic context (centre context, staff, service details)
  const knowledgeBaseIdx = systemPromptText.indexOf('CENTRE KNOWLEDGE BASE:')
  if (knowledgeBaseIdx === -1) {
    return [
      { type: 'text', text: systemPromptText, cache_control: { type: 'ephemeral' } },
    ]
  }

  const staticPart = systemPromptText.substring(0, knowledgeBaseIdx)
  const dynamicPart = systemPromptText.substring(knowledgeBaseIdx)

  return [
    { type: 'text', text: staticPart, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: dynamicPart, cache_control: { type: 'ephemeral' } },
  ]
}

export const ALL_TOOLS: (Anthropic.Tool & { allowedRoles: string[] })[] = [
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
        action_type: { type: 'string', enum: ['create_task', 'assign_training', 'create_checklist_instance', 'update_element', 'view_item'] },
        action_payload: { type: 'object', description: 'Data needed to action the suggestion if approved' },
        related_qa: { type: 'array', items: { type: 'integer' }, description: 'Related QA areas (1-7)' },
      },
      required: ['title', 'content'],
    },
    allowedRoles: ['manager', 'el', 'educator'],
  },
  {
    name: 'generate_document',
    description: 'Generate a formatted document that the user can view and download. Use this for reports, letters, policies, plans, checklists, meeting agendas, parent communications, board reports, or any other document the user requests. Format the content in Markdown.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Document title' },
        document_type: { type: 'string', enum: ['report', 'letter', 'policy', 'plan', 'checklist', 'agenda', 'communication', 'guide', 'summary', 'other'], description: 'Type of document' },
        content: { type: 'string', description: 'Full document content in Markdown format. Include headings, lists, tables, and formatting as appropriate.' },
        recipient: { type: 'string', description: 'Who this document is for (if applicable)' },
      },
      required: ['title', 'document_type', 'content'],
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'get_policies',
    description: 'Get policies with content, review schedule, and staff acknowledgement status',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Filter by policy category' },
        status: { type: 'string', description: 'Filter by status (e.g. active, draft, archived)' },
        qa_number: { type: 'integer', description: 'Filter by related QA area (1-7)' },
        search: { type: 'string', description: 'Search keyword in policy title or content' },
      },
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'get_checklists',
    description: 'Get checklist templates, today\'s instances, and completion status',
    input_schema: {
      type: 'object' as const,
      properties: {
        template_name: { type: 'string', description: 'Filter by template name' },
        date: { type: 'string', description: 'Date to check instances for (YYYY-MM-DD). Defaults to today.' },
        status: { type: 'string', description: 'Filter instances by status' },
        category: { type: 'string', description: 'Filter by checklist category' },
      },
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'get_roster_data',
    description: 'Get staff roster shifts, leave requests, and room coverage',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'Date to check roster for (YYYY-MM-DD). Defaults to today.' },
        room: { type: 'string', description: 'Filter by room name' },
        staff_name: { type: 'string', description: 'Filter by staff member name' },
        week: { type: 'boolean', description: 'If true, return full week of data starting from the given date' },
      },
    },
    allowedRoles: ['admin', 'manager', 'ns'],
  },
  {
    name: 'get_registers',
    description: 'Get register definitions and entries (visitor, medication, maintenance, etc.)',
    input_schema: {
      type: 'object' as const,
      properties: {
        register_name: { type: 'string', description: 'Filter by register name' },
        date_from: { type: 'string', description: 'Start date for entries (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date for entries (YYYY-MM-DD)' },
      },
    },
    allowedRoles: ['admin', 'ns', 'manager'],
  },
  {
    name: 'get_forms',
    description: 'Get form submissions (family surveys, reflections, meeting minutes, etc.)',
    input_schema: {
      type: 'object' as const,
      properties: {
        form_type: { type: 'string', description: 'Filter by form type' },
        room: { type: 'string', description: 'Filter by room' },
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        status: { type: 'string', description: 'Filter by submission status' },
      },
    },
    allowedRoles: ['admin', 'ns', 'manager', 'el'],
  },
  {
    name: 'get_learning_data',
    description: 'Get learning pathways, PDP goals, certificates, and staff development data',
    input_schema: {
      type: 'object' as const,
      properties: {
        staff_name: { type: 'string', description: 'Filter by staff member name' },
        data_type: { type: 'string', enum: ['pathways', 'pdp_goals', 'certificates', 'all'], description: 'Type of learning data to retrieve. Defaults to all.' },
      },
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'get_compliance_items',
    description: 'Get compliance tracking items with regulation details and status',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by status (e.g. action_required, completed, in_progress)' },
        assigned_to_name: { type: 'string', description: 'Filter by assigned staff member name' },
      },
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'get_activity_log',
    description: 'Get recent activity across the platform for audit and tracking',
    input_schema: {
      type: 'object' as const,
      properties: {
        entity_type: { type: 'string', description: 'Filter by entity type (e.g. task, policy, checklist)' },
        user_name: { type: 'string', description: 'Filter by user name' },
        days: { type: 'integer', description: 'Number of days to look back. Defaults to 7.' },
        limit: { type: 'integer', description: 'Max number of entries to return. Defaults to 25.' },
      },
    },
    allowedRoles: ['admin', 'ns'],
  },
  {
    name: 'get_documents',
    description: 'Get uploaded documents and SharePoint synced documents',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Filter by document category' },
        qa_area: { type: 'integer', description: 'Filter by related QA area (1-7)' },
        search: { type: 'string', description: 'Search keyword in document name or description' },
      },
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'get_room_data',
    description: 'Get room configurations, capacities, and ratio requirements',
    input_schema: {
      type: 'object' as const,
      properties: {
        room_name: { type: 'string', description: 'Filter by room name' },
      },
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'search_platform',
    description: 'Search across multiple platform areas by keyword',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search keyword' },
        areas: { type: 'array', items: { type: 'string', enum: ['tasks', 'policies', 'checklists', 'training', 'compliance', 'context'] }, description: 'Platform areas to search. Defaults to all.' },
      },
      required: ['query'],
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'update_item',
    description: 'Update a task, compliance item, or QA element status. Returns a confirmation request — the user must confirm before changes are made.',
    input_schema: {
      type: 'object' as const,
      properties: {
        item_type: { type: 'string', enum: ['task', 'compliance_item', 'qa_element'], description: 'Type of item to update' },
        item_id: { type: 'string', description: 'UUID of the item to update' },
        updates: { type: 'object', description: 'Key-value pairs of fields to update' },
      },
      required: ['item_type', 'item_id', 'updates'],
    },
    allowedRoles: ['admin', 'ns', 'manager'],
  },
  {
    name: 'create_checklist_instance',
    description: 'Create a new checklist instance from a template. Returns confirmation request.',
    input_schema: {
      type: 'object' as const,
      properties: {
        template_name: { type: 'string', description: 'Name of the checklist template to instantiate' },
        assigned_to_name: { type: 'string', description: 'Full name of person to assign to' },
        due_date: { type: 'string', description: 'Due date as YYYY-MM-DD' },
      },
      required: ['template_name'],
    },
    allowedRoles: ['admin', 'ns', 'manager'],
  },
  {
    name: 'export_document',
    description: 'Export a document in a specific format (PDF, Word, Excel, HTML, Markdown, JSON). Use this when the user asks to download or export generated content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Document title' },
        content: { type: 'string', description: 'Document content (Markdown or plain text)' },
        format: { type: 'string', enum: ['pdf', 'docx', 'xlsx', 'html', 'md', 'json'], description: 'Export format' },
        recipient: { type: 'string', description: 'Who this document is for (if applicable)' },
      },
      required: ['title', 'content', 'format'],
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
]

// Supabase client type that works for both cookie-based and service-role clients
type SupabaseClient = ReturnType<typeof createServiceRoleClient>

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
  userRole: string = 'educator'
): Promise<string> {
  // Validate role-based access before executing any tool
  const toolDef = ALL_TOOLS.find(t => t.name === toolName)
  if (toolDef && !toolDef.allowedRoles.includes(userRole)) {
    return JSON.stringify({ error: `Tool "${toolName}" is not available for role "${userRole}"` })
  }

  switch (toolName) {
    case 'search_centre_context': {
      let query = supabase.from('centre_context').select('context_type, title, content, related_qa, related_element_codes, source_quote').eq('is_active', true)
      // Text search: filter by query against title and content
      if (toolInput.query && typeof toolInput.query === 'string' && toolInput.query.trim()) {
        const searchTerms = toolInput.query.trim().split(/\s+/).filter(Boolean)
        // Use OR across title/content for each term to find relevant entries
        const orConditions = searchTerms.map(term => `title.ilike.%${term}%,content.ilike.%${term}%`).join(',')
        query = query.or(orConditions)
      }
      if (Array.isArray(toolInput.context_types) && toolInput.context_types.length) {
        query = query.in('context_type', toolInput.context_types)
      }
      if (Array.isArray(toolInput.qa_numbers) && toolInput.qa_numbers.length) {
        query = query.overlaps('related_qa', toolInput.qa_numbers)
      }
      const { data } = await query.limit(20)
      return JSON.stringify(data || [])
    }

    case 'create_task': {
      const assignedName = (toolInput.assigned_to_name as string) || 'unassigned'
      const dueDate = (toolInput.due_date as string) || 'no due date'
      const priority = (toolInput.priority as string) || 'medium'
      return JSON.stringify({
        pending_action: {
          id: crypto.randomUUID(),
          action_type: 'create_task',
          description: `Create task: ${toolInput.title} assigned to ${assignedName}, due ${dueDate}, priority ${priority}`,
          details: {
            title: toolInput.title,
            description: (toolInput.description as string) || null,
            priority,
            assigned_to_name: (toolInput.assigned_to_name as string) || null,
            due_date: (toolInput.due_date as string) || null,
          },
        },
      })
    }

    case 'assign_training': {
      const dueDate = (toolInput.due_date as string) || 'no due date'
      return JSON.stringify({
        pending_action: {
          id: crypto.randomUUID(),
          action_type: 'assign_training',
          description: `Assign training "${toolInput.module_title}" to ${toolInput.staff_name}, due ${dueDate}`,
          details: {
            module_title: toolInput.module_title,
            staff_name: toolInput.staff_name,
            due_date: (toolInput.due_date as string) || null,
          },
        },
      })
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

    case 'generate_document': {
      return JSON.stringify({
        type: 'document',
        title: toolInput.title,
        document_type: toolInput.document_type,
        content: toolInput.content,
        recipient: toolInput.recipient || null,
        generated_at: new Date().toISOString(),
      })
    }

    case 'get_policies': {
      let query = supabase.from('policies').select('id, title, summary, status, next_review_date, related_qa, policy_categories(name)')
      if (toolInput.category) query = query.ilike('policy_categories.name', `%${toolInput.category}%`)
      if (toolInput.status) query = query.eq('status', toolInput.status)
      if (toolInput.qa_number) query = query.contains('related_qa', [toolInput.qa_number])
      if (toolInput.search) query = query.or(`title.ilike.%${toolInput.search}%,summary.ilike.%${toolInput.search}%`)
      const { data: policies } = await query.limit(20)
      const policyIds = (policies || []).map(p => p.id)
      let acknowledgements: { policy_id: string }[] = []
      if (policyIds.length > 0) {
        const { data } = await supabase.from('policy_acknowledgements').select('policy_id').in('policy_id', policyIds)
        acknowledgements = data || []
      }
      const result = (policies || []).map(p => ({
        ...p,
        acknowledgement_count: acknowledgements.filter(a => a.policy_id === p.id).length,
      }))
      return JSON.stringify(result)
    }

    case 'get_checklists': {
      let templateQuery = supabase.from('checklist_templates').select('id, name, frequency, checklist_categories(name)')
      if (toolInput.template_name) templateQuery = templateQuery.ilike('name', `%${toolInput.template_name}%`)
      if (toolInput.category) templateQuery = templateQuery.ilike('checklist_categories.name', `%${toolInput.category}%`)
      const { data: templates } = await templateQuery.limit(20)

      const targetDate = (toolInput.date as string) || new Date().toISOString().split('T')[0]
      let instanceQuery = supabase.from('checklist_instances').select('id, name, status, due_date, failed_items, template_id')
        .eq('due_date', targetDate)
      if (toolInput.status) instanceQuery = instanceQuery.eq('status', toolInput.status)
      const { data: instances } = await instanceQuery.limit(30)

      return JSON.stringify({ templates: templates || [], instances: instances || [] })
    }

    case 'get_roster_data': {
      const targetDate = (toolInput.date as string) || new Date().toISOString().split('T')[0]
      let shiftQuery = supabase.from('roster_shifts').select('id, shift_date, start_time, end_time, profiles(full_name), rooms(name)')
      if (toolInput.week) {
        const endDate = new Date(targetDate)
        endDate.setDate(endDate.getDate() + 6)
        shiftQuery = shiftQuery.gte('shift_date', targetDate).lte('shift_date', endDate.toISOString().split('T')[0])
      } else {
        shiftQuery = shiftQuery.eq('shift_date', targetDate)
      }
      if (toolInput.room) shiftQuery = shiftQuery.ilike('rooms.name', `%${toolInput.room}%`)
      if (toolInput.staff_name) shiftQuery = shiftQuery.ilike('profiles.full_name', `%${toolInput.staff_name}%`)
      const { data: shifts } = await shiftQuery.limit(50)

      const { data: leaveRequests } = await supabase.from('leave_requests').select('id, status, start_date, end_date, leave_type, profiles(full_name)')
        .gte('end_date', targetDate).lte('start_date', targetDate).limit(20)

      const { data: programmingTime } = await supabase.from('programming_time').select('id, week_starting, actual_hours, profiles(full_name)')
        .eq('week_starting', targetDate).limit(20)

      return JSON.stringify({ shifts: shifts || [], leave_requests: leaveRequests || [], programming_time: programmingTime || [] })
    }

    case 'get_registers': {
      let defQuery = supabase.from('register_definitions').select('id, name, description, columns')
      if (toolInput.register_name) defQuery = defQuery.ilike('name', `%${toolInput.register_name}%`)
      const { data: definitions } = await defQuery.limit(20)

      const defIds = (definitions || []).map(d => d.id)
      let entryQuery = supabase.from('register_entries').select('id, register_id, row_data, created_at')
      if (defIds.length > 0) entryQuery = entryQuery.in('register_id', defIds)
      if (toolInput.date_from) entryQuery = entryQuery.gte('created_at', toolInput.date_from)
      if (toolInput.date_to) entryQuery = entryQuery.lte('created_at', toolInput.date_to)
      const { data: entries } = await entryQuery.order('created_at', { ascending: false }).limit(50)

      return JSON.stringify({ definitions: definitions || [], entries: entries || [] })
    }

    case 'get_forms': {
      let query = supabase.from('form_submissions').select('id, form_type, data, status, room, created_at, profiles(full_name)')
      if (toolInput.form_type) query = query.eq('form_type', toolInput.form_type)
      if (toolInput.room) query = query.ilike('room', `%${toolInput.room}%`)
      if (toolInput.date_from) query = query.gte('created_at', toolInput.date_from)
      if (toolInput.status) query = query.eq('status', toolInput.status)
      const { data } = await query.order('created_at', { ascending: false }).limit(20)
      return JSON.stringify(data || [])
    }

    case 'get_learning_data': {
      const dataType = (toolInput.data_type as string) || 'all'
      let staffFilter: string | null = null

      if (userRole === 'educator') {
        staffFilter = userId
      } else if (toolInput.staff_name) {
        const { data: staffProfile } = await supabase.from('profiles').select('id, full_name')
          .ilike('full_name', `%${toolInput.staff_name}%`).limit(1).single()
        staffFilter = staffProfile?.id || null
      }

      const results: Record<string, unknown> = {}

      if (dataType === 'pathways' || dataType === 'all') {
        const { data: pathways } = await supabase.from('lms_pathways').select('id, title, description').limit(20)
        let enrollQuery = supabase.from('lms_pathway_enrollments').select('id, status, started_at, completed_at, lms_pathways(title), profiles(full_name)')
        if (staffFilter) enrollQuery = enrollQuery.eq('user_id', staffFilter)
        const { data: enrollments } = await enrollQuery.limit(30)
        results.pathways = pathways || []
        results.pathway_enrollments = enrollments || []
      }

      if (dataType === 'pdp_goals' || dataType === 'all') {
        let goalsQuery = supabase.from('lms_pdp_goals').select('id, title, description, status, target_date, profiles(full_name)')
        if (staffFilter) goalsQuery = goalsQuery.eq('user_id', staffFilter)
        const { data: goals } = await goalsQuery.limit(30)

        let reviewsQuery = supabase.from('lms_pdp_reviews').select('id, review_period, goals_summary, reviewed_at, lms_pdp_goals(title)')
        if (staffFilter) reviewsQuery = reviewsQuery.eq('user_id', staffFilter)
        const { data: reviews } = await reviewsQuery.limit(20)

        results.pdp_goals = goals || []
        results.pdp_reviews = reviews || []
      }

      if (dataType === 'certificates' || dataType === 'all') {
        let certQuery = supabase.from('lms_certificates').select('id, title, issued_date, expiry_date, profiles(full_name)')
        if (staffFilter) certQuery = certQuery.eq('user_id', staffFilter)
        const { data: certs } = await certQuery.limit(30)
        results.certificates = certs || []
      }

      return JSON.stringify(results)
    }

    case 'get_compliance_items': {
      let query = supabase.from('compliance_items').select('id, regulation, description, status, notes, evidence, profiles(full_name)')
      if (toolInput.status) query = query.eq('status', toolInput.status)
      if (toolInput.assigned_to_name) {
        const { data: staffProfile } = await supabase.from('profiles').select('id')
          .ilike('full_name', `%${toolInput.assigned_to_name}%`).limit(1).single()
        if (staffProfile) query = query.eq('assigned_to', staffProfile.id)
      }
      const { data } = await query.limit(30)
      return JSON.stringify(data || [])
    }

    case 'get_activity_log': {
      const days = (toolInput.days as number) || 7
      const limit = (toolInput.limit as number) || 25
      const sinceDate = new Date()
      sinceDate.setDate(sinceDate.getDate() - days)

      let query = supabase.from('activity_log').select('id, action, entity_type, entity_id, created_at, profiles(full_name)')
        .gte('created_at', sinceDate.toISOString())
      if (toolInput.entity_type) query = query.eq('entity_type', toolInput.entity_type)
      if (toolInput.user_name) {
        const { data: staffProfile } = await supabase.from('profiles').select('id')
          .ilike('full_name', `%${toolInput.user_name}%`).limit(1).single()
        if (staffProfile) query = query.eq('user_id', staffProfile.id)
      }
      const { data } = await query.order('created_at', { ascending: false }).limit(limit)
      return JSON.stringify(data || [])
    }

    case 'get_documents': {
      let docQuery = supabase.from('documents').select('id, name, file_type, qa_area, description, created_at')
      if (toolInput.category) docQuery = docQuery.eq('category', toolInput.category)
      if (toolInput.qa_area) docQuery = docQuery.eq('qa_area', toolInput.qa_area)
      if (toolInput.search) docQuery = docQuery.or(`name.ilike.%${toolInput.search}%,description.ilike.%${toolInput.search}%`)
      const { data: docs } = await docQuery.order('created_at', { ascending: false }).limit(20)

      // sharepoint_documents: file_name (not name), file_type, no category/qa_area/description columns
      let spQuery = supabase.from('sharepoint_documents').select('id, file_name, file_type, document_type, created_at')
      if (toolInput.search) spQuery = spQuery.ilike('file_name', `%${toolInput.search}%`)
      const { data: spDocs } = await spQuery.order('created_at', { ascending: false }).limit(20)

      return JSON.stringify({ documents: docs || [], sharepoint_documents: spDocs || [] })
    }

    case 'get_room_data': {
      let roomQuery = supabase.from('rooms').select('id, name, age_group, licensed_capacity, ratio_children, ratio_educators')
      if (toolInput.room_name) roomQuery = roomQuery.ilike('name', `%${toolInput.room_name}%`)
      const { data: rooms } = await roomQuery.limit(20)

      const { data: ratioRules } = await supabase.from('ratio_rules').select('id, age_group, children_per_educator, state, description').limit(20)

      return JSON.stringify({ rooms: rooms || [], ratio_rules: ratioRules || [] })
    }

    case 'search_platform': {
      const searchQuery = toolInput.query as string
      const areas = (toolInput.areas as string[]) || ['tasks', 'policies', 'checklists', 'training', 'compliance', 'context']
      const results: Record<string, unknown[]> = {}

      if (areas.includes('tasks')) {
        const { data } = await supabase.from('tasks').select('id, title, status, priority')
          .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`).limit(5)
        results.tasks = (data || []).map(d => ({ type: 'task', title: d.title, snippet: `Status: ${d.status}, Priority: ${d.priority}` }))
      }
      if (areas.includes('policies')) {
        const { data } = await supabase.from('policies').select('id, title, status, summary')
          .or(`title.ilike.%${searchQuery}%,summary.ilike.%${searchQuery}%`).limit(5)
        results.policies = (data || []).map(d => ({ type: 'policy', title: d.title, snippet: d.summary || d.status }))
      }
      if (areas.includes('checklists')) {
        const { data } = await supabase.from('checklist_templates').select('id, name, frequency')
          .ilike('name', `%${searchQuery}%`).limit(5)
        results.checklists = (data || []).map(d => ({ type: 'checklist', title: d.name, snippet: `Frequency: ${d.frequency}` }))
      }
      if (areas.includes('training')) {
        const { data } = await supabase.from('lms_modules').select('id, title, tier, status')
          .ilike('title', `%${searchQuery}%`).limit(5)
        results.training = (data || []).map(d => ({ type: 'training', title: d.title, snippet: `Tier: ${d.tier}, Status: ${d.status}` }))
      }
      if (areas.includes('compliance')) {
        const { data } = await supabase.from('compliance_items').select('id, regulation, description, status')
          .or(`regulation.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`).limit(5)
        results.compliance = (data || []).map(d => ({ type: 'compliance', title: d.regulation, snippet: d.description || d.status }))
      }
      if (areas.includes('context')) {
        const { data } = await supabase.from('centre_context').select('id, title, content, context_type')
          .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`).eq('is_active', true).limit(5)
        results.context = (data || []).map(d => ({ type: d.context_type, title: d.title, snippet: d.content?.substring(0, 150) }))
      }

      return JSON.stringify(results)
    }

    case 'update_item': {
      const itemType = toolInput.item_type as string
      const itemId = toolInput.item_id as string
      const updates = toolInput.updates as Record<string, unknown>
      const updateDesc = Object.entries(updates).map(([k, v]) => `${k} to '${v}'`).join(', ')
      return JSON.stringify({
        pending_action: {
          id: crypto.randomUUID(),
          action_type: 'update_item',
          description: `Update ${itemType} ${itemId}: set ${updateDesc}`,
          details: { item_type: itemType, item_id: itemId, updates },
        },
      })
    }

    case 'create_checklist_instance': {
      const templateName = toolInput.template_name as string
      const assignedName = (toolInput.assigned_to_name as string) || 'unassigned'
      const dueDate = (toolInput.due_date as string) || new Date().toISOString().split('T')[0]
      return JSON.stringify({
        pending_action: {
          id: crypto.randomUUID(),
          action_type: 'create_checklist_instance',
          description: `Create checklist instance from "${templateName}" assigned to ${assignedName}, due ${dueDate}`,
          details: {
            template_name: templateName,
            assigned_to_name: (toolInput.assigned_to_name as string) || null,
            due_date: dueDate,
          },
        },
      })
    }

    case 'export_document': {
      return JSON.stringify({
        export_ready: true,
        title: toolInput.title,
        format: toolInput.format,
        content: toolInput.content,
        recipient: toolInput.recipient || null,
        download_url: '/api/documents/export',
      })
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` })
  }
}
