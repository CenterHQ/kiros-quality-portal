# Kiros Quality Portal — UX Specification

**For:** Baku (AI app builder)
**Captured role:** Approved Provider (rony@kiros.com.au)
**Captured:** 2026-04-19
**Screenshots:** 56 routes across two passes
**Purpose:** Complete screen-by-screen UX specification for a ground-up rebuild of the Kiros Quality Portal — a staff-facing operational platform for Kiro's Early Education Centre (NSW, Australia).
**Status:** Authoritative. Feed this document directly to Baku as the rebuild source of truth.

---

## 1. System Overview

### 1.1 Purpose

A multi-role operational platform for a single Early Childhood Education and Care (ECEC) centre. Centralises NQS (National Quality Standard) compliance, staff management, learning, checklists, rostering, and AI-assisted guidance. Replaces scattered spreadsheets and paper forms following an ACECQA Assessment and Rating cycle.

The system is staff-facing only. There is no parent or family portal. It is single-tenancy — built for one centre, not a multi-site SaaS.

The primary value proposition is NQS Element tracking linked to QIP goals, tasks, training, and compliance work. Everything in the system traces back to QA numbers.

### 1.2 User Roles

Five roles gate page access, write permissions, and AI targeting.

| Role Code | Role Name | Who | What They Access |
|---|---|---|---|
| `admin` | Approved Provider | Centre owner / licensee | Everything: AP Dashboard, full Admin panel, all features |
| `manager` | Operations Manager | Centre manager | Near-admin access; no AP Dashboard |
| `ns` | Nominated Supervisor | Lead educator or supervisor | Quality management, recruitment; no Admin panel |
| `el` | Educational Leader | Designated EL role | Programming, learning, limited management |
| `educator` | Educator | Floor staff | Tasks, checklists, own learning only |

**Page restriction mechanism:** Each user profile has an `allowed_pages` array. If null or empty, the user can access all pages their role permits. If populated (e.g., `["/tasks", "/checklists"]`), the user is restricted to only those paths. In the live system, Justina Abadier (Educator) has 11 pages allowed; Annette Ballard (Nominated Supervisor) has all pages.

**Observed users in system:**
- Rony Kirollos — Approved Provider — All pages
- Annette Ballard — Nominated Supervisor — All pages
- Justina Abadier — Educator — 11 pages

---

## 2. Global Layout and Navigation

### 2.1 Application Shell

Every authenticated page renders inside a persistent shell. The shell does not change between routes.

**Shell components:**
- **Left sidebar** — fixed width (~240px on desktop), collapsible. Contains the full navigation grouped into labelled sections. Active item has a filled/highlighted background. Sections are collapsible with a chevron toggle.
- **Top header bar** (~56px) — breadcrumb trail on left, user avatar and role badge on right, notification bell.
- **Main content area** — fills remaining horizontal and vertical space, scrollable, ~24px padding.
- **Floating AI chat bubble** — purple circular button, bottom-right corner, present on every authenticated page. Opens the Kiros AI Chat interface.

### 2.2 Sidebar Navigation Structure

The sidebar groups routes under labelled section headings. The tour was conducted as Approved Provider, so all sections were visible.

| Section | Item | Route | Minimum Role (inferred) |
|---|---|---|---|
| QUALITY | Dashboard | `/dashboard` | educator |
| QUALITY | QA Elements | `/elements` | ns |
| QUALITY | Tasks | `/tasks` | educator |
| QUALITY | Compliance | `/compliance` | ns |
| QUALITY | Policies | `/policies` | educator |
| OPERATIONS | Checklists | `/checklists` | educator |
| OPERATIONS | Rostering | `/rostering` | manager |
| OPERATIONS | Documents | `/documents` | educator |
| OPERATIONS | Registers | `/registers` | educator |
| OPERATIONS | Forms | `/forms` | educator |
| PEOPLE | Learning Hub | `/learning` | educator |
| PEOPLE | Training | `/training` | educator |
| PEOPLE | Recruitment | `/candidates` | ns (role-gated) |
| AI | Kiros Chat | `/chat` | educator |
| OWNA | Children | `/owna/children` | manager |
| OWNA | Attendance | `/owna/attendance` | manager |
| OWNA | Staff | `/owna/staff` | manager |
| OWNA | Families | `/owna/families` | manager |
| OWNA | Enrolments | `/owna/enrolments` | manager |
| OWNA | Health | `/owna/health` | manager |
| MARKETING | Marketing Hub | `/marketing` | manager |
| PROGRAMMING | Programming | `/programming` | el (role-gated) |
| ADMIN | Users | `/admin/users` | admin |
| ADMIN | AI Context | `/admin/context` | manager |
| ADMIN | Notifications | `/admin/notifications` | manager |
| ADMIN | SharePoint | `/admin/sharepoint` | manager |
| ADMIN | AI Agents | `/admin/agents` | manager |
| ADMIN | AI Prompts | `/admin/ai-prompts` | admin |
| ADMIN | AI Config | `/admin/ai-config` | admin |
| — | AP Dashboard | `/ap-dashboard` | admin |
| — | Centre Hub | `/hub` | educator |
| — | Reports | `/reports` | manager |
| — | Activity | `/activity` | manager |
| — | Resources | `/resources` | educator |
| — | Guide | `/guide` | educator |

**Role-gating notes from synthesis:** Recruitment and Programming are role-gated and not shown to all roles. AP Dashboard is admin-only. Admin section requires admin or manager. Educators see learning, tasks, checklists, and operations. Managers see marketing and recruitment. Admins see all plus AI configuration.

### 2.3 Consistent Page Header Row

Every content page (not the shell) opens with a standard header row:
- Page title (large, bold, left-aligned)
- Subtitle or description (smaller text, below title)
- Primary action button(s) (right-aligned, purple/primary style)
- Sometimes: breadcrumb above the title row

### 2.4 Colour System & Design Tokens

#### Design Token Architecture

The system uses **shadcn/ui CSS custom properties** (HSL values) defined in `src/app/globals.css`, consumed via Tailwind utility classes. Every colour is a CSS variable — this is architecturally significant for theming (see 2.4.4 below).

**Core tokens (`:root`):**

| Token | Value | Usage |
|---|---|---|
| `--primary` | `267 87% 36%` | Brand purple — buttons, active sidebar, ring, AI chat bubble |
| `--primary-foreground` | `0 0% 100%` | White text on primary |
| `--background` | `0 0% 100%` | Page background |
| `--foreground` | `0 0% 9%` | Body text |
| `--card` | `0 0% 100%` | Card backgrounds |
| `--muted` | `0 0% 96%` | Muted backgrounds, secondary buttons |
| `--muted-foreground` | `0 0% 45%` | Subdued labels |
| `--border` | `0 0% 90%` | All borders and dividers |
| `--destructive` | `0 84% 60%` | Delete/danger actions |
| `--success` | `142 71% 45%` | Confirmed/connected states |
| `--warning` | `38 92% 50%` | Amber alerts |
| `--radius` | `0.625rem` | Global border radius |
| `--sidebar` | `0 0% 98%` | Sidebar background (near-white) |
| `--sidebar-primary` | `267 87% 36%` | Active sidebar item (same as primary) |

#### Kiros Brand Palette (direct hex, migration artifact)

The Tailwind config also defines a `kiros.*` colour namespace with direct hex values. These are noted as "backward compat during migration" — the system is actively migrating toward CSS variables. Do not use `kiros.*` tokens in a rebuild; use the CSS variable approach instead.

| Token | Hex | Notes |
|---|---|---|
| `kiros.purple` | `#470DA8` | Primary brand |
| `kiros.purple-dark` | `#350A7E` | Hover/active states |
| `kiros.purple-light` | `#6B3FCE` | Lighter variant |
| `kiros.pink` | `#B5179E` | Accent (marketing, learning stories) |
| `kiros.blue` | `#4DC9F0` | Informational |
| `kiros.gold` | `#EDC430` | Warning/highlight |
| `kiros.gold-dark` | `#D4AB1A` | Gold hover |
| `kiros.gray` | `#58595B` | Neutral text |

#### Typography

- **Font family:** Karla (Google Font), with Arial / Helvetica / sans-serif fallbacks
- **Loading:** Via Next.js `var(--font-sans)` CSS variable
- **No defined type scale in tokens** — sizes use standard Tailwind classes (text-sm, text-base, text-lg, etc.)

#### Semantic Colour Layers

Two distinct colour layers exist in the system. A rebuild must keep these separate:

**Layer 1 — Brand colours (per-tenant customisable):**
Primary purple, sidebar colours, button fills, ring colour. These are `--primary`, `--sidebar-primary`, `--ring`. Changing these changes the "feel" of the product for a given centre.

**Layer 2 — Semantic colours (fixed, system-wide meaning):**
These carry meaning across the app and must not change per tenant:

*Rating badges:*
- Not Met → red (`--destructive`)
- Working Towards → amber (`--warning`)
- Meeting → blue
- Exceeding → green (`--success`)

