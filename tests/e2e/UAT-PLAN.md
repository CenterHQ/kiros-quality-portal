# Kiros Portal — Comprehensive UAT Test Plan (Playwright, Frontend-Only)

**Scope:** Every testable feature of the Kiros portal, exercised purely through the browser UI.
**Invariants:** No direct DB queries. No API-level assertions. No service-role shortcuts. Every
assertion is something a real user would see on screen.
**Coverage methodology:** For each feature, tests cover the **six dimensions**:
1. **Happy path** — the feature works when used correctly
2. **Empty state** — the feature renders when there's no data
3. **Loading state** — the user sees a spinner/skeleton while fetching
4. **Error state** — a graceful message when something fails (bad input, server error)
5. **Permission boundary** — correct visibility for each role (admin/manager/ns/el/educator)
6. **Cross-feature dependency** — interactions with other features (e.g., creating a task from an element)

**Locator conventions** (from `memory/feedback_ui_testing.md`):
- Clickables: `getByRole('button'|'tab'|'link', { name: /^exact$/i })`
- Text assertions only: `getByText(...)`
- Forms: `input[name="..."]` (every form field ships with `name=`)
- Modals: identify by heading text — `getByRole('heading', { name: /title/i })`
- Scope nested locators: `dialog.getByRole('button', ...)`, never global `.first()`
- State waits: wait for visible feedback (toast, URL change, row appearing), never `waitForTimeout`

**Test file organisation:**
```
tests/e2e/
  auth.setup.ts                — one-time login, stores session
  smoke.spec.ts                — post-deploy gate: every top-level route loads under 10s
  sidebar.spec.ts              — nav visibility by role, group expansion
  dashboard.spec.ts            — home dashboard widgets
  elements.spec.ts             — QA elements tracker
  tasks.spec.ts                — kanban + list + comments
  checklists.spec.ts           — today/upcoming/history/tickets
  compliance.spec.ts           — regulatory items status
  policies.spec.ts             — library, review, acks
  registers.spec.ts            — daily registers
  learning.spec.ts             — hub + library + module player + pathways + matrix
  candidates.spec.ts           — recruitment pipeline + positions + invites + detail
  questionnaire.spec.ts        — public /apply/[token] flow
  programming.spec.ts          — EL hub + PDSA + quick actions
  chat.spec.ts                 — AI chat + attachments + agent delegation + streaming
  documents.spec.ts            — library + detail + download
  marketing.spec.ts            — hub + content + calendar + reviews + ads + analytics
  rostering.spec.ts            — weekly view + coverage indicators
  owna.spec.ts                 — staff/attendance/children/health/families/enrolments
  activity.spec.ts             — audit log filters + export
  admin-users.spec.ts          — user management
  admin-agents.spec.ts         — agent definitions CRUD
  admin-ai-config.spec.ts      — 15 config tabs
  admin-ai-prompts.spec.ts     — prompt library
  admin-ai-learnings.spec.ts   — vector-DB entries
  admin-ai-analytics.spec.ts   — cost / token charts
  admin-context.spec.ts        — QIP + philosophy + teaching approaches
  admin-tags.spec.ts           — tag CRUD
  admin-notifications.spec.ts  — notification rules
  admin-sharepoint.spec.ts     — integration config
  admin-owna.spec.ts           — OWNA API config
  ap-dashboard.spec.ts         — multi-centre overview (AP role)
  hub.spec.ts                  — Centre Hub landing
  guide.spec.ts                — help pages
  resources.spec.ts            — resource hub
  reports.spec.ts              — reports + extract
  login.spec.ts                — auth error paths (tested unauthenticated)
  regression.spec.ts           — every previously-working page still loads
  a11y.spec.ts                 — axe-core scan on core pages
  mobile.spec.ts               — 375×667 viewport sanity pass
```

---

## Section A — Authentication & Shell

### A1. Login page (unauthenticated)
Uses `test.use({ storageState: { cookies: [], origins: [] } })`.

| ID | Scenario | Assertion |
|----|---|---|
| A1.1 | Page renders | logo, "Quality Uplift Portal" tag, email & password fields, Sign In button visible |
| A1.2 | Empty submit | inline "email required" / "password required" messages shown; no navigation |
| A1.3 | Bad credentials | red banner with "Invalid login credentials" (or similar); URL stays `/login` |
| A1.4 | Successful login | redirects to `/dashboard` within 15s; user's full name appears in sidebar |
| A1.5 | Authenticated redirect | visiting `/login` when already signed in redirects to `/dashboard` |
| A1.6 | Sign out | clicking Sign Out in sidebar returns to `/login` and cookies are cleared |
| A1.7 | Protected route redirect | visiting `/dashboard` unauthenticated redirects to `/login` (not 404) |

### A2. Shell chrome & sidebar
Run as **each** of the 5 production roles: admin, manager, ns, el, educator. Use parameterised `test.describe.parallel` with a role fixture.

| ID | Scenario | Assertion |
|----|---|---|
| A2.1 | Sidebar renders | `<aside>` visible on ≥ 768px viewports, hidden on mobile unless toggled |
| A2.2 | User identity | sidebar shows `profile.full_name` and role label (e.g., "Nominated Supervisor") |
| A2.3 | Logo | `<img alt="Kiro's Early Education Centre">` visible with `src="/logo.jpg"` |
| A2.4 | Collapse toggle | clicking Collapse shrinks sidebar to 68px; icons-only; clicking Expand restores 256px |
| A2.5 | Group: Operations | group header visible to all roles; expands to reveal Dashboard, QA Elements, Tasks, Checklists, Rostering |
| A2.6 | Group: Quality | Policies, Compliance, Documents, AI Documents, Registers, Forms |
| A2.7 | Group: Insights | Activity, Reports, Data Extract, Resources, User Guide |
| A2.8 | Group: Learning & Development | Learning Hub, Module Library, Pathways, PDP, Training Matrix, Certificates |
| A2.9 | Group: OWNA Integration | Children & Rooms, Attendance, Staff, Families & Billing, Enrolment Pipeline, Health & Safety |
| A2.10 | Group: Recruitment | visible ONLY to admin/manager/ns; Candidates, Positions links |
| A2.11 | Group: Programming | visible to admin/manager/ns/el/educator; single Programming Hub link |
| A2.12 | Group: Marketing | visible to admin/manager/ns; Marketing Hub, Content, Post Feed, Inbox, Comments, Calendar, Reviews, Ads, Analytics, Marketing AI, Settings |
| A2.13 | Group: Admin | visible ONLY to admin/manager; OWNA API, User Management, Notifications, Tags, SharePoint, AI Context, AI Agents, AI Prompts, AI Learnings, AI Analytics, AI Configuration |
| A2.14 | AP Dashboard visibility | `/ap-dashboard` link visible ONLY to admin role |
| A2.15 | Active link highlighting | navigating to any page applies the active style to that link |
| A2.16 | Collapsed group persistence | collapsing a group and refreshing keeps it collapsed within the session |
| A2.17 | Badge counts | tasks/checklists show numeric badges when non-zero |
| A2.18 | No broken links | click every link under each group, assert navigation succeeds (URL change), no 404 |

