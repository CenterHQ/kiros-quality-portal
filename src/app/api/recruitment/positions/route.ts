import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ============================================================================
// GET — List all positions with candidate counts
// Auth required (admin/manager/ns)
// ============================================================================

export async function GET() {
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

    const { data: positions, error } = await supabase
      .from('recruitment_positions')
      .select('*, recruitment_candidates(count)')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten the count from the nested structure
    const result = (positions || []).map((pos) => {
      const candidates = pos.recruitment_candidates as unknown as Array<{ count: number }>
      const candidateCount = candidates?.[0]?.count ?? 0
      const { recruitment_candidates: _, ...rest } = pos
      return { ...rest, candidate_count: candidateCount }
    })

    return NextResponse.json({ positions: result })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ============================================================================
// POST — Create a new position
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

    const body = await request.json()
    const { title, role, room, description, requirements, qualifications_required, status, question_bank, personality_questions } = body

    if (!title || !role) {
      return NextResponse.json({ error: 'title and role are required' }, { status: 400 })
    }

    const { data: position, error } = await supabase
      .from('recruitment_positions')
      .insert({
        title,
        role,
        room: room || null,
        description: description || null,
        requirements: requirements || null,
        qualifications_required: qualifications_required || [],
        status: status || 'draft',
        question_bank: question_bank || [],
        personality_questions: personality_questions || [],
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ position })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ============================================================================
// PUT — Update a position (status, question_bank, etc.)
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
      return NextResponse.json({ error: 'Position id is required' }, { status: 400 })
    }

    // Only allow specific fields to be updated
    const allowedFields = ['title', 'role', 'room', 'description', 'requirements', 'qualifications_required', 'status', 'question_bank', 'personality_questions']
    const filteredUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key]
      }
    }

    const { data: position, error } = await supabase
      .from('recruitment_positions')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    return NextResponse.json({ position })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
