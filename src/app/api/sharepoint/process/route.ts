import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CONTEXT_EXTRACTION_PROMPT = `You are an expert in Australian Early Childhood Education and Care (ECEC), the National Quality Framework (NQF), and Assessment & Rating (A&R).

Analyse this document from an early childhood education centre and extract structured context that can be used to personalise staff training modules.

Document name: {FILE_NAME}
Document type: {DOCUMENT_TYPE}

Content:
---
{CONTENT}
---

Extract the following as a JSON array. Each item should have:
- "context_type": one of: "qip_goal", "qip_strategy", "philosophy_principle", "policy_requirement", "procedure_step", "service_value", "teaching_approach", "family_engagement", "inclusion_practice", "safety_protocol", "environment_feature", "leadership_goal"
- "title": short descriptive title (max 100 chars)
- "content": the extracted information in 2-4 sentences, written so it can be referenced in training
- "related_qa": array of QA numbers (1-7) this relates to
- "related_element_codes": array of NQS element codes (e.g. "1.1.1", "2.2.3") this relates to
- "source_quote": a brief direct quote from the document (if available)

Extract ALL relevant items. For a QIP, extract each goal and strategy. For a philosophy, extract each principle or value. For policies, extract key requirements that staff need to know.

Return ONLY a valid JSON array, no other text.`

