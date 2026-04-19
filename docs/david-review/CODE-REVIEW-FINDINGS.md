# Code Review Findings — Kiros Quality Portal

**Audience:** Rony Kirollos — work through this with your AI assistant. Each section is ordered by what to fix first.
**Date:** 2026-04-19
**Scope:** Full codebase — `src/` (273 files across 3 layers)
**Method:** Three independent review lenses (code quality, architecture, test quality) + layer-by-layer findings audit

---

## Overall Verdict

| Lens | Grade | Summary |
|---|---|---|
| Code Quality | **B-** | 1 BLOCKER, 4 MAJORs — handoff-ready with fixes |
| Test Quality | **C+** | E2E only, zero unit tests — adequate for maintenance, not for rebuild |
| Architecture | **C+** | 1 CRITICAL, 3 SIGNIFICANTs — needs patterns guide for Rony; redesign for Baku |
| **Overall** | **C+** | **CONDITIONAL PASS for maintenance / NOT READY for rebuild** |

**The codebase works. Real users are using it. The issues below represent the gap between "working" and "robust".**

---

## Section 1 — Security (Fix Before Anything Else)

These are not theoretical risks. Several are exploitable by any authenticated user right now.

### SEC-1: Unauthenticated test route is live in production
**File:** `src/app/api/documents/test-write-path/route.ts` (entire file)
**Severity:** Critical
**Issue:** Both GET and POST handlers have zero authentication. Any anonymous caller can hit this endpoint, inspect SharePoint path-validation logic, and learn the internal security model.
**Fix:** Delete this file entirely. Path validation tests belong in a CI test suite, not a deployed route.

---

### SEC-2: Marketing cron routes fully open on non-production deploys
**File:** `src/app/api/marketing/cron/analytics-sync/route.ts:12`, `publish/route.ts:13`, `token-refresh/route.ts:11`
**Severity:** Critical
**Issue:** All three use `&& process.env.NODE_ENV === 'production'` in the auth check. On Vercel preview deploys and staging, this clause makes them completely unprotected — anyone who finds the URL can trigger social media publishes.
**Fix:** Remove the `NODE_ENV` condition. Auth check should be only:
```ts
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

### SEC-3: Chat stream — no ownership check on resumed conversations
**File:** `src/app/api/chat/stream/route.ts:120-135`
**Severity:** Critical
**Issue:** When `conversationId` is supplied, history is loaded without verifying the conversation belongs to `user.id`. An authenticated user who knows another user's conversation ID can read their full history and inject messages.
**Fix:** Before loading history:
```ts
const { data: convCheck } = await supabase
  .from('chat_conversations').select('id')
  .eq('id', convId).eq('user_id', user.id).single()
