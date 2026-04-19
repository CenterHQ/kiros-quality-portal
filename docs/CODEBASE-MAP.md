# Kiros Quality Portal — Codebase Map

**Generated:** 2026-04-19  
**Session:** Phase 3 — Codebase Cartography  
**Prior context:** CONTEXT.md (system comprehension) + docs/archive/DISCOVERY.md (findings)  
**Source:** ~412 TypeScript/TSX files under src/

---

## Section 1: File Inventory

### Legend

**Layers:** `server-api` | `client-page` | `client-component` | `client-hook` | `shared-lib` | `config`

**UAT Sections:**
A=Auth/Shell · B=Dashboard · C=QA Elements · D=Tasks · E=Checklists · F=Compliance · G=Policies · H=Registers · I=Learning · J=Recruitment · K=Public Questionnaire · L=Programming · M=AI Chat · N=Documents · O=Rostering · P=OWNA · Q=Marketing · R=Activity/Reports · S=Admin · T=AP Dashboard · U=Centre Hub · V=Help/Resources · W=Forms · X=Cross-cutting

---

### 1.1 Server — API Routes (`src/app/api/**`)

| Layer | Path | Purpose | ~Lines | UAT |
|---|---|---|---:|---|
| server-api | app/api/chat/stream/route.ts | Primary SSE streaming chat with tool execution | 491 | M |
| server-api | app/api/chat/route.ts | Fallback/non-streaming chat handler | 338 | M |
| server-api | app/api/chat/confirm/route.ts | Execute confirmed pending_actions from AI | 145 | M |
| server-api | app/api/chat/conversations/route.ts | List/fetch chat conversation history | 93 | M |
| server-api | app/api/chat/export/route.ts | Export chat conversation to file | 50 | M |
| server-api | app/api/chat/suggestions/route.ts | Generate AI dashboard suggestions | 115 | M |
| server-api | app/api/chat/upload/route.ts | Upload file for chat context | 111 | M |
| server-api | app/api/admin/agents/test/route.ts | Test AI agent definition (admin only) | 63 | S |
| server-api | app/api/admin/preview-prompt/route.ts | Preview assembled system prompt before save | 25 | S |
| server-api | app/api/cron/qualifications/route.ts | Cron: check staff qualification expiry | 40 | I |
| server-api | app/api/documents/export/route.ts | Export documents (DOCX/PDF generation) | 170 | N |
| server-api | app/api/documents/library/route.ts | Fetch document library index | 97 | N |
| server-api | app/api/documents/cron/sync/route.ts | Cron: trigger SharePoint document sync | 15 | N |
| server-api | app/api/documents/resync/route.ts | Manual resync all documents | 21 | N |
| server-api | app/api/documents/test-write-path/route.ts | Debug: test document storage write path | 196 | N |
| server-api | app/api/marketing/accounts/route.ts | List marketing social accounts | 39 | Q |
| server-api | app/api/marketing/accounts/[id]/route.ts | Get single marketing account detail | 64 | Q |
| server-api | app/api/marketing/analytics/route.ts | Fetch marketing analytics data | 40 | Q |
| server-api | app/api/marketing/chat/stream/route.ts | Marketing-specific AI SSE streaming chat | 362 | Q |
| server-api | app/api/marketing/comments/reply/route.ts | Reply to social media comment | 83 | Q |
| server-api | app/api/marketing/comments/sync/route.ts | Sync comments from Meta/Google platforms | 122 | Q |
| server-api | app/api/marketing/cron/analytics-sync/route.ts | Cron: sync marketing analytics | 170 | Q |
| server-api | app/api/marketing/cron/publish/route.ts | Cron: auto-publish scheduled content | 136 | Q |
| server-api | app/api/marketing/cron/token-refresh/route.ts | Cron: refresh Meta/Google OAuth tokens | 89 | Q |
| server-api | app/api/marketing/feed/sync/route.ts | Sync social media feed items | 80 | Q |
| server-api | app/api/marketing/google/auth/route.ts | Initiate Google OAuth flow | 19 | Q |
| server-api | app/api/marketing/google/callback/route.ts | Google OAuth callback handler | 174 | Q |
| server-api | app/api/marketing/inbox/reply/route.ts | Reply to inbox DM | 82 | Q |
| server-api | app/api/marketing/inbox/sync/route.ts | Sync inbox messages from platforms | 147 | Q |
| server-api | app/api/marketing/meta/auth/route.ts | Initiate Meta (Facebook) OAuth flow | 20 | Q |
| server-api | app/api/marketing/meta/callback/route.ts | Meta OAuth callback handler | 163 | Q |
| server-api | app/api/marketing/publish/route.ts | Publish content to social platforms | 189 | Q |
| server-api | app/api/marketing/webhooks/google/route.ts | Google Ads webhook handler | 28 | Q |
| server-api | app/api/marketing/webhooks/meta/route.ts | Meta webhook handler | 70 | Q |
| server-api | app/api/owna-proxy/route.ts | Read-only proxy to OWNA childcare API | 51 | P |
| server-api | app/api/public/brand/route.ts | Public brand config (unauthenticated) | 27 | K |
| server-api | app/api/recruitment/apply/[token]/route.ts | Accept recruitment application submission | 221 | K |
| server-api | app/api/recruitment/candidates/route.ts | List/create candidates | 119 | J |
| server-api | app/api/recruitment/disc-results/route.ts | Process DISC assessment results | 105 | J |
| server-api | app/api/recruitment/invite/route.ts | Send recruitment invitation email | 94 | J |
| server-api | app/api/recruitment/onboard/route.ts | Create auth user for onboarding hire | 199 | J |
| server-api | app/api/recruitment/positions/route.ts | Manage open positions | 164 | J |
| server-api | app/api/recruitment/score/route.ts | AI-score candidate application responses | 247 | J |
| server-api | app/api/reports/extract/export/route.ts | Export query-builder report as CSV/JSON | 116 | R |
| server-api | app/api/reports/extract/preview/route.ts | Preview report query results | 64 | R |
| server-api | app/api/reports/extract/schema/route.ts | Return report schema for query builder | 31 | R |
| server-api | app/api/reports/extract/templates/route.ts | CRUD for saved report templates | 128 | R |
| server-api | app/api/sharepoint/auth/route.ts | Initiate SharePoint OAuth | 16 | N |
| server-api | app/api/sharepoint/callback/route.ts | SharePoint OAuth callback | 57 | N |
| server-api | app/api/sharepoint/files/route.ts | List files in SharePoint library | 44 | N |
| server-api | app/api/sharepoint/process/route.ts | Process/extract text from SharePoint doc | 272 | N |
| server-api | app/api/sharepoint/refresh-token/route.ts | Refresh SharePoint access token | 45 | N |
| server-api | app/api/sharepoint/sync/route.ts | Sync SharePoint documents to DB | 111 | N |

