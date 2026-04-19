# Kiros Quality Portal — UX Specification

**For:** Baku (AI app builder)  
**Purpose:** Complete screen-by-screen UX specification for a ground-up rebuild of the Kiros Quality Portal — an operational platform for Kiro's Early Education Centre (Blackett, NSW).  
**Status:** Authoritative. Feed this document directly to Baku as the rebuild source of truth.

---

## 1. System Overview

### 1.1 Purpose

Centralises NQS (National Quality Standard) compliance, staff management, learning, checklists, rostering, and AI-assisted guidance. Replaces scattered spreadsheets and paper forms. Primary driver: ACECQA Assessment & Rating cycle compliance.

### 1.2 Roles and Access

| Role Code | Role Name | Who | Access Level |
|---|---|---|---|
| `admin` | Approved Provider | Centre owner | Everything, including AP Dashboard and full Admin panel |
| `manager` | Operations Manager | Centre manager | Near-admin; no AP Dashboard |
| `ns` | Nominated Supervisor | Lead educator/supervisor | Quality management, recruitment; no Admin panel |
| `el` | Educational Leader | EL role | Programming, learning, limited management |
| `educator` | Educator | Floor staff | Tasks, checklists, own learning only |

**Page restriction mechanism:** Each user profile has an `allowed_pages` field. If null or empty, the user can access all pages their role permits. If populated (e.g., `["/tasks", "/checklists"]`), the user can only access those listed paths — used to restrict specific staff below their role default.

### 1.3 Global Layout

The application has a persistent shell around all authenticated pages.

**Shell structure:**
- Left sidebar (fixed, ~240px wide on desktop, collapses to icon-only at 1024px, slides in as drawer with overlay on mobile)
- Top header bar (height 56px): breadcrumb trail on left, user avatar + role badge on right, notification bell with unread count badge
- Main content area: fills remaining space, scrollable, padding 24px

**Mobile (< 768px):** Sidebar is hidden by default. Bottom tab bar with 5 primary icons (Dashboard, Tasks, Checklists, Chat, Profile) provides primary navigation. Sidebar accessible via hamburger button in top header.

---

## 2. Navigation Structure

### 2.1 Sidebar Sections and Items

| Section | Item | Path | Minimum Role |
|---|---|---|---|
| Quality | Dashboard | `/dashboard` | educator |
| Quality | QA Elements | `/elements` | ns |
| Quality | Tasks | `/tasks` | educator |
| Quality | Checklists | `/checklists` | educator |
| Quality | Compliance | `/compliance` | ns |
| Quality | Policies | `/policies` | educator |
| Operations | Registers | `/registers` | educator |
| Operations | Forms | `/forms` | educator |
| Operations | Rostering | `/rostering` | educator |
| People | Learning Hub | `/learning` | educator |
| People | Recruitment | `/candidates` | ns |
| People | OWNA | `/owna/staff` | manager |
| AI | Kiros Chat | `/chat` | educator |
| AI | Documents | `/documents` | educator |
| AI | Programming | `/programming` | el |
| Marketing | Marketing Hub | `/marketing` | manager |
| Admin | Agents | `/admin/agents` | manager |
| Admin | AI Config | `/admin/ai-config` | admin |
| Admin | AI Prompts | `/admin/ai-prompts` | admin |
| Admin | AI Analytics | `/admin/ai-analytics` | manager |
| Admin | AI Learnings | `/admin/ai-learnings` | manager |
| Admin | Centre Context | `/admin/centre-context` | manager |
| Admin | SharePoint | `/admin/sharepoint` | manager |
| Admin | OWNA Settings | `/admin/owna` | admin |
| Admin | Users | `/admin/users` | admin |
| Admin | Tags | `/admin/tags` | manager |
| Admin | Notifications | `/admin/notifications` | manager |
| Other | Activity Log | `/activity` | manager |
| Other | Reports | `/reports` | manager |
| Other | AP Dashboard | `/ap-dashboard` | admin |
| Other | Centre Hub | `/hub` | educator |
| Other | Guide | `/guide` | educator |
| Other | Resources | `/resources` | educator |

**Sidebar item anatomy:** Icon (20px) + label text. Active item: filled background highlight with accent colour left border. Hover: subtle background tint. Sections are collapsible with chevron toggle.

---

## 3. Authentication

### 3.1 Login (`/login`)

**Layout:** Centred card (480px max-width) vertically centred on full-height page with brand background colour.

**Card contents:**
- Centre logo (top centre)
- Heading: "Sign in to Kiros"
- Email input (label: "Email address", type: email, required)
- Password input (label: "Password", type: password, required, show/hide toggle)
- "Sign in" button (full width, primary style)
- Forgot password link (below button, right-aligned)

**States:**
- Default: empty form
- Loading: button shows spinner, inputs disabled
- Error — invalid credentials: inline error banner below button reading "Invalid email or password. Please try again."
- Error — network/server: "Something went wrong. Please try again in a moment."

**Behaviour:** On success → redirect to `/dashboard`. No self-registration. Users are created by admin only. If a logged-in user navigates to `/login`, redirect to `/dashboard`.

### 3.2 Forgot Password (`/login/forgot-password`)

Single input (email) + "Send reset link" button. On submit: show confirmation message regardless of whether email exists. Return to login link.

---

## 4. Dashboard (`/dashboard`)

### 4.1 Layout

Three-zone layout stacked vertically:
1. **Top row** — Quick-stat cards (horizontal scroll on mobile)
2. **Middle row** — Two-column: left = AI Suggestions panel, right = Recent Activity feed
3. **Bottom row** — QA Quality Areas overview (7 area summary cards)

### 4.2 Quick-Stat Cards

Four cards, each: icon + large number + label + trend indicator.

| Card | Label | Who sees it |
|---|---|---|
| Tasks Due | "Tasks due today" | All roles |
| Checklists Pending | "Checklists to complete" | All roles |
| Elements Needing Attention | "Elements below meeting" | ns, manager, admin |
| Staff Unacknowledged Policies | "Policies awaiting acknowledgement" | manager, admin |

