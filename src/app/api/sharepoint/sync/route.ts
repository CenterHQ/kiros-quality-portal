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
    return '[Spreadsheet content - manual review recommended]'
  }

  if (ext === 'pdf') {
    const text = buffer.toString('utf-8')
    const readable = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim()
    return readable.substring(0, 50000) || '[PDF content - manual review recommended]'
  }

  return `[Unsupported file type: ${ext}]`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
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