---

### 1.2 Client — Pages (`src/app/**/page.tsx`)

| Layer | Path | Purpose | ~Lines | UAT |
|---|---|---|---:|---|
| client-page | app/page.tsx | Root redirect to /dashboard | 5 | A |
| client-page | app/login/page.tsx | Login form with Supabase auth | 78 | A |
| client-page | app/dashboard/page.tsx | Role-aware dashboard with AI suggestions | 203 | B |
| client-page | app/elements/page.tsx | NQS element list grouped by Quality Area | 138 | C |
| client-page | app/elements/[id]/page.tsx | NQS element detail: finding, response, actions, tasks | 644 | C |
| client-page | app/tasks/page.tsx | Kanban + list task management | 561 | D |
| client-page | app/checklists/page.tsx | Checklist instances list | 394 | E |
| client-page | app/checklists/[id]/page.tsx | Checklist completion with item responses | 450 | E |
| client-page | app/checklists/templates/page.tsx | Checklist templates library | 436 | E |
| client-page | app/compliance/page.tsx | Compliance item tracking | 313 | F |
| client-page | app/policies/page.tsx | Policy library with version/ack status | 305 | G |
| client-page | app/policies/[id]/page.tsx | Policy detail, edit, acknowledge | 349 | G |
| client-page | app/policies/new/page.tsx | Create new policy | 200 | G |
| client-page | app/registers/page.tsx | User-defined registers list | 332 | H |
| client-page | app/registers/[id]/page.tsx | Register detail with dynamic column data | 325 | H |
| client-page | app/learning/page.tsx | Learning Hub overview | 479 | I |
| client-page | app/learning/library/page.tsx | LMS module library | 495 | I |
| client-page | app/learning/modules/[id]/page.tsx | Module player: sections, quiz, reflections | 1397 | I |
| client-page | app/learning/pathways/page.tsx | Learning pathways list | 283 | I |
| client-page | app/learning/pathways/[id]/page.tsx | Pathway detail with module sequence | 377 | I |
| client-page | app/learning/pdp/page.tsx | Personal Development Plans | 1258 | I |
| client-page | app/learning/matrix/page.tsx | Staff competency matrix | 663 | I |
| client-page | app/learning/certificates/page.tsx | Certificate management | 820 | I |
| client-page | app/training/page.tsx | Legacy training assignments list | 281 | I |
| client-page | app/candidates/page.tsx | Recruitment candidate pipeline list | 576 | J |
| client-page | app/candidates/[id]/page.tsx | Candidate 6-tab detail: profile, DISC, onboarding | 869 | J |
| client-page | app/candidates/positions/page.tsx | Open positions management | 538 | J |
| client-page | app/apply/[token]/page.tsx | Public recruitment questionnaire (unauthenticated) | 572 | K |
| client-page | app/programming/page.tsx | Educational Leadership hub + doc generation | 446 | L |
| client-page | app/chat/page.tsx | Full AI chat UI with streaming + tool confirmation | 1049 | M |
| client-page | app/marketing/chat/page.tsx | Marketing AI assistant | 276 | M/Q |
| client-page | app/documents/page.tsx | Document management (upload, AI docs) | 295 | N |
| client-page | app/documents/library/page.tsx | SharePoint-synced document library | 220 | N |
| client-page | app/rostering/page.tsx | Shift scheduling, ratio tracking, leave | 853 | O |
| client-page | app/owna/staff/page.tsx | OWNA staff profiles (read-only) | 188 | P |
| client-page | app/owna/attendance/page.tsx | OWNA attendance data | 207 | P |
| client-page | app/owna/children/page.tsx | OWNA child records | 174 | P |
| client-page | app/owna/families/page.tsx | OWNA family records | 183 | P |
| client-page | app/owna/enrolments/page.tsx | OWNA enrolments | 221 | P |
| client-page | app/owna/health/page.tsx | OWNA health records | 176 | P |
| client-page | app/marketing/page.tsx | Marketing hub overview | 254 | Q |
| client-page | app/marketing/content/page.tsx | Content list | 166 | Q |
| client-page | app/marketing/content/new/page.tsx | Create marketing content | 294 | Q |
| client-page | app/marketing/content/[id]/page.tsx | Content detail + publish | 364 | Q |
| client-page | app/marketing/calendar/page.tsx | Content calendar | 203 | Q |
| client-page | app/marketing/reviews/page.tsx | Review + ratings management | 274 | Q |
| client-page | app/marketing/ads/page.tsx | Ad campaigns list | 146 | Q |
| client-page | app/marketing/ads/[id]/page.tsx | Ad campaign detail | 211 | Q |
| client-page | app/marketing/analytics/page.tsx | Marketing analytics dashboard | 199 | Q |
| client-page | app/marketing/inbox/page.tsx | Social DM inbox | 331 | Q |
| client-page | app/marketing/comments/page.tsx | Social comment management | 268 | Q |
| client-page | app/marketing/feed/page.tsx | Social media feed | 221 | Q |
| client-page | app/marketing/settings/page.tsx | Marketing integrations + platform auth | 239 | Q |
| client-page | app/activity/page.tsx | Real-time audit trail | 203 | R |
| client-page | app/reports/page.tsx | Reports hub | 299 | R |
| client-page | app/reports/extract/page.tsx | Query-builder report extractor | 329 | R |
| client-page | app/admin/agents/page.tsx | AI agent CRUD with test runner | 1062 | S |
| client-page | app/admin/ai-analytics/page.tsx | AI usage + agent performance metrics | 184 | S |
| client-page | app/admin/ai-config/page.tsx | AI model configuration | 874 | S |
| client-page | app/admin/ai-learnings/page.tsx | AI learnings review + management | 600 | S |
| client-page | app/admin/ai-prompts/page.tsx | System prompt section editor | 716 | S |
| client-page | app/admin/context/page.tsx | Centre context (QIP/philosophy) manager | 574 | S |
| client-page | app/admin/notifications/page.tsx | Notification settings | 53 | S |
| client-page | app/admin/owna/page.tsx | OWNA integration admin | 597 | S |
| client-page | app/admin/sharepoint/page.tsx | SharePoint sync management | 1126 | S |
| client-page | app/admin/tags/page.tsx | Content tag management | 128 | S |
| client-page | app/admin/users/page.tsx | User management + role assignment | 302 | S |
| client-page | app/ap-dashboard/page.tsx | Approved Provider multi-metric dashboard | 243 | T |
| client-page | app/hub/page.tsx | Centre Hub landing | 171 | U |
| client-page | app/guide/page.tsx | User guide and help content | 605 | V |
| client-page | app/resources/page.tsx | Resource library | 143 | V |
| client-page | app/forms/page.tsx | Digital forms list | 67 | W |
| client-page | app/forms/new/page.tsx | Create form submission | 228 | W |