*Priority badges (tasks):*
- Urgent → red
- High → orange/yellow
- Medium → blue
- Low → grey

*Quality Area colour badges (QA1–QA7):*
Each QA area has its own fixed colour badge used consistently across elements, modules, pathways, and QIP goal lists. The specific per-QA colours were not extracted from source code during this tour — they are visually distinct and appear to be hardcoded per QA number.

#### Multi-Tenant Theming — Architecture Assessment

**The existing token system already supports per-tenant theming.** Because all brand colours are CSS custom properties on `:root`, a rebuild can trivially override them per tenant by:

1. Storing tenant brand config in the database (primary HSL value, logo URL, centre name)
2. At render time, injecting a `<style>` block or `data-theme` attribute that overrides `--primary`, `--sidebar-primary`, `--ring`, and `--primary-foreground`
3. Swapping the logo in the sidebar header

This would require changing approximately 3–4 CSS variable values and a logo URL per tenant. No component changes needed.

**Brand Configuration Data Model (captured in Pass 3):** The `/admin/ai-config` Brand tab (51f-ai-config-brand.png) confirms the per-centre branding data model. Fields stored in the database under `brand.*` namespace:

| Field Key | Current Value | Purpose |
|---|---|---|
| `brand.centre_name` | `Kiros Early Education` | Display name (used in AI responses, UI) |
| `brand.centre_name_upper` | `KIROS EARLY EDUCATION` | Uppercase variant for document headers |
| `brand.entity_name` | `HWAW Kirollos Childcare Pty Ltd` | Legal entity name for formal documents |
| `brand.primary_colour` | `#470DA8` | Primary brand purple (matches `--primary` CSS var) |
| `brand.gold_colour` | `#EDC430` | Gold accent (matches `kiros.gold` Tailwind token) |
| `brand.location` | `Blackett, NSW` | Centre location for documents |
| `brand.qa_colours` | `["#e74c3c","#e67e22","#2ecc71","#3498db","#9b59b6","#1abc9c","#34495e"]` | Hex array for QA1–QA7 badges |
| `brand.se_number` | `SE-00017066` | ACECQA Service Establishment number |
| `brand.tagline` | `Generated by Kiros AI Assistant` | Footer text on all generated documents |

For a multi-tenant rebuild, this data model is the complete theming configuration per centre. A rebuild would swap primary colour, logo URL, centre name, and QA colour array at runtime. No component changes needed — only CSS variable overrides and this brand data set.

### 2.5 Empty State Pattern

All empty states follow the same pattern: icon + heading message + CTA link or button. Examples observed:
- Checklists: "No checklists due today" (no CTA button)
- Policies: "No policies found — Create your first policy to get started"
- Post Feed: "No published posts yet" with "Create your first post" link

### 2.6 Badge Counts and Sidebar

Badge counts do NOT appear as numbers next to sidebar nav item labels. They appear as dot badges or counts directly on the Task Board and Checklists pages. The sidebar does not display numbered badge counts beside route labels.

---

## 3. Feature Sections

### 3.1 Authentication

#### `/login` — Login
**Confidence: 100** (Entry point — required for every user, no question this is rebuilt.)

- **Layout:** Centred card on light grey full-page background. Card is ~480px max-width, vertically centred.
- **Card contents:** Kiros Early Education Centre logo (top centre) → "Quality Uplift Portal" pill badge → email input → password input → purple "Sign In" button (full width).
- **Absent elements:** No registration link. No "Forgot password" link visible in the screenshot. No social/SSO login.
- **Data state:** Unauthenticated entry point, no user data.
- **Behaviour:** On successful auth → redirect to `/dashboard`. Non-authenticated users hitting any protected route are redirected to `/login`.
- **Role access:** Public — no auth required.

---

### 3.2 Dashboard and Hub

#### `/dashboard` — Dashboard
**Confidence: 92** (Core NQS quality overview with real data — QIP goals, Quality Area ratings, compliance table. Essential for any rebuild.)

- **Layout:** Multi-section vertical stack. No tabs. Full-width.
- **Top section — Stat cards (horizontal row):**
  - "Elements not met" → 34
  - "Tasks completed" → 1/22
  - "Compliance actions open" → 5
  - Each card: icon + large number + label
- **Middle section — QIP Goals:** Progress bars for QIP goals, each bar labelled with goal text and QA colour badge.
- **Centre philosophy section:** Quote block showing the K.I.R.O.S philosophy text (Knowledge, Integrity, Resilience, Openness, Safe).
- **Quality Area overview cards:** 7 cards (QA1–QA7), each showing QA number, name, and overall rating badge (e.g., "Working Towards"). Overall NQS rating shown as "Working Towards".
- **Compliance Breaches table:** Regulations listed with status values (Action Required, In Progress, Completed, etc.).
- **Data state:** Real data — live NQS element ratings, real task counts, real compliance items.
- **Role access:** All roles. Admin/manager see centre-wide view. Educator cards may show only their own items (unconfirmed — only AP was toured).

#### `/hub` — Centre Hub
**Confidence: 85** (Personalised home screen with real stat tiles and quick actions — good onboarding UX.)

- **Layout:** Welcome banner at top + multi-section grid below.
- **Banner:** K.I.R.O.S philosophy pillars displayed (Knowledge, Integrity, Resilience, Openness, Safe).
- **Stat tiles (row):**
  - Elements Met: 6/40
  - Tasks Done: 1/22
  - QIP Goals: 5
  - Pending Ideas: 0
- **QIP Goals list:** Progress bars with QA colour badges per goal.
- **Quick Actions sidebar links:** Task Board, Daily Checklists, Learning Hub, Compliance, Policies, AP Dashboard.
- **Recent Activity feed:** Chronological log of recent system events.
- **Data state:** Real data — tile counts match dashboard.
- **Role access:** All roles (educator minimum inferred).

---

### 3.3 AI Chat

#### `/chat` — Kiros AI Chat
**Confidence: 88** (Confirmed working with Anthropic key — real conversation history shown, AI responds. Unique differentiator for the product.)

- **Layout:** Three-panel interface.
- **Left panel — Conversation history:** Long list of past conversations grouped by date (15–17 Apr visible). Real conversation titles: "User Inquires About Centre Context Overview", "Creating Engaging Family Newsletter for Centre", "QA1 Educational Program Status Overview Request". Scrollable. Search input at top. "+ New Conversation" button.
- **Right panel — Active conversation / landing state:** When no conversation selected, shows the Kiros AI identity card:
  - Title: "ECEC Operations Expert · Approved Provider"
  - Four suggested prompt chips
  - Message input bar at bottom
- **When a conversation is open:** Message thread fills the right panel. AI messages render markdown. Tool use indicators shown inline (collapsible "Searched…" chips within AI messages). Pending Action cards shown for proposed system actions with Approve / Reject buttons.
- **Data state:** Real — 15+ conversations from active use. AI was confirmed responding at time of capture.
- **Powered by:** Anthropic Claude. Configured: claude-opus-4-20250514 as default, claude-sonnet-4-20250514 for simple messages.
- **Role access:** All roles (educator minimum).

#### `/marketing/chat` — Kiros Marketing AI
**Confidence: 68** (Marketing-scoped AI chat — no conversation history yet, but Anthropic key is active so it would work.)

- **Layout:** Same two-panel layout as `/chat` but scoped to marketing tasks.
- **Left panel:** "+ New Chat" button. "No conversations yet" empty state.
- **Right panel identity card:** "Kiros Marketing AI" — helps with social media posts, review responses, ad copy, marketing performance analysis, content calendar.
- **Suggested prompts:** Facebook post for NAIDOC week, draft Google review response, Instagram open day content, weekly marketing performance summary.
- **Data state:** Empty — no conversations yet.
- **Role access:** manager minimum (marketing module is manager-gated).

---

### 3.4 Quality Management

#### `/elements` — QA Elements
**Confidence: 95** (The core purpose of the system — tracking all 40 NQS elements with ratings and progress. Highest value feature.)

- **Layout:** Filter bar across the top + grouped list below.
- **Filter bar:** QA area selector tabs (QA1–QA7 + "All") + search field.
- **List:** All 40 NQS elements grouped by Quality Area (QA1–QA7). Each group has a collapsible heading.
- **Element row fields:**
  - Element code (e.g., `1.1.1`) — monospace
  - Element name — full text
  - Current rating badge — colour-coded pill (Not Met = red, Met = blue, Working Towards = amber, Exceeding = green)
  - Work status badge — outline pill (Not Started, In Progress)
- **Data state:** Real — all 40 elements loaded with real ratings from ACECQA cycle. Mix of "Not Met" and "Met" visible.
- **Empty filtered state:** Not observed — data is always present for elements.
- **Role access:** ns minimum (inferred). Viewing all elements is a core NS/admin workflow.
- **Note:** Detail views (`/elements/[id]`) were NOT captured in this tour — only the list view was documented.