const MODULE_CONTEXTUALISATION_PROMPT = `You are personalising a training module for educators at Kiros Early Education Centre.

Module: {MODULE_TITLE}
Module Description: {MODULE_DESCRIPTION}
Module QA Areas: {MODULE_QA}

Centre Context (from their QIP, philosophy, and policies):
{CONTEXT_ITEMS}

Generate personalised additions for this module. Return a JSON array with items that have:
- "content_type": one of: "application", "reflection_prompt", "case_study", "action_step"
- "title": descriptive title
- "content": the personalised content (2-4 sentences). Reference specific Kiros practices, philosophy principles, QIP goals, or policies. Use the centre's own language where possible.

Generate:
1. One "application" item: "How this applies at Kiros" - connect the module topic to the centre's specific context
2. One "reflection_prompt": A reflection question that references their QIP goals or philosophy
3. One "action_step": A practical action the educator can take that aligns with the centre's approach

Return ONLY a valid JSON array, no other text.`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { action, documentId, moduleId } = await request.json()

    if (action === 'extract_context') {
      // Extract context from a synced document
      const { data: doc } = await supabase
        .from('sharepoint_documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (!doc || !doc.extracted_text) {
        return NextResponse.json({ error: 'Document not found or not synced' }, { status: 400 })
      }

      const prompt = CONTEXT_EXTRACTION_PROMPT
        .replace('{FILE_NAME}', doc.file_name)
        .replace('{DOCUMENT_TYPE}', doc.document_type || 'other')
        .replace('{CONTENT}', doc.extracted_text.substring(0, 80000))

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

      // Parse the JSON response
      let contextItems
      try {
        // Handle potential markdown code blocks
        const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        contextItems = JSON.parse(jsonStr)
      } catch {
        return NextResponse.json({ error: 'Failed to parse AI response', raw: responseText }, { status: 500 })
      }

      // Store extracted context
      const inserts = contextItems.map((item: any) => ({
        document_id: documentId,
        context_type: item.context_type,
        title: item.title,
        content: item.content,
        related_qa: item.related_qa || [],
        related_element_codes: item.related_element_codes || [],
        source_quote: item.source_quote || null,
        ai_generated: true,
        is_active: true,
      }))

      // Delete old context for this document before inserting new
      await supabase.from('centre_context').delete().eq('document_id', documentId)

      const { data: inserted, error } = await supabase
        .from('centre_context')
        .insert(inserts)
        .select()

      if (error) throw error

      // Mark document as processed
      await supabase.from('sharepoint_documents').update({
        last_processed_at: new Date().toISOString(),
      }).eq('id', documentId)

      return NextResponse.json({ context: inserted, count: inserted?.length })

    } else if (action === 'contextualise_module') {
      // Generate centre-specific content for a training module
      const { data: lmsModule } = await supabase
        .from('lms_modules')
        .select('*')
        .eq('id', moduleId)
        .single()

      if (!lmsModule) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

      // Get relevant centre context based on module's QA areas
      const { data: contextItems } = await supabase
        .from('centre_context')
        .select('*')
        .eq('is_active', true)
        .overlaps('related_qa', lmsModule.related_qa || [])

      if (!contextItems || contextItems.length === 0) {
        return NextResponse.json({ error: 'No centre context available for this module\'s QA areas. Sync and process documents first.' }, { status: 400 })
      }

      const contextStr = contextItems
        .map((c: any) => `[${c.context_type}] ${c.title}: ${c.content}${c.source_quote ? ` (Quote: "${c.source_quote}")` : ''}`)
        .join('\n\n')

      const prompt = MODULE_CONTEXTUALISATION_PROMPT
        .replace('{MODULE_TITLE}', lmsModule.title)
        .replace('{MODULE_DESCRIPTION}', lmsModule.description || '')
        .replace('{MODULE_QA}', (lmsModule.related_qa || []).map((n: number) => `QA${n}`).join(', '))
        .replace('{CONTEXT_ITEMS}', contextStr)

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

      let moduleContent
      try {
        const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        moduleContent = JSON.parse(jsonStr)
      } catch {
        return NextResponse.json({ error: 'Failed to parse AI response', raw: responseText }, { status: 500 })
      }

      // Store centre-specific module content
      for (const item of moduleContent) {
        await supabase.from('lms_module_centre_content').upsert({
          module_id: moduleId,
          context_id: contextItems[0]?.id,
          content_type: item.content_type,
          title: item.title,
          content: item.content,
          sort_order: item.content_type === 'application' ? 0 : item.content_type === 'reflection_prompt' ? 1 : 2,
          is_active: true,
          generated_at: new Date().toISOString(),
        }, { onConflict: 'module_id,context_id,content_type' })
      }

      return NextResponse.json({ content: moduleContent, count: moduleContent.length })

    } else if (action === 'contextualise_all') {
      // Contextualise all modules
      const { data: modules } = await supabase
        .from('lms_modules')
        .select('id, title, related_qa')
        .eq('status', 'published')

      if (!modules) return NextResponse.json({ error: 'No modules found' }, { status: 404 })

      const { data: contextItems } = await supabase
        .from('centre_context')
        .select('*')
        .eq('is_active', true)

      if (!contextItems || contextItems.length === 0) {
        return NextResponse.json({ error: 'No centre context available. Sync and process documents first.' }, { status: 400 })
      }

      let processed = 0
      for (const mod of modules) {
        const relevantContext = contextItems.filter((c: any) =>
          c.related_qa?.some((qa: number) => mod.related_qa?.includes(qa))
        )

        if (relevantContext.length === 0) continue

        const contextStr = relevantContext
          .slice(0, 10)
          .map((c: any) => `[${c.context_type}] ${c.title}: ${c.content}`)
          .join('\n\n')

        const prompt = MODULE_CONTEXTUALISATION_PROMPT
          .replace('{MODULE_TITLE}', mod.title)
          .replace('{MODULE_DESCRIPTION}', '')
          .replace('{MODULE_QA}', (mod.related_qa || []).map((n: number) => `QA${n}`).join(', '))
          .replace('{CONTEXT_ITEMS}', contextStr)

        try {
          const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }],
          })

          const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
          const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          const moduleContent = JSON.parse(jsonStr)

          for (const item of moduleContent) {
            await supabase.from('lms_module_centre_content').upsert({
              module_id: mod.id,
              context_id: relevantContext[0]?.id,
              content_type: item.content_type,
              title: item.title,
              content: item.content,
              sort_order: item.content_type === 'application' ? 0 : item.content_type === 'reflection_prompt' ? 1 : 2,
              is_active: true,
              generated_at: new Date().toISOString(),
            }, { onConflict: 'module_id,context_id,content_type' })
          }
          processed++
        } catch (err) {
          console.error(`Failed to contextualise module ${mod.title}:`, err)
        }
      }

      return NextResponse.json({ processed, total: modules.length })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('SharePoint process error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
