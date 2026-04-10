import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  generatePdfDocument,
  generateWordDocument,
  generateExcelDocument,
  generateHtmlDocument,
  type DocumentOptions,
} from '@/lib/document-templates'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_FORMATS = ['pdf', 'docx', 'xlsx', 'html', 'md', 'json'] as const
type ExportFormat = (typeof VALID_FORMATS)[number]

const CONTENT_TYPES: Record<ExportFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  html: 'text/html',
  md: 'text/markdown',
  json: 'application/json',
}

const FILE_EXTENSIONS: Record<ExportFormat, string> = {
  pdf: '.pdf',
  docx: '.docx',
  xlsx: '.xlsx',
  html: '.html',
  md: '.md',
  json: '.json',
}

function sanitiseFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 80)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, content, format, recipient, author } = body

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "title" field' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "content" field' },
        { status: 400 }
      )
    }

    if (!format || !VALID_FORMATS.includes(format as ExportFormat)) {
      return NextResponse.json(
        { error: `Invalid format "${format}". Must be one of: ${VALID_FORMATS.join(', ')}` },
        { status: 400 }
      )
    }

    const exportFormat = format as ExportFormat
    const date = new Date().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const options: DocumentOptions = {
      title,
      content,
      format: exportFormat,
      recipient,
      author,
      date,
    }

    const filename = sanitiseFilename(title) + FILE_EXTENSIONS[exportFormat]
    const contentType = CONTENT_TYPES[exportFormat]

    // Handle markdown passthrough
    if (exportFormat === 'md') {
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    // Handle JSON
    if (exportFormat === 'json') {
      const jsonPayload = {
        title,
        content,
        date,
        author: author ?? 'Kiros Early Education',
        ...(recipient ? { recipient } : {}),
      }
      return NextResponse.json(jsonPayload, {
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    // Handle HTML
    if (exportFormat === 'html') {
      const html = generateHtmlDocument(title, content, options)
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    // Handle binary formats (PDF, DOCX, XLSX)
    let buffer: Buffer

    switch (exportFormat) {
      case 'pdf':
        buffer = await generatePdfDocument(title, content, options)
        break
      case 'docx':
        buffer = await generateWordDocument(title, content, options)
        break
      case 'xlsx':
        buffer = await generateExcelDocument(title, content, options)
        break
      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

    return new NextResponse(Buffer.from(buffer) as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (error) {
    console.error('[documents/export] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
