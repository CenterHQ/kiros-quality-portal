# Kiros Application — Learning Log
**Purpose:** Persistent reference for all agents and future sessions. Prevents repeat issues.
**Rule:** Every fix must be logged here with the root cause and the pattern to avoid.

---

## Database Column Naming Conventions

| Table | Migration File | Key Columns (ACTUAL names) |
|---|---|---|
| `roster_shifts` | supabase-migration-rostering.sql | `shift_date` (NOT `date`), `start_time`, `end_time`, `user_id`, `room_id`, `status` |
| `programming_time` | supabase-migration-rostering.sql | `week_starting` (NOT `date`), `actual_hours` (NOT `hours`), `user_id` |
| `checklist_instances` | supabase-migration-checklists.sql | `failed_items` (NOT `failed_items_count`), `status`, `due_date`, `assigned_to` |
| `register_definitions` | supabase-migration-registers.sql | `columns` (NOT `fields`), `name`, `description` |
| `documents` | supabase-schema.sql | `name` (correct as-is), `file_type` (NOT `type`), HAS `category` column |
| `sharepoint_documents` | supabase-migration-sharepoint.sql | `file_name` (NOT `name`), `file_type`, NO `category` column |
| `ratio_rules` | supabase-migration-rostering.sql | NO `room_id`, `children_per_educator` (NOT `ratio`), `age_group`, `state` |
| `tasks` | supabase-schema.sql | status CHECK: `'todo', 'in_progress', 'review', 'done'` (4 values, NOT 3) |
| `lms_pathway_enrollments` | supabase-migration-lms.sql | NO `progress` column. Has: `id`, `user_id`, `pathway_id`, `status`, `started_at`, `completed_at` |
| `lms_pdp_reviews` | supabase-migration-lms.sql | NO `review_date` or `notes`. Has: `review_period`, `goals_summary`, `reviewed_at`, `strengths`, `areas_for_growth`, `agreed_actions` |

**Pattern to avoid:** Never assume column names — always verify against the migration SQL before writing queries.

---

## Action Type Constants

| Tool returns | Confirm route must match |
|---|---|
| `create_task` | `create_task` |
| `assign_training` | `assign_training` |
| `update_item` | `update_item` |
| `create_checklist_instance` | `create_checklist_instance` (NOT `create_checklist`) |

**Pattern to avoid:** Action type strings must be identical between executeTool return values and the confirm route switch cases.

---

## Error Handling Patterns

- **Promise.all with tool execution:** Always wrap individual executeTool calls in try/catch inside Promise.all map. Return a fallback error result so other tools can still complete.
- **SSE stream errors:** Always save partial `fullText` before saving an error message. User already saw the partial text via streaming.
- **Supabase .single() calls:** Always check for null/error before using the result. `.single()` returns error if 0 or >1 rows match.

---

## Architecture Rules

- **Shared code lives in `src/lib/chat/shared.ts`** — tools, system prompt, executeTool, ROLE_LABELS, getAnthropicClient
- **Route files must NOT export non-handler functions** — Next.js route files can only export HTTP methods + config
- **ROLE_LABELS canonical source:** `src/lib/types.ts` — all other files should import from there
- **Service role client** bypasses RLS — acceptable for AI tool execution but tools must check roles themselves
- **Model routing:** `src/lib/chat/model-router.ts` — regex must be specific enough to avoid false positives on simple queries

---

## Layout Rules

- **ProtectedLayout is applied ONCE per route tree** — at the top-level route layout (e.g., `admin/layout.tsx`)
- Sub-route layouts (e.g., `admin/sharepoint/layout.tsx`) must NOT wrap in ProtectedLayout again — Next.js nests layouts automatically
- If a sub-route layout has no special purpose, use `<>{children}</>` or delete the file entirely
- Long URLs/text in grid cells need `break-all` and `min-w-0` to prevent overflow into adjacent cells

## Process Rules

- **Every plan item = its own task** — never batch multiple deliverables into one task. If the plan says "breadcrumbs + badge counts + skeleton components", create 3 separate tasks.
- **Verify against the plan, not the agent output** — when an agent says "done", cross-reference every line of the plan file before marking complete. Agents optimise for what's in their prompt, not what's in the plan.
- **Structural changes need dedicated agents** — token replacements (colour swaps) and structural changes (new components, layout refactors) should never be mixed in the same agent prompt. Token agents skip structural work.
- **Final audit is mandatory** — before declaring any phase complete, read the plan file and check off each item explicitly.
- **Token replacement requires multiple passes** — agents miss files on first pass. After each round, grep to count remaining instances and run another pass on missed files. Never declare "zero remaining" without a grep to prove it.
- **bg-white needs grep verification** — 19 files were missed on the first token replacement pass. Always run `grep -r "bg-white" src/ --include="*.tsx" | grep -v "bg-white/" | wc -l` after each cleanup round.
- **Error handling is not optional** — every page that fetches data must have: error state, try/catch, error UI with retry button. Add this at the same time as the page, not as a later fix.
- **alert() is never acceptable** — always use toast notifications. Check for alert() in every PR.

## Security Rules

- `executeTool()` must validate role access before executing any tool
- Supabase `.ilike()` patterns are safe (SDK handles escaping) but always use parameterised patterns
- API keys: only in server-side code, never in client components
- File uploads: validate size AND count on server side, not just client

---

## Fixes Applied