---

### 1.3 Client — Layouts (`src/app/**/layout.tsx`)

| Layer | Path | Purpose | ~Lines | UAT |
|---|---|---|---:|---|
| client-page | app/layout.tsx | Root layout: metadata, globals, Providers | 43 | A |
| client-page | app/apply/layout.tsx | Public apply layout (no auth) | 9 | K |
| client-page | app/chat/layout.tsx | Chat layout with sidebar toggle | 40 | M |
| client-page | app/marketing/layout.tsx | Marketing sub-nav layout | 22 | Q |
| client-page | app/admin/layout.tsx | Admin section layout | 6 | S |
| client-page | app/ap-dashboard/layout.tsx | AP dashboard layout | 5 | T |
| client-page | app/dashboard/layout.tsx | Dashboard layout | 6 | B |
| client-page | app/elements/layout.tsx | Elements section layout | 6 | C |
| client-page | app/tasks/layout.tsx | Tasks section layout | 6 | D |
| client-page | app/checklists/layout.tsx | Checklists section layout | 5 | E |
| client-page | app/compliance/layout.tsx | Compliance section layout | 6 | F |
| client-page | app/policies/layout.tsx | Policies section layout | 5 | G |
| client-page | app/registers/layout.tsx | Registers section layout | 5 | H |
| client-page | app/learning/layout.tsx | Learning section layout | 5 | I |
| client-page | app/training/layout.tsx | Training section layout | 6 | I |
| client-page | app/candidates/layout.tsx | Candidates section layout | 5 | J |
| client-page | app/programming/layout.tsx | Programming section layout | 5 | L |
| client-page | app/documents/layout.tsx | Documents section layout | 6 | N |
| client-page | app/rostering/layout.tsx | Rostering section layout | 5 | O |
| client-page | app/owna/layout.tsx | OWNA section layout | 5 | P |
| client-page | app/activity/layout.tsx | Activity section layout | 6 | R |
| client-page | app/reports/layout.tsx | Reports section layout | 5 | R |
| client-page | app/guide/layout.tsx | Guide section layout | 5 | V |
| client-page | app/hub/layout.tsx | Hub section layout | 5 | U |
| client-page | app/resources/layout.tsx | Resources section layout | 6 | V |
| client-page | app/forms/layout.tsx | Forms section layout | 6 | W |

---

### 1.4 Client — Loading Skeletons (`src/app/**/loading.tsx`)

> These are skeleton loader screens — one per major page. All ~9–30 lines. UAT: X (cross-cutting).

| Layer | Path | ~Lines | UAT |
|---|---|---:|---|
| client-page | app/activity/loading.tsx | 18 | X |
| client-page | app/admin/context/loading.tsx | 17 | X |
| client-page | app/admin/notifications/loading.tsx | 18 | X |
| client-page | app/admin/owna/loading.tsx | 14 | X |
| client-page | app/admin/sharepoint/loading.tsx | 10 | X |
| client-page | app/admin/tags/loading.tsx | 14 | X |
| client-page | app/admin/users/loading.tsx | 10 | X |
| client-page | app/ap-dashboard/loading.tsx | 14 | X |
| client-page | app/chat/loading.tsx | 30 | X |
| client-page | app/checklists/loading.tsx | 24 | X |
| client-page | app/checklists/[id]/loading.tsx | 19 | X |
| client-page | app/checklists/templates/loading.tsx | 17 | X |
| client-page | app/compliance/loading.tsx | 14 | X |
| client-page | app/dashboard/loading.tsx | 14 | X |
| client-page | app/documents/loading.tsx | 14 | X |
| client-page | app/elements/loading.tsx | 18 | X |
| client-page | app/elements/[id]/loading.tsx | 11 | X |
| client-page | app/forms/loading.tsx | 18 | X |
| client-page | app/forms/new/loading.tsx | 15 | X |
| client-page | app/guide/loading.tsx | 15 | X |
| client-page | app/hub/loading.tsx | 14 | X |
| client-page | app/learning/loading.tsx | 14 | X |
| client-page | app/learning/certificates/loading.tsx | 13 | X |
| client-page | app/learning/library/loading.tsx | 19 | X |
| client-page | app/learning/matrix/loading.tsx | 9 | X |
| client-page | app/learning/modules/[id]/loading.tsx | 17 | X |
| client-page | app/learning/pathways/loading.tsx | 13 | X |
| client-page | app/learning/pathways/[id]/loading.tsx | 15 | X |
| client-page | app/learning/pdp/loading.tsx | 18 | X |
| client-page | app/policies/loading.tsx | 10 | X |
| client-page | app/policies/[id]/loading.tsx | 17 | X |
| client-page | app/policies/new/loading.tsx | 12 | X |
| client-page | app/registers/loading.tsx | 13 | X |
| client-page | app/registers/[id]/loading.tsx | 10 | X |
| client-page | app/reports/loading.tsx | 14 | X |
| client-page | app/resources/loading.tsx | 18 | X |
| client-page | app/rostering/loading.tsx | 23 | X |
| client-page | app/tasks/loading.tsx | 18 | X |
| client-page | app/training/loading.tsx | 13 | X |

