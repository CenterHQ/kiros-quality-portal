# Requirements Specification — Kiros Quality Portal

**Document purpose:** Handover-ready functional requirements for a full rebuild of the Kiros Quality Portal. Written for Baku (AI app builder) and the product owner. Complete enough to implement without access to the existing codebase.

**Source evidence:** UI screenshot tour (56 routes, captured 2026-04-19 as Approved Provider), TypeScript type definitions (`src/lib/types.ts`), system context (`CONTEXT.md`). Observations noted as *observed* are inferred from the UI. Observations confirmed by code are noted as *confirmed in code*.

**Date:** 2026-04-19
**Primary stack:** Next.js 14 App Router + Supabase (auth + Postgres + RLS + Storage) + Anthropic Claude API + Tailwind CSS

---

## 1. System Overview

### 1.1 What It Is

The Kiros Quality Portal is a purpose-built ECEC (Early Childhood Education and Care) quality management platform for a single childcare centre — Kiros Early Education Centre, Blackett NSW, Australia. It is not a generic multi-centre SaaS product; it is single-tenant by design.

Primary purpose: NQS (National Quality Standard) compliance tracking and quality improvement planning following an ACECQA Assessment & Rating cycle.

Secondary purposes: staff learning & development, operational checklists, rostering, policy management, marketing, and recruitment.

### 1.2 What It Is Not

- Not a multi-tenant SaaS product. One Supabase project, one centre.
- Not a parent/family portal. Staff-facing only.
- Not a billing or payroll system. OWNA manages all financial and CCS (Child Care Subsidy) data.
- Not a video hosting platform. Video content in the LMS links to external URLs only.
- Not a push notification or SMS service. In-app notifications only; email is not yet implemented.
- Does not write back to OWNA, SharePoint, or any external source of truth. All external integrations are read-only into this system.

### 1.3 Technology Stack

| Layer | Technology |
|---|---|
| Frontend + API routes | Next.js 14 App Router (full-stack, no separate backend process) |
| Database + Auth | Supabase (PostgreSQL, RLS, Auth, Storage, Realtime) |
| AI | Anthropic Claude API (claude-opus-4, claude-sonnet-4) |
| Styling | Tailwind CSS with a purple/violet primary brand colour |
| Deployment | Vercel (serverless) |
| Cron jobs | Vercel cron with `CRON_SECRET` |
| Rate limiting | Redis/Upstash (MUST NOT use in-memory Map in serverless) |

---

## 2. User Roles & Permissions

Five roles in ascending privilege order. Role code in Supabase `profiles.role` column.

| Display Name | Code | Privilege Level |
|---|---|---|
| Educator | `educator` | Lowest — own tasks, checklists, own learning only |
| Educational Leader | `el` | Educator + programming/pedagogy access |
| Nominated Supervisor | `ns` | Broad operational + compliance access |
| Operations Manager | `manager` | Operational + marketing + recruitment access |
| Approved Provider | `admin` | Full access including AI configuration and user management |

**Page access model** (*confirmed in code*):
- `profiles.allowed_pages` is a `text[]` column. `null` or empty means access to all pages (default for admin and manager).
- A non-null array restricts that user to only those specific route paths.
- The `admin` role MUST bypass `allowed_pages` entirely — it always sees all pages.
- Example observed: Justina Abadier (Educator) has 11 allowed pages; Annette Ballard (Nominated Supervisor) and Rony Kirollos (Approved Provider) have all pages.

**Role-gated sidebar sections** (*observed*):
- Recruitment nav group (`/candidates`, `/candidates/positions`) — not visible to Educator or Educational Leader.
- Programming & Pedagogy nav item (`/programming`) — role-restricted.
- AP Dashboard (`/ap-dashboard`) — visible to `admin` only.
- Admin section — visible to `admin` and `manager`.

---

## 3. Functional Requirements by Feature

---

### 3.1 Authentication & Access Control

**Route:** `/login`
**Rebuild priority:** Critical (observed confidence: 100)

**Purpose:** Email/password authentication with role-enforced page-level access control.

**Must do:**
- Implement Supabase email/password login with a centred login card showing the Kiros logo and a "Quality Uplift Portal" pill badge.
- Refresh Supabase sessions via Next.js middleware on every request.
- Redirect all unauthenticated users to `/login`.
- After login, redirect users to `/hub` as the default landing page.
- Enforce `allowed_pages` restriction on every protected route. Requests to disallowed paths MUST return a 403 or redirect.
- Allow admin to create new user accounts (no self-registration).
- Allow admin to set or clear `allowed_pages` per user.

**Must not do / constraints:**
- No self-registration link or forgot-password link was visible on the login screen (*observed*). If password reset is added, it must be admin-initiated.
- MUST NOT expose `SUPABASE_SERVICE_ROLE_KEY` in any `NEXT_PUBLIC_*` environment variable.
- `admin` role MUST bypass `allowed_pages` — never lock out an admin.

**Data entities:** Profile, auth.users (Supabase managed)

**Integration dependencies:** Supabase Auth

---

### 3.2 Dashboard

**Route:** `/dashboard`
**Rebuild priority:** Critical (observed confidence: 92)

**Purpose:** NQS quality overview for the whole centre — ratings, QIP progress, compliance alerts, and Quality Area breakdowns in one view.

**Must do:**
- Display overall NQS rating status (e.g. "Working Towards") as a prominent headline stat.
- Show three summary stat cards: elements not met (count), tasks completed (fraction e.g. 1/22), compliance actions open (count).
- Display QIP Goals as a progress bar list with QA colour badges.
- Display a centre philosophy quote (configurable via service_details).
- Show Quality Area overview cards for QA1–QA7, each with: area name, rating badge (Not Met / Working Towards / Meeting / Exceeding), element count.
- Show a Compliance Breaches table listing specific regulations with status badges. Observed regulations: 74, 77, 84, 97, 155, 156, 165, 172.
- Data on this page is centre-wide (not user-specific).

**Must not do / constraints:**
- No user-specific content on this page; that belongs on `/hub`.
- Must not require the service role key to render this page's core data.

**Data entities:** QAElement, QIPGoal, ComplianceItem, ServiceDetail (for philosophy quote)

**Integration dependencies:** Supabase (Postgres)

---

### 3.3 Centre Hub

**Route:** `/hub`
**Rebuild priority:** High (observed confidence: 85)

**Purpose:** Personalised landing page for the logged-in user — their stats, QIP goals, quick actions, and recent activity.

**Must do:**
- Display a K.I.R.O.S. philosophy pillars banner (Knowledge, Integrity, Resilience, Openness, Safe).
- Show four personalised stat tiles: Elements Met (fraction of 40), Tasks Done (fraction), QIP Goals count, Pending Ideas count.
- List the current user's QIP Goals with progress bars and QA colour badges.
- Provide Quick Actions sidebar links to: Task Board, Daily Checklists, Learning Hub, Compliance, Policies, AP Dashboard.
- Display a Recent Activity feed showing the latest system actions relevant to the current user.
- This is the default post-login landing page.

**Must not do / constraints:**
- Quick Actions list is role-sensitive; AP Dashboard link MUST only appear for `admin`.

**Data entities:** Profile, QAElement, Task, QIPGoal, ActivityLog

**Integration dependencies:** Supabase

---

### 3.4 NQS Elements Tracker

**Route:** `/elements`
**Rebuild priority:** Critical (observed confidence: 95)

**Purpose:** The core feature — track all 40 NQS elements across 7 Quality Areas, their current ratings, work status, and improvement progress.

**Must do:**
- Store and display all 40 NQS elements. These are seeded at build time and MUST NOT be created by users.
- Each element has a unique `element_code` (e.g. `1.1.1`) that never changes.
- Group elements by Quality Area (QA1–QA7) with colour-coded QA badges.
- Each element row shows: element code, element name, current rating badge, work status badge.
- Support filtering by QA area via tab filters across the top (All + QA1 through QA7).
- Support a search field for filtering by element name or code.
- Support the following rating values: `not_met`, `working_towards`, `meeting`, `exceeding`.
- Support the following work status values: `not_started`, `in_progress`, `action_taken`, `ready_for_review`, `completed`.
- Allow `admin`, `manager`, and `ns` to change an element's rating.
- Allow assigned staff to edit `our_response` and `actions_taken` fields.
- Store `officer_finding` (read-only for all except admin/manager/ns) from the ACECQA assessment.
- Allow linking an element to tasks, policies, and training modules.
- Track `assigned_to` (FK to profiles).
- Every entity in the system that relates to quality improvement carries `related_qa: number[]` — elements are the spine of the domain model.

**Detail view fields observed (Pass 3, entry 58):** Clicking an element row in the list view did NOT navigate to a detail page in automated capture — the full list reloaded. The full 40-element list IS confirmed (screenshot 58-element-detail.png): element code, element name, Rating badge (Not Met/Met), Work Status badge (Not Started/In Progress), grouped by QA area with colour-coded headers showing element count. Element detail views (`/elements/[id]`) were not captured and likely require a different interaction (inline expand or modal, not row-click navigation).

**Must not do / constraints:**
- `educator` and `el` MUST NOT change an element's `current_rating`. Only `admin`, `manager`, and `ns` may change ratings.
- Elements are not created or deleted by users. The set of 40 elements is fixed.

**Data entities:** QAElement, Profile

**Integration dependencies:** Supabase

---

### 3.5 QIP Goal Management

**Route:** Embedded within `/dashboard`, `/hub`, `/ap-dashboard`; managed via elements and tasks.
**Rebuild priority:** Critical (observed confidence: 95 — inferred from usage across the system)

**Purpose:** Quality Improvement Plan goals linked to NQS elements, tracking progress towards higher ratings.

**Must do:**
- Store QIP goals with: title, description, linked QA element(s), progress percentage (0–100), status, target date.
- Display QIP goals as progress bars with QA area colour badges on the Dashboard, Hub, and AP Dashboard.
- Allow `admin`, `manager`, and `ns` to create and edit QIP goals.
- Show QIP goal count in stat tiles: 46 goals observed in production (*observed*).
- Show "QIP Progress" as a percentage on the AP Dashboard (11% observed).
- Allow QIP goals to be linked to AI context records (to ground AI responses with centre-specific improvement strategies).
- **QIP Progress scoring formula** (*confirmed in AI Config System tab, 51o*): The overall QIP Progress percentage is a weighted composite of four metrics. Weights stored in `ai_config` under `dashboard.qip_weight_*`:
  - Elements: **40%** (`dashboard.qip_weight_elements = 0.4`)
  - Tasks: **30%** (`dashboard.qip_weight_tasks = 0.3`)
  - Compliance: **20%** (`dashboard.qip_weight_compliance = 0.2`)
  - Training: **10%** (`dashboard.qip_weight_training = 0.1`)
  - The weights sum to 1.0. These values are configurable via the AI Config → System tab and must be read from `ai_config` at runtime, not hard-coded.

**Must not do / constraints:**
- QIP goals are not the same as NQS element ratings. A centre can have a QIP goal for an element that is already rated `meeting`.

**Data entities:** QIPGoal (linked to QAElement), CentreContext

**Integration dependencies:** Supabase

---

### 3.6 Task Board

**Route:** `/tasks`
**Rebuild priority:** Critical (observed confidence: 90)

**Purpose:** Kanban task board for managing NQS improvement work, linked to specific QA elements.

**Must do:**
- Implement a Kanban board with three columns: To Do, In Progress, Done. (*Observed: 21 tasks in To Do, 0 In Progress, 1 Done at time of tour.*)
- Note: The database MUST also support a `review` status (*confirmed in code* — `types.ts` documents this inconsistency); the Kanban board should display a Review column or treat it explicitly. The current TypeScript types omit `review`, causing tasks with that status to silently disappear.
- Provide a Board/List view toggle.
- Task cards display: title, description snippet, priority badge (Urgent / High / Medium / Low), due date, assigned user avatar, comment count.
- Support drag-and-drop between Kanban columns (reorder within and between columns).
- Task creation: title, description, priority, assigned_to (FK to profiles), due_date, optional qa_element_id.
- Support a "+ Add Task" button in the header.
- Sort tasks by priority and due date within each column.
- Badge count: the sidebar MAY display a badge dot (not a number) indicating there are open tasks. (*Observed: sidebar shows dot badges, not numeric counts.*)

