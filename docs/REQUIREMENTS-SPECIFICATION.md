# Requirements Specification — Kiros Quality Portal

**Document purpose:** Functional requirements for a full rebuild of the Kiros Quality Portal. This document is written for Baku (AI app builder). Requirements are unambiguous, use MUST/MUST NOT language, and are complete enough to build from.

**Date:** 2026-04-19
**Rebuild stack:** Next.js 14 App Router + Supabase (auth + Postgres + RLS + realtime) + Anthropic Claude API + Tailwind CSS

---

## 1. System Overview

The Kiros Quality Portal is a multi-role operational platform for Kiros Early Education Centre (Blackett, NSW, Australia). It centralises NQS (National Quality Standard) compliance, staff management, learning, checklists, rostering, and AI-assisted guidance for a single childcare centre.

### 1.1 Roles

| Role | Code | Access Level |
|---|---|---|
| Approved Provider | `admin` | Full access including AP dashboard and admin panel |
| Operations Manager | `manager` | Near-admin; no AP dashboard |
| Nominated Supervisor | `ns` | Quality management, recruitment; no admin panel |
| Educational Leader | `el` | Programming, learning; limited management |
| Educator | `educator` | Tasks, checklists, own learning only |

- `allowed_pages` on the `profiles` table: `null` means all pages allowed (default). A non-null array restricts the user to only those paths.
- `admin` role MUST bypass `allowed_pages` entirely.

---

## 2. Authentication & Session Management

- MUST: Implement Supabase email/password login.
- MUST: Refresh sessions via middleware on every request.
- MUST: Redirect unauthenticated users to `/login` for all protected routes.
- MUST: Enforce role-based page access using `allowed_pages` on the user's profile.
- MUST NOT: Allow user self-registration. All users are created by admin only.
- MUST NOT: Expose `SUPABASE_SERVICE_ROLE_KEY` in any `NEXT_PUBLIC_` environment variable or browser-accessible code.

---

## 3. QA Elements (Core Feature)

- MUST: Store all 40 NQS elements across 7 Quality Areas (QA 1–7). Seed these at build time.
- MUST: Each element has a unique `element_code` (e.g. `1.1.1`) that never changes.
- MUST: Each element tracks:
  - `rating`: `not_met` | `working_towards` | `meeting` | `exceeding`
  - `work_status`: `not_started` | `in_progress` | `ready_for_review` | `completed`
  - `assigned_to` (FK to `profiles`)
  - `officer_finding` (text, read-only to all except admin/manager/ns)
  - `our_response` (text, editable by assigned staff)
  - `actions_taken` (text, editable by assigned staff)
- MUST: Support linking elements to tasks, policies, and training via foreign keys.
- MUST: Allow filtering by QA number, rating, work status, and assigned staff.
- MUST: Display elements grouped by Quality Area (QA 1–7).
- MUST NOT: Allow `educator` or `el` roles to change an element's `rating`. Only `admin`, `manager`, and `ns` may change ratings.
- MUST: Format NQS element references as `QA1.1.1` in all UI copy and AI responses.

---

## 4. Tasks

- MUST: Implement a Kanban board with four columns: Todo, In Progress, Review, Done.
- MUST: Support a list view toggle alongside the Kanban view.
- MUST: Allow drag-and-drop between Kanban columns.
- MUST: Task fields: `title`, `description`, `priority` (`low` | `medium` | `high` | `urgent`), `assigned_to` (FK to `profiles`), `due_date`, `qa_element_id` (optional FK), `status`.
- MUST: Status values MUST be `todo` | `in_progress` | `review` | `done` — in both the database schema and all TypeScript types. The `review` status MUST NOT be omitted from TypeScript types (a prior mismatch caused tasks to silently disappear from the board).
- MUST NOT: Allow `educator` role to assign tasks to other staff. Educators may only self-assign or receive assignments from others.

---

## 5. Checklists

