import { ConfidentialClientApplication } from '@azure/msal-node'

const DELEGATED_SCOPES = ['https://graph.microsoft.com/Sites.Read.All', 'https://graph.microsoft.com/Files.Read.All', 'offline_access']
const APP_SCOPES = ['https://graph.microsoft.com/.default']

export function getMsalClient() {
  return new ConfidentialClientApplication({
    auth: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
    },
  })
}

export function getAuthUrl(redirectUri: string) {
  const client = getMsalClient()
  return client.getAuthCodeUrl({
    scopes: DELEGATED_SCOPES,
    redirectUri,
  })
}

export async function getTokenFromCode(code: string, redirectUri: string) {
  const client = getMsalClient()
  return client.acquireTokenByCode({
    code,
    scopes: DELEGATED_SCOPES,
    redirectUri,
  })
}

export async function getTokenFromRefresh(refreshToken: string) {
  const client = getMsalClient()
  return client.acquireTokenByRefreshToken({
    refreshToken,
    scopes: DELEGATED_SCOPES,
  })
}

// Get app-only token using client credentials (uses Application permissions)
export async function getAppToken() {
  const client = getMsalClient()
  const result = await client.acquireTokenByClientCredential({
    scopes: APP_SCOPES,
  })
  if (!result) throw new Error('Failed to acquire app token')
  return result.accessToken
}

export async function graphFetch(accessToken: string, endpoint: string) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Graph API error (${res.status}): ${error}`)
  }
  return res.json()
}

export async function graphFetchBinary(accessToken: string, endpoint: string): Promise<Buffer> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Graph API error (${res.status}): ${error}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// Get the site ID for kirosgroup.sharepoint.com/sites/operations
export async function getSiteId(accessToken: string) {
  const data = await graphFetch(accessToken, '/sites/kirosgroup.sharepoint.com:/sites/operations')
  return data.id
}

// Get the default drive (document library) for the site
export async function getDriveId(accessToken: string, siteId: string) {
  const data = await graphFetch(accessToken, `/sites/${siteId}/drive`)
  return data.id
}

// List files in a folder
export async function listFiles(accessToken: string, driveId: string, folderId?: string) {
  const path = folderId
    ? `/drives/${driveId}/items/${folderId}/children`
    : `/drives/${driveId}/root/children`
  const data = await graphFetch(accessToken, `${path}?$top=200&$orderby=name`)
  return data.value
}

// Download file content
export async function downloadFile(accessToken: string, driveId: string, itemId: string) {
  return graphFetchBinary(accessToken, `/drives/${driveId}/items/${itemId}/content`)
}

// Get file metadata
export async function getFileMetadata(accessToken: string, driveId: string, itemId: string) {
  return graphFetch(accessToken, `/drives/${driveId}/items/${itemId}`)
}
