# System Health — Kiros Quality Portal

**Audience:** Rony (maintainer, next 1–2 months)
**Date:** 2026-04-19
**Status:** Several features non-functional due to missing env vars. Core portal (tasks, checklists, documents, registers) works. AI chat, OWNA integration, and SharePoint do not.

---

## 1. Environment Variables

Set these in `.env.local` at the project root. Dev server runs on port 3333 (`npm run dev`).

| Variable | Status | Impact if missing |
|---|---|---|
| `SUPABASE_URL` | Set | — |
| `SUPABASE_ANON_KEY` | Set | — |
| `SUPABASE_SERVICE_ROLE_KEY` | **Now set** *(was missing)* | Badge counts, onboarding, cron jobs all functional |
| `ANTHROPIC_API_KEY` | **Now set** *(was missing)* | AI chat should be functional |
| `OWNA_API_KEY` | **Now set** *(was missing)* | OWNA integration should be functional |
| SharePoint OAuth | **Partially configured** | `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET` set; `MICROSOFT_SHAREPOINT_SITE_URL` is empty — sync will fail |
| `META_*` keys | **Partially configured** | `META_APP_ID` and `META_APP_SECRET` set; `META_WEBHOOK_VERIFY_TOKEN` missing |
| `GOOGLE_ADS_*` keys | **Partially configured** | `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set; `GOOGLE_ADS_DEVELOPER_TOKEN` and `GOOGLE_ADS_LOGIN_CUSTOMER_ID` missing |

**Remaining blockers:** Set `MICROSOFT_SHAREPOINT_SITE_URL` for SharePoint sync. Complete Google Ads developer token for marketing campaigns. Set `META_WEBHOOK_VERIFY_TOKEN` for Meta webhooks.

---

## 2. What's Broken Right Now

- **AI chat** — `ANTHROPIC_API_KEY` now set; should be functional; not smoke-tested in Phase 5
- **OWNA pages** — `OWNA_API_KEY` now set; should be functional; not smoke-tested in Phase 5
- **Staff onboarding** — `SUPABASE_SERVICE_ROLE_KEY` now set; should be functional
- **Sidebar badge counts** — `SUPABASE_SERVICE_ROLE_KEY` now set; temporary patch in ProtectedLayout.tsx can now be removed (see Section 7)
- **SharePoint sync** — no OAuth credentials configured
- **Marketing social publishing** — no Meta/Google OAuth configured
- **`export_document` AI tool** — stub only; returns UI guidance text, never exports anything
- **Excel extraction from SharePoint** — returns placeholder string `[Spreadsheet content - manual review recommended]`
- **Policy review reminder emails** — "Send Reminder" button shows a success toast but sends no email

---

## 3. Recently Changed (Last Round of Work)

These areas are fresh and have been tested — be aware they may have subtle follow-on effects:

- **AI tool queries** — 8 column name mismatches fixed (`shift_date`, `failed_items_count`, etc.)
- **AI chat history** — tool result history now included in conversation reconstruction; follow-up questions no longer re-query the same data
- **AI model** — changed from Sonnet to Opus; extended thinking enabled (`budget_tokens: 10000`); temperature fixed from invalid `0.7` to `null`
- **Security** — OWNA API key moved from source code to env var; 5 unauthenticated API routes fixed; SQL injection in confirm handler fixed via whitelist
- **Chat subscription** — now listens for `INSERT + UPDATE` events (was `INSERT` only)
- **AI learnings expiry filter** — now actually filters (was a code comment with no logic)
- **SharePoint PDF extraction** — fixed to use `pdf-parse` (was attempting invalid UTF-8 conversion of binary content)
- **Adaptive thinking type** — was causing 400 errors in production; fixed to use `'enabled'` type

---

## 4. Known Deferred Bugs

These exist but were not fixed. Know what you're getting into before touching these areas.

| Bug | Impact |
|---|---|
| **In-memory rate limiter** | Resets on Vercel cold start; doesn't work across serverless instances. A user can exceed 30 req/min in production. Needs Redis/Upstash to fix properly. |
| **Task status enum mismatch** | DB allows `'review'` status; TypeScript type omits it. Tasks with `status='review'` created directly in Supabase won't appear on the board. |
| **Activity page duplicate entries** | Real-time can show duplicates on INSERT event; needs dedup logic. |
| **No per-user chat search** | Users must scroll to find old conversations. |
| **Silent session expiry** | No client-side detection; user gets silent auth failure when session expires. |
| **DOCX export formatting loss** | Bold/italic lost in markdown-to-docx conversion. |
| **PDF generation timeout** | Large documents can timeout; no fallback or retry. |
| **LMS certificate expiry** | Schema has `expiry_date` column; no automation checks or notifies on it. |
| **AI token tracking underreports** | Only captures last API iteration for multi-iteration tool calls. |
| **Multi-centre logic untested** | AP dashboard assumes one centre; only one centre exists in DB. |

---

## 5. Architecture Landmines

Read these carefully before making changes.

**1. `createServiceRoleClient()` bypasses all RLS.**
Located in `src/lib/supabase/server.ts`. Any route using it has superuser access to all data. Legitimate uses: AI tool execution, cron jobs, onboarding. If you add a new route using this client for convenience, you've created a security hole.

**2. In-memory rate limiter.**
`rateLimitMap` in the chat stream route is a plain JS `Map`. It provides no real protection in production (see deferred bugs). Don't mistake it for actual rate limiting.

**3. 18 tables with `USING(true)` RLS.**
LMS and SharePoint tables have permissive RLS policies — any authenticated user can read/write all rows. This means any logged-in user can see training records of every other user. Tables affected include: `lms_modules`, `lms_enrollments`, `lms_certificates`, `sharepoint_documents`, `sharepoint_credentials`, `ai_generated_documents`, and more.

**4. Plaintext OAuth token storage.**
`marketing_social_accounts` stores `access_token` and `refresh_token` in plaintext DB columns. `sharepoint_credentials` stores SharePoint app secrets in plaintext. If the DB is ever exposed, all platform credentials are compromised.

**5. SharePoint URL is hardcoded.**
`https://kirosgroup.sharepoint.com/sites/operations` is hardcoded in the SharePoint callback route. Moving to a different site requires a code change.