- MUST: Implement a Template → Schedule → Instance pipeline.
- MUST: Templates have: `name`, `description`, `items` (JSONB array of typed item definitions), `frequency` (`daily` | `weekly` | `monthly` | `custom`).
- MUST: Support the following item types within a template: `yes_no`, `text`, `photo`, `signature`, `number`, `select`.
- MUST: When a checklist instance is created from a schedule, snapshot the current item definitions into `items_snapshot` (JSONB). Subsequent edits to the template MUST NOT alter in-flight instances.
- MUST: On instance submission, auto-generate a task (SmartTicket) for any item marked as `required` that received a failing response (e.g. `yes_no` answered `no`).
- MUST: Schedules assign templates to specific users or roles on a defined cadence.
- MUST NOT: Allow `educator` role to create or edit checklist templates.

---

## 6. Compliance

- MUST: Track compliance items separately from NQS elements. Regulatory compliance is distinct from NQS rating.
- MUST: Fields: `regulation_code`, `description`, `status` (`compliant` | `non_compliant` | `under_review`), `due_date`, `assigned_to`, `evidence_notes`.
- MUST: Support filtering compliance items by status.

---

## 7. Policies

- MUST: Full CRUD for policies with: `title`, `content` (markdown), `category`, `current_version`, `review_interval_days`, `tags`, `is_family_facing` (boolean flag — reserved for future use, not a current live feature).
- MUST: Implement version history — every edit MUST create a new version record; previous versions MUST be preserved and viewable.
- MUST: Implement staff acknowledgements — staff can acknowledge a policy; track who has and has not acknowledged each version.
- MUST: Flag policies due for review based on `review_interval_days` since last update.
- MUST: Support tags on policies.
- MUST NOT: Allow `educator` role to create or delete policies.

---

## 8. Registers

- MUST: Implement user-defined spreadsheet-like tables with custom column definitions.
- MUST: Support column types: `text`, `number`, `date`, `boolean`, `select` (with configurable options list).
- MUST: Store row data as JSONB `row_data` keyed against the column schema.
- MUST: Allow any staff member to create a register.
- NOTE FOR REBUILD: Evaluate whether typed register templates (e.g. medication log, excursion record, equipment check) are preferable to the current fully generic JSONB approach. The generic approach is difficult to validate and report on.

---

## 9. Forms

- MUST: Support digital form submissions with defined form types: `weekly_reflection`, `meeting_minutes`, `incident_report`, and others.
- MUST: Each form type MUST have its own defined field schema — NOT a single generic JSONB `data` field shared across all types.

---

## 10. Rostering

- MUST: Implement room management with capacity and educator-to-child ratio rules per age group (NSW/state-specific ratios).
- MUST: Support shift scheduling — assign staff to rooms and time slots.
- MUST: Support roster templates representing a typical weekly pattern.
- MUST: Make the published roster visible to all staff.
- MUST: Calculate ratios per room in real time, flagging breaches as green / amber / red.
- MUST: Implement a leave request workflow: staff submit requests; manager/admin approves or declines; approved leave reflects in the roster.
- MUST: Track staff qualifications: `qualification_type`, `expiry_date`, `status`.
- MUST: Run an automated daily cron job to check qualification expiry and flag upcoming expirations.
- MUST NOT: Calculate pay rates, interpret awards, or export timesheets.

---

## 11. Learning Management System (LMS)

- MUST: Implement a single unified LMS. Do NOT carry forward the legacy `training_modules` / `training_assignments` system — the LMS is the sole training system.
- MUST: Modules have: `title`, `description`, `sections` (ordered), `status` (`draft` | `published`).
- MUST: Section types: `text`, `video` (external URL only), `quiz`, `reflection`.
- MUST: Quiz sections contain multiple-choice questions with a `correct_answer_index`.
- MUST: Reflections are free-text responses saved per user.
- MUST: Enrollments — admin can enrol staff; staff can self-enrol in published modules.
- MUST: Track section-level progress per enrolment.
- MUST: On module completion: issue an internal certificate and update any linked PDP goals.
- MUST: Implement learning pathways — ordered sequences of modules grouped towards a learning goal.
- MUST: Implement Personal Development Plans (PDPs) with: `description`, `target_date`, `status`, `linked_module_ids`, `review_notes`.
- MUST: Implement a competency matrix showing staff (rows) × competencies (columns) with progress indicators.
- MUST: Track two certificate types:
  - Internal — auto-generated on module completion.
  - External — manually entered with `expiry_date`.
