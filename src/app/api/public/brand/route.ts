import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { loadAIConfig } from '@/lib/ai-config'

export const dynamic = 'force-dynamic'

// ============================================================================
// GET — Load brand settings for the apply page
// PUBLIC route — no auth required
// ============================================================================

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    const aiConfig = await loadAIConfig(supabase)

    return NextResponse.json({
      centre_name: aiConfig.brandCentreName,
      primary_colour: aiConfig.brandPrimaryColour,
      gold_colour: aiConfig.brandGoldColour,
      tagline: aiConfig.brandTagline,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
