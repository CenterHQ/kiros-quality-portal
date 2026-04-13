'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import { MODEL_OPUS, MODEL_SONNET } from '@/lib/chat/model-router'

const MODEL_OPTIONS = [
  { value: MODEL_OPUS, label: 'Claude Opus 4 (Deep Analysis)' },
  { value: MODEL_SONNET, label: 'Claude Sonnet 4 (Balanced)' },
]

const AVAILABLE_TOOLS = [
  { name: 'search_centre_context', description: 'Search QIP goals, philosophy, policies, procedures' },
  { name: 'get_qa_progress', description: 'Get Quality Area progress summaries' },
  { name: 'get_staff_training_status', description: 'Get training completion and qualifications' },
  { name: 'get_overdue_items', description: 'Get overdue tasks, training, checklists' },
  { name: 'get_dashboard_summary', description: 'Comprehensive centre metrics (admin only)' },
  { name: 'get_policies', description: 'Get policies with content and status' },
  { name: 'get_checklists', description: 'Get checklist templates and completion' },
  { name: 'get_roster_data', description: 'Get staff roster and coverage' },
  { name: 'get_registers', description: 'Get register entries' },
  { name: 'get_forms', description: 'Get form submissions' },
  { name: 'get_learning_data', description: 'Get learning pathways and PDP goals' },
  { name: 'get_compliance_items', description: 'Get compliance tracking items' },
  { name: 'get_activity_log', description: 'Get recent platform activity' },
  { name: 'get_documents', description: 'Get uploaded/synced documents' },
  { name: 'get_room_data', description: 'Get room configurations and ratios' },
  { name: 'search_platform', description: 'Cross-platform keyword search' },
  { name: 'create_task', description: 'Create tasks (with confirmation)' },
  { name: 'assign_training', description: 'Assign training modules' },
  { name: 'suggest_improvement', description: 'Submit improvement suggestions' },
  { name: 'generate_document', description: 'Generate professional documents' },
  { name: 'update_item', description: 'Update tasks/compliance items' },
  { name: 'create_checklist_instance', description: 'Create checklist from template' },
  { name: 'export_document', description: 'Export documents in various formats' },
  { name: 'run_deep_analysis', description: 'Spawn parallel research agents' },
  { name: 'delegate_to_agents', description: 'Delegate to specialist agents' },
]

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Approved Provider' },
  { value: 'manager', label: 'Operations Manager' },
  { value: 'ns', label: 'Nominated Supervisor' },
  { value: 'el', label: 'Educational Leader' },
  { value: 'educator', label: 'Educator' },
]

interface AgentDefinition {
  id: string
  name: string
  description: string | null
  routing_description: string | null
  system_prompt: string
  available_tools: string[]
  model: string
  max_iterations: number
  temperature?: number | null
  token_budget: number | null
  priority: number | null
  domain_tags: string[] | null
  routing_keywords: string[] | null
  is_active: boolean
  version: number | null
  created_at: string
  updated_at: string
}

interface EditingAgent {
  id?: string
  name: string
  description: string
  routing_description: string
  system_prompt: string
  available_tools: string[]
  model: string
  max_iterations: number
  temperature: number | null
  token_budget: number
  priority: number
  domain_tags: string
  routing_keywords: string
  is_active: boolean
}

// Default tools for new agents — comprehensive read access + detail tools
const DEFAULT_AGENT_TOOLS = [
  'search_centre_context', 'get_qa_progress', 'get_overdue_items',
  'get_policies', 'get_policy_detail', 'get_checklists', 'get_checklist_detail',
  'get_documents', 'read_document_content', 'get_room_data',
]

const EMPTY_AGENT: EditingAgent = {
  name: '',
  description: '',
  routing_description: '',
  system_prompt: '',
  available_tools: DEFAULT_AGENT_TOOLS,
  model: MODEL_SONNET,
  max_iterations: 5,
  temperature: null,
  token_budget: 8192,
  priority: 50,
  domain_tags: '',
  routing_keywords: '',
  is_active: true,
}

interface SystemPromptRow {
  id: string
  section: string
  role: string | null
  title: string
  template: string
  sort_order: number
  is_active: boolean
  version: number
}