**Detail view fields observed (Pass 3, entry 59):** Task card click did NOT open a detail modal or slide-in panel in automated capture — the Kanban board reloaded. The full 22-task board IS confirmed (screenshot 59-task-detail.png). Task titles visible: UAT Deep Task, Submit formal response to department, Conduct emergency evacuation drill, Deliver child protection training to ALL staff, Deliver Training Modules on Positive Interactions, Set up calm-down spaces, Place recycling/compost bins, Create Individual Learning Profiles, Customise staff handbook, Distribute family satisfaction surveys, Review Behaviour Guidance documentation, Create formal casual educator induction checklist, Schedule monthly team meetings, Establish community partnership, Develop individualised support plans, Conduct philosophy review, Create Educational Leadership plan, Implement weekly critical reflections. Task detail/edit panels likely require a deliberate click target not captured by automation.

**Must not do / constraints:**
- `educator` role MUST NOT be able to assign tasks to other staff. Educators may update only their own assigned tasks.
- Tasks assigned to a QA element carry that element's QA number for filtering and AI routing.

**Data entities:** Task, Profile, QAElement, Comment

**Integration dependencies:** Supabase (including Realtime for live updates)

---

### 3.7 Operational Checklists

**Route:** `/checklists`
**Rebuild priority:** High (observed confidence: 72)

**Purpose:** Template-driven operational checklists for daily centre safety and procedural compliance, with automatic ticket generation for failures.

**Must do:**
- Implement a three-layer pipeline: ChecklistTemplate → ChecklistSchedule → ChecklistInstance.
- **Templates:** 19 templates observed in production. Template fields: name, description, category (Safety & Security, Cleaning & Hygiene, etc.), frequency (`daily`|`weekly`|`monthly`|`quarterly`|`annual`|`event_triggered`), items array (JSONB), related_qa (int array), assignable_roles, is_system_template, status (`active`|`draft`|`archived`).
- **Item types** (*confirmed in code*): `yes_no`, `text`, `number`, `photo`, `dropdown`, `signature`, `heading`, `date`, `time`, `checklist`.
- **Instances:** When a checklist instance is created from a schedule, snapshot the item definitions into `items_snapshot` (JSONB). Subsequent template edits MUST NOT alter in-flight instances (audit integrity).
- Checklist execution: staff open an assigned instance, respond to each item. Progress shows completed/total.
- Failed items (a `yes_no` item answered `no` on a required field) MUST auto-generate a SmartTicket.
- **SmartTickets:** Fields: title, description, priority (`low`|`medium`|`high`|`critical`), status (`open`|`in_progress`|`resolved`|`closed`|`wont_fix`), assigned_to, due_date, resolution_notes, evidence_photos (array), related_qa, linked checklist_instance_id and checklist_item_id.
- Dashboard stat cards: Today's Progress (completed/total), Overdue count, Upcoming count, Open Tickets count, Templates count.
- Tabs: Today, Upcoming, History, Tickets.
- Category filter chips for grouping checklist types.
- Show "Manage Templates" and "+ Assign Checklist" actions in the header.
- Badge: sidebar MAY display a dot badge on the Checklists nav item.

**Must not do / constraints:**
- `educator` role MUST NOT create or edit checklist templates.
- Template edits do not retroactively update in-progress instances.
- SmartTickets are distinct from Tasks (they auto-generate from checklist failures; Tasks are manually created).

**Data entities:** ChecklistCategory, ChecklistTemplate, ChecklistSchedule, ChecklistInstance, ChecklistItemDefinition, ChecklistItemResponse, SmartTicket

**Integration dependencies:** Supabase (cron for auto-creating daily instances)

---

### 3.8 Rostering

**Route:** `/rostering`
**Rebuild priority:** Medium-High (observed confidence: 68)

**Purpose:** Weekly staff roster with room assignment, shift management, ratio compliance checking, leave tracking, and staff qualifications matrix.

**Must do:**
- Display a weekly roster grid: rows = rooms, columns = Mon–Fri.
- Three rooms observed: Joeys Nursery (0–2), Possums Toddlers (2–3), Koalas Preschool (3–5). Rooms are configurable, not hard-coded.
- Each room shows licensed capacity and educator-to-child ratio.
- Each cell shows assigned shifts or a "+ Add Shift" placeholder.
- Shift fields (*confirmed in code*): shift_date, start_time, end_time, user_id, room_id, shift_type (`regular`|`programming_time`|`break_cover`|`casual`|`training`|`admin`|`excursion`), role_required, status, break times, notes, is_published.
- Header actions: + Room, Copy Previous Week, Publish Week.
- Tabs: Weekly Roster, Compliance, Leave, Programming Time, Staff & Qualifications.
- **Compliance tab:** Calculate educator-to-child ratios per room in real time using NSW ratio rules. Flag breaches (compliant / at_minimum / breach).
- **Leave tab:** Leave request workflow — staff submit leave requests; manager/admin approves or declines. Leave status: `pending`|`approved`|`declined`|`cancelled`. Leave types: annual, sick, personal, parental, unpaid, professional development, other.
- **Staff & Qualifications tab:** Qualification matrix showing staff vs qualification types (Cert III, Diploma, ECT Degree, First Aid, CPR, Anaphylaxis, Asthma, Child Protection, WWCC, Food Safety). Each qualification has: expiry_date, status (`current`|`expiring_soon`|`expired`|`pending`|`not_applicable`).
- Casual pool management: CasualPoolMember records with availability, qualifications, agency flag, rating.
- Roster templates for repeating weekly patterns.
- Run a daily cron to flag upcoming qualification expiry.

**Must not do / constraints:**
- MUST NOT calculate pay rates, interpret awards, or export timesheets.
- Rostering shows planned hours only — no timesheet functionality.

**Data entities:** Room, RosterShift, RosterTemplate, LeaveRequest, StaffQualification, CasualPoolMember, RatioRule, ProgrammingTime

**Integration dependencies:** Supabase (cron for qualification expiry checks)

---

### 3.9 Policy Management

**Route:** `/policies`
**Rebuild priority:** High (observed confidence: 75)

**Purpose:** Policy library with draft-review-publish workflow, version history, and staff acknowledgement tracking.

**Must do:**
- Full CRUD for policies. Policy fields (*confirmed in code*): title, category_id (FK), content (rich text/markdown), summary, version (auto-incremented), status (`draft`|`under_review`|`approved`|`published`|`archived`), review_frequency (`monthly`|`quarterly`|`biannual`|`annual`|`biennial`), next_review_date, related_qa (int array), related_regulations, is_family_facing (boolean — reserved for future family portal, not currently a live feature), tags.
- Every edit MUST create a new PolicyVersion record. Previous versions must be viewable.
- Staff acknowledgement tracking: staff can acknowledge a published policy; track who has and has not acknowledged each version. Acknowledgement records include optional signature_data.
- Stat cards: Total, Published, Due for Review, Review Coming.
- Three tabs: Policy Library, Reviews, Acknowledgements.
- Filter bar: search, category dropdown, status dropdown.
- "+ New Policy" button in header.
- Flag policies whose `next_review_date` is approaching.

**Must not do / constraints:**
- `educator` role MUST NOT create or delete policies.
- `is_family_facing` is a flag for future use — do not build a family-facing view in this rebuild.

**Data entities:** PolicyCategory, Policy, PolicyVersion, PolicyAcknowledgement

**Integration dependencies:** Supabase

---

### 3.10 Registers

**Route:** `/registers`
**Rebuild priority:** High (observed confidence: 70)

**Purpose:** Configurable spreadsheet-like data registers for regulatory record-keeping (Chemical, Device, Key, Maintenance, Medication, Vehicle, Visitor).

**Must do:**
- Store register definitions with user-defined column schemas (JSONB `columns` array).
- Column types (*confirmed in code*): `text`, `number`, `date`, `dropdown`, `checkbox`, `email`, `phone`, `file`, `currency`, `url`, `textarea`.
- 7 system template registers observed: Chemical, Device, Key, Maintenance, Medication, Vehicle, Visitor. These are seeded at build time with sensible default columns.
- Register gallery shows each register as a card: icon, name, Template badge (for system templates), description, column count, entry count, column name previews, action buttons (Open, Edit, Copy, Archive).
- Each register entry stores `row_data` as JSONB keyed against the column schema.
- Allow creating custom registers in addition to the 7 system templates.
- Allow editing column definitions and archiving registers.
- "+ New Register" button in header.

**Detail view fields observed (Pass 3, entry 62):** Open button click on a register card navigated back to the register gallery in automated capture. The register gallery IS confirmed with full column detail visible (screenshot 62-register-entries.png):
- Chemical Register (10 cols): Product Name, Type, Manufacturer, SDS Available, Storage Location
- Device Register (10 cols): Device Name, Type, Serial Number, Make/Model, Purchase Date
- Key Register (7 cols): Key Number/Code, Key Type, Issued To, Date Issued, Returned
- Maintenance Register (10 cols): Date Reported, Item/Area, Description of Issue, Priority, Reported By
- Medication Register (10 cols): Child Name, Medication Name, Dosage, Frequency, Start Date
- Vehicle Register (10 cols): Registration Number, Make/Model, Year, Seating Capacity, Child Restraints Available
- Visitor Register (8 cols): Date, Visitor Name, Company/Organisation, Purpose of Visit, Time In
All 7 registers have 0 entries. The data entry table view (clicking Open on a register) was not captured.

**Must not do / constraints:**
- Register data is not linked to NQS elements or tasks by default (unlike most other entities). Registers are generic record-keeping tables.
- Do not hard-code column schemas for system registers — store them as JSONB so they can be edited.

**Data entities:** RegisterDefinition, RegisterColumnDef, RegisterEntry

**Integration dependencies:** Supabase

---

### 3.11 Document Repository

**Route:** `/documents`
**Rebuild priority:** Medium (observed confidence: 60)

**Purpose:** Central file store for QA evidence, policies, procedures, and any centre documents, tagged by Quality Area.

**Must do:**
- Support file upload via drag-and-drop or file picker. Supported types: PDF, Word, Excel, images, and other common formats.
- Store files in Supabase Storage; store metadata in a `documents` table.
- Document metadata fields (*confirmed in code*): name, file_path, file_size, file_type, qa_area (int — links to QA1–QA7), category, uploaded_by, description.
- Provide QA area filter tabs: All, General, QA1–QA7.
- Show "No documents found" empty state with upload CTA.
- "+ Upload File" button in header.
- Support full-text search within the document library.
- Extract text from uploaded PDFs using `pdf-parse`. MUST NOT attempt UTF-8 string conversion of raw binary PDF data.
- Extract text from uploaded Excel files using `exceljs`. MUST NOT return placeholder strings.
- Make extracted text available to AI search tools (`read_document_content` tool).

**Must not do / constraints:**
- Does not host video content. Video links belong in LMS module sections only.

**Data entities:** Document

**Integration dependencies:** Supabase Storage; optional SharePoint sync (see Section 3.26)

---

### 3.11b AI Document Library

**Route:** `/documents/library`
**Rebuild priority:** High (observed confidence: 72)

**Purpose:** Browsable library of documents generated by Kiros AI on request — newsletters, meeting agendas, staff agendas, and board reports. This is a separate route from the `/documents` upload repository and serves a distinct purpose.

**Must do:**
- Display all AI-generated documents from the `ai_generated_documents` table as a scrollable list.
- Filter controls: All Topics tab, All Types dropdown, search field.
- Document types observed in production (*observed*): `newsletter`, `meeting_agenda` (monthly team meeting, staff meeting), `template` (active status), `assessment`, `board_report`.
- Each document card shows: title, type badge, status badge, creation date, and action buttons (edit, share, download).
- Dedicated sidebar navigation under the Documents section: All Topics with sub-items per document type.
- Documents observed in production (Pass 3, 2026-04-19): Kiros Preschool Room Newsletter April 2026, Kiros Toddler Room Newsletter April 2026, Kiros Nursery Room Newsletter April 2026, Monthly Team Meeting Agenda May 2026, Daily Room Setup Checklist (template, active), April 2026 Staff Meeting Agenda (multiple), Board Report: National Quality Standard Progress Summary.
- The AI generates documents via the `generate_document` and `export_document` tools in Kiros AI Chat. Generated documents appear in this library automatically.
- Support SharePoint export paths (`sharepoint_folder_path`, `sharepoint_urls`) per document where SharePoint sync is configured.

