import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { selectModelConfig } from '@/lib/chat/model-router'
import { getAnthropicClient, ROLE_LABELS, ALL_TOOLS, buildSystemPrompt, executeTool } from '@/lib/chat/shared'

// Fallback route using waitUntil() for backward compatibility.
// The primary streaming endpoint is /api/chat/stream/route.ts

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Helper: call Claude with streaming and collect the full response
async function callClaudeStreaming(
  anthropicClient: Anthropic,
  params: { model: string; max_tokens: number; system: string | Anthropic.TextBlockParam[]; tools: Anthropic.Tool[]; messages: Anthropic.MessageParam[] }
): Promise<Anthropic.Message> {
  const stream = anthropicClient.messages.stream(params as Parameters<typeof anthropicClient.messages.stream>[0])
  const response = await stream.finalMessage()
  return response
}

// Background processing function — runs inside waitUntil() so it survives client disconnection
async function processChat(
  convId: string,
  userId: string,
  userRole: string,
  isNewConversation: boolean,
  originalMessage: string,
  attachments?: Array<{ name: string; type: string; text?: string; base64?: string; mediaType?: string }>,
) {
  try {
    // CRITICAL: Use service role client here — NOT createServerSupabaseClient()
    // This function runs inside waitUntil() AFTER the HTTP response is sent.
    // cookies() from next/headers is empty at this point, so the cookie-based client fails silently.
    const supabase = createServiceRoleClient()

    // Load conversation history
    const { data: history } = await supabase.from('chat_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true })
      .limit(40)

    const messages: Anthropic.MessageParam[] = (history || []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // If attachments were provided, enhance the last user message with file content
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

    // Load centre context, staff list, service details in parallel
    const [contextResult, staffResult, serviceResult] = await Promise.all([
      supabase.from('centre_context').select('context_type, title, content').eq('is_active', true).limit(100),
      supabase.from('profiles').select('full_name, role').order('full_name'),
      supabase.from('service_details').select('key, value, label'),
    ])

    const centreContext = (contextResult.data || [])
      .map(c => `[${c.context_type}] ${c.title}: ${c.content}`)
      .join('\n\n')
    const staffList = (staffResult.data || []).map(s => `${s.full_name} (${ROLE_LABELS[s.role] || s.role})`).join(', ')
    const serviceDetailsStr = (serviceResult.data || []).map(s => `${s.label}: ${s.value}`).join('\n')

    // Filter tools by role
    const allowedTools: Anthropic.Tool[] = ALL_TOOLS
      .filter(t => t.allowedRoles.includes(userRole))
      .map(({ allowedRoles: _, ...tool }) => tool)

    const systemPrompt = buildSystemPrompt(userRole, centreContext, staffList, serviceDetailsStr)

    const generatedDocuments: Array<{ type: string; title: string; document_type: string; content: string; recipient?: string; generated_at: string }> = []
    const pendingActions: Array<{ id: string; action_type: string; description: string; details: Record<string, unknown>; status: string }> = []

    const anthropic = getAnthropicClient()
    const { model, thinking } = selectModelConfig(originalMessage)

    // Build cached system prompt blocks
    const systemBlocks: Anthropic.TextBlockParam[] = [
      { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
    ]

    // Cache tools array
    const toolsWithCache = [...allowedTools]
    if (toolsWithCache.length > 0) {
      toolsWithCache[toolsWithCache.length - 1] = {
        ...toolsWithCache[toolsWithCache.length - 1],
        cache_control: { type: 'ephemeral' },
      } as Anthropic.Tool & { cache_control: { type: 'ephemeral' } }
    }

    const apiParams = { model, max_tokens: 16384, ...(thinking && { thinking }), system: systemBlocks, tools: toolsWithCache, messages }

    // Call Claude with streaming
    let response = await callClaudeStreaming(anthropic, apiParams)

    // Tool-use loop
    let iterations = 0
    while (response.stop_reason === 'tool_use' && iterations < 5) {
      const toolUseBlocks = response.content.filter((b): b is Anthropic.ContentBlock & { type: 'tool_use' } => b.type === 'tool_use')

      // Execute tools in PARALLEL with error isolation
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          let result: string
          try {
            result = await executeTool(block.name, block.input as Record<string, unknown>, supabase, userId, userRole)

            if (block.name === 'generate_document') {
              try { const d = JSON.parse(result); if (d.type === 'document') generatedDocuments.push(d) } catch { /* */ }
            }
            try { const p = JSON.parse(result); if (p.pending_action) pendingActions.push(p.pending_action) } catch { /* */ }
          } catch (toolErr: unknown) {
            const toolErrMsg = toolErr instanceof Error ? toolErr.message : 'Unknown tool error'
            console.error(`Tool ${block.name} failed:`, toolErrMsg)
            result = JSON.stringify({ error: `Tool execution failed: ${toolErrMsg}` })
          }

          await supabase.from('chat_messages').insert([
            { conversation_id: convId, role: 'tool_call', content: JSON.stringify({ name: block.name, input: block.input }), metadata: { tool_use_id: block.id } },
            { conversation_id: convId, role: 'tool_result', content: result, metadata: { tool_use_id: block.id } },
          ])

          return { type: 'tool_result' as const, tool_use_id: block.id, content: result }
        })
      )

      messages.push({ role: 'assistant', content: response.content as Anthropic.ContentBlockParam[] })
      messages.push({ role: 'user', content: toolResults })
      response = await callClaudeStreaming(anthropic, { ...apiParams, messages })
      iterations++
    }

    // Extract final text
    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    // Save assistant response — this triggers the Supabase realtime event that the frontend listens for
    await supabase.from('chat_messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: textContent,
      metadata: {
        ...(generatedDocuments.length > 0 ? { documents: generatedDocuments } : {}),
        ...(pendingActions.length > 0 ? { pending_actions: pendingActions } : {}),
      },
    })

    // Update conversation
    await supabase.from('chat_conversations')
      .update({
        title: isNewConversation ? originalMessage.substring(0, 80) : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', convId)

  } catch (error) {
    console.error('Background chat processing error:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    let userMessage = 'I encountered an error while processing your request. Please try again.'
    if (errMsg.includes('rate_limit') || errMsg.includes('429')) {
      userMessage = 'The AI service is temporarily busy. Please wait a moment and try again.'
    } else if (errMsg.includes('overloaded') || errMsg.includes('529')) {
      userMessage = 'The AI service is currently experiencing high demand. Please try again in a few minutes.'
    } else if (errMsg.includes('authentication') || errMsg.includes('401') || errMsg.includes('api_key')) {
      userMessage = 'There was an authentication issue with the AI service. Please contact your administrator.'
    }
    try {
      const supabase = createServiceRoleClient()
      await supabase.from('chat_messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: userMessage,
      })
    } catch { /* last resort — can't even save error */ }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { conversationId, message, attachments } = await request.json()

    // Ensure conversation exists
    let convId = conversationId
    const isNew = !convId
    if (!convId) {
      const { data: conv } = await supabase.from('chat_conversations').insert({
        user_id: user.id,
        title: message.substring(0, 80),
      }).select().single()
      convId = conv?.id
    }

    if (!convId) return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })

    // Save user message immediately
    await supabase.from('chat_messages').insert({
      conversation_id: convId,
      role: 'user',
      content: message,
    })

    // Schedule heavy processing to run in the background via waitUntil
    waitUntil(processChat(convId, user.id, profile.role, isNew, message, attachments))

    // Return immediately — the AI response will arrive via Supabase realtime
    return NextResponse.json({
      conversationId: convId,
      status: 'processing',
    })

  } catch (error: unknown) {
    console.error('Chat error:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
