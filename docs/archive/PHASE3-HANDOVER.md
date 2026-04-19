# Phase 3 Handover — Codebase Cartography

**Project:** /Users/davidcruwys/dev/clients/kiros/kiros-quality-portal  
**Session goal:** Produce `docs/CODEBASE-MAP.md` — a structured inventory of every source file, categorised by layer, with purpose and UAT cross-reference. Breadth-first, not depth. No code changes.

---

## Context: Where We Are

This is a Next.js 14 + Supabase quality management portal for Kiro's Early Education Centre (Blackett, NSW). The system is being mapped prior to a full rebuild. Two prior sessions have run:

- **Phase 1 (previous session):** System comprehension — `CONTEXT.md` written at project root
- **Phase 2 (this session):** Discovery — `docs/archive/DISCOVERY.md` written; all root-level docs + SQL migrations archived to `docs/archive/`

**Read these two files before doing anything else:**
- `CONTEXT.md` — system comprehension (purpose, abstractions, roles, design decisions)
- `docs/archive/DISCOVERY.md` — synthesised findings (defects, workflow gaps, what not to carry forward, rebuild priorities)

---

## The Three Hierarchies to Map

### 1. Server — API Routes (`src/app/api/**`)
Route handlers contain embedded business logic: validation rules, role checks, data transformation, side effects. Each route file is a de-facto specification for what the API does.

Key areas:
- `src/app/api/chat/` — stream, route (fallback), confirm, conversations, suggestions, upload, export
- `src/app/api/admin/` — agents, ai-config, ai-prompts, users
- `src/app/api/cron/` — qualification expiry, document sync
- `src/app/api/documents/` — export, cron/sync
- `src/app/api/marketing/` — chat stream, content
- `src/app/api/owna-proxy/` — read-only OWNA passthrough
- `src/app/api/recruitment/` — scoring, onboarding
- `src/app/api/reports/` — report generation
- `src/app/api/sharepoint/` — sync, process, auth, callback, files

### 2. Client — Pages + Components + Hooks
Pages are `src/app/**/page.tsx`. Components in `src/components/`. Hooks in `src/hooks/`.

Key page groups:
- `src/app/admin/**` — admin panel (agents, ai-config, ai-prompts, ai-learnings, ai-analytics, context, notifications, owna, sharepoint, tags, users)
- `src/app/candidates/**` — recruitment pipeline + positions
- `src/app/chat/` — AI chat UI
- `src/app/checklists/**` — templates + instances
- `src/app/compliance/` — regulatory items
- `src/app/dashboard/` — home
- `src/app/documents/**` — library + detail
- `src/app/elements/**` — NQS elements + detail
- `src/app/forms/**` — digital forms
- `src/app/learning/**` — hub, library, modules, pathways, pdp, matrix, certificates
- `src/app/marketing/**` — hub, content, calendar, reviews, ads, analytics, inbox, comments, settings
- `src/app/owna/**` — staff, attendance, children, families, enrolments, health
- `src/app/policies/**` — library, new, detail
- `src/app/programming/` — EL hub
- `src/app/registers/**` — daily registers + detail
- `src/app/reports/**` — reports + extract
- `src/app/rostering/` — shift scheduling
- `src/app/tasks/` — kanban + list
- `src/app/apply/**` — public recruitment questionnaire (unauthenticated)

### 3. Shared — `src/lib/**`
- `src/lib/chat/shared.ts` — 27+ AI tools, system prompt builder, executeTool, QUALITY_PROTOCOL, LEARNING_PROTOCOL
- `src/lib/chat/model-router.ts` — Sonnet vs Opus routing logic
- `src/lib/chat/orchestrator.ts` — multi-agent delegation
- `src/lib/chat/sse-protocol.ts` — SSE event type definitions
- `src/lib/types.ts` — all TypeScript types (business logic embedded in enums and unions)
- `src/lib/document-storage.ts` — AI doc save + SharePoint queue
- `src/lib/document-sync.ts` — SharePoint retry logic
- `src/lib/supabase*.ts` — client factory files

