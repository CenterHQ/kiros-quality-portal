import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { runAgent } from '@/lib/chat/orchestrator'
import { ALL_TOOLS } from '@/lib/chat/shared'
import { MODEL_SONNET } from '@/lib/chat/model-router'
import type Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { systemPrompt, tools, model, maxIterations, tokenBudget, testQuery } = await request.json()

  if (!systemPrompt || !testQuery) {
    return NextResponse.json({ error: 'systemPrompt and testQuery are required' }, { status: 400 })
  }

  // Build tool array from tool names
  const toolDefs: Anthropic.Tool[] = ALL_TOOLS
    .filter(t => (tools || []).includes(t.name))
    .map(({ allowedRoles: _, ...rest }) => rest)

  const serviceSupabase = createServiceRoleClient()

  // Load centre context from service_details
  const { data: serviceDetails } = await serviceSupabase
    .from('service_details')
    .select('key, value')
    .in('key', ['service_name', 'service_address'])
  const centreName = serviceDetails?.find((d: { key: string; value: string }) => d.key === 'service_name')?.value || 'Kiros Early Education'
  const location = serviceDetails?.find((d: { key: string; value: string }) => d.key === 'service_address')?.value || 'Blackett NSW'

  const result = await runAgent(
    {
      agentName: 'test-agent',
      description: testQuery,
      systemPrompt,
      tools: toolDefs,
      context: `Centre: ${centreName}, ${location}. Today: ${new Date().toISOString().split('T')[0]}. This is a test run from the admin panel.`,
      model: model || MODEL_SONNET,
      maxIterations: maxIterations || 3,
      tokenBudget: tokenBudget || 8192,
    },
    serviceSupabase,
  )

  return NextResponse.json({
    output: result.output,
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
    status: result.status,
  })
}