---

### 1.5 Client — Components (`src/components/**`)

| Layer | Path | Purpose | ~Lines | UAT |
|---|---|---|---:|---|
| client-component | components/ProtectedLayout.tsx | Auth gate + badge counts; patched for missing service key | 84 | A |
| client-component | components/Sidebar.tsx | Main navigation sidebar with role-based items | 331 | A |
| client-component | components/MobileNav.tsx | Mobile bottom navigation drawer | 81 | A |
| client-component | components/MobileSidebarContent.tsx | Mobile sidebar menu content | 186 | A |
| client-component | components/Breadcrumbs.tsx | Page breadcrumb navigation | 64 | A |
| client-component | components/Providers.tsx | App-level React context providers | 14 | A |
| client-component | components/ChatAssistant.tsx | Full chat conversation UI component | 627 | M |
| client-component | components/CentreContextPanel.tsx | Sidebar panel showing centre context | 125 | U/S |
| client-component | components/chat/MarkdownRenderer.tsx | Render AI markdown responses | 217 | M |
| client-component | components/marketing/PlatformIcon.tsx | Social platform icon selector | 62 | Q |
| client-component | components/ui/avatar.tsx | User avatar display | 109 | X |
| client-component | components/ui/badge.tsx | Label badge | 52 | X |
| client-component | components/ui/button.tsx | Button primitive | 58 | X |
| client-component | components/ui/card.tsx | Card container | 103 | X |
| client-component | components/ui/checkbox.tsx | Checkbox input | 29 | X |
| client-component | components/ui/data-table.tsx | Sortable/filterable data table | 157 | X |
| client-component | components/ui/dialog.tsx | Modal dialog | 160 | X |
| client-component | components/ui/dropdown-menu.tsx | Dropdown menu | 268 | X |
| client-component | components/ui/empty-state.tsx | Empty state placeholder | 68 | X |
| client-component | components/ui/input.tsx | Text input | 20 | X |
| client-component | components/ui/page-header.tsx | Page title header | 87 | X |
| client-component | components/ui/priority-badge.tsx | Task/item priority badge | 45 | D |
| client-component | components/ui/qa-badge.tsx | QA element number badge | 41 | C |
| client-component | components/ui/select.tsx | Select dropdown | 201 | X |
| client-component | components/ui/separator.tsx | Visual divider | 25 | X |
| client-component | components/ui/sheet.tsx | Slide-in side panel | 138 | X |
| client-component | components/ui/skeleton.tsx | Skeleton loading state | 74 | X |
| client-component | components/ui/stat-card.tsx | Statistics metric card | 92 | B/T |
| client-component | components/ui/status-badge.tsx | Status indicator badge | 51 | X |
| client-component | components/ui/tabs.tsx | Tab navigation | 82 | X |
| client-component | components/ui/toast.tsx | Toast notification | 195 | X |
| client-component | components/ui/tooltip.tsx | Hover tooltip | 66 | X |
| client-component | app/ap-dashboard/PrintButton.tsx | Print action for AP dashboard | 14 | T |
| client-component | app/ap-dashboard/SuggestionReview.tsx | AI suggestion review UI | 87 | T |
| client-component | app/reports/extract/components/AggregationStep.tsx | Report builder: aggregation configuration | 202 | R |
| client-component | app/reports/extract/components/DataSourceStep.tsx | Report builder: select data source | 141 | R |
| client-component | app/reports/extract/components/FieldSelectionStep.tsx | Report builder: choose fields | 179 | R |
| client-component | app/reports/extract/components/FilterStep.tsx | Report builder: apply filters | 301 | R |
| client-component | app/reports/extract/components/LoadTemplateSelect.tsx | Load saved report template | 96 | R |
| client-component | app/reports/extract/components/PreviewExportStep.tsx | Preview + export report results | 179 | R |
| client-component | app/reports/extract/components/SaveTemplateDialog.tsx | Save report as template | 84 | R |
| client-component | app/reports/extract/components/SortingStep.tsx | Report builder: sorting config | 107 | R |

---

### 1.6 Client — Hooks (`src/hooks/**`)

| Layer | Path | Purpose | ~Lines | UAT |
|---|---|---|---:|---|
| client-hook | hooks/useChatStream.ts | SSE streaming client for main AI chat | 208 | M |
| client-hook | hooks/useMarketingChatStream.ts | SSE streaming client for marketing AI chat | 135 | Q |
| client-hook | lib/hooks/useCentreContext.ts | Centre context data fetch hook | 61 | U/S |

---

### 1.7 Shared — Lib (`src/lib/**`)