**Relationship to `/documents`:**
- `/documents` — user-uploaded files (QA-area tagged, drag-and-drop). Currently empty.
- `/documents/library` — AI-generated documents (newsletters, agendas, reports). Contains real content.
- These are different tables: `/documents` reads from `documents`; `/documents/library` reads from `ai_generated_documents`.

**Must not do / constraints:**
- Do not merge these two routes. They serve different purposes and different user workflows.
- The AI Document Library is read-generated content, not user uploads.

**Data entities:** AIGeneratedDocument

**Integration dependencies:** Supabase, Anthropic API (generation), optional SharePoint (export)

---

### 3.12 Compliance Tracker

**Route:** `/compliance`
**Rebuild priority:** Critical (observed confidence: 88)

**Purpose:** Regulatory compliance tracking for specific ECEC regulations, with status management, assignee, notes, and linked guidance documents.

**Must do:**
- Track compliance items for specific regulations. Regulations observed in production: 74, 77, 84, 97(2A), 97(3)(a), 155, 156, 165, 172(3)(a) — 9 items total.
- Each compliance item shows: regulation number, description, status dropdown, assigned-to dropdown, notes, linked document buttons (Procedure Guidance, Policy, etc.).
- Status values (*confirmed in code*): `action_required`, `in_progress`, `completed`, `ongoing`.
- Summary bar: Action Required count, In Progress count, Completed count, Ongoing count.
- Allow inline editing of status, assignee, and notes.
- Regulation notes include remediation context specific to the ACECQA finding.
- `admin`, `manager`, and `ns` may edit compliance items.

**Must not do / constraints:**
- Compliance regulations are pre-seeded (the 9 known regulations). They are not created by users.
- This tracker is for regulatory compliance (specific Ed & Care regulations), distinct from NQS element ratings.

**Data entities:** ComplianceItem, Profile

**Integration dependencies:** Supabase

---

### 3.13 Forms & Templates

**Route:** `/forms`
**Rebuild priority:** Medium (observed confidence: 60)

**Purpose:** Digital form submission for 8 recurring operational form types.

**Must do:**
- Support 8 form types observed in production: Weekly Critical Reflection, Team Meeting Minutes, Emergency Drill Reflection, Family Collaboration Sheet, Performance Review, Family Satisfaction Survey, Individual Learning Profile, Casual Educator Induction.
- Each form type has its own defined field schema — MUST NOT use a single generic JSONB `data` field shared across all types.
- Form submission workflow: draft → submitted → reviewed.
- Submission fields (*confirmed in code*): form_type, data (JSONB — per-type schema enforced at application layer), submitted_by, room, status (`draft`|`submitted`|`reviewed`), reviewed_by, reviewed_at.
- Gallery view: 2-column card grid with form type icon, title, description, and "+ New" button per form type.
- Allow filtering submissions by form type and status.

**Must not do / constraints:**
- No external form integrations (no Typeform, Google Forms, etc.).
- `is_family_facing` is out of scope for this rebuild.

**Data entities:** FormSubmission

**Integration dependencies:** Supabase

---

### 3.14 Learning Management System

**Routes:** `/learning`, `/learning/library`, `/learning/pathways`, `/learning/pdp`, `/learning/matrix`, `/learning/certificates`
**Rebuild priority:** Critical (observed confidence: 88–90)

**Purpose:** Full LMS for staff professional development, compliance training, and ECEC-specific learning, with pathways, certificates, and a compliance matrix.

**Note:** The legacy `/training` route (8 modules, old UI) MUST be replaced entirely by this LMS. Do NOT carry forward the legacy `training_modules` / `training_assignments` tables.

#### 3.14.1 Learning Hub (`/learning`)

- Personal learning dashboard with stat tiles: Completed (count), In Progress (count), Overdue (count), Total Hours.
- "My Current Modules" section showing in-progress module cards.
- "Learning Priorities from QIP" accordion listing goals from the QIP that drive training requirements.
- "My Pathways" showing enrolled pathways with percentage progress.
- "Recently Completed" list.
- Team Overview tiles (role-dependent): Total Staff, Completed This Month, Overdue, Compliance Gaps.

#### 3.14.2 Module Library (`/learning/library`)

- 41 modules in production (*observed*) across 3 tiers:
  - Mandatory Compliance: 12 modules
  - Core Professional Development: 14 modules
  - Advanced / Exceeding: 15 modules
- Module fields (*confirmed in code*): title, description, tier (`mandatory`|`core`|`advanced`), related_qa (int array), related_element_codes (string array), duration_minutes, category, renewal_frequency (`annual`|`biennial`|`triennial`|`once`|null), status (`draft`|`published`|`archived`), thumbnail_url.
- Module sections (*confirmed in code*): section_type (`content`|`video`|`quiz`|`reflection`|`action_step`), title, content, video_url (external only), estimated_minutes.
- Quiz questions: question, question_type (`multiple_choice`|`true_false`|`scenario`), options array with `is_correct` and optional `explanation`, sort_order.
- Filter bar: search field, tier filter chips (Mandatory/Core/Advanced), QA area colour badges, category dropdown.
- Each module card: tier badge, QA badges, title, description, duration, enrollment status, Start/Assign buttons.
- Allow admin/manager/ns to assign modules to specific staff members.
- Allow staff to self-enrol in published modules.

**Detail view fields observed (Pass 3, entry 60):** Start/View button click on a module card did NOT navigate to a module player in automated capture. The full 41-module grid IS confirmed (screenshot 60-learning-module-detail.png). Module titles confirmed across all tiers — Tier 1 (Mandatory): ACECQA Advanced Child Safety, Child Protection and Reportable Conduct, Emergency Management Principles; Tier 2 (Core PD): Positive Educator-Child Interactions, Planning Cycle Fundamentals, Curriculum Frameworks, Family Engagement Strategies; Tier 3 (Advanced): Advanced Curriculum Design, Community Engagement Strategies, Environmental Sustainability Programming. Module player routes (`/learning/modules/[id]`) were not captured.

#### 3.14.3 Learning Pathways (`/learning/pathways`)

- 5 pathways in production (*observed*): Annual Mandatory Compliance, Exceeding NQS Preparation, Meeting QA1 Educational Program, Meeting QA2 Health & Safety, New Educator Induction Pathway.
- Pathway fields (*confirmed in code*): title, description, related_qa (int array), tier, estimated_hours, status.
- Pathway modules: ordered sequence of module IDs with `is_required` flag per module.
- Pathway enrollment: user enrolls in a pathway; progress calculated from module completions.
- Stat tiles: Total Pathways (5), Enrolled (count), Completed (count).
- Filter by tier and QA area.
- Each pathway card: tier badge, QA badges, module count, estimated hours, Enroll/Continue button.

#### 3.14.4 Personal Development Plan (`/learning/pdp`)

- Three tabs: My Goals, My Reviews, Review Staff (Review Staff visible to `ns`, `el`, `manager`, `admin`).
- PDP Goal fields (*confirmed in code*): title, description, related_qa (int array), target_date, status (`active`|`completed`|`deferred`), linked_module_ids, linked_pathway_ids, evidence_notes.
- PDP Review fields: user_id, reviewer_id, review_period, goals_summary, strengths, areas_for_growth, agreed_actions, staff_signature, reviewer_signature, status (`draft`|`submitted`|`reviewed`|`acknowledged`), reviewed_at.
- "+ Add Goal" button; empty state for no goals.

#### 3.14.5 Staff Training Matrix (`/learning/matrix`)

- Compliance matrix: staff (rows) × qualification types and mandatory training modules (columns).
- Stat tiles: Total Staff (3 in production), Fully Compliant (0), Compliance Gaps (56), Expiring Soon (0).
- Qualification Compliance table: staff vs qualification types with current/expired dot indicators.
- Mandatory Training Modules table: staff vs module completion with fraction counts.
- Legend at bottom.

#### 3.14.6 Certificates & Evidence (`/learning/certificates`)

- Three tabs: My Certificates, Upload Certificate, All Staff.
- Certificate types (*confirmed in code*): `internal` (auto-generated on module completion), `external` (manually uploaded), `qualification` (formal credential).
- Certificate status: `current`, `expiring_soon`, `expired`.
- Each certificate card: title, type badge, QA badges, status, issue date, issuer, link to source module.
- Run daily cron to check certificate expiry and flag `expiring_soon`.

**Must not do / constraints:**
- MUST NOT host video content. Video sections link to external URLs (YouTube, Vimeo) only.
- Legacy `training_modules` and `training_assignments` tables MUST NOT be carried forward.

**Data entities:** LmsModule, LmsModuleSection, LmsQuizQuestion, LmsEnrollment, LmsSectionProgress, LmsQuizResponse, LmsReflection, LmsPathway, LmsPathwayModule, LmsPathwayEnrollment, LmsPdpGoal, LmsPdpReview, LmsCertificate, StaffQualification

**Integration dependencies:** Supabase (cron for certificate expiry)

---

### 3.15 Reports & Analytics

**Routes:** `/reports`, `/reports/extract`
**Rebuild priority:** High (observed confidence: 78)

**Purpose:** NQS progress reporting, training compliance matrix, and a multi-step data extract wizard for CSV export.

#### 3.15.1 Reports Overview (`/reports`)

- Six stat tiles: Not Met (34), Met (6), Meeting (0), Exceeding (0), Actions Done (%), Compliance Open (5) — all real data observed.
- Progress by Quality Area section: lists QA1–QA7 with "actions done" fractions.
- Overdue Items panel and Due Next 14 Days panel.
- Training Completion Matrix: staff vs module completions.
- Export Data section: dropdown to select report type + Download CSV button.
- Print Report button in header.

#### 3.15.2 Data Extract Wizard (`/reports/extract`)

- Multi-step wizard: Step 1 = Select Data Source, subsequent steps for fields, filters, preview, export.
- 13 data source categories observed (*observed*): QA & Compliance (3), Tasks & Activity (4), Documents (2), Checklists (5), Policies (4), Rostering & Staff (9), Training (2), Learning Management (13), Chat & AI (3), Centre & Config (6), Registers (2).
- Show a results preview before export.
- Export to CSV, JSON, and XLSX.
- Support saving and reloading report configurations.

**Data entities:** Reads across all entities; exports are non-destructive reads.

**Integration dependencies:** Supabase

---

### 3.16 Activity Feed

**Route:** `/activity`
**Rebuild priority:** Medium (observed confidence: 55)

**Purpose:** Chronological audit log of all system actions across all users, with real-time updates.

**Must do:**
- Record all create, update, delete operations system-wide with: user_id, action (string description), entity_type, entity_id, timestamp.
- Display as a scrollable chronological feed: user avatar, name, action description, entity_type badge, relative timestamp.
- Filter tabs at top (by entity type or user).
- Subscribe to activity_log via Supabase Realtime for a live feed.
- Deduplicate INSERT events — prior implementation showed duplicate entries in the feed (*noted in CONTEXT.md*).

**Must not do / constraints:**
- Activity log is primarily for admin/manager audit use. `educator` may have read access limited to their own entries.

**Data entities:** ActivityLog

**Integration dependencies:** Supabase Realtime

---

### 3.17 Kiros AI Chat

**Route:** `/chat`
**Rebuild priority:** Critical (observed confidence: 88)

**Purpose:** Multi-turn AI assistant powered by Anthropic Claude, grounded in the centre's QIP and philosophy, with tool use for taking actions inside the portal.