Admin/manager cards show centre-wide counts. Educator cards show only their own items.

### 4.3 AI Suggestions Panel

**Left column (60% width):**
- Heading: "Today's Priorities" with AI sparkle icon
- List of suggestion cards (up to 5 shown, "See all" link below)
- Each suggestion card: coloured left border by priority, icon for suggestion type, heading text, 1–2 line description, QA element badge if linked, action button ("View", "Create Task", "Open Chat")
- Suggestions are role-targeted: a manager sees strategic nudges, an educator sees practical task prompts

**Empty state:** Full-height centred message: "Everything is on track. No urgent priorities right now." with a green checkmark icon and two CTA buttons: "Explore Tasks" and "Check Checklists".

### 4.4 Recent Activity Feed

**Right column (40% width):**
- Heading: "Recent Activity"
- Scrollable list of activity entries, newest first
- Each entry: user avatar (24px) + action text + timestamp (relative, e.g., "2 hours ago")
- Admin/manager: shows all users' activity. Educator: shows only their own.
- "View full log" link at bottom

### 4.5 QA Quality Areas Overview

Seven cards in a 4–3 grid. Each card: QA number + name, count of elements by rating status (colour-coded pill counts), overall progress bar.

Click → navigates to `/elements?qa=N`.

---

## 5. QA Elements

### 5.1 List View (`/elements`)

**Layout:** Full-width page with filter bar above a grouped list.

**Filter bar (horizontal, below page heading):**
- Quality Area selector: buttons QA1–QA7 + "All" (default)
- Rating filter: multi-select dropdown (Not Met / Working Towards / Meeting / Exceeding)
- Status filter: multi-select dropdown (Not Started / In Progress / Ready for Review / Completed)
- Assigned To filter: user picker dropdown
- Clear filters link (appears when any filter active)

**List structure:** Elements grouped by Quality Area. Each group has a collapsible heading showing QA number, name, and element count. Default: all groups expanded.

**Element row:**
- Element code (e.g., `1.1.1`) — monospace, bold
- Element name — regular text
- Rating badge — coloured pill: Not Met = red, Working Towards = amber, Meeting = blue, Exceeding = green
- Work status badge — outline pill: Not Started = grey, In Progress = yellow, Ready for Review = purple, Completed = green
- Assigned staff — avatar + name (truncated)
- Chevron → navigate to detail

**Empty filtered state:** "No elements match this filter. Try clearing some filters." with a clear-filters button.

### 5.2 Detail View (`/elements/[id]`)

**Layout:** Two-column (60% / 40% split) below a fixed header row.

**Header row:**
- Element code + name (large heading)
- Rating badge
- Status dropdown (editable for ns, manager, admin)
- Assigned to picker (editable for ns, manager, admin)
- "Create Task" button
- "Add Policy Link" button

**Left column — Evidence:**
- Section: "Officer Finding" — read-only text block (from ACECQA assessment report)
- Section: "Our Response" — editable textarea (autosave on blur, 2000 char limit, character count shown)
- Section: "Actions Taken" — editable textarea (same behaviour)
- Section: "Linked Training" — list of linked LMS modules with completion status per staff. "Link Module" button (opens module picker modal).

**Right column — Linked Items:**
- Section: "Linked Tasks" — compact task cards (title, status badge, assignee). "Create Task" button (pre-fills QA element link).
- Section: "Linked Policies" — list of linked policy names with version. "Add Link" button.

**Comments thread (full width, below both columns):**
- Heading: "Discussion"
- Chronological list of comments: author avatar + name + timestamp + comment text
- Reply button per comment
- Text input at bottom + "Post Comment" button (requires non-empty text)

---

## 6. Tasks (`/tasks`)

### 6.1 Kanban View (default)

**Layout:** Four fixed-width columns with column heading + scrollable card list below.

**Columns:** Todo | In Progress | Review | Done

**Column heading:** name + card count badge.

**Task card:**
- Title (bold, 2 lines max with ellipsis)
- Priority badge: Low = grey, Medium = blue, High = orange, Urgent = red
- Assignee avatar (24px, right-aligned)
- Due date (relative if within 7 days, absolute otherwise; red if overdue)
- QA element badge if linked (e.g., "QA 3.1")

**Card interactions:**
- Click → opens task detail slide-in panel
- Drag card to different column → updates status immediately with optimistic UI; reverts on error with toast

**Toolbar (above kanban):**
- "Create Task" button (primary, right side)
- Filter bar: by priority, by assignee (user picker), by QA element, by due date range
- View toggle: Kanban / List (icon buttons)

### 6.2 List View (toggle)

Table with columns: Title, Priority, Status, Assignee, Due Date, QA Element, Actions. Sortable by column header click. Same filters apply.

### 6.3 Task Detail Slide-in Panel

Slides in from right, 480px wide, overlays content with dim background. Clicking outside closes.

**Fields:**
- Title (editable text input)
- Description (editable textarea, markdown supported)
- Status (dropdown: Todo / In Progress / Review / Done)
- Priority (dropdown: Low / Medium / High / Urgent)
- Assigned To (user picker)
- Due Date (date picker)
- QA Element Link (element picker — searchable list of all 40 elements)
- Tags (multi-select, optional)

**Below fields:** Comments thread (same pattern as element comments).

**Actions:** Save button (appears when edits made), Delete button (admin/manager only, with confirmation dialog), Create another (resets form).

### 6.4 Create Task Panel

Same slide-in panel, opened empty. Fields: same as detail. "Save Task" button. "Cancel" link.

**Empty state (no tasks):** Centred in main content area: "No tasks yet. Create one or ask Kiros Chat to help." with "Create Task" button and "Open Chat" link.

---

## 7. Checklists

### 7.1 Instances List (`/checklists`)

**Layout:** Heading + filter bar + card grid.

**Filter tabs (horizontal):** All | Pending | In Progress | Completed | Failed