---

## Section B — Dashboard (Operations/Home)

### B1. `/dashboard`

| ID | Scenario | Assertion |
|----|---|---|
| B1.1 | Page header | "Dashboard" heading + "Quality Uplift Progress — Kiros Early Education" subtitle visible |
| B1.2 | Loading state | on slow network, spinner/skeleton visible for at least 300ms before content |
| B1.3 | 4 stat cards | Overall Rating, Elements Not Met, Tasks Completed, Compliance Actions — each card shows a number |
| B1.4 | QIP Goals widget | "QIP Goals" heading + up to 5 goal rows, each with title and progress bar with visible % |
| B1.5 | Empty QIP state | when no active goals: "No active QIP goals" message |
| B1.6 | Philosophy card | "Centre Philosophy" heading + quote-styled value text, refreshes on navigation |
| B1.7 | QA overview (7 cards) | one card per QA 1-7 with label, element count, status badge colour |
| B1.8 | QA drill-down | clicking a QA card navigates to `/elements?qa=N` |
| B1.9 | Compliance breaches table | columns Regulation, Description, Status visible; if no breaches, empty state |
| B1.10 | Stats drill-down | clicking "Tasks Completed" navigates to `/tasks`; clicking "Elements Not Met" to `/elements?status=not_met` |
| B1.11 | No console errors | `page.on('console')` collects only `log`/`info`; no `error`/`warning` during load |

---

## Section C — QA Elements

### C1. `/elements`

| ID | Scenario | Assertion |
|----|---|---|
| C1.1 | Page header | "QA Elements" heading + "Track progress across all 40 NQS elements" subtitle |
| C1.2 | 40 elements total | sum of elements across all QA groups = 40 (assert the count label) |
| C1.3 | Search input | typing "1.1.1" filters the list; "Element 1.1.1" visible, others hidden |
| C1.4 | QA filter dropdown | selecting "QA 3" hides QA 1,2,4,5,6,7 sections |
| C1.5 | QA group expand/collapse | clicking QA header toggles items visibility |
| C1.6 | Element status badges | each element shows `met` (green) or `not_met` (red) badge |
| C1.7 | Element navigation | clicking an element opens its detail view or in-page expansion |
| C1.8 | Link from dashboard | navigating from `/dashboard?qa=3` pre-filters to QA 3 |
| C1.9 | No results | search for "zzzzz" shows "No elements match" empty state |
| C1.10 | Error state | network error shows retry button; clicking Retry reloads |

### C2. Element detail (inline or `/elements/[id]`)

| ID | Scenario | Assertion |
|----|---|---|
| C2.1 | Element code + name | both visible in header |
| C2.2 | Regulation references | list of relevant regulations shown |
| C2.3 | Linked tasks | shows count of tasks; clicking expands list |
| C2.4 | Linked policies | shows count of policies; clicking expands list |
| C2.5 | Evidence uploads | if present, listed with download links |

---

## Section D — Tasks (Kanban)

### D1. `/tasks` — board view

| ID | Scenario | Assertion |
|----|---|---|
| D1.1 | View toggle | Board / List buttons visible; default is Board |
| D1.2 | Three columns | "To Do", "In Progress", "Done" visible |
| D1.3 | Task card content | priority dot, title, description snippet, assignee avatar, due date, comment count |
| D1.4 | Overdue indicator | tasks with `due_date < today AND status != done` show red badge |
| D1.5 | Create task | click "+ Add Task", fill title, priority, assignee, due date, description; submit; card appears in To Do |
| D1.6 | Empty column | To Do with zero tasks shows "No tasks" placeholder |
| D1.7 | Card expansion | clicking a card expands details inline: full description, comments, metadata |
| D1.8 | Inline edit status | changing status dropdown on expanded card moves card to correct column |
| D1.9 | Inline edit priority | priority change updates dot colour |
| D1.10 | Inline edit assignee | assignee change updates avatar |
| D1.11 | Inline edit due date | date change updates displayed date; overdue badge toggles accordingly |
| D1.12 | Comment thread | add comment, see it appear with user name + timestamp |
| D1.13 | Comment delete (own) | delete button only on own comments; clicking removes it |
| D1.14 | Comment delete (other) | no delete button on others' comments |
| D1.15 | Linked context | task linked to QA element shows "Linked to 1.1.1" chip |
| D1.16 | Drag-drop status change | drag card from To Do to In Progress; card appears in new column after drop |
| D1.17 | Realtime sync | open in 2 tabs; creating task in tab A appears in tab B within 3s |

### D2. `/tasks` — list view

| ID | Scenario | Assertion |
|----|---|---|
| D2.1 | Switch to List | click List button; table with columns Priority, Task, Status, Priority, Assigned To, Due Date, Comments visible |
| D2.2 | Row expansion | clicking a row expands a details panel below with comments + context |
| D2.3 | Sort by due date | column header click sorts ascending then descending |
| D2.4 | Mobile single column | viewport 375px collapses to stacked cards |

---

## Section E — Checklists

### E1. `/checklists` — lists

| ID | Scenario | Assertion |
|----|---|---|
| E1.1 | 4 tabs | Today, Upcoming, History, Tickets — each with count badge |
| E1.2 | Today completion rate | "X of Y checklists completed" label + progress bar |
| E1.3 | Create from template | click "New Checklist", pick template, assign, set due date, submit; appears in Today |
| E1.4 | Empty today | "No checklists due today" empty state when count is zero |
| E1.5 | Category filter | dropdown; selecting "Health & Safety" filters list |
| E1.6 | Upcoming tab | only shows instances with `due_date > today` |
| E1.7 | History tab | shows completed/skipped instances with completion date |
| E1.8 | Tickets tab | smart tickets listed with status badge; clicking opens ticket detail |

