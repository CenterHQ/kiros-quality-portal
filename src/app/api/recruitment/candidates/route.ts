import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ============================================================================
// GET — List candidates with filters (position_id, status)
// Auth required (admin/manager/ns)
// ============================================================================

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const positionId = searchParams.get('position_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('recruitment_candidates')
      .select('id, full_name, email, phone, position_id, status, knowledge_score, disc_profile, overall_rank, ai_recommendation, reviewer_notes, reviewed_by, progress, created_at, updated_at, recruitment_positions(title, role)')
      .order('created_at', { ascending: false })

    if (positionId) {
      query = query.eq('position_id', positionId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: candidates, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ candidates: candidates || [] })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ============================================================================
// PUT — Update candidate (status, reviewer_notes, reviewed_by)
// Auth required (admin/manager/ns)
// ============================================================================

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Candidate id is required' }, { status: 400 })
    }

    // Only allow specific fields to be updated
    const allowedFields = ['status', 'reviewer_notes', 'reviewed_by']
    const filteredUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key]
      }
    }

    // Auto-set reviewed_by and reviewed_at when status changes to reviewed
    if (updates.status === 'reviewed' || updates.status === 'shortlisted') {
      filteredUpdates.reviewed_by = user.id
      filteredUpdates.reviewed_at = new Date().toISOString()
    }

    const { data: candidate, error } = await supabase
      .from('recruitment_candidates')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    return NextResponse.json({ candidate })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