**Checklist instance card:**
- Template name (bold)
- Scheduled date
- Assigned to (user avatar + name)
- Completion progress bar (0–100%)
- Status badge: Pending = grey, In Progress = yellow, Completed = green, Failed = red
- "Open" button

**Empty state:** "No checklists scheduled. Ask your manager to set up a schedule."

### 7.2 Completion View (`/checklists/[id]`)

**Layout:** Fixed header + scrollable item list + sticky submit bar at bottom.

**Header:**
- Checklist name + template badge
- Assigned to + date
- Progress indicator: "X of Y items completed" with progress bar

**Item list:** Each item is a card:
- Item name (label, bold)
- Item type determines input:
  - `yes_no` → two large toggle buttons "Yes" (green when selected) / "No" (red when selected)
  - `text` → textarea
  - `number` → number input with optional unit label
  - `photo` → file upload button + thumbnail preview when uploaded
  - `signature` → signature canvas (touch/mouse draw), clear button
- Required indicator (asterisk) if item is marked required
- Failed state: if `yes_no` item answered "No", card gets red left border + "SmartTicket will be created" warning label

**Sticky submit bar:**
- Shows count of failed items (if any): "3 items failed — SmartTickets will be created for each"
- "Submit Checklist" button (primary); disabled until all required items answered
- On submit: confirmation dialog → on confirm: creates SmartTickets for failed items, marks instance complete, redirects to instances list with success toast

### 7.3 Templates List (`/checklists/templates`)

Accessible to admin, manager, ns only.

**Layout:** Heading + "Create Template" button + template card grid.

**Template card:**
- Template name
- Item count badge
- Frequency badge (daily / weekly / ad-hoc)
- Last updated date
- Edit button, Delete button (with confirmation)

### 7.4 Template Edit (`/checklists/templates/[id]`)

**Layout:** Form with two sections side by side on desktop, stacked on mobile.

**Left: Template settings:**
- Name (text input)
- Description (textarea)
- Frequency (select: daily / weekly / monthly / ad-hoc)
- Assigned role (multi-select roles)

**Right: Item list (drag to reorder):**
- Each item row: drag handle + item name input + type selector + required toggle + delete icon
- "Add Item" button at bottom of list

Save button (top right).

---

## 8. Compliance (`/compliance`)

**Layout:** Heading + "Add Item" button + filter bar + table.

**Filter bar:** Status filter (All / Compliant / Non-Compliant / Under Review) + search input.

**Table columns:** Regulation Code | Description | Status | Due Date | Assigned Staff | Actions

**Status:** Compliant = green badge, Non-Compliant = red badge, Under Review = amber badge. Click on status badge → inline dropdown to update.

**Actions column:** Edit (pencil icon) | Delete (trash icon, with confirmation, admin/manager only).

**Add/Edit panel:** Slide-in from right. Fields: regulation code, description, status (dropdown), due date (date picker), assigned to (user picker), notes (textarea). Save / Cancel.

**Empty state:** "No compliance items yet. Add the first one."

---

## 9. Policies

### 9.1 List (`/policies`)

**Layout:** Heading + "New Policy" button (admin/manager/ns only) + filter bar + card grid.

**Filter bar:** Category filter (dropdown) + search input.

**Policy card:**
- Policy name (bold)
- Category badge
- Version number (e.g., "v2.1")
- Review due date (amber if within 30 days, red if overdue)
- Acknowledgement count ("14/18 staff")
- View button

### 9.2 Detail View (`/policies/[id]`)

**Layout:** Page heading row + tab bar + tab content.

**Heading row:** Policy name + version badge + Edit button (admin/manager/ns) + "Send Reminder" button (admin/manager).

**Tabs:** Content | Version History | Acknowledgements

**Content tab:** Rendered markdown (read-only). If current user has not acknowledged: prominent "Acknowledge this Policy" button (blue, full width at bottom of content).

**Version History tab:** Table — Version | Date | Author | Change Summary. Click row to view that version's content (read-only modal).

**Acknowledgements tab:** Two lists — "Acknowledged" (green check per user, with date) and "Pending" (grey user list). "Send Reminder to Pending" button.

### 9.3 New/Edit (`/policies/new`, `/policies/[id]/edit`)

**Layout:** Full-page form.

Fields:
- Title (text input)
- Category (select or creatable-select)
- Review interval (select: 6 months / 1 year / 2 years)
- Tags (multi-select)
- Content (markdown editor with preview toggle)

Save as Draft / Publish buttons. Cancel link.

---

## 10. Registers

### 10.1 List (`/registers`)

**Layout:** Heading + "Create Register" button + register card grid.

**Register card:**
- Register name
- Description (1 line truncated)
- Entry count
- Last updated (relative time)
- Open button

**Empty state:** "No registers yet. Create one to start tracking custom data."

### 10.2 Detail / Data Entry (`/registers/[id]`)

**Layout:** Heading row + column config button + spreadsheet-style table.

**Heading row:** Register name + "Add Row" button + "Edit Columns" button.

**Table:** User-defined columns. Column header shows name + type icon. Rows are editable inline — click a cell to edit. Cell types:
- `text` → text input
- `number` → number input
- `date` → date picker
- `boolean` → checkbox
- `select` → dropdown (options defined in column config)

**Add Row:** Appends a blank row at the bottom, first cell gains focus.

**Edit Columns modal:** Drag-to-reorder column list. Each column row: name + type selector + delete icon. "Add Column" button. Save / Cancel.

**Empty state:** "No entries yet. Add the first row."

---

## 11. Forms (`/forms`, `/forms/new`)

### 11.1 Submissions List (`/forms`)

Table: Type | Submitted By | Date | Actions (view / delete).

Filter by form type.

### 11.2 New Form (`/forms/new`)

**Step 1:** Form type selection — large icon cards: Weekly Reflection | Meeting Minutes | Incident Report | Staff Feedback | Other. Click to select and proceed.

**Step 2:** Dynamic form fields rendered per type. All types include a date field and submitted-by (auto-filled from session, editable). Submit button.