### E2. `/checklists/[id]` — instance detail

| ID | Scenario | Assertion |
|----|---|---|
| E2.1 | Template name + progress bar | both visible; bar % matches `items_completed / total` |
| E2.2 | Check off item | clicking checkbox updates progress bar immediately |
| E2.3 | Add notes to item | notes field accepts text; saved on blur; persists on reload |
| E2.4 | Heading items | non-checkable; styled differently |
| E2.5 | Mark complete | status dropdown → Completed; activity log entry created |
| E2.6 | Realtime | open in 2 tabs; checking item in tab A updates tab B |

---

## Section F — Compliance

### F1. `/compliance`

| ID | Scenario | Assertion |
|----|---|---|
| F1.1 | Table renders | columns Regulation, Description, Status, Last Updated, Notes |
| F1.2 | Status change | change status dropdown; row updates; toast "Saved" |
| F1.3 | Notes inline edit | click notes cell, type, blur; persists; toast shown |
| F1.4 | Status filter | filter by "action_required"; other statuses hidden |
| F1.5 | Responsible person | dropdown assigns; name appears in row |

---

## Section G — Policies

### G1. `/policies` — library

| ID | Scenario | Assertion |
|----|---|---|
| G1.1 | Three tabs | Library, Review Schedule, Acknowledgements |
| G1.2 | Search by title | typing filters visible policy cards |
| G1.3 | Category filter | selecting category hides others |
| G1.4 | Status filter | draft/under_review/approved/published/archived — each filter works |
| G1.5 | Policy card content | title, category, status badge, next review date, ack rate "45/50" |
| G1.6 | Create policy (admin) | "New Policy" button visible to admin/manager only; clicking navigates to `/policies/new` |
| G1.7 | Create policy (non-admin) | button absent for educator role |

### G2. `/policies/new`

| ID | Scenario | Assertion |
|----|---|---|
| G2.1 | Form fields | title, category, content (rich editor), review frequency, linked QA elements |
| G2.2 | Save as draft | status defaults to draft; appears in Library with draft badge |
| G2.3 | Submit for review | status changes to under_review |

### G3. `/policies/[id]` — detail

| ID | Scenario | Assertion |
|----|---|---|
| G3.1 | Content rendered | markdown/HTML body visible |
| G3.2 | Metadata | version, last updated, next review date, category |
| G3.3 | Acknowledge button | staff sees "I acknowledge", click records ack; button disables |
| G3.4 | Already acknowledged | shows "You acknowledged on {date}" |
| G3.5 | Version bumped | admin edits policy → version increments → staff prompted to re-acknowledge |
| G3.6 | Edit button (admin) | visible to admin/manager only |

### G4. Review schedule tab

| ID | Scenario | Assertion |
|----|---|---|
| G4.1 | Due for review | red section lists policies with `next_review_date < today` |
| G4.2 | Upcoming 30 days | amber section for 0-30 days |
| G4.3 | Bulk update | select multiple, apply new review date |

### G5. Acknowledgements tab

| ID | Scenario | Assertion |
|----|---|---|
| G5.1 | Matrix view | rows = staff, cols = published policies; cells show ack date or "—" |
| G5.2 | Filter by policy | narrows cols |
| G5.3 | Send reminder | button triggers toast "Reminders sent to N staff" |

---

## Section H — Registers

### H1. `/registers` — list

| ID | Scenario | Assertion |
|----|---|---|
| H1.1 | Room cards | one per active room; shows name, today's date, status |
| H1.2 | Quick stats | children present count + ratio indicator on each card |
| H1.3 | Click room | navigates to `/registers/[id]` |

### H2. `/registers/[id]` — detail

| ID | Scenario | Assertion |
|----|---|---|
| H2.1 | Date selector | allows past dates; defaults to today |
| H2.2 | Attendance table | children listed; checkboxes for Present; arrival + departure time inputs |
| H2.3 | Ratio calculator | live updates as presence toggled; shows "In Ratio" (green) or "Out of Ratio" (red) |
| H2.4 | Add incident | form accepts description, severity, child involved; appears in list with timestamp |
| H2.5 | Sign off | "Sign Off Register" button; requires educator name; locks register after signing |
| H2.6 | Signed state | signed register shows signature block; fields become read-only |

---

## Section I — Learning & Development

### I1. `/learning` — hub

| ID | Scenario | Assertion |
|----|---|---|
| I1.1 | 4 stat cards | Completed, In Progress, Overdue, Total Hours visible with numbers |
| I1.2 | Compliance alerts | qualification cards coloured green/amber/red based on expiry |
| I1.3 | My Current Modules | grid of enrolments; each with tier badge, title, duration, due date |
| I1.4 | Overdue module red | module with `due_date < today AND status != completed` has red due date |
| I1.5 | My Pathways | shows cards with "3 of 8 modules" progress text + progress bar |
| I1.6 | Recently Completed | table with checkmark icon, title, date, score % |
| I1.7 | Empty state | no enrolments: "No modules assigned yet" CTA to browse library |
| I1.8 | Team tab (privileged) | admin/manager/ns sees Team Compliance tab |
| I1.9 | Team tab (educator) | educator does NOT see Team tab |

### I2. `/learning/library`

| ID | Scenario | Assertion |
|----|---|---|
| I2.1 | Module cards | title, tier badge, duration, QA tags, Enrol button each card |
| I2.2 | Tier filter | Foundation / Intermediate / Advanced chips |
| I2.3 | QA filter | selecting "QA1" shows only QA1-tagged modules |
| I2.4 | Keyword search | substring match on title + description |
| I2.5 | Enrol | click Enrol → button becomes "Enrolled" + module appears in My Current Modules |
| I2.6 | Already enrolled | Enrol button replaced with "View" |

### I3. `/learning/modules/[id]` — module player

