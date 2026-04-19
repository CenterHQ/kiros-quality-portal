# Kiros Quality Portal — Code Review Audit

**Purpose:** Track developer team reviews of all source files for North Star 2 (SYSTEM-HEALTH.md).
**Audience:** Developer running reviews across sessions — pick the first `pending` row, run the review, write findings to SYSTEM-HEALTH.md, mark `done`.
**Total files:** 273 TypeScript/TSX across 3 layers
**Output target:** `docs/SYSTEM-HEALTH.md`

**Status values:** `pending` | `in-progress` | `done` | `skipped`

---

## How to use this file

1. Open this file at the start of a session
2. Find the first row with status `pending`
3. Run the developer review team skill on that work unit
4. Write any findings to `docs/SYSTEM-HEALTH.md` (add new bug, architectural concern, or maintenance priority entries)
5. Update the status to `done` and note what was found (or `skipped` with a reason)
6. Continue to the next `pending` row

---

## Layer 1 — API Routes (53 files) — Highest Priority

Bugs, auth failures, RLS misuse, silent errors, and dead endpoints live here.

| # | Work Unit | Files | Status | Findings Summary |
|---|---|---|---|---|
| 1.1 | `app/api/chat/` | 7 | `pending` | — |
| 1.2 | `app/api/marketing/` | 19 | `pending` | — |
| 1.3 | `app/api/recruitment/` | 7 | `pending` | — |
| 1.4 | `app/api/reports/` | 4 | `pending` | — |
| 1.5 | `app/api/documents/` | 5 | `pending` | — |
| 1.6 | `app/api/sharepoint/` | 6 | `pending` | — |
| 1.7 | `app/api/owna-proxy/` | 1 | `pending` | — |
| 1.8 | `app/api/cron/` | 1 | `pending` | — |
| 1.9 | `app/api/admin/` | 2 | `pending` | — |
| 1.10 | `app/api/public/` | 1 | `pending` | — |

---

## Layer 2 — Shared Library (28 files) — High Priority

High blast radius — bugs here affect multiple features.

| # | Work Unit | Files | Status | Findings Summary |
|---|---|---|---|---|
| 2.1 | `lib/supabase/` — client, server, middleware | 3 | `pending` | — |
| 2.2 | `lib/chat/` — model-router, orchestrator, shared, sse-protocol | 4 | `pending` | — |
| 2.3 | `lib/marketing/` — meta-api, google-api, tool-executor, token-manager, chat-config, types | 6 | `pending` | — |
| 2.4 | `lib/ai-config.ts` | 1 | `done` | ~40/70 config fields never read back in code — see SYSTEM-HEALTH.md §5 AI Config audit |
| 2.5 | `lib/report-*.ts` — schema, query-builder, export, types | 4 | `pending` | — |
| 2.6 | `lib/document-*.ts` — storage, sync, templates | 3 | `pending` | — |
| 2.7 | `lib/owna.ts`, `lib/microsoft-graph.ts` | 2 | `pending` | — |
| 2.8 | `lib/types.ts`, `lib/utils.ts`, `lib/ProfileContext.tsx`, `lib/ap-dashboard-data.ts` | 4 | `pending` | — |
| 2.9 | `hooks/`, `middleware.ts` | 3 | `pending` | — |

---

## Layer 3 — Feature Pages (192 files) — Ordered by Risk

### 3A — Live Data Features (things that are actually in use)

| # | Work Unit | Files | Status | Findings Summary |
|---|---|---|---|---|
| 3.1 | `app/dashboard/` | 3 | `pending` | — |
| 3.2 | `app/elements/` + `app/elements/[id]/` | 5 | `pending` | — |
| 3.3 | `app/compliance/` | 3 | `pending` | — |
| 3.4 | `app/tasks/` | 3 | `pending` | — |
| 3.5 | `app/chat/` | 3 | `pending` | — |
| 3.6 | `app/learning/` (top level + modules + matrix + certificates + pathways + pdp) | 17 | `pending` | — |
| 3.7 | `app/ap-dashboard/` | 5 | `pending` | — |
| 3.8 | `app/reports/` + `app/reports/extract/` | 12 | `pending` | — |

