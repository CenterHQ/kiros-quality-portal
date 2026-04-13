import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { buildSystemPromptFromDB } from '@/lib/chat/shared'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const role = request.nextUrl.searchParams.get('role') || 'admin'
  const serviceSupabase = createServiceRoleClient()

  const prompt = await buildSystemPromptFromDB(
    role,
    '[Centre context would appear here]',
    '[Staff list would appear here]',
    '[Service details would appear here]',
    serviceSupabase,
  )

  return NextResponse.json({ prompt, role })
}
