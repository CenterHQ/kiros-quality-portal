import { ConfidentialClientApplication } from '@azure/msal-node'

const DELEGATED_SCOPES = ['https://graph.microsoft.com/Sites.ReadWrite.All', 'https://graph.microsoft.com/Files.ReadWrite.All', 'offline_access']
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

// ---------------------------------------------------------------------------
// READ-ONLY Graph helpers — these are safe for any path
// ---------------------------------------------------------------------------

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

// Get item by path (returns null if not found) — READ ONLY
export async function getItemByPath(
  accessToken: string,
  driveId: string,
  itemPath: string,
): Promise<{ id: string; webUrl: string; lastModifiedDateTime: string; size: number } | null> {
  try {
    const data = await graphFetch(accessToken, `/drives/${driveId}/root:/${encodeURIComponent(itemPath)}`)
    return {
      id: data.id,
      webUrl: data.webUrl,
      lastModifiedDateTime: data.lastModifiedDateTime,
      size: data.size,
    }
  } catch {
    return null
  }
}

// ===========================================================================
//
//   WRITE OPERATIONS — RESTRICTED TO "Kiros AI/" PATH ONLY
//
//   SECURITY: All write operations (createFolder, ensureFolderPath, uploadFile)
//   are protected by MULTIPLE independent checks to ensure files can ONLY be
//   written under the "Kiros AI/" root folder in SharePoint.
//
//   Layer 1: ALLOWED_WRITE_ROOT constant (frozen, cannot be reassigned)
//   Layer 2: assertWritePathAllowed() — validates path prefix, blocks traversal
//   Layer 3: assertEndpointAllowed() — validates the raw Graph API endpoint
//   Layer 4: Each public write function validates its own path argument
//   Layer 5: Audit logging on every write operation
//
//   DO NOT remove, weaken, or bypass any of these checks.
//   If you need to write to a different path, discuss with the AP first.
//
// ===========================================================================

// LAYER 1: Immutable allowed write root — Object.freeze prevents reassignment
const WRITE_POLICY = Object.freeze({
  allowedRoot: 'Kiros AI',
  // Patterns that are NEVER allowed in any path segment
  blockedPatterns: ['..', '~', '%2e%2e', '%2E%2E', '\x00'] as readonly string[],
})

// LAYER 2: Path-level validation — called before any write function proceeds
function assertWritePathAllowed(rawPath: string, operationName: string): void {
  // 2a. Normalise: strip leading/trailing slashes, collapse doubles
  const normalised = rawPath
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/\/+/g, '/')

  // 2b. Block empty paths
  if (!normalised) {
    throw new Error(`[WRITE DENIED] ${operationName}: empty path is not allowed.`)
  }

  // 2c. Block path traversal and dangerous patterns
  for (const pattern of WRITE_POLICY.blockedPatterns) {
    if (normalised.includes(pattern)) {
      console.error(`[WRITE DENIED] ${operationName}: path "${rawPath}" contains blocked pattern "${pattern}"`)
      throw new Error(
        `[WRITE DENIED] ${operationName}: path contains forbidden pattern "${pattern}". ` +
        `This may be a path traversal attempt.`
      )
    }
  }

  // 2d. Verify path starts with the allowed root (case-sensitive)
  if (!normalised.startsWith(WRITE_POLICY.allowedRoot)) {
    console.error(`[WRITE DENIED] ${operationName}: path "${rawPath}" is outside allowed root "${WRITE_POLICY.allowedRoot}/"`)
    throw new Error(
      `[WRITE DENIED] ${operationName}: path "${normalised}" is outside the allowed root "${WRITE_POLICY.allowedRoot}/". ` +
      `All writes must be under "${WRITE_POLICY.allowedRoot}/".`
    )
  }

  // 2e. Verify the allowed root is followed by "/" or is the entire path
  //     This prevents paths like "Kiros AIevil/" from passing
  if (normalised !== WRITE_POLICY.allowedRoot && !normalised.startsWith(WRITE_POLICY.allowedRoot + '/')) {
    console.error(`[WRITE DENIED] ${operationName}: path "${rawPath}" does not properly nest under "${WRITE_POLICY.allowedRoot}/"`)
    throw new Error(
      `[WRITE DENIED] ${operationName}: path "${normalised}" does not properly nest under "${WRITE_POLICY.allowedRoot}/".`
    )
  }
}

// LAYER 3: Endpoint-level validation — validates the raw Graph API URL path
// This catches any case where a write endpoint is constructed without going
// through the path validation (defense against code changes / new functions).
function assertEndpointAllowed(endpoint: string, operationName: string): void {
  // Decode the endpoint to check the real path
  const decoded = decodeURIComponent(endpoint)

  // For drive root-relative paths like /drives/{id}/root:/Kiros AI/...:/content
  // or /drives/{id}/root:/Kiros AI/...:/children
  // Extract the path portion after "root:" or "root:/"
  const rootMatch = decoded.match(/\/root:?\/?([^:]+)/)
  if (rootMatch) {
    const drivePath = rootMatch[1].replace(/\/+$/, '')
    if (!drivePath.startsWith(WRITE_POLICY.allowedRoot)) {
      console.error(`[WRITE DENIED] ${operationName}: endpoint targets path outside allowed root. Endpoint: ${endpoint}`)
      throw new Error(
        `[WRITE DENIED] ${operationName}: Graph API endpoint targets "${drivePath}" which is outside "${WRITE_POLICY.allowedRoot}/".`
      )
    }
    return
  }

  // For root children endpoint (/drives/{id}/root/children) — creating at drive root level
  // This is only allowed if the folder being created IS "Kiros AI"
  // The createFolder function handles this case explicitly
  if (decoded.includes('/root/children')) {
    // This is acceptable ONLY when creating the "Kiros AI" root folder itself
    // The caller (createFolder) must verify the folder name
    return
  }

  // For item-based paths like /drives/{id}/items/{itemId}/... — these use item IDs
  // not path-based routing, so endpoint validation alone isn't sufficient.
  // The path-level check (Layer 2) is the primary guard for these.
}