- MUST: Run an automated daily cron job to check certificate expiry.
- MUST NOT: Host video content natively. Video sections link to external URLs only.

---

## 12. Recruitment & Onboarding

- MUST: Manage open positions with: `title`, `department`, `description`, `status`.
- MUST: Track candidates linked to a position with a pipeline status: `applied` | `screening` | `interview` | `offer` | `hired` | `rejected`.
- MUST: Provide a token-based public application form at `/apply/[token]` — unauthenticated access only.
- MUST: Seed 60 scenario question templates for interview use.
- MUST: Implement DISC personality assessment — calculate a profile from questionnaire responses.
- MUST: Use AI scoring to evaluate candidate responses against position requirements.
- MUST: Candidate detail view MUST have 6 tabs: Profile, Questionnaire, DISC Results, Interview Notes, Onboarding, Activity.
- MUST: On hire, the onboarding flow creates a Supabase Auth user and `profiles` record for the new staff member using the service role client.
- MUST NOT: Integrate with any external ATS or payroll system.

---

## 13. AI Chat

- MUST: Use the Anthropic Claude API (Opus model by default) with streaming responses delivered via SSE.
- MUST: Support tool use — the AI can execute read tools and propose write tools.
- MUST: Implement a `pending_action` confirmation pattern for all write tools: AI proposes the action → user approves or rejects → action executes only on approval. Write tools MUST NOT execute without user confirmation.
- MUST: Read tools execute silently and return data to the AI without user interruption.
- MUST: Implement the following tool catalogue (37 tools):

  **Read tools:** `search_centre_context`, `get_overdue_items`, `get_qa_progress`, `get_staff_training_status`, `get_dashboard_summary`, `get_policies`, `get_policy_detail`, `get_checklists`, `get_checklist_detail`, `get_roster_data`, `get_registers`, `get_forms`, `get_learning_data`, `get_compliance_items`, `get_activity_log`, `get_documents`, `read_document_content`, `get_room_data`, `search_platform`, `get_learnings`, `get_candidates`, `get_team_profiles`

  **Write tools (require confirmation):** `create_task`, `assign_training`, `suggest_improvement`, `update_item`, `create_checklist_instance`, `generate_document`, `export_document`, `run_deep_analysis`, `delegate_to_agents`, `save_learning`, `record_agent_feedback`, `create_candidate_invite`, `score_candidate`, `create_onboarding_plan`, `generate_interview_questions`, `create_lms_module`

- MUST: Implement a multi-agent architecture with specialist agents per domain (QA1–7, Marketing, Compliance, Recruitment, Educational Leader, Learning Module). Each agent has curated tool access defined in the `ai_agent_definitions` table.
- MUST: Enforce role-based tool access — each tool has an `allowed_roles` list; users cannot invoke tools outside their role's allowlist.
- MUST: Implement AI Learnings — save corrections and insights during conversations; inject relevant learnings into future system prompts.
- MUST: Load CentreContext (QIP goals, philosophy, procedures) from the DB to ground AI responses.
- MUST: Split the system prompt into a static cached block and a dynamic block (for learnings, context) to enable prompt caching.
- MUST: Persist full conversation history including tool call and tool result messages, not only user/assistant turns.
- MUST: Implement per-user per-minute rate limiting using Redis/Upstash. MUST NOT use an in-memory Map for rate limiting (in-memory is ineffective in serverless environments).
- MUST: AI Quality Protocol — the AI MUST gather data before generating documents, ask clarifying questions, and cite sources in responses.
- MUST: AI Learning Protocol — the AI silently saves learnings during conversations without user prompting.
- MUST NOT: Execute write tools without explicit user confirmation.
- MUST NOT: Allow a user to invoke tools outside their role's allowlist.

---

## 14. Documents