On submit: success toast, redirect to submissions list.

---

## 12. Rostering (`/rostering`)

**Layout:** Toolbar + week-view grid.

**Toolbar:**
- Week navigator: prev/next arrows + current week label ("14 Apr – 20 Apr 2026")
- Room filter (show/hide specific rooms)
- "Load Template" button (opens template picker modal)
- "Add Shift" button

**Week grid:**
- Rows = rooms (left label column: room name + current ratio indicator)
- Columns = days (Mon–Sun), each day divided into time slots (7am–6pm, 30-min increments)
- Staff shift blocks: coloured by staff member, shows staff name + start–end time. Blocks are draggable to move or resize.

**Room ratio indicator:** Icon next to room name — green (compliant), amber (warning, approaching limit), red (breach, under ratio). Tooltip shows exact numbers.

**Staff list sidebar (right, toggleable):**
- Scrollable list of all staff with role badge
- Drag staff from list onto grid to add a shift

**Leave request panel (tab in sidebar):** List of pending leave requests with Approve / Decline buttons (manager only).

**Add/Edit Shift slide-in:**
- Staff picker
- Room picker
- Date + start time + end time (time pickers)
- Notes field
- Save / Delete / Cancel

---

## 13. Learning Hub

### 13.1 Hub Overview (`/learning`)

**Layout:** Two-row grid of summary cards + quick-action links.

**Summary cards (top row):**
- Enrolled Modules: count + progress ring
- Active Pathways: count + next due date
- PDP Review: next review date + status
- Expiring Certificates: count + days until nearest expiry

**Quick-action links:** "Browse Library" | "View My Pathway" | "Update PDP Goals" | "View Certificates"

### 13.2 Library (`/learning/library`)

**Layout:** Filter bar + module card grid.

**Filter bar:** Category filter + search input + completion filter (All / Not Started / In Progress / Completed).

**Module card:**
- Thumbnail (colour block with icon if no image)
- Title
- Duration badge (e.g., "45 min")
- Category badge
- Completion % progress bar (shown if enrolled)
- "Enrol" button (if not enrolled) / "Continue" button (if in progress) / "Completed" badge (if done)

### 13.3 Module Player (`/learning/modules/[id]`)

**Layout:** Top progress bar + left section list sidebar + main content area.

**Progress bar (top):** Shows completion % + section count (e.g., "Section 3 of 7").

**Left sidebar (~240px):** Section list — each item: section number + title + completion checkmark. Click to navigate to that section. Active section highlighted.

**Main content area:**
- Section title (heading)
- Content block varies by section type:
  - `video` → embedded video player (external URL) + description below
  - `text` → rendered rich text/markdown
  - `quiz` → one question at a time: question text + multiple choice options (radio buttons). "Submit Answer" button. After submit: shows correct/incorrect feedback. "Next Question" button.
  - `reflection` → prompt text + textarea. "Save Reflection" button.
- "Next Section" button (bottom right), "Previous Section" (bottom left)

On final section completion: "Complete Module" button → triggers certificate generation if all quizzes passed.

### 13.4 Pathways (`/learning/pathways`)

**Layout:** Pathway card list.

**Pathway card:**
- Pathway name + description
- Module sequence: horizontal list of module chips (completed = green, current = blue, locked = grey)
- Overall % complete progress bar
- "Continue" button

### 13.5 PDP — Personal Development Plan (`/learning/pdp`)

**Layout:** Heading + "Add Goal" button + goal card list.

**Goal card:**
- Goal description
- Target date (red if overdue)
- Status badge (Not Started / In Progress / Achieved)
- Linked modules list (compact chip badges with completion ticks)
- Formal review notes (read-only text, collapsible)
- Edit button, Archive button

**Add/Edit Goal slide-in:**
- Description (textarea)
- Target date (date picker)
- Status (dropdown)
- Link Modules (module picker)
- Review notes (admin/manager only — textarea)
- Save / Cancel

### 13.6 Competency Matrix (`/learning/matrix`)

**Layout:** Table. Rows = staff members. Columns = competency areas.

Cell states:
- Not Started → empty / grey background
- In Progress → amber half-filled circle icon
- Completed → green filled circle icon

Click cell → tooltip showing linked modules and completion dates. Click staff row header → navigate to their PDP.

### 13.7 Certificates (`/learning/certificates`)

**Layout:** Filter tabs (All / Internal / External / Expiring) + certificate card list.

**Certificate card:**
- Certificate name
- Type badge (Internal = blue, External = grey)
- Issue date
- Expiry date (amber if expiring within 60 days, red if expired)
- Download button (PDF, for internal certificates)
- For external: Edit button (to update expiry date)

**"Add External Certificate" button:** Slide-in panel with fields: name, issuing body, issue date, expiry date, file upload (optional). Save / Cancel.

---

## 14. Recruitment

### 14.1 Candidates List (`/candidates`)

**Layout:** Pipeline view — filter tabs across top + candidate card grid.

**Filter tabs:** All | Applied | Screening | Interview | Offer | Hired | Rejected

**Candidate card:**
- Full name (bold)
- Position applied for
- DISC profile type badge (if scored)
- Date applied (relative)
- AI score badge (0–100, colour-coded: 0–40 red, 41–70 amber, 71–100 green)
- "View" button

**Toolbar:** "Create Position" link + search input.

**Empty state:** "No candidates. Share a position to start receiving applications."

### 14.2 Candidate Detail (`/candidates/[id]`)

**Layout:** Page heading (name + current pipeline status dropdown) + 6-tab interface.

**Tabs:** Profile | Questionnaire | DISC Results | Interview | Onboarding | Activity

**Profile tab:** Two columns. Left: personal info fields (display only — name, email, phone, address). Right: CV attachment (download link, preview if PDF).

**Questionnaire tab:** Read-only list of question + submitted answer pairs. Each answer has a AI feedback indicator (correct / concern / neutral) if the scoring API has run.