if (!convCheck) return errorResponse('Conversation not found', 404)
```
Same fix needed in `src/app/api/marketing/chat/stream/route.ts:119-128`.

---

### SEC-4: Google webhook — no auth or signature verification
**File:** `src/app/api/marketing/webhooks/google/route.ts` (entire file)
**Severity:** Critical
**Issue:** Accepts any POST and writes it to `marketing_analytics_cache` with no authentication, no HMAC check, no schema validation.
**Fix:** Validate Google push notification authenticity. At minimum add a shared secret or validate a known Google header. Validate payload structure before writing.

---

### SEC-5: Meta webhook — signature check skipped when header is absent
**File:** `src/app/api/marketing/webhooks/meta/route.ts:27`
**Severity:** High
**Issue:** `if (signature && !(await verifyWebhookSignature(...)))` — if the header is absent, verification is skipped entirely.
**Fix:** Invert the logic:
```ts
if (!signature || !(await verifyWebhookSignature(signature, body))) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
}
```

---

### SEC-6: Reports extract — user-controlled table name hits service role query
**File:** `src/app/api/reports/extract/export/route.ts:49-53`, `preview/route.ts:35-37`
**Severity:** High
**Issue:** `config.primaryTable` from the request body is passed to a service role query without being validated against an allowed-tables list. Any admin/manager/ns user can extract up to 10,000 rows from any table — including `sharepoint_connection` (OAuth tokens), `marketing_social_accounts` (OAuth tokens), `profiles` (all staff PII).
**Fix:** Validate `config.primaryTable` against an explicit allowlist before passing to `executeReportQuery`. The allowlist already exists as `TABLE_SCHEMA` keys in the schema endpoint.

---

### SEC-7: Plaintext OAuth token storage — Meta API
**File:** `src/lib/marketing/meta-api.ts:52-68`
**Severity:** Critical
**Issue:** Long-lived Meta access tokens are persisted to the database with no encryption at rest.
**Fix:** Encrypt tokens before storage (AES-GCM via Supabase Vault or NaCl secretbox). Never store raw OAuth tokens in application tables.

---

### SEC-8: OAuth initiation routes — no auth check before OAuth flow
**File:** `src/app/api/marketing/meta/auth/route.ts`, `src/app/api/marketing/google/auth/route.ts`, `src/app/api/sharepoint/auth/route.ts`
**Severity:** High
**Issue:** All three OAuth initiation endpoints have no auth/role check. Any anonymous visitor can initiate the OAuth flow. State value is not stored server-side, so CSRF protection is absent.
**Fix:** Add auth + role check (admin/manager) at the top of each GET handler. Store `state` in a signed cookie and validate on callback.

---

### SEC-9: Cron secret — open if CRON_SECRET not set
**File:** `src/app/api/cron/qualifications/route.ts:7`, `src/app/api/documents/cron/sync/route.ts:9`
**Severity:** High
**Issue:** Pattern `if (process.env.CRON_SECRET && authHeader !== ...)` — if `CRON_SECRET` is not set, the entire check is skipped and the route is open.
**Fix:** Fail closed:
```ts
const cronSecret = process.env.CRON_SECRET
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

### SEC-10: Chat suggestions PATCH — no role check for approval
**File:** `src/app/api/chat/suggestions/route.ts:38-59`
**Severity:** High
**Issue:** Any authenticated user (including educators) can approve AI suggestions that create tasks and assign mandatory training to staff.
**Fix:** Role check: only `['admin', 'ns']` can set `status` to `approved` or `rejected`.

---

### SEC-11: Service role client used in 10+ locations without justification boundary
**File:** Multiple — `ProtectedLayout.tsx`, `chat/orchestrator.ts`, `chat/shared.ts`, `document-storage.ts`, `document-sync.ts`, `marketing/tool-executor.ts`, all cron routes
**Severity:** Critical (architectural)
**Issue:** No clear boundary defines where service role is justified. Some uses are unnecessary (badge counts, streaming convenience). Every new AI tool silently expands RLS bypass scope.
**Fix:** Audit every `createServiceRoleClient()` call. Permitted only in: cron jobs, AI tool execution (as system actor), document sync. All other uses convert to user-scoped client.

---

## Section 2 — Blockers (Fix Before Handoff)

### BLK-1: Task status `'review'` silently drops tasks from the Kanban board
**File:** `src/lib/types.ts:45`, `src/app/tasks/page.tsx:240`
**Issue:** Database allows `status = 'review'` but TypeScript `Task` type only defines `'todo' | 'in_progress' | 'done'`. Any task with `review` status is silently filtered out — real work disappears.
**Fix:** Either (a) add `'review'` to `Task.status` in `lib/types.ts` and add a Kanban column, OR (b) remove `'review'` from the DB schema and migrate existing rows. Check for existing data first.

---

### BLK-2: ProtectedLayout.tsx — temporary dev patch must be removed
**File:** `src/components/ProtectedLayout.tsx` — `getBadgeCounts()` function, first line
**Issue:** `if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { '/tasks': 0, '/checklists': 0 }` — added during dev to prevent a crash. `SUPABASE_SERVICE_ROLE_KEY` is now set. This line must be removed before committing.
**Fix:** Delete that one line. The key is set; the guard is no longer needed.

---

### BLK-3: OWNA Attendance returns HTTP 400
**File:** `src/app/api/owna/attendance/route.ts`
**Issue:** Endpoint returns 400 Bad Request. The API key is correct (other OWNA endpoints work). The bug is a missing or malformed date parameter in the request.
**Fix:** Check OWNA API docs for the attendance endpoint's required parameters (date range, room ID). Fix the parameter construction. Verify live attendance data loads.

