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

export function buildSystemPrompt(role: string, centreContext: string, staffList: string, serviceDetails: string, learningsSection?: string) {
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
- You are a LEARNING assistant — you continuously improve by remembering corrections, preferences, insights, and patterns across every conversation

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

${learningsSection || ''}

${LEARNING_PROTOCOL}

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

3. When generating documents, you MUST use the generate_document tool and follow these type-specific templates:

   **REPORT** (board reports, compliance reports, QIP reports, analysis reports):
   Sections: # Title → metadata table (Date, Author, Recipient, Version) → ## Executive Summary → ## Key Findings (use tables for data) → ## Detailed Analysis (subsections per topic, cite NQS elements) → ## Recommendations (numbered, actionable) → ## Next Steps & Timeline (table with responsible person, deadline)

   **LETTER** (parent letters, regulatory correspondence, staff communications):
   Sections: Letterhead block (Kiros Early Education, address, date, reference number) → Recipient details → Salutation → ## Purpose → Body paragraphs → ## Action Required (if any) → Professional closing → Signatory block (name, title, centre)

   **POLICY** (centre policies, procedures):
   Sections: # Policy Title → metadata table (Policy Number, Version, Effective Date, Review Date, Approved By) → ## Purpose → ## Scope → ## Definitions (table if >3 terms) → ## Policy Statement → ## Procedures (numbered steps) → ## Related Legislation & Standards (cite NQS elements, NSW regulations) → ## Review Schedule

   **PLAN** (QIP plans, improvement plans, action plans, strategic plans):
   Sections: # Plan Title → metadata table → ## Overview & Context → ## SMART Objectives (table: Objective, Measure, Target, Timeframe) → ## Strategies & Actions (table: Action, Responsible, Resources, Timeline, Status) → ## Success Measures & Evidence → ## Review & Evaluation Schedule

   **CHECKLIST** (compliance checklists, audit checklists, daily checklists):
   Sections: # Checklist Title → metadata (Purpose, Frequency, Responsible Role) → checklist items as task list (- [ ] format) grouped by category → ## Completion & Sign-off section (table: Completed By, Date, Signature, Notes)

   **AGENDA** (team meetings, board meetings, planning meetings):
   Sections: # Meeting Title → details table (Date, Time, Location, Chair, Attendees, Apologies) → ## Purpose → ## Action Items from Previous Meeting (table: Action, Owner, Status) → ## Agenda Items (numbered with time allocations table: #, Item, Presenter, Duration) → ## Any Other Business → ## Next Meeting Date

   **COMMUNICATION** (newsletters, parent updates, staff bulletins):
   Sections: # Title → metadata (Audience, Channel, Date) → ## Key Messages (3-5 bullet points) → ## Detail sections → ## Call to Action → ## Contact Information

   **GUIDE** (how-to guides, onboarding guides, procedure guides):
   Sections: # Guide Title → ## Purpose & Audience → ## Prerequisites (if any) → ## Step-by-Step Instructions (### numbered sections with clear actions) → ## Tips & Best Practice (blockquotes for key tips) → ## Frequently Asked Questions → ## References & Resources

   **SUMMARY** (meeting summaries, briefing notes, executive summaries):
   Sections: # Title → metadata (Date, Context, Prepared By) → ## Context → ## Key Points (concise bullets) → ## Data Highlights (table if applicable) → ## Implications & Actions → ## Conclusion

   **OTHER**: Use # Title → metadata → ## Purpose → ## Body (appropriate subsections) → ## Conclusion/Next Steps

   Across ALL document types: use Australian English, reference Kiros Early Education philosophy, cite NQS element codes and NSW regulations where relevant, use tables for structured data, bold for key terms, blockquotes for regulatory callouts. Always ask the user what export format they want if not specified (PDF, Word, Excel, HTML, Markdown).

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

// Shared learning protocol instructions — used by both hardcoded and DB-driven prompt paths
const LEARNING_PROTOCOL = `CONTINUOUS LEARNING PROTOCOL:
You have a persistent memory that spans across all conversations. This is what makes you different from a generic AI — you get better every time someone talks to you.

**At the START of every conversation:**
1. Call get_learnings with the user's role to load relevant prior learnings
2. Silently review these learnings and let them shape your responses — do NOT list them to the user unless asked
3. Pay special attention to corrections (things you got wrong before) and preferences (how this user likes to receive information)

**DURING conversations — save learnings when:**
- The user corrects you → save as "correction" with what you said wrong and what's actually right
- The user says "I prefer...", "don't do...", "always...", "we actually..." → save as "preference"
- You discover a fact about the centre not in the knowledge base → save as "domain_insight"
- You learn how a process actually works here (vs. generic ECEC knowledge) → save as "process_knowledge"
- You learn about who does what, reports to whom, or covers which room → save as "relationship"
- The user tells you something has changed (new staff, room change, policy update) → save as "context_update"

**Save silently** — do not announce "I've saved this learning" every time. Just do it. Only mention it if the user explicitly asks what you've learned or if acknowledging it is natural (e.g., "Got it, I'll remember that for next time.").

**When you're unsure:** If a past learning conflicts with what the user is saying now, trust the current conversation and update the learning. Things change — your job is to stay current.

**Learning quality rules:**
- Be specific: "Rony prefers tables for staff compliance data" not "user likes tables"
- Include the why: "Don't suggest group time for under-2s — Kiros follows RIE-inspired practice in the nursery room"
- Set lower confidence (0.5-0.6) for things you infer, higher (0.9-1.0) for explicit corrections
- Set expiry dates for temporary facts (e.g., relief staff, short-term room changes)
- Use tags so future searches find the right learnings

AGENT DELEGATION & FEEDBACK:
When you delegate to specialist agents, you are responsible for quality control.

**After receiving agent results:**
1. Critically evaluate the response — does it match what you know from your learnings and the centre context?
2. If the response is good and the user accepts it, call record_agent_feedback with "accepted"
3. If you need to significantly supplement or correct the agent's response, record "supplemented" or "corrected" with details
4. If the user explicitly says an agent's response was wrong, record "rejected" with what was wrong

**Before delegating:** Check get_learnings for any past corrections related to the agent or topic — pass these as context so the agent doesn't repeat past mistakes.`

// Build agent registry section for the master prompt — lists active specialist agents with performance data
async function buildAgentRegistrySection(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<string> {
  try {
    const { data: agents } = await supabase
      .from('ai_agent_definitions')
      .select('name, description, routing_description, domain_tags, routing_keywords, priority')
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (!agents || agents.length === 0) return ''

    // Load agent performance data
    const { data: performance } = await supabase
      .from('ai_agent_performance')
      .select('*')

    const perfMap = new Map((performance || []).map((p: { agent_name: string; acceptance_rate?: number; avg_quality?: number; total_interactions?: number; corrected_count?: number }) => [p.agent_name, p]))

    const agentLines = agents.map((a: { name: string; routing_description?: string; description?: string; domain_tags?: string[]; routing_keywords?: string[] }) => {
      const tags = (a.domain_tags || []).join(', ')
      const keywords = (a.routing_keywords || []).join(', ')
      const perf = perfMap.get(a.name) as { acceptance_rate?: number; avg_quality?: number; total_interactions?: number; corrected_count?: number } | undefined
      const perfLine = perf
        ? `  Track record: ${perf.total_interactions} interactions, ${perf.acceptance_rate ?? 0}% accepted, avg quality ${perf.avg_quality ?? 'N/A'}/5${(perf.corrected_count ?? 0) > 0 ? ` (${perf.corrected_count} corrections — check learnings before delegating)` : ''}`
        : '  Track record: New agent — no feedback yet'
      return `- **${a.name}**: ${a.routing_description || a.description || 'Specialist agent'}
  Domain: ${tags || 'General'}
  Keywords: ${keywords || 'N/A'}
${perfLine}`
    }).join('\n')

    return `SPECIALIST AGENTS:
You have access to specialist agents via the delegate_to_agents tool.
When a user's question falls within a specialist's domain, delegate to them for in-depth analysis rather than answering directly with general knowledge.
You may delegate to multiple agents in parallel if the question spans multiple domains.
After receiving agent results, synthesise them into a single cohesive response for the user. Cite which agent provided which insight.
Only delegate for substantive domain questions — for simple greetings, clarifications, or general chat, respond directly.

Available agents:
${agentLines}

ROUTING RULES:
1. If the query clearly maps to one agent's domain, delegate to that single agent.
2. If the query spans multiple domains (e.g., "How are we doing on QA1 and QA4?"), delegate to multiple agents in parallel.
3. For general operations questions that don't need specialist depth, answer directly using your tools.
4. Always pass relevant conversation context to delegated agents.
5. When presenting agent results, cite which agent provided which insight.
6. You may still use your own tools alongside delegation when needed.
7. For agents with corrections in their track record, call get_learnings with tags for that agent before delegating — include past corrections as context so the agent doesn't repeat mistakes.
8. After every delegation, record feedback using record_agent_feedback — this is how agents improve.`
  } catch {
    return '' // Non-critical — master agent works fine without specialist routing
  }
}

// Load high-priority learnings to inject into the system prompt
async function buildLearningsSection(
  supabase: ReturnType<typeof createServiceRoleClient>,
  role: string,
): Promise<string> {
  try {
    // Load the most important learnings: corrections first, then high-confidence insights
    const { data: learnings } = await supabase
      .from('ai_learnings')
      .select('learning_type, category, title, content, confidence, times_reinforced, qa_areas, tags')
      .eq('is_active', true)
      .or(`applies_to_roles.eq.{},applies_to_roles.cs.{${role}}`)
      .order('learning_type', { ascending: true }) // corrections sort first alphabetically
      .order('confidence', { ascending: false })
      .order('times_reinforced', { ascending: false })
      .limit(30)

    if (!learnings || learnings.length === 0) return ''

    // Filter out expired
    const now = new Date()
    const active = learnings

    // Group by type for readability
    const corrections = active.filter((l: { learning_type: string }) => l.learning_type === 'correction')
    const preferences = active.filter((l: { learning_type: string }) => l.learning_type === 'preference')
    const insights = active.filter((l: { learning_type: string }) => ['domain_insight', 'process_knowledge', 'relationship', 'context_update'].includes(l.learning_type))

    const sections: string[] = ['PRIOR LEARNINGS (from past conversations — apply these silently):']

    if (corrections.length > 0) {
      sections.push('**Corrections (things you got wrong before — do NOT repeat these mistakes):**')
      corrections.forEach((l: { title: string; content: string; confidence: number }) => {
        sections.push(`- ${l.title}: ${l.content} [confidence: ${l.confidence}]`)
      })
    }

    if (preferences.length > 0) {
      sections.push('**User preferences:**')
      preferences.forEach((l: { title: string; content: string }) => {
        sections.push(`- ${l.title}: ${l.content}`)
      })
    }

    if (insights.length > 0) {
      sections.push('**Centre insights & context:**')
      insights.forEach((l: { title: string; content: string; learning_type: string }) => {
        sections.push(`- [${l.learning_type}] ${l.title}: ${l.content}`)
      })
    }

    return sections.join('\n')
  } catch {
    return '' // Non-critical
  }
}

// DB-driven system prompt — loads editable sections from ai_system_prompts table
export async function buildSystemPromptFromDB(
  role: string,
  centreContext: string,
  staffList: string,
  serviceDetails: string,
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<string> {
  try {
    const { data: prompts, error } = await supabase
      .from('ai_system_prompts')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    // Load learnings for injection
    const learningsSection = await buildLearningsSection(supabase, role)

    if (error || !prompts || prompts.length === 0) {
      // Fallback to hardcoded prompt with learnings
      return buildSystemPrompt(role, centreContext, staffList, serviceDetails, learningsSection)
    }

    const roleLabel = ROLE_LABELS[role] || 'Staff Member'

    // Group by section
    const bySection: Record<string, typeof prompts> = {}
    for (const p of prompts) {
      if (!bySection[p.section]) bySection[p.section] = []
      bySection[p.section].push(p)
    }

    // Assemble in order
    const sectionOrder = ['identity', 'expertise', 'role_instructions', 'response_rules', 'document_templates', 'custom']
    const parts: string[] = []

    for (const section of sectionOrder) {
      const rows = bySection[section] || []
      for (const row of rows) {
        // Skip role-specific rows that don't match the current user's role
        if (row.role && row.role !== role) continue
        parts.push(row.template)
      }
    }

    if (parts.length === 0) {
      return buildSystemPrompt(role, centreContext, staffList, serviceDetails)
    }

    // Variable substitution
    let assembled = parts.join('\n\n')
    const vars: Record<string, string> = {
      centre_name: 'Kiros Early Education',
      role_label: roleLabel,
      role: role,
      centre_context: centreContext,
      staff_list: staffList,
      service_details: serviceDetails,
      date: new Date().toISOString().split('T')[0],
    }
    for (const [key, val] of Object.entries(vars)) {
      assembled = assembled.replace(new RegExp(`\\{${key}\\}`, 'g'), val)
    }

    // Append learning protocol instructions + learnings data
    assembled += '\n\n' + LEARNING_PROTOCOL
    if (learningsSection) {
      assembled += '\n\n' + learningsSection
    }

    // Append agent registry section
    const agentRegistry = await buildAgentRegistrySection(supabase)
    if (agentRegistry) {
      assembled += '\n\n' + agentRegistry
    }

    return assembled
  } catch {
    return buildSystemPrompt(role, centreContext, staffList, serviceDetails)
  }
}

// Async cached version that tries DB first, falls back to hardcoded
export async function buildSystemPromptCachedFromDB(
  role: string,
  centreContext: string,
  staffList: string,
  serviceDetails: string,
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<Anthropic.TextBlockParam[]> {
  const systemPromptText = await buildSystemPromptFromDB(role, centreContext, staffList, serviceDetails, supabase)

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
    description: 'Generate a professionally formatted document for viewing and download. Use for reports, letters, policies, plans, checklists, meeting agendas, parent communications, guides, or summaries. The output must be board-ready and regulatory-review ready. Use Australian English throughout and reference Kiros Early Education philosophy where relevant. The content field must contain well-structured Markdown that converts cleanly to PDF, Word, and HTML exports.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Document title' },
        document_type: { type: 'string', enum: ['report', 'letter', 'policy', 'plan', 'checklist', 'agenda', 'communication', 'guide', 'summary', 'other'], description: 'Type of document' },
        content: { type: 'string', description: 'Full document content in well-structured Markdown. REQUIRED formatting rules: (1) Use heading hierarchy — # for document title, ## for major sections, ### for subsections. (2) Start with a metadata block as a table: Date, Author (Kiros AI Assistant), Recipient if applicable, Version 1.0. (3) Include an executive summary or purpose statement for reports, plans, and policies. (4) Use markdown tables for any structured, comparative, or tabular data. (5) Use **bold** for key terms, definitions, and emphasis. (6) Use bullet or numbered lists for sequences, action items, and collections. (7) Use blockquotes (>) for important callouts, regulatory references, or NQS citations. (8) Content must be comprehensive and suitable for board or regulatory review. (9) Australian English spelling (organisation, behaviour, colour). (10) Follow the document-type template specified in the system prompt.' },
        recipient: { type: 'string', description: 'Who this document is for (if applicable)' },
        topic_folder: { type: 'string', description: 'Topic-based folder name for organising in SharePoint. Choose based on the subject matter. Examples: "QA1 Programming", "QA2 Health & Safety", "QA3 Physical Environment", "QA4 Staffing", "QA5 Relationships", "QA6 Partnerships", "QA7 Governance", "Staff Training", "Board Reports", "Family Communication", "Compliance & Regulatory", "Policies & Procedures", "Meeting Minutes".' },
      },
      required: ['title', 'document_type', 'content', 'topic_folder'],
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
  {
    name: 'run_deep_analysis',
    description: 'Run a deep multi-perspective analysis by spawning focused research agents that work in parallel. Use this when the user requests comprehensive analysis, board reports, strategic reviews, gap analysis, or any task that benefits from examining multiple areas simultaneously. Each agent focuses on one aspect and results are synthesised into a thorough response. Only use for complex multi-faceted queries — not simple questions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        analysis_areas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              focus: { type: 'string', description: 'What this agent should analyse (e.g. "QA1 compliance gaps", "staff training needs", "family engagement status")' },
              data_tools: {
                type: 'array',
                items: { type: 'string' },
                description: 'Which data tools this agent needs (e.g. ["get_qa_progress", "get_overdue_items"])',
              },
            },
            required: ['focus', 'data_tools'],
          },
          description: 'Array of analysis areas to investigate in parallel (2-5 areas)',
        },
        synthesis_instruction: { type: 'string', description: 'How to combine the findings into the final response' },
      },
      required: ['analysis_areas', 'synthesis_instruction'],
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el'],
  },
  {
    name: 'delegate_to_agents',
    description: 'Delegate a task to one or more specialist agents who will research and respond in parallel. Use this when the user\'s question falls within a specialist agent\'s domain. You should synthesise the results into a cohesive response. Each agent has domain-specific knowledge and tools.',
    input_schema: {
      type: 'object' as const,
      properties: {
        delegations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              agent_name: { type: 'string', description: 'The name of the specialist agent to invoke (must match a registered agent name exactly)' },
              task_description: { type: 'string', description: 'What you want this agent to research or answer' },
              context: { type: 'string', description: 'Any relevant context from the conversation to pass to the agent' },
            },
            required: ['agent_name', 'task_description'],
          },
          description: 'Array of agent delegations to run in parallel (1-5 agents)',
        },
      },
      required: ['delegations'],
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'save_learning',
    description: 'Save something you learned during this conversation that will help you in future conversations. Use this when: (1) the user corrects you, (2) you discover a user preference, (3) you learn a fact about the centre that isn\'t in the knowledge base, (4) you learn how a process actually works here, (5) the user tells you about a relationship or responsibility, (6) you learn context that has changed. Be specific and actionable — future-you will rely on this.',
    input_schema: {
      type: 'object' as const,
      properties: {
        learning_type: { type: 'string', enum: ['correction', 'preference', 'domain_insight', 'process_knowledge', 'relationship', 'context_update'], description: 'Type of learning' },
        category: { type: 'string', description: 'Category: e.g., QA1-QA7, staffing, programming, compliance, operations, formatting, communication' },
        title: { type: 'string', description: 'Short descriptive title' },
        content: { type: 'string', description: 'What you learned — be specific and include why it matters' },
        original_context: { type: 'string', description: 'For corrections: what you originally said or assumed that was wrong' },
        applies_to_roles: { type: 'array', items: { type: 'string' }, description: 'Which roles this applies to. Empty = all roles.' },
        qa_areas: { type: 'array', items: { type: 'integer' }, description: 'Related QA areas (1-7)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Searchable tags' },
        confidence: { type: 'number', description: 'How confident you are (0.0-1.0). Default 0.8. Use lower for inferences, higher for explicit corrections.' },
        expires_at: { type: 'string', description: 'ISO date if this learning is time-sensitive (e.g., "relief staff member here until Friday")' },
      },
      required: ['learning_type', 'title', 'content'],
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'get_learnings',
    description: 'Retrieve past learnings relevant to the current conversation. Call this at the start of conversations and before answering questions in areas where you may have prior learnings. Filter by category, QA area, type, or search keywords.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Filter by category' },
        learning_type: { type: 'string', enum: ['correction', 'preference', 'domain_insight', 'process_knowledge', 'relationship', 'context_update'], description: 'Filter by type' },
        qa_areas: { type: 'array', items: { type: 'integer' }, description: 'Filter by QA areas (1-7)' },
        search: { type: 'string', description: 'Keyword search across title, content, and tags' },
        role: { type: 'string', description: 'Filter learnings applicable to this role' },
        limit: { type: 'integer', description: 'Max results (default 20)' },
      },
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
  {
    name: 'record_agent_feedback',
    description: 'Record feedback about a specialist agent\'s performance. Use this after presenting agent results to the user — infer feedback from the user\'s reaction. If they accept it, record "accepted". If they correct it, record "corrected" with details. This helps improve agent routing and quality over time.',
    input_schema: {
      type: 'object' as const,
      properties: {
        agent_name: { type: 'string', description: 'Name of the agent' },
        query_summary: { type: 'string', description: 'Brief summary of what was asked' },
        agent_response_summary: { type: 'string', description: 'Brief summary of what the agent answered' },
        feedback_type: { type: 'string', enum: ['accepted', 'corrected', 'rejected', 'supplemented', 'escalated'], description: 'How the response was received' },
        correction_detail: { type: 'string', description: 'For corrections/rejections: what was wrong and what was right' },
        response_quality: { type: 'integer', description: 'Quality 1-5 (1=wrong, 3=adequate, 5=excellent)' },
      },
      required: ['agent_name', 'query_summary', 'feedback_type'],
    },
    allowedRoles: ['admin', 'manager', 'ns', 'el', 'educator'],
  },
]

