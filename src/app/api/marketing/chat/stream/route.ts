import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { selectModelConfig } from '@/lib/chat/model-router'
import type { SSEEvent } from '@/lib/chat/sse-protocol'
import { getAnthropicClient } from '@/lib/chat/shared'
import { MARKETING_TOOLS, buildMarketingSystemPromptCached } from '@/lib/marketing/chat-config'
import { executeMarketingTool } from '@/lib/marketing/tool-executor'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function encodeSSE(event: string, data: SSEEvent): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(
      new TextEncoder().encode(`event: error\ndata: ${JSON.stringify({ type: 'error', message: 'Unauthorized' })}\n\n`),
      { status: 401, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

  const { data: profile } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager', 'ns'].includes(profile.role)) {
    return new Response(
      new TextEncoder().encode(`event: error\ndata: ${JSON.stringify({ type: 'error', message: 'Access denied — marketing is restricted to admin, manager, and NS roles' })}\n\n`),
      { status: 403, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

  const { conversationId, message } = await request.json()
  if (!message?.trim()) {
    return new Response(
      new TextEncoder().encode(`event: error\ndata: ${JSON.stringify({ type: 'error', message: 'Missing message' })}\n\n`),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

  // Create or verify conversation (using marketing_conversations table)
  let convId = conversationId
  const isNew = !convId
  if (!convId) {
    const { data: conv } = await supabase.from('marketing_conversations').insert({
      user_id: user.id,
      title: message.substring(0, 80),
    }).select().single()
    convId = conv?.id
  }

  if (!convId) {
    return new Response(
      new TextEncoder().encode(`event: error\ndata: ${JSON.stringify({ type: 'error', message: 'Failed to create conversation' })}\n\n`),
      { status: 500, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }

  // Save user message
  await supabase.from('marketing_messages').insert({
    conversation_id: convId,
    role: 'user',
    content: message,
  })

  const { model, thinking } = selectModelConfig(message)
  const serviceSupabase = createServiceRoleClient()

  let fullText = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encodeSSE('status', { type: 'model', model }))
        controller.enqueue(new TextEncoder().encode(
          `event: conversation\ndata: ${JSON.stringify({ conversationId: convId })}\n\n`,
        ))

        // Load conversation history from marketing_messages
        const { data: history } = await serviceSupabase.from('marketing_messages')
          .select('role, content')
          .eq('conversation_id', convId)
          .in('role', ['user', 'assistant'])
          .order('created_at', { ascending: true })
          .limit(40)

        const messages: Anthropic.MessageParam[] = (history || []).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

        // Load centre context and service details (marketing lens)
        const [contextResult, serviceResult] = await Promise.all([
          serviceSupabase.from('centre_context').select('context_type, title, content').eq('is_active', true).limit(100),
          serviceSupabase.from('service_details').select('key, value, label'),
        ])

        const centreContext = (contextResult.data || [])
          .map(c => `[${c.context_type}] ${c.title}: ${c.content}`)
          .join('\n\n')
        const serviceDetailsStr = (serviceResult.data || []).map(s => `${s.label}: ${s.value}`).join('\n')

        // Filter marketing tools by role
        const allowedTools: Anthropic.Tool[] = MARKETING_TOOLS
          .filter(t => t.allowedRoles.includes(profile.role))
          .map(({ allowedRoles: _allowedRoles, ...tool }) => tool)

        // Build marketing system prompt with caching
        const systemPromptBlocks = buildMarketingSystemPromptCached(profile.role, centreContext, serviceDetailsStr)

        // Cache the last tool for prompt caching efficiency
        const toolsWithCache = [...allowedTools]
        if (toolsWithCache.length > 0) {
          toolsWithCache[toolsWithCache.length - 1] = {
            ...toolsWithCache[toolsWithCache.length - 1],
            cache_control: { type: 'ephemeral' },
          } as Anthropic.Tool & { cache_control: { type: 'ephemeral' } }
        }

        const anthropic = getAnthropicClient()

        fullText = ''
        let iterations = 0
        let continueLoop = true

        while (continueLoop && iterations < 5) {
          const apiStream = anthropic.messages.stream({
            model,
            max_tokens: 16384,
            ...(thinking && { thinking }),
            system: systemPromptBlocks,
            tools: toolsWithCache as Anthropic.Tool[],
            messages,
          })

          const contentBlockMap = new Map<number, Anthropic.ContentBlock>()

          for await (const event of apiStream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta
              if ('type' in delta && (delta.type === 'thinking_delta' || delta.type === 'signature_delta')) continue
              if ('text' in delta && delta.text) {
                fullText += delta.text
                controller.enqueue(encodeSSE('delta', { type: 'text_delta', text: delta.text }))
              }
            } else if (event.type === 'content_block_start') {
              if (event.content_block.type === 'thinking') continue
              if (event.content_block.type === 'tool_use') {
                controller.enqueue(encodeSSE('status', { type: 'tool_start', tool: event.content_block.name }))
              }
              contentBlockMap.set(event.index, event.content_block as Anthropic.ContentBlock)
            } else if (event.type === 'message_delta') {
              if (event.delta.stop_reason !== 'tool_use') {
                continueLoop = false
              }
            }
          }

          const finalMessage = await apiStream.finalMessage()
          const toolUseBlocks = finalMessage.content.filter(
            (b): b is Anthropic.ContentBlock & { type: 'tool_use' } => b.type === 'tool_use',
          )

          if (finalMessage.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
            continueLoop = false
            break
          }

          // Execute marketing tools in parallel
          const toolResults = await Promise.all(
            toolUseBlocks.map(async (block) => {
              let result: string
              try {
                result = await executeMarketingTool(
                  block.name,
                  block.input as Record<string, unknown>,
                  user.id,
                  profile.role,
                  convId,
                  serviceSupabase,
                )
              } catch (toolErr: unknown) {
                const toolErrMsg = toolErr instanceof Error ? toolErr.message : 'Unknown tool error'
                console.error(`Marketing tool ${block.name} failed:`, toolErrMsg)
                result = JSON.stringify({ error: `Tool execution failed: ${toolErrMsg}` })
              } finally {
                controller.enqueue(encodeSSE('status', { type: 'tool_end', tool: block.name }))
              }

              // Save tool call/result to marketing_messages
              await serviceSupabase.from('marketing_messages').insert([
                { conversation_id: convId, role: 'tool_call', content: JSON.stringify({ name: block.name, input: block.input }), metadata: { tool_use_id: block.id } },
                { conversation_id: convId, role: 'tool_result', content: result, metadata: { tool_use_id: block.id } },
              ])

              return { block, result }
            }),
          )

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

        // Save final assistant response
        const { data: savedMsg } = await serviceSupabase.from('marketing_messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: fullText,
        }).select('id').single()

        // Update conversation timestamp
        await serviceSupabase.from('marketing_conversations')
          .update({
            title: isNew ? message.substring(0, 80) : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', convId)

        controller.enqueue(encodeSSE('done', {
          type: 'done',
          messageId: savedMsg?.id || '',
          documents: [],
          pending_actions: [],
        }))
        controller.close()
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error('Marketing stream error:', err)

        let userMessage = 'I encountered an error while processing your request. Please try again.'
        if (errMsg.includes('rate_limit') || errMsg.includes('429')) {
          userMessage = 'The AI service is temporarily busy. Please wait a moment and try again.'
        } else if (errMsg.includes('overloaded') || errMsg.includes('529')) {
          userMessage = 'The AI service is currently experiencing high demand. Please try again in a few minutes.'
        }

        try {
          if (fullText.trim()) {
            await serviceSupabase.from('marketing_messages').insert({
              conversation_id: convId,
              role: 'assistant',
              content: fullText,
              metadata: { error: errMsg, partial: true },
            })
          } else {
            await serviceSupabase.from('marketing_messages').insert({
              conversation_id: convId,
              role: 'assistant',
              content: userMessage,
            })
          }
        } catch { /* last resort */ }

        try { controller.enqueue(encodeSSE('error', { type: 'error', message: errMsg })) } catch { /* */ }
        try { controller.close() } catch { /* */ }
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
