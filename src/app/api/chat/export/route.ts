import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conversationId = request.nextUrl.searchParams.get('id')
  if (!conversationId) return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 })

  // Verify user owns conversation
  const { data: conv } = await supabase
    .from('chat_conversations')
    .select('id, title, created_at')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single()
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })

  const format = request.nextUrl.searchParams.get('format') || 'md'

  if (format === 'md') {
    const lines = [`# ${conv.title || 'Conversation'}`, `*Exported: ${new Date().toLocaleDateString('en-AU')}*`, '']
    for (const msg of messages || []) {
      const time = new Date(msg.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
      if (msg.role === 'user') {
        lines.push(`## You (${time})`, '', msg.content, '')
      } else {
        lines.push(`## Kiros AI (${time})`, '', msg.content, '')
      }
    }
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${(conv.title || 'conversation').replace(/[^a-zA-Z0-9 ]/g, '')}.md"`,
      },
    })
  }

  // Default: JSON
  return NextResponse.json({ conversation: conv, messages })
}