#### `/tasks` — Task Board
**Confidence: 90** (Kanban task board with real tasks linked to NQS improvement work — 22 tasks, 1 done. Core workflow feature with real data.)

- **Layout:** Three-column kanban board. Header row above columns.
- **Header row:** "Board/List" toggle (left), "+ Add Task" button (right).
- **Columns:**
  - "To Do" — 21 tasks
  - "In Progress" — 0 tasks
  - "Done" — 1 task
- **Task card fields:**
  - Title (bold)
  - Description snippet (1–2 lines, truncated)
  - Priority badge: Urgent = red, High = yellow/orange, Medium = blue (colour-coded)
  - Due date
  - Assigned user avatar
  - Comment count
- **Sorting:** Cards sorted by priority and due date within each column.
- **Data state:** Real — 22 total tasks from NQS improvement work. Mostly in "To Do".
- **Role access:** All roles can view. Create/edit permissions by role (admin/manager/ns can create; educator can update status on assigned tasks).
- **Note:** Task detail/edit views not captured — only the kanban list view.

#### `/compliance` — Compliance Tracking
**Confidence: 88** (Regulatory compliance tracker with 9 real regulations, status dropdowns, and linked guidance documents — actively used with real data.)

- **Layout:** Summary bar at top + full-width table below.
- **Summary bar:** Four stat counts in a row:
  - Action Required: 5
  - In Progress: 3
  - Completed: 1
  - Ongoing: 0
- **Table rows:** One row per regulation. Columns:
  - Regulation code (e.g., 74, 77, 84, 97(2A), 97(3)(a), 155, 156, 165, 172(3)(a))
  - Description
  - Status dropdown (inline, editable)
  - Assigned-to dropdown (inline, editable)
  - Notes (text content with remediation context)
  - Linked document buttons (Procedure Guidance, Policy — open associated documents)
- **Data state:** Real — 9 regulations with real statuses. Notes contain centre-specific remediation context.
- **Role access:** ns minimum (inferred). Admin/manager can edit; ns can update; educator likely view-only.

#### `/policies` — Policy Management
**Confidence: 75** (Policy management is a genuine ECEC regulatory need — library is currently empty, zero policies created.)

- **Layout:** Stat cards row + tabs + filter bar + main content area.
- **Stat cards (top row):**
  - Total: 0
  - Published: 0
  - Due for Review: 0
  - Review Coming: 0
- **Tabs:** Policy Library (active) | Reviews | Acknowledgements
- **Filter bar:** Search input + Category dropdown + Status dropdown.
- **Policy Library tab main area:** "No policies found — Create your first policy to get started" empty state.
- **Header action:** "+ New Policy" button.
- **Data state:** Empty — zero policies in the system.
- **Role access:** educator can view (see and acknowledge policies); ns/manager/admin can create and publish.

#### `/registers` — Registers
**Confidence: 70** (Seven system registers required by NQS regulations — currently all empty but the templates exist.)

- **Layout:** Header with "+ New Register" button + card gallery.
- **Register cards (7 system templates):**
  - Chemical Register
  - Device Register
  - Key Register
  - Maintenance Register
  - Medication Register
  - Vehicle Register
  - Visitor Register
- **Each card shows:** Icon + name + "Template" badge + description + column count + entry count (all 0) + column name previews + action buttons (Open, Edit, Copy, Archive).
- **Data state:** Template data only — zero entries in any register.
- **Role access:** All roles can view; admin/manager can create and edit templates.

#### `/forms` — Forms and Templates
**Confidence: 60** (Eight form templates exist — no submissions, uncertain usage.)

- **Layout:** 2-column grid of form template cards. No submissions listed.
- **Templates visible (8 total):**
  1. Weekly Critical Reflection
  2. Team Meeting Minutes
  3. Emergency Drill Reflection
  4. Family Collaboration Sheet
  5. Performance Review
  6. Family Satisfaction Survey
  7. Individual Learning Profile
  8. Casual Educator Induction
- **Each card:** Icon + title + description + "+ New" button.
- **Data state:** Template metadata only — no submissions exist.
- **Role access:** All roles can submit forms. Admin/manager can create/edit templates.

---

### 3.5 Operations

#### `/checklists` — Operational Checklists
**Confidence: 72** (19 templates exist and the feature is well-built, but no active assignments — operationally not yet in use.)

- **Layout:** Dashboard header with stat tiles + category filters + tabs + main content area.
- **Stat tiles (top row):**
  - Today's Progress: 0/0
  - Overdue: 0
  - Upcoming: 0
  - Open Tickets: 0
  - Templates: 19
- **Pinned group:** "Safety & Procedures" section showing two procedure checklists (pinned to top).
- **Category filter chips (horizontal scroll):** Safety & Security, Cleaning & Hygiene, and others.
- **Tabs:** Today | Upcoming | History | Tickets
- **Main content (Today tab):** "No checklists due today" empty state.
- **Header actions:** "Manage Templates" button + "+ Assign Checklist" button.
- **Data state:** Templates exist (19) but zero active assignments or completed instances.
- **Role access:** All roles can complete assigned checklists. Admin/manager/ns manage templates and assignments.

#### `/rostering` — Rostering
**Confidence: 68** (Well-structured weekly roster with 3 rooms, compliance and leave tabs, but zero shifts entered — set up but not adopted.)

- **Layout:** Toolbar + weekly grid. Full-width.
- **Toolbar:**
  - Week label: "20–24 Apr 2026"
  - Prev/Next week navigation arrows
  - Header action buttons: "+ Room", "Copy Previous Week", "Publish Week"
- **Tabs (below toolbar):** Weekly Roster | Compliance | Leave (0) | Programming Time | Staff & Qualifications
- **Weekly grid:**
  - Rows: Joeys Nursery 0–2 (with capacity and ratio shown), Possums Toddlers 2–3, Koalas Preschool 3–5
  - Columns: Mon–Fri (weekdays)
  - Each cell: "+ Add Shift" placeholder — no shifts scheduled in any cell
- **Data state:** Room structure configured with 3 rooms. Zero shifts scheduled.
- **Role access:** manager minimum to create/edit. Educators can view their assigned shifts.

#### `/documents` — Documents
**Confidence: 60** (Document repository built with QA-area filter tabs and upload — but completely empty.)

- **Layout:** Drag-and-drop upload zone (top section) + filter tabs + document list area.
- **Upload zone:** Prominent drag-and-drop area. Subtitle: accepts PDF, Word, Excel, images, and more.
- **Filter tabs:** All | General | QA1 | QA2 | QA3 | QA4 | QA5 | QA6 | QA7
- **Document list:** "No documents found" empty state.
- **Header action:** "Upload File" button.
- **Data state:** Empty — zero documents.
- **Role access:** All roles can view and download. Admin/manager can upload and delete.

#### `/documents/library` — AI Document Library
**Confidence: 72** (Separate route from /documents — lists documents generated by Kiros AI. Confirmed to have real generated content. Screenshot: 57-documents-library.png)

- **Layout:** Page heading "AI Document Library" + filter/type controls + long scrollable document list. Sidebar shows dedicated navigation for document types.
- **Filter controls:** All Topics tab | All Types dropdown | Search field
- **Document types visible:** newsletter, meeting agenda, template (active), assessment, board report
- **Documents in library (Pass 3 observed):**
  - Kiros Preschool Room Newsletter — April 2026 (newsletter)
  - Kiros Toddler Room Newsletter — April 2026 (newsletter)
  - Kiros Nursery Room Newsletter — April 2026 (newsletter)
  - Monthly Team Meeting Agenda — May 2026
  - Daily Room Setup Checklist (template, active status)
  - April 2026 Staff Meeting Agenda (multiple entries)
  - Kiros Early Education Staff Meeting Agenda — April 2026
  - Board Report: National Quality Standard Progress Summary (assessment, finding active)
  - Board Report: National Quality Standard Progress Update
- **Each document card:** Title + type badge + status badge + creation date + action buttons (edit/share/download)
- **Relationship to /documents:** Different from the upload-based `/documents` page — this is the AI-generated documents library. The AI can generate documents (newsletters, reports, agendas) which appear here, not in `/documents`.
- **Data state:** Real — multiple generated documents from April–May 2026.
- **Role access:** admin/manager minimum (inferred — accessed via Admin or AI section).

---

### 3.6 Learning and Development

#### `/training` — Training Modules (Legacy)
**Confidence: 65** (Legacy training module list — 8 visible, superseded by the Learning Hub which has 41 modules.)

- **Layout:** Card grid. Numbers 1–8 visible.
- **Module cards (8 visible):**
  1. Positive Interactions and Language
  2. The Planning Cycle
  3. Child Protection and Reportable Conduct
  4. Intentional Teaching and Scaffolding
  5. Health Hygiene and Safety
  6. Emergency Procedures
  7. Family Engagement and Communication
  8. Environmental Sustainability