---

### BLK-4: /recruitment root route returns 404
**File:** `next.config.mjs` (or create `src/app/recruitment/page.tsx`)
**Issue:** No page exists at `/recruitment`. The sidebar heading is a label, not a link.
**Fix:** Add to `next.config.mjs`:
```js
{ source: '/recruitment', destination: '/candidates', permanent: false }
```

---

## Section 3 — Low Hanging Fruit (Under 30 Minutes Each)

Quick wins. All high value, low effort.

| # | File | Fix | Time |
|---|---|---|---|
| LH-1 | `api/marketing/webhooks/meta/route.ts:27` | Invert signature check (1 line) | 5 min |
| LH-2 | All 3 marketing cron routes | Remove `&& NODE_ENV === 'production'` | 10 min |
| LH-3 | `api/cron/qualifications/route.ts:7` + `documents/cron/sync/route.ts:9` | Fail closed on missing CRON_SECRET | 10 min |
| LH-4 | `api/chat/conversations/route.ts:84` | Validate conversationId non-null | 5 min |
| LH-5 | `api/documents/library/route.ts:65` | Cap `limit` at 200: `Math.min(parseInt(...), 200)` | 5 min |
| LH-6 | `api/marketing/accounts/[id]/route.ts:49` | Return 404 if no rows affected on DELETE | 10 min |
| LH-7 | `api/marketing/cron/publish/route.ts:82` | Wrap Instagram publish in `withTokenRefresh()` | 15 min |
| LH-8 | `lib/marketing/token-manager.ts:1-30` | Remove dead `OAUTH_CONFIG` fields | 10 min |
| LH-9 | `app/api/documents/test-write-path/route.ts` | Delete this file entirely | 2 min |
| LH-10 | `lib/owna.ts` date helpers | Add `Australia/Sydney` timezone default | 20 min |
| LH-11 | `app/registers/page.tsx`, `checklists/templates/page.tsx` | Replace `Date.now() + Math.random()` with `crypto.randomUUID()` | 10 min |
| LH-12 | `lib/chat/sse-protocol.ts:30-45` | Add heartbeat event every 30s for long-running sessions | 20 min |

---

## Section 4 — Silent Failures & Data Integrity

These don't crash visibly. They lose data quietly.

### SF-1: Document export silently succeeds but produces empty file
**File:** `src/lib/document-storage.ts:29-35`
**Issue:** Try-catch catches all errors from `@react-pdf/renderer` import and swallows them — no log, no return signal. Export appears to succeed. User downloads empty file.
**Fix:** Re-throw after logging, or return `{ success: false, error }`. Never catch-and-discard in export paths.

---

### SF-2: Empty catch in token refresh loop
**File:** `src/lib/marketing/token-manager.ts:45-65`
**Issue:** Consecutive token refresh failures cascade silently. Marketing integrations continue operating with expired tokens. Analytics writes and social posts fail invisibly.
**Fix:** Log each failure with platform context. Implement a circuit breaker after N failures.

---

### SF-3: Chat learnings sync fire-and-forget
**File:** `src/lib/chat/shared.ts:275`
**Issue:** `Promise.resolve(...).catch(() => {})` silently swallows learnings sync errors. User corrections and preferences are lost with no visibility.
**Fix:**
```ts
supabase.from('ai_learnings').update({ last_used_at: new Date() }).in('id', ids)
  .then(({ error }) => { if (error) console.error('[Learnings] Sync failed:', error.message) })
```

---

### SF-4: Checklist instance falls back to live template items
**File:** `src/app/checklists/[id]/page.tsx:40`
**Issue:** `instance.items_snapshot?.length > 0 ? instance.items_snapshot : template.items` — if snapshot is missing, the component reads live items. This breaks the core guarantee: a checklist is a frozen snapshot. Editing the template after assigning a checklist silently changes in-progress checklists.
**Fix:** Never fall back to live items:
```ts
const items = instance.items_snapshot || []
if (items.length === 0) return <ErrorPage message="Checklist snapshot missing. Contact support." />
```

---