| Layer | Path | Purpose | ~Lines | UAT |
|---|---|---|---:|---|
| shared-lib | lib/chat/shared.ts | **Central AI engine**: 32 tools, system prompt builder, executeTool, QUALITY_PROTOCOL, LEARNING_PROTOCOL | 2245 | M |
| shared-lib | lib/chat/model-router.ts | Route to Sonnet vs Opus based on query complexity | 30 | M |
| shared-lib | lib/chat/orchestrator.ts | Multi-agent delegation via run_deep_analysis | 267 | M/S |
| shared-lib | lib/chat/sse-protocol.ts | SSE event type definitions for streaming | 40 | M |
| shared-lib | lib/marketing/chat-config.ts | Marketing AI system prompt + tool config | 266 | Q |
| shared-lib | lib/marketing/google-api.ts | Google Ads / Calendar / Gmail API wrapper | 362 | Q |
| shared-lib | lib/marketing/meta-api.ts | Meta (Facebook/Instagram) API wrapper | 470 | Q |
| shared-lib | lib/marketing/token-manager.ts | OAuth token lifecycle (refresh, store) | 185 | Q |
| shared-lib | lib/marketing/tool-executor.ts | Execute marketing AI agent tool calls | 514 | Q |
| shared-lib | lib/marketing/types.ts | Marketing TypeScript type definitions | 296 | Q |
| shared-lib | lib/document-storage.ts | AI doc save to DB + SharePoint upload queue | 213 | N |
| shared-lib | lib/document-sync.ts | SharePoint retry/sync logic | 122 | N |
| shared-lib | lib/document-templates.ts | PDF + DOCX generation from AI content | 1248 | N |
| shared-lib | lib/microsoft-graph.ts | Microsoft Graph API wrapper for SharePoint | 401 | N |
| shared-lib | lib/report-query-builder.ts | Build dynamic Supabase queries from report schema | 471 | R |
| shared-lib | lib/report-schema.ts | Data model schema definitions for report extractor | 1154 | R |
| shared-lib | lib/report-export.ts | Export report results to CSV/JSON/XLSX | 440 | R |
| shared-lib | lib/report-types.ts | Report TypeScript type definitions | 174 | R |
| shared-lib | lib/ai-config.ts | AI model/tool configuration loader | 305 | S |
| shared-lib | lib/ap-dashboard-data.ts | AP dashboard aggregated data structures | 142 | T |
| shared-lib | lib/owna.ts | OWNA API client configuration | 37 | P |
| shared-lib | lib/ProfileContext.tsx | User profile React context provider | 20 | A |
| shared-lib | lib/supabase/client.ts | Browser Supabase client singleton | 8 | X |
| shared-lib | lib/supabase/server.ts | Server Supabase client + service role factory | 36 | X |
| shared-lib | lib/supabase/middleware.ts | Supabase session refresh for middleware | 44 | X |
| shared-lib | lib/types.ts | All TypeScript interfaces (1100+ lines, core domain model) | 1106 | X |
| shared-lib | lib/utils.ts | Shared utility functions (cn, etc.) | 6 | X |

---

### 1.8 Config

| Layer | Path | Purpose | ~Lines | UAT |
|---|---|---|---:|---|
| config | middleware.ts | Next.js request middleware: session refresh + auth route protection | 47 | A |

---

## Section 2: Surface Pattern Flags

### 2.1 `alert()` — Must be toast (3 files, 7 calls)

| File | Lines | Count |
|---|---|---|
| app/marketing/settings/page.tsx | 67, 78 | 2 |
| app/marketing/content/[id]/page.tsx | 90, 133 | 2 |
| app/marketing/content/new/page.tsx | 47, 48, 107 | 3 |

**Note:** `app/api/documents/test-write-path/route.ts` has a string literal `"alert("` in test data — not a real alert call.  
**Action for rebuild:** Zero tolerance. All three marketing pages need toast replacements.

---

### 2.2 `new Anthropic()` — Should use `getAnthropicClient()` factory (2 files)

| File | Line | Issue |
|---|---|---|
| lib/chat/shared.ts | ~12 | `getAnthropicClient()` IS the factory — correct pattern defined here |
| app/api/recruitment/disc-results/route.ts | 33 | `const anthropic = new Anthropic()` — bypasses factory |
| app/api/recruitment/score/route.ts | 69 | `const anthropic = new Anthropic()` — bypasses factory |

**Action for rebuild:** Recruitment routes should import and use `getAnthropicClient()` for consistency. Currently works but won't pick up factory-level config changes.

---

### 2.3 `USING (true)` — Permissive RLS (archived SQL only)

All `USING (true)` occurrences are in archived migration files under `docs/archive/`. These represent the 18 LMS/SharePoint tables flagged in DISCOVERY.md with permissive policies. **Active source code is clean.** The permissive policies are live in the database even though the SQL files are archived.

**Tables affected (from DISCOVERY.md):** 18 LMS and SharePoint tables — any authenticated user can read/write.

---

### 2.4 `bg-white` — Hardcoded Tailwind color (~48 occurrences, 12+ files)

Heavy concentration in:
- `app/reports/extract/page.tsx` — 6 occurrences
- `app/reports/extract/components/FilterStep.tsx` — 6 occurrences
- `app/apply/[token]/page.tsx` — 7 occurrences (public page, may be intentional)
- `app/reports/extract/components/SortingStep.tsx` — 3 occurrences
- `components/ChatAssistant.tsx` — 3 occurrences (as `bg-white/20` — opacity modifier, arguably intentional for dark overlays)

**Action for rebuild:** Establish `bg-card` as the design token. `bg-white` in dark-mode-aware components is a bug; `bg-white/20` as a transparency utility may be intentional.

---

### 2.5 `TODO` / `FIXME` — None found

Zero occurrences across the entire `src/` directory.

---

### 2.6 `console.log()` — 1 intentional occurrence

| File | Line | Context |
|---|---|---|
| lib/microsoft-graph.ts | 236 | `[SHAREPOINT WRITE AUDIT]` — intentional audit logging |

**Status:** Not a debug leftover. The log message has a structured `[SHAREPOINT WRITE AUDIT]` prefix suggesting it was added intentionally for production diagnostics.

---

### 2.7 Supabase write operations without try/catch

Client-side pages use `.error` property checks rather than try/catch, which is idiomatic for Supabase but inconsistent. Notable unprotected patterns:

| File | Operations | Status |
|---|---|---|
| app/documents/page.tsx | `.insert()` / `.delete()` ~lines 75–110 | Mixed: some error checks, some missing |
| app/marketing/content/[id]/page.tsx | `.delete()` ~line 142 | No error handling |
| lib/chat/shared.ts | `.insert()` ~line 1214 | Error checked via `.error` property but not in try/catch |

**Server-side routes:** Generally have function-level try/catch. Client pages are inconsistent.

---

### 2.8 Hardcoded credentials — None found

No API keys, `sk-` prefixes, or Bearer token patterns detected in source. The OWNA API key was hardcoded historically (flagged in DISCOVERY.md S1) but has been moved to env var.

---

## Section 3: Feature → File Matrix

### AI Chat (UAT: M)

| Category | Files |
|---|---|
| **API routes** | `api/chat/stream/route.ts`, `api/chat/route.ts`, `api/chat/confirm/route.ts`, `api/chat/conversations/route.ts`, `api/chat/export/route.ts`, `api/chat/suggestions/route.ts`, `api/chat/upload/route.ts`, `api/admin/agents/test/route.ts`, `api/admin/preview-prompt/route.ts` |
| **Pages** | `app/chat/page.tsx` |
| **Components** | `components/ChatAssistant.tsx`, `components/chat/MarkdownRenderer.tsx`, `components/CentreContextPanel.tsx` |
| **Hooks** | `hooks/useChatStream.ts` |
| **Lib** | `lib/chat/shared.ts` (32 tools + executeTool), `lib/chat/model-router.ts`, `lib/chat/orchestrator.ts`, `lib/chat/sse-protocol.ts`, `lib/ai-config.ts` |

---

### QA Elements (UAT: C)

| Category | Files |
|---|---|
| **Pages** | `app/elements/page.tsx`, `app/elements/[id]/page.tsx` |
| **Lib** | `lib/types.ts` (QaElement interface, ElementStatus enum, Rating enum) |
| **AI tools** | `get_qa_progress`, `update_item` in `lib/chat/shared.ts` |

---

### Tasks (UAT: D)

| Category | Files |
|---|---|
| **Pages** | `app/tasks/page.tsx` |
| **Components** | `components/ui/priority-badge.tsx` |
| **Lib** | `lib/types.ts` (Task interface — note: TypeScript omits 'review' status that DB allows) |
| **AI tools** | `create_task`, `get_overdue_items` in `lib/chat/shared.ts` |

---

### Checklists (UAT: E)

| Category | Files |
|---|---|
| **Pages** | `app/checklists/page.tsx`, `app/checklists/[id]/page.tsx`, `app/checklists/templates/page.tsx` |
| **Lib** | `lib/types.ts` (ChecklistTemplate, ChecklistInstance, ChecklistItem) |
| **AI tools** | `get_checklists`, `get_checklist_detail`, `create_checklist_instance` in `lib/chat/shared.ts` |

---

### Compliance (UAT: F)

| Category | Files |
|---|---|
| **Pages** | `app/compliance/page.tsx` |
| **Lib** | `lib/types.ts` (ComplianceItem interface) |
| **AI tools** | `get_compliance_items`, `update_item` in `lib/chat/shared.ts` |

---

### Policies (UAT: G)

| Category | Files |
|---|---|
| **Pages** | `app/policies/page.tsx`, `app/policies/[id]/page.tsx`, `app/policies/new/page.tsx` |
| **Lib** | `lib/types.ts` (Policy, PolicyVersion, PolicyAcknowledgement) |
| **AI tools** | `get_policies`, `get_policy_detail` in `lib/chat/shared.ts` |

---

### Registers (UAT: H)

| Category | Files |
|---|---|
| **Pages** | `app/registers/page.tsx`, `app/registers/[id]/page.tsx` |
| **Lib** | `lib/types.ts` (RegisterDefinition, RegisterEntry with JSONB row_data) |
| **AI tools** | `get_registers` in `lib/chat/shared.ts` |

---

### Learning & LMS (UAT: I)

| Category | Files |
|---|---|
| **Pages** | `app/learning/page.tsx`, `app/learning/library/page.tsx`, `app/learning/modules/[id]/page.tsx`, `app/learning/pathways/page.tsx`, `app/learning/pathways/[id]/page.tsx`, `app/learning/pdp/page.tsx`, `app/learning/matrix/page.tsx`, `app/learning/certificates/page.tsx`, `app/training/page.tsx` (legacy) |
| **API routes** | `api/cron/qualifications/route.ts` |
| **Lib** | `lib/types.ts` (LmsModule, LmsEnrollment, LmsSection, QuizQuestion, Pathway, PdpGoal, Certificate, TrainingModule, TrainingAssignment — two systems) |
| **AI tools** | `get_learning_data`, `get_staff_training_status`, `assign_training`, `create_lms_module` in `lib/chat/shared.ts` |

---

### Recruitment & Onboarding (UAT: J / K)

| Category | Files |
|---|---|
| **API routes** | `api/recruitment/candidates/route.ts`, `api/recruitment/positions/route.ts`, `api/recruitment/score/route.ts`, `api/recruitment/disc-results/route.ts`, `api/recruitment/invite/route.ts`, `api/recruitment/onboard/route.ts`, `api/recruitment/apply/[token]/route.ts` |
| **Pages** | `app/candidates/page.tsx`, `app/candidates/[id]/page.tsx`, `app/candidates/positions/page.tsx`, `app/apply/[token]/page.tsx` |
| **Lib** | `lib/types.ts` (Candidate, RecruitmentPosition, DiscProfile) |
| **AI tools** | `create_candidate_invite`, `get_candidates`, `score_candidate`, `create_onboarding_plan`, `generate_interview_questions`, `get_team_profiles` in `lib/chat/shared.ts` |

---

### Programming / Educational Leadership (UAT: L)

