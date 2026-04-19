# Kiros Application — Production Readiness Audit
**Date:** 2026-04-10
**Purpose:** Comprehensive review before educator release

---

## MUST FIX BEFORE RELEASE (Blocking)

### Security — Critical

| # | Issue | File | Fix |
|---|---|---|---|
| S1 | **Hardcoded OWNA API key in source code** | `src/app/api/owna-proxy/route.ts` line 3, `src/app/admin/owna/page.tsx` | Move to `process.env.OWNA_API_KEY`, revoke current key |
| S2 | **5 API routes missing authentication** | `sharepoint/sync`, `sharepoint/process`, `sharepoint/files`, `documents/export`, `sharepoint/auth` (debug) | Add auth checks to all routes |
| S3 | **Debug endpoint exposes env var hints** | `src/app/api/sharepoint/auth/route.ts` lines 6-57 | Remove debug mode or protect with admin auth |
| S4 | **SharePoint admin page allows manager access** | `src/app/admin/sharepoint/page.tsx` line 198 | Change to admin-only |

### Error Handling — Critical

| # | Issue | File | Fix |
|---|---|---|---|
| E1 | **Silent failure in suggestions route** | `src/app/api/chat/suggestions/route.ts` lines 81-100 | Return error to frontend when assignment fails |
| E2 | **No error states on data-fetching pages** | elements, documents, registers, rostering, training | Add try/catch + error UI on all pages that fetch data |
| E3 | **Claude API downtime shows generic error** | `stream/route.ts`, `route.ts` | Detect 429/500/timeout, show user-friendly message with retry guidance |
| E4 | **OWNA pages show infinite loading on API failure** | All `src/app/owna/*/page.tsx` | Add timeout (10s), show error UI |

### Data Integrity — Critical

| # | Issue | File | Fix |
|---|---|---|---|
| D1 | **Streamed message lost if Supabase save fails** | `stream/route.ts` lines 266-284 | Already handled (partial save in catch) — verify works |

### Remaining Design Token Cleanup

| # | Issue | Files | Fix |
|---|---|---|---|
| T1 | **~15 files still have bg-white** | policies/[id], policies/new, forms/new, training, registers/[id], chat (doc cards), CentreContextPanel, PrintButton | Replace with bg-card |
| T2 | **~8 files still have hardcoded gray-xxx** | login, registers/[id], chat, guide, policy pages | Replace with semantic tokens |

---

## SHOULD FIX FOR RELEASE (Important but not blocking)

### UX Gaps

| # | Issue | Fix |
|---|---|---|
| U1 | Missing empty states on elements (filtered=0), registers (none exist), checklists/templates, documents, learning/library | Add EmptyState component |
| U2 | Missing loading states on elements, policies — layout jumps when data arrives | Add loading boolean + skeleton |
| U3 | Forms use alert() for validation (registers, checklists) | Replace with toast notifications |
| U4 | Buttons don't disable during async operations (registers add row, checklist submit) | Add disabled={saving} state |
| U5 | Inconsistent loading indicators (some "Loading...", some spinner, some nothing) | Standardise to SkeletonCard/SkeletonTable |

### Accessibility

| # | Issue | Fix |
|---|---|---|
| A1 | Icon buttons missing aria-labels (elements/[id], policies/[id], registers/[id], checklists/[id], CentreContextPanel) | Add aria-label to all icon buttons |
| A2 | Forms missing field labels (registers inline edit, admin/tags color input) | Add htmlFor + label |

### Robustness

| # | Issue | Fix |
|---|---|---|
| R1 | Activity page real-time can show duplicate entries | Dedup by ID on INSERT event |
| R2 | Chat subscription only listens for INSERT, not UPDATE | Add UPDATE event listener |
| R3 | OWNA proxy accepts any HTTP method | Whitelist GET/POST only |

---

## POST-LAUNCH IMPROVEMENTS (Not blocking)

| # | Issue | Notes |
|---|---|---|
| P1 | SharePoint token refresh not implemented | Tokens expire after 1hr; app uses app-only credentials so this is mitigated but not ideal |
| P2 | No rate limiting on chat/export endpoints | Risk of cost overrun if abused |
| P3 | No per-user conversation search | Users can only scroll through list |
| P4 | PDF generation may timeout on very large documents | Add fallback: "Try HTML export instead" |
| P5 | DOCX export loses bold/italic formatting | Use better markdown-to-docx conversion |
| P6 | No E2E tests for critical flows | Add integration tests |
| P7 | SharePoint stores app token in DB | Consider token rotation |
| P8 | Multiple Supabase client instances per page | Use shared React Context |
| P9 | Session expiry has no client-side detection | Add session timer + modal |
| P10 | No offline handling | Service worker for basic caching |