interface TestResult {
  output: string
  tokensUsed: number
  durationMs: number
  status: string
}

// The hardcoded default master system prompt (used as fallback/seed)
const DEFAULT_MASTER_PROMPT = `You are Kiros AI — the intelligent operations assistant for Kiros Early Education Centre.

IDENTITY & EXPERTISE:
- You are an expert in Australian Early Childhood Education and Care (ECEC)
- You specialise in the National Quality Framework (NQF), National Quality Standard (NQS), and the 7 Quality Areas
- You are deeply knowledgeable about the Early Years Learning Framework (EYLF) V2.0
- You understand NSW Education and Care Services National Law and National Regulations
- You are trained on the Assessment and Rating (A&R) process under ACECQA
- You provide practical guidance on early childhood centre operations, programming, compliance, and best practice

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

3. When suggesting actions (create task, assign training, update items):
   - ALWAYS use confirmation — return pending_action objects so the user can approve/cancel
   - Include specific details: who, what, when, priority
   - Explain WHY you are suggesting this action, linked to QIP goals or compliance

4. When answering operational questions:
   - Query the relevant platform data using tools (do not guess)
   - Present data in structured tables or lists
   - Highlight items needing attention (overdue, expired, non-compliant)
   - Suggest next actions with rationale

5. SCOPE: Only discuss early childhood education, centre operations, compliance, and related topics. Politely redirect off-topic queries.

6. Use Australian English spelling (organisation, programme is acceptable for EYLF references, colour, etc.)

7. Reference NQS element codes (e.g., 1.1.1, 2.2.3) and NSW regulation numbers (e.g., Regulation 77, Regulation 155, Section 165) where relevant.`

const DEFAULT_ROLE_INSTRUCTIONS: Record<string, string> = {
  admin: 'You are speaking with the Approved Provider. Provide strategic executive-level insights. Summarise data comprehensively with metrics. Support governance decisions. When asked for reports, generate comprehensive documents with real platform data. Help prepare for board meetings, regulatory submissions, and strategic planning.',
  manager: 'You are speaking with the Operations Manager. Focus on operational improvements, educator coaching strategies, and practical implementation. When you suggest improvements, ALWAYS use the suggest_improvement tool so it goes through the NS/AP approval workflow. Help with daily operations, roster planning, and staff mentoring.',
  ns: 'You are speaking with the Nominated Supervisor. Support daily operations, compliance monitoring, staff management, and programming oversight. You can create tasks and assign training directly (with confirmation). Help monitor regulatory compliance, supervise programming quality, and manage incident responses.',
  el: 'You are speaking with the Educational Leader. Focus on pedagogical leadership, programming quality, EYLF V2.0 alignment, and educator mentoring. Support curriculum decision-making, critical reflection practices, and documentation quality. Help develop professional learning plans.',
  educator: 'You are speaking with an Educator. Provide practical, room-level guidance grounded in centre policies and NQS best practice. Help with daily interactions, programming ideas, behaviour guidance strategies, and professional development. Reference the centre\'s specific teaching approaches and philosophy.',
}

