import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient, executeTool } from '@/lib/chat/shared'
import { MODEL_SONNET } from '@/lib/chat/model-router'
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
  temperature?: number
  tokenBudget?: number
  agentDefinitionId?: string
}

export interface AgentResult {
  agentName: string
  status: 'completed' | 'failed'
  output: string
  tokensUsed: number
  durationMs: number
  sessionId?: string
}

export type AgentProgressCallback = (event: {
  type: 'agent_start' | 'agent_progress' | 'agent_result'
  agentName: string
  description?: string
  status?: 'running' | 'completed' | 'failed'
  summary?: string
}) => void

type SupabaseClient = ReturnType<typeof createServiceRoleClient>

// ---------------------------------------------------------------------------
// Single agent runner (non-streaming, with tool loop)
// ---------------------------------------------------------------------------

export async function runAgent(
  task: AgentTask,
  supabase: SupabaseClient,
): Promise<AgentResult> {
  const start = Date.now()
  const anthropic = getAnthropicClient()
  const model = task.model || MODEL_SONNET
  const maxIter = task.maxIterations || 5
  const maxTokens = task.tokenBudget || 8192
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
        max_tokens: maxTokens,
        ...(task.temperature !== undefined ? { temperature: task.temperature } : {}),
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
          // Validate tool is in agent's allowed set
          const isAllowed = task.tools.some((t: { name: string }) => t.name === block.name)
          if (!isAllowed) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ error: `Tool "${block.name}" is not available for this agent` }),
            })
            continue
          }
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
// Orchestrator — runs multiple agents in parallel with progress events
// ---------------------------------------------------------------------------

export async function orchestrateAgents(params: {
  conversationId: string
  messageId: string
  tasks: AgentTask[]
  supabase: SupabaseClient
  onProgress?: AgentProgressCallback
}): Promise<AgentResult[]> {
  const { tasks, supabase, onProgress } = params

  // Create session records for tracking (non-critical — failures don't block agent work)
  const sessionIds: string[] = []
  for (const task of tasks) {
    try {
      const { data } = await supabase
        .from('ai_agent_sessions')
        .insert({
          conversation_id: params.conversationId || null,
          message_id: params.messageId || null,
          agent_id: task.agentDefinitionId || null,
          agent_name: task.agentName,
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

  // Run all agents in parallel with individual progress events
  const promises = tasks.map(async (task, i) => {
    // Emit start event
    onProgress?.({
      type: 'agent_start',
      agentName: task.agentName,
      description: task.description,
    })
    onProgress?.({
      type: 'agent_progress',
      agentName: task.agentName,
      status: 'running',
    })

    try {
      const result = await runAgent(task, supabase)

      // Emit completion
      onProgress?.({
        type: 'agent_progress',
        agentName: task.agentName,
        status: result.status,
      })
      onProgress?.({
        type: 'agent_result',
        agentName: task.agentName,
        summary: result.output.substring(0, 300),
      })

      // Update session record
      if (sessionIds[i]) {
        await supabase
          .from('ai_agent_sessions')
          .update({
            status: result.status,
            result: { output: result.output },
            tokens_used: result.tokensUsed,
            completed_at: new Date().toISOString(),
          })
          .eq('id', sessionIds[i])
      }

      return { ...result, sessionId: sessionIds[i] || undefined }
    } catch (err) {
      onProgress?.({
        type: 'agent_progress',
        agentName: task.agentName,
        status: 'failed',
      })

      const errorResult: AgentResult = {
        agentName: task.agentName,
        status: 'failed',
        output: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        tokensUsed: 0,
        durationMs: 0,
        sessionId: sessionIds[i] || undefined,
      }

      if (sessionIds[i]) {
        await supabase
          .from('ai_agent_sessions')
          .update({
            status: 'failed',
            result: { error: errorResult.output },
            completed_at: new Date().toISOString(),
          })
          .eq('id', sessionIds[i])
      }

      return errorResult
    }
  })

  return Promise.all(promises)
}
