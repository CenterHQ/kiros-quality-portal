# Kiros Quality Portal — Discovery Findings

**Date:** 2026-04-19  
**Purpose:** Synthesised findings for the rebuild. All source documents are co-located in `docs/archive/`.  
**Scope:** All root-level docs, migrations, test plans, and API/chat source were read in full.

---

## 1. Original Intent

The Kiros Quality Uplift Portal was conceived as a Next.js 14 + Supabase web application for **Kiro's Early Education Centre (Blackett, NSW)** to manage NQS (National Quality Standard) compliance. The core mission: track progress against the 40 NQS elements across 7 Quality Areas, with AI-assisted guidance.

That core was sound. Over a short build period it expanded dramatically:

| Module | Description |
|---|---|
| NQS Elements | 40 elements across QA 1-7, status tracking, linked tasks/policies |
| Tasks | Kanban board with 4 statuses (todo, in_progress, review, done) |
| Policies | Full CRUD, version history, acknowledgements, review schedule |
| Checklists | Templates + instances, items as JSONB, category filter |
| Compliance Items | Regulatory compliance separate from NQS |
| Registers | Daily registers with dynamic column definitions (JSONB) |
| Forms | Digital form submissions (weekly reflections, meeting minutes, etc.) |
| Rostering | Shift scheduling, room ratio tracking, staff qualifications |
| LMS | Full learning management: modules, sections, pathways, PDP, matrix, certificates |
| Recruitment | Positions, candidate pipeline, AI-powered DISC scoring, onboarding |
| Programming | Educational Leadership hub, quick-action doc generation |
| Marketing | Meta/Facebook + Google Ads, content calendar, review management, Marketing AI |
| OWNA Integration | Read-only sync from external childcare management system |
| AI Chat | Multi-agent AI with 12 specialist agents, tool use, confirmation flow |
| AI Learnings | Feedback loop saves corrections as learnings, injected into future prompts |
| Activity Log | Audit trail with real-time Supabase subscription |
| Documents | Internal uploads + SharePoint-synced documents |
| AP Dashboard | Multi-centre view (admin only) |

The AI chat is the centrepiece. Everything else is the data the AI reads and acts on.

---

## 2. Feature Build Sequence (Migration Order)

This is the order features were bolted on, readable from the SQL file names:

1. **Base schema** — profiles, qa_elements, tasks, comments, documents, training_modules, training_assignments, compliance_items, activity_log, form_submissions, resources
2. **Tags + element actions + policy acks** (v2)
3. **Policies** — versions, acknowledgements, categories, review schedule
4. **Checklists** — templates + instances + ticket system
5. **Registers** — custom column definitions via JSONB
6. **Rostering** — rooms, qualifications, shifts, programming_time, ratio_rules
7. **AI Chat** — chat_conversations, chat_messages, ai_suggestions (suggestions table later abandoned in favour of pending_actions)
8. **AI Documents** — ai_generated_documents with SharePoint sync queuing
9. **AI Prompts** — admin-editable prompt sections in DB
10. **AI Learnings** — corrections/learnings table
11. **AI Config** — centralised ai_config key-value store, ai_tool_permissions, ai_document_styles
12. **Agent Enhancements** — temperature, token_budget, priority, domain_tags, routing_keywords columns added to ai_agent_definitions
13. **SharePoint** — OAuth flow, sharepoint_documents sync
14. **Marketing** — 7+ marketing tables (content, campaigns, social accounts, reviews, ads, analytics)
15. **Marketing Inbox** — threaded messaging
16. **Marketing Storage** — media bucket
17. **LMS** — modules, sections, quiz questions, enrollments, section progress, quiz responses, pathways, PDP goals, certificates, competencies
18. **Recruitment** — positions, candidates, question templates (60 seeded), staff DISC profiles
19. **New Agents** — Recruitment Agent, Educational Leadership Agent, Learning Module Agent
20. **Agent Tool Updates** — per-agent tool assignment corrections
21. **Remove Review Status** — attempted to remove 'review' from task status enum (CONTRADICTS later fix)
22. **Centre Context Index** — centre_context records for AI knowledge base
23. **Page Permissions** — `allowed_pages` column on profiles for granular access restriction

**What the sequence tells you:** The core NQS quality management was designed. Everything else (LMS, recruitment, marketing, programming) was additive. Marketing and LMS in particular are full products that rival the core offering in complexity.

---

## 3. Role Model