**6. Two training systems exist.**
- Legacy: `training_modules` / `training_assignments` → page at `/training`
- Full LMS: `lms_modules` / `lms_enrollments` → pages at `/learning/*`

They are separate, unconnected, and both have live pages. The AI tools reference both. This will cause confusion. Pick one and deprecate the other.

**7. `allowed_pages` is a restriction list, not an allowlist.**
`null` or empty = full access. Setting to an empty array locks the user out completely. Counter-intuitive — be careful when editing user permissions.

**8. `src/lib/chat/shared.ts` is 2,245 lines.**
The entire AI tool catalogue, `executeTool` switch, and system prompt builders are in this single file. Any syntax error breaks all AI features.

---

## 6. Maintenance Calendar

| Frequency | Task | Route / File | Notes |
|---|---|---|---|
| Daily | Qualification expiry check | `api/cron/qualifications` | Must be registered in `vercel.json` as a Vercel cron job |
| Daily | SharePoint document sync | `api/documents/cron/sync` | Only functional once SharePoint OAuth is configured |
| Periodic | Marketing token refresh | `api/marketing/cron/token-refresh` | Must be cron-triggered; if tokens expire without refresh, marketing publishing fails silently |
| Periodic | SharePoint token refresh | `api/sharepoint/refresh-token` | No automatic scheduling visible; must be triggered manually or via cron before token expiry |

---

## 7. Temporary Code — Remove This

`src/components/ProtectedLayout.tsx` has a temporary guard added for dev sessions without the service key:

```ts
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { '/tasks': 0, '/checklists': 0 }
```

**`SUPABASE_SERVICE_ROLE_KEY` is now set in `.env.local`.** This line should be removed. Verified still present as of Phase 5 audit (2026-04-19, line 14 of `ProtectedLayout.tsx`). Remove it to restore actual badge counts.

---

## 8. What Not to Touch

- **`src/lib/chat/shared.ts`** — Any change risks breaking all AI features. Test thoroughly after edits.
- **RLS policies on core tables** — `tasks`, `checklists`, `staff`, `documents` have working RLS. Do not alter without understanding the full policy chain.
- **Auth middleware** (`src/middleware.ts`) — Controls all route protection. A mistake here exposes the entire app.
- **The two training systems** — Don't add features to either until a decision is made to consolidate. Adding to both makes the mess worse.

---

## 9. Phase 5 Audit Findings (2026-04-19)

### 9.1 Live DB Reveals Unfinished Operational Features

Three features that appear complete in the UI have ZERO production usage — not because of bugs, but because the operational workflow was never started:

| Feature | Evidence | Risk |
|---|---|---|
| **Checklists** | 19 templates, 0 instances ever run | The core compliance mechanism has never been used. smart_tickets is at 0 as a direct consequence. |
| **Policies** | 12 categories, 0 policies created | Staff have never acknowledged any policy. Compliance and regulatory exposure. |
| **Registers** | 7 register definitions, 0 entries | Registers are a mandatory ACECQA record-keeping requirement. Zero entries is a gap. |

These are not code bugs — they are operational gaps. The system is ready; the centre hasn't started using these features.

### 9.2 Playwright Tests Cannot Run

All E2E tests require `TEST_EMAIL` and `TEST_PASSWORD` environment variables set before the auth setup step runs. These are not in `.env.local`. Until they're set, all 43 tests in the suite will fail at the auth step. To run:

```bash
TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword npx playwright test
```

No test credentials were found in the repository. This is a gap — if test users don't exist in the Supabase project, tests can't run even with credentials.

### 9.3 RLS Security Gap Confirmed

17 LMS and SharePoint tables have `FOR ALL USING(true) WITH CHECK(true)` policies. Any logged-in staff member can delete all LMS modules or issue certificates for other users. Full table list and detail in `docs/DB-REALITY-CHECK.md`, Section 4.

### 9.4 Environment Variable Status Corrected

Section 1 of this document has been updated. All primary keys (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `OWNA_API_KEY`) are now present in `.env.local`. Three keys remain partially or fully unconfigured: SharePoint site URL, Google Ads developer token, Meta webhook verify token.

---

## 10. Key File Locations

| What | Where |
|---|---|
| All AI tools + `executeTool` | `src/lib/chat/shared.ts` |
| System prompt builder | `src/lib/chat/shared.ts` (`buildSystemPromptFromDB`) |
| AI agent definitions (DB-driven) | Admin → AI Agents page; table: `ai_agent_definitions` |
| Supabase clients | `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts` |
| All TypeScript types | `src/lib/types.ts` |
| Document generation (PDF/DOCX) | `src/lib/document-templates.ts` |
| SharePoint integration | `src/lib/microsoft-graph.ts` |
| Report query builder | `src/lib/report-query-builder.ts`, `report-schema.ts` |
| Marketing API wrappers | `src/lib/marketing/meta-api.ts`, `google-api.ts` |
| Auth middleware | `src/middleware.ts` |
| Nav sidebar | `src/components/Sidebar.tsx` |
| Badge counts (patched) | `src/components/ProtectedLayout.tsx` |
| Chat UI | `src/app/chat/page.tsx` + `src/components/ChatAssistant.tsx` |
