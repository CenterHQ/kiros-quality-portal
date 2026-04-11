import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['admin', 'manager', 'ns'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const platform = request.nextUrl.searchParams.get('platform')
    const metricType = request.nextUrl.searchParams.get('metric_type')
    const startDate = request.nextUrl.searchParams.get('start_date')
    const endDate = request.nextUrl.searchParams.get('end_date')

    let query = supabase
      .from('marketing_analytics_cache')
      .select('*')
      .order('fetched_at', { ascending: false })

    if (platform) query = query.eq('platform', platform)
    if (metricType) query = query.eq('metric_type', metricType)
    if (startDate) query = query.gte('date_range_start', startDate)
    if (endDate) query = query.lte('date_range_end', endDate)

    const { data, error } = await query.limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
