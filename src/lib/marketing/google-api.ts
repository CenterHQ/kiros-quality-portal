// ─── Google APIs Client ──────────────────────────────────────────────────────
// Covers Google Business Profile, Google Ads, Google Analytics (GA4), and YouTube.
// Uses the googleapis package for all except Ads (which uses google-ads-api).

import { google, type Auth } from 'googleapis'

// ─── Scopes ──────────────────────────────────────────────────────────────────

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
]

// ─── OAuth Client ────────────────────────────────────────────────────────────

export function getOAuth2Client(): Auth.OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/marketing/google/callback`,
  )
}

export function getGoogleAuthUrl(state: string): string {
  const client = getOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
    state,
  })
}

export async function exchangeGoogleCode(code: string): Promise<{
  access_token: string
  refresh_token: string | null
  expiry_date: number | null
}> {
  const client = getOAuth2Client()
  const { tokens } = await client.getToken(code)
  return {
    access_token: tokens.access_token || '',
    refresh_token: tokens.refresh_token || null,
    expiry_date: tokens.expiry_date || null,
  }
}

export async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string
  expiry_date: number | null
}> {
  const client = getOAuth2Client()
  client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await client.refreshAccessToken()
  return {
    access_token: credentials.access_token || '',
    expiry_date: credentials.expiry_date || null,
  }
}

function getAuthedClient(accessToken: string): Auth.OAuth2Client {
  const client = getOAuth2Client()
  client.setCredentials({ access_token: accessToken })
  return client
}

// ─── Google Business Profile ─────────────────────────────────────────────────

export async function getBusinessAccounts(accessToken: string): Promise<{
  name: string
  accountName: string
  type: string
}[]> {
  const client = getAuthedClient(accessToken)
  const mybusiness = google.mybusinessaccountmanagement({ version: 'v1', auth: client })
  const res = await mybusiness.accounts.list()
  return (res.data.accounts || []).map(a => ({
    name: a.name || '',
    accountName: a.accountName || '',
    type: a.type || '',
  }))
}

export async function getBusinessLocations(
  accessToken: string,
  accountName: string,
): Promise<{ name: string; title: string; locationName: string }[]> {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) throw new Error(`Business locations error: ${await res.text()}`)
  const data = await res.json()
  return (data.locations || []).map((l: Record<string, string>) => ({
    name: l.name || '',
    title: l.title || '',
    locationName: l.name || '',
  }))
}

export async function getBusinessReviews(
  accessToken: string,
  locationName: string,
): Promise<{
  reviewId: string
  reviewer: { displayName: string }
  starRating: string
  comment: string
  createTime: string
  updateTime: string
  reviewReply?: { comment: string; updateTime: string }
}[]> {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/reviews`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) throw new Error(`Business reviews error: ${await res.text()}`)
  const data = await res.json()
  return data.reviews || []
}

export async function replyToReview(
  accessToken: string,
  reviewName: string,
  comment: string,
): Promise<void> {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment }),
    },
  )
  if (!res.ok) throw new Error(`Reply to review error: ${await res.text()}`)
}

export async function createBusinessPost(
  accessToken: string,
  locationName: string,
  post: { summary: string; callToAction?: { actionType: string; url: string } },
): Promise<string> {
  const body: Record<string, unknown> = {
    languageCode: 'en-AU',
    summary: post.summary,
    topicType: 'STANDARD',
  }
  if (post.callToAction) {
    body.callToAction = post.callToAction
  }
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) throw new Error(`Business post error: ${await res.text()}`)
  const data = await res.json()
  return data.name || ''
}

// ─── Google Analytics (GA4) ──────────────────────────────────────────────────

export interface GA4ReportRequest {
  propertyId: string
  dimensions: string[]
  metrics: string[]
  startDate: string
  endDate: string
}

export interface GA4Row {
  dimensionValues: { value: string }[]
  metricValues: { value: string }[]
}