**Must do:**
- Three-panel layout: left panel (conversation history list), centre panel (active conversation), right panel (agent identity card with suggested prompts).
- Left panel: list of past conversations with real titles, grouped by date. Conversations stored per user in `chat_conversations`.
- Conversation history: store full message history including tool_call and tool_result messages, not just user/assistant turns.
- Message roles (*confirmed in code*): `user`, `assistant`, `system`, `tool_call`, `tool_result`.
- AI identity card on empty conversation: "Kiros AI" with role subtitle (e.g. "ECEC Operations Expert · Approved Provider"), 4 suggested prompt chips.
- Use Anthropic Claude API. Default model: claude-opus-4. Route "simple messages" (under 50 chars matching a configured regex) to claude-sonnet-4 for cost efficiency.
- Streaming responses via SSE (Server-Sent Events).
- Extended thinking enabled (10,000 token budget).
- **Pending Action confirmation pattern:** The AI proposes write-tool actions (e.g. "Create a task for…"); the user sees an approval prompt before the action executes. Write tools MUST NOT execute without user confirmation.
- Read tools execute silently without interrupting the conversation flow.
- **Tool catalogue** (*confirmed in code*): Read tools include `search_centre_context`, `get_overdue_items`, `get_qa_progress`, `get_staff_training_status`, `get_dashboard_summary`, `get_policies`, `get_checklists`, `get_roster_data`, `get_registers`, `get_forms`, `get_learning_data`, `get_compliance_items`, `get_activity_log`, `get_documents`, `read_document_content`, `get_candidates`, `get_team_profiles`. Write tools include `create_task`, `assign_training`, `suggest_improvement`, `update_item`, `create_checklist_instance`, `generate_document`, `export_document`, `run_deep_analysis`, `delegate_to_agents`, `create_candidate_invite`, `score_candidate`.
- Enforce role-based tool access. Each tool has an `allowed_roles` list.
- **Multi-agent architecture:** 12 specialist agents (*observed*): QA1–QA7 (one per quality area), Educational Leadership Agent, Compliance Agent, Marketing Agent, Recruitment Agent, Learning Module Agent. Each has domain tags, routing keywords, tool assignments, and a priority score. The master system prompt routes to the most appropriate specialist agent.
- **Centre Context grounding:** Load `centre_context` records (QIP goals, philosophy, teaching approaches, etc.) into the AI context at query time. Retrieval by `related_qa` and `context_type`. Do NOT embed whole documents in prompts; use structured JSONB retrieval.
- **AI Learnings:** Save corrections and insights during conversations as `ai_learnings` records. Inject relevant learnings into future system prompts. Learning types: `correction`, `preference`, `domain_insight`, `process_knowledge`.
- Split system prompt into a static cached block (identity, tools, rules) and a dynamic block (learnings, context) to enable Anthropic prompt caching.
- Per-user per-minute rate limiting using Redis/Upstash. MUST NOT use an in-memory Map for rate limiting (ineffective in serverless multi-instance Vercel deployments).
- Floating AI chat bubble accessible from every page (purple, opens `/chat`).
- Conversation history confirmed working in production with real titles (*observed*): "User Inquires About Centre Context Overview", "Creating Engaging Family Newsletter for Centre", "QA1 Educational Program Status Overview Request", etc.

**Must not do / constraints:**
- Write tools MUST NOT execute without explicit user confirmation.
- User MUST NOT be able to invoke tools outside their role's `allowed_roles` list.
- `ANTHROPIC_API_KEY` MUST be server-side only; never exposed to the browser.
- Generic NQS advice is not acceptable — all responses must be grounded in centre-specific context from `centre_context` records.

**Data entities:** ChatConversation, ChatMessage, CentreContext, AiLearning, AIAgentDefinition, AIConfig, PendingAction

**Integration dependencies:** Anthropic Claude API (server-side only), Supabase, Redis/Upstash (rate limiting)

---

### 3.18 Marketing Hub

**Routes:** `/marketing`, `/marketing/content`, `/marketing/content/new`, `/marketing/calendar`, `/marketing/feed`, `/marketing/inbox`, `/marketing/comments`, `/marketing/reviews`, `/marketing/ads`, `/marketing/analytics`, `/marketing/chat`, `/marketing/settings`
**Rebuild priority:** Medium (observed confidence: 58–80; inbox highest at 80)

**Purpose:** Social media content management, inbox for Facebook Messenger/Instagram DMs, comment and review management, and a Marketing AI assistant.

#### 3.18.1 Marketing Hub Overview (`/marketing`)

- Stat tiles: Connected Accounts, Published Posts, Unread Reviews, Active Campaigns.
- Recent Content panel, Review Alerts panel, Upcoming Calendar panel.
- Connected accounts panel — shows OAuth-connected platforms.
- "+ New Content" and "Marketing AI" buttons in header.
- 1 Facebook account (Kiros Early Education) confirmed connected in production (*observed*).

#### 3.18.2 Content Management (`/marketing/content`, `/marketing/content/new`)

- Content workflow: Draft → Pending Review → Scheduled → Published.
- Tabs: All, Drafts, Pending Review, Scheduled, Published (each with counts).
- Create Content form fields: Content Type (Post, Reel, Story, Google Update, YouTube Video), optional title, main content textarea with character counter, hashtags field.
- Right sidebar on create form: Platform checkboxes (Facebook, Instagram, Google Business, YouTube), Schedule date/time picker, "Generate with Marketing AI" button, action buttons (Save Draft, Submit for Review, Publish Now).

#### 3.18.3 Content Calendar (`/marketing/calendar`)

- Monthly grid view with week/month toggle.
- Displays scheduled posts on their publish dates.
- "+ New Content" button.

#### 3.18.4 Post Feed (`/marketing/feed`)

- Displays published posts with engagement metrics per platform.
- "Sync Engagement" button to pull latest engagement data.
- Empty state when no posts published.

#### 3.18.5 Inbox (`/marketing/inbox`) — Highest value marketing feature

- Two-panel layout: conversation list (left) + message thread (right).
- Displays Facebook Messenger and Instagram DM conversations.
- 8 live conversations observed in production with real contact names.
- Each conversation shows: contact name, platform icon badge (Facebook/Instagram), timestamp, unread indicator.
- "Sync Messages" button in header.
- Select a conversation to view full message thread.

#### 3.18.6 Comments (`/marketing/comments`)

- View and reply to comments on published posts.
- Tabs: Unread, All, Replied.
- "Sync Comments" button.

#### 3.18.7 Reviews (`/marketing/reviews`)

- Manage Google Business and Facebook reviews.
- Tabs: All, Unread, Draft Response, Pending Approval, Responded.
- Draft-and-approve workflow: draft a review response → approve before posting publicly.

#### 3.18.8 Ad Campaigns (`/marketing/ads`) — Defer

- Manage Meta and Google Ads campaigns.
- Tabs: All, Active, Draft, Paused, Completed.
- Requires Meta Ads API and Google Ads API connections.
- **Rebuild priority: Low/Defer (observed confidence: 35)** — No API connections, no usage.

#### 3.18.9 Analytics (`/marketing/analytics`) — Defer

- Analytics dashboard with tabs: Overview, Facebook, Instagram, Google Business, Google Ads, GA4, YouTube.
- Time range toggle: 7 / 30 / 90 days.
- **Rebuild priority: Low/Defer (observed confidence: 30)** — No platform connections beyond Facebook; no data.

#### 3.18.10 Marketing AI (`/marketing/chat`)

- Dedicated Marketing AI chat interface, separate from main Kiros AI Chat.
- Scoped to marketing tasks: social media posts, review responses, ad copy, marketing performance analysis.
- Same conversation persistence model as main AI chat.
- 4 suggested prompts: Facebook post for NAIDOC week, draft Google review response, Instagram open day content, weekly marketing performance summary.
- Uses same Anthropic API key as main chat.

#### 3.18.11 Marketing Settings (`/marketing/settings`)

- OAuth connection management.
- Meta (Facebook & Instagram) card: shows connected account, Reconnect button.
- Google Services card: Connect button.
- Token storage MUST be encrypted at rest (Supabase Vault or column-level encryption). MUST NOT store OAuth tokens as plaintext.

**Must not do / constraints:**
- MUST NOT store OAuth tokens as plaintext in the database.
- OWNA handles billing/CCS data; Marketing has no overlap with financial data.

**Data entities:** SocialAccount (with encrypted tokens), Post, Campaign, InboxConversation, InboxMessage, Comment, Review, AnalyticsSnapshot

**Integration dependencies:** Meta (Facebook/Instagram) Graph API, Google Business Profile API, Google Analytics/GA4, Google Ads API, YouTube API. Daily cron for analytics sync and token refresh.

---

### 3.19 OWNA Integration

**Routes:** `/owna/children`, `/owna/attendance`, `/owna/staff`, `/owna/families`, `/owna/enrolments`, `/owna/health`
**Rebuild priority:** High (observed confidence: 70–78)

**Purpose:** Read-only display of live OWNA childcare management data — children, attendance, staff, families & billing, enrolments, and health & safety events.

**Must do:**
- Implement server-side proxy routes for all OWNA API calls. MUST NOT expose the OWNA API key to the browser.
- Store `OWNA_API_KEY` in environment variables only.
- Display data from 6 OWNA endpoints:

  **Children & Rooms (`/owna/children`):** 336 children observed. Stat tiles: total, present, absent/away, reported, bookings blocked, medical conditions, dietary requirements, additional needs, anaphylaxis, other. Table: name, room, age, gender, blocked days, enrolled since.

  **Attendance (`/owna/attendance`):** Currently returns HTTP 400 (bad request — likely a missing or malformed date parameter in the API call). The feature concept is valid. Fix by passing a date range parameter to the OWNA attendance endpoint. Display attendance records when working.

  **Staff (`/owna/staff`):** Long list of staff records: avatar/initial, full name, role, room assignment, employment status, start date.

  **Families & Billing (`/owna/families`):** 182 accounts, $696,167.83 outstanding billing observed. Stat tiles: total accounts, outstanding billing (currency), families, families on payment plans. Table: account name, parent names, children, outstanding balance, status.

  **Enrolment Pipeline (`/owna/enrolments`):** Pipeline stages: Enquiry / Waitlist / Enrolled with counts. Table: child name, parent name, contact email/phone, room, start date, room preferences, status badge. Hundreds of live enrolments observed.

  **Health & Safety Logs (`/owna/health`):** 65 events observed (61 accidents, 3 medications). Filter controls for Incidents, Accidents, Medication with date range picker. Table: date, child name, staff, location, injury/incident type, treatment taken, parent notified.

- Handle OWNA API errors gracefully with an explicit error state (icon + message + Retry button). MUST NOT show empty tables when the API is unavailable.

**Must not do / constraints:**
- MUST NOT write any data back to OWNA. Read-only proxy only.
- Do not store OWNA data in the Kiros database — fetch and display in real time.

**Data entities:** No persistent entities in Kiros DB; display only.

**Integration dependencies:** OWNA childcare management API (`OWNA_API_KEY`)

---

### 3.20 Recruitment

**Routes:** `/candidates`, `/candidates/positions`
**Rebuild priority:** Medium (observed confidence: 52–55)

**Note:** `/recruitment` root route is a 404 in the current system — it is a nav group heading, not a link. The actual routes are `/candidates` and `/candidates/positions`. This must be fixed in the rebuild (either add a redirect or rename the nav group).

**Purpose:** Candidate pipeline management and position tracking for ECEC staff hiring.

**Must do:**
- **Candidates (`/candidates`):** Candidate list with pipeline tabs: All, Invited, In Progress, Completed, Approved, Rejected.
  - Positions dropdown filter.
  - Candidate fields (*confirmed in code*): position_id, name, email, phone, application_token, pipeline status, disc_profile (JSONB), score.
  - "New Position" and "Invite Candidate" buttons in header.
  - Provide a token-based public application form at `/apply/[token]` for unauthenticated access.
- **Positions (`/candidates/positions`):** Position management.
  - Position fields: title, department, description, status (`open`|`draft`|`closed`), candidate_count.
  - Action buttons per row: Edit, Close Position, Questions (linked question bank).
  - "+ New Position" button in header.
- Question bank: scenario question templates for interview use.
- AI scoring of candidate responses against position requirements.
- Candidate detail with tabs: Profile, Questionnaire, DISC Results, Interview Notes, Onboarding, Activity.
- DISC personality assessment: calculate profile from questionnaire responses.
- On hire (Onboarding tab): create Supabase Auth user and `profiles` record for the new staff member using the service role client.

**Detail view fields observed (Pass 3, entry 61):** Candidate row click did NOT navigate to a profile page in automated capture. The full 14-candidate list IS confirmed (screenshot 61-candidate-profile.png). All 14 are test/UAT data: "Deep UAT Candidate 1776..." and "Test Candidate 1776..." with example.com emails, position "Deep UAT Position / QA Test Position" (educator role), all created 15 Apr 2026, all with "invited" status. Candidate profile pages (`/candidates/[id]`) were not captured.

**Must not do / constraints:**
- MUST NOT integrate with external ATS or payroll systems.
- Current production data (14 candidates, 18 positions) is entirely test/UAT data — rebuild with a clean slate.

**Data entities:** RecruitmentPosition, RecruitmentCandidate, RecruitmentQuestion

**Integration dependencies:** Supabase (service role for user creation), Anthropic API (AI scoring)

---

