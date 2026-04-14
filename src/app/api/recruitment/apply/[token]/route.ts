import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { loadAIConfig } from '@/lib/ai-config'

export const dynamic = 'force-dynamic'

// ============================================================================
// GET — Load candidate record + position questions for the questionnaire
// PUBLIC route — no auth required, validates access_token
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createServiceRoleClient()

    // Validate token and load candidate
    const { data: candidate, error: candidateError } = await supabase
      .from('recruitment_candidates')
      .select('id, full_name, position_id, status, knowledge_responses, personality_responses, progress')
      .eq('access_token', token)
      .single()

    if (candidateError || !candidate) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 404 })
    }

    // Load position
    const { data: position, error: positionError } = await supabase
      .from('recruitment_positions')
      .select('id, title, role, status, question_bank, personality_questions')
      .eq('id', candidate.position_id)
      .single()

    if (positionError || !position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    if (position.status !== 'open') {
      return NextResponse.json({ error: 'This position is no longer accepting applications' }, { status: 410 })
    }

    // Determine which questions have already been answered
    const knowledgeResponses = (candidate.knowledge_responses || []) as Array<{ question_id: string }>
    const personalityResponses = (candidate.personality_responses || []) as Array<{ question_id: string }>
    const answeredIds = new Set([
      ...knowledgeResponses.map((r) => r.question_id),
      ...personalityResponses.map((r) => r.question_id),
    ])

    // Build unanswered question lists
    const allKnowledgeQuestions = (position.question_bank || []) as Array<{ id: string; [key: string]: unknown }>
    const allPersonalityQuestions = (position.personality_questions || []) as Array<{ id: string; [key: string]: unknown }>

    const unansweredKnowledge = allKnowledgeQuestions.filter((q) => !answeredIds.has(q.id))
    const unansweredPersonality = allPersonalityQuestions.filter((q) => !answeredIds.has(q.id))

    const totalQuestions = allKnowledgeQuestions.length + allPersonalityQuestions.length
    const answeredCount = answeredIds.size

    // Load brand config for the apply page
    const aiConfig = await loadAIConfig(supabase)
    const brand = {
      centre_name: aiConfig.brandCentreName,
      primary_colour: aiConfig.brandPrimaryColour,
      gold_colour: aiConfig.brandGoldColour,
      tagline: aiConfig.brandTagline,
    }

    return NextResponse.json({
      candidate: {
        id: candidate.id,
        full_name: candidate.full_name,
        status: candidate.status,
      },
      position: {
        id: position.id,
        title: position.title,
        role: position.role,
      },
      questions: {
        knowledge: unansweredKnowledge,
        personality: unansweredPersonality,
      },
      progress: {
        answered: answeredCount,
        total: totalQuestions,
        remaining: totalQuestions - answeredCount,
        sections: candidate.progress,
      },
      brand,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ============================================================================
// POST — Save a single answer
// PUBLIC route — no auth required, validates access_token
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createServiceRoleClient()

    // Validate token and load candidate
    const { data: candidate, error: candidateError } = await supabase
      .from('recruitment_candidates')
      .select('id, position_id, status, knowledge_responses, personality_responses, progress')
      .eq('access_token', token)
      .single()

    if (candidateError || !candidate) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 404 })
    }

    if (candidate.status === 'submitted' || candidate.status === 'reviewed') {
      return NextResponse.json({ error: 'Questionnaire already completed' }, { status: 400 })
    }

    const { question_id, answer, time_seconds } = await request.json()

    if (!question_id || answer === undefined) {
      return NextResponse.json({ error: 'question_id and answer are required' }, { status: 400 })
    }

    // Load position to determine question type
    const { data: position } = await supabase
      .from('recruitment_positions')
      .select('question_bank, personality_questions')
      .eq('id', candidate.position_id)
      .single()

    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    const knowledgeQuestions = (position.question_bank || []) as Array<{ id: string }>
    const personalityQuestions = (position.personality_questions || []) as Array<{ id: string }>

    const isKnowledge = knowledgeQuestions.some((q) => q.id === question_id)
    const isPersonality = personalityQuestions.some((q) => q.id === question_id)

    if (!isKnowledge && !isPersonality) {
      return NextResponse.json({ error: 'Invalid question_id' }, { status: 400 })
    }

    const responseEntry = {
      question_id,
      answer,
      time_seconds: time_seconds || null,
      answered_at: new Date().toISOString(),
    }

    // Append to appropriate responses array
    const knowledgeResponses = (candidate.knowledge_responses || []) as Array<{ question_id: string }>
    const personalityResponses = (candidate.personality_responses || []) as Array<{ question_id: string }>

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (isKnowledge) {
      updateData.knowledge_responses = [...knowledgeResponses, responseEntry]
    } else {
      updateData.personality_responses = [...personalityResponses, responseEntry]
    }

    // Update progress
    const progress = (candidate.progress || { knowledge: false, personality: false, disc: false }) as Record<string, boolean>
    const newKnowledgeCount = isKnowledge
      ? knowledgeResponses.length + 1
      : knowledgeResponses.length
    const newPersonalityCount = isPersonality
      ? personalityResponses.length + 1
      : personalityResponses.length

    if (newKnowledgeCount >= knowledgeQuestions.length) {
      progress.knowledge = true
    }
    if (newPersonalityCount >= personalityQuestions.length) {
      progress.personality = true
    }
    updateData.progress = progress

    // Check if all questions are answered
    const totalQuestions = knowledgeQuestions.length + personalityQuestions.length
    const totalAnswered = newKnowledgeCount + newPersonalityCount
    const remaining = totalQuestions - totalAnswered

    if (remaining <= 0) {
      updateData.status = 'submitted'
      updateData.knowledge_completed_at = new Date().toISOString()
    } else if (candidate.status === 'invited') {
      updateData.status = 'in_progress'
    }

    const { error: updateError } = await supabase
      .from('recruitment_candidates')
      .update(updateData)
      .eq('id', candidate.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, remaining })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
