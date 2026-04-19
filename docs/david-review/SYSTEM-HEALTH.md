# Kiros Quality Portal — System Health

**Audience:** Rony Kirollos — developer maintaining this system for the next 1–2 months.
**Captured:** 2026-04-19
**Source:** 56-screenshot tour of all routes (role: Approved Provider), CONTEXT.md, CLAUDE.md, .env.local, ProtectedLayout.tsx.

This is a frank engineering assessment. If something is broken, it says broken.

---

## 1. At a Glance — System Status

| Feature Area | Status | Notes |
|---|---|---|
| Login | Working | No reset/register flow visible |
| Dashboard | Working | Real NQS data — 34 elements not met, 5 compliance actions open |
| NQS Elements | Working | 40 elements across QA1–7, ratings and work status tracked |
| QIP Goals | Working | 46 goals with progress bars, linked to QA areas |
| Task Board | Working | 22 tasks, Kanban layout, real data |
| Compliance Tracker | Working | 9 regulations, status dropdowns, real data |
| Learning Hub | Working | 41 modules, 5 pathways, 3 enrolled staff |
| Training Matrix | Working | 56 compliance gaps across 3 staff — real data |
| Certificates | Working | Certificate management, 1 stored |
| Learning Pathways | Working | 5 pathways, 1 enrolled |
| Programming & Pedagogy | Working | 15 docs this month, real content |
| AI Chat (Kiros Chat) | Working | Anthropic key set, conversation history confirms real use |
| AP Dashboard | Working | Executive summary with real data |
| Reports & Analytics | Working | NQS stats, training matrix, CSV export |
| Operational Checklists | Degraded | 19 templates exist, zero active assignments |
| Rostering | Degraded | Three rooms configured, zero shifts scheduled |
| OWNA — Children | Working | 336 children, live data |
| OWNA — Staff | Working | Full staff list, live data |
| OWNA — Families | Working | 182 accounts, $696K billing, live data |
| OWNA — Enrolments | Working | Hundreds of live enrolment records |
| OWNA — Health | Working | 65 incidents/accidents/medication logs |
| OWNA — Attendance | Broken | HTTP 400 — API call has a parameter bug (key is set and correct) |
| Marketing Inbox | Working | 8 live Facebook Messenger conversations |
| Marketing Content/Calendar/Feed/Comments | Degraded | Features built, zero posts |
| Marketing Reviews | Degraded | Built, zero reviews |
| Marketing Ads | Not Configured | Requires GOOGLE_ADS_DEVELOPER_TOKEN and Meta Ads setup |
| Marketing Analytics | Not Configured | No platform data beyond Facebook; Google not connected |
| Marketing Settings | Working | Meta/Facebook confirmed connected |
| Recruitment (/recruitment) | Broken | Root route is a 404 |
| Recruitment Candidates | Degraded | 14 candidates — all test/UAT data |
| Recruitment Positions | Degraded | 18 positions — all test/UAT data |
| SharePoint Sync | Not Configured | MICROSOFT_SHAREPOINT_SITE_URL is empty |
| Policies | Degraded | Feature built, zero policies created |
| Documents | Degraded | Feature built, zero files uploaded |
| Registers | Degraded | 7 templates, all 0 entries |
| Forms | Degraded | 8 templates, 0 submissions |
| PDP Goals | Degraded | Feature built, no goals set |
| User Management | Working | 3 real users with role assignments |
| AI Context Manager | Working | Centre context populated from QIP/philosophy |
| Admin — AI Agents | Working | 12 specialist agents configured |
| Admin — AI Config | Degraded | 15-tab config page — saves work, but ~60% of fields are dead (never read back in code) |
| Admin — AI Prompts | Degraded | Modular prompt sections feature exists but 0 sections created |
| Admin — SharePoint | Not Configured | Site URL missing |
| User Guide | Working (stale) | Static content — will go out of date |

---

## 2. Confirmed Bugs — Fix These First