| Role | Code | Who | Access |
|---|---|---|---|
| Approved Provider | `admin` | Centre owner | Everything including AP dashboard and full admin panel |
| Operations Manager | `manager` | Centre manager | Near-admin, no AP dashboard |
| Nominated Supervisor | `ns` | Lead educator/supervisor | Quality management, recruitment, no admin panel |
| Educational Leader | `el` | EL role | Programming, learning, limited management |
| Educator | `educator` | Floor staff | Tasks, checklists, own learning, programming |

The `allowed_pages` column on `profiles` is a restriction list: `NULL` means all pages allowed, a non-null array restricts to only those paths. Admins bypass this entirely.

---

## 4. Known Defects and Quality Problems

### 4.1 Critical Security (Found in Audit, Status: Allegedly Fixed)

| # | Issue | Status |
|---|---|---|
| S1 | OWNA API key hardcoded in source code | Fixed → moved to env var |
| S2 | 5 API routes missing authentication (sharepoint/sync, sharepoint/process, sharepoint/files, documents/export, sharepoint/auth debug) | Fixed |
| S3 | Debug endpoint exposed env var hints | Fixed |
| S4 | SharePoint admin page allowed manager access (should be admin-only) | Fixed |
| D1 | Chat messages accessible without ownership check (any user could read any other's chat by guessing conversation ID) | Fixed |
| D2 | Table name injection in confirm handler — item_type from AI input used to construct SQL table name | Fixed via whitelist map |

### 4.2 Data Integrity (Found, Allegedly Fixed)

| # | Issue |
|---|---|
| D4 | Final AI response save had no error handling — lost response if INSERT failed |
| D5 | User message insert had no error checking — conversation continued with message absent from DB |
| D6 | Tool result DB insert not in try-catch — one failure killed all parallel tool executions |
| D7 | reconstructMessages used empty string `''` as tool_use_id fallback — Anthropic API rejects empty ID |
| Column mismatches | 8 tool queries used wrong column names (shift_date vs date, failed_items vs failed_items_count, etc.) |

### 4.3 Currently Unresolved (No Code Key Missing)

| Issue | Impact |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` not set | Badge counts patched to return 0; other service-role features (AI tools that bypass RLS, onboarding user creation) non-functional |
| `ANTHROPIC_API_KEY` not set | AI chat fails at message send — no AI features work |
| `OWNA_API_KEY` not set | All OWNA pages return 500 |
| Rate limiter in-memory | Resets on Vercel cold start, fails across concurrent serverless instances |
| 18 LMS/SharePoint tables have `USING(true)` RLS | Any authenticated user can read/write everything in these tables |

### 4.4 Architectural Problems

- **Rate limiting**: In-process Map, not Redis. `rateLimitMap` never cleaned up expired entries (memory leak over time). Pointless in serverless.
- **Supabase client proliferation**: Multiple client instances per page. Should use shared React Context.
- **SharePoint OAuth token in DB**: Access token stored plaintext in `sharepoint_credentials` table.
- **Marketing social account tokens**: `access_token` and `refresh_token` stored plaintext in `marketing_social_accounts`.
- **SharePoint URL hardcoded**: `https://kirosgroup.sharepoint.com/sites/operations` in callback route.
- **SharePoint PDF extraction broken from inception**: sync route was doing UTF-8 conversion of binary PDF buffer, not parsing. Worked in upload route (used pdf-parse) but broken in sync route.
- **Excel extraction**: `exceljs` was in package.json but never used. Sync route returned `[Spreadsheet content - manual review recommended]` placeholder.

### 4.5 UX Problems (Mix of Fixed and Unfixed)

| # | Problem |
|---|---|
| U1 | Missing empty states: elements (filtered=0), registers (none exist), checklists/templates, documents, learning/library |
| U2 | Missing loading states on elements and policies — layout jumps when data arrives |
| U3 | Forms used `alert()` for validation (registers, checklists) — should be toast |
| U4 | Buttons didn't disable during async operations |
| U5 | Inconsistent loading indicators (some "Loading...", some spinner, some nothing) |
| U6 | Activity page real-time can show duplicate entries (needs dedup on INSERT event) |
| U7 | Chat subscription only listened for INSERT not UPDATE |
| U8 | No per-user conversation search |
| U9 | Session expiry has no client-side detection |

### 4.6 AI System Problems (Mix of Fixed and Known Limitations)

| Issue | Status |
|---|---|
| Default model was Sonnet (not Opus) for all non-trivial queries | Fixed — default is now Opus |
| Extended thinking was disabled (comment said incompatible with tool use — incorrect) | Fixed — enabled with budget_tokens: 10000 |
| Temperature hardcoded at 0.7 in admin test endpoint — broke admin agent testing (400 error from API) | Fixed |
| Temperature default 0.7 in agent definitions — invalid for current models | Fixed — set to null |
| Tool result history excluded from conversation reconstruction — follow-up questions re-queried same data | Fixed via reconstructMessagesWithTools() |
| Learning expiry filter was a comment with no code — expired learnings still loaded into prompts | Fixed |
| Adaptive thinking type caused 400 in production — required immediate hotfix | Fixed |
| run_deep_analysis accepted user-controlled tool list — prompt injection to call write tools as admin | Fixed via allowlist |
| Agent role bypass — orchestrator passed 'admin' as role for all agent tool execution | Fixed |
| Agent migration UPSERT overwrites manual tool assignments on re-run | Documented (process issue) |
| Token tracking captures last API iteration only — underreports multi-iteration usage | Known limitation |
| Thinking block index mapping in SSE is fragile | Known limitation (works but documented) |
| Title generation adds 1-2s latency after each response | Known limitation (fire-and-forget) |

---

## 5. What Was Attempted and Whether It Worked

### Round 1: Initial Code Review (2026-04-10)
**Three review passes (REVIEW-2026-04-10.md, v2, v3-FINAL.md)**  
- 23 fixes across 3 rounds
- Round 1: 13 fixes — column mismatches, action type mismatch, error handling, role validation, TypeScript types
- Round 2: 6 fixes — LMS column names, frontend action type, stuck UI, fallback route
- Round 3: 4 fixes — task board 'review' column missing, voice cleanup, SSE parser, LEARNING-LOG correction
- TypeScript: zero errors after all rounds. Build: clean.
- **Result: Worked.** All critical code bugs found by static review were fixed.

### Round 2: AI Uplift (KIROS-AI-UPLIFT-FINAL.md, 2026-04-13 to 2026-04-14)
**68-item AI improvement plan across 10 phases**  
- Model routing (Opus default), extended thinking, temperature fix
- New detail tools (get_policy_detail, get_checklist_detail, read_document_content)
- Agent tool assignments, agent security
- Learning system (expiry filter, last_used_at, applies_to_roles)
- Tool result conversation history reconstruction
- SharePoint PDF/Excel extraction fixes
- Admin pages (ai-learnings, ai-analytics, agent metrics, prompt preview)
- UI fixes (agent summaries, pending actions from DB, retry button, partial response preservation)
- Rate limiting (per-IP, 30/min)
- **One critical defect found in verification**: `adaptive` thinking type caused 400 in production. Fixed immediately.
- **Result: Worked in code, untested against live APIs.** All 68 items were verified in code. No live AI testing possible without API keys.

### Round 3: Zero-Tolerance AI Audit (KIROS-AI-DEFECTS-ROUND2.md, 2026-04-14)
**43 defects found, 25 fixed (CRITICAL, HIGH, MEDIUM)**  
- 3 CRITICAL security fixes (D1 conversation ownership, D2 SQL injection, D3 feedback crash)
- 5 HIGH data loss fixes
- 9 MEDIUM fixes
- 8 LOW fixes  
- **Result: Worked.** All 25 non-low defects fixed. 18 LOW deferred.

### What Didn't Work / Remain Broken

1. **Adaptive thinking type** — deployed to production, got 400 error, required immediate rollback and re-fix. Root cause: documentation said it was supported, model rejected it. Should have tested API call, not just SDK types.
2. **SharePoint PDF extraction** — broken from inception. Deployed in a non-functional state. The fix (using pdf-parse) was correct but the original implementation went through multiple stages without anyone testing against a real PDF.
3. **Excel extraction** — placeholder string returned for all Excel files. `exceljs` was in package.json but never wired up for sync extraction.
4. **Pending upload retry** — documents stuck in `pending_upload` with no `sharepoint_item_ids` were never retried by cron. Cron only handled partially-synced docs. Design gap not caught in initial implementation.
5. **Qualification expiry automation** — no cron job updated `staff_qualifications.status` based on `expiry_date`. Expiry tracking existed in the schema but no automation behind it.
6. **export_document tool** — implemented as a stub that returns guidance text. Never actually exports a document.
7. **Marketing AI chat generate_document** — marketing chat doesn't include `generate_document` in agent tools. Marketing-specific document generation never implemented (documented as "by design").

---

## 6. Workflow Gaps

Features described in documentation but not functional without external keys/credentials:

| Feature | Blocker | Status |
|---|---|---|
| All AI chat responses | ANTHROPIC_API_KEY | Not set |
| All OWNA pages (31+ screens) | OWNA_API_KEY | Not set |
| Onboarding (creates auth users) | SUPABASE_SERVICE_ROLE_KEY | Not set |
| SharePoint sync | SharePoint OAuth credentials | Not configured |
| Marketing ad campaigns | Meta Ads / Google Ads API | Not configured |
| Marketing social accounts | Platform OAuth | Not configured |
| Certificate PDF generation | Service role key | Not set |
| AI agent testing in admin | ANTHROPIC_API_KEY | Not set |

Features with design gaps (code exists, workflow incomplete):

| Feature | Gap |
|---|---|
| Recruitment questionnaire | Requires seeded candidate token (TEST_CANDIDATE_TOKEN) for any meaningful testing |
| AP Dashboard | Only one centre exists; multi-centre logic untested |
| Policy review reminders | "Send Reminder" button triggers toast but no actual email integration |
| Document DOCX export | Loses bold/italic formatting (markdown-to-docx conversion is lossy) |
| Document PDF generation | Can timeout on large documents, no fallback |
| LMS certificate expiry | Schema has `expiry_date`, no automation checks it |
| Staff qualification expiry | Schema has `expiry_date`, cron now checks it (added in uplift) but untested |
| Chat conversation search | No search — users must scroll |

Features in nav/sidebar with unknown implementation status:
- `/guide` — User Guide (content unknown)
- `/resources` — Resource Hub (content unknown)  
- `/hub` — Centre Hub (landing, content unknown)
- `/reports` and `/reports/extract` — report templates migration exists but functionality unclear

---

## 7. Data Model — What's Good and What's Problematic

### Clean Core (keep)
- `profiles` → extends `auth.users` cleanly, `allowed_pages` restriction is a good pattern
- `qa_elements` → 40 NQS elements, rich status/rating fields
- `tasks` → Kanban with qa_element foreign key
- `compliance_items` → separate from NQS (correct — regulatory compliance ≠ NQS rating)
- `policies` → version tracking, acknowledgements, review schedule — well designed
- `checklist_templates` + `checklist_instances` + items JSONB — functional
- `chat_conversations` + `chat_messages` with role types including tool_call/tool_result — correct design
- `ai_agent_definitions` with available_tools array — good architecture

### Problematic (reconsider in rebuild)
- **Two training systems**: `training_modules` + `training_assignments` (legacy, simple) alongside `lms_modules` / `lms_enrollments` (new, full LMS). They are separate and unconnected. Choose one.
- **register_definitions with JSONB columns**: Dynamic column definitions are flexible but hard to query, validate, or report on. Structure the common register types explicitly.
- **form_submissions with JSONB data**: Highly generic. `form_type` enum + `data jsonb` means no schema validation per form type.
- **ai_suggestions table**: Created in the AI chat migration but abandoned in practice. The confirmation flow uses `pending_actions` in SSE events, not this table. The table likely has zero rows in production.
- **marketing_social_accounts storing plaintext OAuth tokens**: Must encrypt at rest.
- **sharepoint_credentials** storing plaintext app secrets: Same issue.
- **agent temperature column**: Now invalid (deprecated for current Claude models). Causes confusion. Remove.
- **centre_context**: Good concept (100 records of QIP goals, philosophy, procedures), but currently loads ALL 100 records into every system prompt (~25K tokens). Filtering by relevance was added in uplift but is still a blunt instrument.

---

## 8. What Should NOT Be Carried Forward

1. **In-memory rate limiting** — use Redis/Upstash from day one. In-memory Map is useless in serverless.

2. **Training modules duplication** — one system only. The legacy `training_modules` / `training_assignments` tables pre-date the LMS and do different things. Consolidate.

3. **Hardcoded credentials anywhere in source** — the OWNA API key was hardcoded in two source files. Never again.

4. **Temperature in agent definitions** — it's deprecated for current models, causes 400 errors, and adds confusion. Remove from the rebuild's agent schema.

5. **`USING(true)` RLS** — design role-based RLS properly upfront for every table, not as a later retrofit.

6. **Plaintext OAuth/API token storage** — marketing_social_accounts, sharepoint_credentials store tokens in plaintext DB columns. Use Supabase Vault or equivalent.

7. **The `supabase-migration-remove-review-status.sql`** — this migration tried to remove the 'review' status from tasks. It directly contradicts the TypeScript fix that added it. The 'review' status is valid and intentional. Don't remove it.

8. **`ai_suggestions` table** — this was designed but abandoned. The confirmation flow via pending_actions is better. Don't carry the ai_suggestions pattern forward.

9. **alert() for validation** — zero tolerance. All validation feedback must be toast notifications.

10. **Multiple Anthropic/Supabase client instances per page** — use shared factory/context patterns from the start.

11. **export_document stub tool** — if document export is a feature, implement it. Don't ship a stub that pretends to work.

12. **SharePoint PDF extraction via UTF-8 string conversion** — the correct approach (pdf-parse) is known. Use it from day one.

13. **Excel extraction placeholder** — if Excel sync is a feature, wire up exceljs. Don't ship a placeholder.

14. **Inline-only register data model** — JSONB dynamic columns are hard to query, validate, report on, and make type-safe. Design register types explicitly in the rebuild.

15. **Form type as string enum + JSONB data** — if forms need structure, each form type should have its own schema. Generic JSONB is only defensible if form types are truly open-ended.

---

## 9. Architecture Patterns Worth Keeping

These are well-designed in the current system and should carry forward:

1. **SSE streaming for AI chat** — the custom SSE protocol (sse-protocol.ts with typed events: status, content_block, tool_start, tool_end, done) is clean and extensible.

2. **Tool confirmation flow** — write actions return `pending_actions` in the SSE done event → frontend shows approval UI → user confirms → POST to /api/chat/confirm. This human-in-the-loop pattern is essential for an AI taking actions.

3. **Specialist agent routing** — 12 domain-specific agents (QA1-7, Marketing, Compliance, Recruitment, EL, Learning Module) each with curated tool access. The master AI routes and delegates. Agents can't use tools outside their allowlist.

4. **AI Learnings** — save corrections and insights as learnings → inject into future system prompts. The concept is right even if the current implementation had bugs (expiry filter missing, duplicate detection brittle).

5. **Prompt caching** — splitting the system prompt into static (cached) and dynamic blocks for Anthropic cache efficiency. Correct approach.

6. **centre_context as knowledge base** — seeding the system prompt with QIP goals, philosophy, teaching approaches from the DB is the right pattern. The implementation of loading everything is the problem, not the concept.

7. **Activity log with realtime** — Supabase realtime on activity_log gives live audit trail. Good.

8. **`allowed_pages` as restriction list** — `null` means full access, non-null restricts. Simple, backward-compatible.

9. **Quality protocol in system prompt** — the QUALITY_PROTOCOL constant (ask before generating, gather data first, cite sources, don't guess) is important prompt engineering. Keep the concept.

---

## 10. Summary for Rebuild

**What this system does well when working:**
- NQS element tracking is comprehensive (40 elements, linked tasks/policies/evidence)
- AI chat with multi-agent delegation is architecturally sound
- Policy management with versioning and acknowledgements is solid
- LMS is a complete feature (module player, pathways, certificates, matrix)
- Recruitment pipeline with AI scoring is unique and valuable

**Why a rebuild makes sense:**
- Accumulated tech debt from rapid feature additions without a design phase
- Security issues (credentials, auth bypass, RLS gaps) suggest the system was never reviewed as a whole
- Two conflicting training systems and an abandoned ai_suggestions table indicate feature pivots without cleanup
- The full feature set (NQS + LMS + Recruitment + Marketing + OWNA + AI) is too large for one codebase without proper architecture planning
- No live testing was ever done with real API credentials — significant unknown risk remains

**Recommended rebuild priorities:**
1. Core: NQS tracking + Tasks + Policies + Compliance (the reason the centre needs this)
2. AI: Chat with quality protocol, confirmation flow, learnings (the competitive differentiator)
3. LMS: Single training system (not two) — educators need it daily
4. Recruitment: High value, well-designed — carry forward
5. OWNA: Read-only, straightforward — carry forward once OWNA key is available
6. Marketing: Full product in its own right — evaluate whether it belongs in this portal or a separate tool
7. Programming: Educational Leadership docs — belongs here, tied to QA1

---

*Source documents archived in this directory. All findings are synthesised from: AUDIT-PRODUCTION-READINESS.md, KIROS-AI-DEFECTS-ROUND2.md, KIROS-AI-UPLIFT-FINAL.md, KIROS-AI-VERIFICATION-REPORT.md, LEARNING-LOG.md, README.md, README-TESTING.md, RECRUITMENT-TESTING-CHECKLIST.md, REVIEW-2026-04-10.md, REVIEW-2026-04-10-v2.md, REVIEW-2026-04-10-v3-FINAL.md, tests/e2e/UAT-PLAN.md, tests/e2e/seeded/README.md, all supabase-migration-*.sql files, supabase-schema.sql.*
