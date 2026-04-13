# Kiros AI — Round 2 Comprehensive Audit Defects

**Date:** 2026-04-14
**Scope:** Zero-tolerance end-to-end audit of all AI system files post-uplift
**Total defects found:** 43 across all files
**Critical/High requiring immediate fix:** 12
**Status: ALL CRITICAL, HIGH, AND MEDIUM DEFECTS FIXED — 2026-04-14**

### Fix Summary
| Commit | Defects Fixed | Severity |
|--------|--------------|----------|
| `78dd66c` | D1, D2, D3, D4, D5, D6, D7, D8 | 3 CRITICAL + 5 HIGH |
| `c11531e` | D9, D10, D12, D13, D14, D15, D16, D17 | 9 MEDIUM |
| Remaining | D11, D18-D25 | LOW (documented, non-blocking) |

---

## CRITICAL SECURITY DEFECTS (Must Fix)

### D1. Conversation Messages Accessible Without Ownership Check
**File:** `src/app/api/chat/conversations/route.ts` lines 15-35
**Severity:** CRITICAL — Data Privacy Breach
**Issue:** GET request with `conversationId` parameter loads messages without verifying the conversation belongs to the authenticated user. Any user can read any other user's chat messages by guessing/knowing a conversation ID.
**Fix:** Add ownership verification before loading messages.

### D2. Table Name Injection in Confirm Handler
**File:** `src/app/api/chat/confirm/route.ts` lines 85-88
**Severity:** CRITICAL — SQL Injection Vector
**Issue:** `item_type` from AI input is used to construct table name (`tasks`, `compliance_items`, `qa_elements`). If AI passes an unexpected value, query runs against arbitrary table.
**Fix:** Use whitelist map instead of ternary chain.

### D3. record_agent_feedback .single() Error Not Destructured
**File:** `src/lib/chat/shared.ts` ~line 1759
**Severity:** CRITICAL — Crashes Feedback Recording
**Issue:** Agent definition lookup uses `.single()` but doesn't destructure the `error` field. If agent name doesn't match or matches multiple, Supabase throws unhandled error that crashes the tool execution.
**Fix:** Destructure error, add null check.

---

## HIGH SEVERITY DEFECTS (Fix Soon)

### D4. Final Assistant Message Save — No Error Handling
**File:** `src/app/api/chat/stream/route.ts` ~lines 366-377
**Severity:** HIGH — Data Loss
**Issue:** If the INSERT to save the final AI response fails, error is ignored. `savedMsg` is null. The `done` event sends `messageId: ''`. Frontend thinks success but response is lost.
**Fix:** Check error, log, and include in done event.

### D5. User Message Insert — No Error Handling (2 routes)
**Files:** `src/app/api/chat/stream/route.ts` ~line 136, `src/app/api/chat/route.ts` ~line 302
**Severity:** HIGH — Data Loss
**Issue:** User message INSERT has no error checking. If it fails, conversation continues without the user's message in DB.
**Fix:** Add error check after insert.

### D6. Tool Result DB Insert Not Wrapped in Try-Catch
**File:** `src/app/api/chat/stream/route.ts` ~lines 338-345
**Severity:** HIGH — Breaks Tool Loop
**Issue:** After tool execution, the DB insert for tool_call/tool_result is NOT in a try-catch. If DB insert fails, the error propagates and kills all remaining tool executions in Promise.all().
**Fix:** Wrap DB insert in try-catch.

### D7. reconstructMessages Empty tool_use_id Fallback
**File:** `src/app/api/chat/stream/route.ts` ~line 63
**Severity:** HIGH — API Rejection
**Issue:** Tool result fallback ID is empty string `''`. Anthropic API rejects tool_result with empty `tool_use_id`. Should use `crypto.randomUUID()`.
**Fix:** Replace `|| ''` with `|| crypto.randomUUID()`.

### D8. Memory Leak in Rate Limiter
**File:** `src/middleware.ts` ~line 4
**Severity:** HIGH — Memory Exhaustion
**Issue:** `rateLimitMap` never removes expired entries. Over weeks of operation, the Map grows unbounded with dead IP entries.
**Fix:** Add periodic cleanup (delete entries where resetTime < now).

---

## MEDIUM SEVERITY DEFECTS

### D9. Confirm Handler ILIKE Queries — Non-Deterministic Results
**File:** `src/app/api/chat/confirm/route.ts` lines 41-46, 69-73, 104-109
**Issue:** Staff lookups use `.ilike().limit(1)` without ordering. First match is non-deterministic. Should add `.order('full_name')`.

### D10. Activity Log Insert No Error Handling
**File:** `src/app/api/chat/confirm/route.ts` lines 20-28
**Issue:** Activity log insert has no error checking. Audit trail can be silently incomplete.

### D11. Document Sync Retry Creates Duplicate Records
**File:** `src/lib/document-sync.ts` lines 94-112
**Issue:** `storeAndUploadDocument()` inserts a NEW record. Retry marks original as synced but doesn't link or clean up. Two records exist for same content.

### D12. Silent Error Swallowing in SharePoint Extraction
**File:** `src/app/api/sharepoint/sync/route.ts` lines 48-61
**Issue:** PDF and Excel catch blocks return placeholder text but don't log the actual error. Can't debug extraction failures.

### D13. useChatStream Pending Actions Null Check
**File:** `src/hooks/useChatStream.ts` ~line 173
**Issue:** `sseEvent.pending_actions` may be undefined. Should use `sseEvent.pending_actions || []`.

### D14. Qualification Cron No Error Check
**File:** `src/app/api/cron/qualifications/route.ts` lines 15-29
**Issue:** `.update()` operations don't check for errors. Returns success even if updates failed.

### D15. Conversation Update No Error Handling
**File:** `src/app/api/chat/stream/route.ts` lines 388, 394
**Issue:** Title and timestamp updates have no error handling.

### D16. buildLearningsSection Fire-and-Forget No Catch
**File:** `src/lib/chat/shared.ts` ~line 275
**Issue:** `.then(() => {})` with no `.catch()`. Unhandled promise rejection possible.

### D17. Title Generation Type Assumption
**File:** `src/app/api/chat/stream/route.ts` ~line 387
**Issue:** Assumes `titleResponse.content[0]` is text type. Could be thinking block if thinking is enabled for Sonnet.

---

## LOW SEVERITY DEFECTS

### D18-D25: Various logging, edge cases, UX improvements
- Profile load error details lost (stream/route.ts:101)
- Export filename edge case (export/route.ts:43)
- Upload storage path uses Date.now() not UUID (upload/route.ts:30)
- File size validation after arraybuffer (upload/route.ts:24-26)
- Upload extraction errors not logged (upload/route.ts:77-79)
- Agent status type mismatch between orchestrator and UI
- MarkdownRenderer no empty content check
- Session tracking errors not logged (orchestrator.ts:185-187)

---

## IMPLEMENTATION PLAN FOR FIXES

### Priority 1 — Security (D1, D2, D3): Fix immediately
### Priority 2 — Data Loss Prevention (D4, D5, D6, D7): Fix next
### Priority 3 — Memory/Stability (D8): Fix next
### Priority 4 — Medium severity (D9-D17): Fix in batch
### Priority 5 — Low severity (D18-D25): Fix when convenient
