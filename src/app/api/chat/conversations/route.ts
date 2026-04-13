import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('id')

  // If specific conversation requested, return its messages with document metadata
  if (conversationId) {
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('id, role, content, metadata, created_at')
      .eq('conversation_id', conversationId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true })
      .limit(200)

    // Enrich messages with document data from metadata
    const enriched = (messages || []).map(m => ({
      ...m,
      documents: m.metadata && typeof m.metadata === 'object' && 'documents' in (m.metadata as Record<string, unknown>)
        ? (m.metadata as Record<string, unknown>).documents
        : undefined,
      pending_actions: m.metadata && typeof m.metadata === 'object' && 'pending_actions' in (m.metadata as Record<string, unknown>)
        ? (m.metadata as Record<string, unknown>).pending_actions
        : undefined,
    }))

    return NextResponse.json({ messages: enriched })
  }

  // Otherwise return conversation list
  const { data } = await supabase
    .from('chat_conversations')
    .select('id, title, is_active, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ conversations: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title } = await request.json()

  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({ user_id: user.id, title: title || 'New conversation' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversation: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId } = await request.json()

  await supabase
    .from('chat_conversations')
    .update({ is_active: false })
    .eq('id', conversationId)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
