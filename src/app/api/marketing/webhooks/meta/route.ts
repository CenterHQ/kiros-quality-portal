import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/marketing/meta-api'

export const dynamic = 'force-dynamic'

// Webhook verification (Meta sends GET to verify the endpoint)
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const token = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// Webhook event handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    // Verify signature
    const signature = request.headers.get('x-hub-signature-256')
    if (signature && !verifyWebhookSignature(signature, body)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const payload = JSON.parse(body)
    const supabase = createServiceRoleClient()

    // Process each entry
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        // Store the raw event for processing
        await supabase.from('marketing_analytics_cache').upsert({
          platform: 'facebook',
          metric_type: `webhook_${change.field}`,
          date_range_start: new Date().toISOString().split('T')[0],
          date_range_end: new Date().toISOString().split('T')[0],
          data: change.value,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'platform,metric_type,date_range_start,date_range_end' })

        // Handle specific event types
        if (change.field === 'ratings') {
          // New review on Facebook page
          const reviewData = change.value
          await supabase.from('marketing_reviews').upsert({
            platform: 'facebook',
            platform_review_id: reviewData.review_id || `fb_${Date.now()}`,
            reviewer_name: reviewData.reviewer_name || 'Facebook User',
            rating: reviewData.rating,
            review_text: reviewData.review_text,
            review_date: new Date().toISOString(),
            response_status: 'unread',
          }, { onConflict: 'platform_review_id' })
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: unknown) {
    console.error('Meta webhook error:', error)
    return NextResponse.json({ status: 'ok' }) // Always return 200 to Meta
  }
}