- MUST: Store AI-generated documents in the database with: `title`, `type`, `content`, `created_by`, `format` (`markdown` | `docx` | `pdf`).
- MUST: Support export of AI-generated documents to PDF and DOCX.
- MUST: Implement SharePoint integration — one-way sync from SharePoint library into the Kiros document library.
- MUST: Extract text from PDF files using the `pdf-parse` library. MUST NOT attempt UTF-8 string conversion of binary PDF data.
- MUST: Extract text from Excel files using `exceljs`. MUST NOT return placeholder strings.
- MUST: Provide a searchable document library.
- MUST NOT: Write documents back to SharePoint from Kiros.
- MUST NOT: Host video content.

---

## 15. OWNA Integration

- MUST: Implement a read-only server-side proxy to the OWNA childcare management API.
- MUST: Display data from 6 OWNA endpoints: staff, attendance, children, families, enrolments, health.
- MUST: Store the OWNA API key in an environment variable only. MUST NOT store it in source code or the database.
- MUST NOT: Write any data back to OWNA.

---

## 16. Marketing

- MUST: Connect Meta (Facebook/Instagram) and Google accounts via OAuth2.
- MUST: Store all OAuth tokens encrypted at rest — use Supabase Vault or column-level encryption. MUST NOT store tokens as plaintext in database columns.
- MUST: Support content creation with multi-platform targeting.
- MUST: Implement a content calendar.
- MUST: Display and manage Google and Meta reviews.
- MUST: Track ad campaigns.
- MUST: Aggregate analytics across connected platforms.
- MUST: Implement a social inbox for direct messages.
- MUST: Support comment management with reply capability.
- MUST: Provide a Marketing AI assistant — separate from the main Kiros Chat, focused on marketing tasks only.
- MUST: Register the following automated cron jobs: analytics sync (daily), auto-publish (hourly), token refresh (daily).
- NOTE FOR REBUILD: Evaluate whether Marketing belongs in this portal or as a standalone tool. It has little integration with the compliance/quality core and may benefit from separation.

---

## 17. Activity Log

- MUST: Maintain an audit trail for all create, update, and delete operations across all entities.
- MUST: Fields: `user_id`, `action_type`, `entity_type`, `entity_id`, `old_values` (JSONB), `new_values` (JSONB), `created_at`.
- MUST: Subscribe to the activity log via Supabase realtime for a live audit feed.
- MUST: Support filtering by user, action type, and date range.
- MUST: Deduplicate INSERT events. The previous codebase showed duplicate entries in the live feed.

---

## 18. Reports

- MUST: Implement a multi-step query builder: select data source, fields, filters, aggregations, and sorting.
- MUST: Show a results preview before export.
- MUST: Support export to CSV, JSON, and XLSX.
- MUST: Support saving and reloading report templates.
- MUST: Include pre-built report types: staff summary, compliance report, QA progress.

---

## 19. Admin Panel

Access restricted to `admin` role only.

- MUST: AI agent management — CRUD for agent definitions with tool assignments and a test runner.
- MUST: AI configuration panel — model selection, token budgets, feature flags (stored in `ai_config` KV table).
- MUST: System prompt editor — editable prompt sections with assembled prompt preview.
- MUST: AI learnings management — review, edit, and delete learning entries.
- MUST: AI analytics — agent performance, token usage, correction rates.
- MUST: Centre Context manager — CRUD for QIP/philosophy records, document upload with context extraction.
- MUST: SharePoint management — OAuth connect/disconnect, sync history, file browser.
- MUST: User management — create/edit users, assign roles, set `allowed_pages`.
- MUST: Tags management.
- MUST NOT: Make the admin panel accessible to `ns`, `el`, or `educator` roles.

---

## 20. AP Dashboard

- MUST: Implement an admin-only overview showing: centre health score, QA progress by area, staff compliance percentage, AI usage.
- MUST: Include a print-friendly view.
- NOTE: Multi-centre support is out of scope.

---

## 21. Integration Requirements