### 3B — OWNA Integration Pages

| # | Work Unit | Files | Status | Findings Summary |
|---|---|---|---|---|
| 3.9 | `app/owna/` — children, staff, families, enrolments, health | 10 | `pending` | — |
| 3.10 | `app/owna/attendance/` | 2 | `pending` | — |

### 3C — Admin Pages

| # | Work Unit | Files | Status | Findings Summary |
|---|---|---|---|---|
| 3.11 | `app/admin/ai-config/` | 1 | `done` | 40+ dead fields, no audit trail, race condition — see SYSTEM-HEALTH.md §5 |
| 3.12 | `app/admin/agents/` | 1 | `pending` | — |
| 3.13 | `app/admin/ai-prompts/`, `app/admin/ai-learnings/`, `app/admin/ai-analytics/` | 3 | `pending` | — |
| 3.14 | `app/admin/context/`, `app/admin/tags/` | 6 | `pending` | — |
| 3.15 | `app/admin/users/`, `app/admin/notifications/`, `app/admin/owna/`, `app/admin/sharepoint/` | 8 | `pending` | — |

### 3D — Marketing Pages

| # | Work Unit | Files | Status | Findings Summary |
|---|---|---|---|---|
| 3.16 | `app/marketing/inbox/`, `app/marketing/chat/` | 2 | `pending` | — |
| 3.17 | `app/marketing/content/`, `app/marketing/calendar/`, `app/marketing/feed/` | 5 | `pending` | — |
| 3.18 | `app/marketing/ads/`, `app/marketing/analytics/` | 2 | `pending` | — |
| 3.19 | `app/marketing/comments/`, `app/marketing/reviews/`, `app/marketing/settings/` | 3 | `pending` | — |

### 3E — Low-Use / Empty Features

| # | Work Unit | Files | Status | Findings Summary |
|---|---|---|---|---|
| 3.20 | `app/candidates/` + positions + [id] | 4 | `pending` | — |
| 3.21 | `app/checklists/` + templates + [id] | 7 | `pending` | — |
| 3.22 | `app/policies/` + new + [id] | 7 | `pending` | — |
| 3.23 | `app/documents/` + library | 5 | `pending` | — |
| 3.24 | `app/forms/` + new | 5 | `pending` | — |
| 3.25 | `app/registers/` + [id] | 5 | `pending` | — |
| 3.26 | `app/rostering/` | 3 | `pending` | — |
| 3.27 | `app/activity/`, `app/hub/`, `app/resources/`, `app/guide/` | 12 | `pending` | — |
| 3.28 | `app/training/` | 3 | `pending` | — |
| 3.29 | `app/programming/` | 2 | `pending` | — |
| 3.30 | `app/apply/`, `app/login/`, `app/page.tsx`, `app/layout.tsx` | 5 | `pending` | — |

### 3F — Shared Components

| # | Work Unit | Files | Status | Findings Summary |
|---|---|---|---|---|
| 3.31 | `components/` — Sidebar, ProtectedLayout, Providers, nav components | 5 | `pending` | — |
| 3.32 | `components/ui/` — 22 shared UI components | 22 | `pending` | — |
| 3.33 | `components/chat/`, `components/marketing/`, `components/CentreContextPanel.tsx`, `components/ChatAssistant.tsx` | 4 | `pending` | — |

---

## Progress

| Layer | Work Units | Done | Pending |
|---|---|---|---|
| Layer 1 — API Routes | 10 | 0 | 10 |
| Layer 2 — Shared Library | 9 | 1 | 8 |
| Layer 3 — Feature Pages | 33 | 2 | 31 |
| **Total** | **52** | **3** | **49** |

---

*Findings from completed units are written to `docs/SYSTEM-HEALTH.md`. Update this file's progress table and row status after each session.*
