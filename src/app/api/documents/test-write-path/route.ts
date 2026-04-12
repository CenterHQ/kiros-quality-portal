import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Duplicated validation logic from microsoft-graph.ts and document-storage.ts
// so we can test path security WITHOUT calling SharePoint.
// ---------------------------------------------------------------------------

const WRITE_POLICY = Object.freeze({
  allowedRoot: 'Kiros AI',
  blockedPatterns: ['..', '~', '%2e%2e', '%2E%2E', '\x00'] as readonly string[],
})

function assertWritePathAllowed(rawPath: string, op: string): { ok: true } | { ok: false; error: string } {
  const normalised = rawPath.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/\/+/g, '/')

  if (!normalised) return { ok: false, error: `${op}: empty path` }

  for (const p of WRITE_POLICY.blockedPatterns) {
    if (normalised.includes(p)) return { ok: false, error: `${op}: blocked pattern "${p}" in "${rawPath}"` }
  }

  if (!normalised.startsWith(WRITE_POLICY.allowedRoot)) {
    return { ok: false, error: `${op}: path "${normalised}" outside allowed root "${WRITE_POLICY.allowedRoot}/"` }
  }

  if (normalised !== WRITE_POLICY.allowedRoot && !normalised.startsWith(WRITE_POLICY.allowedRoot + '/')) {
    return { ok: false, error: `${op}: path "${normalised}" does not properly nest under "${WRITE_POLICY.allowedRoot}/"` }
  }

  return { ok: true }
}

function sanitiseFolderName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60)
}

function sanitiseFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\.\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100)
}

function buildSafeFolderPath(topicFolder: string): { ok: true; path: string } | { ok: false; error: string } {
  const sanitised = sanitiseFolderName(topicFolder)
  if (!sanitised) return { ok: false, error: 'topic_folder is empty after sanitisation' }
  const folderPath = `${WRITE_POLICY.allowedRoot}/${sanitised}`
  if (!folderPath.startsWith(WRITE_POLICY.allowedRoot + '/')) {
    return { ok: false, error: `constructed path "${folderPath}" does not start with "${WRITE_POLICY.allowedRoot}/"` }
  }
  return { ok: true, path: folderPath }
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

interface TestResult {
  id: number
  input: string
  description: string
  expected: 'PASS' | 'DENIED'
  actual: 'PASS' | 'DENIED'
  match: boolean
  resolvedPath: string | null
  details: string
}

const TEST_CASES: { input: string; expected: 'PASS' | 'DENIED'; description: string }[] = [
  { input: 'Staff Training', expected: 'PASS', description: 'Normal topic folder' },
  { input: 'QA1 Review', expected: 'PASS', description: 'Normal QA topic' },
  { input: 'Health and Safety Docs', expected: 'PASS', description: 'Normal multi-word topic' },
  { input: '../../etc/passwd', expected: 'DENIED', description: 'Path traversal with ..' },
  { input: '../Shared Documents', expected: 'DENIED', description: 'Path traversal one level up' },
  { input: 'Shared Documents/hack', expected: 'PASS', description: 'Wrong root — but slashes stripped by sanitiser so folder becomes "Shared Documentshack"' },
  { input: '', expected: 'DENIED', description: 'Empty string' },
  { input: '   ', expected: 'DENIED', description: 'Whitespace only' },
  { input: 'Kiros AIevil', expected: 'PASS', description: 'Prefix trick — sanitised to folder "Kiros AIevil" under root, so path = "Kiros AI/Kiros AIevil"' },
  { input: '%2e%2e/secret', expected: 'DENIED', description: 'URL-encoded traversal' },
  { input: '~root', expected: 'DENIED', description: 'Tilde path' },
  { input: 'a\x00b', expected: 'DENIED', description: 'Null byte injection' },
  { input: '<script>alert(1)</script>', expected: 'PASS', description: 'XSS attempt — angle brackets stripped, becomes "scriptalert(1)script"' },
  { input: 'Normal/Sub/Deep', expected: 'PASS', description: 'Nested slashes — stripped by sanitiser' },
]

function runTests(): TestResult[] {
  return TEST_CASES.map((tc, i) => {
    // Step 1: sanitise the topic folder (as document-storage.ts does)
    const buildResult = buildSafeFolderPath(tc.input)

    if (!buildResult.ok) {
      return {
        id: i + 1,
        input: tc.input,
        description: tc.description,
        expected: tc.expected,
        actual: 'DENIED' as const,
        match: tc.expected === 'DENIED',
        resolvedPath: null,
        details: `Blocked by buildSafeFolderPath: ${buildResult.error}`,
      }
    }

    // Step 2: run the write-path assertion (as microsoft-graph.ts does)
    const writeCheck = assertWritePathAllowed(buildResult.path, 'uploadFile')

    if (!writeCheck.ok) {
      return {
        id: i + 1,
        input: tc.input,
        description: tc.description,
        expected: tc.expected,
        actual: 'DENIED' as const,
        match: tc.expected === 'DENIED',
        resolvedPath: buildResult.path,
        details: `Blocked by assertWritePathAllowed: ${writeCheck.error}`,
      }
    }

    return {
      id: i + 1,
      input: tc.input,
      description: tc.description,
      expected: tc.expected,
      actual: 'PASS' as const,
      match: tc.expected === 'PASS',
      resolvedPath: buildResult.path,
      details: `Would write to: ${buildResult.path}`,
    }
  })
}

// ---------------------------------------------------------------------------
// GET handler — run all tests and return results
// ---------------------------------------------------------------------------

export async function GET() {
  const results = runTests()
  const passed = results.filter(r => r.match).length
  const failed = results.filter(r => !r.match).length

  return NextResponse.json({
    summary: {
      total: results.length,
      passed,
      failed,
      allPassed: failed === 0,
    },
    results,
  })
}

// ---------------------------------------------------------------------------
// POST handler — test a custom path
// Body: { "topicFolder": "your test input" }
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const body = await request.json()
  const topicFolder = body.topicFolder ?? ''

  const buildResult = buildSafeFolderPath(topicFolder)
  if (!buildResult.ok) {
    return NextResponse.json({
      input: topicFolder,
      result: 'DENIED',
      resolvedPath: null,
      reason: buildResult.error,
    })
  }

  const writeCheck = assertWritePathAllowed(buildResult.path, 'test')
  if (!writeCheck.ok) {
    return NextResponse.json({
      input: topicFolder,
      result: 'DENIED',
      resolvedPath: buildResult.path,
      reason: writeCheck.error,
    })
  }

  return NextResponse.json({
    input: topicFolder,
    result: 'PASS',
    resolvedPath: buildResult.path,
    reason: `Would write to: ${buildResult.path}`,
  })
}
