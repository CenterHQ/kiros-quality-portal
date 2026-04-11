import { createServiceRoleClient } from '@/lib/supabase/server'

type SupabaseClient = ReturnType<typeof createServiceRoleClient>

export async function executeMarketingTool(
  toolName: string,
  input: Record<string, unknown>,
  userId: string,
  role: string,
  conversationId: string,
  supabase: SupabaseClient,
): Promise<string> {
  switch (toolName) {
    case 'generate_social_post':
      return handleGenerateSocialPost(input)

    case 'generate_ad_copy':
      return handleGenerateAdCopy(input)

    case 'draft_review_response':
      return handleDraftReviewResponse(input, supabase)

    case 'get_content_calendar':
      return handleGetContentCalendar(input, supabase)

    case 'get_social_analytics':
      return handleGetSocialAnalytics(input, supabase)

    case 'get_reviews_summary':
      return handleGetReviewsSummary(input, supabase)

    case 'get_ad_campaigns':
      return handleGetAdCampaigns(input, supabase)

    case 'save_content_draft':
      return handleSaveContentDraft(input, userId, conversationId, supabase)

    case 'schedule_content':
      return handleScheduleContent(input, userId, role, supabase)

    case 'search_centre_info':
      return handleSearchCentreInfo(input, supabase)

    case 'generate_analytics_report':
      return handleGenerateAnalyticsReport(input, supabase)

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` })
  }
}

// ─── Tool Handlers ───────────────────────────────────────────────────────────

async function handleGenerateSocialPost(input: Record<string, unknown>): Promise<string> {
  // This tool is handled by the AI's generation — it returns instructions for formatting
  return JSON.stringify({
    status: 'ready',
    message: 'Generate the social media post based on the topic and platform guidelines. After generating, use save_content_draft to save it.',
    topic: input.topic,
    platforms: input.platforms,
    tone: input.tone || 'warm',
    include_hashtags: input.include_hashtags ?? true,
    include_cta: input.include_cta ?? false,
  })
}

async function handleGenerateAdCopy(input: Record<string, unknown>): Promise<string> {
  return JSON.stringify({
    status: 'ready',
    message: 'Generate ad copy variations based on the campaign objective. After generating, use save_content_draft to save each variation.',
    campaign_objective: input.campaign_objective,
    platform: input.platform,
    target_audience: input.target_audience,
    key_message: input.key_message,
    variations: input.variations || 3,
  })
}

async function handleDraftReviewResponse(
  input: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<string> {
  // If review_id provided, fetch the review data
  if (input.review_id) {
    const { data: review } = await supabase
      .from('marketing_reviews')
      .select('*')
      .eq('id', input.review_id)
      .single()

    if (review) {
      return JSON.stringify({
        status: 'ready',
        message: 'Draft a professional response to this review. After generating, I will save it as an AI draft response.',
        review: {
          platform: review.platform,
          reviewer_name: review.reviewer_name,
          rating: review.rating,
          review_text: review.review_text,
          review_date: review.review_date,
        },
        tone: input.tone || (review.rating && review.rating >= 4 ? 'grateful' : 'empathetic'),
      })
    }
  }

  return JSON.stringify({
    status: 'ready',
    message: 'Draft a professional response to this review.',
    review_text: input.review_text,
    rating: input.rating,
    reviewer_name: input.reviewer_name,
    tone: input.tone || 'empathetic',
  })
}

async function handleGetContentCalendar(
  input: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<string> {
  let query = supabase
    .from('marketing_content_calendar')
    .select('*, marketing_content(title, body, status, platforms)')
    .gte('date', input.start_date as string)
    .lte('date', input.end_date as string)
    .order('date')
    .order('time')

  if (input.platform) {
    query = query.contains('platforms', [input.platform as string])
  }

  const { data, error } = await query

  if (error) return JSON.stringify({ error: error.message })

  return JSON.stringify({
    entries: (data || []).map(e => ({
      title: e.title,
      date: e.date,
      time: e.time,
      type: e.calendar_type,
      platforms: e.platforms,
      status: e.status,
      content_status: e.marketing_content?.status,
    })),
    total: data?.length || 0,
  })
}

async function handleGetSocialAnalytics(
  input: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<string> {
  const days = (input.days as number) || 30
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

  let query = supabase
    .from('marketing_analytics_cache')
    .select('*')
    .gte('date_range_start', startDate)
    .lte('date_range_end', endDate)

  if (input.platform && input.platform !== 'all') {
    query = query.eq('platform', input.platform as string)
  }

  if (input.metric_type) {
    query = query.eq('metric_type', input.metric_type as string)
  }

  const { data, error } = await query.order('fetched_at', { ascending: false }).limit(20)

  if (error) return JSON.stringify({ error: error.message })

  if (!data || data.length === 0) {
    return JSON.stringify({
      message: 'No analytics data available. Connect your social accounts and wait for the first analytics sync, or check /marketing/settings.',
      data: [],
    })
  }

  return JSON.stringify({
    analytics: data.map(d => ({
      platform: d.platform,
      metric_type: d.metric_type,
      date_range: `${d.date_range_start} to ${d.date_range_end}`,
      data: d.data,
      fetched_at: d.fetched_at,
    })),
  })
}

async function handleGetReviewsSummary(
  input: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<string> {
  const days = (input.days as number) || 30
  const since = new Date(Date.now() - days * 86400000).toISOString()

  let query = supabase
    .from('marketing_reviews')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (input.platform && input.platform !== 'all') {
    query = query.eq('platform', input.platform as string)
  }

  if (input.status === 'unread') {
    query = query.eq('response_status', 'unread')
  } else if (input.status === 'needs_response') {
    query = query.in('response_status', ['unread', 'read', 'draft_response'])
  }

  const { data, error } = await query

  if (error) return JSON.stringify({ error: error.message })

  const reviews = data || []
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : 'N/A'

  return JSON.stringify({
    total: reviews.length,
    average_rating: avgRating,
    unread: reviews.filter(r => r.response_status === 'unread').length,
    needs_response: reviews.filter(r => ['unread', 'read', 'draft_response'].includes(r.response_status)).length,
    responded: reviews.filter(r => r.response_status === 'responded').length,
    by_rating: {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    },
    recent: reviews.slice(0, 5).map(r => ({
      platform: r.platform,
      reviewer: r.reviewer_name,
      rating: r.rating,
      text: r.review_text?.substring(0, 200),
      status: r.response_status,
      date: r.review_date,
    })),
  })
}

async function handleGetAdCampaigns(
  input: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<string> {
  let query = supabase
    .from('marketing_ad_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (input.platform && input.platform !== 'all') {
    query = query.eq('platform', input.platform as string)
  }

  if (input.status && input.status !== 'all') {
    query = query.eq('status', input.status as string)
  }

  const { data, error } = await query

  if (error) return JSON.stringify({ error: error.message })

  return JSON.stringify({
    campaigns: (data || []).map(c => ({
      id: c.id,
      name: c.name,
      platform: c.platform,
      objective: c.objective,
      status: c.status,
      budget: c.budget_amount ? `${c.budget_currency} ${c.budget_amount} (${c.budget_type})` : 'Not set',
      dates: c.start_date ? `${c.start_date} to ${c.end_date || 'ongoing'}` : 'Not set',
    })),
    total: data?.length || 0,
  })
}

async function handleSaveContentDraft(
  input: Record<string, unknown>,
  userId: string,
  conversationId: string,
  supabase: SupabaseClient,
): Promise<string> {
  const { data, error } = await supabase
    .from('marketing_content')
    .insert({
      content_type: input.content_type as string,
      title: input.title as string,
      body: input.body as string,
      platforms: input.platforms as string[],
      hashtags: (input.hashtags as string[]) || [],
      scheduled_at: input.scheduled_at ? new Date(input.scheduled_at as string).toISOString() : null,
      status: 'draft',
      created_by: userId,
      ai_generated: true,
      ai_conversation_id: conversationId,
    })
    .select('id')
    .single()

  if (error) return JSON.stringify({ error: error.message })

  // Create calendar entry if scheduled
  if (input.scheduled_at && data) {
    const scheduledDate = new Date(input.scheduled_at as string)
    await supabase.from('marketing_content_calendar').insert({
      title: input.title as string,
      date: scheduledDate.toISOString().split('T')[0],
      time: scheduledDate.toTimeString().substring(0, 5),
      calendar_type: 'post',
      content_id: data.id,
      platforms: input.platforms as string[],
      status: 'planned',
      created_by: userId,
    })
  }

  return JSON.stringify({
    success: true,
    content_id: data?.id,
    message: `Content saved as draft. View and edit it at /marketing/content/${data?.id}`,
  })
}

async function handleScheduleContent(
  input: Record<string, unknown>,
  userId: string,
  role: string,
  supabase: SupabaseClient,
): Promise<string> {
  if (role !== 'admin') {
    return JSON.stringify({ error: 'Only admins can schedule content for publishing' })
  }

  const contentId = input.content_id as string
  const scheduledAt = new Date(input.scheduled_at as string)

  const { data: content } = await supabase
    .from('marketing_content')
    .select('status, title')
    .eq('id', contentId)
    .single()

  if (!content) return JSON.stringify({ error: 'Content not found' })
  if (!['draft', 'approved'].includes(content.status)) {
    return JSON.stringify({ error: `Content cannot be scheduled — current status is "${content.status}"` })
  }

  await supabase
    .from('marketing_content')
    .update({
      status: 'scheduled',
      scheduled_at: scheduledAt.toISOString(),
      approved_by: userId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', contentId)

  // Update or create calendar entry
  const { data: existing } = await supabase
    .from('marketing_content_calendar')
    .select('id')
    .eq('content_id', contentId)
    .single()

  if (existing) {
    await supabase
      .from('marketing_content_calendar')
      .update({
        date: scheduledAt.toISOString().split('T')[0],
        time: scheduledAt.toTimeString().substring(0, 5),
        status: 'confirmed',
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('marketing_content_calendar').insert({
      title: content.title || 'Scheduled Post',
      date: scheduledAt.toISOString().split('T')[0],
      time: scheduledAt.toTimeString().substring(0, 5),
      calendar_type: 'post',
      content_id: contentId,
      status: 'confirmed',
      created_by: userId,
    })
  }

  return JSON.stringify({
    success: true,
    message: `Content scheduled for ${scheduledAt.toLocaleDateString('en-AU')} at ${scheduledAt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`,
  })
}

async function handleSearchCentreInfo(
  input: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<string> {
  const query = input.query as string
  const infoType = input.info_type as string

  // Map info_type to context_types
  const typeMap: Record<string, string[]> = {
    philosophy: ['philosophy_principle', 'service_value'],
    programs: ['teaching_approach', 'environment_feature'],
    events: ['family_engagement'],
    values: ['philosophy_principle', 'service_value', 'inclusion_practice'],
    teaching_approaches: ['teaching_approach'],
    all: [],
  }

  let dbQuery = supabase
    .from('centre_context')
    .select('title, content, context_type, related_qa')
    .eq('is_active', true)
    .ilike('content', `%${query}%`)
    .limit(10)

  const types = typeMap[infoType || 'all']
  if (types && types.length > 0) {
    dbQuery = dbQuery.in('context_type', types)
  }

  const { data, error } = await dbQuery

  if (error) return JSON.stringify({ error: error.message })

  return JSON.stringify({
    results: (data || []).map(d => ({
      title: d.title,
      content: d.content.substring(0, 500),
      type: d.context_type,
      related_qa: d.related_qa,
    })),
    total: data?.length || 0,
    message: data?.length === 0 ? `No results found for "${query}". Try broader search terms.` : undefined,
  })
}

async function handleGenerateAnalyticsReport(
  input: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<string> {
  const platforms = input.platforms as string[]
  const startDate = input.start_date as string
  const endDate = input.end_date as string

  // Fetch analytics data
  const { data: analytics } = await supabase
    .from('marketing_analytics_cache')
    .select('*')
    .in('platform', platforms)
    .gte('date_range_start', startDate)
    .lte('date_range_end', endDate)
    .order('platform')

  // Fetch content stats
  const { data: contentStats } = await supabase
    .from('marketing_content')
    .select('platforms, status')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  // Fetch review stats
  const { data: reviewStats } = await supabase
    .from('marketing_reviews')
    .select('platform, rating, response_status')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  return JSON.stringify({
    status: 'ready',
    message: 'Generate a comprehensive marketing report using this data. Format as a professional Markdown document.',
    report_type: input.report_type,
    date_range: `${startDate} to ${endDate}`,
    analytics_data: analytics || [],
    content_summary: {
      total: contentStats?.length || 0,
      published: contentStats?.filter(c => c.status === 'published').length || 0,
      draft: contentStats?.filter(c => c.status === 'draft').length || 0,
    },
    review_summary: {
      total: reviewStats?.length || 0,
      average_rating: reviewStats && reviewStats.length > 0
        ? (reviewStats.reduce((s, r) => s + (r.rating || 0), 0) / reviewStats.length).toFixed(1)
        : 'N/A',
      responded: reviewStats?.filter(r => r.response_status === 'responded').length || 0,
    },
  })
}