| Integration | Direction | Auth Method | Key Constraints |
|---|---|---|---|
| Supabase | Bidirectional | Service role (server) + anon key (client) | RLS enforces row-level access per role |
| Anthropic Claude | Outbound (server only) | API key | Never expose to browser |
| OWNA API | Inbound read-only | API key (server only) | Proxy pattern — never expose key |
| Microsoft SharePoint | Inbound read-only | OAuth2 (access + refresh token) | Store tokens encrypted |
| Meta (Facebook/Instagram) | Bidirectional | OAuth2 | Store tokens encrypted; renew before expiry |
| Google Ads / Analytics | Bidirectional | OAuth2 | Store tokens encrypted; renew before expiry |

---

## 22. Data Model Requirements

### 22.1 Core Tables

| Table | Key Fields |
|---|---|
| `profiles` | Extends `auth.users`: `role`, `full_name`, `allowed_pages` (text[]), `avatar_url` |
| `qa_elements` | `element_code` (unique), `qa_number`, `standard_number`, `name`, `description`, `rating`, `work_status`, `assigned_to`, `officer_finding`, `our_response`, `actions_taken` |
| `tasks` | `title`, `description`, `priority`, `status` (`todo`\|`in_progress`\|`review`\|`done`), `assigned_to`, `due_date`, `qa_element_id` |
| `comments` | Polymorphic: `entity_type`, `entity_id`, `user_id`, `content`, `created_at` |
| `compliance_items` | `regulation_code`, `description`, `status`, `due_date`, `assigned_to`, `evidence_notes` |
| `policies` | `title`, `content`, `category`, `current_version`, `review_interval_days`, `tags`, `is_family_facing` |
| `policy_versions` | `policy_id`, `version_number`, `content`, `created_by`, `created_at` |
| `policy_acknowledgements` | `policy_id`, `user_id`, `acknowledged_at` |
| `checklist_templates` | `name`, `description`, `items` (JSONB), `frequency`, `created_by` |
| `checklist_schedules` | `template_id`, `assigned_to`, `role_restriction`, `start_date`, `frequency` |
| `checklist_instances` | `template_id`, `schedule_id`, `assigned_to`, `items_snapshot` (JSONB — frozen at creation), `status`, `completed_at` |
| `register_definitions` | `name`, `description`, `columns` (JSONB schema), `created_by` |
| `register_entries` | `register_id`, `row_data` (JSONB), `created_by`, `created_at` |
| `form_submissions` | `form_type`, `data` (JSONB — per-type schema), `submitted_by`, `created_at` |

### 22.2 LMS Tables (Single System)

| Table | Key Fields |
|---|---|
| `lms_modules` | `title`, `description`, `status`, `created_by` |
| `lms_module_sections` | `module_id`, `title`, `section_type`, `content`, `order_index` |
| `lms_quiz_questions` | `section_id`, `question_text`, `options` (JSONB), `correct_answer_index` |
| `lms_enrollments` | `module_id`, `user_id`, `status`, `enrolled_at`, `completed_at` |
| `lms_section_progress` | `enrollment_id`, `section_id`, `completed`, `completed_at` |
| `lms_quiz_responses` | `enrollment_id`, `question_id`, `selected_answer`, `is_correct` |
| `lms_pathways` | `name`, `description`, `module_ids` (ordered array) |
| `lms_pathway_enrollments` | `pathway_id`, `user_id`, `status` |
| `lms_pdp_goals` | `user_id`, `description`, `target_date`, `status`, `linked_module_ids`, `review_notes` |
| `lms_certificates` | `user_id`, `type` (`internal`\|`external`), `title`, `issued_at`, `expiry_date`, `issued_by_module_id` |

### 22.3 AI Tables

| Table | Key Fields |
|---|---|
| `chat_conversations` | `user_id`, `title`, `agent_id`, `created_at` |
| `chat_messages` | `conversation_id`, `role` (`user`\|`assistant`\|`tool_call`\|`tool_result`), `content`, `tool_name`, `tool_use_id`, `metadata` |
| `ai_agent_definitions` | `name`, `role`, `description`, `available_tools` (array), `domain_tags`, `routing_keywords`, `is_active` |
| `ai_agent_performance` | `agent_id`, `conversation_id`, `accepted_count`, `rejected_count`, `quality_score` |
| `ai_learnings` | `user_id`, `type` (`correction`\|`preference`\|`domain_insight`\|`process_knowledge`), `title`, `content`, `confidence`, `times_reinforced`, `applies_to_roles`, `expires_at`, `tags` |
| `ai_system_prompts` | `section_key`, `content`, `is_active`, `order_index` |
| `ai_config` | `key`, `value` (KV store for AI configuration) |
| `ai_generated_documents` | `title`, `type`, `content`, `format`, `created_by`, `sharepoint_sync_status` |
| `centre_context` | `context_type`, `content`, `source`, `related_qa` (array), `priority` |