- **Each card:** Module number badge + title + duration + description + "No assignments yet" note + "+ Assign to User" link.
- **Data state:** Module metadata exists. Zero assignments.
- **Note:** These appear to be an older version of the LMS, predating the Learning Hub. The Learning Hub at `/learning` has 41 modules across 3 tiers and is the active system.
- **Role access:** All roles can view modules. Admin/manager/ns can assign.

#### `/learning` — Learning Hub
**Confidence: 90** (Full LMS with real enrolled staff, pathways, certificates, and compliance tracking — second most mature domain after quality management.)

- **Layout:** Personal learning dashboard. Stat tiles + current modules + QIP priorities + pathways + recently completed + team overview.
- **Stat tiles (top row):**
  - Completed: 1
  - In Progress: 2
  - Overdue: 0
  - Total Hours: 1.0
- **My Current Modules section:** Two module cards with progress indicators.
- **Learning Priorities from QIP:** Accordion list of 3 leadership goals (QIP-linked priorities for learning).
- **My Pathways section:** "New Educator Induction Pathway" at 0% (0/6 modules).
- **Recently Completed section:** "ACECQA Advanced Child Safety" certificate.
- **Team Overview tiles (bottom row):** Total Staff: 3 | Completed This Month: 1 | Overdue: 0 | Compliance Gaps: 0
- **Data state:** Real — enrolled staff, real module progress, real pathway enrollment.
- **Role access:** All roles see their own learning. Admin/manager see team overview.

#### `/learning/library` — Module Library
**Confidence: 88** (41 modules across 3 tiers with QA-area tagging — a well-stocked catalogue.)

- **Layout:** Header stat counts + filter bar + 3-column card grid.
- **Header counts:**
  - Total: 41
  - Mandatory Compliance: 12
  - Core Professional Development: 14
  - Advanced/Exceeding: 15
- **Filter bar:** Search input + tier filter chips + QA area colour badges + category dropdown.
- **Module card fields:**
  - Tier badge (Mandatory / Core PD / Advanced)
  - QA area badge(s)
  - Title
  - Description (2–3 lines)
  - Duration
  - Enrollment status
  - Start / Assign buttons
- **Data state:** 41 real modules.
- **Role access:** All roles browse library. Admin/manager can assign modules to others. Educators can self-enroll.

#### `/learning/pathways` — Learning Pathways
**Confidence: 82** (Five structured pathways — a differentiating LMS feature.)

- **Layout:** Stat tiles + filter dropdowns + pathway cards.
- **Stat tiles:**
  - Total Pathways: 5
  - Enrolled: 1
  - Completed: 0
- **Filter dropdowns:** Tier + QA area.
- **Five pathway cards:**
  1. Annual Mandatory Compliance
  2. Exceeding NQS Preparation
  3. Meeting QA1 Educational Program
  4. Meeting QA2 Health & Safety
  5. New Educator Induction Pathway
- **Each card:** Tier badge + QA badges + module count + estimated hours + Enroll/Continue button.
- **Data state:** 5 pathways, 1 enrolled (New Educator Induction at 0%).
- **Role access:** All roles can enroll and view pathways. Admin can create/edit pathways.

#### `/learning/pdp` — My Professional Development Plan
**Confidence: 70** (PDP feature is built with goals, reviews, and staff review tabs — but empty.)

- **Layout:** Three tabs + tab content.
- **Tabs:** My Goals | My Reviews | Review Staff
- **My Goals tab content:** "+ Add Goal" button + empty state "No goals yet".
- **Data state:** Empty — no PDP goals set by this user.
- **Role access:** All roles have a PDP. Admin/manager/ns can review staff PDPs (via Review Staff tab).

#### `/learning/matrix` — Staff Training Matrix
**Confidence: 85** (Training compliance matrix shows 56 gaps across 3 staff — real data, actionable, directly tied to NQS compliance.)

- **Layout:** Stat tiles + two compliance tables.
- **Stat tiles:**
  - Total Staff: 3
  - Fully Compliant: 0
  - Compliance Gaps: 56
  - Expiring Soon: 0
- **Qualification Compliance table:** Lists all 3 staff (Annette Ballard NS, Justina Abadier Educator, Rony Kirollos AP) against qualification types. Cells show grey/green dot indicators.
- **Mandatory Training Modules table:** Module completion per staff member with fraction counts at column footer.
- **No upcoming expiry alerts section** (shown but empty).
- **Legend** at bottom.
- **Data state:** Real — 3 staff, 56 compliance gaps visible.
- **Role access:** admin/manager/ns can view all staff matrix. Educator likely sees only own row.

#### `/learning/certificates` — Certificates and Evidence
**Confidence: 78** (Certificate management with upload and team view tabs — one real certificate stored.)

- **Layout:** Tabs + certificate card list.
- **Tabs:** My Certificates (1) | Upload Certificate | All Staff
- **Certificate card (1 real certificate):**
  - Name: "ACECQA Advanced Child Safety"
  - Status: Current
  - Issued: 10 Apr 2026
  - Issued by: Kiros Early Education Centre
  - Badges: "Internal" + QA2 + QA7 badges
  - Link back to source module
- **Data state:** 1 real certificate.
- **Role access:** All roles can view own certificates. Admin/manager/ns can view All Staff tab.

---

### 3.7 Reports and Data

#### `/reports` — Reports and Analytics
**Confidence: 78** (Analytics overview with real NQS data, compliance counts, and training matrix — directly useful for the AP role.)

- **Layout:** Stat tiles row + QA progress section + overdue/upcoming panels + training matrix table + export section. Header: "Print Report" button.
- **Stat tiles (top row):**
  - Not Met: 34
  - Met: 6
  - Meeting: 0
  - Exceeding: 0
  - Actions Done: 0%
  - Compliance Open: 5
- **Progress by Quality Area section:** List of QA1–QA7 with actions-done fractions (e.g., "QA1: 0/8 actions done").
- **Overdue Items panel:** Empty.
- **Due Next 14 Days panel:** Empty.
- **Training Completion Matrix:** Table showing staff vs. module completions.
- **Export Data section:** Dropdown (select report type) + "Download CSV" button.
- **Data state:** Real — pulled from live NQS element ratings and compliance data.
- **Role access:** manager minimum (inferred). Educator unlikely to see this.

#### `/reports/extract` — Data Extract Wizard
**Confidence: 65** (Step-by-step CSV export wizard with 13 data sources — powerful but likely used rarely.)

- **Layout:** Step-by-step wizard. Step 1 visible in screenshot.
- **Step 1 — Select Data Source:** Expandable category list. Primary table categories with counts:
  - QA & Compliance (3)
  - Tasks & Activity (4)
  - Documents (2)
  - Checklists (5)
  - Policies (4)
  - Rostering & Staff (9)
  - Training (2)
  - Learning Management (13)
  - Chat & AI (3)
  - Centre & Config (6)
  - Registers (2)
- **Data state:** Wizard UI only — no extract has been run.
- **Role access:** admin/manager (inferred — report extraction is an admin workflow).

#### `/activity` — Activity Feed
**Confidence: 55** (Activity log with real entries — primarily for admins auditing system use.)

- **Layout:** Filter tabs at top + chronological scrollable list.
- **Filter tabs:** (visible but not all tab labels captured)
- **Activity entries:** Each entry shows: user avatar + user name + action description (e.g., "Updated actions taken", "Moved task to done", "self_enrolled", "enrolled_pathway") + entity type badge + relative timestamp.
- **Data state:** Real — populated with real user actions from system use.
- **Role access:** manager/admin (inferred — audit log is not an educator workflow).

---

### 3.8 Resources and Guide

#### `/resources` — Resources
**Confidence: 45** (Curated external link directory — static content, low rebuild priority.)

- **Layout:** Full scrollable page. Sections organised by Quality Area.
- **Top section:** General Resources.
- **QA sections:** QA1–QA7, each with 3–8 resource cards.
- **Resource card fields:** Title + source organisation + brief description + "general" category badge.
- **All links:** Open externally. Covers ACECQA, NSW ELC, AERO, CELA, UOW, and other sector bodies.
- **Data state:** Static content — curated links, no dynamic data.
- **Role access:** All roles (educator minimum).

#### `/guide` — User Guide
**Confidence: 35** (Static in-app user guide — typically replaced by tooltips or help system in a rebuild.)

- **Layout:** Long scrollable page with section headers, annotated screenshots, and explanatory text.
- **Sections cover:** Onboarding flow, QA Elements workflow, Task Board, Checklists, Rostering, Learning, and AI Chat.
- **Data state:** Static content.
- **Role access:** All roles.

---

### 3.9 OWNA Integration

All OWNA pages share the same base layout: page heading + "Live from OWNA" data badge + search/filter controls + data table. All data is read-only — OWNA is a one-way integration (OWNA → Kiros display; no write-back).

**Not-configured state:** When `OWNA_API_KEY` is absent, all `/owna/*` pages show an error: "Unable to load data — OWNA API error: 500". Once the key is set, pages load live data.