### SF-5: Checklist items not validated before snapshotting
**File:** `src/app/checklists/page.tsx:70-82`
**Issue:** `tmpl.items` is copied to `items_snapshot` without checking items have required fields (`id`, `type`, `title`). Corrupted templates produce corrupted snapshots.
**Fix:**
```ts
const validItems = (tmpl.items || []).filter(i => i.id && i.type)
if (validItems.length === 0) { toast('Template has no valid items'); return }
```

---

### SF-6: Document sync hash-based change detection has no collision protection
**File:** `src/lib/document-sync.ts:55-72`
**Issue:** Simple hash for change detection. Hash collision causes a changed document to be skipped. Stale content propagates to SharePoint silently.
**Fix:** Upgrade to SHA-256. Pair hash with document size and last-modified timestamp.

---

### SF-7: JSONB data written without schema validation
**File:** `src/app/registers/page.tsx:110-114`, `src/app/checklists/templates/page.tsx:129-139`, `src/app/policies/new/page.tsx:67-82`
**Issue:** Complex JSONB structures (`columns`, `items`, `content`) built client-side and written to DB with no validation. Corrupt/incomplete JSONB accumulates.
**Fix:** Add Zod schemas for all JSONB structures. Validate before every insert/update.

---

### SF-8: Token refresh cron passes null tokens to API
**File:** `src/app/api/marketing/cron/token-refresh/route.ts:35-70`
**Issue:** Meta branch falls back from `metadata.user_token` to `access_token` without checking either is non-empty. Passes `undefined` to API, which returns error mis-classified as "expired" — permanently locking out a valid account.
**Fix:**
```ts
const userToken = account.metadata?.user_token || account.access_token
if (!userToken?.length) { console.warn(`Skipping ${account.id}: no token`); continue }
```

---

## Section 5 — Resilience (From Fragile to Robust)

### RES-1: In-memory rate limiter is per-process — ineffective on Vercel
**File:** `src/middleware.ts:4`
**Issue:** `Map<string, { count, resetTime }>` resets on every Vercel function cold start. Multiple warm instances each track their own counter. Real rate limiting doesn't exist. Also keyed on spoofable `x-forwarded-for`.
**Fix:** Replace with Upstash Redis rate limiter. Validate `x-forwarded-for` from trusted proxy range.

---

### RES-2: OWNA API has no retry on transient failures
**File:** `src/lib/owna.ts:25-40`
**Issue:** Single transient 5xx or timeout fails the entire operation. No retry logic.
**Fix:** Exponential backoff for 5xx and timeouts. Circuit breaker for repeated failures.

---

### RES-3: Model router has no capacity fallback
**File:** `src/lib/chat/model-router.ts:18-35`
**Issue:** Picks Opus vs Sonnet by complexity but doesn't check rate limits or quota. If Opus hits its limit, chat fails hard with no degradation to Sonnet.
**Fix:** Implement automatic fallback to Sonnet. Add quota alerting at a configurable threshold.

---

### RES-4: Report export has no size limit
**File:** `src/lib/report-export.ts`
**Issue:** No row count check before generating export. No recursion depth limit for nested structures. Runaway exports exhaust memory and degrade server for other users.
**Fix:** Cap at 10,000 rows before export. Add recursion depth limit. Return 413 if limit exceeded.

---

### RES-5: Candidate onboarding creates auth user before checking idempotency
**File:** `src/app/api/recruitment/onboard/route.ts:54-66`
**Issue:** Calls `serviceClient.auth.admin.createUser()` before checking if a user with that email already exists. Double-submit or retry creates duplicate auth accounts with split training and checklist assignments.
**Fix:** Check for existing auth user with the candidate's email before creating.

---

### RES-6: Recruitment apply token — no expiry enforced
**File:** `src/app/api/recruitment/apply/[token]/route.ts:21-28`
**Issue:** Token validated by DB lookup only. No `expires_at` check. Token remains permanently valid after submission.
**Fix:** Add `token_expires_at` column (7–14 days from invite). Check expiry on every GET and POST. Return `410 Gone` for expired tokens.

---

### RES-7: ProtectedLayout missing pathname guard
**File:** `src/components/ProtectedLayout.tsx:52-57`
**Issue:** `pathname` read from `x-pathname` header without checking it is present. If header is missing, `canAccessPath()` receives `''` and defaults to `true` — all pages accessible.
**Fix:**
```ts
if (!pathname) redirect('/dashboard')
if (pathname !== '/dashboard' && !canAccessPath(profile, pathname)) redirect('/dashboard')
```