// LAYER 5: Audit logging for all write operations
function auditLog(operation: string, path: string, details?: string): void {
  const timestamp = new Date().toISOString()
  console.log(`[SHAREPOINT WRITE AUDIT] ${timestamp} | ${operation} | path="${path}"${details ? ` | ${details}` : ''}`)
}

// ---------------------------------------------------------------------------
// Write function: graphFetchWithBody (internal — used by createFolder)
// NOT exported — only used internally by createFolder
// ---------------------------------------------------------------------------
async function graphFetchWithBody(
  accessToken: string,
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH',
  body: unknown,
  contentType: string = 'application/json',
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': contentType,
  }

  const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    method,
    headers,
    body: contentType === 'application/json' ? JSON.stringify(body) : (body as BodyInit),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Graph API ${method} error (${res.status}): ${error}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// EXPORTED WRITE FUNCTIONS — each has its own independent path validation
// ---------------------------------------------------------------------------

/**
 * Create a folder in a drive.
 * RESTRICTED: can only create folders under "Kiros AI/".
 */
export async function createFolder(
  accessToken: string,
  driveId: string,
  parentPath: string,
  folderName: string,
): Promise<{ id: string; webUrl: string }> {
  // Layer 2: Validate the full resulting path
  const fullFolderPath = parentPath ? `${parentPath}/${folderName}` : folderName
  assertWritePathAllowed(fullFolderPath, 'createFolder')

  // Build endpoint
  const endpoint = parentPath
    ? `/drives/${driveId}/root:/${encodeURIComponent(parentPath)}:/children`
    : `/drives/${driveId}/root/children`

  // Layer 3: Validate the endpoint itself
  assertEndpointAllowed(endpoint, 'createFolder')

  // Layer 4 (redundant by design): extra check that folder name doesn't contain traversal
  if (folderName.includes('..') || folderName.includes('/') || folderName.includes('\\')) {
    throw new Error(`[WRITE DENIED] createFolder: folder name "${folderName}" contains illegal characters.`)
  }

  // Layer 5: Audit
  auditLog('createFolder', fullFolderPath, `folderName="${folderName}"`)

  const data = await graphFetchWithBody(accessToken, endpoint, 'POST', {
    name: folderName,
    folder: {},
    '@microsoft.graph.conflictBehavior': 'replace',
  })

  return { id: data.id, webUrl: data.webUrl }
}

/**
 * Ensure a full folder path exists (e.g. "Kiros AI/Staff Training").
 * RESTRICTED: path MUST start with "Kiros AI".
 */
export async function ensureFolderPath(
  accessToken: string,
  driveId: string,
  fullPath: string,
): Promise<{ id: string; webUrl: string }> {
  // Layer 2: Validate the entire path
  assertWritePathAllowed(fullPath, 'ensureFolderPath')

  const segments = fullPath.split('/').filter(Boolean)

  // Layer 4 (redundant): verify first segment is exactly the allowed root
  if (segments[0] !== WRITE_POLICY.allowedRoot) {
    throw new Error(
      `[WRITE DENIED] ensureFolderPath: first path segment "${segments[0]}" must be exactly "${WRITE_POLICY.allowedRoot}".`
    )
  }

  // Layer 5: Audit
  auditLog('ensureFolderPath', fullPath, `segments=${segments.length}`)

  let currentPath = ''
  let lastResult: { id: string; webUrl: string } = { id: '', webUrl: '' }

  for (const segment of segments) {
    const parentPath = currentPath
    currentPath = currentPath ? `${currentPath}/${segment}` : segment

    // Try to get existing folder first
    try {
      const existing = await graphFetch(accessToken, `/drives/${driveId}/root:/${encodeURIComponent(currentPath)}`)
      lastResult = { id: existing.id, webUrl: existing.webUrl }
    } catch {
      // Folder doesn't exist — create it (createFolder has its own checks)
      lastResult = await createFolder(accessToken, driveId, parentPath, segment)
    }
  }

  return lastResult
}

/**
 * Upload a file to SharePoint.
 * RESTRICTED: folder path MUST be under "Kiros AI/".
 */
export async function uploadFile(
  accessToken: string,
  driveId: string,
  folderPath: string,
  fileName: string,
  content: Buffer,
  contentType: string,
): Promise<{ id: string; webUrl: string; name: string }> {
  // Layer 2: Validate the folder path
  assertWritePathAllowed(folderPath, 'uploadFile')

  // Layer 4 (redundant): block traversal in filename
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\') || fileName.includes('\x00')) {
    throw new Error(`[WRITE DENIED] uploadFile: filename "${fileName}" contains illegal characters.`)
  }

  const fullFilePath = `${folderPath}/${fileName}`.replace(/\/\/+/g, '/')
  const encodedPath = encodeURIComponent(fullFilePath)
  const endpoint = `/drives/${driveId}/root:/${encodedPath}:/content`

  // Layer 3: Validate the endpoint
  assertEndpointAllowed(endpoint, 'uploadFile')

  // Layer 5: Audit
  auditLog('uploadFile', fullFilePath, `size=${content.length} contentType="${contentType}"`)

  const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': contentType,
    },
    body: new Uint8Array(content),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Upload failed (${res.status}): ${error}`)
  }

  const data = await res.json()
  return { id: data.id, webUrl: data.webUrl, name: data.name }
}