| ID | Scenario | Assertion |
|----|---|---|
| I3.1 | Title + description | visible in header |
| I3.2 | Objectives bulleted | each learning objective rendered as list item |
| I3.3 | Section nav | sidebar lists sections; current highlighted |
| I3.4 | Content section | markdown body rendered; images loaded |
| I3.5 | Video section | iframe or video element plays; controls present |
| I3.6 | Quiz section | question + options (radio); Submit button disabled until selected |
| I3.7 | Quiz correct | correct answer shows green checkmark + "Correct!" + explanation |
| I3.8 | Quiz incorrect | incorrect shows red + correct answer + explanation |
| I3.9 | Reflection section | textarea; Save button persists response |
| I3.10 | Action step section | checklist-style commitment; mark complete button |
| I3.11 | Progress bar | top of page shows X% based on sections completed |
| I3.12 | Mark complete | button enabled only when all sections done; clicking awards completion |
| I3.13 | Certificate trigger | completion unlocks certificate in `/learning/certificates` |

### I4. `/learning/pathways`

| ID | Scenario | Assertion |
|----|---|---|
| I4.1 | Pathway cards | title, description, estimated hours, module count |
| I4.2 | Enrol in pathway | enrols in all modules of pathway |
| I4.3 | Progress | "X of Y modules" updates as member completes modules |

### I5. `/learning/pathways/[id]`

| ID | Scenario | Assertion |
|----|---|---|
| I5.1 | Pathway modules listed in order | each with status icon |
| I5.2 | Click module | navigates to `/learning/modules/[id]` |

### I6. `/learning/pdp` — Personal Development Plan

| ID | Scenario | Assertion |
|----|---|---|
| I6.1 | Goals section | list of personal goals with target date |
| I6.2 | Add goal | form: title, description, target date; appears in list |
| I6.3 | Linked modules | goal shows modules supporting it |
| I6.4 | Progress | checkboxes mark goal progress |

### I7. `/learning/matrix` — Training Matrix

| ID | Scenario | Assertion |
|----|---|---|
| I7.1 | Grid | rows = staff, cols = mandatory modules; cells show completion status |
| I7.2 | Filter by role | narrows rows |
| I7.3 | Export | button downloads CSV |
| I7.4 | Expired highlighting | cells with expired certifications shown in red |

### I8. `/learning/certificates`

| ID | Scenario | Assertion |
|----|---|---|
| I8.1 | Certificate list | title, issue date, expiry date per certificate |
| I8.2 | Download | PDF download button; file downloads within 10s |
| I8.3 | Expired badge | on certs past expiry |

---

## Section J — Recruitment & Onboarding

### J1. `/candidates` — pipeline

| ID | Scenario | Assertion |
|----|---|---|
| J1.1 | Access control | educator/el gets "Access Restricted" message; admin/manager/ns sees page |
| J1.2 | Header buttons | "New Position" and "Invite Candidate" visible in top right |
| J1.3 | Status tabs | All, Invited, In Progress, Completed, Approved, Rejected each with count |
| J1.4 | Position filter dropdown | "All Positions" default; shows all open + filled positions |
| J1.5 | Empty pipeline | "No candidates yet" empty state when count is zero |
| J1.6 | Candidate row | name, status badge, email, position, date visible |
| J1.7 | Click row | navigates to `/candidates/[id]` |
| J1.8 | Tab switching | clicking "Invited" filters to status=invited |

### J2. Create Position modal (`/candidates` + `/candidates/positions`)

| ID | Scenario | Assertion |
|----|---|---|
| J2.1 | Modal opens | click "New Position" → modal with "Create Position" heading visible |
| J2.2 | Required fields | Title, Role with asterisks; submit disabled until filled |
| J2.3 | Optional fields | Room, Description, Requirements accept empty |
| J2.4 | Cancel | clicking Cancel closes modal; no position created |
| J2.5 | Create | fill form → Create → toast "Position created" → modal closes → position appears in list |
| J2.6 | Default status | newly-created position has `status = open` (visible in positions dropdown for invites) |

### J3. Invite Candidate modal (`/candidates`)

| ID | Scenario | Assertion |
|----|---|---|
| J3.1 | Modal opens | click "Invite Candidate" → modal with heading visible |
| J3.2 | Position select | dropdown name="position_id" lists only OPEN positions |
| J3.3 | Required fields | Position, Full Name, Email all required |
| J3.4 | Email validation | invalid email shows inline error; Send Invite disabled |
| J3.5 | Send invite | submit → invite link appears in dialog (visible Copy button) |
| J3.6 | Invite link format | `https://.../apply/<token>` — 64+ char token |
| J3.7 | Copy button | clicking copies to clipboard; toast "Copied" |
| J3.8 | Done closes | "Done" button closes modal; candidate appears in list with "Invited" status |

### J4. `/candidates/[id]` — candidate detail (6 tabs)

| ID | Scenario | Assertion |
|----|---|---|
| J4.1 | Overview tab | name, email, phone, status, position, dates, score, DISC type |
| J4.2 | Knowledge Results tab | table of Q&A with score per question + overall |
| J4.3 | Empty knowledge | "Candidate has not completed assessment" message if not done |
| J4.4 | DISC Profile tab | radar chart with D/I/S/C axes + scores |
| J4.5 | Personality tab | narrative text + communication style + strengths + growth |
| J4.6 | Team Fit tab | team fit score + narrative + friction points |
| J4.7 | AI Recommendation tab | AI-generated recommendation text |
| J4.8 | Action buttons | Approve, Reject, Start Onboarding visible based on status |
| J4.9 | Approve flow | click Approve → confirmation modal → status becomes "approved" |
| J4.10 | Reject flow | click Reject → modal with reason textarea → submit → status "rejected" |
| J4.11 | Start Onboarding | only for approved candidates; triggers onboarding (creates auth user, assigns training) |

### J5. `/candidates/positions` — positions management

| ID | Scenario | Assertion |
|----|---|---|
| J5.1 | Position cards | title, status badge (draft/open/closed/filled), role, candidate count |
| J5.2 | New Position button | opens Create Position modal |
| J5.3 | Edit button | opens Edit Position modal pre-filled |
| J5.4 | Edit save | changes persist; toast "Position updated" |
| J5.5 | Close Position button | only on open positions; changes status to closed |
| J5.6 | Close confirmation | confirmation dialog before closing |
| J5.7 | Questions button | "Questions (N)" button toggles question bank visibility |
| J5.8 | Generate Questions | button triggers AI generation; spinner; questions appear |
| J5.9 | Manual question add | "+ Add Question" button → form → appears in list |
| J5.10 | Question reorder | drag handle reorders; persists |
| J5.11 | Question edit | click question → modal with text + options + correct flag |
| J5.12 | Question delete | delete button → confirmation → removed |

---