**DISC Results tab:** If scored — DISC bar chart (D / I / S / C with % scores) + profile type label (e.g., "Compliance-focused, detail-oriented") + AI narrative paragraph. If not yet scored: "Score not yet calculated" with "Score Now" button.

**Interview tab:** Freetext interview notes area (editable by ns, manager, admin). Date picker for interview date. Rating selector (1–5 stars).

**Onboarding tab:** Checklist of onboarding steps (shown after candidate is moved to "Hired"). Each step: checkbox + label + responsible party. "Create User Account" button (admin only — triggers `POST /api/recruitment/onboard`).

**Activity tab:** Chronological log of all status changes, notes added, and emails sent.

**Pipeline status dropdown (in heading):** Applied → Screening → Interview → Offer → Hired | Rejected. Changing status logs an activity entry.

### 14.3 Positions (`/candidates/positions`)

**Layout:** Heading + "Create Position" button + position card grid.

**Position card:**
- Job title (bold)
- Department
- Status badge (Open = green, Closed = grey, Draft = amber)
- Candidate count (applied / hired)
- "Invite Candidate" button (opens email invite modal)
- Edit / Close buttons

### 14.4 Public Application Form (`/apply/[token]`)

Unauthenticated page (no sidebar, no header). Centre logo at top. Progress stepper (1–4 steps).

**Step 1 — Personal Info:** Name, email, phone, address, right to work confirmation (checkbox).

**Step 2 — Work History:** Dynamic list of employer entries (add/remove). Each: employer, role, start–end dates, reason for leaving.

**Step 3 — Scenario Questions:** 10 questions presented one at a time (from a pool of 60). Free-text textarea per question. Next/prev navigation.

**Step 4 — DISC Assessment:** 24 forced-choice pairs. Each pair: two behavioural descriptors, candidate clicks the one "most like them". Progress indicator shows completion.

**Submit button** (end of step 4). "Review your answers" back link.

**Post-submit confirmation screen:** "Thank you — your application has been received." message. No return link.

**Expired token screen:** "This application link has expired or is invalid. Contact the hiring team."

---

## 15. Programming (`/programming`)

**Layout:** Two-column. Left: document history list. Right: generation panel.

**Left column — Document History:**
- Heading: "Generated Documents"
- Search input
- Document list items: title + type badge + date + download (PDF/DOCX) + delete icon

**Right column — Generate Document:**
- Heading: "Create EL Document"
- Document type selector (large icon cards): Programming Plan | Observation Record | Reflection | Environment Audit | Professional Goals | Other
- Context input textarea: "Describe the focus, child group, or element..."
- "Generate with AI" button (primary)
- Generation status: spinner + "Generating..." text → on complete: success card with download buttons

---

## 16. AI Chat (`/chat`)

### 16.1 Overall Layout

Two-panel layout (resizable, default 30% / 70% split). Mobile: panels stack, conversation list slides in as drawer via button.

**Left panel — Conversation List:**
- Search input (filters conversation titles)
- "New Conversation" button (primary)
- Conversation list items: title (auto-generated from first user message) + date (relative). Active conversation highlighted. Right-click or swipe → delete option.

**Right panel — Active Conversation:**
- If no conversation selected: centred empty state "Select a conversation or start a new one." with "New Conversation" button.
- If conversation selected: message thread + input area (described below).

### 16.2 Message Thread

Scrollable. Messages in reverse chronological order (newest at bottom). Auto-scroll to bottom on new message.

**User message:** Right-aligned bubble, primary background colour. Plain text. Timestamp below.

**AI message:** Left-aligned, white/card background, with agent name badge (e.g., "Kiros AI") in top-left. Rendered markdown. Timestamp below.

**Tool use indicator (within AI message, collapsible):**
- Collapsed state: "Searching NQS elements..." with spinning icon (while in progress) or "Searched NQS elements" with tick (when complete)
- Expanded state: shows tool name + abbreviated input/output
- Click to toggle expand

**Pending Action card (within AI message):**
- Distinct yellow/amber border
- Action summary text: "Create task: Review playground equipment (linked to QA 3.1, due Friday, assigned to Jane)"
- Two buttons: "Approve" (green) and "Reject" (red)
- After approval: card shows "Approved — task created" with link to the new task
- After rejection: card shows "Rejected"

### 16.3 Input Area

Fixed at bottom of right panel.
- File upload button (left of input)
- Agent selector dropdown (default: auto-routing AI) — shows available agent names
- Text input (expanding textarea, max 6 lines before scroll)
- Send button (right, disabled when input empty or loading)
- CentreContext toggle button (right sidebar toggle)

**CentreContext sidebar (optional, right side of right panel, ~280px):**
- Heading: "Context Loaded"
- List of CentreContext records currently in scope, grouped by type (philosophy, QIP goal, procedure, policy)
- Toggled open/closed

---

## 17. Documents

### 17.1 AI-Generated Documents (`/documents`)

**Layout:** Filter bar + document card grid.

**Filter bar:** Type filter dropdown + search input.

**Document card:**
- Title
- Type badge (e.g., "Report", "QA Response", "Programming Plan")
- Generated date
- Download buttons: PDF | DOCX (side by side)
- Delete icon (admin/manager only)

**Empty state:** "No documents yet. Upload a document or ask the AI to generate one."

### 17.2 Document Library (`/documents/library`)

SharePoint-synced documents.

**Layout:** Connection status banner (if SharePoint disconnected) + search input + file list table.

**Table columns:** File Name | Type icon | Last Synced | Actions (View / Download).

Click file name → opens in new tab (direct URL) or download.

**Connection status banner:** If SharePoint is not connected: amber banner "SharePoint not connected. Documents may be out of date. [Connect in Admin →]"

---

## 18. OWNA (`/owna/*`)

Six sub-pages sharing the same layout structure: `/owna/staff`, `/owna/attendance`, `/owna/children`, `/owna/families`, `/owna/enrolments`, `/owna/health`.

**Layout per page:** Page heading + OWNA data badge ("Live from OWNA") + search input + filter bar + data table.