| Category | Files |
|---|---|
| **Pages** | `app/programming/page.tsx` |
| **Lib** | `lib/types.ts` (programming-related types) |
| **AI tools** | `generate_document` (EL document types) via specialist EL agent |

---

### Documents + SharePoint (UAT: N)

| Category | Files |
|---|---|
| **API routes** | `api/documents/export/route.ts`, `api/documents/library/route.ts`, `api/documents/cron/sync/route.ts`, `api/documents/resync/route.ts`, `api/sharepoint/auth/route.ts`, `api/sharepoint/callback/route.ts`, `api/sharepoint/files/route.ts`, `api/sharepoint/process/route.ts`, `api/sharepoint/refresh-token/route.ts`, `api/sharepoint/sync/route.ts` |
| **Pages** | `app/documents/page.tsx`, `app/documents/library/page.tsx`, `app/admin/sharepoint/page.tsx` |
| **Lib** | `lib/document-storage.ts`, `lib/document-sync.ts`, `lib/document-templates.ts`, `lib/microsoft-graph.ts` |
| **AI tools** | `get_documents`, `read_document_content`, `generate_document`, `export_document` (stub) in `lib/chat/shared.ts` |

---

### Rostering (UAT: O)

| Category | Files |
|---|---|
| **Pages** | `app/rostering/page.tsx` |
| **Lib** | `lib/types.ts` (Room, Shift, RosterTemplate, LeaveRequest, RatioRule, StaffQualification) |
| **AI tools** | `get_roster_data`, `get_room_data` in `lib/chat/shared.ts` |

---

### OWNA Integration (UAT: P)

| Category | Files |
|---|---|
| **API routes** | `api/owna-proxy/route.ts` |
| **Pages** | `app/owna/staff/page.tsx`, `app/owna/attendance/page.tsx`, `app/owna/children/page.tsx`, `app/owna/families/page.tsx`, `app/owna/enrolments/page.tsx`, `app/owna/health/page.tsx`, `app/admin/owna/page.tsx` |
| **Lib** | `lib/owna.ts` |

---

### Marketing (UAT: Q)

| Category | Files |
|---|---|
| **API routes** | `api/marketing/chat/stream/route.ts`, `api/marketing/accounts/*`, `api/marketing/analytics/route.ts`, `api/marketing/comments/*`, `api/marketing/cron/*` (3 cron routes), `api/marketing/feed/sync/route.ts`, `api/marketing/google/*`, `api/marketing/inbox/*`, `api/marketing/meta/*`, `api/marketing/publish/route.ts`, `api/marketing/webhooks/*` |
| **Pages** | `app/marketing/page.tsx` + 10 sub-pages (content, calendar, reviews, ads, analytics, inbox, comments, feed, settings, chat) |
| **Hooks** | `hooks/useMarketingChatStream.ts` |
| **Lib** | `lib/marketing/chat-config.ts`, `lib/marketing/google-api.ts`, `lib/marketing/meta-api.ts`, `lib/marketing/token-manager.ts`, `lib/marketing/tool-executor.ts`, `lib/marketing/types.ts` |

---

### Activity & Reports (UAT: R)

| Category | Files |
|---|---|
| **API routes** | `api/reports/extract/export/route.ts`, `api/reports/extract/preview/route.ts`, `api/reports/extract/schema/route.ts`, `api/reports/extract/templates/route.ts` |
| **Pages** | `app/activity/page.tsx`, `app/reports/page.tsx`, `app/reports/extract/page.tsx` |
| **Components** | 8 report builder step components in `app/reports/extract/components/` |
| **Lib** | `lib/report-query-builder.ts`, `lib/report-schema.ts`, `lib/report-export.ts`, `lib/report-types.ts` |
| **AI tools** | `get_activity_log` in `lib/chat/shared.ts` |

---

### Admin (UAT: S)

| Category | Files |
|---|---|
| **Pages** | `app/admin/agents/page.tsx`, `app/admin/ai-analytics/page.tsx`, `app/admin/ai-config/page.tsx`, `app/admin/ai-learnings/page.tsx`, `app/admin/ai-prompts/page.tsx`, `app/admin/context/page.tsx`, `app/admin/notifications/page.tsx`, `app/admin/owna/page.tsx`, `app/admin/sharepoint/page.tsx`, `app/admin/tags/page.tsx`, `app/admin/users/page.tsx` |
| **API routes** | `api/admin/agents/test/route.ts`, `api/admin/preview-prompt/route.ts` |
| **Lib** | `lib/ai-config.ts`, `lib/chat/orchestrator.ts` |

---

### AP Dashboard (UAT: T)

| Category | Files |
|---|---|
| **Pages** | `app/ap-dashboard/page.tsx` |
| **Components** | `app/ap-dashboard/PrintButton.tsx`, `app/ap-dashboard/SuggestionReview.tsx` |
| **Lib** | `lib/ap-dashboard-data.ts` |
| **AI tools** | `get_dashboard_summary` (admin-only) in `lib/chat/shared.ts` |

---

### Centre Hub (UAT: U)

| Category | Files |
|---|---|
| **Pages** | `app/hub/page.tsx` |
| **Components** | `components/CentreContextPanel.tsx` |
| **Hooks** | `lib/hooks/useCentreContext.ts` |
| **AI tools** | `search_centre_context` in `lib/chat/shared.ts` |

---

### Help & Resources (UAT: V)

| Category | Files |
|---|---|
| **Pages** | `app/guide/page.tsx`, `app/resources/page.tsx` |

---

### Forms (UAT: W)

| Category | Files |
|---|---|
| **Pages** | `app/forms/page.tsx`, `app/forms/new/page.tsx` |
| **Lib** | `lib/types.ts` (FormSubmission with JSONB data, FormType enum) |
| **AI tools** | `get_forms` in `lib/chat/shared.ts` |

---

### Auth & Shell (UAT: A)

