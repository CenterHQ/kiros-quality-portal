import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { selectModelConfig, MODEL_SONNET } from '@/lib/chat/model-router'
import type { SSEEvent } from '@/lib/chat/sse-protocol'
import { ALL_TOOLS, buildSystemPromptCachedFromDB, executeTool, ROLE_LABELS, getAnthropicClient } from '@/lib/chat/shared'
import { loadAIConfig, loadToolPermissions } from '@/lib/ai-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Vercel Pro — 5 min for long agentic chains

/**
 * Reconstruct Anthropic-compatible messages from DB history,
 * re-attaching tool_call/tool_result rows to proper assistant/user message shapes.
 */
function reconstructMessages(
  history: Array<{ role: string; content: string; metadata?: Record<string, unknown> | null }>
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = []
  let i = 0

  while (i < history.length) {
    const msg = history[i]

    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content })
      i++
    } else if (msg.role === 'assistant') {
      // Check if next messages are tool_call/tool_result pairs
      const toolCalls: Array<{ role: string; content: string; metadata?: Record<string, unknown> | null }> = []
      let j = i + 1
      while (j < history.length && history[j].role === 'tool_call') {
        toolCalls.push(history[j])
        j++
      }

      if (toolCalls.length > 0) {
        // Build assistant message with text + tool_use blocks
        const contentBlocks: Anthropic.ContentBlockParam[] = []
        if (msg.content?.trim()) {
          contentBlocks.push({ type: 'text', text: msg.content })
        }
        for (const tc of toolCalls) {
          try {
            const parsed = JSON.parse(tc.content)
            contentBlocks.push({
              type: 'tool_use',
              id: (tc.metadata?.tool_use_id as string) || `tool_${crypto.randomUUID()}`,
              name: parsed.name,
              input: parsed.input || {},
            })
          } catch { /* skip malformed */ }
        }
        if (contentBlocks.length > 0) {
          messages.push({ role: 'assistant', content: contentBlocks })
        }

        // Collect matching tool_results
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        while (j < history.length && history[j].role === 'tool_result') {
          const tr = history[j]
          toolResults.push({
            type: 'tool_result',
            tool_use_id: (tr.metadata?.tool_use_id as string) || `tool_${crypto.randomUUID()}`,
            content: tr.content,
          })
          j++
        }
        if (toolResults.length > 0) {
          messages.push({ role: 'user', content: toolResults })
        }
        i = j
      } else {
        // Regular assistant message (no tool calls after it)
        messages.push({ role: 'assistant', content: msg.content })
        i++
      }
    } else {
      // Skip orphaned tool_call/tool_result messages
      i++
    }
  }

  return messages
}

