// ─── Marketing Section Types ─────────────────────────────────────────────────

export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'google_business'
  | 'google_ads'
  | 'google_analytics'
  | 'youtube'

export type AdPlatform = 'meta_ads' | 'google_ads'

export type ContentType =
  | 'post'
  | 'reel'
  | 'story'
  | 'ad'
  | 'review_response'
  | 'google_update'
  | 'youtube_video'

export type ContentStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'archived'

export type CampaignStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'

export type ReviewResponseStatus =
  | 'unread'
  | 'read'
  | 'draft_response'
  | 'pending_approval'
  | 'responded'
  | 'ignored'

export type AccountStatus = 'connected' | 'disconnected' | 'error' | 'expired'

export type CalendarEntryType =
  | 'post'
  | 'campaign_start'
  | 'campaign_end'
  | 'event'
  | 'review_reminder'
  | 'report_due'

// ─── Database Row Types ──────────────────────────────────────────────────────

export interface MarketingSocialAccount {
  id: string
  platform: SocialPlatform
  platform_account_id: string
  account_name: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  scopes: string[]
  metadata: Record<string, unknown>
  status: AccountStatus
  connected_by: string | null
  created_at: string
  updated_at: string
}

export interface MarketingContent {
  id: string
  content_type: ContentType
  title: string | null
  body: string
  media_urls: string[]
  media_storage_paths: string[]
  platforms: string[]
  scheduled_at: string | null
  published_at: string | null
  platform_post_ids: Record<string, string>
  status: ContentStatus
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  rejection_note: string | null
  ai_generated: boolean
  ai_conversation_id: string | null
  ad_campaign_id: string | null
  hashtags: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined fields
  creator?: { full_name: string; avatar_url: string | null }
  approver?: { full_name: string }
}

export interface MarketingAdCampaign {
  id: string
  platform: AdPlatform
  platform_campaign_id: string | null
  name: string
  objective: string | null
  status: CampaignStatus
  budget_type: 'daily' | 'lifetime' | null
  budget_amount: number | null
  budget_currency: string
  start_date: string | null
  end_date: string | null
  target_audience: Record<string, unknown>
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined
  creator?: { full_name: string }
}

export interface MarketingReview {
  id: string
  platform: 'google_business' | 'facebook'
  platform_review_id: string
  reviewer_name: string | null
  rating: number | null
  review_text: string | null
  review_date: string | null
  response_text: string | null
  response_status: ReviewResponseStatus
  response_drafted_by: string | null
  response_approved_by: string | null
  response_published_at: string | null
  ai_draft_response: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MarketingAnalyticsCache {
  id: string
  platform: string
  metric_type: string
  date_range_start: string
  date_range_end: string
  data: Record<string, unknown>
  fetched_at: string
  expires_at: string
}

export interface MarketingConversation {
  id: string
  user_id: string
  title: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MarketingMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system' | 'tool_call' | 'tool_result'
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface MarketingCalendarEntry {
  id: string
  title: string
  description: string | null
  date: string
  time: string | null
  calendar_type: CalendarEntryType
  content_id: string | null
  campaign_id: string | null
  platforms: string[]
  status: 'planned' | 'confirmed' | 'published' | 'cancelled'
  color: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  content?: MarketingContent
  campaign?: MarketingAdCampaign
}

// ─── API / Component Types ───────────────────────────────────────────────────

export interface PlatformMetrics {
  followers: number
  followersChange: number
  reach: number
  reachChange: number
  engagement: number
  engagementRate: number
  impressions: number
  posts: number
}

export interface AdMetrics {
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  spend: number
  conversions: number
  roas: number
}

export interface ContentFormData {
  content_type: ContentType
  title: string
  body: string
  platforms: string[]
  hashtags: string[]
  scheduled_at: string | null
  media_files?: File[]
}

export interface CampaignFormData {
  platform: AdPlatform
  name: string
  objective: string
  budget_type: 'daily' | 'lifetime'
  budget_amount: number
  start_date: string
  end_date: string
  target_audience: Record<string, unknown>
}