## Section K — Public Questionnaire

### K1. `/apply/[token]` (unauthenticated)
Uses `test.use({ storageState: { cookies: [], origins: [] } })`.

| ID | Scenario | Assertion |
|----|---|---|
| K1.1 | No auth redirect | loading URL does NOT redirect to `/login` |
| K1.2 | Invalid token | "Something went wrong" card visible with the API error message |
| K1.3 | Closed position | "This position is no longer accepting applications" |
| K1.4 | Already submitted | "Thank you for submitting" screen |
| K1.5 | Valid new token (requires seeded) | centre logo, candidate name, section label visible |
| K1.6 | Progress bar | top progress bar visible showing 0% initially |
| K1.7 | Timer | circular timer visible; countdown starts |
| K1.8 | Timer warning | timer ≤ 15s turns red |
| K1.9 | Timer expiry | auto-advances to next question; answer saved as incomplete |
| K1.10 | Multiple-choice question | 4 radio options visible; Submit disabled until selected |
| K1.11 | Open text question | textarea visible; word count updates on type |
| K1.12 | Scale 1-5 question | 5 buttons with "Strongly disagree" / "Strongly agree" labels |
| K1.13 | Submit answer | click Submit → progress bar advances; next question appears |
| K1.14 | Section transition | after last knowledge question, shows "Professional Profile Assessment" banner |
| K1.15 | Resume | close tab, reopen URL; starts from next unanswered question |
| K1.16 | Completion screen | after last question: "Thank you" + next-steps text |
| K1.17 | Mobile responsive | at 375×667 viewport, all elements usable without horizontal scroll |
| K1.18 | Branding | centre logo, centre name, brand colour primary button (reads ai_config) |

---

## Section L — Programming & Pedagogy

### L1. `/programming`

| ID | Scenario | Assertion |
|----|---|---|
| L1.1 | Page header | heading and description visible |
| L1.2 | 4 quick action buttons | New Weekly Plan, New Learning Story, New Observation, New Critical Reflection |
| L1.3 | 4 stat cards | Docs This Month, Active Rooms, Recent Documents, QA1 Active Goals — with numbers |
| L1.4 | PDSA widget | 4 phase boxes (Plan/Do/Study/Act) with arrows |
| L1.5 | Recent documents list | rows with title, type badge, room, date |
| L1.6 | Empty recent | "No documents yet — use quick actions above" |
| L1.7 | Room filter | dropdown narrows visible documents |
| L1.8 | Doc type filter | narrows by type |

### L2. Quick action modal

| ID | Scenario | Assertion |
|----|---|---|
| L2.1 | Modal opens | click any quick action → modal with matching heading |
| L2.2 | Room select | dropdown populated from active rooms |
| L2.3 | Topic field | text input accepts keywords |
| L2.4 | Notes textarea | accepts longer context |
| L2.5 | Cancel | closes modal; no navigation |
| L2.6 | Open in AI Chat | redirects to `/chat` with pre-filled prompt combining room + topic + notes |

---

## Section M — AI Chat

### M1. `/chat` — core flow

| ID | Scenario | Assertion |
|----|---|---|
| M1.1 | Page loads | textarea, Send button, sidebar visible |
| M1.2 | New Conversation button | creates empty conversation |
| M1.3 | Send simple message | "hello" → assistant responds within 20s; response visible in thread |
| M1.4 | Thread persistence | refresh page; same conversation + messages still visible |
| M1.5 | Conversation list | sidebar shows conversation with preview text + timestamp |
| M1.6 | Switch conversation | click another conversation; messages update |
| M1.7 | Delete conversation | hover → delete icon → confirmation → removes from sidebar |
| M1.8 | Empty state | no conversations shows "Start a new conversation" |
| M1.9 | Streaming | response text appears incrementally, not all at once |
| M1.10 | Stop generation | Stop button during streaming halts; partial response kept |
| M1.11 | Markdown render | bold, italic, lists, code blocks rendered correctly in assistant messages |
| M1.12 | Code copy | code blocks have copy button that copies to clipboard |

### M2. Tools & agents

| ID | Scenario | Assertion |
|----|---|---|
| M2.1 | QA1 question | "What is our QA1 status?" → response mentions QA1 and status data |
| M2.2 | Agent delegation indicator | badge shows which agent is answering (e.g., "QA1 Agent") |
| M2.3 | Tool execution chip | "Searching centre context..." chip appears during tool run |
| M2.4 | Document generation | "create a weekly program plan" → confirmation prompt → confirm → doc appears in generated docs list |
| M2.5 | Document copy | copy link from generated doc; link opens doc in new tab |
| M2.6 | Recruitment delegation | "help me recruit an educator" → Recruitment Agent badge |
| M2.7 | EL delegation | "generate a learning story" → Educational Leadership Agent badge |
| M2.8 | Learning module delegation | "create a training module" → Learning Module Agent badge |

### M3. Attachments

| ID | Scenario | Assertion |
|----|---|---|
| M3.1 | Attach file | click attach → file input; select .txt file; filename chip appears in composer |
| M3.2 | Remove attachment | X on chip removes it |
| M3.3 | Send with attachment | send; assistant references file content in response |
| M3.4 | Oversized file | file > max size shows inline error "File too large" |
| M3.5 | Disallowed type | .exe rejected with "File type not allowed" |

### M4. Voice input

| ID | Scenario | Assertion |
|----|---|---|
| M4.1 | Mic button visible | if browser supports SpeechRecognition, mic button shown (else hidden) |
| M4.2 | Click mic | mic icon turns red; status "Listening" |
| M4.3 | Stop mic | transcribed text appears in textarea |

### M5. Error states

| ID | Scenario | Assertion |
|----|---|---|
| M5.1 | Network failure | red toast "Connection lost" when server unreachable |
| M5.2 | Auth failure | 401 response triggers redirect to `/login` |
| M5.3 | Rate limit | 429 shows friendly "Please wait a moment" toast |

---

## Section N — Documents

### N1. `/documents`

| ID | Scenario | Assertion |
|----|---|---|
| N1.1 | Header | "Documents" heading + description |
| N1.2 | Search | substring match on title |
| N1.3 | Type filter | learning_story, program_plan, policy, etc. |
| N1.4 | Author filter | select user narrows list |
| N1.5 | Date range filter | narrows by created_at |
| N1.6 | Doc card | title, type badge, author, dates, status |
| N1.7 | View button | opens detail page |
| N1.8 | Download button | downloads PDF / Word within 15s |
| N1.9 | Share | copy shareable link; toast |