function encodeSSE(event: string, data: SSEEvent): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function POST(request: NextRequest) {
  // Auth — cookies available because HTTP connection stays open (not waitUntil)
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(
      new TextEncoder().encode(`event: error\ndata: ${JSON.stringify({ type: 'error', message: 'Unauthorized' })}\n\n`),
      { status: 401, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  const { data: profile } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single()
  if (!profile) {
    return new Response(
      new TextEncoder().encode(`event: error\ndata: ${JSON.stringify({ type: 'error', message: 'Profile not found' })}\n\n`),
      { status: 404, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  const { conversationId, message, attachments } = await request.json()
  if (!message?.trim()) {
    return new Response(
      new TextEncoder().encode(`event: error\ndata: ${JSON.stringify({ type: 'error', message: 'Missing message' })}\n\n`),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  // Create or verify conversation
  let convId = conversationId
  const isNew = !convId
  if (!convId) {
    const { data: conv } = await supabase.from('chat_conversations').insert({
      user_id: user.id,
      title: message.substring(0, 80),
    }).select().single()
    convId = conv?.id
  }

  if (!convId) {
    return new Response(
      new TextEncoder().encode(`event: error\ndata: ${JSON.stringify({ type: 'error', message: 'Failed to create conversation' })}\n\n`),
      { status: 500, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  // Save user message immediately
  const { error: userMsgError } = await supabase.from('chat_messages').insert({
    conversation_id: convId,
    role: 'user',
    content: message,
  })
  if (userMsgError) {
    console.error('[Kiros AI] Failed to save user message:', userMsgError.message)
  }

  // Use service role client for the streaming work (more reliable for long operations)
  const serviceSupabase = createServiceRoleClient()

  let fullText = '' // Declared outside try so catch can save partial response

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send conversationId for new conversations
        controller.enqueue(new TextEncoder().encode(
          `event: conversation\ndata: ${JSON.stringify({ conversationId: convId })}\n\n`
        ))

        // Load AI config + tool permissions first (needed for context query and model selection)
        const [aiConfig, toolPerms] = await Promise.all([
          loadAIConfig(serviceSupabase),
          loadToolPermissions(serviceSupabase),
        ])

        // Select model based on message complexity
        const { model, thinking } = selectModelConfig(message, aiConfig)

        // Send model info
        controller.enqueue(encodeSSE('status', { type: 'model', model }))

        // Load conversation history
        const { data: history } = await serviceSupabase.from('chat_messages')
          .select('role, content, metadata')
          .eq('conversation_id', convId)
          .in('role', ['user', 'assistant', 'tool_call', 'tool_result'])
          .order('created_at', { ascending: true })
          .limit(aiConfig.chatHistoryLimit)

        const messages: Anthropic.MessageParam[] = reconstructMessages(history || [])

        // Enhance last user message with attachments
        if (attachments && attachments.length > 0) {
          const lastUserMsg = messages[messages.length - 1]
          if (lastUserMsg && lastUserMsg.role === 'user') {
            const contentBlocks: Anthropic.ContentBlockParam[] = []
            contentBlocks.push({ type: 'text', text: lastUserMsg.content as string })

            for (const att of attachments) {
              if (att.base64 && att.mediaType) {
                contentBlocks.push({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: att.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                    data: att.base64,
                  },
                })
              } else if (att.text) {
                contentBlocks.push({
                  type: 'text',
                  text: `\n\n---\nAttached document: ${att.name}\n${att.text}\n---`,
                })
              }
            }

            messages[messages.length - 1] = { role: 'user', content: contentBlocks }
          }
        }

        // Load centre context, staff list, service details
        const [contextResult, staffResult, serviceResult] = await Promise.all([
          serviceSupabase.from('centre_context').select('context_type, title, content, source_quote').eq('is_active', true).in('context_type', aiConfig.chatContextTypes).limit(50),
          serviceSupabase.from('profiles').select('full_name, role').order('full_name'),
          serviceSupabase.from('service_details').select('key, value, label'),
        ])

        const centreContext = (contextResult.data || [])
          .map((c: { context_type: string; title: string; content: string; source_quote?: string | null }) =>
            `[${c.context_type}] ${c.title}: ${c.content}${c.source_quote ? `\n  [Source: "${c.source_quote}"]` : ''}`
          )
          .join('\n\n')
        const staffList = (staffResult.data || []).map(s => `${s.full_name} (${ROLE_LABELS[s.role] || s.role})`).join(', ')
        const serviceDetailsStr = (serviceResult.data || []).map(s => `${s.label}: ${s.value}`).join('\n')

        // Filter tools by role (DB permissions override hardcoded allowedRoles)
        const allowedTools: Anthropic.Tool[] = ALL_TOOLS
          .filter(t => {
            const dbRoles = toolPerms.get(t.name)
            const roles = dbRoles || t.allowedRoles
            return roles.includes(profile.role)
          })
          .map(({ allowedRoles: _, ...tool }) => tool)

        // Build system prompt as cached content blocks
        const systemPromptBlocks = await buildSystemPromptCachedFromDB(profile.role, centreContext, staffList, serviceDetailsStr, serviceSupabase)

        // Log if system prompt is very large
        const promptSize = systemPromptBlocks.reduce((sum: number, block: { text?: string }) => sum + (block.text?.length || 0), 0)
        if (promptSize > aiConfig.promptSizeWarning) {
          console.warn(`[Kiros AI] System prompt is very large: ${promptSize} chars (~${Math.round(promptSize / 4)} tokens)`)
        }

        // Cache the tools array
        const toolsWithCache = [...allowedTools]
        if (toolsWithCache.length > 0) {
          toolsWithCache[toolsWithCache.length - 1] = {
            ...toolsWithCache[toolsWithCache.length - 1],
            cache_control: { type: 'ephemeral' },
          } as Anthropic.Tool & { cache_control: { type: 'ephemeral' } }
        }

        const anthropic = getAnthropicClient()

        const generatedDocuments: Array<{ type: string; title: string; document_type: string; content: string; recipient?: string; generated_at: string }> = []
        const pendingActions: Array<{ id: string; action_type: string; description: string; details: Record<string, unknown>; status: string }> = []

        fullText = '' // Reset for this stream
        let iterations = 0
        let continueLoop = true
        let usage: { input_tokens: number; output_tokens: number } | undefined

        while (continueLoop && iterations < aiConfig.chatMaxIterations) {
          const apiStream = anthropic.messages.stream({
            model,
            max_tokens: aiConfig.chatMaxTokens,
            ...(thinking && { thinking }),
            system: systemPromptBlocks,
            tools: toolsWithCache as Anthropic.Tool[],
            messages,
          })

          // Collect content blocks for this iteration
          const contentBlocks: Anthropic.ContentBlock[] = []
          const contentBlockMap = new Map<number, Anthropic.ContentBlock>()
          let currentToolUseBlocks: Array<Anthropic.ContentBlock & { type: 'tool_use' }> = []

          // Stream events to client
          for await (const event of apiStream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta
              if ('type' in delta && (delta.type === 'thinking_delta' || delta.type === 'signature_delta')) {
                continue
              }
              if ('text' in delta && delta.text) {
                fullText += delta.text
                controller.enqueue(encodeSSE('delta', { type: 'text_delta', text: delta.text }))
              }
            } else if (event.type === 'content_block_start') {
              if (event.content_block.type === 'thinking') {
                continue
              }
              if (event.content_block.type === 'tool_use') {
                controller.enqueue(encodeSSE('status', { type: 'tool_start', tool: event.content_block.name }))
              }
              const block = event.content_block as Anthropic.ContentBlock
              contentBlocks.push(block)
              contentBlockMap.set(event.index, block)
            } else if (event.type === 'content_block_stop') {
              // Use map to handle index gaps from skipped thinking blocks
              const block = contentBlockMap.get(event.index)
              if (block && block.type === 'tool_use') {
                currentToolUseBlocks.push(block as Anthropic.ContentBlock & { type: 'tool_use' })
              }
            } else if (event.type === 'message_delta') {
              // Check stop reason
              if (event.delta.stop_reason === 'tool_use') {
                // Need to execute tools and continue
              } else {
                continueLoop = false
              }
            }
          }

          // Get the final message to properly extract tool_use blocks with their inputs
          const finalMessage = await apiStream.finalMessage()
          usage = finalMessage?.usage

          // Extract properly formed tool_use blocks from the final message
          currentToolUseBlocks = finalMessage.content.filter(
            (b): b is Anthropic.ContentBlock & { type: 'tool_use' } => b.type === 'tool_use'
          )

          if (finalMessage.stop_reason !== 'tool_use' || currentToolUseBlocks.length === 0) {
            continueLoop = false
            break
          }

          // Execute tools in PARALLEL with error isolation
          const toolResults = await Promise.all(
            currentToolUseBlocks.map(async (block) => {
              let result: string
              try {
                result = await executeTool(block.name, block.input as Record<string, unknown>, serviceSupabase, user.id, profile.role, {
                  conversationId: convId,
                  toolPermissions: toolPerms,
                  onAgentProgress: (event) => {
                    try {
                      controller.enqueue(encodeSSE('agent', event as unknown as SSEEvent))
                    } catch { /* stream may be closing */ }
                  },
                })

                // Extract documents and pending actions
                if (block.name === 'generate_document') {
                  try { const d = JSON.parse(result); if (d.type === 'document') generatedDocuments.push(d) } catch { /* */ }
                }
                try { const p = JSON.parse(result); if (p.pending_action) pendingActions.push(p.pending_action) } catch { /* */ }
              } catch (toolErr: unknown) {
                const toolErrMsg = toolErr instanceof Error ? toolErr.message : 'Unknown tool error'
                console.error(`Tool ${block.name} failed:`, toolErrMsg)
                result = JSON.stringify({ error: `Tool execution failed: ${toolErrMsg}` })
              } finally {
                // Always emit tool_end so the frontend knows the tool finished
                controller.enqueue(encodeSSE('status', { type: 'tool_end', tool: block.name }))
              }

              // Save tool call/result to DB
              try {
                await serviceSupabase.from('chat_messages').insert([
                  { conversation_id: convId, role: 'tool_call', content: JSON.stringify({ name: block.name, input: block.input }), metadata: { tool_use_id: block.id } },
                  { conversation_id: convId, role: 'tool_result', content: result, metadata: { tool_use_id: block.id } },
                ])
              } catch (dbErr) {
                console.error(`[Kiros AI] Failed to save tool result for ${block.name}:`, dbErr)
              }

              return { block, result }
            })
          )

          // Push assistant message + tool results for next iteration
          messages.push({ role: 'assistant', content: finalMessage.content as Anthropic.ContentBlockParam[] })
          messages.push({
            role: 'user',
            content: toolResults.map(({ block, result }) => ({
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: result,
            })),
          })

          iterations++
        }

        // Save final assistant response to Supabase
        const { data: savedMsg, error: saveMsgError } = await serviceSupabase.from('chat_messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: fullText,
          metadata: {
            ...(generatedDocuments.length > 0 ? { documents: generatedDocuments } : {}),
            ...(pendingActions.length > 0 ? { pending_actions: pendingActions } : {}),
            tokens_input: usage?.input_tokens || 0,
            tokens_output: usage?.output_tokens || 0,
            model,
          },
        }).select('id').single()
        if (saveMsgError) {
          console.error('[Kiros AI] Failed to save assistant message:', saveMsgError.message)
        }

        // Update conversation title and timestamp
        if (isNew && fullText.trim() && aiConfig.titleGenerationEnabled) {
          try {
            const titleResponse = await anthropic.messages.create({
              model: MODEL_SONNET,
              max_tokens: aiConfig.titleMaxTokens,
              messages: [{ role: 'user', content: `Generate a 4-7 word title for this conversation. User asked: "${message.substring(0, 200)}". Assistant replied about: "${fullText.substring(0, 200)}". Return ONLY the title, no quotes or punctuation.` }],
            })
            const firstBlock = titleResponse.content[0]
            const generatedTitle = (firstBlock && 'text' in firstBlock ? (firstBlock as { text: string }).text?.trim().substring(0, 100) : null) || message.substring(0, 80)
            await serviceSupabase.from('chat_conversations').update({ title: generatedTitle, updated_at: new Date().toISOString() }).eq('id', convId)
          } catch {
            // Fallback to original method
            await serviceSupabase.from('chat_conversations').update({ title: message.substring(0, 80), updated_at: new Date().toISOString() }).eq('id', convId)
          }
        } else {
          const { error: tsError } = await serviceSupabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId)
          if (tsError) console.error('[Kiros AI] Conversation timestamp update failed:', tsError.message)
        }

        // Send done event
        controller.enqueue(encodeSSE('done', {
          type: 'done',
          messageId: savedMsg?.id || '',
          documents: generatedDocuments,
          pending_actions: pendingActions,
          tokens_input: usage?.input_tokens || 0,
          tokens_output: usage?.output_tokens || 0,
          model,
        }))

        controller.close()
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error('Stream processing error:', err)

        // User-friendly error messages for known API issues
        let userMessage = `I encountered an error while processing your request. Please try again.`
        if (errMsg.includes('rate_limit') || errMsg.includes('429')) {
          userMessage = 'The AI service is temporarily busy. Please wait a moment and try again.'
        } else if (errMsg.includes('overloaded') || errMsg.includes('529')) {
          userMessage = 'The AI service is currently experiencing high demand. Please try again in a few minutes.'
        } else if (errMsg.includes('authentication') || errMsg.includes('401') || errMsg.includes('api_key')) {
          userMessage = 'There was an authentication issue with the AI service. Please contact your administrator.'
        } else if (errMsg.includes('timeout') || errMsg.includes('ETIMEDOUT')) {
          userMessage = 'The request timed out. Please try a shorter question or try again.'
        }

        // Save partial response (if any) or error message
        try {
          if (fullText.trim()) {
            await serviceSupabase.from('chat_messages').insert({
              conversation_id: convId,
              role: 'assistant',
              content: fullText,
              metadata: { error: errMsg, partial: true },
            })
          } else {
            await serviceSupabase.from('chat_messages').insert({
              conversation_id: convId,
              role: 'assistant',
              content: userMessage,
            })
          }
        } catch { /* last resort */ }

        try {
          controller.enqueue(encodeSSE('error', { type: 'error', message: errMsg }))
        } catch { /* stream may already be closed */ }

        try { controller.close() } catch { /* already closed */ }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Conversation-Id': convId,
    },
  })
}

// buildSystemPromptCachedFromDB is imported from @/lib/chat/shared — loads from DB with hardcoded fallback