### 3.21 Programming & Pedagogy

**Route:** `/programming`
**Rebuild priority:** High (observed confidence: 75)

**Purpose:** Educational documentation hub for ECEC pedagogical planning — weekly plans, learning stories, observations, critical reflections, and PDSA cycle tracking.

**Must do:**
- Display four quick-create action buttons with colour-coded borders: New Weekly Plan (blue), New Learning Story (pink), New Observation (amber), New Critical Reflection (purple).
- Stat tiles: Docs This Month (15 observed), Active Rooms (3), Recent Documents (count), QA1 Active Goals (count).
- Programming Cycle section: Plan-Do-Study-Act (PDSA) phases as colour-coded cards with descriptions.
- Recent Programming Documents list with Room and Type filter dropdowns.
- Document types: Weekly Plan, Learning Story, Observation, Critical Reflection, Board Report.
- 2 Board Report documents dated 12 Apr 2026 observed in production (*observed* — confirms this is real, not test data).
- Single-page hub (no sub-routes observed).
- This feature is accessible to `el` (Educational Leader) and above.

**Must not do / constraints:**
- This is ECEC educational documentation, not general document storage. These docs are distinct from the `/documents` file repository.

**Data entities:** ProgrammingDocument (document_type, title, room, content, created_by, related_qa)

**Integration dependencies:** Supabase

---

### 3.22 Approved Provider Dashboard

**Route:** `/ap-dashboard`
**Rebuild priority:** Critical (observed confidence: 88)

**Purpose:** Executive summary dashboard for the Approved Provider (`admin`) role — NQS status, QIP progress, staff compliance, and operational health in one printable view.

**Must do:**
- Top stat tiles: NQS Rating Status (text, e.g. "Working Towards"), Elements Met (fraction e.g. 6/40), QIP Progress (percentage, 11% observed), Compliance Alerts (count, 17 observed).
- QIP Goals Progress section: all 46 goals listed with progress bars and QA badges.
- Staff & Training panel: qualification compliance per staff member.
- Operational Health panel: checklist completion and open ticket counts.
- Quality Area Breakdown grid: QA1–QA7 each with met count, QIP goal count, progress percentage.
- Print button in header for a print-friendly view.
- Restricted to `admin` role only.

**Must not do / constraints:**
- MUST NOT be visible to `manager`, `ns`, `el`, or `educator` roles.
- Multi-centre support is out of scope.

**Data entities:** QAElement, QIPGoal, LmsCertificate, StaffQualification, ChecklistInstance, SmartTicket, ComplianceItem

**Integration dependencies:** Supabase

---

### 3.23 Admin — User Management

**Route:** `/admin/users`
**Rebuild priority:** Critical (observed confidence: 80)

**Purpose:** Create and manage user accounts, assign roles, and control page-level access permissions.

**Must do:**
- User table columns: Name, Email, Role (dropdown), Pages (link showing "All (admin)" or page count), Joined date.
- Role dropdown values: Approved Provider (`admin`), Operations Manager (`manager`), Nominated Supervisor (`ns`), Educational Leader (`el`), Educator (`educator`).
- Pages link opens a multi-select page permission editor. Setting to null/empty = all pages.
- "+ Add User" button: creates Supabase Auth user and `profiles` record via service role client.
- 3 users in production: Rony Kirollos (Approved Provider, All pages), Annette Ballard (Nominated Supervisor, All pages), Justina Abadier (Educator, 11 pages).
- Allow editing role and allowed_pages for any user.

**Must not do / constraints:**
- `admin` role bypasses `allowed_pages` entirely — never restrict an admin via this mechanism.
- Restricted to `admin` role.

**Data entities:** Profile, auth.users

**Integration dependencies:** Supabase (service role for user creation)

---

### 3.24 Admin — AI Context Manager

**Route:** `/admin/context`
**Rebuild priority:** High (observed confidence: 82)

**Purpose:** Manage the centre context records that ground AI responses in centre-specific QIP goals, philosophy, teaching approaches, and policies.

**Must do:**
- CRUD for centre context records.
- Context record fields (*confirmed in code*): context_type (12 types), title, content, related_qa (int array), related_element_codes (string array), source_quote, ai_generated (boolean), is_active.
- Context types: `qip_goal`, `qip_strategy`, `philosophy_principle`, `policy_requirement`, `procedure_step`, `service_value`, `teaching_approach`, `family_engagement`, `inclusion_practice`, `safety_protocol`, `environment_feature`, `leadership_goal`.
- Display as a dense scrollable list of records with context_type badge, title, content preview, QA badges, action buttons.
- Support document upload with AI-assisted context extraction (chunk policy/QIP documents into context records).
- Filter by context_type and related_qa.
- Confirm context records are loaded and injected into AI responses at query time.

**Must not do / constraints:**
- Context records are not embedded documents with vector search — they are structured JSONB records retrieved by type/QA filters. The corpus is small enough that full vector RAG is not needed.

**Data entities:** CentreContext, Document

**Integration dependencies:** Supabase, Anthropic API (for extraction)

---

### 3.25 Admin — AI Agents

**Route:** `/admin/agents`
**Rebuild priority:** High (observed confidence: 80)

**Purpose:** Manage the master Kiros AI system prompt and the 12 specialist domain agents.

**Must do:**
- Master system prompt editor with tabs: System Prompt, Role Instructions, Settings.
- Display full editable master system prompt text.
- Specialist Agents section: list of all agents with domain tags, tool counts, priority scores, status (active/inactive).
- 12 agents in production: QA1 through QA7 (one per quality area), Educational Leadership Agent, Compliance Agent, Marketing Agent, Recruitment Agent, Learning Module Agent.
- Per-agent: name, description, domain tags, routing keywords, available_tools array, priority score, is_active flag.
- Actions per agent: Disable, Edit, Delete.
- "+ Add Agent" capability.
- Total / Active / Inactive counts in header.

**Data entities:** AIAgentDefinition

**Integration dependencies:** Supabase, Anthropic API (for test runner)

---

### 3.26 Admin — AI Configuration

**Route:** `/admin/ai-config`
**Rebuild priority:** High (observed confidence: 75)

**Purpose:** Comprehensive AI behaviour configuration covering model selection, token limits, extended thinking, tool permissions, cron settings, and all other AI feature flags.

**Must do:**
- 15 configuration tabs observed in production: Model & Thinking, Chat, Agent Defaults, Uploads, Learning, Brand, Document Styling, Tool Permissions, Display, Marketing, Widget, Reports, Cron & Jobs, Service Details, System.
- Key settings from Model & Thinking tab: Chat Max Tokens (16384), Default Model (opus), Opus Model ID, Sonnet Model ID, Simple Message Max Length (50 chars), Simple Message Regex, Thinking Budget (10000 tokens), Extended Thinking toggle (enabled).
- Store all AI config as key-value records in an `ai_config` table.
- Changes take effect immediately without a deployment.
- **Brand Configuration tab** (confirmed from Pass 3, screenshot 51f): Must provide a UI for editing the per-centre branding data model stored under `brand.*` keys. Required fields: Centre Name (`brand.centre_name`), Centre Name Uppercase (`brand.centre_name_upper`), Entity Name (`brand.entity_name`), Primary Colour (`brand.primary_colour`, hex picker), Gold/Accent Colour (`brand.gold_colour`, hex picker), Location (`brand.location`), QA Area Colours (`brand.qa_colours`, JSON hex array for QA1–QA7), SE Number (`brand.se_number`), Document Tagline (`brand.tagline`). See Section 4.0 for the complete Brand Configuration data model with current production values.
- **System tab** (confirmed from Pass 3, screenshot 51o): Must expose the QIP scoring formula weights as configurable fields — `dashboard.qip_weight_elements` (0.4), `dashboard.qip_weight_tasks` (0.3), `dashboard.qip_weight_compliance` (0.2), `dashboard.qip_weight_training` (0.1). Must also expose mandatory qualification types array (`compliance.mandatory_qualifications`) and integration endpoints (`integration.owna_api_url`, `integration.owna_centre_id`).

**Data entities:** AIConfig (key-value store)

**Integration dependencies:** Supabase

---

### 3.27 Admin — AI System Prompts

**Route:** `/admin/ai-prompts`
**Rebuild priority:** Medium (observed confidence: 65)

**Purpose:** Modular prompt section editor for controlling AI behaviour with role-specific sections that assemble at runtime.

**Must do:**
- Manage prompt sections with fields: section_key, content, is_active, order_index, section_type (Identity, Expertise, Role Instructions, Response Rules, Document Templates, Custom), target_role (All / Global / per-role).
- Role-specific sections load only for matching user roles.
- Sections assemble at runtime into the full system prompt.
- Version-controlled edits.
- "Preview Full Prompt" button to show assembled result.
- "+ Add Section" button.
- Stat tiles: Total Sections, Active, Inactive.
- Filter by section type and role.
- Currently 0 sections in production (*observed* — the architecture exists but is not yet populated).

**Data entities:** AISystemPrompt

**Integration dependencies:** Supabase

---

### 3.28 Admin — Notifications

**Route:** `/admin/notifications`
**Rebuild priority:** Low (observed confidence: 55)

**Purpose:** User notification preferences for in-app alert triggers.

**Must do:**
- Three toggle preferences per user (*observed*): notify on comments, notify on status changes, notify on task/training assignments.
- All three default to enabled.
- Save Settings button.

**Must not do / constraints:**
- No email or SMS notifications in this rebuild. In-app flags only.

**Data entities:** Profile (notify_comments, notify_status_changes, notify_assignments boolean fields)

**Integration dependencies:** Supabase

---

### 3.29 Admin — SharePoint Integration

**Route:** `/admin/sharepoint`
**Rebuild priority:** Low/Defer (observed confidence: 40)

**Purpose:** One-way document sync from Microsoft SharePoint into the Kiros document library.

**Must do:**
- OAuth2 connection to Microsoft Graph using `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`.
- Site URL configuration and folder browser tree.
- Sync documents from SharePoint into the `documents` table and Supabase Storage.
- Sync history log.
- Daily cron to sync new/updated documents.

**Must not do / constraints:**
- MUST NOT write documents back to SharePoint from Kiros.
- Store Microsoft OAuth tokens encrypted (not plaintext).
- **Currently not configured in production** — integration-blocked without Microsoft credentials.

**Data entities:** SharepointCredential (encrypted tokens), Document (synced_from_sharepoint flag)

**Integration dependencies:** Microsoft Graph API / SharePoint

---

### 3.30 Resources

**Route:** `/resources`
**Rebuild priority:** Low (observed confidence: 45)

**Purpose:** Curated directory of external ECEC resource links, organised by Quality Area.

**Must do:**
- Display resource cards grouped by: General Resources, QA1–QA7.
- Each card: title, source organisation, brief description, category badge, external link.
- Content from ACECQA, NSW ELC, AERO, CELA, UOW, and other sector bodies.
- Resources are seeded static content — no user CRUD needed.

**Must not do / constraints:**
- Resources are static content. Do not build user-editable resource management for the core rebuild.

**Data entities:** Resource (seeded)

**Integration dependencies:** None (external links open in new tab)

---

### 3.31 User Guide

**Route:** `/guide`
**Rebuild priority:** Defer (observed confidence: 35)

**Purpose:** Static in-app user guide covering major feature areas with annotated screenshots and explanatory text.

**Recommendation:** In a rebuild, replace this with contextual tooltips and onboarding flows rather than a static scrollable page. If retained, it should be generated from documentation, not hard-coded in the codebase.

---

## 4. Data Model

Core entities with key fields, relationships, and notes on data quality observed in production.

**Schema verified:** Live database queried directly 2026-04-19. All table names and column names in this section are confirmed from the live Supabase schema — not inferred from TypeScript types or migrations. See Section 4.11 for a summary of corrections made.

### 4.0 Brand Configuration

The per-centre branding data model is stored in the `ai_config` table under the `brand.*` config key namespace. Fields confirmed from the Admin → AI Config → Brand tab (screenshot 51f-ai-config-brand.png, 2026-04-19):

