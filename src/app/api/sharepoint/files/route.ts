import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { listFiles, getTokenFromRefresh } from '@/lib/microsoft-graph'

async function getValidToken(supabase: any) {
  const { data: conn } = await supabase
    .from('sharepoint_connection')
    .select('*')
    .eq('status', 'connected')
    .single()

  if (!conn) throw new Error('SharePoint not connected')

  // Check if token expired
  if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
    if (!conn.refresh_token) throw new Error('No refresh token available')
    const result = await getTokenFromRefresh(conn.refresh_token)
    if (!result) throw new Error('Failed to refresh token')
    await supabase.from('sharepoint_connection').update({
      access_token: result.accessToken,
      token_expires_at: result.expiresOn?.toISOString(),
    }).eq('id', conn.id)
    return { token: result.accessToken, driveId: conn.drive_id }
  }

  return { token: conn.access_token, driveId: conn.drive_id }
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
