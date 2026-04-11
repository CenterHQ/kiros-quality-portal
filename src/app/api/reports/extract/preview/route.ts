import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { executeReportQuery, flattenRows, aggregateData, resolveUserNames } from '@/lib/report-query-builder'
import type { ReportTemplateConfig } from '@/lib/report-types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Auth check
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
    const config = body.config as ReportTemplateConfig

    if (!config?.primaryTable) {
      return NextResponse.json({ error: 'Missing primary table' }, { status: 400 })
    }

    // Use service role client for unrestricted data access
    const serviceClient = createServiceRoleClient()

    const result = await executeReportQuery(serviceClient, config, { limit: 50 })

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    // Flatten for display
    let flatData = flattenRows(result.data ?? [], config)

    // Auto-resolve user UUIDs to names
    flatData = await resolveUserNames(serviceClient, flatData)

    // Apply aggregation if enabled
    if (config.aggregation?.enabled) {
      flatData = aggregateData(flatData, config.aggregation)
    }

    return NextResponse.json({
      columns: flatData.labels,
      rows: flatData.rows,
      totalCount: result.count,
      previewCount: flatData.rows.length,
    })
  } catch (err) {
    console.error('Preview error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