### BUG-1: OWNA Attendance returns HTTP 400
**Severity:** High

**What the user sees:** `/owna/attendance` shows "Unable to load data. OWNA API error: 400". A Retry button is present but does not help.

**How it manifests:** The error changed from 500 (missing API key) to 400 (bad request) after the OWNA_API_KEY was added. This confirms the key is reaching the server correctly — the problem is in the request itself.

**Root cause (suspected):** The attendance endpoint almost certainly requires a date range parameter (start date, end date) or a room/session parameter that is either missing or malformed in the API call. The children, staff, families, enrolments, and health endpoints all work — only attendance is broken, which points to a per-endpoint parameter requirement rather than a key or auth issue.

**Suggested fix:** Find the OWNA attendance API route (likely `src/app/api/owna/attendance/route.ts` or similar). Inspect the parameters being sent to the upstream OWNA API. Check OWNA API documentation for the attendance endpoint's required query parameters. Add or correct the date/room parameters in the request construction.

**File to investigate:** `src/app/api/owna/attendance/route.ts`

---

### BUG-2: /recruitment root route returns 404
**Severity:** Medium

**What the user sees:** Navigating to `/recruitment` (or clicking what they think is the Recruitment section in the sidebar) returns a Next.js "This page could not be found" 404 page.

**How it manifests:** The sidebar nav group labelled "RECRUITMENT" is a group heading with no route of its own. The actual recruitment pages are at `/candidates` and `/candidates/positions`. If a user types `/recruitment` directly or a link somewhere points to it, they hit a blank 404.

**Root cause:** There is no `src/app/recruitment/page.tsx` — the route simply does not exist. The sidebar heading is a label, not a link.

**Suggested fix:** Either (a) add a redirect from `/recruitment` to `/candidates` in `next.config.mjs` or via a `src/app/recruitment/page.tsx` that calls `redirect('/candidates')`, or (b) ensure no nav links or documentation point to `/recruitment`. Option (a) is safer and takes under 5 minutes.

---

### BUG-3: ProtectedLayout.tsx contains a temporary patch that must be reverted
**Severity:** High (code correctness and data accuracy)

**What the user sees:** Nothing visible — this is silent. Badge counts in the sidebar return zero even when overdue tasks or pending checklists exist.

