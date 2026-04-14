import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// ============================================================================
// POST — Create a new candidate invite
// Auth required (admin/manager/ns)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'manager', 'ns'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { position_id, full_name, email, phone, referred_by_name } = await request.json()

    if (!position_id || !full_name || !email) {
      return NextResponse.json({ error: 'position_id, full_name, and email are required' }, { status: 400 })
    }

    // Verify position exists and is open
    const { data: position, error: posError } = await supabase
      .from('recruitment_positions')
      .select('id, status')
      .eq('id', position_id)
      .single()

    if (posError || !position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    if (position.status !== 'open') {
      return NextResponse.json({ error: 'Position is not open for applications' }, { status: 400 })
    }

    // Look up referred_by if provided
    let referredBy: string | null = null
    if (referred_by_name) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', `%${referred_by_name}%`)
        .order('full_name')
        .limit(1)
        .single()

      if (referrer) {
        referredBy = referrer.id
      }
    }

    const accessToken = crypto.randomUUID()

    const { data: candidate, error: insertError } = await supabase
      .from('recruitment_candidates')
      .insert({
        position_id,
        full_name,
        email,
        phone: phone || null,
        access_token: accessToken,
        referred_by: referredBy,
        status: 'invited',
      })
      .select('id')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      candidate_id: candidate.id,
      access_token: accessToken,
      invite_url: `/apply/${accessToken}`,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
