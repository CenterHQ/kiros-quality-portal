import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadAIConfig } from '@/lib/ai-config'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ============================================================================
// POST — Save DISC assessment results (any authenticated user — self-assessment)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { disc_d, disc_i, disc_s, disc_c, responses } = await request.json()

    if (disc_d === undefined || disc_i === undefined || disc_s === undefined || disc_c === undefined) {
      return NextResponse.json({ error: 'disc_d, disc_i, disc_s, and disc_c scores are required' }, { status: 400 })
    }

    // Determine primary and secondary types
    const scores = { D: disc_d, I: disc_i, S: disc_s, C: disc_c }
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a)
    const primaryType = sorted[0][0]
    const secondaryType = sorted[1][0]

    // Call Claude to generate analysis
    const aiConfig = await loadAIConfig(supabase)
    const anthropic = new Anthropic()

    const analysisPrompt = `You are an organisational psychologist specialising in DISC profiling for early childhood educators.

DISC Scores:
- Dominance (D): ${disc_d}
- Influence (I): ${disc_i}
- Steadiness (S): ${disc_s}
- Conscientiousness (C): ${disc_c}
- Primary Type: ${primaryType}
- Secondary Type: ${secondaryType}

${responses ? `Assessment Responses:\n${JSON.stringify(responses, null, 2)}` : ''}

Generate a comprehensive DISC analysis for this early childhood education professional.

Respond in JSON format:
{
  "communication_style": "2-3 sentences about how they communicate",
  "conflict_approach": "2-3 sentences about how they handle conflict",
  "leadership_tendency": "2-3 sentences about their leadership style",
  "motivational_drivers": ["driver1", "driver2", "driver3"],
  "stress_responses": "2-3 sentences about behaviour under stress",
  "full_analysis": {
    "summary": "1 paragraph overall summary",
    "strengths_in_ece": ["strength1", "strength2", "strength3"],
    "growth_areas": ["area1", "area2"],
    "ideal_team_dynamics": "How they best work in a team",
    "recommended_room_environment": "What room/age group they may thrive in"
  }
}`

    const result = await anthropic.messages.create({
      model: aiConfig.modelSonnet,
      max_tokens: 2048,
      messages: [{ role: 'user', content: analysisPrompt }],
    })

    const analysisText = result.content[0].type === 'text' ? result.content[0].text : ''
    const analysis = JSON.parse(analysisText.replace(/```json\n?|```/g, '').trim())

    // Upsert into staff_disc_profiles
    const { error: upsertError } = await supabase
      .from('staff_disc_profiles')
      .upsert({
        user_id: user.id,
        disc_d,
        disc_i,
        disc_s,
        disc_c,
        primary_type: primaryType,
        secondary_type: secondaryType,
        communication_style: analysis.communication_style,
        conflict_approach: analysis.conflict_approach,
        leadership_tendency: analysis.leadership_tendency,
        motivational_drivers: analysis.motivational_drivers,
        stress_responses: analysis.stress_responses,
        full_analysis: analysis.full_analysis,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[DISC Results]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