### 22.4 Recruitment Tables

| Table | Key Fields |
|---|---|
| `recruitment_positions` | `title`, `department`, `description`, `status` |
| `recruitment_candidates` | `position_id`, `name`, `email`, `phone`, `application_token`, `status`, `disc_profile` (JSONB), `score` |
| `recruitment_question_templates` | `text`, `category`, `weight` |

### 22.5 Rostering Tables

| Table | Key Fields |
|---|---|
| `rooms` | `name`, `capacity`, `age_group` |
| `ratio_rules` | `state`, `age_group`, `ratio` (educators:children) |
| `shifts` | `staff_id`, `room_id`, `date`, `start_time`, `end_time` |
| `roster_templates` | `name`, `shift_definitions` (JSONB) |
| `leave_requests` | `staff_id`, `start_date`, `end_date`, `status`, `approved_by` |
| `staff_qualifications` | `staff_id`, `qualification_type`, `expiry_date`, `status` |

### 22.6 Other Required Tables

| Table | Key Fields |
|---|---|
| `activity_log` | `user_id`, `action_type`, `entity_type`, `entity_id`, `old_values` (JSONB), `new_values` (JSONB) |
| `sharepoint_documents` | `external_id`, `name`, `url`, `content_text`, `synced_at`, `sync_status` |
| `sharepoint_credentials` | `tenant_id`, `client_id`, `access_token` (encrypted), `refresh_token` (encrypted), `expires_at` |
| `marketing_*` | Full marketing schema: campaigns, content, social accounts (with encrypted tokens), analytics, inbox, comments |
| `service_details` | `key`, `value` (KV store for centre settings) |
| `tags` | `name`, `colour`, `created_by` |

### 22.7 Tables to NOT Carry Forward

- `training_modules` and `training_assignments` — legacy system, fully superseded by the LMS tables.
- `ai_suggestions` — designed but abandoned; the SSE `pending_action` pattern replaces it entirely.

---

## 23. Row Level Security (RLS) Requirements

- MUST: Enable RLS on every table.
- MUST NOT: Use `USING (true)` policies. Define explicit read/write access per role for every table.
- MUST: Use the service role client (bypasses RLS) only for: cron jobs, AI tool execution on behalf of the system, and onboarding user creation.
- MUST: `profiles` — any authenticated user can read all profiles (needed for staff lists); users can write only their own profile; only `admin` can write other users' profiles.
- MUST: `qa_elements` — all authenticated roles can read; only `admin`, `manager`, and `ns` can write.
- MUST: `tasks` — all roles can read; `admin`/`manager`/`ns` can create and assign; `educator` can update only their own assigned tasks.
- MUST: `chat_messages` — a user can read only messages from conversations they own. This MUST be enforced via a join through `chat_conversations.user_id`, not a direct column check.

---

## 24. Non-Functional Requirements

### 24.1 Security
- Service role key MUST NOT appear in any `NEXT_PUBLIC_` variable or client-side bundle.
- OAuth tokens (Meta, Google, SharePoint) MUST be stored encrypted at rest using Supabase Vault or column-level encryption.
- Rate limiting on AI chat endpoints MUST use Redis/Upstash. In-memory Maps are ineffective in serverless and MUST NOT be used.

### 24.2 Realtime
- Supabase realtime subscription MUST be active on `activity_log` for the live audit feed.

### 24.3 File Handling
- PDF text extraction MUST use `pdf-parse`. MUST NOT attempt binary-to-string conversion.
- Excel text extraction MUST use `exceljs`. MUST NOT return placeholder strings.