---

### RES-8: No periodic profile re-validation for deactivated users
**File:** `src/components/ProtectedLayout.tsx` (profile loading section)
**Issue:** Profile loaded once at app init. A terminated employee retains full access until JWT expires.
**Fix:** Periodic profile re-fetch every 5 minutes. Redirect to `/login` if `is_active` is false.

---

### RES-9: ChatAssistant realtime subscription not filtered by user ID
**File:** `src/components/ChatAssistant.tsx:225-272`
**Issue:** Realtime subscription filters on `conversation_id` only. Misconfigured conversation IDs could leak messages from other users' conversations.
**Fix:** Add `AND user_id=eq.${profile.id}` to the realtime filter.

---

### RES-10: Microsoft Graph write path validation bypassable
**File:** `src/lib/microsoft-graph.ts:120-145`
**Issue:** `WRITE_POLICY` and `assertWritePathAllowed()` exist but are not enforced at the client factory. Callers can bypass validation by calling the API directly.
**Fix:** Enforce `WRITE_POLICY` validation inside the factory wrapper so all write operations are validated unconditionally.

---

## Section 6 — Test Coverage

**Current state:** 48 E2E test files (2,661 lines, 280+ tests). Zero unit tests. Zero integration tests.

**What the test suite WILL catch:**
- Page not found / route breaks
- Missing headings or primary UI elements
- AI chat not responding
- Form not submitting
- Table/list not rendering
- Mobile layout broken
- Console errors from unhandled exceptions

**What the test suite WILL MISS:**
- Silent data corruption (task status reverts on reload — no persistence assert)
- Role-based access control bypass (no educator-role tests exist)
- Checklist snapshot not frozen after template edit
- PendingAction confirmation dialog not appearing
- Async race conditions
- Validation bypass (forms submit with invalid data)
- API contract changes (renamed field, frontend silently ignores)

### Tests to add — ordered by regression risk:

**P0 — Add these first:**

1. **`tests/e2e/tasks-persistence.spec.ts`** — Create task, set status=In Progress, reload page, verify status persists. Test with educator role (should be blocked from changing status). This is the most important missing test.

2. **`tests/e2e/checklists-snapshot.spec.ts`** — Create checklist from template. Edit the template. Reload the checklist. Verify items are unchanged. Catches the silent data corruption in SF-4 above.

**P1 — Add in week 2:**

3. **`tests/e2e/chat-rls.spec.ts`** — Login as educator. Verify recruitment agent NOT in agent list. Send a recruitment query. Verify response doesn't reference candidate data.

4. **`tests/e2e/seeded/chat-pending-actions.spec.ts`** — Send prompt that triggers tool use. Verify PendingAction dialog appears. Click Decline. Verify the artifact was NOT created in the database.

5. **`tests/e2e/policies-acknowledge-flow.spec.ts`** — Publish a policy. Switch to educator role. Verify acknowledge task appears in /tasks. Complete it. Verify task count decrements and policy shows acknowledge timestamp.

### Files with D-grade coverage (address these):

| File | Issue |
|---|---|
| `compliance.spec.ts` | 2 tests — only checks page loads; no risk assessment |
| `ap-dashboard.spec.ts` | 2 tests in 11 lines — major dashboard undertested |
| `forms.spec.ts` | 1 test (8 lines) — no form submission tested |

### Rules for Rony's maintenance period:
1. No new code paths without E2E test coverage — no unit tests exist as safety net
2. For data mutations: use serial mode, timestamps, reload-verify pattern
3. For AI features: target `data-testid`, verify bubble content, set timeout 90s+
4. For role-specific features: copy seeded approach with env var guards and clear skip messages

---

## Section 7 — Architecture

These are longer-term improvements. Not urgent for maintenance, but critical context for how the codebase is structured.

### ARCH-1: Pages directly query the database (no data access layer)
**367 direct Supabase queries in `/app` pages.** No boundary between data access and presentation. Every page is its own data controller.

This means: inconsistent state management, 10+ different data-fetch patterns, no central place to add logging or caching, impossible to test in isolation.

