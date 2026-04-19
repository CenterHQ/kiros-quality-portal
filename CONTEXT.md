---
generated: 2026-04-19
generator: system-context
status: snapshot
north-star: "This document exists to support a full requirements-led rebuild of the system from scratch. Treat it as the authoritative source for what the system IS — not how the current code works."
sources:
  - package.json
  - src/lib/types.ts
  - src/middleware.ts
  - src/lib/supabase/server.ts
  - src/lib/supabase/middleware.ts
  - src/app/layout.tsx
  - supabase-schema.sql
  - next.config.mjs
  - src/app/api (directory scan)
  - src/lib (directory scan)
  - src/app (directory scan)
regenerate: "Run /system-context in the repo root"
---

# Kiros Quality Uplift Portal — System Context

> **Rebuild note**: The north-star goal of this document is to fully describe the system so it can be rebuilt from scratch. Every section is written from a requirements/domain perspective, not a code-implementation perspective. When code and requirements diverge, treat this document as capturing intent.

## Purpose

A multi-role operational platform for Kiro's Early Education Centre that centralises NQS (National Quality Standard) compliance, staff management, learning, checklists, rostering, and AI-assisted guidance following an ACECQA Assessment & Rating cycle — replacing scattered spreadsheets, paper forms, and ad-hoc processes.

---

## Core Abstractions

- **QA Element** — One of 40 NQS elements across 7 Quality Areas. Each element has a current rating (`not_met` → `exceeding`), a work status, an assigned staff member, and an evidence trail (officer finding, our response, actions taken). Everything in the portal traces back to QA elements — tasks, training, checklists, policies, and AI suggestions all link to QA numbers.

- **Profile / Role** — Every user is a Profile with one of five roles: `admin` (Approved Provider), `manager` (Operations Manager), `ns` (Nominated Supervisor), `el` (Educational Leader), `educator`. Roles gate page access (`allowed_pages`), write permissions (RLS policies), and which AI suggestions are targeted at them.

- **Checklist System** — A template → schedule → instance pipeline. Templates define reusable inspection forms (items, types, frequency). Schedules assign templates to roles/users on a recurring cadence. Instances are live completions with per-item responses. Failed items auto-generate SmartTickets for follow-up.

- **LMS (Learning Hub)** — Full learning management stack: Modules (content + quizzes + reflections), Pathways (ordered module sequences), Enrollments (per-user progress), PDPs (personal development plans with goals and formal reviews), and Certificates (internal and external credential tracking).

- **AI Layer (Kiros Chat + Suggestions)** — Claude (Anthropic) powers an in-app chat assistant with tool use for creating tasks, assigning training, and updating QA elements. CentreContext records (extracted from uploaded documents) ground the AI in the centre's own policies, philosophy, and QIP goals. AiSuggestions are AI-generated proactive nudges targeting specific roles.

- **Registers** — User-defined spreadsheet-like data tables with typed columns. Any staff member can create a register (e.g., medication, excursion approvals, equipment checks). Data is stored as JSONB row_data against a column schema.

---

## Key Workflows

### QA Improvement Cycle
1. Staff member opens a QA Element with rating `not_met` or `working_towards`.
2. They read the officer finding, write a response, and record actions taken.
3. They create Tasks linked to that element and assign them to colleagues.
4. Once evidence is gathered and tasks done, status moves to `ready_for_review`.
5. NS or manager reviews, approves, and the element is marked `completed` (ready for next rating cycle).

### Checklist Completion (Daily Operations)
1. A cron job (or staff manually) creates ChecklistInstances from active ChecklistSchedules each morning.
2. Staff open their assigned checklists (e.g., "Morning Room Check"), complete each item (yes/no, text, photo, signature).
3. Items that fail (yes/no = no for a required item) auto-generate SmartTickets.
4. SmartTickets are assigned, resolved with evidence photos, and closed — creating an audit trail.

### AI-Assisted Guidance
1. Staff open the Kiros Chat page.
2. They ask questions about NQS elements, policies, or daily operations.
3. The AI has tool access: it can create tasks, assign training modules, update QA elements, and search CentreContext.
4. CentreContext is pre-loaded from uploaded policy documents and QIP files, giving the AI centre-specific knowledge.
5. AiSuggestions (daily priorities, QIP improvement nudges) are generated server-side and surfaced on dashboards per role.

