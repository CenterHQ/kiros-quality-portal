import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// List templates (own + shared)
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('report_templates')
      .select('*, profiles(full_name)')
      .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ templates: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'manager', 'ns'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, config, is_shared } = body

    if (!name || !config) {
      return NextResponse.json({ error: 'Missing required fields: name, config' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        name,
        description: description || null,
        config,
        is_shared: is_shared ?? false,
        created_by: user.id,
      })
      .select('*, profiles(full_name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ template: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update template
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, name, description, config, is_shared } = body

    if (!id) return NextResponse.json({ error: 'Missing template id' }, { status: 400 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (config !== undefined) updates.config = config
    if (is_shared !== undefined) updates.is_shared = is_shared

    const { data, error } = await supabase
      .from('report_templates')
      .update(updates)
      .eq('id', id)
      .eq('created_by', user.id)
      .select('*, profiles(full_name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ template: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete template
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing template id' }, { status: 400 })

    const { error } = await supabase
      .from('report_templates')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
