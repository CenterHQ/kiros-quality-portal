import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAppToken } from '@/lib/microsoft-graph'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: authProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!authProfile || !['admin', 'ns'].includes(authProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: conn } = await supabase
      .from('sharepoint_connection')
      .select('*')
      .eq('status', 'connected')
      .single()

    if (!conn) {
      return NextResponse.json({ error: 'No active SharePoint connection' }, { status: 404 })
    }

    const token = await getAppToken()
    const tokenExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString()

    await supabase.from('sharepoint_connection').update({
      access_token: token,
      token_expires_at: tokenExpiresAt,
    }).eq('id', conn.id)

    return NextResponse.json({ token_expires_at: tokenExpiresAt })
  } catch (error: any) {
    console.error('Token refresh error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