**Not-configured state (shown when OWNA_API_KEY is absent):** Full-page centred message: "OWNA integration is not configured. Contact your administrator." with no table rendered.

**Table:** Read-only. Columns vary per sub-page. Search filters by name. All data is live (proxied from OWNA API on page load, no local cache). Loading skeleton rows shown during fetch.

---

## 19. Marketing

### 19.1 Marketing Hub (`/marketing`)

**Layout:** Metrics overview row + quick-links grid.

**Metrics row (4 cards):** Total Reach | Total Engagement | Pending Content Items | Unresponded Reviews

**Quick-links grid:** large icon cards for each sub-module: Content | Calendar | Reviews | Ads | Analytics | Inbox | Comments | Settings | Chat

**Not-configured state:** If no marketing accounts connected: amber banner "No social platforms connected. Go to Settings to connect Meta or Google."

### 19.2 Content (`/marketing/content`)

**Layout:** Filter tabs + "Create Content" button + content card list.

**Filter tabs:** All | Draft | Scheduled | Published

**Content card:**
- Thumbnail preview (if image attached) or placeholder
- Title/caption (truncated to 2 lines)
- Platform badges (Facebook / Instagram / Google)
- Scheduled date (or "Draft" if not scheduled)
- Status badge
- Edit | Preview | Publish / Delete actions

**Create/Edit content slide-in:** Caption textarea | Image upload | Platform multi-select | Schedule date/time picker | Save / Publish buttons.

### 19.3 Calendar (`/marketing/calendar`)

Month-view calendar. Content items shown as coloured dot + truncated title on their scheduled date. Click day cell → list of items that day. Click item → edit slide-in opens.

Previous/Next month navigation. "Today" button.

### 19.4 Reviews (`/marketing/reviews`)

**Layout:** Filter bar + review card list.

**Filter bar:** Platform (All / Google / Meta) | Rating (All / 1–5 stars) | Status (All / Pending / Responded).

**Review card:**
- Platform icon + reviewer name
- Star rating (visual stars)
- Review text
- Date
- Reply area: if already responded — show reply text in green. If not: "Reply" button → expands inline textarea + "Send Reply" button.

### 19.5 Ads (`/marketing/ads`)

Table: Campaign Name | Platform | Status | Spend | Reach | CPC | "View in Platform" link.

**No campaigns state:** "No ad campaigns found. Connect your ad accounts in Settings."

### 19.6 Analytics (`/marketing/analytics`)

**Layout:** Date range picker + platform tabs + chart panels.

**Platform tabs:** All | Facebook | Instagram | Google

**Charts (one per tab):**
- Line chart: Reach over time
- Bar chart: Engagement by post type
- Line chart: Follower growth

Each chart has a time range selector (7D / 30D / 90D).

### 19.7 Inbox (`/marketing/inbox`)

**Layout:** Conversation list (left, ~35%) + thread view (right).

**Conversation list:** Each item: sender name + platform icon + message preview + timestamp. Unread items in bold.

**Thread view:** Chronological message bubbles. Reply input at bottom + "Send" button.

**Not-configured state:** "No inbox messages. Connect your platforms in Settings."

### 19.8 Comments (`/marketing/comments`)

Table: Post preview | Comment text | Author | Platform | Date | Status (New / Replied) | Reply action.

Reply: inline textarea expands below comment row. "Send Reply" button.

### 19.9 Settings (`/marketing/settings`)

**Layout:** Platform connection cards.

**Meta card:** Logo + connection status (Connected/Disconnected). If connected: account name + "Disconnect" button. If disconnected: "Connect Facebook/Instagram" button → initiates OAuth.

**Google card:** Same pattern for Google Ads / Google Business.

### 19.10 Marketing Chat (`/marketing/chat`)

Same two-panel layout as AI Chat (section 16) but uses the marketing-specific AI. Default prompt context is marketing-focused. Agent selector limited to marketing agents.

---

## 20. Activity Log (`/activity`)

**Layout:** Filter bar + table with real-time updates.

**Filter bar:** User picker | Action type multi-select | Date range picker | Clear filters.

**Table columns:** Timestamp | User | Action | Entity Type | Entity Link | Details.

Timestamp shown as absolute datetime. Entity link navigates to the relevant record.

**Real-time:** New entries appear at the top via Supabase realtime subscription with a subtle "new item" flash animation.

---

## 21. Reports

### 21.1 Hub (`/reports`)

Grid of report type cards. Each card: icon + report name + brief description + "Generate" button.

**Report types:** Staff Summary | Compliance Status | QA Progress | Training Completion | Checklist Audit | Incident Register | Custom Extract.

Clicking "Generate" for standard reports triggers immediate download (CSV/PDF). "Custom Extract" navigates to `/reports/extract`.

### 21.2 Query Builder (`/reports/extract`)

**Layout:** Multi-step wizard. Step indicators at top (1–6). Back/Next buttons at bottom of each step.

**Step 1 — Data Source:** Icon cards for each source (Tasks, Elements, Checklists, Staff, Policies, etc.). Single-select.

**Step 2 — Choose Fields:** Checkbox list of available fields for the chosen source. "Select All" toggle.

**Step 3 — Filters:** Dynamic filter builder. Each filter row: field selector + operator selector + value input. "Add Filter" button.

**Step 4 — Aggregation:** Optional. Group-by field selector + aggregate function (Count / Sum / Average).

**Step 5 — Sorting:** Field selector + direction (ASC / DESC). Add multiple sort rules.

**Step 6 — Preview + Export:**
- Live preview table (first 50 rows)
- Row count indicator
- "Export as CSV" button + "Export as JSON" button
- "Save as Template" button → name input modal

**Saved templates:** Listed below wizard. Each template: name + source + field count + "Load" button + "Delete" button.

---

## 22. Admin Panel

All admin pages accessible to admin role. manager role can access most except AI Config, AI Prompts, OWNA Settings, Users.

### 22.1 Agents (`/admin/agents`)

**Layout:** "Create Agent" button + agent card list.

