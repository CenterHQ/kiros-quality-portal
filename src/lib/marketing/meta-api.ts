// ─── Meta Graph API Client ───────────────────────────────────────────────────
// Covers Facebook Pages, Instagram Business, and Meta Ads APIs.
// Follows the pattern of /src/lib/microsoft-graph.ts

const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0'
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

// ─── Scopes ──────────────────────────────────────────────────────────────────

// Meta OAuth scopes. Additional scopes require enabling Use Cases in the
// Meta App Dashboard before they will be accepted during OAuth.
// Enable these Use Cases for full functionality:
//   - "Manage everything on your page" → pages_manage_posts, pages_read_engagement
//   - "Manager messaging" → pages_messaging, pages_manage_metadata
//   - "Engage with customers" → instagram_basic, instagram_manage_comments
export const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_messaging',
  'pages_manage_metadata',
].join(',')

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MetaTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface PageAccount {
  id: string
  name: string
  access_token: string
  instagram_business_account?: { id: string }
}

export interface MetaInsightData {
  name: string
  period: string
  values: { value: number; end_time: string }[]
}

// ─── OAuth ───────────────────────────────────────────────────────────────────

export function getMetaAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    scope: META_SCOPES,
    response_type: 'code',
    state,
  })
  return `https://www.facebook.com/${API_VERSION}/dialog/oauth?${params}`
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: redirectUri,
    code,
  })
  const res = await fetch(`${BASE_URL}/oauth/access_token?${params}`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meta token exchange failed (${res.status}): ${err}`)
  }
  return res.json()
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  })
  const res = await fetch(`${BASE_URL}/oauth/access_token?${params}`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meta long-lived token exchange failed (${res.status}): ${err}`)
  }
  return res.json()
}

// ─── Token Inspection ────────────────────────────────────────────────────────

export interface TokenDebugInfo {
  app_id: string
  type: string
  application: string
  expires_at: number
  is_valid: boolean
  scopes: string[]
  granular_scopes?: { scope: string; target_ids?: string[] }[]
  user_id?: string
  error?: { code: number; message: string }
}

/**
 * Inspect a token's granted scopes, validity, and expiry via /debug_token.
 * Uses an app access token (app_id|app_secret) as the inspector.
 * Returns null if the inspection call itself fails.
 */
