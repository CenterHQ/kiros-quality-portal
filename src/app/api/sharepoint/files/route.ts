import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { listFiles, getAppToken } from '@/lib/microsoft-graph'

export const dynamic = 'force-dynamic'

async function getValidToken(supabase: any) {
  const { data: conn } = await supabase
    .from('sharepoint_connection')
    .select('*')
    .eq('status', 'connected')
    .single()

  if (!conn) throw new Error('SharePoint not connected')

  // Always use app token (client credentials) - no expiry issues
  const token = await getAppToken()

  // Update stored token
  await supabase.from('sharepoint_connection').update({
    access_token: token,
    token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  }).eq('id', conn.id)

  return { token, driveId: conn.drive_id }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const folderId = request.nextUrl.searchParams.get('folderId') || undefined
    const { token, driveId } = await getValidToken(supabase)
    const files = await listFiles(token, driveId, folderId)
    return NextResponse.json({ files })
  } catch (error: any) {
    console.error('SharePoint files error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
