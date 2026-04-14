import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { loadAIConfig } from '@/lib/ai-config'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// ============================================================================
// POST — Trigger AI scoring for a candidate
// Auth required (admin/manager/ns)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
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

    const { candidate_id } = await request.json()

    if (!candidate_id) {
      return NextResponse.json({ error: 'candidate_id is required' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Load candidate with position data
    const { data: candidate, error: candError } = await serviceClient
      .from('recruitment_candidates')
      .select('*, recruitment_positions(title, role, question_bank, personality_questions)')
      .eq('id', candidate_id)
      .single()

    if (candError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const position = candidate.recruitment_positions as { title: string; role: string; question_bank: unknown[]; personality_questions: unknown[] }
    const knowledgeResponses = (candidate.knowledge_responses || []) as Array<{ question_id: string; answer: string }>
    const personalityResponses = (candidate.personality_responses || []) as Array<{ question_id: string; answer: string }>

    // Load scoring weights from ai_config
    const aiConfig = await loadAIConfig(serviceClient)
    const { data: recruitConfig } = await serviceClient
      .from('ai_config')
      .select('config_key, config_value')
      .like('config_key', 'recruitment.%')

    const weights: Record<string, number> = {}
    for (const row of recruitConfig || []) {
      const key = row.config_key.replace('recruitment.', '')
      weights[key] = parseInt(row.config_value, 10)
    }
    const weightKnowledge = weights.score_weight_knowledge || 40
    const weightPersonality = weights.score_weight_personality || 30
    const weightTeamFit = weights.score_weight_team_fit || 30

    const anthropic = new Anthropic()

    // Build question map for context
    const questionBank = (position.question_bank || []) as Array<{ id: string; question: string; scoring_rubric?: string }>
    const personalityQuestionBank = (position.personality_questions || []) as Array<{ id: string; question: string; category?: string }>

    // ---- Step 1: Score knowledge answers ----
    const knowledgePrompt = `You are an expert early childhood education assessor. Score each knowledge answer from 0-10.

Position: ${position.title} (${position.role})

Questions and Answers:
${knowledgeResponses.map((r) => {
  const q = questionBank.find((qb) => qb.id === r.question_id)
  return `Question: ${q?.question || 'Unknown'}
Scoring Rubric: ${q?.scoring_rubric || 'Use professional judgement'}
Answer: ${r.answer}`
}).join('\n\n---\n\n')}

Respond in JSON format:
{
  "scores": [{ "question_id": "...", "score": 0-10, "feedback": "brief feedback" }],
  "overall_percentage": 0-100,
  "knowledge_summary": "2-3 sentence summary of knowledge level"
}`

    const knowledgeResult = await anthropic.messages.create({
      model: aiConfig.modelSonnet,
      max_tokens: 4096,
      messages: [{ role: 'user', content: knowledgePrompt }],
    })

    const knowledgeText = knowledgeResult.content[0].type === 'text' ? knowledgeResult.content[0].text : ''
    const knowledgeData = JSON.parse(knowledgeText.replace(/```json\n?|```/g, '').trim())

    // ---- Step 2: DISC profile + personality analysis ----
    const personalityPrompt = `You are an organisational psychologist specialising in DISC profiling and personality assessment for early childhood educators.

Candidate: ${candidate.full_name}
Position: ${position.title} (${position.role})

Personality Responses:
${personalityResponses.map((r) => {
  const q = personalityQuestionBank.find((qb) => qb.id === r.question_id)
  return `Question: ${q?.question || 'Unknown'} (Category: ${q?.category || 'general'})
Answer: ${r.answer}`
}).join('\n\n---\n\n')}

Analyse the responses and provide:
1. DISC profile scores (D, I, S, C — each 0-100, must total roughly 100)
2. Primary and secondary DISC type
3. Personality analysis

Respond in JSON format:
{
  "disc_profile": {
    "disc_d": 0-100,
    "disc_i": 0-100,
    "disc_s": 0-100,
    "disc_c": 0-100,
    "primary_type": "D|I|S|C",
    "secondary_type": "D|I|S|C"
  },
  "personality_analysis": {
    "communication_style": "...",
    "conflict_approach": "...",
    "leadership_tendency": "...",
    "motivational_drivers": ["..."],
    "stress_responses": "...",
    "strengths": ["..."],
    "growth_areas": ["..."]
  },
  "personality_narrative": "3-4 paragraph narrative about this candidate's personality profile and suitability for early childhood education",
  "personality_score": 0-100
}`

    const personalityResult = await anthropic.messages.create({
      model: aiConfig.modelSonnet,
      max_tokens: 4096,
      messages: [{ role: 'user', content: personalityPrompt }],
    })

    const personalityText = personalityResult.content[0].type === 'text' ? personalityResult.content[0].text : ''
    const personalityData = JSON.parse(personalityText.replace(/```json\n?|```/g, '').trim())

    // ---- Step 3: Team fit analysis (if staff DISC profiles exist) ----
    let teamFitAnalysis = null
    let teamFitScore = 50 // default neutral score

    const { data: teamProfiles } = await serviceClient
      .from('staff_disc_profiles')
      .select('user_id, disc_d, disc_i, disc_s, disc_c, primary_type, secondary_type, communication_style')

    if (teamProfiles && teamProfiles.length > 0) {
      const teamFitPrompt = `You are an organisational psychologist. Analyse how this candidate would fit into the existing team.

Candidate DISC Profile:
D: ${personalityData.disc_profile.disc_d}, I: ${personalityData.disc_profile.disc_i}, S: ${personalityData.disc_profile.disc_s}, C: ${personalityData.disc_profile.disc_c}
Primary: ${personalityData.disc_profile.primary_type}, Secondary: ${personalityData.disc_profile.secondary_type}

Existing Team Profiles:
${teamProfiles.map((tp, i) => `Team Member ${i + 1}: D:${tp.disc_d} I:${tp.disc_i} S:${tp.disc_s} C:${tp.disc_c} (${tp.primary_type}/${tp.secondary_type})`).join('\n')}

Respond in JSON format:
{
  "team_fit_score": 0-100,
  "team_dynamics": "How this candidate's profile complements or challenges the existing team",
  "collaboration_strengths": ["..."],
  "potential_friction_points": ["..."],
  "recommendation": "1-2 sentence team fit recommendation"
}`

      const teamFitResult = await anthropic.messages.create({
        model: aiConfig.modelSonnet,
        max_tokens: 2048,
        messages: [{ role: 'user', content: teamFitPrompt }],
      })

      const teamFitText = teamFitResult.content[0].type === 'text' ? teamFitResult.content[0].text : ''
      teamFitAnalysis = JSON.parse(teamFitText.replace(/```json\n?|```/g, '').trim())
      teamFitScore = teamFitAnalysis.team_fit_score
    }

    // ---- Step 4: Calculate overall rank ----
    const knowledgeScore = knowledgeData.overall_percentage || 0
    const personalityScore = personalityData.personality_score || 0
    const overallRank = Math.round(
      (knowledgeScore * weightKnowledge / 100) +
      (personalityScore * weightPersonality / 100) +
      (teamFitScore * weightTeamFit / 100)
    )

    // Generate AI recommendation
    const recommendation = `Overall Score: ${overallRank}/100. Knowledge: ${knowledgeScore}% (weight ${weightKnowledge}%). Personality: ${personalityScore}% (weight ${weightPersonality}%). Team Fit: ${teamFitScore}% (weight ${weightTeamFit}%). ${knowledgeData.knowledge_summary || ''} ${personalityData.personality_narrative ? personalityData.personality_narrative.substring(0, 200) + '...' : ''}`

    // ---- Save results to candidate record ----
    const { error: updateError } = await serviceClient
      .from('recruitment_candidates')
      .update({
        knowledge_score: knowledgeScore,
        disc_profile: personalityData.disc_profile,
        personality_analysis: {
          ...personalityData.personality_analysis,
          narrative: personalityData.personality_narrative,
          score: personalityScore,
          knowledge_scores: knowledgeData.scores,
        },
        team_fit_analysis: teamFitAnalysis,
        overall_rank: overallRank,
        ai_recommendation: recommendation,
        status: 'reviewed',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      candidate_id,
      scores: {
        knowledge: knowledgeScore,
        personality: personalityScore,
        team_fit: teamFitScore,
        overall: overallRank,
      },
      disc_profile: personalityData.disc_profile,
      personality_analysis: personalityData.personality_analysis,
      team_fit_analysis: teamFitAnalysis,
      recommendation,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Recruitment Score]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
