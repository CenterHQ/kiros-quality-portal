import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { downloadFile, getFileMetadata, getAppToken } from '@/lib/microsoft-graph'
import mammoth from 'mammoth'

export const dynamic = 'force-dynamic'

async function getValidToken(supabase: any) {
  const { data: conn } = await supabase
    .from('sharepoint_connection')
    .select('*')
    .eq('status', 'connected')
    .single()

  if (!conn) throw new Error('SharePoint not connected')

  const token = await getAppToken()
  return { token, driveId: conn.drive_id }
}

async function extractText(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.toLowerCase().split('.').pop()

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  if (ext === 'txt' || ext === 'md' || ext === 'csv') {
    return buffer.toString('utf-8')
  }

  if (ext === 'xlsx' || ext === 'xls') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ExcelJS = require('exceljs')
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      const rows: string[] = []
      workbook.eachSheet((sheet: { name: string; eachRow: (cb: (row: { values: unknown[] }) => void) => void }) => {
        rows.push(`## ${sheet.name}`)
        sheet.eachRow((row: { values: unknown[] }) => {
          const vals = (row.values || []).slice(1).map((v: unknown) => v != null ? String(v) : '').join(' | ')
          if (vals.trim()) rows.push(vals)
        })
      })
      return rows.join('\n').substring(0, 50000) || '[Spreadsheet content could not be extracted]'
    } catch (e) {
      console.error('[Kiros AI] Excel extraction failed:', e instanceof Error ? e.message : e)
      return '[Spreadsheet extraction failed]'
    }
  }

  if (ext === 'pdf') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const pdfData = await pdfParse(buffer)
      return (pdfData.text || '').substring(0, 50000) || '[PDF content could not be extracted]'
    } catch (e) {
      console.error('[Kiros AI] PDF extraction failed:', e instanceof Error ? e.message : e)
      return '[PDF text extraction failed]'
    }
  }

  return `[Unsupported file type: ${ext}]`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: authProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!authProfile || !['admin', 'ns'].includes(authProfile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { itemId, documentType } = await request.json()

    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

    const { token, driveId } = await getValidToken(supabase)

    const metadata = await getFileMetadata(token, driveId, itemId)
    const buffer = await downloadFile(token, driveId, itemId)
    const extractedText = await extractText(buffer, metadata.name)

    const crypto = await import('crypto')
    const contentHash = crypto.createHash('md5').update(buffer).digest('hex')

    const { data: doc, error } = await supabase.from('sharepoint_documents').upsert({
      sharepoint_item_id: itemId,
      file_name: metadata.name,
      file_path: metadata.parentReference?.path ? `${metadata.parentReference.path}/${metadata.name}` : metadata.name,
      file_type: metadata.name.split('.').pop()?.toLowerCase(),
      file_size: metadata.size,
      content_hash: contentHash,
      extracted_text: extractedText,
      document_type: documentType || 'other',
      is_monitored: true,
      last_modified_at: metadata.lastModifiedDateTime,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'sharepoint_item_id' }).select().single()

    if (error) throw error

    return NextResponse.json({ document: doc, textLength: extractedText.length })
  } catch (error: any) {
    console.error('SharePoint sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