### N2. `/documents/[id]` — detail

| ID | Scenario | Assertion |
|----|---|---|
| N2.1 | Content preview | rendered (HTML/markdown) |
| N2.2 | Download options | PDF, Word, Google Doc buttons each functional |
| N2.3 | Comments | thread displayed; add comment; appears with user |
| N2.4 | Version history | list of prior versions; click restores preview |
| N2.5 | Move/folder | dropdown assigns folder |

### N3. `/documents/library` — AI Documents

| ID | Scenario | Assertion |
|----|---|---|
| N3.1 | Filter to AI-generated | shows only docs created by chat generation |
| N3.2 | Type badge | visible for each AI doc |

---

## Section O — Rostering

### O1. `/rostering`

| ID | Scenario | Assertion |
|----|---|---|
| O1.1 | View toggle | Week / Month visible |
| O1.2 | Date navigation | back/forward arrows change date range |
| O1.3 | Roster grid | rows = staff, cols = days; cells show shift time or "Off" |
| O1.4 | Coverage heatmap | row below grid shows ratio status per day |
| O1.5 | Add shift (admin) | click empty cell → modal → save → cell populated |
| O1.6 | Edit shift | click existing → modal pre-filled → change → saved |
| O1.7 | Delete shift | delete button in modal → cell empties |
| O1.8 | Understaffed warning | red indicator where ratio not met |

---

## Section P — OWNA Integration

### P1. `/owna/staff`

| ID | Scenario | Assertion |
|----|---|---|
| P1.1 | Date picker | defaults today; selecting past date shows that day's roster |
| P1.2 | Staff table | Name, Role, Qualifications, On Duty, Phone columns |
| P1.3 | On duty today indicator | Y/N visible per staff |
| P1.4 | Expand row | details panel with address, emergency contacts |
| P1.5 | Responsible Persons list | separate section |

### P2. `/owna/attendance`

| ID | Scenario | Assertion |
|----|---|---|
| P2.1 | Today's attendance | list of children present/absent |
| P2.2 | Date selector | past days retrievable |
| P2.3 | Search child | narrows list |

### P3. `/owna/children`

| ID | Scenario | Assertion |
|----|---|---|
| P3.1 | Children list | name, room, age, enrolment status |
| P3.2 | Room filter | narrows list |
| P3.3 | Detail row | family, medical, notes |

### P4. `/owna/families`

| ID | Scenario | Assertion |
|----|---|---|
| P4.1 | Family cards | family name, primary contact, children count |
| P4.2 | Contact details | phone, email visible |
| P4.3 | Communication log | list of sent messages |

### P5. `/owna/enrolments`

| ID | Scenario | Assertion |
|----|---|---|
| P5.1 | Status tabs | Enquiry, Offered, Accepted, Declined |
| P5.2 | Pipeline kanban | drag between statuses |
| P5.3 | Detail modal | enrolment form with fees |

### P6. `/owna/health`

| ID | Scenario | Assertion |
|----|---|---|
| P6.1 | Incident log | date, child, severity, description |
| P6.2 | Medical alerts | allergies summary |
| P6.3 | Export report | CSV download |

---

## Section Q — Marketing

### Q1. `/marketing` — hub

| ID | Scenario | Assertion |
|----|---|---|
| Q1.1 | Stat cards | Connected Accounts, Published Posts, Unread Reviews, Active Campaigns |
| Q1.2 | Quick actions | New Content, Marketing AI buttons |
| Q1.3 | Recent content list | title, platforms chips, status, date |
| Q1.4 | Reviews section | star rating, platform, snippet, response status |
| Q1.5 | Campaigns section | name, platform, budget, Active/Paused toggle |
| Q1.6 | Social accounts | account name, platform, Connected/Disconnected |
| Q1.7 | Calendar preview | next 5 scheduled posts |

### Q2. `/marketing/content`

| ID | Scenario | Assertion |
|----|---|---|
| Q2.1 | Content list | with filters (status, platform, date) |
| Q2.2 | New Content editor | title, platforms multi-select, content textarea, AI generation buttons, schedule date |
| Q2.3 | Save draft | saves without publishing |
| Q2.4 | Schedule | validates date in future; status=scheduled |
| Q2.5 | Publish now | sends immediately; status=published |
| Q2.6 | AI rewrite | button uses agent to rewrite content |

### Q3. `/marketing/calendar`

| ID | Scenario | Assertion |
|----|---|---|
| Q3.1 | Month view | calendar grid with events |
| Q3.2 | Week view toggle | changes to week layout |
| Q3.3 | Drag event | rescheduling updates date |
| Q3.4 | Colour code | scheduled/published/failed distinct colours |

### Q4. `/marketing/reviews`

| ID | Scenario | Assertion |
|----|---|---|
| Q4.1 | Star distribution | bar chart 1-5 stars |
| Q4.2 | Review cards | reviewer, stars, body, platform, date |
| Q4.3 | Respond | form submits; response status becomes "Responded" |

### Q5. `/marketing/ads`

| ID | Scenario | Assertion |
|----|---|---|
| Q5.1 | Campaigns list | name, platform, budget, KPIs |
| Q5.2 | Toggle active | pauses/resumes campaign |

### Q6. `/marketing/analytics`

| ID | Scenario | Assertion |
|----|---|---|
| Q6.1 | Engagement graphs | line charts per platform |
| Q6.2 | Top content | table of best performers |

### Q7. `/marketing/inbox`, `/marketing/comments`

| ID | Scenario | Assertion |
|----|---|---|
| Q7.1 | Threaded messages | conversation list with latest message preview |
| Q7.2 | Reply | composer; send appears in thread |

---

## Section R — Activity & Reports

### R1. `/activity`

| ID | Scenario | Assertion |
|----|---|---|
| R1.1 | Timeline | entries chronologically reverse |
| R1.2 | Entry content | user avatar, action description, timestamp |
| R1.3 | Filter by user | dropdown narrows list |
| R1.4 | Filter by action | narrows list |
| R1.5 | Filter by entity | narrows list |
| R1.6 | Date range | narrows list |
| R1.7 | Export CSV | downloads within 10s |

### R2. `/reports`