export async function inspectToken(inputToken: string): Promise<TokenDebugInfo | null> {
  try {
    const appToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`
    const params = new URLSearchParams({ input_token: inputToken, access_token: appToken })
    const res = await fetch(`${BASE_URL}/debug_token?${params}`)
    if (!res.ok) return null
    const json = await res.json()
    return json.data as TokenDebugInfo
  } catch {
    return null
  }
}

// ─── Generic Graph Fetch ─────────────────────────────────────────────────────

export async function metaFetch<T = Record<string, unknown>>(
  accessToken: string,
  endpoint: string,
  options?: { method?: string; body?: Record<string, unknown> },
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`
  const fetchOpts: RequestInit = {
    method: options?.method || 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }
  if (options?.body) {
    fetchOpts.body = JSON.stringify(options.body)
  }
  const res = await fetch(url, fetchOpts)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meta API error (${res.status}): ${err}`)
  }
  return res.json()
}

// ─── Page & Instagram Discovery ──────────────────────────────────────────────

export async function getPageAccounts(userToken: string): Promise<PageAccount[]> {
  const data = await metaFetch<{ data: PageAccount[] }>(
    userToken,
    '/me/accounts?fields=id,name,access_token,instagram_business_account',
  )
  return data.data || []
}

// ─── Facebook Publishing ─────────────────────────────────────────────────────

export async function publishToFacebook(
  pageToken: string,
  pageId: string,
  message: string,
  link?: string,
): Promise<string> {
  const body: Record<string, unknown> = { message }
  if (link) body.link = link
  const data = await metaFetch<{ id: string }>(pageToken, `/${pageId}/feed`, {
    method: 'POST',
    body,
  })
  return data.id
}

export async function publishPhotoToFacebook(
  pageToken: string,
  pageId: string,
  imageUrl: string,
  caption: string,
): Promise<string> {
  const data = await metaFetch<{ id: string }>(pageToken, `/${pageId}/photos`, {
    method: 'POST',
    body: { url: imageUrl, caption },
  })
  return data.id
}

// ─── Instagram Publishing ────────────────────────────────────────────────────
// Instagram publishing is a two-step process:
// 1. Create a media container
// 2. Publish the container

export async function createInstagramMediaContainer(
  pageToken: string,
  igBusinessId: string,
  imageUrl: string,
  caption: string,
): Promise<string> {
  const data = await metaFetch<{ id: string }>(pageToken, `/${igBusinessId}/media`, {
    method: 'POST',
    body: { image_url: imageUrl, caption },
  })
  return data.id
}

export async function createInstagramVideoContainer(
  pageToken: string,
  igBusinessId: string,
  videoUrl: string,
  caption: string,
  mediaType: 'REELS' | 'VIDEO' = 'REELS',
): Promise<string> {
  const data = await metaFetch<{ id: string }>(pageToken, `/${igBusinessId}/media`, {
    method: 'POST',
    body: { video_url: videoUrl, caption, media_type: mediaType },
  })
  return data.id
}

export async function publishInstagramMedia(
  pageToken: string,
  igBusinessId: string,
  containerId: string,
): Promise<string> {
  const data = await metaFetch<{ id: string }>(pageToken, `/${igBusinessId}/media_publish`, {
    method: 'POST',
    body: { creation_id: containerId },
  })
  return data.id
}

export async function checkContainerStatus(
  pageToken: string,
  containerId: string,
): Promise<{ status: string; status_code?: string }> {
  return metaFetch(pageToken, `/${containerId}?fields=status_code`)
}

// ─── Insights ────────────────────────────────────────────────────────────────

export async function getPageInsights(
  pageToken: string,
  pageId: string,
  metrics: string[],
  period: 'day' | 'week' | 'days_28' = 'day',
): Promise<MetaInsightData[]> {
  const data = await metaFetch<{ data: MetaInsightData[] }>(
    pageToken,
    `/${pageId}/insights?metric=${metrics.join(',')}&period=${period}`,
  )
  return data.data || []
}

export async function getInstagramInsights(
  pageToken: string,
  igBusinessId: string,
  metrics: string[],
  period: 'day' | 'week' | 'days_28' = 'day',
): Promise<MetaInsightData[]> {
  const data = await metaFetch<{ data: MetaInsightData[] }>(
    pageToken,
    `/${igBusinessId}/insights?metric=${metrics.join(',')}&period=${period}`,
  )
  return data.data || []
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function getPostComments(
  pageToken: string,
  postId: string,
): Promise<{ id: string; message: string; from: { name: string; id: string }; created_time: string }[]> {
  const data = await metaFetch<{ data: { id: string; message: string; from: { name: string; id: string }; created_time: string }[] }>(
    pageToken,
    `/${postId}/comments?fields=id,message,from,created_time`,
  )
  return data.data || []
}

export async function replyToComment(
  pageToken: string,
  commentId: string,
  message: string,
): Promise<string> {
  const data = await metaFetch<{ id: string }>(pageToken, `/${commentId}/comments`, {
    method: 'POST',
    body: { message },
  })
  return data.id
}

// ─── Meta Ads ────────────────────────────────────────────────────────────────

export async function getAdAccounts(
  userToken: string,
): Promise<{ id: string; name: string; account_id: string }[]> {
  const data = await metaFetch<{ data: { id: string; name: string; account_id: string }[] }>(
    userToken,
    '/me/adaccounts?fields=id,name,account_id',
  )
  return data.data || []
}

export async function getAdCampaigns(
  userToken: string,
  adAccountId: string,
): Promise<{ id: string; name: string; status: string; objective: string; daily_budget?: string; lifetime_budget?: string }[]> {
  const data = await metaFetch<{ data: { id: string; name: string; status: string; objective: string; daily_budget?: string; lifetime_budget?: string }[] }>(
    userToken,
    `/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget`,
  )
  return data.data || []
}

export async function getCampaignInsights(
  userToken: string,
  campaignId: string,
  dateRange?: { since: string; until: string },
): Promise<Record<string, unknown>[]> {
  let endpoint = `/${campaignId}/insights?fields=impressions,clicks,ctr,cpc,spend,actions,cost_per_action_type`
  if (dateRange) {
    endpoint += `&time_range={"since":"${dateRange.since}","until":"${dateRange.until}"}`
  }
  const data = await metaFetch<{ data: Record<string, unknown>[] }>(userToken, endpoint)
  return data.data || []
}

// ─── Webhook Verification ────────────────────────────────────────────────────

// ─── Messaging (Facebook Messenger / Instagram DMs) ─────────────────────────

export async function getPageConversations(
  pageToken: string,
  pageId: string,
): Promise<{ id: string; link: string; updated_time: string; participants: { data: { name: string; id: string }[] } }[]> {
  const data = await metaFetch<{ data: { id: string; link: string; updated_time: string; participants: { data: { name: string; id: string }[] } }[] }>(
    pageToken,
    `/${pageId}/conversations?fields=id,link,updated_time,participants`,
  )
  return data.data || []
}

export async function getConversationMessages(
  pageToken: string,
  conversationId: string,
): Promise<{ id: string; message: string; from: { name: string; id: string }; created_time: string }[]> {
  const data = await metaFetch<{ data: { id: string; message: string; from: { name: string; id: string }; created_time: string }[] }>(
    pageToken,
    `/${conversationId}/messages?fields=id,message,from,created_time&limit=50`,
  )
  return data.data || []
}

export async function sendPageMessage(
  pageToken: string,
  pageId: string,
  recipientId: string,
  messageText: string,
): Promise<string> {
  const data = await metaFetch<{ message_id: string }>(pageToken, `/${pageId}/messages`, {
    method: 'POST',
    body: {
      recipient: { id: recipientId },
      message: { text: messageText },
      messaging_type: 'RESPONSE',
    },
  })
  return data.message_id
}

// ─── Post Feed ───────────────────────────────────────────────────────────────

export async function getPagePosts(
  pageToken: string,
  pageId: string,
  limit: number = 25,
): Promise<{
  id: string
  message?: string
  created_time: string
  full_picture?: string
  permalink_url?: string
  shares?: { count: number }
  likes: { summary: { total_count: number } }
  comments: { summary: { total_count: number } }
}[]> {
  const data = await metaFetch<{ data: unknown[] }>(
    pageToken,
    `/${pageId}/posts?fields=id,message,created_time,full_picture,permalink_url,shares,likes.summary(true),comments.summary(true)&limit=${limit}`,
  )
  return (data.data || []) as {
    id: string; message?: string; created_time: string; full_picture?: string;
    permalink_url?: string; shares?: { count: number };
    likes: { summary: { total_count: number } }; comments: { summary: { total_count: number } }
  }[]
}

export async function getPostEngagement(
  pageToken: string,
  postId: string,
): Promise<{ likes: number; comments: number; shares: number; reach: number; impressions: number }> {
  const [reactionsData, insightsData] = await Promise.all([
    metaFetch<{ summary: { total_count: number } }>(pageToken, `/${postId}/likes?summary=true`).catch(() => ({ summary: { total_count: 0 } })),
    metaFetch<{ data: { name: string; values: { value: number }[] }[] }>(pageToken, `/${postId}/insights?metric=post_impressions,post_engaged_users,post_clicks`).catch(() => ({ data: [] })),
  ])

  const getMetric = (name: string) => insightsData.data?.find(m => m.name === name)?.values?.[0]?.value || 0

  return {
    likes: reactionsData.summary?.total_count || 0,
    comments: 0, // fetched separately
    shares: 0,
    reach: getMetric('post_engaged_users'),
    impressions: getMetric('post_impressions'),
  }
}

// ─── Webhook Verification ────────────────────────────────────────────────────

export async function verifyWebhookSignature(
  signature: string,
  body: string,
): Promise<boolean> {
  const crypto = await import('crypto')
  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_APP_SECRET!)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig),
  )
}