#### `/owna/children` — Children and Rooms
**Confidence: 78** (Now shows live OWNA data — 336 children with detailed table.)

- **Stat tiles:**
  - 336 total children
  - 0 present
  - 53 absent/away
  - 96 reported
  - 21 bookings blocked
  - 43 medical conditions
  - 22 dietary requirements
  - 0 additional needs
  - 3 anaphylaxis
  - 4 other
- **Table columns:** Name | Room | Age | Gender | Blocked days | Enrolled since date
- **Data state:** Live — 336 real children. Live data date shown as 18/02/2026.
- **Role access:** manager minimum.

#### `/owna/attendance` — Attendance
**Confidence: 55** (API key is set but endpoint returns 400 — likely a date parameter or endpoint mismatch. Feature concept valid but currently non-functional.)

- **Current state:** Error — "Unable to load data. OWNA API error: 400". Error changed from 500 (missing key) to 400 (bad request) — the API key reaches the server but the attendance endpoint requires additional parameters or the endpoint path differs from what is configured.
- **UI element visible:** "Retry" button.
- **Data state:** Error — no data displayed.
- **Fix required:** The attendance API call likely has a missing or malformed date parameter.

#### `/owna/staff` — Staff Dashboard
**Confidence: 75** (Staff Dashboard now loads live OWNA data — long list of staff with roles, status, and hire dates.)

- **Layout:** Page title "Staff Dashboard" + filter/export controls + scrollable staff list.
- **Staff record row:** Staff avatar/initial + full name + role (Educator, Room Leader, Director, etc.) + room assignment + employment status + start date.
- **Data state:** Live — real centre staff. Extensive list (scrolls below viewport).
- **Role access:** manager minimum.

#### `/owna/families` — Families and Billing
**Confidence: 72** (Shows live OWNA data — 182 accounts, $696K in billing.)

- **Stat tiles:**
  - 182 total accounts
  - $696,167.83 outstanding billing
  - 5 families
  - 100 families on payment plans (purple tile)
- **Table columns:** Account name | Parent names | Children listed | Outstanding balance (in red) | Status badge
- **Data state:** Live — real family accounts. Mix of real families and some test data entries ("TEST TEST", "TESTING BARNARD"). Balances from $0 to over $10,000.
- **Role access:** manager minimum. Likely admin/manager only given billing sensitivity.

#### `/owna/enrolments` — Enrolment Pipeline
**Confidence: 75** (Shows hundreds of live enrolments across three pipeline stages — actively used feature.)

- **Layout:** Three-stage pipeline header (Enquiry / Waitlist / Enrolled with counts) + export + date filters + progress bar indicator + enrolment table.
- **Table columns:** Child name | Parent name | Contact email/phone | Room | Start date | Room preferences | Status badge (New, Active, Waitlisted, etc.) | Action link
- **Data state:** Live — hundreds of real enrolment records.
- **Role access:** manager minimum.

#### `/owna/health` — Health and Safety
**Confidence: 70** (Health & Safety Logs now loads live OWNA data — 65 incidents/accidents/medication logs.)

- **Stat tiles:**
  - 65 total incidents
  - 61 accidents
  - 3 medications (purple)
- **Filter controls:** Incidents / Accidents / Medication + date range picker + export button.
- **Table columns:** Date | Child name | Staff (logged by) | Location | Injury/incident type | Copying/treatment taken | Parent notified | Action buttons
- **Data state:** Live — real events from 2022 onwards. Real child and staff names visible.
- **Role access:** manager/admin minimum (regulatory records).

---

### 3.10 Marketing

#### `/marketing` — Marketing Hub
**Confidence: 65** (Marketing hub with 1 connected Facebook account and live inbox data — partially adopted.)

- **Layout:** Stat tiles row + content panels.
- **Stat tiles:**
  - Connected Accounts: 1
  - Published Posts: 0
  - Unread Reviews: 0
  - Active Campaigns: 0
- **Recent Content panel:** Empty state.
- **Review Alerts panel:** No unread reviews.
- **Upcoming calendar panel:** Nothing scheduled.
- **Accounts panel:** Shows "Kiros Early Education (Facebook, connected — green dot)".
- **Header actions:** "+ New Content" button + "Marketing AI" button.
- **Data state:** 1 connected account (Facebook). All content metrics empty.
- **Role access:** manager minimum.

#### `/marketing/content` — Content Management
**Confidence: 58** (Content workflow is well-built — draft→review→publish — but completely empty.)

- **Layout:** Tabs + search bar + content card list + "+ New Content" button.
- **Tabs:** All | Drafts (0) | Pending Review (0) | Scheduled (0) | Published (0)
- **Main area:** "No content found" empty state.
- **Data state:** Empty — zero posts in any state.

#### `/marketing/content/new` — Create Content
**Confidence: 62** (Create content form with platform selection, scheduling, and AI generation — functional workflow but no posts created yet.)

- **Layout:** Two-column form.
- **Left column:**
  - Content Type tabs: Post (selected) | Reel | Story | Google Update | YouTube Video
  - Optional title field
  - Main content textarea with character counter
  - Hashtags field
- **Right sidebar:**
  - Platform checkboxes: Facebook, Instagram, Google Business, YouTube
  - Schedule date/time picker
  - "Generate with Marketing AI" button
  - Action buttons: Save Draft | Submit for Review | Publish Now
- **Data state:** Empty form — no content created yet.

#### `/marketing/calendar` — Content Calendar
**Confidence: 45** (Content calendar empty — no posts scheduled.)

- **Layout:** Monthly grid calendar for April 2026.
- **All calendar cells:** Empty — no posts scheduled.
- **Controls:** Month/Week view toggle + "Today" button + prev/next month arrows. "+ New Content" button.
- **Data state:** Empty — no scheduled content.

#### `/marketing/feed` — Post Feed
**Confidence: 48** (Post Feed empty — no posts published yet.)

- **Layout:** Empty state: "No published posts yet" with "Create your first post" link. "Sync Engagement" button in header.
- **Purpose:** Shows published posts and their engagement metrics across platforms.
- **Data state:** Empty — dependent on content workflow adoption.