### Staff Learning Pathway
1. Admin creates or publishes an LMS Module with content sections, quiz questions, and reflections.
2. Modules are grouped into Pathways (e.g., "New Educator Induction").
3. Admin enrolls a user or the user self-enrolls.
4. Educator works through sections, answers quizzes, writes reflections — progress tracked per section.
5. On completion, a certificate is issued and recorded. PDP goals linked to the module auto-update.

### Rostering & Ratio Compliance
1. Manager builds a RosterTemplate for the typical week, assigning staff to rooms and shifts.
2. Published roster is visible to all staff.
3. System calculates real-time educator-to-child ratios per room (state-specific RatioRules) and flags breaches.
4. Leave requests are submitted, approved/declined by manager, and reflected in the published roster.
5. Casual pool members can be pulled in to cover gaps.

---

## Design Decisions

- **Supabase for auth + data**: Chosen for built-in RLS (row-level security), real-time subscriptions, and managed Postgres. RLS policies enforce role-based access at the database layer, not just application layer — so even direct API calls from a compromised client can't exceed the user's role permissions.
  - *Alternative considered*: Firebase / custom auth
  - *Why rejected*: Supabase gives structured relational data (critical for QA linkages) plus auth in one managed service. Firebase's document model doesn't suit the relational NQS element/task/comment graph.

- **Next.js 14 App Router (full-stack)**: Server Components for data fetching, Route Handlers for API endpoints, Middleware for session refresh. No separate backend process.
  - *Alternative considered*: Separate Express/Node API server
  - *Why rejected*: Single deployment target (Vercel), simpler auth cookie handling via `@supabase/ssr`, and Server Components eliminate many API round-trips.

- **JSONB for flexible data (checklists, registers, forms)**: Checklist responses, register rows, and form submissions use JSONB rather than strict schemas. The item *definitions* are schema'd but individual row values vary.
  - *Alternative considered*: EAV (entity-attribute-value) separate rows
  - *Why rejected*: JSONB is queryable, performant in Postgres, and avoids extreme table sprawl for user-defined columns.

- **Polymorphic Comments table**: One `comments` table with `entity_type` + `entity_id` rather than separate comment tables per entity.
  - *Alternative considered*: `element_comments`, `task_comments` tables
  - *Why rejected*: Simplifies comment-related queries and UI; all comment logic is in one place.

- **CentreContext as AI grounding layer**: Policy documents and QIP are chunked into `centre_context` records with typed categories. The AI retrieves these at query time rather than embedding whole documents in prompts.
  - *Alternative considered*: Full document RAG with vector embeddings
  - *Why rejected*: The centre's document corpus is small enough that filtered JSONB retrieval by `related_qa` and `context_type` is sufficient without a vector store.

- **Separate service-role Supabase client**: A `createServiceRoleClient()` bypasses RLS for server-side operations (cron jobs, document sync, AI tool execution). Never exposed to the browser.
  - *Risk*: Any server route that mistakenly uses this client would bypass all RLS. Needs audit on each API route.

---

## Non-obvious Constraints

- **NQS has 40 elements across 7 Quality Areas — not 7 elements**: QA number (`1`–`7`) is the *Quality Area*. Each QA has Standards, each Standard has Elements. The `element_code` (e.g., `1.1.1`) is the unique identifier. Code that groups "by QA" is grouping by the `qa_number` integer, not a string.

- **`allowed_pages` is opt-in restriction, not capability grant**: A null/empty `allowed_pages` field means the user can access *all* pages. It's a restriction list, not an allowlist. Admins who set it to an empty array would lock out the user entirely.

- **Tasks have both `status` ('todo'/'in_progress'/'review'/'done') in the DB and ('todo'/'in_progress'/'done') in TypeScript types**: The DB schema includes `'review'` as a valid status but the TypeScript `Task` interface omits it. This inconsistency exists in the codebase and causes silent filtering errors.

- **Checklist instances snapshot item definitions at creation time**: `items_snapshot` stores a copy of the template's items at the time the instance was created. Editing a template does not retroactively change in-flight instances. This is intentional for audit integrity but surprises people who edit a template expecting running checklists to reflect the change.

- **OWNA is a read-only integration via API proxy**: The `/owna/*` pages proxy calls to the OWNA childcare management system API. Kiros does not write back to OWNA. Children, attendance, and enrolment data flows one way: OWNA → Kiros display.