| Config Key | Current Value | Purpose |
|---|---|---|
| `brand.centre_name` | `Kiros Early Education` | Display name used in AI responses and UI headings |
| `brand.centre_name_upper` | `KIROS EARLY EDUCATION` | Uppercase variant for document headers |
| `brand.entity_name` | `HWAW Kirollos Childcare Pty Ltd` | Legal entity name for formal documents and invoices |
| `brand.primary_colour` | `#470DA8` | Primary brand purple (matches `--primary` CSS custom property) |
| `brand.gold_colour` | `#EDC430` | Gold accent colour (matches `kiros.gold` Tailwind token) |
| `brand.location` | `Blackett, NSW` | Centre location for document headers and AI context |
| `brand.qa_colours` | `["#e74c3c","#e67e22","#2ecc71","#3498db","#9b59b6","#1abc9c","#34495e"]` | Hex colour array for QA1–QA7 badges (index 0 = QA1) |
| `brand.se_number` | `SE-00017066` | ACECQA Service Establishment number for document footers |
| `brand.tagline` | `Generated by Kiros AI Assistant` | Footer text appended to all AI-generated documents |

**Notes for rebuild:**
- All brand fields are stored as rows in `ai_config` (config_key, config_value). Not a separate table.
- For multi-tenant scenarios, this brand data set is the complete per-centre theming configuration. CSS variable overrides (`--primary`, `--sidebar-primary`, `--ring`) plus this brand data covers all runtime customisation.
- `brand.qa_colours` is a JSON array ordered QA1 through QA7. Inject at runtime into the CSS variable `--qa-[n]-colour` or apply directly to badge components.
- `brand.se_number` and `brand.entity_name` appear in regulatory and formal documents generated by the AI. They MUST be accurate — incorrect values produce documents with wrong legal entity names.

**Currently orphaned fields (saves to DB but no feature code reads them yet — confirmed in code audit 2026-04-19):** `brand.centre_name_upper`, `brand.entity_name`, `brand.se_number`, `brand.location`, `brand.qa_colours`. Only `brand.centre_name`, `brand.primary_colour`, `brand.gold_colour`, and `brand.tagline` are actively consumed by production code.

---

### 4.1 Core Quality Management

| Entity | Table | Key Fields | Relationships | Data Quality |
|---|---|---|---|---|
| `Centre` | `service_details` (KV) | key, value, label, category | — | Single centre; no Centre table — stored as KV records |
| `Profile` | `profiles` | id (auth UUID), email, full_name, role (`admin`\|`manager`\|`ns`\|`educator`\|`approved_provider`), avatar_url, allowed_pages (text[]), notify_comments, notify_status_changes, notify_assignments | Links to auth.users; used as created_by/assigned_to across all entities | 3 real users in production |
| `QAElement` | `qa_elements` | element_code (unique, e.g. `1.1.1`), qa_number (1–7), qa_name, standard_number, standard_name, element_name, concept, current_rating (`not_met`\|`met`), target_rating, status (`not_started`\|`in_progress`), assigned_to, officer_finding, our_response, actions_taken, meeting_criteria, exceeding_criteria, training_points, due_date, notes | FK: assigned_to → Profile | 40 records, real data |
| `QIPGoal` | `centre_context` (virtual) | No separate table. QIP goals are stored in `centre_context` where `context_type = 'qip_goal'`. Fields: context_type, title, content, related_qa (int[]), related_element_codes (text[]), source_quote, ai_generated, is_active | FK: document_id → Document (optional) | 46 qip_goal records in centre_context; real data |
| `ElementAction` | `element_actions` | element_id (FK → qa_elements), title, description, steps (text[]), prerequisites (text[]), evidence_required, evidence_files (text[]), status, assigned_to, due_date, sort_order | FK: element_id → QAElement; assigned_to → Profile | 2+ records; improvement actions attached to NQS elements |
| `Task` | `tasks` | title, description, priority, status (`todo`\|`in_progress`\|`review`\|`done`), assigned_to, created_by, qa_element_id, due_date, completed_at, sort_order | FK: assigned_to/created_by → Profile; optional FK: qa_element_id → QAElement | 22 tasks, real data (current data has only todo/done; in_progress and review are valid enum values) |
| `Comment` | `comments` | content, user_id, entity_type, entity_id | Polymorphic: entity_type = 'element'\|'task'\|'document'\|'training' | Counts visible on task cards |
| `ComplianceItem` | `compliance_items` | regulation (code), description, status, assigned_to, due_date, notes, evidence | FK: assigned_to → Profile | 9 items, real data |

### 4.2 Checklists

| Entity | Table | Key Fields | Relationships | Data Quality |
|---|---|---|---|---|
| `ChecklistCategory` | `checklist_categories` | name, description, icon, color, sort_order | Parent of ChecklistTemplate | Seeded |
| `ChecklistTemplate` | `checklist_templates` | name, description, category_id, frequency, frequency_days, frequency_day_of_month, frequency_month, items (JSONB), related_qa (int[]), assignable_roles, is_system_template, status | FK: category_id → ChecklistCategory | 19 templates, no active assignments |
| `ChecklistSchedule` | `checklist_schedules` | template_id, assigned_to, assigned_role, due_time, auto_create, status | FK: template_id → ChecklistTemplate | No active schedules |
| `ChecklistInstance` | `checklist_instances` | template_id, schedule_id, name, due_date, due_time, status, assigned_to, completed_by, completed_at, responses (JSONB), items_snapshot (JSONB), notes, total_items, completed_items, failed_items, event_type, event_description | FK: template_id; assigned_to; completed_by → Profile | No active instances |
| `SmartTicket` | `smart_tickets` | checklist_instance_id, checklist_item_id, title, description, priority, status, assigned_to, resolution_notes, resolved_by, resolved_at, evidence_photos (text[]), related_qa, due_date | FK: checklist_instance_id; assigned_to/resolved_by → Profile | 0 open tickets |

### 4.3 Rostering

| Entity | Table | Key Fields | Relationships | Data Quality |
|---|---|---|---|---|
| `Room` | `rooms` | name, age_group, licensed_capacity, ratio_children, ratio_educators, color, sort_order, is_active | — | 3 rooms seeded: Joeys (0-2), Possums (2-3), Koalas (3-5) |
| `RosterShift` | `roster_shifts` | shift_date, start_time, end_time, user_id, room_id, shift_type, role_required, status, break_start, break_end, notes, template_id, is_published, published_at, published_by | FK: user_id → Profile; room_id → Room | 0 shifts |
| `RosterTemplate` | `roster_templates` | name, description, shifts (JSONB), is_active | — | Empty |
| `StaffQualification` | `staff_qualifications` | user_id, qualification_type, certificate_number, issuing_body, issue_date, expiry_date, status, document_url, notes | FK: user_id → Profile | Data in matrix view |
| `LeaveRequest` | `leave_requests` | user_id, leave_type, start_date, end_date, is_partial, partial_start_time, partial_end_time, status, reason, approved_by, approved_at, decline_reason, coverage_arranged, covering_user_id, notes | FK: user_id/approved_by → Profile | 0 requests |
| `CasualPool` | `casual_pool` | user_id (optional), full_name, email, phone, qualification_level, has_first_aid, has_wwcc, wwcc_expiry, preferred_rooms, preferred_age_groups, availability (JSONB), rating, total_shifts, last_shift_date, is_agency, agency_name, hourly_rate, status, notes | — | Empty |
| `RatioRule` | `ratio_rules` | state, age_group, children_per_educator, description | — | Seeded for NSW |
| `ProgrammingTime` | `programming_time` | user_id, week_starting, planned_hours, actual_hours, covering_shift_ids, status, notes | FK: user_id → Profile | Empty |
| `StaffAvailability` | `staff_availability` | user_id, day_of_week, start_time, end_time, availability_type, effective_from, effective_until, notes | FK: user_id → Profile | Empty |
| `StaffDiscProfile` | `staff_disc_profiles` | user_id, disc_d, disc_i, disc_s, disc_c, primary_type, secondary_type, communication_style, conflict_approach, leadership_tendency, motivational_drivers, stress_responses, full_analysis, completed_at | FK: user_id → Profile | Empty (populated via recruitment flow) |

### 4.4 Policies & Registers

| Entity | Table | Key Fields | Relationships | Data Quality |
|---|---|---|---|---|
| `PolicyCategory` | `policy_categories` | name, description, icon, sort_order | Parent of Policy | Seeded |
| `Policy` | `policies` | title, category_id, content, summary, version, status, review_frequency, next_review_date, last_reviewed_at, last_reviewed_by, approved_by, approved_at, published_at, related_qa (int[]), related_regulations, created_by, owner_id, is_family_facing, tags (text[]) | FK: category_id; created_by/owner_id → Profile | 0 policies |
| `PolicyVersion` | `policy_versions` | policy_id, version, content, change_summary, created_by | FK: policy_id → Policy | Empty |
| `PolicyAcknowledgement` | `policy_acknowledgements` | policy_id, user_id, version_acknowledged, acknowledged_at, signature_data | FK: policy_id → Policy; user_id → Profile | Empty |
| `Acknowledgement` | `acknowledgements` | user_id, entity_type, entity_id, acknowledged_at | Polymorphic general acknowledgement (not policy-specific) | Empty |
| `RegisterDefinition` | `register_definitions` | name, description, icon, columns (JSONB), is_system_template, status | FK: created_by → Profile | 7 system templates, 0 entries |
| `RegisterEntry` | `register_entries` | register_id, row_data (JSONB), sort_order, created_by, updated_by | FK: register_id → RegisterDefinition | Empty |
| `FormSubmission` | `form_submissions` | form_type, data (JSONB), submitted_by, room, status, reviewed_by, reviewed_at | FK: submitted_by/reviewed_by → Profile | Empty |

### 4.5 Learning Management System

| Entity | Table | Key Fields | Relationships | Data Quality |
|---|---|---|---|---|
| `LmsModule` | `lms_modules` | title, description, tier, related_qa (int[]), related_element_codes (text[]), duration_minutes, category, renewal_frequency, status, thumbnail_url | — | 41 modules published |
| `LmsModuleSection` | `lms_module_sections` | module_id, sort_order, section_type, title, content, video_url, estimated_minutes | FK: module_id → LmsModule | Populated |
| `LmsModuleCentreContent` | `lms_module_centre_content` | module_id, context_id, content_type, title, content, sort_order, is_active, generated_at | FK: module_id → LmsModule; context_id → CentreContext | AI-generated centre-specific content per module |
| `LmsQuizQuestion` | `lms_quiz_questions` | section_id, question, question_type, options (JSONB with is_correct flag per option), sort_order | FK: section_id → LmsModuleSection | Populated |
| `LmsEnrollment` | `lms_enrollments` | user_id, module_id, status, assigned_by, due_date, started_at, completed_at, score | FK: user_id/assigned_by → Profile; module_id → LmsModule | Real enrollment data (3 staff) |
| `LmsSectionProgress` | `lms_section_progress` | enrollment_id, section_id, completed, completed_at | FK: enrollment_id | Tracked |
| `LmsQuizResponse` | `lms_quiz_responses` | enrollment_id, question_id, selected_option, is_correct, answered_at | FK: enrollment_id | Tracked |
| `LmsReflection` | `lms_reflections` | enrollment_id, section_id, response, submitted_at | FK: enrollment_id | Some populated |
| `LmsPathway` | `lms_pathways` | title, description, related_qa (int[]), tier, estimated_hours, status | — | 5 pathways |
| `LmsPathwayModule` | `lms_pathway_modules` | pathway_id, module_id, sort_order, is_required | FK: both → respective tables | Configured |
| `LmsPathwayEnrollment` | `lms_pathway_enrollments` | user_id, pathway_id, status, started_at, completed_at | FK: user_id → Profile; pathway_id → LmsPathway | 1 enrolled |
| `LmsPdpGoal` | `lms_pdp_goals` | user_id, title, description, related_qa (int[]), target_date, status, linked_module_ids, linked_pathway_ids, evidence_notes | FK: user_id → Profile | Empty (0 goals) |
| `LmsPdpReview` | `lms_pdp_reviews` | user_id, reviewer_id, review_period, goals_summary, strengths, areas_for_growth, agreed_actions, staff_signature, reviewer_signature, status, reviewed_at | FK: user_id/reviewer_id → Profile | Empty |
| `LmsCertificate` | `lms_certificates` | user_id, title, certificate_type, issuer, issue_date, expiry_date, file_path, module_id, related_qa (int[]), status | FK: user_id → Profile; module_id → LmsModule | 1 certificate |

### 4.6 AI Layer