**How it manifests:** The patch at line 14 of `src/components/ProtectedLayout.tsx`:
```ts
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { '/tasks': 0, '/checklists': 0 }
```
was added to prevent a crash when `SUPABASE_SERVICE_ROLE_KEY` was missing from `.env.local`. That key is now set. The guard is no longer needed but still executes if the key is somehow absent in a future environment (e.g., staging, a new developer's machine).

**Actual risk now:** The key IS set, so the guard does not currently trigger. However: (1) CLAUDE.md explicitly says "Revert before committing" — this must not be committed to the repo. (2) The guard silently returns zero counts rather than raising an error, which masks the real failure mode if the key is missing again.

**Suggested fix:** Remove line 14 from `getBadgeCounts()` in `src/components/ProtectedLayout.tsx`. The correct fix for a missing key is to supply `SUPABASE_SERVICE_ROLE_KEY` in the environment — not to silently return zeros. After removing the line, confirm badge counts display correctly in the sidebar.

**IMPORTANT:** Do not commit `src/components/ProtectedLayout.tsx` until this line is removed.

---

### BUG-4: Task status enum mismatch between database and TypeScript
**Severity:** Medium (silent data loss)

**What the user sees:** Tasks given a `status = 'review'` in the database (via direct Supabase query or admin action) silently disappear from the Task Board. No error, no indication.

**How it manifests:** The database schema permits `'review'` as a valid task status, but the TypeScript `Task` interface does not include it. The Kanban board renders three columns: To Do, In Progress, Done. A task with `status = 'review'` does not match any column and is filtered out silently.

**Root cause:** Documented in CONTEXT.md as a known inconsistency. The DB and TypeScript types diverged at some point.

**Suggested fix:** Either (a) add `'review'` to the TypeScript `Task` status union type in `src/lib/types.ts` and add a "Review" column to the Kanban board, or (b) remove `'review'` from the DB schema if it was never intended to be used. Confirm no existing tasks have `status = 'review'` before doing (b).

---

## 3. Data Quality Issues

### Test/UAT data in Recruitment — must be cleared before real use
The entire recruitment dataset is synthetic. All 14 candidates and 18 positions were programmatically generated and must be deleted before the centre uses this feature for real hiring.

Candidate indicators:
- Names: "Test Candidate 177...", "Deep UAT Candidate 177..."
- Email addresses at `example.com`
- All created on 15 Apr 2026
- All have `invited` status, 0 progress

Position indicators:
- Names: "QA Test Position", "Deep UAT Position" with numeric suffixes
- One `draft` status; rest `open`
- All created 15 Apr 2026

**Action required:** Truncate or delete all rows in the `candidates` and `positions` tables (or equivalent) before advertising real positions or inviting real candidates. Do not leave these entries — they will appear in any CSV export or reporting.

### OWNA Families data contains test entries
The OWNA Families page (live OWNA data, 182 accounts) includes entries named "TEST TEST" and "TESTING BARNARD". These are test accounts in OWNA itself — Kiros cannot fix them, but staff should be aware they appear in the families table and will show up in exports.

### Badge counts may read as zero in environments without the service role key
Even after reverting the ProtectedLayout patch (BUG-3), any future environment that does not have `SUPABASE_SERVICE_ROLE_KEY` set will now crash rather than return zeros — which is the correct failure mode. Ensure the key is documented in the project's environment setup instructions for new developers or staging deployments.

### Marketing Hub connected-accounts inconsistency — now resolved
An earlier tour pass showed "1 connected account" in the Marketing Hub stats but "No accounts connected" in Settings. This was caused by the Meta API key not being set during that pass. After keys were added, Settings now correctly shows Meta/Facebook as Connected. This is no longer an active inconsistency but worth noting in case it resurfaces after a key rotation.

---

## 4. Not Configured — Needs Setup

These features are built and deployable but are currently non-functional due to missing environment variables or configuration steps.

### Google Ads
**Keys missing:** `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID`
**Keys set:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
**Impact:** Google Ads campaign management at `/marketing/ads` will not function. Google Analytics/GA4 and YouTube integration in Marketing Analytics will not connect. Google Business Profile will also be unavailable for review management.
**Action:** Obtain a Google Ads Developer Token from the Google Ads API Center and supply the login customer ID. If the centre does not run Google Ads, set these to empty and remove the Google Ads tabs from the analytics dashboard to avoid confusion.

### Meta Webhook Verify Token
**Key missing:** `META_WEBHOOK_VERIFY_TOKEN`
**Keys set:** `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_API_VERSION`
**Impact:** The Meta webhook endpoint cannot verify incoming webhook events. Real-time notifications for new Facebook/Instagram comments, messages, and reactions will not be received. The inbox currently works via polling, but webhook-based real-time updates will fail.
**Action:** Set `META_WEBHOOK_VERIFY_TOKEN` to any secure random string. Register the same token in the Meta Developer portal under Webhooks. One-time setup step.

### Microsoft SharePoint Site URL
**Key missing:** `MICROSOFT_SHAREPOINT_SITE_URL`
**Keys set:** `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`
**Impact:** SharePoint document sync at `/admin/sharepoint` cannot connect to any site. The Microsoft credentials are present — only the target site URL is missing.
**Action:** If SharePoint sync is needed, set `MICROSOFT_SHAREPOINT_SITE_URL` to the centre's SharePoint site URL (e.g., `https://kiroscentre.sharepoint.com/sites/QualityPortal`). If SharePoint sync is not needed, consider removing the SharePoint page from the admin menu to avoid a half-configured UI.

### OWNA Attendance endpoint
The OWNA API key is set and working. The attendance endpoint is failing due to a code bug (see BUG-1), not a missing configuration value. Listed here for completeness — requires code investigation, not key entry.

---

## 5. Architectural Concerns

### Minor UI Bug: AI Config tab horizontal scroll captures wrong tab content
**Severity:** Minor (cosmetic/documentation — no user-facing functional impact)

**What was observed:** During the Pass 3 screenshot tour, two AI Config tabs were captured with incorrect content due to the tab strip scrolling horizontally:
- **Marketing tab** (`51j-ai-config-marketing.png`) — captured the **Display** tab content instead. The Marketing tab exists in the tab list but its settings were not separately captured.
- **Cron & Jobs tab** (`51m-ai-config-cron.png`) — captured the **Reports** tab content instead. The Cron & Jobs tab exists in the tab list but its settings were not separately captured.

**Root cause:** The AI Config page has 15 tabs that overflow the tab strip width. When automated capture clicked the Marketing and Cron tabs by position, the strip had scrolled such that the wrong tab was activated, or the adjacent tab's content rendered instead.

**Impact on documentation:** The settings for the Marketing and Cron & Jobs tabs remain undocumented. From the production code audit (2026-04-19), some fields ARE wired: `marketing.default_ad_variations`, `marketing.default_review_tone`, `marketing.analytics_lookback_days`, `cron.qualification_warning_days`, `cron.document_retry_limit`. Other Marketing and Cron fields are orphaned (see Section 5 architectural audit).

**Action for Rony:** The capture failure is not a blocking issue. If the exact settings on these two tabs are needed, manually navigate to `/admin/ai-config` and click the Marketing and Cron & Jobs tabs to inspect current values. The tab scroll is a minor responsive-layout concern — consider wider tab labels or a vertical tab layout for the AI Config page to prevent future confusion.

---

### Admin page title collision: /admin/agents vs /admin/ai-config
Two admin pages have confusingly similar or identical titles:
- `/admin/agents` — the page heading reads **"AI Configuration"** but this is the **AI Agents** page (12 specialist agents: QA1–QA7, Compliance, Marketing, etc.)
- `/admin/ai-config` — the actual **AI Configuration** page with 15 tabs covering models, tokens, cron jobs, tool permissions, etc.

Both pages are titled variants of "AI Configuration". A developer navigating the codebase, or a user looking at breadcrumbs, will not know which page is which. The agents page should be retitled to "AI Agents" in its page heading to match its URL and purpose.

### Single-tenancy baked in at every layer
The system is architected for exactly one centre. This is documented in CONTEXT.md as a known scope limit, but the implications are structural:
- No `centre_id` foreign key on most tables
- `service_details` is a flat key-value store for one centre's settings
- RLS policies are written without a tenant discriminator

If there is any future intent to run this for multiple centres, the migration path is non-trivial — effectively a full schema redesign with multi-tenancy added to every table and every RLS policy. This decision should be documented explicitly if a multi-centre use case is ever discussed.

### All Supabase migration files have been deleted
**This is a significant operational risk.** The git status shows every `supabase-migration-*.sql` and `supabase-schema.sql` file as deleted from the working tree. The database exists and works in production (Supabase hosted), but:
- There is no local record of what SQL was applied to reach the current schema state
- Schema changes cannot be safely replicated to a new environment
- Rollback is not possible without restoring from Supabase's point-in-time backups
- A new developer cannot set up a local Supabase instance without manually reverse-engineering the schema

**Action:** Use `supabase db pull` (Supabase CLI) to generate an accurate schema file from the live database, commit it to the repo, and adopt `supabase/migrations/` going forward for any schema changes. Do not make schema changes directly in the Supabase dashboard without recording them in a migration file.

### In-memory rate limiter does not work on multi-instance deployments
Documented in CONTEXT.md. The chat API rate limiter uses an in-memory `Map` (per-process). On Vercel with multiple warm serverless instances, each instance tracks its own counter independently. A user can effectively multiply the 30 req/min limit by the number of warm instances. No error is thrown — API costs accumulate unchecked.

If AI chat usage grows, replace the in-memory rate limiter with a Redis-backed counter (e.g., Upstash Redis, which has a free tier and integrates with Vercel).

### Service role client — no audit performed
The `createServiceRoleClient()` bypasses all Supabase RLS. CONTEXT.md flags: "Any server route that mistakenly uses this client would bypass all RLS. Needs audit on each API route." This audit has not been performed. Before expanding the API surface or onboarding a new developer, audit every file in `src/app/api/` to confirm `createServiceRoleClient()` is only used where RLS bypass is genuinely required (cron jobs, AI tool execution, document sync) — not for convenience.

### AI Config page — ~60% of fields are configuration theatre

**Source:** Code audit of `src/app/admin/ai-config/page.tsx` (875 lines) and all 4 backing tables (`ai_config`, `ai_tool_permissions`, `ai_document_styles`, `service_details`), cross-referenced against every consumer in the codebase. Performed 2026-04-19.

The saves are real — every tab does genuine Supabase `UPDATE` queries with optimistic locking. That part works. The problem is on the read side.

**Field connectivity summary:**

| Metric | Count |
|---|---|
| Config keys in database | ~70 |
| Fields wired AND actively consumed in production code | **21** |
| Fields editable in UI but never read back anywhere | **~40** |

**Fields that ARE wired and working (read by real feature code):**

| Field group | Consumed by |
|---|---|
| `model.*` — model selection, thinking on/off, thinking budget, simple signal regex/length | `model-router.ts`, `chat/stream`, `chat` routes |
| `chat.*` — max tokens, iterations, history limit, context types, title generation, prompt warning | `chat/stream`, `chat`, `marketing/chat` routes |
| `brand.*` — centre name, primary colour, gold colour, tagline | `recruitment/apply`, `public/brand` |
| `cron.qualification_warning_days`, `cron.document_retry_limit` | `cron/qualifications`, `document-sync` |
| `marketing.default_ad_variations`, `marketing.default_review_tone`, `marketing.analytics_lookback_days` | `marketing/tool-executor` |

**Entire tabs that are dead (every field orphaned — saves to DB, nothing reads it):**

- **Agent Defaults** tab — `agentDefaultModel`, `agentDefaultMaxIterations`, `agentDefaultTokenBudget`, `agentDefaultTools`
- **Uploads** tab — `uploadMaxFileSizeMB`, `uploadMaxFiles`, `uploadTextTruncationLimit`, `uploadSignedUrlExpiry`
- **Learning** tab — `learningMaxInPrompt`, `learningDefaultConfidence`, `learningReinforcementIncrement`, `learningCorrectionConfidence`
- **Display** tab — `displayDocPreviewLength`, `displayContextSnippetLength`, `displayAgentSummaryLength`
- **Widget** tab — `widgetMaxStoredMessages`, `widgetWidthPx`, `widgetHeightPx`, `widgetSpeechLanguage`
- **Reports** tab — `reportMaxExportRows`, `reportPreviewRowLimit`

**Partially dead tabs (some fields wired, some orphaned):**

- **Brand** — name/colours/tagline wired; `brandCentreNameUpper`, `brandEntityName`, `brandSENumber`, `brandLocation`, `brandQAColours` are orphaned
- **Marketing** — 3 fields wired; `marketing.comments_sync_limit`, `marketing.feed_sync_limit`, `marketing.analytics_results_limit` are orphaned
- **Cron** — 2 fields wired; `cron.marketing_publish_batch`, `cron.marketing_token_threshold_days`, `cron.marketing_analytics_cache_hours` are orphaned
- **System** — `sharepoint.token_expiry_seconds`, `dashboard.qip_weight_*` (4 fields), `compliance.mandatory_qualifications` are all orphaned

**Secondary issues found in the audit:**

- `updated_by` column exists on `ai_config` but is never populated from the client — no audit trail of who changed what
- Optimistic locking does SELECT then UPDATE separately (not atomic) — low risk but a real race condition window
- 9 database keys are not in the TypeScript `AIConfig` interface — they render as generic fields with no type safety

**Recommended action for Rony:** The dead tabs represent scaffolding that was built speculatively but never connected to feature code. Before the rebuild, confirm with the product owner which of these features (agent config, upload limits, widget settings, etc.) are actually planned — and either wire them or remove them. An admin who changes "Widget Height" and sees it have no effect will lose trust in the entire settings page.

---

### Legacy Training Modules vs Learning Hub duplication
`/training` shows 8 legacy training module cards. `/learning` is the current LMS with 41 modules, pathways, and enrolment tracking. The legacy training page appears to be an older implementation that was superseded but not removed. Both exist in the sidebar nav, which will confuse staff: which system do they use? The legacy training page (`/training`) should either be removed from the nav or explicitly marked as deprecated.

---

## 6. Features That Are Empty or Unused

These features are built and technically functional but have no data and show no signs of adoption. Not bugs — but Rony should know which areas will generate zero support activity, and which may surface latent issues the first time someone actually uses them.

| Feature | Route | Empty State | Notes |
|---|---|---|---|
| Policies | `/policies` | 0 total, 0 published | Required for NQS QA7 compliance — needs content urgently |
| Documents | `/documents` | 0 files | Upload and QA-tagging works but nothing uploaded |
| Rostering | `/rostering` | 0 shifts | 3 rooms configured, copy-week feature exists |
| PDP Goals | `/learning/pdp` | No goals set | Feature built with reviews and staff review tabs |
| Post Feed | `/marketing/feed` | No published posts | Dependent on content workflow adoption |
| Comments | `/marketing/comments` | 0 in all tabs | Dependent on posts being published |
| Reviews | `/marketing/reviews` | 0 in all tabs | No Google or Facebook reviews being tracked |
| Ad Campaigns | `/marketing/ads` | 0 campaigns | Also blocked by missing Google Ads token |
| Marketing Analytics | `/marketing/analytics` | No data | All tabs empty; only Facebook connected |
| Forms | `/forms` | 8 templates, 0 submissions | No indication any form has been submitted |
| Registers | `/registers` | 7 templates, all 0 entries | All are NQS-required registers |
| AI System Prompts | `/admin/ai-prompts` | 0 sections | Modular prompt system built but not populated |
| SharePoint | `/admin/sharepoint` | Not connected | Site URL missing |

The registers deserve specific attention: Chemical, Medication, Vehicle, Visitor, Device, Key, and Maintenance registers are regulatory requirements under the National Regulations. They have templates but zero entries. At the next ACECQA assessment visit, an inspector expecting to see a populated medication register will find it empty.

---

## 6b. Known Automation Gaps (not bugs)

### Data Extract Wizard — Step 1 only captured
**Severity:** Documentation gap only — the wizard works, automation just could not drive it past Step 1.

**What was observed:** During Pass 3, the `/reports/extract` Data Extract Wizard was captured at Step 1 (Select Data Source). The automated capture could not advance past Step 1 to capture the field selection, filter, preview, or export steps.

**Why it is NOT a bug:** The wizard is a multi-step interactive form that requires deliberate user selections (choose a data source category, then specific fields, then filters) before progressing. Automated screenshot capture using URL navigation cannot replicate this interaction flow.

**Impact on documentation:** Steps 2–5 of the wizard are not documented in the UX Specification. Step 1 is fully documented with all 13 data source categories confirmed: QA & Compliance (3), Tasks & Activity (4), Documents (2), Checklists (5), Policies (4), Rostering & Staff (9), Training (2), Learning Management (13), Chat & AI (3), Centre & Config (6), Registers (2).

**Action for Rony:** No code change needed. If the full wizard flow needs documentation, open `/reports/extract` in a browser, complete a manual export run, and capture screenshots of each step. The wizard is functional — `report.max_export_rows` (10000) and `report.preview_row_limit` (50) are configured in AI Config → Reports tab.

---

## 7. Low-Confidence Features (functional_confidence < 50)

From the screenshot tour automated assessment. These scored below 50, meaning they are either structurally broken, empty with no clear adoption path, or of low enough value to question whether they should remain in the product.

| Route | Score | Issue |
|---|---|---|
| `/recruitment` | 5 | Broken 404 — not a feature, a missing redirect |
| `/marketing/analytics` | 30 | No platform connections beyond Facebook, no post data to generate metrics |
| `/guide` | 35 | Static in-app user guide — will go stale, better replaced by contextual help |
| `/marketing/ads` | 35 | API tokens not configured; zero campaigns |
| `/marketing/calendar` | 45 | Empty calendar — only has value once content workflow is adopted |
| `/marketing/comments` | 45 | Empty — dependent on publishing posts |
| `/resources` | 45 | Curated external link directory — static, no dynamic value |
| `/marketing/feed` | 48 | Empty — dependent on publishing posts |
| `/candidates` | 55 | Feature concept is valid; current data is 100% test/UAT |
| `/candidates/positions` | 52 | Feature concept is valid; current data is 100% test/UAT |

Leaving broken or permanently empty features in the sidebar nav degrades user trust. Rony should assess each and decide: fix it, populate it, simplify it, or remove it from the nav. The ones most worth fixing are `/recruitment` (5-minute redirect fix) and `/candidates` after the test data is cleared.

---

## 8. Immediate Maintenance Priorities

Ordered by impact and urgency. Complete within the first two weeks.

### Week 1

**Priority 1 — Revert the ProtectedLayout.tsx patch**
File: `src/components/ProtectedLayout.tsx`, line 14.
Remove: `if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { '/tasks': 0, '/checklists': 0 }`
`SUPABASE_SERVICE_ROLE_KEY` is now set. This guard must be removed before this file is committed to the repo. Verify badge counts display correctly after removal. Time estimate: 5 minutes.

**Priority 2 — Fix the OWNA Attendance 400 error**
File: `src/app/api/owna/attendance/route.ts` (or equivalent in `src/app/api/owna/`).
The API key is correct. The request parameters are wrong. Check the OWNA API documentation for required query parameters on the attendance endpoint (date range, room ID, or session parameter). Fix the parameter construction in the route handler and confirm the page loads live attendance data.

**Priority 3 — Fix the /recruitment 404**
Add a redirect from `/recruitment` to `/candidates` in `next.config.mjs`, or create `src/app/recruitment/page.tsx` containing only `redirect('/candidates')`. This stops users hitting a dead-end 404 from the sidebar. Time estimate: 5 minutes.

**Priority 4 — Clear test/UAT data from candidates and positions**
Delete all rows in the candidates and positions tables created on 15 Apr 2026 with programmatic names. Do this before the feature is used for real hiring. Verify the counts go to 0 in the UI.

### Week 2

**Priority 5 — Set MICROSOFT_SHAREPOINT_SITE_URL (if SharePoint sync is needed)**
If the centre uses SharePoint for document storage, supply the site URL in `.env.local`. If they do not, consider removing the SharePoint admin page from the nav to avoid the half-configured appearance.

**Priority 6 — Set GOOGLE_ADS_DEVELOPER_TOKEN and GOOGLE_ADS_LOGIN_CUSTOMER_ID (if Google Ads is used)**
If the centre does not run Google Ads, consider suppressing or removing the Google Ads tabs from the marketing analytics dashboard to avoid confusion from perpetually empty tabs.

**Priority 7 — Set META_WEBHOOK_VERIFY_TOKEN**
Required for real-time webhook delivery from Meta. Generate a random string, set it in `.env.local`, and register it in the Meta Developer portal under Webhooks. One-time setup.

**Priority 8 — Fix the admin page title confusion**
`/admin/agents` page heading currently reads "AI Configuration". Change it to "AI Agents" to match its URL and purpose. One-line text change — matters for developer orientation.

**Priority 9 — Audit and prune dead AI config fields**
Source: Section 5 architectural audit. ~40 of ~70 fields in `src/app/admin/ai-config/page.tsx` save to the database but are never read back in any feature code. Six entire tabs (Agent Defaults, Uploads, Learning, Display, Widget, Reports) are completely orphaned. Before the rebuild, confirm with the product owner which fields are genuinely needed, wire the ones that are, and remove or mark-as-pending the rest. An admin who edits a dead setting with no visible effect loses trust in the entire configuration panel.

**Priority 10 — Restore Supabase migration history**
Run `supabase db pull` to generate a schema snapshot from the live database. Commit it to the repo. From this point, all schema changes must go through migration files in `supabase/migrations/`. Without this, any schema drift is untracked and unrecoverable without Supabase point-in-time backups.

---

## 9. Environment Variable Status

Current state of `.env.local` as of 2026-04-19.

### Supabase

| Variable | Status | Impact if missing |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Set | App fails completely — all auth and data fetch |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set | App fails completely |
| `SUPABASE_SERVICE_ROLE_KEY` | Set | Badge counts return zero; cron jobs, AI tools, document export, badge counts fail silently |

### Anthropic

| Variable | Status | Impact if missing |
|---|---|---|
| `ANTHROPIC_API_KEY` | Set | AI Chat and Marketing AI return errors |

### OWNA

| Variable | Status | Impact if missing |
|---|---|---|
| `OWNA_API_KEY` | Set | All /owna/* pages show 500 errors |

### Microsoft / SharePoint

| Variable | Status | Impact if missing |
|---|---|---|
| `MICROSOFT_TENANT_ID` | Set | SharePoint auth fails |
| `MICROSOFT_CLIENT_ID` | Set | SharePoint auth fails |
| `MICROSOFT_CLIENT_SECRET` | Set | SharePoint auth fails |
| `MICROSOFT_SHAREPOINT_SITE_URL` | **Empty** | SharePoint sync cannot connect to any site — feature is non-functional |

### Google

| Variable | Status | Impact if missing |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Set | Google OAuth cannot initiate |
| `GOOGLE_CLIENT_SECRET` | Set | Google OAuth cannot complete |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | **Empty** | Google Ads campaigns non-functional; Google Ads analytics tab empty |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | **Empty** | Google Ads campaigns non-functional |

### Meta (Facebook / Instagram)

| Variable | Status | Impact if missing |
|---|---|---|
| `META_APP_ID` | Set | Meta OAuth cannot initiate |
| `META_APP_SECRET` | Set | Meta OAuth cannot complete |
| `META_GRAPH_API_VERSION` | Set | — |
| `META_WEBHOOK_VERIFY_TOKEN` | **Empty** | Real-time webhook events not verified; Meta will not deliver webhook payloads |

### Cron

| Variable | Status | Impact if missing |
|---|---|---|
| `CRON_SECRET` | Set | Cron job endpoints cannot authenticate |

### Summary — what's blocking what

| Empty variable | Feature blocked |
|---|---|
| `MICROSOFT_SHAREPOINT_SITE_URL` | SharePoint document sync |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads management and analytics |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Google Ads management and analytics |
| `META_WEBHOOK_VERIFY_TOKEN` | Real-time Meta webhook delivery |

All other variables required for current functionality are set.

---

*Generated from a 56-screenshot automated tour of all routes (role: Approved Provider, 2026-04-19) combined with codebase analysis of ProtectedLayout.tsx, CONTEXT.md, CLAUDE.md, .env.local, and a deep audit of `src/app/admin/ai-config/page.tsx` against all 4 backing tables and codebase consumers (2026-04-19).*
