import Anthropic from '@anthropic-ai/sdk'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLE_LABELS } from '@/lib/types'

// Re-export for convenience
export { ROLE_LABELS }

export function buildMarketingSystemPrompt(
  role: string,
  centreContext: string,
  serviceDetails: string,
) {
  const roleLabel = ROLE_LABELS[role] || 'Staff Member'

  return `You are Kiros Marketing AI — the intelligent marketing assistant for Kiros Early Education Centre.

IDENTITY & EXPERTISE:
- You specialise in social media marketing for early childhood education centres
- You understand the Australian ECEC sector, family engagement strategies, and community-focused marketing
- You know Facebook, Instagram, Google Business Profile, Google Ads, GA4, and YouTube marketing best practices
- You are trained in creating warm, professional, community-focused content that reflects the centre's philosophy and values
- You understand Australian privacy laws regarding children's images and information

SERVICE DETAILS:
${serviceDetails}

YOUR ROLE WITH THIS USER:
You are speaking with the ${roleLabel}.
Help them create compelling marketing content, manage social media presence, respond to reviews, plan campaigns, and analyse marketing performance.

CENTRE KNOWLEDGE BASE:
The following is extracted from Kiros's actual documents — philosophy, values, programs, and teaching approaches. Use this to create authentic, on-brand content.
${centreContext}

MARKETING GUIDELINES:

1. TONE & VOICE:
   - Warm, welcoming, and professional
   - Community-focused and educational
   - Never salesy or pushy — focus on value and connection
   - Celebrate children's learning journeys (without naming children unless explicitly authorised)
   - Highlight the centre's philosophy, programs, and educator expertise
   - Use inclusive, respectful language

2. PRIVACY & COMPLIANCE:
   - NEVER use children's real names in social content unless the user explicitly confirms consent
   - NEVER include identifying information about families
   - Follow the centre's social media policy
   - Comply with Australian Privacy Principles (APPs)
   - Be mindful of the ACECQA Code of Ethics when creating content

3. PLATFORM BEST PRACTICES:
   - **Facebook**: Community engagement, event promotion, longer-form stories, parent updates
   - **Instagram**: Visual storytelling, behind-the-scenes, hashtag strategy, Reels for engagement
   - **Google Business**: Regular updates, review responses, local SEO, service descriptions
   - **YouTube**: Educational content, virtual tours, program showcases, educator spotlights
   - **Google Ads**: Enrolment campaigns, open day promotion, targeted local advertising
   - **Meta Ads**: Awareness campaigns, family engagement, retargeting for website visitors

4. CONTENT PILLARS:
   - Learning & Development (curriculum highlights, EYLF alignment)
   - Community & Family (events, testimonials, partnerships)
   - Educator Spotlight (qualifications, passion, professional development)
   - Centre Life (daily routines, environment, meals, excursions)
   - Quality & Compliance (NQS achievements, accreditation, safety)
   - Enrolment & Open Days (CTAs, tours, waitlist)

5. REVIEW RESPONSES:
   - Always be empathetic and professional
   - Thank positive reviewers specifically and personally
   - For negative reviews: acknowledge concern, avoid defensiveness, offer to resolve offline
   - Escalate serious complaints to the admin/AP for personal follow-up
   - Never disclose operational details or children's information in review responses

6. WHEN GENERATING CONTENT:
   - Always use the save_content_draft tool to save generated content to the content management system
   - Include relevant hashtags for Instagram posts
   - Suggest optimal posting times (Australian Eastern Time)
   - Reference centre philosophy and values naturally (don't force it)
   - Offer variations when generating ad copy

7. SCOPE: Only discuss marketing, social media, advertising, and communications for the centre. Redirect operational or compliance questions to the main Kiros AI chat.

8. Use Australian English spelling throughout.

9. Today's date is ${new Date().toISOString().split('T')[0]}`
}

export function buildMarketingSystemPromptCached(
  role: string,
  centreContext: string,
  serviceDetails: string,
): Anthropic.TextBlockParam[] {
  const text = buildMarketingSystemPrompt(role, centreContext, serviceDetails)
  const knowledgeIdx = text.indexOf('CENTRE KNOWLEDGE BASE:')
  if (knowledgeIdx === -1) {
    return [{ type: 'text', text, cache_control: { type: 'ephemeral' } }]
  }
  return [
    { type: 'text', text: text.substring(0, knowledgeIdx), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: text.substring(knowledgeIdx), cache_control: { type: 'ephemeral' } },
  ]
}

// ─── Marketing Tools ─────────────────────────────────────────────────────────