| Entity | Table | Key Fields | Relationships | Data Quality |
|---|---|---|---|---|
| `ChatConversation` | `chat_conversations` | user_id, title, is_active | FK: user_id → Profile | Real conversation history |
| `ChatMessage` | `chat_messages` | conversation_id, role (`user`\|`assistant`\|`tool_call`\|`tool_result`), content, metadata (JSONB) | FK: conversation_id → ChatConversation | Real messages |
| `CentreContext` | `centre_context` | document_id, context_type (`qip_goal`\|`qip_strategy`\|`philosophy_principle`\|`teaching_approach`\|`policy_requirement`\|`safety_protocol`\|…), title, content, related_qa (int[]), related_element_codes (text[]), source_quote, ai_generated, is_active | Optional FK: document_id → Document | 127 records: 46 qip_goal, 8 qip_strategy, 5 philosophy_principle, and others |
| `AIAgentDefinition` | `ai_agent_definitions` | name, description, system_prompt, available_tools (text[]), model, max_iterations, temperature, token_budget, domain_tags, routing_keywords, routing_description, priority, version, is_active | — | 12 agents configured |
| `AIConfig` | `ai_config` | config_key, config_value, value_type, category, label, description, validation_min, validation_max | — | 15 config tabs worth of settings |
| `AISystemPrompt` | `ai_system_prompts` | section, role, title, template, variables (JSONB), sort_order, version, is_active | — | 0 sections (feature built, not populated) |
| `AILearning` | `ai_learnings` | learning_type, category, title, content, original_context, source_conversation_id, learned_from_user_id, learned_from_role, applies_to_roles (text[]), confidence, times_reinforced, times_contradicted, last_used_at, is_active, superseded_by, tags, qa_areas, expires_at | — | Some populated during chat sessions |
| `AIAgentSession` | `ai_agent_sessions` | conversation_id, message_id, agent_id, agent_name, task_description, context, result, status, tokens_used, started_at, completed_at | FK: conversation_id → ChatConversation | Tracks per-agent task executions |
| `AIAgentFeedback` | `ai_agent_feedback` | agent_definition_id, agent_name, conversation_id, session_id, query_summary, agent_response_summary, feedback_type, correction_detail, user_id, response_quality, tokens_used, duration_ms | FK: agent_definition_id → AIAgentDefinition | Agent quality feedback |
| `AIAgentPerformance` | `ai_agent_performance` | agent_name, agent_definition_id, total_interactions, accepted_count, corrected_count, rejected_count, supplemented_count, escalated_count, avg_quality, acceptance_rate, avg_tokens, avg_duration_ms, last_interaction | Aggregated view | Agent performance metrics |
| `AIGeneratedDocument` | `ai_generated_documents` | conversation_id, message_id, title, document_type, topic_folder, markdown_content, json_metadata, sharepoint_folder_id, sharepoint_folder_path, sharepoint_urls, sharepoint_item_ids, format_variants, content_hash, version, sync_status | FK: conversation_id → ChatConversation | 15 documents (Board Reports, programming docs) |
| `AIDocumentStyle` | `ai_document_styles` | format, styles (JSONB), updated_at | — | Document formatting config |
| `AIToolPermission` | `ai_tool_permissions` | tool_name, tool_type, allowed_roles (text[]), description, is_active | — | Tool access control |
| `AISuggestion` | `ai_suggestions` | target_role, target_user_id, suggestion_type, title, content, action_type, action_payload (JSONB), related_qa (int[]), status | FK: target_user_id/reviewed_by → Profile | Legacy entity — do NOT carry forward |

### 4.7 Recruitment

| Entity | Table | Key Fields | Relationships | Data Quality |
|---|---|---|---|---|
| `RecruitmentPosition` | `recruitment_positions` | title, role, room, description, requirements, qualifications_required, status, question_bank (JSONB), personality_questions (JSONB) | — | 18 test/UAT records |
| `RecruitmentCandidate` | `recruitment_candidates` | position_id, full_name, email, phone, qualifications, experience_years, cover_letter, resume_url, access_token, status, knowledge_responses (JSONB), knowledge_score, knowledge_completed_at, personality_responses (JSONB), disc_profile (JSONB), personality_analysis, team_fit_analysis, overall_rank, ai_recommendation, reviewer_notes, reviewed_by, reviewed_at, referred_by, progress | FK: position_id → RecruitmentPosition | 14 test/UAT records |
| `RecruitmentQuestionTemplate` | `recruitment_question_templates` | category, role_type, question, question_type, options (JSONB), correct_answer, scoring_rubric, time_limit_seconds, difficulty, source, tags, is_active, sort_order | — | Question bank |
| `StaffDiscProfile` | `staff_disc_profiles` | user_id, disc_d, disc_i, disc_s, disc_c, primary_type, secondary_type, communication_style, conflict_approach, leadership_tendency, motivational_drivers, stress_responses, full_analysis, completed_at | FK: user_id → Profile | Populated from recruitment or standalone assessment |

### 4.8 Marketing

All marketing tables use the `marketing_` prefix. The marketing module also includes AI chat (parallel to the main Kiros AI chat) stored in `marketing_conversations` and `marketing_messages`.

| Entity | Table | Key Fields | Relationships | Data Quality |
|---|---|---|---|---|
| `MarketingSocialAccount` | `marketing_social_accounts` | platform, platform_account_id, account_name, access_token (encrypted), refresh_token (encrypted), token_expires_at, scopes, metadata, status, connected_by | — | 1 Facebook account connected |
| `MarketingContent` | `marketing_content` | content_type, title, body, media_urls (text[]), media_storage_paths (text[]), platforms (text[]), status, scheduled_at, published_at, platform_post_ids (JSONB), approved_by, approved_at, rejection_note, ai_generated, ai_conversation_id, ad_campaign_id, hashtags, metadata | — | 0 posts |
| `MarketingAdCampaign` | `marketing_ad_campaigns` | platform, platform_campaign_id, name, objective, status, budget_type, budget_amount, budget_currency, start_date, end_date, target_audience (JSONB), approved_by, approved_at, metadata | — | 0 campaigns |
| `MarketingInboxMessage` | `marketing_messages_inbox` | platform, thread_id, sender_id, sender_name, sender_avatar_url, message_text, media_url, direction, platform_message_id, is_read, replied_at, replied_by, metadata, message_time | — | Real inbox messages from connected accounts |
| `MarketingComment` | `marketing_comments` | platform, post_id, content_id, comment_id, parent_comment_id, author_name, author_id, author_avatar_url, comment_text, like_count, is_hidden, is_read, reply_text, replied_at, replied_by, comment_time | — | 0 (no posts published) |
| `MarketingReview` | `marketing_reviews` | platform, platform_review_id, reviewer_name, rating, review_text, response_text, response_status, response_drafted_by, response_approved_by, response_published_at, ai_draft_response, metadata | — | 0 reviews |
| `MarketingAnalyticsCache` | `marketing_analytics_cache` | platform, metric_type, date_range_start, date_range_end, data (JSONB), fetched_at, expires_at | — | Empty |
| `MarketingContentCalendar` | `marketing_content_calendar` | title, description, date, time, calendar_type, content_id, campaign_id, platforms (text[]), status, color | FK: content_id → MarketingContent | Empty |
| `MarketingPostEngagement` | `marketing_post_engagement` | content_id, platform, platform_post_id, likes, comments, shares, reach, impressions, saves, clicks, engagement_rate, last_synced_at | FK: content_id → MarketingContent | Empty |
| `MarketingConversation` | `marketing_conversations` | user_id, title, is_active | FK: user_id → Profile | AI marketing chat conversations |
| `MarketingMessage` | `marketing_messages` | conversation_id, role, content, metadata (JSONB) | FK: conversation_id → MarketingConversation | AI marketing chat messages |

### 4.9 Other Core Entities

| Entity | Table | Key Fields | Notes |
|---|---|---|---|
| `Document` | `documents` | name, file_path (Supabase Storage), file_size, file_type, qa_area, category, uploaded_by, description | 0 documents in document repo; AI-generated docs are in `ai_generated_documents` |
| `ActivityLog` | `activity_log` | user_id, action, entity_type, entity_id, details (JSONB), created_at | Real entries; subscribe via Realtime |
| `Resource` | `resources` | title, url, description, qa_area, category, sort_order | Seeded static content |
| `ServiceDetail` | `service_details` | key, value, label, category | KV store for centre settings (philosophy quote, centre name, etc.) |
| `Tag` | `tags` | name, color, category | Tag definitions for the tagging system |
| `EntityTag` | `entity_tags` | entity_type, entity_id, tag_id | Polymorphic tag assignments |
| `SharepointConnection` | `sharepoint_connection` | tenant_id, client_id, site_id, drive_id, access_token (encrypted), refresh_token (encrypted), token_expires_at, site_url, status, last_synced_at, connected_by | — | Not configured |
| `SharepointDocument` | `sharepoint_documents` | sharepoint_item_id, file_name, file_path, file_type, file_size, content_hash, extracted_text, document_type, is_monitored, last_modified_at, last_synced_at, last_processed_at | — | Empty |

### 4.10 Tables to NOT Carry Forward

- `training_modules` and `training_assignments` — legacy training system, fully superseded by the LMS tables.
- `ai_suggestions` — superseded by the SSE `pending_action` pattern in AI chat.

### 4.11 Phase 6 Schema Accuracy Pass — Findings (2026-04-19)

The following corrections were made after querying the live Supabase database directly. The spec had been written from TypeScript types and migrations, not the live DB. These are the verified differences found.

**Wrong table names (would have broken Baku migrations):**

| Spec said | Live DB table |
|---|---|
| `qip_goals` (separate table) | No such table. Data lives in `centre_context` where `context_type = 'qip_goal'` |
| `casual_pool_members` | `casual_pool` |
| `recruitment_questions` | `recruitment_question_templates` |
| `social_accounts` | `marketing_social_accounts` |
| `posts` | `marketing_content` |
| `campaigns` | `marketing_ad_campaigns` |
| `inbox_conversations` | `marketing_messages_inbox` (inbox); `marketing_conversations` (AI chat) |
| `inbox_messages` | part of `marketing_messages_inbox` |
| `post_comments` | `marketing_comments` |
| `analytics_snapshots` | `marketing_analytics_cache` |
| `programming_documents` (separate table) | No such table. Data is in `ai_generated_documents` (15 docs incl. Board Reports) |

**Wrong column names (would have broken migrations):**

| Table | Spec said | Live DB has |
|---|---|---|
| `ai_config` | `key`, `value` | `config_key`, `config_value` |
| `ai_system_prompts` | `section_key` | `section` |
| `ai_system_prompts` | `content` | `template` |
| `ai_system_prompts` | `order_index` | `sort_order` |
| `ai_system_prompts` | `target_role` | `role` |
| `ai_learnings` | `user_id` | `learned_from_user_id` |
| `ai_learnings` | `type` | `learning_type` |
| `ai_agent_definitions` | `priority_score` | `priority` |
| `recruitment_positions` | `department` | `role` + `room` (separate columns) |
| `recruitment_candidates` | `name` | `full_name` |
| `recruitment_candidates` | `application_token` | `access_token` |
| `recruitment_candidates` | `pipeline_status` | `status` |
| `recruitment_candidates` | `score` | `knowledge_score` + `overall_rank` |
| `marketing_content` | `content` (body field) | `body` |
| `marketing_comments` | `commenter` | `author_name` |
| `marketing_comments` | `content` | `comment_text` |
| `marketing_reviews` | `reviewer` | `reviewer_name` |
| `marketing_reviews` | `content` | `review_text` |
| `marketing_reviews` | `draft_response` | `ai_draft_response` |
| `marketing_analytics_cache` | `metric` | `metric_type` |
| `marketing_analytics_cache` | `value` | `data` |
| `marketing_analytics_cache` | `period_start` | `date_range_start` |
| `marketing_analytics_cache` | `period_end` | `date_range_end` |
| `lms_pdp_reviews` | `signatures` | `staff_signature` + `reviewer_signature` |

**Tables not in the spec (now documented in their sections above):**