**For Rony:** Be aware that changing a query in one page doesn't help other pages with the same query. Each page is independent.
**For Baku rebuild:** This must change — all pages should call Route Handlers; no direct DB access from components.

---

### ARCH-2: Tool permissions have two sources of truth
**File:** `src/lib/chat/orchestrator.ts` + `ai_tool_permissions` table
**Issue:** Tool permissions are defined in both hardcoded `ALL_TOOLS.allowedRoles` arrays AND in the `ai_tool_permissions` database table. Adding a new tool requires updating both. Inconsistency between them causes silent failures.

**For Rony:** When adding a new tool, update both the hardcoded array AND the DB table. The DB table is what the admin UI shows; the array is what the code actually checks.

---

### ARCH-3: Badge count cache not scoped to user
**File:** `src/components/ProtectedLayout.tsx:12-27`
**Issue:** `unstable_cache()` uses a global key `['badge-counts']` not scoped to user. Multiple edge function instances = undefined cache coherence. Different users could see each other's badge counts.

---

### ARCH-4: AI config loaded on every request
**File:** `src/lib/ai-config.ts`
**Issue:** `loadAIConfig()` fetches the entire config table on every API request with no memoisation. Low risk at current scale, but wasteful.

---

### ARCH-5: Report and document pipeline over-engineered for current use
**Files:** `report-schema.ts`, `report-query-builder.ts`, `report-export.ts`, `report-types.ts`, `document-templates.ts`, `document-storage.ts`, `document-sync.ts`
**Issue:** Seven files managing two pipelines. Post-fetch filtering happens in JS after fetching all rows. SharePoint sanitisation duplicated across two files. For Baku, this abstraction level will likely be replaced by AI-generated documents.

---

### ARCH-6: Single-tenancy baked in at every layer
**Issue:** No `centre_id` foreign key on most tables. `lib/owna.ts:2` has a hardcoded `DEMO_CENTRE_ID`. RLS policies written without tenant discriminator. Multi-centre migration = full schema redesign. Document this decision explicitly if multi-centre use is ever discussed.

---

## Cross-Lens Priority Actions

These findings appeared in multiple review lenses — highest confidence, highest priority:

| Priority | Issue | Where to fix |
|---|---|---|
| 1 | Task status enum mismatch | `lib/types.ts:45` → add `'review'` or remove from DB |
| 2 | Service role client proliferation | Audit all 10+ call sites; remove unjustified uses |
| 3 | In-memory rate limiter | Replace with Upstash Redis |
| 4 | Zero unit tests | No unit tests = no safety net for logic changes |
| 5 | 39 `as any` casts | Create strict query response types; remove casts incrementally |

---

## Recommended Work Order for Rony

### This week (before starting feature work):
1. BLK-2 — Remove ProtectedLayout patch (5 min)
2. BLK-4 — Fix /recruitment 404 (5 min)
3. SEC-2 — Remove NODE_ENV bypass from marketing crons (10 min)
4. SEC-9 — Fix cron secret conditional (10 min)
5. LH section — work through the low hanging fruit list above (~3 hours total)
6. BLK-1 — Fix task status mismatch (1 hour)
7. BLK-3 — Fix OWNA attendance 400 (investigate + fix)

### Week 1–2:
8. SEC-1 — Delete unauthenticated test route
9. SF-1 — Fix silent error in document-storage.ts
10. SF-3 — Fix fire-and-forget learnings sync
11. SF-8 — Fix null token in cron refresh
12. RES-1 — Replace in-memory rate limiter with Redis
13. Add P0 tests: tasks-persistence and checklists-snapshot

### Before adding any new features:
14. Read the ARCH section — understand the five implicit patterns (tool registration, permission setup, service role justification, data fetch conventions, cron secret pattern)
15. Do not add new AI tools without auditing which service role calls are truly justified

---

*Review performed 2026-04-19. Covers all 273 files across API routes (53), shared library (28), and feature pages (192). Source files: `findings-layer1.md`, `findings-layer2.md`, `findings-layer3df.md`, `audit-code-quality.md`, `audit-architecture.md`, `audit-test-quality.md`, `audit-combined.md`.*
