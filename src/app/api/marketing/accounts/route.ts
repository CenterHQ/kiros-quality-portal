import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['admin', 'manager', 'ns']

async function assertAuthorized() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return { error: 'Forbidden', status: 403 as const }
  }
  return { user }
}

export async function GET() {
  const check = await assertAuthorized()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('marketing_social_accounts')
    .select('id, platform, platform_account_id, account_name, status, scopes, token_expires_at, metadata, created_at, updated_at')
    .order('platform')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ accounts: data || [] })
}