### 24.4 Cron Jobs
- Register all cron jobs in `vercel.json`:
  - Qualification expiry check — daily
  - Document sync (SharePoint) — daily
  - Marketing token refresh — daily
  - Marketing analytics sync — daily
  - Marketing auto-publish — hourly
  - Certificate expiry check — daily

### 24.5 Error Handling & UX
- All Supabase write operations MUST handle errors explicitly.
- User-facing errors MUST use toast notifications. MUST NOT use `alert()`.
- Every async operation MUST display a loading state.
- Initial page loads MUST use skeleton loaders.
- Every list view MUST have a designed empty state with an actionable prompt.

### 24.6 Responsive Layout
- Mobile: bottom tab bar navigation; sidebar rendered as a drawer.
- Desktop: persistent left sidebar.
- Layout MUST be responsive across both breakpoints.

### 24.7 Design Conventions
- Card backgrounds MUST use `bg-card`, not `bg-white`, to support dark mode.
- All UI copy and content MUST use Australian English spelling.
- NQS element references MUST be formatted as `QA1.1.1` in all AI and UI copy.

---

## 25. Explicit Out of Scope

The following are explicitly excluded from this build:

- Multi-centre support
- Parent/family portal (`is_family_facing` flag exists on policies for future use only)
- Billing, fees, or CCS (Child Care Subsidy) — OWNA handles all financial data
- SMS or push notifications (in-app flags only)
- Payroll or award interpretation
- Native video hosting (external URLs only)
- Email sending (reserved for future enhancement, e.g. policy review reminders)
- Writing data back to SharePoint or OWNA
- Integration with any external ATS or payroll system

---

## 26. Phase 5 Findings — Database Reality Check

*Added 2026-04-19. Source: live Supabase DB audit (76 tables, row counts, RLS policies) against this specification.*

### 26.1 Schema Corrections

The following tables exist in the live DB but were missing from Section 22 of this spec. The rebuild MUST include them:

| Table | Live Rows | Why It Matters |
|---|---|---|
| `element_actions` | 68 | Core to QA improvement cycle — tracks improvement plans per NQS element |
| `lms_module_centre_content` | 186 | Centre adds their own content to each LMS module — critical for content ownership |
| `lms_pathway_modules` | 29 | Junction table linking pathways to modules — required for pathway functionality |
| `checklist_categories` | 8 | Checklists are organised by category |
| `policy_categories` | 12 | Policies are organised by category |
| `smart_tickets` | 0 | Auto-generated remediation tickets from checklist failures — key design feature |
| `resources` | 35 | Resources library visible to staff |
| `ai_tool_permissions` | 49 | Role-based AI tool access control — actively configured |
| `ai_document_styles` | 4 | Required for AI document generation |
| `lms_pdp_reviews` | 0 | Pairs with `lms_pdp_goals` for the PDP cycle |
| `lms_reflections` | 1 | Part of LMS learner journey |
| `marketing_messages_inbox` | 92 | Read-only inbox from Meta integration (separate from `marketing_messages`) |

### 26.2 Naming Corrections

| This Spec Said | Live DB Actual Name | Use in Rebuild |
|---|---|---|
| `shifts` | `roster_shifts` | Use `roster_shifts` |
| `sharepoint_credentials` | `sharepoint_connection` | Use `sharepoint_connection` |

### 26.3 Tables Confirmed as Not Carry Forward

| Table | Live Rows | Reason |
|---|---|---|
| `ai_suggestions` | 0 | Confirmed abandoned — never populated |
| `training_modules` | 8 | Legacy system — consolidate into single LMS |
| `training_assignments` | 0 | Legacy system — never used |

### 26.4 Critical RLS Finding

17 LMS and SharePoint tables have `FOR ALL USING(true) WITH CHECK(true)` policies. Any authenticated user can create, modify, or delete any row — including deleting LMS modules or issuing certificates for other users.

**Rebuild requirement (amplified from Section 23):** LMS tables MUST have role-differentiated RLS. `educator` role can only write their own progress and quiz responses. `admin`/`manager` can manage modules, sections, quiz questions, and pathways. `lms_module_centre_content` should be writable only by `admin` and `manager`.

