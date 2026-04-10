import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import mammoth from 'mammoth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 })

    const results = []

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const safeName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(safeName, buffer, { contentType: file.type })

      if (uploadError) {
        results.push({ name: file.name, error: uploadError.message })
        continue
      }

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(safeName, 3600) // 1 hour

      const result: Record<string, unknown> = {
        name: file.name,
        url: urlData?.signedUrl || '',
        type: file.type,
        size: file.size,
        storagePath: safeName,
      }

      // Process based on file type
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
      const isPdf = ext === 'pdf'
      const isDocx = ext === 'docx'
      const isText = ['txt', 'md', 'csv'].includes(ext)

      if (isImage) {
        // Return base64 for Claude vision
        result.base64 = buffer.toString('base64')
        result.mediaType = file.type
      } else if (isPdf) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require('pdf-parse')
          const pdfData = await pdfParse(buffer) as { text: string; numpages: number }
          result.text = pdfData.text.substring(0, 50000)
          result.pageCount = pdfData.numpages
        } catch (e) {
          result.text = '[PDF text extraction failed]'
        }
      } else if (isDocx) {
        try {
          const docResult = await mammoth.extractRawText({ buffer })
          result.text = docResult.value.substring(0, 50000)
        } catch (e) {
          result.text = '[DOCX text extraction failed]'
        }
      } else if (isText) {
        result.text = buffer.toString('utf-8').substring(0, 50000)
      }

      results.push(result)
    }

    return NextResponse.json({ files: results })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 })
  }
}
