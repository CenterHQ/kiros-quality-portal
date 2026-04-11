import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient, executeTool } from '@/lib/chat/shared'
import { createServiceRoleClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentTask {
  agentName: string
  description: string
  systemPrompt: string
  tools: Anthropic.Tool[]
  context: string
  model?: string
  maxIterations?: number
}

export interface AgentResult {
  agentName: string
  status: 'completed' | 'failed'
  output: string
  tokensUsed: number
  durationMs: number
}

type SupabaseClient = ReturnType<typeof createServiceRoleClient>

// ---------------------------------------------------------------------------
// Single agent runner (non-streaming, with tool loop)
// ---------------------------------------------------------------------------

async function runAgent(
  task: AgentTask,
  supabase: SupabaseClient,
): Promise<AgentResult> {
  const start = Date.now()
  const anthropic = getAnthropicClient()
  const model = task.model || 'claude-sonnet-4-20250514'
  const maxIter = task.maxIterations || 3
  let totalTokens = 0

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: `${task.context}\n\nTask: ${task.description}` },
  ]

  try {
    let iterations = 0
    let continueLoop = true

    while (continueLoop && iterations < maxIter) {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 8192,
        system: task.systemPrompt,
        tools: task.tools,
        messages,
      })

      totalTokens += (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
      iterations++

      if (response.stop_reason === 'tool_use') {
        // Extract tool use blocks and execute
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ContentBlock & { type: 'tool_use' } => b.type === 'tool_use'
        )

        // Add assistant message with all content
        messages.push({ role: 'assistant', content: response.content })

        // Execute tools and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of toolUseBlocks) {
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            supabase,
            'system', // system user for sub-agents
            'admin',  // full data access for research agents
          )
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          })
        }

        messages.push({ role: 'user', content: toolResults })
      } else {
        // Final response — extract text
        continueLoop = false
        const textBlocks = response.content.filter(
          (b): b is Anthropic.TextBlock => b.type === 'text'
        )
        const output = textBlocks.map(b => b.text).join('\n\n')

        return {
          agentName: task.agentName,
          status: 'completed',
          output,
          tokensUsed: totalTokens,
          durationMs: Date.now() - start,
        }
      }
    }

    // Exceeded max iterations — return what we have
    return {
      agentName: task.agentName,
      status: 'completed',
      output: '[Analysis completed with maximum tool iterations reached]',
      tokensUsed: totalTokens,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return {
      agentName: task.agentName,
      status: 'failed',
      output: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      tokensUsed: totalTokens,
      durationMs: Date.now() - start,
    }
  }
}

// ---------------------------------------------------------------------------
// Orchestrator — runs multiple agents in parallel
// ---------------------------------------------------------------------------

export async function orchestrateAgents(params: {
  conversationId: string
  messageId: string
  tasks: AgentTask[]
  supabase: SupabaseClient
}): Promise<AgentResult[]> {
  const { tasks, supabase } = params

  // Create session records for tracking (non-critical — failures don't block agent work)
  const sessionIds: string[] = []
  for (const task of tasks) {
    try {
      const { data } = await supabase
        .from('ai_agent_sessions')
        .insert({
          conversation_id: params.conversationId || null,
          message_id: params.messageId || null,
          task_description: task.description,
          context: { agentName: task.agentName, model: task.model },
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      sessionIds.push(data?.id || '')
    } catch {
      sessionIds.push('') // Session tracking is non-critical
    }
  }

  // Run all agents in parallel
  const settled = await Promise.allSettled(
    tasks.map(task => runAgent(task, supabase))
  )

  // Collect results and update session records
  const results: AgentResult[] = settled.map((outcome, i) => {
    if (outcome.status === 'fulfilled') {
      return outcome.value
    }
    return {
      agentName: tasks[i].agentName,
      status: 'failed' as const,
      output: `Error: ${outcome.reason}`,
      tokensUsed: 0,
      durationMs: 0,
    }
  })

  // Update session records with results
  for (let i = 0; i < results.length; i++) {
    if (sessionIds[i]) {
      await supabase
        .from('ai_agent_sessions')
        .update({
          status: results[i].status,
          result: { output: results[i].output },
          tokens_used: results[i].tokensUsed,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionIds[i])
    }
  }

  return results
}
