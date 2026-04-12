import { NextRequest, NextResponse } from 'next/server'
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const check = await assertAuthorized()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const body = await request.json().catch(() => ({}))
  const status = body.status as string | undefined

  if (!status || !['connected', 'disconnected', 'error', 'expired'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient
    .from('marketing_social_accounts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const check = await assertAuthorized()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient
    .from('marketing_social_accounts')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