export const MARKETING_TOOLS: (Anthropic.Tool & { allowedRoles: string[] })[] = [
  {
    name: 'generate_social_post',
    description: 'Generate a social media post for one or more platforms. Uses centre philosophy, programs, and events to create authentic content. Returns the generated content for the user to review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        topic: { type: 'string', description: 'What the post is about (e.g., "NAIDOC week activities", "new outdoor play area", "open day promotion")' },
        platforms: { type: 'array', items: { type: 'string', enum: ['facebook', 'instagram', 'google_business'] }, description: 'Target platforms' },
        tone: { type: 'string', enum: ['warm', 'informative', 'celebratory', 'educational', 'promotional'], description: 'Tone of the post' },
        include_hashtags: { type: 'boolean', description: 'Include hashtags (recommended for Instagram)' },
        include_cta: { type: 'boolean', description: 'Include a call-to-action' },
      },
      required: ['topic', 'platforms'],
    },
    allowedRoles: ['admin', 'manager', 'ns'],
  },
  {
    name: 'generate_ad_copy',
    description: 'Generate advertising copy for Meta or Google Ads campaigns. Produces multiple variations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaign_objective: { type: 'string', enum: ['awareness', 'engagement', 'enrolment', 'event'], description: 'Campaign objective' },
        platform: { type: 'string', enum: ['meta_ads', 'google_ads'], description: 'Ad platform' },
        target_audience: { type: 'string', description: 'Who we are targeting (e.g., "parents of 0-5 year olds in Western Sydney")' },
        key_message: { type: 'string', description: 'Core message to convey' },
        variations: { type: 'integer', description: 'Number of copy variations to generate (default 3)' },
      },
      required: ['campaign_objective', 'platform', 'key_message'],
    },
    allowedRoles: ['admin', 'manager', 'ns'],
  },
  {
    name: 'draft_review_response',
    description: 'Draft a professional response to a Google Business or Facebook review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        review_id: { type: 'string', description: 'Review ID from the database (optional)' },
        review_text: { type: 'string', description: 'The review content to respond to' },
        rating: { type: 'integer', description: 'Star rating (1-5)' },
        reviewer_name: { type: 'string', description: 'Name of the reviewer' },
        tone: { type: 'string', enum: ['grateful', 'empathetic', 'apologetic', 'solution_focused'], description: 'Response tone' },
      },
      required: ['review_text', 'rating'],
    },
    allowedRoles: ['admin', 'manager', 'ns'],
  },
  {
    name: 'get_content_calendar',
    description: 'Get scheduled and planned content for a date range from the content calendar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        platform: { type: 'string', description: 'Filter by platform (optional)' },
      },
      required: ['start_date', 'end_date'],
    },
    allowedRoles: ['admin', 'manager', 'ns'],
  },
  {
    name: 'get_social_analytics',
    description: 'Get analytics data for social media platforms — followers, reach, engagement, impressions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        platform: { type: 'string', enum: ['facebook', 'instagram', 'google_business', 'google_ads', 'google_analytics', 'youtube', 'all'], description: 'Platform to query' },
        metric_type: { type: 'string', enum: ['overview', 'engagement', 'reach', 'followers', 'ad_performance', 'traffic'], description: 'Type of metrics' },
        days: { type: 'integer', description: 'Number of days to look back (default 30)' },
      },
      required: ['platform'],
    },
    allowedRoles: ['admin', 'manager', 'ns'],
  },
  {
    name: 'get_reviews_summary',
    description: 'Get a summary of recent reviews across Google Business and Facebook — ratings, unread count, sentiment.',
    input_schema: {
      type: 'object' as const,
      properties: {
        platform: { type: 'string', enum: ['google_business', 'facebook', 'all'], description: 'Filter by platform' },
        status: { type: 'string', enum: ['unread', 'needs_response', 'all'], description: 'Filter by response status' },
        days: { type: 'integer', description: 'Number of days to look back (default 30)' },
      },
    },
    allowedRoles: ['admin', 'manager', 'ns'],
  },
  {
    name: 'get_ad_campaigns',
    description: 'Get ad campaign data including budget, spend, and performance metrics.',
    input_schema: {
      type: 'object' as const,
      properties: {
        platform: { type: 'string', enum: ['meta_ads', 'google_ads', 'all'], description: 'Filter by platform' },
        status: { type: 'string', enum: ['active', 'paused', 'completed', 'all'], description: 'Filter by status' },
      },
    },
    allowedRoles: ['admin', 'manager', 'ns'],
  },
  {
    name: 'save_content_draft',
    description: 'Save generated content as a draft in the content management system. Use this after generating posts or ad copy so the user can review, edit, and publish.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Internal title for the content' },
        body: { type: 'string', description: 'The content body / post text' },
        content_type: { type: 'string', enum: ['post', 'reel', 'story', 'ad', 'google_update', 'youtube_video'], description: 'Type of content' },
        platforms: { type: 'array', items: { type: 'string' }, description: 'Target platforms' },
        hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags to include' },
        scheduled_at: { type: 'string', description: 'ISO datetime for scheduling (optional)' },
      },
      required: ['title', 'body', 'content_type', 'platforms'],
    },
    allowedRoles: ['admin', 'manager', 'ns'],
  },
  {
    name: 'schedule_content',
    description: 'Schedule approved content for publishing at a specific date and time.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content_id: { type: 'string', description: 'ID of the content to schedule' },
        scheduled_at: { type: 'string', description: 'ISO datetime to publish at' },
      },
      required: ['content_id', 'scheduled_at'],
    },
    allowedRoles: ['admin'],
  },
  {
    name: 'search_centre_info',
    description: 'Search the centre\'s philosophy, programs, events, values, and teaching approaches for content inspiration. Read-only access to centre data through a marketing lens.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'What to search for' },
        info_type: { type: 'string', enum: ['philosophy', 'programs', 'events', 'values', 'teaching_approaches', 'all'], description: 'Type of information to search' },
      },
      required: ['query'],
    },
    allowedRoles: ['admin', 'manager', 'ns'],
  },
  {
    name: 'generate_analytics_report',
    description: 'Generate a comprehensive marketing analytics report in Markdown format.',
    input_schema: {
      type: 'object' as const,
      properties: {
        report_type: { type: 'string', enum: ['weekly', 'monthly', 'campaign', 'custom'], description: 'Report type' },
        platforms: { type: 'array', items: { type: 'string' }, description: 'Platforms to include' },
        start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      },
      required: ['report_type', 'platforms', 'start_date', 'end_date'],
    },
    allowedRoles: ['admin', 'manager', 'ns'],
  },
]
