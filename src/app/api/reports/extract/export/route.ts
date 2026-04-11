import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { executeReportQuery, flattenRows, aggregateData, resolveUserNames } from '@/lib/report-query-builder'
import {
  exportToCsv,
  exportToJson,
  exportToMarkdown,
  exportToHtml,
  exportToXlsx,
  exportToPdf,
  exportToDocx,
} from '@/lib/report-export'
import type { ReportTemplateConfig, ExportFormat } from '@/lib/report-types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_FORMATS: ExportFormat[] = ['csv', 'xlsx', 'pdf', 'docx', 'html', 'md', 'json']

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
    const format = body.format as ExportFormat
    const title = body.title as string || 'Data Extract'

    if (!config?.primaryTable) {
      return NextResponse.json({ error: 'Missing primary table' }, { status: 400 })
    }
    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json({ error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}` }, { status: 400 })
    }

    // Use service role client for unrestricted data access
    const serviceClient = createServiceRoleClient()

    // Fetch all data (up to 10000 rows)
    const result = await executeReportQuery(serviceClient, config, { limit: 10000 })

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    // Flatten
    let flatData = flattenRows(result.data ?? [], config)

    // Auto-resolve user UUIDs to names
    flatData = await resolveUserNames(serviceClient, flatData)

    // Apply aggregation if enabled
    if (config.aggregation?.enabled) {
      flatData = aggregateData(flatData, config.aggregation)
    }

    const tabularData = {
      title,
      labels: flatData.labels,
      rows: flatData.rows,
      generatedAt: new Date().toISOString(),
    }

    // Generate export
    let exportResult: { buffer: Buffer; filename: string; contentType: string }

    switch (format) {
      case 'csv':
        exportResult = exportToCsv(tabularData)
        break
      case 'json':
        exportResult = exportToJson(tabularData)
        break
      case 'md':
        exportResult = exportToMarkdown(tabularData)
        break
      case 'html':
        exportResult = exportToHtml(tabularData)
        break
      case 'xlsx':
        exportResult = await exportToXlsx(tabularData)
        break
      case 'pdf':
        exportResult = await exportToPdf(tabularData)
        break
      case 'docx':
        exportResult = await exportToDocx(tabularData)
        break
      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

    return new NextResponse(exportResult.buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': exportResult.contentType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
      },
    })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