**Agent card:**
- Agent name (bold) + active/inactive toggle
- Role (badge)
- Description (2 lines)
- Domain tags (chip list)
- Assigned tools (chip list, truncated)
- Edit button | Test button

**Create/Edit Agent slide-in:**
- Name, Role (text input + select)
- Description (textarea)
- Domain tags (tag input)
- Available tools (multi-select checkbox list of all available tool names)
- Priority (number input)
- Active toggle
- Save / Cancel

**Test Runner panel (bottom of agent edit):** Prompt input + "Run Test" button. Shows raw response with tool calls visible.

### 22.2 AI Config (`/admin/ai-config`)

**Layout:** Settings form with sections.

Sections:
- Model Selection: Sonnet / Opus radio selector
- Temperature: slider (0.0–1.0) with numeric display
- Token Budget: number inputs for max input tokens, max output tokens
- Feature Toggles: toggle switches for each AI feature (suggestions, tool use, streaming, etc.)

Save button (top right, appears when changes made).

### 22.3 AI Prompts (`/admin/ai-prompts`)

**Layout:** Left: section list. Right: section editor.

Section list items: section name + type badge. Click to open in editor.

Editor: section name (editable) + content textarea (large, monospace). "Preview Assembled Prompt" button → opens modal showing full prompt in read-only view. Save section.

### 22.4 AI Learnings (`/admin/ai-learnings`)

**Layout:** Filter bar + table.

**Table columns:** Type | Content (truncated) | Confidence | Usage Count | Created | Actions (Edit / Delete).

**Filter bar:** Type filter + search input.

Click row or Edit → slide-in editor with full content textarea + type selector + confidence slider.

### 22.5 AI Analytics (`/admin/ai-analytics`)

**Layout:** Date range picker + metric cards row + charts.

**Metric cards:** Total Conversations | Total Tokens Used | Average Response Time | Correction Rate (% of pending actions rejected).

**Charts:**
- Bar chart: conversations per day
- Line chart: token usage over time (input vs output)
- Pie chart: tool use frequency
- Bar chart: error rate by agent

### 22.6 Centre Context (`/admin/centre-context`)

**Layout:** Category tab list (left, scrollable) + context records list (right).

**Category tabs:** All | Philosophy | QIP Goals | Procedures | Policies | Other

**Context record card:**
- Content preview (3 lines)
- Type badge
- QA numbers linked (chips)
- Edit / Delete icons

**"Add Record" button** (top right): slide-in with fields — content (textarea), type (select), related QA numbers (multi-select of QA 1–7), tags.

**"Upload Document" button:** File upload (PDF/DOCX). After upload: processing spinner → extracted context preview → "Save to Context" button.

### 22.7 SharePoint (`/admin/sharepoint`)

**Layout:** Connection card + sync history + file browser.

**Connection card:** SharePoint site URL + connection status (Connected/Disconnected). If connected: "Disconnect" button + "Manual Sync" trigger button. If disconnected: "Connect to SharePoint" button → OAuth redirect.

**Sync history table:** Date | Files synced | Errors | Duration.

**File browser:** Folder tree (left, compact) + file list (right). View/Download actions per file.

### 22.8 OWNA Settings (`/admin/owna`)

**Layout:** Settings form.

Fields: API Key input (masked, show/hide toggle) + "Test Connection" button. On test: shows success/failure badge with response details.

Field mapping section: table of OWNA field → Portal field pairs. Edit mapping button per row.

### 22.9 Users (`/admin/users`)

**Layout:** "Invite User" button + user table.

**Table columns:** Avatar + Name | Email | Role (inline select, editable) | Status (Active/Inactive) | Allowed Pages | Last Login | Actions.

**Allowed Pages cell:** "All pages" if unrestricted, or comma-separated list if restricted. Edit icon → modal with page path checklist.

**Invite User modal:** Email input + Role select. "Send Invitation" button. Sends email with magic link to create password.

### 22.10 Tags (`/admin/tags`)

Table: Tag Name | Colour swatch | Usage Count | Edit / Delete icons. "Create Tag" button.

Create/Edit tag: name input + colour picker. Save / Cancel.

### 22.11 Notifications (`/admin/notifications`)

**Layout:** Per-event-type notification preference cards.

Each card: event name + description + toggle switches per channel (in-app / email — email marked as "coming soon").

---

## 23. AP Dashboard (`/ap-dashboard`)

Admin-only page.

**Layout:** Heading + Print button + four metric panels.

**Panel 1 — Centre Health Score:** Large circular score gauge (0–100) + contributing factors list with traffic-light icons.

**Panel 2 — QA Progress by Area:** Horizontal stacked bar chart. Each row = one QA area. Segments = count of elements by rating (Not Met / Working Towards / Meeting / Exceeding). Colour-coded by rating.

**Panel 3 — Staff Compliance %:** Bar chart. Each bar = one staff member. Segments = training current / expiring / expired. Optional: policy acknowledgement %. Filter by role.

**Panel 4 — AI Usage Summary:** Stats: total AI conversations this month, most common query topics, pending actions awaiting approval, tool use breakdown table.

Print button → triggers `window.print()` with print stylesheet applied (hides sidebar, removes interactive elements).

---

## 24. Centre Hub (`/hub`)

**Layout:** Hero banner (centre name + photo) + three-column grid.

**Column 1 — Centre Info:** Address, contact, licence details, current NQS rating.

**Column 2 — Quick Links:** Configurable link cards to key system areas (Tasks, Checklists, Policies, Learning, Chat).

**Column 3 — Upcoming Deadlines:** List of upcoming review dates, policy renewals, certificate expiries, QA milestones.

---

## 25. Guide (`/guide`)

**Layout:** Search input at top + collapsible section list.

Sections organised by role (Getting Started for Educators, Manager Guide, NS Guide, Admin Guide). Each section contains scrollable help text with screenshots. Internal anchor links.

Search filters section headings and content. No results state: "No help articles match your search."

---

## 26. Resources (`/resources`)

**Layout:** Category filter tabs + resource card grid.

