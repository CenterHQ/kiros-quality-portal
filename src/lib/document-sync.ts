import { createHash } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAppToken, getSiteId, getDriveId, downloadFile, getItemByPath } from '@/lib/microsoft-graph'
import { storeAndUploadDocument } from '@/lib/document-storage'

export interface SyncResult {
  checked: number
  updated: number
  errors: number
  details: string[]
}

export async function syncAllDocuments(): Promise<SyncResult> {
  const supabase = createServiceRoleClient()
  const result: SyncResult = { checked: 0, updated: 0, errors: 0, details: [] }

  // Get all synced documents that have SharePoint item IDs
  const { data: docs, error } = await supabase
    .from('ai_generated_documents')
    .select('id, title, content_hash, sharepoint_item_ids, sharepoint_folder_path, format_variants')
    .not('sharepoint_item_ids', 'eq', '{}')

  if (error || !docs || docs.length === 0) {
    result.details.push(error ? `DB error: ${error.message}` : 'No documents to sync')
    return result
  }

  let token: string
  let driveId: string
  try {
    token = await getAppToken()
    const siteId = await getSiteId(token)
    driveId = await getDriveId(token, siteId)
  } catch (err) {
    result.errors++
    result.details.push(`Auth failed: ${err instanceof Error ? err.message : 'Unknown'}`)
    return result
  }

  for (const doc of docs) {
    result.checked++
    const itemIds = doc.sharepoint_item_ids as Record<string, string>
    const mdItemId = itemIds?.md

    if (!mdItemId) continue

    try {
      // Download the .md file from SharePoint and compare hash
      const mdBuffer = await downloadFile(token, driveId, mdItemId)
      const spContent = mdBuffer.toString('utf-8')
      const spHash = createHash('md5').update(spContent).digest('hex')

      if (spHash !== doc.content_hash) {
        // Content has changed in SharePoint — update local record
        await supabase
          .from('ai_generated_documents')
          .update({
            markdown_content: spContent,
            content_hash: spHash,
            sync_status: 'modified_externally',
            version: (doc as unknown as { version: number }).version + 1,
            updated_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', doc.id)

        result.updated++
        result.details.push(`Updated: ${doc.title}`)
      } else {
        // No changes — update sync timestamp
        await supabase
          .from('ai_generated_documents')
          .update({
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', doc.id)
      }
    } catch (err) {
      result.errors++
      result.details.push(`Error syncing "${doc.title}": ${err instanceof Error ? err.message : 'Unknown'}`)
    }
  }

  // Retry pending uploads that failed initial upload
  try {
    const { data: pendingDocs } = await supabase
      .from('ai_generated_documents')
      .select('id, title, document_type, topic_folder, markdown_content, created_by')
      .eq('sync_status', 'pending_upload')
      .limit(5)

    if (pendingDocs && pendingDocs.length > 0) {
      for (const doc of pendingDocs) {
        try {
          const uploadResult = await storeAndUploadDocument({
            title: doc.title,
            documentType: doc.document_type,
            markdownContent: doc.markdown_content,
            topicFolder: doc.topic_folder || 'General',
            userId: doc.created_by,
          })
          if (uploadResult?.documentId) {
            // Mark original as superseded (new doc was created by storeAndUploadDocument)
            await supabase
              .from('ai_generated_documents')
              .update({ sync_status: 'synced', last_synced_at: new Date().toISOString() })
              .eq('id', doc.id)
          }
        } catch {
          // Individual retry failed — will try again next cron cycle
        }
      }
    }
  } catch {
    // Non-critical — pending retry failed
  }

  return result
}