- `element_actions` — improvement actions on NQS elements (2+ records)
- `acknowledgements` — generic polymorphic acknowledgements
- `staff_availability` — recurring staff availability patterns
- `staff_disc_profiles` — DISC personality assessments for staff
- `lms_module_centre_content` — AI-generated centre-specific content per LMS module
- `ai_agent_sessions` — per-agent task execution log
- `ai_agent_feedback` — agent quality feedback
- `ai_agent_performance` — aggregated agent performance metrics
- `ai_generated_documents` — AI-generated documents (Board Reports, programming docs)
- `ai_document_styles` — document formatting configuration
- `ai_tool_permissions` — tool access control per role
- `marketing_content_calendar` — content scheduling calendar
- `marketing_post_engagement` — post engagement metrics
- `marketing_conversations` + `marketing_messages` — AI marketing chat (parallel to main Kiros AI chat)
- `sharepoint_connection` + `sharepoint_documents` — SharePoint sync tables
- `tags` + `entity_tags` — tagging system

---

## 5. Integration Requirements

### 5.1 Supabase

- **What it provides:** PostgreSQL database, Row Level Security (RLS), Auth, Storage (file hosting), Realtime subscriptions.
- **Features depending on it:** Everything.
- **Credentials required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Current status:** Working. Service role key now configured.
- **RLS requirements:**
  - Enable RLS on every table. MUST NOT use `USING (true)` policies.
  - `profiles`: any authenticated user can read all profiles (needed for staff dropdowns); users can write only their own profile; only `admin` can write other users' profiles.
  - `qa_elements`: all authenticated roles can read; only `admin`, `manager`, `ns` can write.
  - `tasks`: all roles can read; `admin`/`manager`/`ns` can create and assign; `educator` can update only their own assigned tasks.
  - `chat_messages`: a user can read only messages from conversations they own. MUST enforce via join through `chat_conversations.user_id`, not a direct column check.
  - Use service role client (bypasses RLS) ONLY for: cron jobs, AI tool execution on behalf of the system, and onboarding user creation.

### 5.2 Anthropic Claude API

- **What it provides:** AI chat (streaming), tool use, agent routing, document generation, candidate scoring, context extraction.
- **Features depending on it:** Kiros AI Chat (`/chat`), Marketing AI (`/marketing/chat`), AI Context Manager (extraction), Recruitment (candidate scoring), Admin AI config.
- **Credentials required:** `ANTHROPIC_API_KEY`.
- **Current status:** Working — confirmed active with real conversation history.
- **Models in use:** claude-opus-4-20250514 (default), claude-sonnet-4-20250514 (for simple messages ≤50 chars matching routing regex).
- **Must not:** Expose `ANTHROPIC_API_KEY` to the browser under any circumstances.

### 5.3 OWNA Childcare Management API

- **What it provides:** Live read-only data: children (336), staff, families (182 accounts, $696K billing), enrolments, health events (65 incidents).
- **Features depending on it:** All `/owna/*` pages.
- **Credentials required:** `OWNA_API_KEY`.
- **Current status:** Working for 5 of 6 endpoints. `/owna/attendance` returns HTTP 400 — likely a missing date parameter in the API call (code bug, not missing key). Fix: pass a date range parameter to the attendance endpoint.
- **Architecture:** Server-side proxy only. API key MUST NOT be exposed to the browser.

### 5.4 Meta (Facebook/Instagram) Graph API

- **What it provides:** Social inbox (Messenger/Instagram DMs), post publishing, comment management, review management, analytics.
- **Features depending on it:** `/marketing/inbox`, `/marketing/content`, `/marketing/feed`, `/marketing/comments`, `/marketing/reviews`, `/marketing/analytics`.
- **Credentials required:** Meta OAuth2 (stored as encrypted tokens in `marketing_social_accounts` table).
- **Current status:** Connected — 1 Facebook account confirmed connected with live inbox data (8 conversations).
- **Token storage:** MUST be encrypted at rest using Supabase Vault or column-level encryption. MUST NOT store as plaintext.
- **Cron:** Daily token refresh cron required.

### 5.5 Google APIs

- **What it provides:** Google Business Profile (reviews), Google Analytics/GA4, Google Ads (campaigns), YouTube.
- **Features depending on it:** `/marketing/analytics`, `/marketing/ads`, `/marketing/reviews`.
- **Credentials required:** Google OAuth2 (per service).
- **Current status:** Not connected — "No Google accounts connected" in settings.
- **Token storage:** MUST be encrypted at rest.

### 5.6 Microsoft Graph / SharePoint

- **What it provides:** Document sync from SharePoint library into Kiros document store.
- **Features depending on it:** `/admin/sharepoint`, `/documents`.
- **Credentials required:** `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`.
- **Current status:** Not configured.
- **Architecture:** One-way read. MUST NOT write back to SharePoint.

### 5.7 Redis / Upstash

- **What it provides:** Per-user rate limiting for AI chat API endpoints.
- **Features depending on it:** `/chat` API route, `/marketing/chat` API route.
- **Credentials required:** Upstash Redis URL and token.
- **Current status:** Unknown (current code uses in-memory Map which is ineffective in serverless). MUST replace with Redis in rebuild.
- **Requirement:** Rate limit: 30 requests per user per minute. MUST work across multiple Vercel serverless instances.

### 5.8 Vercel Cron

- **What it provides:** Scheduled background jobs.
- **Features depending on it:** Qualification expiry checks, certificate expiry checks, SharePoint sync, marketing analytics sync, marketing auto-publish, marketing token refresh.
- **Credentials required:** `CRON_SECRET` for endpoint authentication.
- **Current status:** `CRON_SECRET` is present in environment.
- **Cron schedule:**
  - Qualification expiry check — daily
  - Certificate expiry check — daily
  - SharePoint document sync — daily
  - Marketing token refresh — daily
  - Marketing analytics sync — daily
  - Marketing auto-publish — hourly

---

## 6. Non-Functional Requirements

### 6.1 Single-Tenancy

- One Supabase project per centre. No multi-centre schema. `service_details` is a flat KV store for one centre only.

### 6.2 Role-Based Access Control

- Page-level access enforced via middleware using `profiles.allowed_pages`.
- Row-level access enforced via Supabase RLS policies.
- Both layers are required: application-layer checks can be bypassed; RLS cannot.
- `admin` role bypasses `allowed_pages` but is still subject to RLS policies.

### 6.3 AI Responses Must Be Centre-Specific

- The AI MUST NOT give generic ECEC advice. All responses must be grounded in the centre's own `centre_context` records (QIP goals, philosophy, policies, teaching approaches).
- If `centre_context` records are empty, the AI should prompt staff to populate them via the Admin → AI Context Manager.

### 6.4 Australian Regulatory Context

- NQS standards are the Australian National Quality Standard (ACECQA).
- Regulations referenced (74, 77, 84, 97, 155, 156, 165, 172) are from the Education and Care Services National Regulations (Australian).
- All UI copy and AI responses MUST use Australian English spelling.
- NQS element references MUST be formatted as `QA1.1.1` (not "Standard 1.1, Element 1").
- Educator-to-child ratio rules are NSW-specific (loaded from `ratio_rules` table by state).

### 6.5 Security

- `SUPABASE_SERVICE_ROLE_KEY` MUST NOT appear in any `NEXT_PUBLIC_*` variable or client-side bundle.
- `ANTHROPIC_API_KEY` MUST be server-side only.
- `OWNA_API_KEY` MUST be server-side only, accessed only via the proxy routes.
- OAuth tokens (Meta, Google, Microsoft) MUST be stored encrypted at rest using Supabase Vault or column-level encryption. MUST NOT store as plaintext.
- Rate limiting on AI chat endpoints MUST use Redis/Upstash. In-memory Maps are ineffective in Vercel serverless deployments and MUST NOT be used.
- The service role Supabase client MUST only be used for: cron jobs, AI tool execution on behalf of the system, and admin user creation/management. It MUST NOT be used in regular user-facing API routes for convenience.

### 6.6 Performance & Reliability

- All Supabase write operations MUST handle errors explicitly. Silent failures are not acceptable.
- User-facing errors MUST use toast notifications. MUST NOT use `alert()`.
- Every async operation MUST display a loading state.
- Initial page loads MUST use skeleton loaders.
- Every list view MUST have a designed empty state with an actionable prompt (e.g. "+ Create your first policy").
- The OWNA integration MUST display an explicit error state (icon + message + Retry button) when the API is unavailable — MUST NOT silently show empty tables.

### 6.7 Responsive Layout

- Desktop: persistent left sidebar navigation with collapsible sections.
- Mobile: bottom tab bar navigation; sidebar rendered as a drawer.
- Consistent page structure: left sidebar + right main content with breadcrumb + title + subtitle + action buttons in the header row.

### 6.8 Design Conventions

- Primary brand colour: purple/violet.
- Card backgrounds MUST use a semantic token (e.g. `bg-card`), not `bg-white`, to support dark mode.
- QA area colour coding: QA1=red, QA2=orange, QA3=green, QA4=blue, QA5=purple, QA6=teal, QA7=dark grey (*confirmed in code: `QA_COLORS` map*).
- Floating AI chat bubble (purple) accessible on every page, linking to `/chat`.
- Tabs for status-based filtering (All / Draft / Active / etc.) used consistently across all list views.
- Priority badges: Urgent (red), High (orange), Medium (yellow), Low (grey).

### 6.9 Realtime

- Supabase Realtime subscription MUST be active on `activity_log` for the live audit feed at `/activity`.
- Task board SHOULD support real-time updates when tasks are moved between columns by other users.

---

## 7. Out of Scope / Defer

Features with functional_confidence below 40 that should be deferred or reconsidered in a rebuild:

| Feature | Route | Confidence | Reason to Defer |
|---|---|---|---|
| Ad Campaigns | `/marketing/ads` | 35 | No Meta or Google Ads API connections; zero usage; expensive to implement correctly |
| Marketing Analytics | `/marketing/analytics` | 30 | No platform connections beyond Facebook; no data to display; dependent on content adoption |
| SharePoint Integration | `/admin/sharepoint` | 40 | Not configured; Microsoft credentials not set; low immediate value |
| User Guide | `/guide` | 35 | Static scrollable page; better replaced with contextual tooltips and onboarding flows in a rebuild |
| Recruitment root 404 | `/recruitment` | 5 | Broken nav — not a feature; must add a redirect to `/candidates` in the rebuild |

**Additional deferral consideration:**
- The entire Marketing module has limited integration with the ECEC quality management core. Evaluate whether it belongs in this portal or as a standalone tool before rebuilding it.
- AI System Prompts (`/admin/ai-prompts`) architecture is well-designed but has 0 sections in production. Build the data model but defer the full UI to a later iteration.

---

## 8. Known Issues to Fix in the Rebuild

These are defects and architectural problems identified during the screenshot tour and code review that MUST be corrected:

1. **Task status enum mismatch:** DB allows `review` as a task status; the TypeScript `Task` interface currently omits it, causing tasks with `status='review'` to silently disappear from the Kanban board. The rebuild MUST include `review` in all TypeScript types and render a Review column on the board.

2. **OWNA Attendance HTTP 400:** The `/owna/attendance` endpoint currently returns 400 (Bad Request). The OWNA API key is set correctly (other endpoints work). The bug is a missing or malformed date parameter in the API call. Fix: pass a date range parameter (e.g. `?from=YYYY-MM-DD&to=YYYY-MM-DD`) to the OWNA attendance endpoint.

3. **Rate limiter in serverless:** The current chat rate limiter uses an in-memory `Map` per process. With multiple Vercel serverless instances, each instance has its own counter — a user can exceed the 30 req/min limit by a factor of N (number of warm instances). Replace with Redis/Upstash.

4. **Recruitment nav 404:** `/recruitment` is a sidebar nav group heading, not a route. Navigating to it shows a Next.js 404. Add a redirect from `/recruitment` to `/candidates`.

5. **AI Agents page title mismatch:** The page at `/admin/agents` is titled "AI Configuration" in the UI but it is actually the AI Agents page. The real AI Configuration page is at `/admin/ai-config`. Correct the page title in the rebuild.

6. **Recruitment test data:** All 14 candidates and 18 positions in production are UAT/test data with programmatic names and `example.com` email addresses. Clean slate for the rebuild — do not seed test recruitment data.

7. **OAuth token plaintext risk:** Ensure Meta, Google, and Microsoft OAuth tokens are encrypted at rest. Confirm they are not stored as plaintext strings in Supabase columns.

8. **`checklist_instances.items_snapshot` confusion:** When a checklist template is edited, in-progress instances continue using the frozen `items_snapshot`. Staff see old items; admin sees new template items. This is intentional for audit integrity but is not documented in the UI. Add a clear warning in the template editor: "Editing this template will not affect checklists already in progress."
