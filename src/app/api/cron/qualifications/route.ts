import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { loadAIConfig } from '@/lib/ai-config'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const aiConfig = await loadAIConfig(supabase)
  const warningDays = aiConfig.cronQualificationWarningDays
  const today = new Date().toISOString().split('T')[0]
  const threshold = new Date(Date.now() + warningDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Mark expired
  const { data: expiredData, error: expiredError } = await supabase
    .from('staff_qualifications')
    .update({ status: 'expired' })
    .lt('expiry_date', today)
    .in('status', ['current', 'expiring_soon'])
    .select('id')
  if (expiredError) console.error('[Kiros AI] Qualification expiry update failed:', expiredError.message)

  // Mark expiring soon (within 30 days)
  const { data: expiringSoonData, error: expiringSoonError } = await supabase
    .from('staff_qualifications')
    .update({ status: 'expiring_soon' })
    .gte('expiry_date', today)
    .lte('expiry_date', threshold)
    .eq('status', 'current')
    .select('id')
  if (expiringSoonError) console.error('[Kiros AI] Qualification expiring-soon update failed:', expiringSoonError.message)

  return NextResponse.json({
    updated: { expired: expiredData?.length || 0, expiring_soon: expiringSoonData?.length || 0 },
    timestamp: new Date().toISOString(),
  })
}
