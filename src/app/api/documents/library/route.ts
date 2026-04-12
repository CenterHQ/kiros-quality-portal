import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const topic = searchParams.get('topic')
  const type = searchParams.get('type')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('ai_generated_documents')
    .select('id, title, document_type, topic_folder, sharepoint_folder_path, sharepoint_urls, format_variants, sync_status, version, created_at, updated_at, last_synced_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (topic) query = query.eq('topic_folder', topic)
  if (type) query = query.eq('document_type', type)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get distinct topic folders for filter dropdown
  const { data: topics } = await supabase
    .from('ai_generated_documents')
    .select('topic_folder')
    .order('topic_folder')

  const distinctTopics = Array.from(new Set((topics || []).map(t => t.topic_folder)))

  return NextResponse.json({
    documents: data || [],
    total: count || 0,
    topics: distinctTopics,
  })
}