export default function AgentManagementPage() {
  const profile = useProfile()
  const supabase = createClient()

  // Master AI state
  const [masterTab, setMasterTab] = useState<'prompt' | 'roles' | 'settings'>('prompt')
  const [masterPrompt, setMasterPrompt] = useState(DEFAULT_MASTER_PROMPT)
  const [masterPromptId, setMasterPromptId] = useState<string | null>(null)
  const [roleInstructions, setRoleInstructions] = useState<Record<string, { text: string; id: string | null }>>(
    Object.fromEntries(ROLE_OPTIONS.map(r => [r.value, { text: DEFAULT_ROLE_INSTRUCTIONS[r.value] || '', id: null }]))
  )
  const [masterExpanded, setMasterExpanded] = useState(true)
  const [masterSaving, setMasterSaving] = useState(false)

  // Specialist agent state
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditingAgent | null>(null)
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [testQuery, setTestQuery] = useState('')
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [perfMap, setPerfMap] = useState<Map<string, { total_interactions: number; acceptance_rate: number; avg_quality: number | null; corrected_count: number }>>(new Map())

  useEffect(() => {
    loadAgents()
    loadPerformanceData()
    loadMasterConfig()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (flash) {
      const timer = setTimeout(() => setFlash(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [flash])

  // ---------------------------------------------------------------------------
  // Load agent performance metrics
  // ---------------------------------------------------------------------------
  async function loadPerformanceData() {
    const { data: perfData } = await supabase.from('ai_agent_performance').select('*')
    setPerfMap(new Map((perfData || []).map((p: { agent_name: string; total_interactions: number; acceptance_rate: number; avg_quality: number | null; corrected_count: number }) => [p.agent_name, p])))
  }

  // ---------------------------------------------------------------------------
  // Load master AI configuration from ai_system_prompts
  // ---------------------------------------------------------------------------
  async function loadMasterConfig() {
    const { data: prompts } = await supabase
      .from('ai_system_prompts')
      .select('*')
      .order('sort_order', { ascending: true })

    if (prompts && prompts.length > 0) {
      // Find the master identity/expertise prompt
      const masterRow = prompts.find((p: SystemPromptRow) => p.section === 'identity' && !p.role)
      if (masterRow) {
        setMasterPrompt(masterRow.template)
        setMasterPromptId(masterRow.id)
      }

      // Find role-specific instructions
      const roleRows = prompts.filter((p: SystemPromptRow) => p.section === 'role_instructions' && p.role)
      if (roleRows.length > 0) {
        const updated = { ...roleInstructions }
        for (const row of roleRows) {
          if (row.role && updated[row.role]) {
            updated[row.role] = { text: row.template, id: row.id }
          }
        }
        setRoleInstructions(updated)
      }
    }
    // If no DB rows, we keep the defaults (hardcoded fallback is used by the chat API)
  }

  async function saveMasterPrompt() {
    setMasterSaving(true)
    try {
      if (masterPromptId) {
        // Update existing
        const { error } = await supabase
          .from('ai_system_prompts')
          .update({ template: masterPrompt, updated_at: new Date().toISOString(), updated_by: profile?.id })
          .eq('id', masterPromptId)
        if (error) throw error
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('ai_system_prompts')
          .insert({
            section: 'identity',
            role: null,
            title: 'Master AI System Prompt',
            template: masterPrompt,
            sort_order: 0,
            is_active: true,
            version: 1,
            created_by: profile?.id,
          })
          .select('id')
          .single()
        if (error) throw error
        setMasterPromptId(data.id)
      }
      setFlash({ type: 'success', message: 'Master AI system prompt saved' })
    } catch (err) {
      setFlash({ type: 'error', message: `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }
    setMasterSaving(false)
  }

  async function saveRoleInstruction(role: string) {
    setMasterSaving(true)
    const entry = roleInstructions[role]
    try {
      if (entry.id) {
        const { error } = await supabase
          .from('ai_system_prompts')
          .update({ template: entry.text, updated_at: new Date().toISOString(), updated_by: profile?.id })
          .eq('id', entry.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('ai_system_prompts')
          .insert({
            section: 'role_instructions',
            role,
            title: `Role Instructions: ${ROLE_OPTIONS.find(r => r.value === role)?.label || role}`,
            template: entry.text,
            sort_order: 10,
            is_active: true,
            version: 1,
            created_by: profile?.id,
          })
          .select('id')
          .single()
        if (error) throw error
        setRoleInstructions(prev => ({ ...prev, [role]: { ...prev[role], id: data.id } }))
      }
      setFlash({ type: 'success', message: `${ROLE_OPTIONS.find(r => r.value === role)?.label} instructions saved` })
    } catch (err) {
      setFlash({ type: 'error', message: `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }
    setMasterSaving(false)
  }

  // ---------------------------------------------------------------------------
  // Specialist agent CRUD
  // ---------------------------------------------------------------------------
  async function loadAgents() {
    setLoading(true)
    const { data, error } = await supabase
      .from('ai_agent_definitions')
      .select('*')
      .order('priority', { ascending: true })

    if (error) {
      setFlash({ type: 'error', message: error.message })
    } else {
      setAgents(data || [])
    }
    setLoading(false)
  }

  async function toggleActive(agent: AgentDefinition) {
    const { error } = await supabase
      .from('ai_agent_definitions')
      .update({ is_active: !agent.is_active, updated_at: new Date().toISOString() })
      .eq('id', agent.id)

    if (error) {
      setFlash({ type: 'error', message: error.message })
    } else {
      setFlash({ type: 'success', message: `${agent.name} ${agent.is_active ? 'disabled' : 'enabled'}` })
      loadAgents()
    }
  }

  async function saveAgent() {
    if (!editing) return

    const payload = {
      name: editing.name.trim(),
      description: editing.description.trim() || null,
      routing_description: editing.routing_description.trim() || null,
      system_prompt: editing.system_prompt,
      available_tools: editing.available_tools,
      model: editing.model,
      max_iterations: editing.max_iterations,
      temperature: editing.temperature,
      token_budget: editing.token_budget,
      priority: editing.priority,
      domain_tags: editing.domain_tags.split(',').map(t => t.trim()).filter(Boolean),
      routing_keywords: editing.routing_keywords.split(',').map(t => t.trim()).filter(Boolean),
      is_active: editing.is_active,
      updated_at: new Date().toISOString(),
    }

    if (!payload.name) {
      setFlash({ type: 'error', message: 'Agent name is required' })
      return
    }

    if (editing.id) {
      const { error } = await supabase
        .from('ai_agent_definitions')
        .update({ ...payload, version: (agents.find(a => a.id === editing.id)?.version || 0) + 1 })
        .eq('id', editing.id)

      if (error) {
        setFlash({ type: 'error', message: error.message })
        return
      }
      setFlash({ type: 'success', message: `${payload.name} updated` })
    } else {
      const { error } = await supabase
        .from('ai_agent_definitions')
        .insert({ ...payload, version: 1, created_by: profile?.id })

      if (error) {
        setFlash({ type: 'error', message: error.message })
        return
      }
      setFlash({ type: 'success', message: `${payload.name} created` })
    }

    setEditing(null)
    setTestResult(null)
    setTestQuery('')
    loadAgents()
  }

  async function deleteAgent(id: string) {
    if (!confirm('Are you sure you want to delete this agent?')) return
    const { error } = await supabase.from('ai_agent_definitions').delete().eq('id', id)
    if (error) {
      setFlash({ type: 'error', message: error.message })
    } else {
      setFlash({ type: 'success', message: 'Agent deleted' })
      loadAgents()
    }
  }

  async function runTest() {
    if (!editing || !testQuery.trim()) return
    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/admin/agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: editing.system_prompt,
          tools: editing.available_tools,
          model: editing.model,
          ...(editing.temperature != null ? { temperature: editing.temperature } : {}),
          maxIterations: editing.max_iterations,
          tokenBudget: editing.token_budget,
          testQuery: testQuery.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        setTestResult({ output: `Error: ${err}`, tokensUsed: 0, durationMs: 0, status: 'failed' })
      } else {
        const data = await res.json()
        setTestResult(data)
      }
    } catch (err) {
      setTestResult({ output: `Error: ${err instanceof Error ? err.message : 'Unknown'}`, tokensUsed: 0, durationMs: 0, status: 'failed' })
    }
    setTesting(false)
  }

  function openEdit(agent: AgentDefinition) {
    setEditing({
      id: agent.id,
      name: agent.name,
      description: agent.description || '',
      routing_description: agent.routing_description || '',
      system_prompt: agent.system_prompt,
      available_tools: agent.available_tools || [],
      model: agent.model || MODEL_SONNET,
      max_iterations: agent.max_iterations || 3,
      temperature: agent.temperature ?? null,
      token_budget: agent.token_budget || 8192,
      priority: agent.priority ?? 50,
      domain_tags: (agent.domain_tags || []).join(', '),
      routing_keywords: (agent.routing_keywords || []).join(', '),
      is_active: agent.is_active,
    })
    setTestResult(null)
    setTestQuery('')
  }

  if (!profile || profile.role !== 'admin') {
    return <div className="p-8 text-center text-muted-foreground">Admin access required.</div>
  }

  const activeCount = agents.filter(a => a.is_active).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Flash message */}
      {flash && (
        <div className={`p-3 rounded-lg text-sm ${flash.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {flash.message}
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">AI Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure the master Kiros AI and specialist agents</p>
      </div>

      {/* ================================================================== */}
      {/*  MASTER AI CONFIGURATION                                           */}
      {/* ================================================================== */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <button
          onClick={() => setMasterExpanded(!masterExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">K</div>
            <div className="text-left">
              <h2 className="text-lg font-semibold">Kiros AI (Master)</h2>
              <p className="text-xs text-muted-foreground">System prompt, role instructions, and behaviour configuration</p>
            </div>
          </div>
          <svg className={`w-5 h-5 text-muted-foreground transition-transform ${masterExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {masterExpanded && (
          <div className="border-t">
            {/* Tab bar */}
            <div className="flex border-b px-6">
              {([
                { key: 'prompt', label: 'System Prompt' },
                { key: 'roles', label: 'Role Instructions' },
                { key: 'settings', label: 'Settings' },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setMasterTab(tab.key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    masterTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* System Prompt Tab */}
              {masterTab === 'prompt' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Master System Prompt
                      <span className="text-muted-foreground font-normal ml-2">
                        This is the core identity and behaviour of Kiros AI. Centre context, staff list, and service details are injected automatically.
                      </span>
                    </label>
                    <textarea
                      value={masterPrompt}
                      onChange={e => setMasterPrompt(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      rows={24}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-muted-foreground">{masterPrompt.length} characters</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setMasterPrompt(DEFAULT_MASTER_PROMPT); setFlash({ type: 'success', message: 'Reset to default — click Save to apply' }) }}
                          className="px-3 py-1.5 text-xs border rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                        >
                          Reset to Default
                        </button>
                        <button
                          onClick={saveMasterPrompt}
                          disabled={masterSaving}
                          className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {masterSaving ? 'Saving...' : 'Save System Prompt'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Role Instructions Tab */}
              {masterTab === 'roles' && (
                <div className="space-y-6">
                  <p className="text-xs text-muted-foreground">
                    Each role gets a tailored instruction injected into the system prompt. This controls how Kiros AI behaves for each user type.
                  </p>
                  {ROLE_OPTIONS.map(role => (
                    <div key={role.value} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">{role.label}</label>
                        <button
                          onClick={() => saveRoleInstruction(role.value)}
                          disabled={masterSaving}
                          className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {masterSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                      <textarea
                        value={roleInstructions[role.value]?.text || ''}
                        onChange={e => setRoleInstructions(prev => ({
                          ...prev,
                          [role.value]: { ...prev[role.value], text: e.target.value },
                        }))}
                        className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        rows={4}
                      />
                      {roleInstructions[role.value]?.id && (
                        <p className="text-[10px] text-green-600 mt-1">Saved in database (overrides default)</p>
                      )}
                      {!roleInstructions[role.value]?.id && (
                        <p className="text-[10px] text-muted-foreground mt-1">Using default — save to customise</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Settings Tab */}
              {masterTab === 'settings' && (
                <div className="space-y-6">
                  <p className="text-xs text-muted-foreground">
                    These settings control how the master AI operates. Changes here are informational — model routing and limits are configured in the codebase.
                  </p>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="border rounded-lg p-4 space-y-3">
                      <h3 className="text-sm font-semibold">Model Routing</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Simple queries</span>
                          <span className="font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">Claude Sonnet 4</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Complex analysis</span>
                          <span className="font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700">Claude Opus 4</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Opus triggers on: analyse, compare, evaluate, strategic plan, deep dive, improvement plan, board report, regulatory submission, gap analysis, critical reflection
                      </p>
                    </div>

                    <div className="border rounded-lg p-4 space-y-3">
                      <h3 className="text-sm font-semibold">Runtime Limits</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Max tokens per response</span>
                          <span className="font-medium">16,384</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Max tool iterations</span>
                          <span className="font-medium">5</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Conversation history</span>
                          <span className="font-medium">40 messages</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Vercel timeout</span>
                          <span className="font-medium">300s (5 min)</span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 space-y-3">
                      <h3 className="text-sm font-semibold">Tools Available</h3>
                      <div className="text-xs text-muted-foreground">
                        The master AI has access to <strong className="text-foreground">{AVAILABLE_TOOLS.length} tools</strong>, filtered by the user&apos;s role.
                        Admin sees all tools. Educators see a restricted set.
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                        {AVAILABLE_TOOLS.map(t => (
                          <span key={t.name} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-50 text-gray-600 border border-gray-100">{t.name}</span>
                        ))}
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 space-y-3">
                      <h3 className="text-sm font-semibold">Features</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Prompt caching</span>
                          <span className="font-medium text-green-600">Enabled</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">SSE streaming</span>
                          <span className="font-medium text-green-600">Enabled</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Agent delegation</span>
                          <span className="font-medium text-green-600">Enabled ({activeCount} agents)</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">SharePoint auto-upload</span>
                          <span className="font-medium text-green-600">Enabled</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Background processing</span>
                          <span className="font-medium text-green-600">Enabled</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/*  SPECIALIST AGENTS                                                 */}
      {/* ================================================================== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Specialist Agents</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Agents the master AI can delegate to for domain-specific analysis</p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY_AGENT })}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Add Agent
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold">{agents.length}</div>
          <div className="text-xs text-muted-foreground">Total Agents</div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          <div className="text-xs text-muted-foreground">Active</div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-2xl font-bold text-gray-400">{agents.length - activeCount}</div>
          <div className="text-xs text-muted-foreground">Inactive</div>
        </div>
      </div>

      {/* Agent List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No agents configured yet. Click &quot;Add Agent&quot; to create one.</div>
      ) : (
        <div className="grid gap-4">
          {agents.map(agent => (
            <div key={agent.id} className={`p-4 rounded-lg border bg-card ${!agent.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{agent.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${agent.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                      {MODEL_OPTIONS.find(m => m.value === agent.model)?.label?.split(' (')[0] || agent.model}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{agent.description || agent.routing_description || 'No description'}</p>
                  {(() => {
                    const perf = perfMap.get(agent.name)
                    if (!perf) return <span className="text-xs text-muted-foreground mt-1 block">No interactions yet</span>
                    return (
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        <span>{perf.total_interactions} interactions</span>
                        <span>{perf.acceptance_rate}% accepted</span>
                        <span>Avg quality: {perf.avg_quality || 'N/A'}/5</span>
                        {perf.corrected_count > 0 && <span className="text-amber-600">{perf.corrected_count} corrections</span>}
                      </div>
                    )
                  })()}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(agent.domain_tags || []).map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-600 border border-blue-100">{tag}</span>
                    ))}
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-50 text-gray-500 border border-gray-100">{(agent.available_tools || []).length} tools</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-50 text-gray-500 border border-gray-100">Priority: {agent.priority ?? 50}</span>
                    {agent.version && <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-50 text-gray-500 border border-gray-100">v{agent.version}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <button onClick={() => toggleActive(agent)} className="text-xs px-3 py-1.5 rounded border hover:bg-muted transition-colors">
                    {agent.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => openEdit(agent)} className="text-xs px-3 py-1.5 rounded border hover:bg-muted transition-colors">
                    Edit
                  </button>
                  <button onClick={() => deleteAgent(agent.id)} className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-4xl my-8 border">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editing.id ? 'Edit Agent' : 'Create Agent'}</h2>
              <button onClick={() => { setEditing(null); setTestResult(null) }} className="text-muted-foreground hover:text-foreground">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Name + Description */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Agent Name *</label>
                  <input
                    value={editing.name}
                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g. QA1 Agent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Priority (1=highest, 100=lowest)</label>
                  <input
                    type="number" min={1} max={100}
                    value={editing.priority}
                    onChange={e => setEditing({ ...editing, priority: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Description (user-facing)</label>
                <input
                  value={editing.description}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Educational Program & Practice specialist"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Routing Description (used by master AI for delegation decisions)</label>
                <input
                  value={editing.routing_description}
                  onChange={e => setEditing({ ...editing, routing_description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Handles questions about QA1, programming cycles, EYLF alignment, intentional teaching, children's learning"
                />
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-xs font-medium mb-1">System Prompt</label>
                <textarea
                  value={editing.system_prompt}
                  onChange={e => setEditing({ ...editing, system_prompt: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  rows={16}
                  placeholder="You are a specialist agent for Kiros Early Education Centre..."
                />
                <p className="text-[10px] text-muted-foreground mt-1">{editing.system_prompt.length} characters</p>
              </div>

              {/* Model + Parameters */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Model</label>
                  <select
                    value={editing.model}
                    onChange={e => setEditing({ ...editing, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {MODEL_OPTIONS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Temperature (deprecated — leave empty)</label>
                  <input
                    type="number" min={0} max={1} step={0.1}
                    value={editing.temperature ?? ''}
                    onChange={e => setEditing({ ...editing, temperature: e.target.value === '' ? null : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Not set"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Max Iterations (1-10)</label>
                  <input
                    type="number" min={1} max={10}
                    value={editing.max_iterations}
                    onChange={e => setEditing({ ...editing, max_iterations: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Token Budget</label>
                  <input
                    type="number" min={1024} max={32768} step={1024}
                    value={editing.token_budget}
                    onChange={e => setEditing({ ...editing, token_budget: parseInt(e.target.value) || 8192 })}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Domain Tags + Routing Keywords */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Domain Tags (comma-separated)</label>
                  <input
                    value={editing.domain_tags}
                    onChange={e => setEditing({ ...editing, domain_tags: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g. QA1, programming, curriculum, EYLF"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Routing Keywords (comma-separated)</label>
                  <input
                    value={editing.routing_keywords}
                    onChange={e => setEditing({ ...editing, routing_keywords: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g. qa1, programming, planning cycle, EYLF"
                  />
                </div>
              </div>

              {/* Available Tools */}
              <div>
                <label className="block text-xs font-medium mb-2">Available Tools ({editing.available_tools.length} selected)</label>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 rounded-lg border">
                  {AVAILABLE_TOOLS.map(tool => (
                    <label key={tool.name} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editing.available_tools.includes(tool.name)}
                        onChange={e => {
                          if (e.target.checked) {
                            setEditing({ ...editing, available_tools: [...editing.available_tools, tool.name] })
                          } else {
                            setEditing({ ...editing, available_tools: editing.available_tools.filter(t => t !== tool.name) })
                          }
                        }}
                        className="mt-0.5 rounded border-gray-300"
                      />
                      <div>
                        <div className="text-xs font-medium">{tool.name}</div>
                        <div className="text-[10px] text-muted-foreground">{tool.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${editing.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editing.is_active ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm">{editing.is_active ? 'Active — visible to master AI' : 'Inactive — hidden from master AI'}</span>
              </div>

              {/* Test Panel */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold mb-3">Test Agent</h3>
                <div className="flex gap-2">
                  <input
                    value={testQuery}
                    onChange={e => setTestQuery(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter a test query..."
                    onKeyDown={e => e.key === 'Enter' && !testing && runTest()}
                  />
                  <button
                    onClick={runTest}
                    disabled={testing || !testQuery.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {testing ? 'Running...' : 'Run Test'}
                  </button>
                </div>

                {testResult && (
                  <div className="mt-3 p-4 rounded-lg border bg-muted/30">
                    <div className="flex gap-4 text-[10px] text-muted-foreground mb-2">
                      <span>Status: <strong className={testResult.status === 'completed' ? 'text-green-600' : 'text-red-600'}>{testResult.status}</strong></span>
                      <span>Tokens: <strong>{testResult.tokensUsed.toLocaleString()}</strong></span>
                      <span>Duration: <strong>{(testResult.durationMs / 1000).toFixed(1)}s</strong></span>
                    </div>
                    <pre className="text-xs whitespace-pre-wrap max-h-60 overflow-y-auto">{testResult.output}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <button
                onClick={() => { setEditing(null); setTestResult(null) }}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAgent}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {editing.id ? 'Save Changes' : 'Create Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