**Resource card:**
- Title
- Type badge (External Link / Download / Video)
- Description (2 lines)
- Category badge
- Action button: "Open" (external link) / "Download" / "Watch"

Admin/manager: "Add Resource" button. Create/Edit resource: title, URL, type, category, description. Save / Cancel.

---

## 27. Empty States Reference

| Screen | Empty State Message |
|---|---|
| Tasks | "No tasks yet. Create one or ask Kiros Chat to help." |
| Checklists | "No checklists scheduled. Ask your manager to set up a schedule." |
| Elements (filtered) | "No elements match this filter. Try clearing some filters." |
| Policies | "No policies yet. Create the first one." |
| Candidates | "No candidates. Share a position to start receiving applications." |
| Documents | "No documents yet. Upload a document or ask the AI to generate one." |
| OWNA (not configured) | "OWNA integration is not configured. Contact your administrator." |
| Registers | "No entries yet. Add the first row." |
| Activity Log | "No activity recorded yet." |
| Marketing Inbox | "No inbox messages. Connect your platforms in Settings." |
| AI Suggestions | "Everything is on track. No urgent priorities right now." |

---

## 28. Design Tokens and Style Guide

### 28.1 Colours

| Token | Usage | Value (reference) |
|---|---|---|
| `bg-card` | Card and panel backgrounds (not white) | Light neutral |
| `bg-background` | Page background | Off-white / very light grey |
| Rating: Not Met | Element rating badge | Red |
| Rating: Working Towards | Element rating badge | Amber / orange |
| Rating: Meeting | Element rating badge | Blue |
| Rating: Exceeding | Element rating badge | Green |
| Priority: Low | Task priority | Grey |
| Priority: Medium | Task priority | Blue |
| Priority: High | Task priority | Orange |
| Priority: Urgent | Task priority | Red |
| Status: Pending | Checklist/task status | Grey |
| Status: In Progress | Checklist/task status | Yellow/amber |
| Status: Complete | Checklist/task status | Green |
| Status: Failed | Checklist status | Red |

### 28.2 Role Badges

Each role has a distinct colour badge used throughout the system (user tables, activity log, candidate profiles):

| Role | Badge Colour |
|---|---|
| admin | Purple |
| manager | Blue |
| ns | Teal |
| el | Green |
| educator | Grey/slate |

### 28.3 Typography

- Body text: 14px, regular weight
- Card headings: 16px, semibold
- Page headings: 24px, bold
- Section headings: 18px, semibold
- Monospace (element codes, API keys): system monospace stack

### 28.4 Spacing

Standard spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48px. Cards use 16px internal padding. Page content uses 24px padding.

### 28.5 Component Patterns

- **Slide-in panels:** 480px width, overlay with dim background, close on outside click or Escape key
- **Modals:** Centred, 480–640px width, overlay, close on Escape
- **Toasts:** Bottom-right, auto-dismiss after 4 seconds. Types: success (green) / error (red) / warning (amber) / info (blue)
- **Loading skeletons:** Grey animated shimmer blocks matching the shape of content being loaded
- **Confirmation dialogs:** Modal with action description + "Cancel" + destructive action button (red for delete, amber for archive)
- **Inline editing:** Click to edit pattern — display mode shows value as text, edit mode shows input field in place

### 28.6 Responsive Breakpoints

| Breakpoint | Behaviour |
|---|---|
| < 768px (mobile) | Sidebar hidden; bottom tab bar shown; single-column layouts; slide-in panels full-width |
| 768–1024px (tablet) | Sidebar icon-only (collapsed); two-column layouts reduced to 1; slide-in panels 80% width |
| > 1024px (desktop) | Full sidebar with labels; all multi-column layouts active |

---

## 29. Key User Flows (Narrative)

### 29.1 QA Improvement Cycle
1. NS opens `/elements`, filters to QA 2, finds "Element 2.1.2" rated Not Met.
2. Opens detail view → reads officer finding → writes our response and actions taken → saves.
3. Clicks "Create Task" → slide-in pre-fills QA element link → fills title, assigns to educator, sets due date → saves.
4. Educator receives task in `/tasks`, completes the work, moves card to Done.
5. NS returns to element detail, changes status to Ready for Review.
6. Manager reviews, approves, changes status to Completed.

### 29.2 Daily Checklist Operation
1. Educator opens `/checklists` each morning, sees "Morning Room Check" with status Pending.
2. Works through all items — answers yes/no questions, enters text responses, takes and uploads photo.
3. One yes/no item fails (answered "No") — card highlights red, system note: "SmartTicket will be created."
4. Educator clicks "Submit Checklist" → confirmation dialog → submits.
5. System creates SmartTicket task in `/tasks`, assigns to responsible staff.
6. Responsible staff resolves issue, closes task — creating audit trail.

### 29.3 AI Chat → Create Task
1. User opens `/chat`, starts new conversation.
2. Types: "Create a task to review playground equipment for QA 3.1, due Friday."
3. AI runs `create_task` tool → shows tool use indicator "Creating task..."
4. AI message appears with PendingAction card: "Create task: Review playground equipment (QA 3.1, due Friday). Approve / Reject"
5. User clicks Approve → task created → confirmation text with "View Task" link.
6. Task appears in `/tasks` kanban in Todo column.

### 29.4 Recruitment Pipeline
1. Admin creates position at `/candidates/positions`.
2. Admin emails candidate a token link (via "Invite Candidate" in positions).
3. Candidate opens `/apply/[token]`, completes 4-step application form, submits.
4. Admin opens `/candidates`, sees new candidate in Applied status.
5. Admin opens candidate detail → reviews questionnaire, clicks "Score Now" → AI scores responses.
6. Admin reviews DISC Results tab, moves pipeline status to Interview.
7. Admin adds interview notes in Interview tab.
8. Status updated to Hired → Onboarding tab unlocks → admin works through onboarding checklist.
9. Admin clicks "Create User Account" → system creates Supabase auth user → educator can log in.

---

*End of UX Specification*