| ID | Scenario | Assertion |
|----|---|---|
| R2.1 | Report categories | QA, Compliance, Training, Tasks tiles |
| R2.2 | Open report | loads with charts |
| R2.3 | Export PDF | downloads |

### R3. `/reports/extract`

| ID | Scenario | Assertion |
|----|---|---|
| R3.1 | Data selection | checkboxes for datasets |
| R3.2 | Date range | start + end dates |
| R3.3 | Extract button | downloads ZIP of CSVs |

---

## Section S — Admin

### S1. `/admin/ai-config` — 15 tabs

Each tab gets its own test (S1.1 through S1.15). Pattern:

| ID | Tab | Assertion |
|----|---|---|
| S1.1 | Model & Thinking | model IDs, temperature, max tokens fields visible; edit + save shows toast |
| S1.2 | Chat | chat system prompt editor; save confirms |
| S1.3 | Agent Defaults | default temperature, max iterations, priority fields |
| S1.4 | Uploads | max file size (MB), allowed types list |
| S1.5 | Learning | learnings retrieval top-K, similarity threshold |
| S1.6 | Brand | centre name, primary colour picker (hex), logo upload preview |
| S1.7 | Document Styling | format selector, style JSON editor valid JSON check |
| S1.8 | Tool Permissions | tool rows with role multi-checkboxes; Active toggle; save persists |
| S1.9 | Display | theme, font, density settings |
| S1.10 | Marketing | social platform defaults, tone, brand voice |
| S1.11 | Widget | embeddable widget settings |
| S1.12 | Reports | report defaults |
| S1.13 | Cron & Jobs | schedule editor for background jobs |
| S1.14 | Service Details | centre address, phone, email, ABN |
| S1.15 | System | danger zone: reset caches, re-index learnings |

Cross-cutting S1 tests:
- S1.X.A: Non-admin sees "Access Restricted"
- S1.X.B: Invalid value (e.g., temperature 5) shows inline error; save disabled
- S1.X.C: Save success toast
- S1.X.D: Save failure (network) shows error toast; values preserved

### S2. `/admin/agents`

| ID | Scenario | Assertion |
|----|---|---|
| S2.1 | Access | admin only; educator sees denied |
| S2.2 | Agent list | all 12 agents visible (QA1-7, Marketing, Compliance, Recruitment, Educational Leadership, Learning Module) |
| S2.3 | Expand agent | shows system prompt editor, tools checkboxes, model selector, routing fields |
| S2.4 | Edit system prompt | change text → save → toast confirms |
| S2.5 | Toggle tools | checking/unchecking tools saves on submit |
| S2.6 | Model switch | Opus ↔ Sonnet persists |
| S2.7 | Domain tags | comma-separated input saves as array |
| S2.8 | Routing keywords | same |
| S2.9 | Priority | numeric input persists |
| S2.10 | Active toggle | deactivating hides agent from routing |
| S2.11 | Run Test | test runner section accepts sample prompt; shows response |
| S2.12 | Version increments | edit + save increments version number displayed |
| S2.13 | Create new agent | "+ New Agent" button → form → save → appears in list |
| S2.14 | Delete agent | confirmation → removes |

### S3. `/admin/users`

| ID | Scenario | Assertion |
|----|---|---|
| S3.1 | User list | rows with name, email, role, status, last seen |
| S3.2 | Create user | form: email, name, role → invite sent |
| S3.3 | Edit role | dropdown → save → user's permissions update |
| S3.4 | Deactivate | toggle → user cannot log in |
| S3.5 | Search | filters by name/email |

### S4. `/admin/context`

| ID | Scenario | Assertion |
|----|---|---|
| S4.1 | Tabs | QIP Goals, Policies, Procedures, Philosophy, Teaching Approaches |
| S4.2 | QIP Goals tab | add/edit/delete goals; active toggle |
| S4.3 | Philosophy tab | rich editor for each value (K.I.R.O.S.) |
| S4.4 | Teaching Approaches | cards; edit title + description |
| S4.5 | Re-index button | triggers AI learnings refresh |

### S5. `/admin/ai-learnings`

| ID | Scenario | Assertion |
|----|---|---|
| S5.1 | Learnings list | entry title, category, source, similarity preview |
| S5.2 | Search | semantic search box returns top-K |
| S5.3 | Edit | modal for entry text + metadata |
| S5.4 | Delete | removes entry from vector DB |
| S5.5 | Bulk import | file upload of .txt/.md generates entries |

### S6. `/admin/ai-analytics`

| ID | Scenario | Assertion |
|----|---|---|
| S6.1 | Cost chart | line chart of daily spend |
| S6.2 | Token usage | stacked bar per model |
| S6.3 | Agent performance | table of agents with invocation count, avg duration, error rate |
| S6.4 | Date range filter | narrows charts |

### S7. `/admin/ai-prompts`

| ID | Scenario | Assertion |
|----|---|---|
| S7.1 | Prompt library | categorised list |
| S7.2 | Create prompt | form: title, body, category → appears in chat's quick-prompts menu |
| S7.3 | Edit / Delete | functional |

### S8. `/admin/notifications`

| ID | Scenario | Assertion |
|----|---|---|
| S8.1 | Rule list | event type, channels, recipients, active toggle |
| S8.2 | New rule | form: trigger event, channel (Slack/Email), filter conditions |
| S8.3 | Test rule | sends a test notification |

### S9. `/admin/tags`

| ID | Scenario | Assertion |
|----|---|---|
| S9.1 | Tag list | name, colour, usage count |
| S9.2 | New tag | colour picker + name → saves |
| S9.3 | Delete tag | prevented if in use; warns user |

### S10. `/admin/sharepoint`

| ID | Scenario | Assertion |
|----|---|---|
| S10.1 | Connection status | connected/disconnected |
| S10.2 | Folder mappings | table of local folder → SharePoint folder |
| S10.3 | Sync now | triggers full sync; progress bar |

### S11. `/admin/owna`

| ID | Scenario | Assertion |
|----|---|---|
| S11.1 | API key input | masked by default; reveal toggle |
| S11.2 | Centre mapping | map local rooms to OWNA room IDs |
| S11.3 | Test connection | pings OWNA; shows success/failure |

---

## Section T — AP Dashboard (multi-centre)

### T1. `/ap-dashboard`