---

## 27. Phase 5 Findings — Feature Classification

*User-needs-first assessment based on live DB row counts, 2026-04-19. The classification answers: what does an NQS compliance portal for ~20 staff actually need?*

### 27.1 Classification Table

| Feature Module | Classification | Evidence / Rationale |
|---|---|---|
| **NQS / QA Elements** | Core | 40 elements seeded, 68 element actions — fundamental to the centre's compliance purpose |
| **Tasks** | Core | 22 rows active, referenced throughout the system |
| **AI Chat** | Core | 539 messages, 78 conversations — the most-used feature. This is the competitive differentiator |
| **LMS (Learning)** | Core | 41 modules, 186 centre content entries — real investment. Must launch with adoption mechanism |
| **Checklists** | Core | 19 templates exist; 0 instances ever run — **the biggest gap at launch**. Build this first |
| **Policies + Acknowledgements** | Core | 0 policies created despite 12 categories — urgently needed for compliance |
| **Recruitment** | High Value | 14 candidates, 19 positions, 60 templates — actively used |
| **Activity Log** | High Value | 79 rows — monitoring and audit trail used |
| **Registers** | High Value | 7 registers defined, 0 entries — framework exists; entry workflow needed |
| **Compliance Items** | High Value | 9 items — in use |
| **Documents (AI-generated)** | High Value | 15 generated documents — used with AI chat |
| **centre_context** | Core (internal) | 127 entries — essential for grounding AI chat |
| **Rostering** | Uncertain | 0 shifts, 0 roster templates — built, not used. Deprioritise in v1 rebuild |
| **Programming Hub** | Uncertain | 0 rows in `programming_time` — never activated |
| **Resources Library** | Uncertain | 35 rows exist — data is there, unknown if staff access it |
| **Forms** | Uncertain | 0 submissions — module built, not used |
| **Reports Extractor** | Uncertain | Likely blocked by missing credentials; usage unknown |
| **AP Dashboard** | Uncertain | Only 1 centre in DB; multi-centre logic untested |
| **Staff DISC Profiles** | Uncertain | 0 rows — never used |
| **PDP System** | Uncertain | 0 goals, 0 reviews — built, never activated |
| **Marketing** | Out of Scope (v1) | All content tables empty. Inbox has 92 read-only rows from Meta. Full social publishing is a product in its own right |
| **OWNA Integration** | Out of Scope (v1) | Read-only. Add as a second-pass feature once core is stable |
| **SharePoint Sync** | Out of Scope (v1) | 91 documents synced — it works, but the sync mechanism is complex. Add after core rebuild |
| **Legacy Training System** | Drop | `training_modules`/`training_assignments` — 0 assignments, consolidate into LMS |

### 27.2 Adjusted v1 Scope for Baku

**Build first (Core — centre cannot operate without these):**
1. Auth + Roles + Profile management
2. NQS Elements + QA improvement cycle (element_actions)
3. Tasks (assignment, status, due dates)
4. Checklists — template → schedule → instance → completion → smart ticket
5. Policies — create, version, publish, staff acknowledgement
6. AI Chat (37 tools, centre_context grounding)
7. LMS — modules, sections, quiz, enrolment, progress, pathways, certificates

**Build second (High Value — regular benefit for small centre):**
8. Recruitment — positions, candidates, question templates
9. Registers — definitions + entry workflow
10. Activity Log (real-time audit feed)
11. Admin panel — user management, AI agent configuration, centre settings
12. AI-generated documents (styles + generation)

**Defer or scope down (Uncertain — build only if time permits):**
- Rostering: ratio rules and room management only; skip shift scheduling for v1
- Resources library: read-only list view only
- AP Dashboard: single-centre mode only; drop multi-centre assumptions

**Explicitly exclude from v1:**
- Marketing module (full product requiring OAuth, social APIs, publishing)
- OWNA integration (read-only; add in v2)
- SharePoint sync (complex OAuth; add in v2)
- PDP system (never used; validate need before building)
- Programming time tracking (0 usage)
- Legacy training system (drop; consolidate into LMS)
- Forms module (0 submissions; validate need before building)