| Category | Files |
|---|---|
| **Config** | `middleware.ts` |
| **Pages** | `app/login/page.tsx`, `app/page.tsx` |
| **Components** | `components/ProtectedLayout.tsx`, `components/Sidebar.tsx`, `components/MobileNav.tsx`, `components/MobileSidebarContent.tsx`, `components/Breadcrumbs.tsx`, `components/Providers.tsx` |
| **Lib** | `lib/ProfileContext.tsx`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts` |

---

## Section 4: Unknowns and Gaps

### 4.1 Pages with Unclear Implementation Status

| Page | Path | UAT | Status |
|---|---|---|---|
| Centre Hub | `app/hub/page.tsx` (171 lines) | U | Exists but content unknown — not toured in Phase 2 |
| User Guide | `app/guide/page.tsx` (605 lines) | V | Exists and substantial — content type unclear (static/dynamic?) |
| Resources | `app/resources/page.tsx` (143 lines) | V | Exists but content unknown |
| Reports Hub | `app/reports/page.tsx` (299 lines) | R | Exists; relationship to `reports/extract/` unclear |
| Marketing sub-pages | `app/marketing/ads/[id]/page.tsx`, `app/marketing/feed/page.tsx` | Q | Listed in CLAUDE.md as needing screenshot tour — implementation status TBD |
| Training (legacy) | `app/training/page.tsx` (281 lines) | I | Legacy system pre-LMS; relationship to LMS modules unclear |
| Programming | `app/programming/page.tsx` (446 lines) | L | Not toured in Phase 2 |
| Recruitment | `app/candidates/page.tsx`, `app/candidates/positions/page.tsx` | J | Not toured in Phase 2 |

---

### 4.2 API Routes with No Corresponding Client Page

| Route | Concern |
|---|---|
| `api/documents/test-write-path/route.ts` | Debug endpoint — should not be in production; no page consumes it |
| `api/public/brand/route.ts` | Only consumed by apply form — single use |
| `api/cron/qualifications/route.ts` | Cron-only — needs a cron trigger (Vercel cron or external); no admin page to manually trigger |
| `api/documents/resync/route.ts` | Admin action with no corresponding button visible in SharePoint admin page |
| `api/marketing/webhooks/google/route.ts` | Webhook receiver — no UI; requires Google webhook registration to be useful |
| `api/marketing/webhooks/meta/route.ts` | Webhook receiver — no UI; requires Meta webhook registration |

---

### 4.3 Features Known Broken or Stub

| Feature | File(s) | Issue |
|---|---|---|
| `export_document` AI tool | `lib/chat/shared.ts` ~line 1750 | Documented stub — returns UI guidance text, never actually exports |
| SharePoint PDF extraction | `api/sharepoint/sync/route.ts`, `api/sharepoint/process/route.ts` | Fixed in uplift (pdf-parse) but untested against real PDFs |
| Excel extraction | `api/sharepoint/process/route.ts` | `exceljs` in package.json but never wired for sync — returns placeholder |
| Qualification expiry cron | `api/cron/qualifications/route.ts` | Added in uplift; needs Vercel cron config to fire automatically |
| Policy review reminder emails | `app/policies/[id]/page.tsx` | "Send Reminder" toast fires but no email integration |
| Certificate PDF generation | `app/learning/certificates/page.tsx` | Requires SUPABASE_SERVICE_ROLE_KEY (not set) |

---

### 4.4 Missing Implementation (Nav Present, Page Minimal or Missing)

Based on sidebar nav items and UAT plan references:

| Nav Item | UAT | Status |
|---|---|---|
| Programming | L | Page exists (446 lines) but never toured — content and completeness unknown |
| Recruitment | J | Pages exist but not toured or tested |
| AP Dashboard | T | Exists but multi-centre logic untested (only one centre in DB) |
| Centre Hub | U | Page exists (171 lines) — content unknown |
| Marketing (most sub-pages) | Q | All pages exist but require OAuth credentials to function (not configured) |
| OWNA (all pages) | P | All pages exist but return 500 without OWNA_API_KEY |

---

### 4.5 Two Competing Training Systems

The codebase has two separate, unconnected training systems:

| System | Tables | Pages | Files |
|---|---|---|---|
| **Legacy (simple)** | `training_modules`, `training_assignments` | `app/training/page.tsx` | `lib/types.ts` (TrainingModule, TrainingAssignment) |
| **LMS (full)** | `lms_modules`, `lms_enrollments`, `lms_sections`, etc. | `app/learning/**` (8 pages) | `lib/types.ts` (LmsModule, LmsEnrollment, etc.) |

The AI tools (`assign_training`, `get_staff_training_status`) reference both systems. The legacy system should be retired but currently still has a live page.

---

### 4.6 Largest Files (Rebuild Risk)

Files > 800 lines that will need careful decomposition in the rebuild:

| File | Lines | Concern |
|---|---|---|
| `lib/chat/shared.ts` | 2245 | Single file holds 32 tools + executeTool switch + all system prompt builders — God file |
| `lib/document-templates.ts` | 1248 | All PDF/DOCX generation in one file |
| `lib/report-schema.ts` | 1154 | All report schema definitions |
| `lib/types.ts` | 1106 | All domain types — correct to centralise but large |
| `app/learning/modules/[id]/page.tsx` | 1397 | Module player: sections, quiz, reflections all in one component |
| `app/learning/pdp/page.tsx` | 1258 | Full PDP management in one component |
| `app/admin/sharepoint/page.tsx` | 1126 | SharePoint admin: sync, browse, credentials, history |
| `app/admin/agents/page.tsx` | 1062 | AI agent CRUD + test runner in one component |
| `app/chat/page.tsx` | 1049 | Full chat UI with streaming, pending actions, conversation list |
| `lib/marketing/tool-executor.ts` | 514 | Marketing tool dispatcher — mirrors lib/chat/shared.ts for marketing |
| `lib/report-query-builder.ts` | 471 | Dynamic query builder |
| `lib/marketing/meta-api.ts` | 470 | Meta API wrapper |

---

*End of map. Total src/ files: ~412. Total estimated lines: ~47,500.*
