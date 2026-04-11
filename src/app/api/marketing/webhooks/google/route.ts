import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Google Business Profile push notifications
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const supabase = createServiceRoleClient()

    // Store the notification for processing
    await supabase.from('marketing_analytics_cache').upsert({
      platform: 'google_business',
      metric_type: 'webhook_notification',
      date_range_start: new Date().toISOString().split('T')[0],
      date_range_end: new Date().toISOString().split('T')[0],
      data: payload,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'platform,metric_type,date_range_start,date_range_end' })

    return NextResponse.json({ status: 'ok' })
  } catch (error: unknown) {
    console.error('Google webhook error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}