- **Rate limiting is in-memory (Map), not Redis**: The chat API rate limiter resets on server restart and does not work across multiple Vercel serverless instances. In production with concurrent instances, a user can exceed the 30 req/min limit.

- **Microsoft/SharePoint integration is one-way document sync**: SharePoint documents are pulled into Kiros's document store. There is no write-back to SharePoint from Kiros.

---

## Expert Mental Model

- **Think in QA numbers, not page names**: An expert navigates by asking "which QA area and element does this touch?" not "which page does this live on?". Every entity in the system (tasks, training, checklists, policies, suggestions, context) carries `related_qa: number[]`. The QA element is the spine of the domain model.

- **The AI is an action-taking agent, not just a chat interface**: Kiros Chat uses Claude tool use — the AI can directly create tasks, assign training, and update QA elements within the conversation. An expert treats the chat as a command interface with natural language, not a Q&A bot. The `PendingAction` pattern means the AI proposes an action and waits for user confirmation before executing.

- **Role determines what you see AND what the AI targets**: The `target_role` on AiSuggestions means the same underlying compliance gap generates different suggestions for a manager (strategic view) vs. an educator (practical task). Understanding role-based AI targeting is key to understanding why different users see different dashboard content.

- **Checklist failure → SmartTicket is the quality loop**: The system is designed so operational failures (a checklist item that fails) automatically generate follow-up work (SmartTicket) with an evidence trail. An expert sees checklists not as "tick boxes" but as the trigger mechanism for corrective action workflows.

- **Service role client = nuclear option**: `createServiceRoleClient()` bypasses all RLS. It exists for cron jobs and AI tool execution where we need to write on behalf of the system, not a specific user. Any API route that calls it for convenience rather than necessity is a security hole.

---

## Scope Limits

- Does **NOT** manage enrolment billing or fees — OWNA handles all financial and CCS (Child Care Subsidy) data.
- Does **NOT** send SMS or push notifications — only in-app notification flags (`notify_comments`, `notify_status_changes`). Email notification infrastructure is not yet implemented.
- Does **NOT** handle payroll or award interpretation — rostering shows planned hours but has no pay rate calculation or timesheet export.
- Does **NOT** store video content natively — LMS video sections link to external URLs (e.g., YouTube, Vimeo). No media hosting.
- Does **NOT** provide a parent/family portal — the system is staff-facing only. `is_family_facing` on policies is a flag for future use, not a current capability.
- Does **NOT** have multi-centre support — the schema is single-tenancy. `service_details` is a flat KV store for one centre's settings.

---

## Failure Modes

- **Supabase env vars missing or wrong**: App loads but all data fetches silently return null or throw `AuthApiError`. The login page will load but any login attempt fails. Symptom: blank dashboards after login with no visible error. Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly.

- **Service role key used in client-side code**: If `SUPABASE_SERVICE_ROLE_KEY` is accidentally exposed as `NEXT_PUBLIC_*`, it would be visible in the browser and bypass all RLS for any user. Silent security failure — no runtime error, just broken access control.

- **Rate limiter not working in multi-instance Vercel deploy**: The in-memory `rateLimitMap` is per-process. With multiple serverless instances, each instance has its own counter. A user can send 30 × N requests per minute where N is the number of warm instances. No visible error — just unintended AI API costs.

- **Task status enum mismatch (DB vs TypeScript)**: DB allows `'review'` as a task status; TypeScript type does not include it. Tasks created with `status='review'` in Supabase directly will be returned by queries but TypeScript UI code won't render them in any column, causing them to silently disappear from the board.

- **CentreContext not populated**: The AI chat works but gives generic NQS answers instead of centre-specific ones. No error is thrown. Symptom: AI responses that don't reference the centre's philosophy, QIP goals, or specific policies. Fix: upload policy documents and run context extraction in Admin → AI Context Manager.

- **Checklist template edited after instances created**: The live instance uses `items_snapshot` (a frozen copy). Changes to the template are not reflected. Symptom: staff see old checklist items; admin sees new template items. No error. Fix: close existing instances and let the schedule create new ones from the updated template.

- **OWNA API key expired or wrong**: The `/owna/*` proxy routes return 401 or 500 from the upstream API. The UI shows empty data tables rather than an explicit error. Check `OWNA_API_KEY` in environment and the OWNA API status.