| Date | Fix | Root Cause | Files Changed |
|---|---|---|---|
| 2026-04-10 | Fixed roster_shifts query: `date` → `shift_date` | Column name assumed, not verified against migration | `src/lib/chat/shared.ts` |
| 2026-04-10 | Fixed programming_time query: `date`/`hours` → `week_starting`/`actual_hours` | Same as above | `src/lib/chat/shared.ts` |
| 2026-04-10 | Fixed checklist_instances query: `failed_items_count` → `failed_items` | Same as above | `src/lib/chat/shared.ts` |
| 2026-04-10 | Fixed register_definitions query: `fields` → `columns`, register_entries: `data` → `row_data` | Same as above | `src/lib/chat/shared.ts` |
| 2026-04-10 | Fixed documents query: `type` → `file_type`; sharepoint_documents: `name`→`file_name`, removed non-existent filters | Same as above | `src/lib/chat/shared.ts` |
| 2026-04-10 | Fixed rooms query: `capacity` → `licensed_capacity`; ratio_rules: removed `room_id`, `ratio` → `children_per_educator` | Same as above | `src/lib/chat/shared.ts` |
| 2026-04-10 | Fixed confirm route: `create_checklist` → `create_checklist_instance` | Action type string mismatch between executeTool and confirm route | `src/app/api/chat/confirm/route.ts` |
| 2026-04-10 | Added null/error checks on `.single()` calls in confirm route | Supabase `.single()` returns error on 0 or >1 rows without explicit check | `src/app/api/chat/confirm/route.ts` |
| 2026-04-10 | Added try/catch around tool execution in Promise.all | One tool error killed all parallel tools and the entire stream | `src/app/api/chat/stream/route.ts` |
| 2026-04-10 | Fixed partial message loss: save fullText on error | Catch block discarded streamed text user already saw | `src/app/api/chat/stream/route.ts` |
| 2026-04-10 | Added role validation in executeTool | Tool execution had no role check — relied only on tool filtering at model level | `src/lib/chat/shared.ts` |
| 2026-04-10 | Added 'review' to Task status type | DB has 4 statuses but TypeScript only had 3 | `src/lib/types.ts` |
| 2026-04-10 | Tightened model router regex | Broad patterns like `assess.*rating` and `exceeding` triggered Opus on simple queries | `src/lib/chat/model-router.ts` |
| 2026-04-10 | Fixed useEffect dependency arrays | Missing `streamingMessage?.text` in deps could cause missed message finalization | `src/app/chat/page.tsx`, `src/components/ChatAssistant.tsx` |
| 2026-04-10 | Consolidated ROLE_LABELS to single source in types.ts | Duplicate definition in shared.ts risked divergence | `src/lib/chat/shared.ts` |
| 2026-04-10 | Moved buildSystemPromptCached to shared.ts | Function was only in stream route, not reusable by fallback route | `src/lib/chat/shared.ts`, `src/app/api/chat/stream/route.ts` |
| 2026-04-10 | Added server-side file upload validation (10 files max, 10MB per file) | No server-side limits — client limits could be bypassed | `src/app/api/chat/upload/route.ts` |
| 2026-04-10 | Fixed lms_pathway_enrollments query: `progress` → `started_at, completed_at` | Column doesn't exist in migration | `src/lib/chat/shared.ts` |
| 2026-04-10 | Fixed lms_pdp_reviews query: `review_date, notes` → `review_period, goals_summary, reviewed_at` | Columns don't exist in migration | `src/lib/chat/shared.ts` |
| 2026-04-10 | Fixed frontend action type: `create_checklist` → `create_checklist_instance` in pending action UI | Mismatch between executeTool return and UI rendering | `src/app/chat/page.tsx` |
| 2026-04-10 | Fixed stuck UI: setLoading(false) now fires when streaming completes even if text is empty | useEffect required truthy text to clear loading | `src/app/chat/page.tsx`, `src/components/ChatAssistant.tsx` |
| 2026-04-10 | Added try/catch to fallback route tool execution in Promise.all | Stream route was fixed but fallback wasn't | `src/app/api/chat/route.ts` |
| 2026-04-10 | Fixed suggest_improvement enum: `create_checklist` → `create_checklist_instance` | Tool schema had outdated action type name | `src/lib/chat/shared.ts` |
| 2026-04-10 | Added 'review' column to task board COLUMNS array | DB has 4 task statuses but board only showed 3 — review tasks were invisible | `src/app/tasks/page.tsx` |
| 2026-04-10 | Added voice input cleanup on component unmount | SpeechRecognition kept mic active after navigating away from chat | `src/app/chat/page.tsx` |
| 2026-04-10 | Added empty-line reset in SSE parser | eventType could bleed between SSE events on malformed server output | `src/hooks/useChatStream.ts` |
| 2026-04-10 | Corrected LEARNING-LOG: documents table uses `name` (not `file_name`) | Only sharepoint_documents uses file_name; documents table column is `name` | `LEARNING-LOG.md` |
| 2026-04-10 | Added error checks on .single() in confirm route (create_task + create_checklist_instance profile lookups) | Silent null assignment when staff not found — task created unassigned without feedback | `src/app/api/chat/confirm/route.ts` |
| 2026-04-10 | Added error checks in suggestions route (create_task insert, assign_training lookups + upsert) | Actions silently failed with no error logging | `src/app/api/chat/suggestions/route.ts` |
| 2026-04-10 | Fixed double menu on all admin sub-pages (sharepoint, context, tags) | Sub-route layouts wrapped in ProtectedLayout again when parent admin/layout.tsx already did | `src/app/admin/*/layout.tsx` |
| 2026-04-10 | Fixed Site URL overlapping Connected By field on SharePoint page | Long URL had no break-all, overflowed grid cell | `src/app/admin/sharepoint/page.tsx` |