---

## What to Produce

### `docs/CODEBASE-MAP.md`

A structured inventory with these sections:

**Section 1: File Inventory**  
For every file under `src/`:

```
| Layer | Path | Purpose (1 line) | ~Lines | UAT Section |
```

Layers: `server-api` | `client-page` | `client-component` | `client-hook` | `shared-lib` | `config`

UAT sections (from `tests/e2e/UAT-PLAN.md`):
- A: Auth & Shell
- B: Dashboard
- C: QA Elements
- D: Tasks
- E: Checklists
- F: Compliance
- G: Policies
- H: Registers
- I: Learning & Development
- J: Recruitment & Onboarding
- K: Public Questionnaire
- L: Programming
- M: AI Chat
- N: Documents
- O: Rostering
- P: OWNA
- Q: Marketing
- R: Activity & Reports
- S: Admin
- T: AP Dashboard
- U: Centre Hub
- V: Help & Resources
- W: Forms
- X: Cross-cutting (smoke, a11y, mobile, regression)

**Section 2: Surface Pattern Flags**  
Second pass — grep-based, not manual review. Flag files that match these patterns:

| Pattern | Why it matters |
|---|---|
| `alert(` | Must be toast — no alert() allowed |
| `USING (true)` | Permissive RLS — may need role restriction |
| `new Anthropic(` | Should use shared getAnthropicClient() factory |
| `bg-white` in TSX | Should be bg-card (design token) |
| `hardcoded string that looks like an API key` | Security |
| `TODO` or `FIXME` | Deferred work |
| Missing `try/catch` around `supabase.from(` in write operations | Silent failure risk |
| `console.log(` | Debug leftovers |

**Section 3: Feature → File Matrix**  
A reverse index: for each major feature, which files implement it.

| Feature | API routes | Pages | Components | Lib |
|---|---|---|---|---|
| AI Chat | ... | ... | ... | ... |
| Recruitment | ... | ... | ... | ... |
| LMS | ... | ... | ... | ... |
| (etc.) | | | | |

**Section 4: Unknowns and Gaps**  
Files that exist in nav/sidebar (per UAT plan) but whose implementation status is unclear. Files in `src/app/` with minimal content. Routes in `src/app/api/` with no corresponding page.

---

## How to Run This Session

1. Read `CONTEXT.md` and `docs/archive/DISCOVERY.md` first (5-10 min context load)
2. Use `Glob` to get the full file list: `src/**/*.{ts,tsx}` sorted by path
3. For each directory group, use `Read` on key files to extract purpose + line count
4. Run grep passes for the surface pattern flags
5. Write `docs/CODEBASE-MAP.md` incrementally as you go (write each section when ready, don't hold it all in memory)

**Use Explore or abridge subagents** for the grep/glob sweeps to protect main context. Do NOT load `shared.ts` in full into main context — it's very large. Use `abridge` to summarise it.

---

## Known Large Files (Handle Carefully)

- `src/lib/chat/shared.ts` — ~1800+ lines, central file, contains all AI tools + system prompt
- `src/app/admin/agents/page.tsx` — large admin CRUD page
- `src/app/chat/page.tsx` — full chat UI with streaming logic
- `src/app/candidates/[id]/page.tsx` — 6-tab candidate detail

Use `Read` with `limit` and `offset` on these, or delegate to abridge agent.

---

## What This Session Does NOT Do

- Does not write any code
- Does not fix any issues
- Does not do a deep code review (that is Phase 4, using this map as a guide)
- Does not run the dev server or tests
- Does not read the archived SQL migrations (already synthesised in DISCOVERY.md)

---

## Output Location

`docs/CODEBASE-MAP.md` — written to the project, committed at session end if complete.
