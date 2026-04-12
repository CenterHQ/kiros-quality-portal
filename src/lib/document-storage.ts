import { createHash } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAppToken, getSiteId, getDriveId, ensureFolderPath, uploadFile } from '@/lib/microsoft-graph'
import { generatePdfDocument, generateWordDocument, type DocumentOptions } from '@/lib/document-templates'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoreDocumentInput {
  title: string
  documentType: string
  markdownContent: string
  topicFolder: string
  conversationId?: string
  messageId?: string
  userId: string
  recipient?: string
  tags?: string[]
  relatedQA?: number[]
}

export interface StoreDocumentResult {
  documentId: string
  sharepointFolderPath: string
  sharepointUrls: Record<string, string>
  formatVariants: string[]
}

// ---------------------------------------------------------------------------
// SECURITY: Write path constraint — independent of microsoft-graph.ts checks
// ---------------------------------------------------------------------------

// This constant is the ONLY allowed SharePoint root for AI document writes.
// It is hardcoded here as a second independent check (microsoft-graph.ts has its own).
// Both must agree. Changing one without the other will cause writes to fail safely.
const SHAREPOINT_WRITE_ROOT = 'Kiros AI' as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitiseFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\.\./g, '')        // block path traversal
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100)
}

function sanitiseFolderName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\.\./g, '')        // block path traversal
    .replace(/[/\\]/g, '')       // block slashes in folder name
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60)
}

function computeHash(content: string): string {
  return createHash('md5').update(content).digest('hex')
}

/**
 * Build a safe folder path. Always produces "Kiros AI/{sanitised name}".
 * Throws if the result would somehow not start with the allowed root.
 */
function buildSafeFolderPath(topicFolder: string): string {
  const sanitised = sanitiseFolderName(topicFolder)
  if (!sanitised) {
    throw new Error('[STORAGE] topic_folder is empty after sanitisation')
  }
  const folderPath = `${SHAREPOINT_WRITE_ROOT}/${sanitised}`

  // Final safety assertion — should always pass given the construction above,
  // but guards against any logic error in sanitiseFolderName
  if (!folderPath.startsWith(SHAREPOINT_WRITE_ROOT + '/')) {
    throw new Error(`[STORAGE WRITE DENIED] constructed path "${folderPath}" does not start with "${SHAREPOINT_WRITE_ROOT}/"`)
  }

  return folderPath
}

// ---------------------------------------------------------------------------
// Main storage function
// ---------------------------------------------------------------------------

export async function storeAndUploadDocument(
  input: StoreDocumentInput,
): Promise<StoreDocumentResult> {
  const supabase = createServiceRoleClient()
  const baseFilename = sanitiseFilename(input.title)
  const folderPath = buildSafeFolderPath(input.topicFolder)
  const contentHash = computeHash(input.markdownContent)

  // Build JSON metadata
  const jsonMetadata = {
    title: input.title,
    document_type: input.documentType,
    topic_folder: input.topicFolder,
    created_at: new Date().toISOString(),
    conversation_id: input.conversationId || null,
    content_hash: contentHash,
    tags: input.tags || [],
    related_qa: input.relatedQA || [],
    author: 'Kiros AI Assistant',
    recipient: input.recipient || null,
  }

  // Generate format variants
  const docOptions: DocumentOptions = {
    title: input.title,
    content: input.markdownContent,
    recipient: input.recipient,
    author: 'Kiros AI Assistant',
    format: 'docx', // placeholder — each generator ignores this
  }

  const formatVariants: string[] = ['md', 'json']
  const sharepointUrls: Record<string, string> = {}
  const sharepointItemIds: Record<string, string> = {}

  // Try to upload to SharePoint
  let sharepointFolderId: string | null = null
  let sharepointFolderWebUrl: string | null = null

  try {
    const token = await getAppToken()
    const siteId = await getSiteId(token)
    const driveId = await getDriveId(token, siteId)

    // Ensure folder exists
    const folder = await ensureFolderPath(token, driveId, folderPath)
    sharepointFolderId = folder.id
    sharepointFolderWebUrl = folder.webUrl

    // Upload .md file
    const mdBuffer = Buffer.from(input.markdownContent, 'utf-8')
    const mdResult = await uploadFile(token, driveId, folderPath, `${baseFilename}.md`, mdBuffer, 'text/markdown')
    sharepointUrls.md = mdResult.webUrl
    sharepointItemIds.md = mdResult.id

    // Upload .json metadata
    const jsonBuffer = Buffer.from(JSON.stringify(jsonMetadata, null, 2), 'utf-8')
    const jsonResult = await uploadFile(token, driveId, folderPath, `${baseFilename}.json`, jsonBuffer, 'application/json')
    sharepointUrls.json = jsonResult.webUrl
    sharepointItemIds.json = jsonResult.id

    // Generate and upload .docx
    try {
      const docxBuffer = await generateWordDocument(input.title, input.markdownContent, docOptions)
      const docxResult = await uploadFile(token, driveId, folderPath, `${baseFilename}.docx`, docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      sharepointUrls.docx = docxResult.webUrl
      sharepointItemIds.docx = docxResult.id
      formatVariants.push('docx')
    } catch (err) {
      console.error('DOCX generation/upload failed:', err)
    }

    // Generate and upload .pdf
    try {
      const pdfBuffer = await generatePdfDocument(input.title, input.markdownContent, docOptions)
      const pdfResult = await uploadFile(token, driveId, folderPath, `${baseFilename}.pdf`, pdfBuffer, 'application/pdf')
      sharepointUrls.pdf = pdfResult.webUrl
      sharepointItemIds.pdf = pdfResult.id
      formatVariants.push('pdf')
    } catch (err) {
      console.error('PDF generation/upload failed:', err)
    }
  } catch (err) {
    console.error('SharePoint upload failed (documents stored locally):', err)
  }

  // Insert database record
  const { data: doc, error } = await supabase
    .from('ai_generated_documents')
    .insert({
      conversation_id: input.conversationId || null,
      message_id: input.messageId || null,
      title: input.title,
      document_type: input.documentType,
      topic_folder: input.topicFolder,
      markdown_content: input.markdownContent,
      json_metadata: jsonMetadata,
      sharepoint_folder_id: sharepointFolderId,
      sharepoint_folder_path: sharepointFolderWebUrl ? folderPath : null,
      sharepoint_urls: sharepointUrls,
      sharepoint_item_ids: sharepointItemIds,
      format_variants: formatVariants,
      content_hash: contentHash,
      sync_status: Object.keys(sharepointUrls).length > 0 ? 'synced' : 'pending_upload',
      created_by: input.userId,
      last_synced_at: Object.keys(sharepointUrls).length > 0 ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to insert ai_generated_documents record:', error)
    throw new Error(`Document storage failed: ${error.message}`)
  }

  return {
    documentId: doc.id,
    sharepointFolderPath: folderPath,
    sharepointUrls,
    formatVariants,
  }
}