#### `/marketing/inbox` — Messaging Inbox
**Confidence: 80** (Live Facebook Messenger inbox with 8 real conversations — the marketing module's highest-value feature.)

- **Layout:** Two-panel inbox. Left panel = conversation list, right panel = thread view.
- **Left panel — 8 real conversations:**
  - Syeda Zerlish Fatima Rizvi (Facebook icon badge + timestamp)
  - Annette Ballard — 16 messages
  - Anjanita Prasad
  - Debbie Stevenson
  - Christine Brown
  - Masum Alam
  - Lalitha Ak
  - Susanne Knudsen Error
- **Right panel (no conversation selected):** "Select a conversation to view messages" placeholder.
- **Data state:** Live — 8 real Facebook Messenger conversations.
- **Header:** "Sync Messages" button.
- **Role access:** manager minimum.

#### `/marketing/comments` — Comments
**Confidence: 45** (Comments moderation — empty because no posts are published.)

- **Layout:** Tabs + empty state.
- **Tabs:** Unread (0) | All (0) | Replied (0)
- **Main area:** "No comments in this category" empty state.
- **Header:** "Sync Comments" button.
- **Data state:** Empty — dependent on published posts.

#### `/marketing/reviews` — Reviews
**Confidence: 55** (Review management with draft-and-approve workflow — currently empty but concept is valuable.)

- **Layout:** Tabs + empty state.
- **Tabs:** All (0) | Unread (0) | Draft Response (0) | Pending Approval (0) | Responded (0)
- **Main area:** "No reviews in this category" empty state.
- **Covers:** Google Business and Facebook reviews.
- **Workflow (built but unused):** Draft response → approve → post.
- **Data state:** Empty.

#### `/marketing/ads` — Ad Campaigns
**Confidence: 35** (Ad campaign manager empty — Meta and Google API integrations not fully configured for ad management.)

- **Layout:** Tabs + empty state.
- **Tabs:** All (0) | Active (0) | Draft (0) | Paused (0) | Completed (0)
- **Main area:** "No campaigns found" empty state.
- **Header:** "+ New Campaign" button.
- **Data state:** Empty. Requires Meta Ads and Google Ads API keys.

#### `/marketing/analytics` — Analytics
**Confidence: 30** (Analytics dashboard with 6 platform tabs — all empty. No platform connections beyond Facebook.)

- **Layout:** Platform tabs + time range toggle + empty state.
- **Tabs:** Overview | Facebook | Instagram | Google Business | Google Ads | GA4 | YouTube
- **Time range toggle:** 7 days / 30 days (selected) / 90 days
- **All tabs:** "No analytics data yet" empty state. Instructions: "Data syncs automatically from connected accounts in Settings."
- **Data state:** Empty — no platform connections beyond Facebook, and no post data for metrics.

#### `/marketing/settings` — Marketing Settings
**Confidence: 72** (Now confirms Meta/Facebook is Connected — inconsistency from earlier pass is resolved.)

- **Layout:** Platform connection cards.
- **Meta (Facebook & Instagram) card:** Shows "Kiros Early Education / Facebook" with green "Connected" badge + "Reconnect" button. Confirmed connected.
- **Google Services card:** "No Google accounts connected" + "Connect" button.
- **Data state:** 1 connected account (Meta/Facebook). Google not connected.

---

### 3.11 Recruitment

#### `/recruitment` — Recruitment Root (404)
**Confidence: 5** (The /recruitment root is a 404 — broken nav. Not a feature, just a missing route redirect.)

- **Current state:** Next.js 404 page ("This page could not be found"). Blank white page with centred 404 error.
- **Note:** The RECRUITMENT sidebar group links to `/candidates` and `/candidates/positions`. The sidebar label "RECRUITMENT" is a nav group heading, not a clickable link. This should redirect to `/candidates`.

#### `/candidates` — Candidates
**Confidence: 55** (Recruitment pipeline well-built — 14 test/UAT candidates, no real adoption yet.)

- **Layout:** Tabs + positions filter dropdown + candidate list.
- **Tabs:** All (14) | Invited (14) | In Progress (0) | Completed (0) | Approved (0) | Rejected (0)
- **Positions dropdown filter:** All Positions
- **Candidate entries:** 14 — all test/UAT data. Names like "Test Candidate 177...", "Deep UAT Candidate 177...". Email addresses using example.com. Positions: "QA Test Position / Deep UAT Position" as educator roles. All have "invited" status, created 15 Apr 2026.
- **Header actions:** "New Position" button + "Invite Candidate" button.
- **Data state:** 14 test/UAT candidates — needs data cleanup before real use.
- **Role access:** ns minimum (inferred).

#### `/candidates/positions` — Positions
**Confidence: 52** (18 positions listed — all test/UAT data, needs cleanup.)

- **Layout:** Position rows table.
- **Positions visible:** ~18 — all test/UAT data (QA Test Position and Deep UAT Position with numeric IDs). Most are "open" status for "educator" role, created 15 Apr 2026. One has "draft" status.
- **Row fields:** Position name | Status badge | Role | Candidate counts (0 or 1 per position) | Room assignment (some Deep UAT positions specify Room: Joeys) | Action buttons: Edit, Close Position (red), Questions (0)
- **Header:** "+ New Position" button.
- **Data state:** Test/UAT data only.

---

### 3.12 Programming and Pedagogy

#### `/programming` — Programming and Pedagogy Hub
**Confidence: 75** (Programming hub has 15 docs this month, 3 active rooms, and references real QA1 goals — functional with real data.)

- **Layout:** Quick-create action buttons + stat tiles + Programming Cycle section + recent documents list. Single page (no sub-routes visible).
- **Quick-create buttons (4, with colour-coded left borders):**
  - New Weekly Plan (blue)
  - New Learning Story (pink)
  - New Observation (amber)
  - New Critical Reflection (purple)
- **Stat tiles:**
  - Docs This Month: 15
  - Active Rooms: 3
  - Recent Documents: 2
  - QA1 Active Goals: 2
- **Programming Cycle section:** Plan-Do-Study-Act (PDSA) phases as colour-coded cards with descriptions.
- **Recent Programming Documents list:** 2 Board Report documents dated 12 Apr 2026. Room and Type filter dropdowns above list.
- **Data state:** Real — 15 documents this month, 3 rooms, 2 QA1 goals.
- **Role access:** el minimum (role-gated in sidebar). Not visible to all roles.

---

### 3.13 Admin

#### `/admin/users` — User Management
**Confidence: 80** (User management with roles, page permissions, and 3 real users — essential admin function.)

- **Layout:** Header with "+ Add User" button + user table.
- **Table columns:** Name | Email | Role (dropdown) | Pages (link showing count or "All (admin)") | Joined date
- **3 real users:**
  - Rony Kirollos — Approved Provider — All pages
  - Annette Ballard — Nominated Supervisor — All pages
  - Justina Abadier — Educator — 11 pages
- **Data state:** Real — 3 users.
- **Role access:** admin only.

#### `/admin/context` — AI Context Manager
**Confidence: 82** (AI grounding data extracted from centre's QIP and philosophy — a differentiating feature.)

- **Layout:** Page heading + scrollable list of context records. Very dense — long list.
- **Each context record:** Context type badge (QIP Goal, Teaching Approach, etc.) + title + content preview + related QA badges + action buttons.
- **Purpose:** This is the grounding data used by Kiros AI Chat. Extracted from the centre's QIP and philosophy documents. Makes Kiros AI context-aware of the specific centre.
- **Data state:** Populated — many entries from QIP and philosophy documents.
- **Role access:** manager minimum.

#### `/admin/notifications` — Notification Settings
**Confidence: 55** (Simple toggle notification settings — thin feature, three preferences only.)

- **Layout:** Three toggle switches + "Save Settings" button.
- **Toggles (all currently enabled — purple):**
  1. Notify on comments
  2. Notify on status changes
  3. Notify on task/training assignments
- **Data state:** Configured — all 3 notifications enabled.
- **Role access:** All roles can set their own notification preferences (inferred). Admin can see this under Admin menu.

#### `/admin/sharepoint` — SharePoint Integration
**Confidence: 40** (SharePoint sync exists — Microsoft keys not configured, currently integration-blocked.)

- **Layout:** Long page with authentication status + site URL config + folder browser tree + synced documents list.
- **Requires:** MICROSOFT_TENANT_ID and related Microsoft client credentials.
- **Data state:** Not configured — Microsoft keys were added during Pass 2 but the integration was not confirmed working.
- **Role access:** admin minimum.

#### `/admin/agents` — AI Agents
**Confidence: 80** (12 specialist AI agents with a master prompt editor — sophisticated AI configuration.)

- **Layout:** Master prompt editor at top + Specialist Agents section below.
- **Master prompt editor:** Tabs — System Prompt (active, showing full identity, expertise, and response rules) | Role Instructions | Settings
- **Specialist Agents section:** 12 Total (12 Active, 0 Inactive)
- **Agents listed:**
  - QA1 through QA7 (one agent per Quality Area)
  - Educational Leadership Agent
  - Compliance Agent
  - Marketing Agent
  - Recruitment Agent
  - Learning Module Agent
- **Each agent card:** Domain keywords + tool counts + priority scores + Disable / Edit / Delete actions.
- **Note:** This page is titled "AI Configuration" in the UI despite being the Agents page. This is confusing — see Known Gaps section.
- **Data state:** 12 configured and active agents.
- **Role access:** manager minimum (inferred).

#### `/admin/ai-prompts` — AI System Prompts
**Confidence: 65** (Modular prompt section manager — architecture sophisticated but feature unused, 0 sections.)

- **Layout:** Stats + filter chips + role filter + empty state + action buttons.
- **Stats:** Total Sections: 0 | Active: 0 | Inactive: 0
- **Section filter chips:** All | Identity | Expertise | Role Instructions | Response Rules | Document Templates | Custom
- **Role filter:** All | Global | Admin | Manager | Nominated Supervisor | Educational Leader | Educator
- **Empty state explanation panel:** Sections assemble at runtime into the full system prompt. Role-specific sections only load for matching users. Edits are version-controlled.
- **Header actions:** "Preview Full Prompt" button + "+ Add Section" button.
- **Data state:** Empty — no sections configured yet. The architecture exists but is unused.
- **Role access:** admin only.

#### `/admin/ai-config` — AI Configuration
**Confidence: 75** (Comprehensive AI config with 15 tabs — well-designed admin control plane. All tabs now documented.)

- **Layout:** 15-tab settings page. Tabs scroll horizontally on smaller viewports.
- **Tabs (all 15):** Model & Thinking | Chat | Agent Defaults | Uploads | Learning | Brand | Document Styling | Tool Permissions | Display | Marketing | Widget | Reports | Cron & Jobs | Service Details | System

**Model & Thinking tab** (51-admin-ai-config.png):
- Chat Max Tokens: 16384 | Default Model: opus
- Opus Model ID: claude-opus-4-20250514 | Sonnet Model ID: claude-sonnet-4-20250514
- Simple Message Max Length: 50 chars (routes short messages to Sonnet)
- Thinking Budget: 10000 tokens | Extended Thinking: enabled

**Chat tab** (51b-ai-config-chat.png):
- Context Types in Prompt: `["qip_goal","qip_strategy","philosophy_principle","service_value","leadership_goal"]`
- History Limit: 60 messages (min 10, max 200)
- Max Tool Iterations: 5 per message
- Prompt Size Warning: 100000 chars
- Suggestions Limit: 20 (min 5, max 50)
- AI Title Generation: enabled | Title Max Tokens: 30

**Agent Defaults tab** (51c-ai-config-agent-defaults.png):
- Default Max Iterations: 5 | Default Agent Model: sonnet
- Default Token Budget: 8192 (min 512, max 32768)
- Default Agent Tools: `["search_centre_context","get_qa_progress","get_overdue_items","get_policies","get_policy_detail","get_checklists","get_checklist_detail","get_documents","read_document_content","get_room_data"]`

**Uploads tab** (51d-ai-config-uploads.png):
- Max File Size: 10 MB | Max Files Per Upload: 10
- Signed URL Expiry: 3600 seconds | Text Truncation Limit: 50000 chars

**Learning tab** (51e-ai-config-learning.png):
- Correction Confidence: 0.9 | Default Confidence: 0.8
- Max Learnings in Prompt: 30 | Reinforcement Increment: 0.05
- Controls AI self-learning from user feedback and corrections

**Brand tab** (51f-ai-config-brand.png) — see also section 2.4:
- Centre Name: `Kiros Early Education`
- Centre Name (Uppercase): `KIROS EARLY EDUCATION`
- Entity Name: `HWAW Kirollos Childcare Pty Ltd`
- Gold/Accent Colour: `#EDC430`
- Location: `Blackett, NSW`
- Primary Colour: `#470DA8`
- QA Area Colours: `["#e74c3c","#e67e22","#2ecc71","#3498db","#9b59b6","#1abc9c","#34495e"]` (QA1–QA7)
- SE Number: `SE-00017066`
- Document Tagline: `Generated by Kiros AI Assistant`

**Document Styling tab** (51g-ai-config-document-styling.png):
- Four collapsed accordions: EXCEL Styles | HTML Styles | PDF Styles | WORD Styles
- Allows configuring visual style of AI-generated documents per format

**Tool Permissions tab** (51h-ai-config-tool-permissions.png):
- Full permission matrix: every AI tool against every role (Admin, Manager, NS, EL, Educator) + Active toggle
- Tool types: `main` (quality/operations/learning) vs `marketing` (social/content)
- Tools include: assign_training, create_candidate_invite, create_checklist_instance, create_lms_module, create_onboarding_plan, create_task, delegate_to_agents, export_document, generate_ad_copy, generate_analytics_report, generate_content_ideas, generate_document, generate_interview_questions, generate_social_post, get_activity_log, get_candidates, get_checklist_detail, get_checklists, get_competitor_insights, get_compliance_items, get_content_calendar, get_dashboard_summary, get_documents, get_forms, get_learning_data, get_learnings, get_marketing_performance, get_overdue_items, get_policies, get_policy_detail, get_progress, get_qa_progress, get_room_data, get_roster_data, get_staff_training_status, get_team_profiles, read_document_content, request_agent_feedback, request_db_review, reset_learning, schedule_content, search_centre_context, search_platform, suggest_improvements, update_item

**Display tab** (51i-ai-config-display.png):
- Agent Summary Length: 300 chars | Context Snippet Length: 150 chars
- Document Preview Length: 500 chars

**Widget tab** (51k-ai-config-widget.png):
- Widget Height: 550px (min 400, max 800) | Widget Width: 420px (min 300, max 600)
- Max Messages in localStorage: 20 | Speech Language: `en-AU` (Australian voice recognition)

**Reports tab** (51l-ai-config-reports.png):
- Max Export Rows: 10000 (min 100, max 100000)
- Preview Row Limit: 50 (min 10, max 200)

**Service Details tab** (51n-ai-config-service-details.png):
- Empty state — "No service details found." Key/Value store for additional metadata. Currently unpopulated.

**System tab** (51o-ai-config-system.png):
- Mandatory Qualifications: `["first_aid","cpr","anaphylaxis","asthma","child_protection","wcc","food_safety"]`
- QIP Weight: Compliance 0.2 | Elements 0.4 | Tasks 0.3 | Training 0.1 (must sum to 1.0)
- Graph API Version: `v1.0` | OWNA API URL: `https://api.owna.com.au`
- OWNA Centre ID: `5B0583630ead9d0af4be45f7`
- SharePoint Token Expiry: 3600 seconds

**Note (Marketing and Cron & Jobs tabs):** Due to tab scroll behaviour, these two tabs were not captured with unique content. Their settings configuration remains unknown.

- **Data state:** Configured — all major settings are populated with live values.
- **Role access:** admin only.

---

### 3.14 AP Dashboard

#### `/ap-dashboard` — Approved Provider Dashboard
**Confidence: 88** (Executive summary for the AP role — NQS rating, QIP progress 11%, staff compliance, quality area breakdown. Real data, role-specific, high value.)

- **Layout:** Heading + Print button + four stat tiles + QIP Goals section + Staff & Training panel + Operational Health panel + Quality Area Breakdown grid.
- **Top stat tiles:**
  - NQS Rating Status: "Working Towards"
  - Elements Met: 6/40
  - QIP Progress: 11%
  - Compliance Alerts: 17
- **QIP Goals Progress section:** All 46 goals listed with progress bars and QA badges.
- **Staff & Training panel:** Qualification compliance per staff member.
- **Operational Health panel:** Checklist and ticket counts.
- **Quality Area Breakdown grid:** QA1–QA7, each showing met count + QIP goal count + progress percentage.
- **Header:** "Print" button — triggers `window.print()`.
- **Data state:** Real — live NQS data, live QIP progress, real staff compliance gaps.
- **Role access:** admin only.

---

## 4. Role-Based Access Summary

The tour was conducted entirely as Approved Provider. Role mapping is inferred from sidebar observations, synthesis notes, and CONTEXT.md. Rows marked with (?) are uncertain.

| Feature Domain | Admin (AP) | Manager | NS | EL | Educator |
|---|---|---|---|---|---|
| Dashboard `/dashboard` | Full | Full | Full | Full | Own data only |
| Centre Hub `/hub` | Yes | Yes | Yes | Yes | Yes |
| QA Elements `/elements` | Full | Full | Full | View (?) | No (?) |
| Task Board `/tasks` | Full | Full | Full | Full | Own tasks |
| Compliance `/compliance` | Full | Full | Full | No (?) | No |
| Policies `/policies` | Full | Full | Create/publish | View/acknowledge | View/acknowledge |
| Checklists `/checklists` | Full | Full | Full | Assigned | Assigned only |
| Rostering `/rostering` | Full | Full | View (?) | No | No |
| Documents `/documents` | Full | Full | Full | View/upload | View/upload |
| Registers `/registers` | Full | Full | Full | View/add rows | View/add rows |
| Forms `/forms` | Full | Full | Full | Submit | Submit |
| Learning Hub `/learning` | Full | Full + team view | Full + team view | Own + team (?) | Own only |
| Module Library `/learning/library` | Full | Full | Full | Full | Browse/enroll |
| Training Matrix `/learning/matrix` | Full | Full | Full | No (?) | No |
| Certificates `/learning/certificates` | Full | Full | Full | Own | Own |
| Reports `/reports` | Full | Full | View (?) | No | No |
| Data Extract `/reports/extract` | Full | Full | No (?) | No | No |
| Activity Feed `/activity` | Full | Full | No (?) | No | No |
| OWNA pages | Full | Full | No (?) | No | No |
| Marketing | Full | Full | No | No | No |
| Recruitment | Full | Full | Full | No | No |
| Programming | Full | Full | Full | Full | No (?) |
| Admin → Users | Full | No | No | No | No |
| Admin → AI Context | Full | Full | No | No | No |
| Admin → Notifications | Own prefs | Own prefs | Own prefs | Own prefs | Own prefs |
| Admin → SharePoint | Full | Full (?) | No | No | No |
| Admin → AI Agents | Full | Full | No | No | No |
| Admin → AI Prompts | Full | No | No | No | No |
| Admin → AI Config | Full | No | No | No | No |
| AP Dashboard | Full | No | No | No | No |

**Caveat:** All role access observations are inferred. Only the Approved Provider (admin) role was captured. Role variants for NS, EL, and Educator are unknown. The `allowed_pages` array further restricts individual users below their role defaults.

---

## 5. UX Patterns Inventory

These patterns repeat across the application. A rebuild should implement each as a standard component.

### 5.1 Tab-Based Filtering
Used everywhere. Tabs show label + count badge in parentheses (e.g., "Drafts (0)", "Invited (14)"). Active tab is underlined or filled. Clicking a tab filters the list/table beneath without page reload.

### 5.2 Kanban Board
Used in Tasks (`/tasks`). Fixed-width columns. Columns have label + card count badge. Cards show compact task metadata. Cards support drag-to-move (observed in description; actual drag interaction not captured in screenshot). Board/List toggle in header switches between kanban and table views.

### 5.3 Stat Tile Row
Used on: Dashboard, Hub, Checklists, Learning Hub, Learning Matrix, Reports, AP Dashboard, OWNA pages, Marketing Hub. Pattern: horizontal row of cards, each card has icon (optional) + large number + label. Row scrolls horizontally on mobile. On AP Dashboard and Reports, tiles include colour coding (green/amber/red based on value thresholds).

### 5.4 Card Grid
Used for: Module Library (3-column), Register gallery (multi-column), Forms gallery (2-column), Resource cards (multi-column), Pathway cards. Cards have consistent anatomy: icon/thumbnail + title + metadata badges + action button(s).

### 5.5 Inline Status Dropdowns
Used in: Compliance table, Admin Users table, Task cards. Status is a clickable element that opens a dropdown inline within the table row — no full page navigation required to update a status.

### 5.6 Badge and Pill System
Three distinct badge types used throughout:
- **Rating badges (filled colour):** Not Met, Working Towards, Meeting, Exceeding. Solid colour fill.
- **Status badges (outline/light fill):** Not Started, In Progress, Done, Completed. Usually lighter variant of a colour.
- **QA area badges:** Each QA area (QA1–QA7) has its own colour badge. Used on element rows, module cards, pathway cards, context records, QIP goal lists. Consistent colour assignments throughout.

### 5.7 Modal vs Full-Page Detail
From what was captured, detail views were NOT captured in this tour — only list views. Based on observed "+ Add Task", "+ Add Goal" patterns and the presence of slide-in panels mentioned in the task board header, the system likely uses slide-in panels (right-side drawers) for record creation and editing, not full-page navigation. The kanban task detail is inferred to be a slide-in panel based on UX convention and the compact card design.

**Slide-in panels — UNCONFIRMED:** Pass 3 (2026-04-19) attempted automated capture of detail views for 5 features (QA Elements, Tasks, Learning Modules, Candidates, Registers). In all 5 cases, the row/card click did not open a detail view in automated capture — either the list page reloaded or the click target was not the interaction point for the panel. This means slide-in panels remain a strong inference but are NOT visually confirmed in any screenshot. A manual browser tour is required to confirm whether detail views use slide-in drawers, inline expand rows, or separate full-page routes. Until confirmed, designs for Baku should assume slide-in panels as the default pattern for record editing (consistent with the app's compact card-based layout and the existing + Add patterns).

### 5.8 Floating AI Chat Bubble
Purple circular button, bottom-right corner, present on every authenticated page (confirmed present across multiple screenshots). Opens the Kiros AI Chat interface without navigating away from the current page.

### 5.9 Page Header Row Pattern
Every content page has a consistent heading row:
- Route breadcrumb (above or inline)
- Page title (24px bold)
- Subtitle or description (smaller, below title)
- Primary action button(s) at right: "+ Add [Thing]", "Manage Templates", "Print Report", etc.

### 5.10 Progress Bar with QA Badges
Used in: Hub (QIP Goals list), AP Dashboard (QIP Goals Progress), Learning Pathways. Each item in the list shows: label text + QA colour badge(s) + horizontal progress bar.

### 5.11 Two-Panel Messaging Layout
Used in: AI Chat (`/chat`), Marketing Chat (`/marketing/chat`), Marketing Inbox (`/marketing/inbox`). Left panel (30–35% width): list of conversations/contacts. Right panel (65–70% width): active thread or empty-state placeholder. Clicking a list item loads the thread in the right panel without page navigation.

---

## 6. Integration-Dependent Features

| Integration | API Key Required | Features That Fail Without It |
|---|---|---|
| **Supabase** (URL + anon key) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Login fails; all data loads return null; blank dashboards |
| **Supabase service role** | `SUPABASE_SERVICE_ROLE_KEY` | Badge counts, AI chat tools, cron jobs, document export, reports extract |
| **Anthropic Claude API** | `ANTHROPIC_API_KEY` | AI Chat (`/chat`, `/marketing/chat`), AI context extraction, AI document generation, Programming AI, AI suggestions on dashboards |
| **OWNA API** | `OWNA_API_KEY` | All 6 `/owna/*` pages show error state. Children, Staff, Families, Enrolments, Health return 500. Attendance returns 400 even with key set (code bug). |
| **Meta (Facebook/Instagram)** | OAuth token (stored in DB after OAuth flow) | Marketing Inbox live data, Review sync, Post publishing to Facebook/Instagram |
| **Google Services** | OAuth + API keys | Google Business reviews, Google Analytics/GA4, Google Ads, YouTube — all empty without Google connection |
| **Microsoft / SharePoint** | `MICROSOFT_TENANT_ID` + client credentials | Admin SharePoint integration, Documents library sync |

---

## 7. Known Gaps in This Specification

### 7.1 Detail and Record Views — Partial Capture in Pass 3

Pass 3 attempted to click into detail views for 5 features. Results:

- **QA Elements** (`/elements`) — clicking a row did NOT open a detail view. The elements list uses a compact read-only row design. Element detail likely requires a different interaction (inline expand, or a dedicated route `/elements/[id]` not accessible by row click). The full 40-element scrollable list view IS captured as 58-element-detail.png.
- **Task Board** (`/tasks`) — clicking a task card did NOT open a detail modal/panel in automated capture. The Kanban board reloaded. Task detail slide-in panel likely requires a deliberate click on a specific area of the card. Full board view captured as 59-task-detail.png showing all 22 tasks.
- **Learning Module** (`/learning/library`) — Start button click did NOT navigate to a module player. Module library list view captured as 60-learning-module-detail.png showing all 41 modules.
- **Candidate profile** (`/candidates`) — row click did NOT navigate to a profile page. Candidates list captured as 61-candidate-profile.png.
- **Register entries** (`/registers`) — Open button click stayed on the register gallery. Register gallery captured with full column detail visible as 62-register-entries.png.

Detail views still NOT captured (no screenshots exist):
- Policy detail (`/policies/[id]`)
- Checklist completion view (`/checklists/[id]`)
- Individual module player (`/learning/modules/[id]`)
- Register data entry table view (clicking Open on a register)

These will require a manual tour pass with live browser interaction.

### 7.2 Only Approved Provider Role Captured

Every screenshot was taken as Rony Kirollos (Approved Provider / admin). Role-specific variations are unknown:
- What does the sidebar look like for an Educator? (likely fewer sections)
- What does the Dashboard look like for an Educator? (likely shows only own tasks/checklists)
- What buttons are hidden or disabled for NS vs Educator on the compliance or elements pages?
- Does the Learning Hub `/learning` look different for an educator with no manager access?

### 7.3 AI Config — 13 of 15 Tabs Now Documented (Pass 3)

All 15 tabs were navigated in Pass 3. 13 tabs were captured with unique content. Two tabs (Marketing and Cron & Jobs) were not captured with their own content due to a tab scroll issue — their screenshots show the Display and Reports content respectively. See section 3.13 for complete tab documentation.

### 7.4 Mobile and Tablet Viewports Not Tested

All screenshots were captured at desktop viewport. Mobile layout (sidebar as drawer, bottom tab bar, stacked columns) and tablet layout (icon-only collapsed sidebar) were not verified.

### 7.5 Forgot Password Flow Not Captured

The Login page does not show a visible "Forgot password" link in the screenshot. Whether this route exists (`/login/forgot-password`) was not verified.

### 7.6 Known Broken Routes

- `/recruitment` → returns Next.js 404. Navigation heading exists in sidebar but does not link correctly.
- `/owna/attendance` → returns OWNA API 400 error even with API key set. Likely a malformed date parameter in the API call.

### 7.7 Training (`/training`) vs Learning Hub (`/learning`) Ambiguity

Two separate routes exist for training/learning. `/training` appears to be a legacy module list (8 modules, no assignments). `/learning` is the active LMS (41 modules, real enrollments, pathways, certificates). The relationship between these two is unclear — they may need to be consolidated in a rebuild.

### 7.8 Document Routes (`/documents` vs `/documents/library`) — Resolved in Pass 3

`/documents/library` was captured in Pass 3 (57-documents-library.png). The two routes serve distinct purposes:
- `/documents` — user-uploaded documents (QA-area organised, drag-and-drop upload). Currently empty.
- `/documents/library` — AI-generated documents (newsletters, meeting agendas, board reports). Contains real content from April–May 2026. This is where Kiros AI outputs documents it generates on request.

The sidebar calls this "AI Documents" or "Document Library" (distinct from "Documents"). The AI Document Library has its own dedicated sidebar navigation structure.

### 7.9 Recruitment Data is All Test/UAT

All 14 candidates and 18 positions in the recruitment module are programmatically named test data ("Test Candidate 177...", "QA Test Position", "Deep UAT Position"). No real recruitment data exists. This module would need a data cleanup before real use and is not a good representation of production state.

### 7.10 Naming Inconsistency in Admin

The `/admin/agents` page is labelled "AI Configuration" in its page title UI, but it is actually the Agents page. The real AI Configuration settings page is at `/admin/ai-config`. This naming conflict may confuse developers and should be corrected in a rebuild.

---

*End of UX Specification. Source: tour.yml (76 screenshots across 3 passes, 2026-04-19), CONTEXT.md, CLAUDE.md. Pass 3 added: /documents/library, all 15 AI Config tabs, full Register column details, and 5 detail-view capture attempts.*