// Supabase client type that works for both cookie-based and service-role clients
type SupabaseClient = ReturnType<typeof createServiceRoleClient>

// Options for executeTool — extended context and callbacks
export interface ExecuteToolOptions {
  conversationId?: string
  onAgentProgress?: import('@/lib/chat/orchestrator').AgentProgressCallback
}

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
  userRole: string = 'educator',
  options?: ExecuteToolOptions,
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
      // Store document and upload to SharePoint
      try {
        const { storeAndUploadDocument } = await import('@/lib/document-storage')

        // Sanitise topic_folder from AI — strip any path traversal or slashes
        const rawTopicFolder = ((toolInput.topic_folder as string) || 'General').trim()
        const safeTopicFolder = rawTopicFolder
          .replace(/\.\./g, '')
          .replace(/[/\\]/g, '')
          .replace(/[<>:"|?*]/g, '')
          .trim() || 'General'

        const storeResult = await storeAndUploadDocument({
          title: toolInput.title as string,
          documentType: toolInput.document_type as string,
          markdownContent: toolInput.content as string,
          topicFolder: safeTopicFolder,
          conversationId: options?.conversationId,
          userId,
          recipient: toolInput.recipient as string | undefined,
        })

        return JSON.stringify({
          type: 'document',
          title: toolInput.title,
          document_type: toolInput.document_type,
          content: toolInput.content,
          recipient: toolInput.recipient || null,
          generated_at: new Date().toISOString(),
          document_id: storeResult.documentId,
          sharepoint_folder: storeResult.sharepointFolderPath,
          sharepoint_urls: storeResult.sharepointUrls,
          format_variants: storeResult.formatVariants,
        })
      } catch (err) {
        // Fallback: return document without SharePoint storage but include the error
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error('Document storage failed, returning without SharePoint:', errMsg)
        return JSON.stringify({
          type: 'document',
          title: toolInput.title,
          document_type: toolInput.document_type,
          content: toolInput.content,
          recipient: toolInput.recipient || null,
          generated_at: new Date().toISOString(),
          sharepoint_error: errMsg,
        })
      }
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

    case 'run_deep_analysis': {
      const { orchestrateAgents } = await import('@/lib/chat/orchestrator')
      const areas = toolInput.analysis_areas as Array<{ focus: string; data_tools: string[] }>

      const tasks = areas.map(area => ({
        agentName: area.focus.toLowerCase().replace(/\s+/g, '_').substring(0, 30),
        description: area.focus,
        systemPrompt: `You are a focused research agent for Kiros Early Education Centre (Bidwill, NSW). Your task is to analyse: ${area.focus}. Use the available tools to gather real data, then provide a concise analysis with key findings, issues identified, and specific recommendations. Be specific — cite data points, staff names, dates, NQS element codes. Use Australian English. Format your response with ## headings and bullet points.`,
        tools: ALL_TOOLS
          .filter(t => area.data_tools.includes(t.name))
          .map(({ allowedRoles: _r, ...rest }) => rest) as Anthropic.Tool[],
        context: `Centre: Kiros Early Education, Bidwill NSW. Today: ${new Date().toISOString().split('T')[0]}`,
        model: 'claude-sonnet-4-20250514',
        maxIterations: 3,
      }))

      const results = await orchestrateAgents({
        conversationId: '',
        messageId: '',
        tasks,
        supabase,
      })

      const synthesis = results.map(r =>
        `## ${r.agentName}\n**Status:** ${r.status}\n\n${r.output}`
      ).join('\n\n---\n\n')

      return JSON.stringify({
        type: 'deep_analysis',
        areas_analyzed: results.length,
        completed: results.filter(r => r.status === 'completed').length,
        failed: results.filter(r => r.status === 'failed').length,
        total_tokens: results.reduce((sum, r) => sum + r.tokensUsed, 0),
        findings: synthesis,
      })
    }

    case 'delegate_to_agents': {
      const { orchestrateAgents } = await import('@/lib/chat/orchestrator')
      const delegations = toolInput.delegations as Array<{ agent_name: string; task_description: string; context?: string }>

      // Load agent definitions from DB
      const agentNames = delegations.map(d => d.agent_name)
      const { data: agentDefs } = await supabase
        .from('ai_agent_definitions')
        .select('*')
        .in('name', agentNames)
        .eq('is_active', true)

      if (!agentDefs || agentDefs.length === 0) {
        return JSON.stringify({ error: 'No matching active agents found', requested: agentNames })
      }

      // Load relevant learnings (corrections) for each agent to pass as context
      const agentLearningsMap = new Map<string, string>()
      for (const name of agentNames) {
        const tagName = name.toLowerCase().replace(/\s+/g, '_')
        const { data: agentLearnings } = await supabase
          .from('ai_learnings')
          .select('title, content')
          .eq('is_active', true)
          .eq('learning_type', 'correction')
          .overlaps('tags', [tagName, 'agent_feedback'])
          .order('confidence', { ascending: false })
          .limit(5)

        if (agentLearnings && agentLearnings.length > 0) {
          const learningText = agentLearnings
            .map((l: { title: string; content: string }) => `- ${l.title}: ${l.content}`)
            .join('\n')
          agentLearningsMap.set(name, `\n\nPAST CORRECTIONS (avoid repeating these mistakes):\n${learningText}`)
        }
      }

      // Build tasks from DB definitions
      const agentTasks = delegations
        .map(d => {
          const def = agentDefs.find((a: { name: string }) => a.name === d.agent_name)
          if (!def) return null
          const pastCorrections = agentLearningsMap.get(def.name) || ''
          return {
            agentName: def.name,
            agentDefinitionId: def.id,
            description: d.task_description,
            systemPrompt: def.system_prompt + pastCorrections,
            tools: ALL_TOOLS
              .filter(t => (def.available_tools || []).includes(t.name))
              .map(({ allowedRoles: _r, ...rest }) => rest) as Anthropic.Tool[],
            context: d.context || `Centre: Kiros Early Education, Bidwill NSW. Today: ${new Date().toISOString().split('T')[0]}`,
            model: def.model || 'claude-sonnet-4-20250514',
            maxIterations: def.max_iterations || 3,
            temperature: def.temperature ?? undefined,
            tokenBudget: def.token_budget || 8192,
          }
        })
        .filter((t): t is NonNullable<typeof t> => t !== null)

      if (agentTasks.length === 0) {
        return JSON.stringify({ error: 'No matching active agents found for delegation', requested: agentNames })
      }

      const results = await orchestrateAgents({
        conversationId: options?.conversationId || '',
        messageId: '',
        tasks: agentTasks,
        supabase,
        onProgress: options?.onAgentProgress,
      })

      return JSON.stringify({
        type: 'agent_delegation',
        agents_consulted: results.length,
        results: results.map(r => ({
          agent: r.agentName,
          status: r.status,
          output: r.output,
          tokens: r.tokensUsed,
          duration_ms: r.durationMs,
        })),
      })
    }

    case 'save_learning': {
      const {
        learning_type, category, title, content, original_context,
        applies_to_roles, qa_areas, tags, confidence, expires_at,
      } = toolInput as {
        learning_type: string; category?: string; title: string; content: string;
        original_context?: string; applies_to_roles?: string[]; qa_areas?: number[];
        tags?: string[]; confidence?: number; expires_at?: string;
      }

      // Check for duplicate/similar learnings to update instead of insert
      const { data: existing } = await supabase
        .from('ai_learnings')
        .select('id, title, content, times_reinforced, confidence')
        .eq('is_active', true)
        .eq('learning_type', learning_type)
        .ilike('title', `%${title.substring(0, 30)}%`)
        .limit(3)

      if (existing && existing.length > 0) {
        // Reinforce existing learning instead of duplicating
        const match = existing[0]
        const { error } = await supabase
          .from('ai_learnings')
          .update({
            content: content,
            original_context: original_context || undefined,
            times_reinforced: (match.times_reinforced || 0) + 1,
            confidence: Math.min(1.0, (match.confidence || 0.8) + 0.05),
            updated_at: new Date().toISOString(),
            ...(category && { category }),
            ...(qa_areas && qa_areas.length > 0 && { qa_areas }),
            ...(tags && tags.length > 0 && { tags }),
          })
          .eq('id', match.id)

        if (error) return JSON.stringify({ error: error.message })
        return JSON.stringify({
          status: 'reinforced',
          learning_id: match.id,
          message: `Reinforced existing learning: "${match.title}" (reinforced ${(match.times_reinforced || 0) + 1} times, confidence now ${Math.min(1.0, (match.confidence || 0.8) + 0.05).toFixed(2)})`,
        })
      }

      const { data, error } = await supabase
        .from('ai_learnings')
        .insert({
          learning_type,
          category: category || null,
          title,
          content,
          original_context: original_context || null,
          source_conversation_id: options?.conversationId || null,
          learned_from_user_id: userId,
          learned_from_role: userRole,
          applies_to_roles: applies_to_roles || [],
          confidence: confidence ?? 0.8,
          qa_areas: qa_areas || [],
          tags: tags || [],
          expires_at: expires_at || null,
        })
        .select('id')
        .single()

      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({
        status: 'saved',
        learning_id: data.id,
        message: `Saved new ${learning_type} learning: "${title}"`,
      })
    }

    case 'get_learnings': {
      const { category, learning_type, qa_areas, search, role, limit: maxResults } = toolInput as {
        category?: string; learning_type?: string; qa_areas?: number[];
        search?: string; role?: string; limit?: number;
      }

      let query = supabase
        .from('ai_learnings')
        .select('id, learning_type, category, title, content, original_context, applies_to_roles, confidence, times_reinforced, times_contradicted, qa_areas, tags, created_at, updated_at, expires_at')
        .eq('is_active', true)
        .order('confidence', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(maxResults || 20)

      if (category) query = query.eq('category', category)
      if (learning_type) query = query.eq('learning_type', learning_type)
      if (qa_areas && qa_areas.length > 0) query = query.overlaps('qa_areas', qa_areas)
      if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
      if (role) query = query.or(`applies_to_roles.eq.{},applies_to_roles.cs.{${role}}`)

      const { data, error } = await query

      if (error) return JSON.stringify({ error: error.message })

      // Filter out expired learnings
      const now = new Date()
      const active = (data || []).filter(l => !l.expires_at || new Date(l.expires_at) > now)

      return JSON.stringify({
        total: active.length,
        learnings: active.map(l => ({
          id: l.id,
          type: l.learning_type,
          category: l.category,
          title: l.title,
          content: l.content,
          original_context: l.original_context,
          confidence: l.confidence,
          reinforced: l.times_reinforced,
          contradicted: l.times_contradicted,
          qa_areas: l.qa_areas,
          tags: l.tags,
          last_updated: l.updated_at,
        })),
      })
    }

    case 'record_agent_feedback': {
      const {
        agent_name, query_summary, agent_response_summary,
        feedback_type, correction_detail, response_quality,
      } = toolInput as {
        agent_name: string; query_summary: string; agent_response_summary?: string;
        feedback_type: string; correction_detail?: string; response_quality?: number;
      }

      // Look up agent definition ID
      const { data: agentDef } = await supabase
        .from('ai_agent_definitions')
        .select('id')
        .eq('name', agent_name)
        .single()

      const { data, error } = await supabase
        .from('ai_agent_feedback')
        .insert({
          agent_definition_id: agentDef?.id || null,
          agent_name,
          conversation_id: options?.conversationId || null,
          query_summary,
          agent_response_summary: agent_response_summary || null,
          feedback_type,
          correction_detail: correction_detail || null,
          response_quality: response_quality || null,
          user_id: userId,
        })
        .select('id')
        .single()

      if (error) return JSON.stringify({ error: error.message })

      // If corrected/rejected, also save as a learning for future reference
      if (feedback_type === 'corrected' || feedback_type === 'rejected') {
        await supabase.from('ai_learnings').insert({
          learning_type: 'correction',
          category: 'agent_feedback',
          title: `${agent_name}: ${feedback_type} on "${query_summary.substring(0, 60)}"`,
          content: correction_detail || `Agent response was ${feedback_type}. Original response: ${agent_response_summary || 'N/A'}`,
          original_context: agent_response_summary || null,
          source_conversation_id: options?.conversationId || null,
          learned_from_user_id: userId,
          learned_from_role: userRole,
          tags: ['agent_feedback', agent_name.toLowerCase().replace(/\s+/g, '_')],
          confidence: 0.9,
        })
      }

      return JSON.stringify({
        status: 'recorded',
        feedback_id: data.id,
        message: `Recorded ${feedback_type} feedback for ${agent_name}`,
      })
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` })
  }
}