| ID | Scenario | Assertion |
|----|---|---|
| T1.1 | Access | admin only |
| T1.2 | Centre selector | dropdown of all centres |
| T1.3 | Aggregate stats | totals across centres |
| T1.4 | Comparison table | per-centre scores + risk indicators |
| T1.5 | High priority alerts | across all centres with drill-down |

---

## Section U — Centre Hub

### U1. `/hub`

| ID | Scenario | Assertion |
|----|---|---|
| U1.1 | Hub landing | centre name, welcome message |
| U1.2 | Quick links | to most-used pages |
| U1.3 | Announcements | list of recent |

---

## Section V — Help & Resources

### V1. `/guide`

| ID | Scenario | Assertion |
|----|---|---|
| V1.1 | Category sidebar | navigation present |
| V1.2 | Search | substring match on articles |
| V1.3 | Article renders | markdown content visible |
| V1.4 | FAQ accordion | expand/collapse works |

### V2. `/resources`

| ID | Scenario | Assertion |
|----|---|---|
| V2.1 | Resource cards | title, link, category |
| V2.2 | External link | opens in new tab |

---

## Section W — Forms

### W1. `/forms`

| ID | Scenario | Assertion |
|----|---|---|
| W1.1 | Form list | title, last updated, responses count |
| W1.2 | Create form | builder with field types |
| W1.3 | Publish | generates shareable link |
| W1.4 | Responses | table of submissions |

---

## Section X — Cross-cutting Quality Gates

### X1. Smoke (`smoke.spec.ts`)
Run on every deploy. Must pass before merging.

- X1.1: Every top-level route in the sidebar loads with HTTP 200 and renders without errors in under 10s
- X1.2: Login → Logout round trip completes
- X1.3: Chat returns a response to "ping" within 20s
- X1.4: No console errors on any visited page

### X2. Accessibility (`a11y.spec.ts`)
Uses `@axe-core/playwright` — purely frontend, just runs the browser analyser.

- X2.1: `/login` — 0 WCAG 2.1 AA violations
- X2.2: `/dashboard` — 0 critical violations (warnings allowed)
- X2.3: `/chat` — 0 critical violations
- X2.4: `/candidates` — 0 critical violations
- X2.5: `/apply/[token]` — 0 critical violations (public-facing, strictest)
- X2.6: Every form has labels associated with inputs (via `for`/`id` or aria-label)
- X2.7: Colour contrast passes on primary text
- X2.8: Keyboard nav: Tab through any page without trap

### X3. Mobile (`mobile.spec.ts`)
`page.setViewportSize({ width: 375, height: 667 })` then visit each page.

- X3.1: Sidebar collapses, hamburger visible
- X3.2: No horizontal scroll on any page
- X3.3: Buttons ≥ 44×44 px tappable area
- X3.4: `/apply/[token]` fully usable (most important mobile surface)
- X3.5: Chat composer remains reachable with keyboard open

### X4. Performance (`perf.spec.ts`)
Lightweight — not a full Lighthouse, just thresholds on navigation.

- X4.1: `/dashboard` TTFB < 3s on deployed Vercel
- X4.2: `/chat` interactive < 4s
- X4.3: Any page's `networkidle` reached < 8s

### X5. Regression (`regression.spec.ts`)
Final catch-all: every prior-passing test rerun on each PR.

- X5.1: Visit each unique top-level route; assert no 404 / 500 / console error

### X6. Error handling

- X6.1: Unknown route → 404 page (not a stack trace)
- X6.2: Server 500 on any API → user-facing toast, not raw error
- X6.3: Session expired mid-action → redirect to login with return URL
- X6.4: Clipboard blocked → fallback to manual-select textarea

### X7. Data freshness

- X7.1: Dashboard counts match `/tasks` list count (cross-page consistency)
- X7.2: Candidate created in pipeline appears in `/candidates` list within 5s
- X7.3: Task created appears on dashboard "Tasks Completed" remainder decreases

---

## Seed-data requirements (for full coverage)

Some tests cannot run meaningfully against a clean DB. Tests that require seed data are **skipped by default** and enabled via env vars:

| Env var | Unlocks | Value |
|---|---|---|
| `TEST_CANDIDATE_TOKEN` | K1.5-K1.16 (full questionnaire flow) | A valid candidate access token |
| `TEST_COMPLETED_MODULE_ID` | I3 (module player from completion state) | A module ID with seeded content |
| `TEST_OPEN_POSITION_ID` | J3 regression (ensures an invitable position exists on first run) | Position ID |
| `RUN_FULL_QUESTIONNAIRE` | K1.13+ (60-question completion) | "1" |
| `TEST_SEEDED_CHILDREN` | P3, P4 (demo-OWNA data) | "1" |

Seed-data creation itself is tested via UAT:
- Create position → verify — no need to seed positions separately
- Invite candidate → verify — no need to seed candidates
- etc.

For tests that genuinely need pre-existing state (e.g., a module with 5 completed sections to test "Mark Complete" edge), provide a one-time setup spec (`setup.data.spec.ts`) that runs once to create fixtures via the UI.

---

## Run order & dependencies

Tests are written **independently** (each test can run in isolation), but `candidates.spec.ts` uses `test.describe.configure({ mode: 'serial' })` because invite → list assertion depends on invite creation.

**Recommended CI order:**
1. `smoke.spec.ts` — fail fast
2. `auth.setup.ts` — one-time session
3. `regression.spec.ts` — regression catch-all
4. Section specs (A-W) in parallel shards
5. `a11y.spec.ts`, `mobile.spec.ts`, `perf.spec.ts`

**Estimated coverage:**
- ≈ 430 distinct test cases
- ≈ 15 spec files (organised per section)
- Full suite runtime on Vercel: 8-12 minutes with 4 parallel shards

---

## Maintenance rules

1. **Every new feature ships with a UAT test** in its section.
2. **Every form field added must have `name=` and — where multiple inputs of the same type exist — `data-testid=`.**
3. **Every clickable uses a distinct visible label** so tests don't need brittle `.first()` logic.
4. **When a test fails, read the screenshot first** (`test-results/.../test-failed-1.png`). If the screenshot shows the product is correct, fix the test, not the product.
5. **All assertions are on user-visible output.** If a backend change has no UI effect, it has no UAT test — it needs unit/integration coverage elsewhere.
6. **Seed-data gates** are explicit — skipped tests must document the env var needed to unskip.

This plan is the living contract between the product and the test suite. When a UI contract changes (label, role, structure), update both the component AND the matching test in the same PR.