export async function queryGA4(
  accessToken: string,
  request: GA4ReportRequest,
): Promise<{ rows: GA4Row[]; rowCount: number }> {
  const client = getAuthedClient(accessToken)
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth: client })

  const res = await analyticsData.properties.runReport({
    property: `properties/${request.propertyId}`,
    requestBody: {
      dimensions: request.dimensions.map(name => ({ name })),
      metrics: request.metrics.map(name => ({ name })),
      dateRanges: [{ startDate: request.startDate, endDate: request.endDate }],
    },
  })

  return {
    rows: (res.data.rows || []) as GA4Row[],
    rowCount: Number(res.data.rowCount || 0),
  }
}

export async function getGA4Properties(
  accessToken: string,
): Promise<{ name: string; displayName: string; propertyId: string }[]> {
  const client = getAuthedClient(accessToken)
  const admin = google.analyticsadmin({ version: 'v1beta', auth: client })
  const res = await admin.properties.list({ filter: 'parent:accounts/-' })
  return (res.data.properties || []).map(p => ({
    name: p.name || '',
    displayName: p.displayName || '',
    propertyId: (p.name || '').replace('properties/', ''),
  }))
}

// ─── YouTube ─────────────────────────────────────────────────────────────────

export async function getYouTubeChannels(
  accessToken: string,
): Promise<{ id: string; title: string; subscriberCount: string; videoCount: string }[]> {
  const client = getAuthedClient(accessToken)
  const youtube = google.youtube({ version: 'v3', auth: client })
  const res = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    mine: true,
  })
  return (res.data.items || []).map(ch => ({
    id: ch.id || '',
    title: ch.snippet?.title || '',
    subscriberCount: ch.statistics?.subscriberCount || '0',
    videoCount: ch.statistics?.videoCount || '0',
  }))
}

export async function getYouTubeChannelAnalytics(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${startDate}&endDate=${endDate}&metrics=views,likes,comments,subscribersGained,subscribersLost,estimatedMinutesWatched&dimensions=day`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) throw new Error(`YouTube analytics error: ${await res.text()}`)
  return res.json()
}

export async function uploadYouTubeVideo(
  accessToken: string,
  metadata: {
    title: string
    description: string
    tags?: string[]
    privacyStatus?: 'public' | 'unlisted' | 'private'
    categoryId?: string
  },
  videoBuffer: Buffer,
): Promise<string> {
  const client = getAuthedClient(accessToken)
  const youtube = google.youtube({ version: 'v3', auth: client })

  const { Readable } = await import('stream')
  const stream = Readable.from(videoBuffer)

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: metadata.categoryId || '22', // People & Blogs
      },
      status: {
        privacyStatus: metadata.privacyStatus || 'private',
      },
    },
    media: {
      body: stream,
    },
  })

  return res.data.id || ''
}

// ─── Google Ads (basic queries via REST) ─────────────────────────────────────

export async function getGoogleAdsCustomers(
  accessToken: string,
): Promise<{ id: string; descriptiveName: string }[]> {
  const res = await fetch(
    'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      },
    },
  )
  if (!res.ok) throw new Error(`Google Ads customers error: ${await res.text()}`)
  const data = await res.json()
  const customerIds: string[] = (data.resourceNames || []).map((r: string) => r.replace('customers/', ''))

  const customers: { id: string; descriptiveName: string }[] = []
  for (const id of customerIds) {
    try {
      const detailRes = await fetch(
        `https://googleads.googleapis.com/v17/customers/${id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
            ...(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
              ? { 'login-customer-id': process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID }
              : {}),
          },
        },
      )
      if (detailRes.ok) {
        const detail = await detailRes.json()
        customers.push({ id, descriptiveName: detail.descriptiveName || id })
      }
    } catch {
      customers.push({ id, descriptiveName: id })
    }
  }
  return customers
}

export async function queryGoogleAds(
  accessToken: string,
  customerId: string,
  query: string,
): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
        'Content-Type': 'application/json',
        ...(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
          ? { 'login-customer-id': process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID }
          : {}),
      },
      body: JSON.stringify({ query }),
    },
  )
  if (!res.ok) throw new Error(`Google Ads query error: ${await res.text()}`)
  const data = await res.json()
  return data[0]?.results || []
}
