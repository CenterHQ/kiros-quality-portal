import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { downloadFile, getFileMetadata, getTokenFromRefresh } from '@/lib/microsoft-graph'
import mammoth from 'mammoth'

async function getValidToken(supabase: any) {
  const { data: conn } = await supabase
    .from('sharepoint_connection')
    .select('*')
    .eq('status', 'connected')
    .single()

  if (!conn) throw new Error('SharePoint not connected')

  if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
    if (!conn.refresh_token) throw new Error('No refresh token available')
    const result = await getTokenFromRefresh(conn.refresh_token)
    if (!result) throw new Error('Failed to refresh token')
    await supabase.from('sharepoint_connection').update({
      access_token: result.accessToken,
      token_expires_at: result.expiresOn?.toISOString(),
    }).eq('id', conn.id)
    return { token: result.accessToken, driveId: conn.drive_id }
  }

  return { token: conn.access_token, driveId: conn.drive_id }
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
    // Basic PDF text extraction - look for text streams
    const text = buffer.toString('utf-8')
    // Extract readable text portions from PDF
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

    // Get file metadata
    const metadata = await getFileMetadata(token, driveId, itemId)

    // Download file content
    const buffer = await downloadFile(token, driveId, itemId)

    // Extract text
    const extractedText = await extractText(buffer, metadata.name)

    // Compute simple hash for change detection
    const crypto = await import('crypto')
    const contentHash = crypto.createHash('md5').update(buffer).digest('hex')

    // Upsert document record
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
