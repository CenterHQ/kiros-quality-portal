# Seeded Flows — Category D Tests

These tests exercise deep user flows that require pre-existing fixture data.
They **skip by default** and unlock via environment variables.

## Why skipped by default?

CI against a clean deploy shouldn't fail just because there's no candidate
in 'approved' state. These tests are for **targeted UAT runs** where the
tester has staged data, or for environments with seeded fixtures.

## Env var reference

| Variable | Enables | How to get the value |
|---|---|---|
| `TEST_CANDIDATE_TOKEN` | `questionnaire.spec.ts` (10 tests) | Create a candidate invite in `/candidates`, copy the token from the `/apply/<TOKEN>` URL |
| `TEST_MODULE_ID` | `learning-module.spec.ts` (6 tests) | `/learning/library`, click a module, copy ID from URL |
| `TEST_APPROVED_CANDIDATE` | `candidate-pipeline.spec.ts` C1-C3 | A candidate.id where status='approved' |
| `TEST_COMPLETED_CANDIDATE` | `candidate-pipeline.spec.ts` C4-C7 | A candidate who submitted questionnaire |
| `TEST_REJECTABLE_CANDIDATE` | `candidate-pipeline.spec.ts` C8 | Candidate in reviewable state |
| `TEST_DRAFT_POLICY_ID` | `policy-lifecycle.spec.ts` P1-P3 | policies.id where status='draft' |
| `TEST_PUBLISHED_POLICY_ID` | `policy-lifecycle.spec.ts` P4-P6 | Published policy |
| `TEST_DOCUMENT_ID` | `documents.spec.ts` DOC1-DOC3 | Any existing document ID |
| `TEST_GENERATED_DOC_ID` | `documents.spec.ts` DOC4-DOC5 | AI-generated doc |
| `TEST_MARKETING_POST_ID` | `marketing.spec.ts` MKT1-MKT2 | Marketing post ID |
| `TEST_MARKETING_REVIEW_ID` | `marketing.spec.ts` MKT4 | Review requiring response |
| `TEST_ROSTERED_DATE` | `rostering.spec.ts` R1-R3 | yyyy-mm-dd with shifts assigned |
| `TEST_USER_ID` | `admin-flows.spec.ts` U1-U2 | Profile id |
| `TEST_AGENT_NAME` | `admin-flows.spec.ts` AG1 | Agent display name (defaults 'QA1 Agent') |
| `TEST_LEARNING_ID` | `admin-flows.spec.ts` L1-L2 | ai_learnings.id |
| `TEST_EXISTING_CONVERSATION_ID` | `chat-tools.spec.ts` CH6 | Chat conversation id with history |

## Flag variables (gate entire feature groups)

| Variable | Value | Unlocks |
|---|---|---|
| `RUN_CHAT_TOOLS` | `1` | Chat tool-use and agent delegation tests (CH1-CH5) — slow, 60s timeouts |
| `RUN_AGENT_TEST` | `1` | Agent test-runner mutation tests |
| `RUN_ROSTER_FLOW` | `1` | Add Shift modal interaction |
| `RUN_MARKETING_CREATE` | `1` | Create-content editor flow |
| `RUN_ADMIN_MUTATIONS` | `1` | Config-save flow (safe, restores values) |

## Running

```powershell
# All seeded tests with full env
$env:TEST_CANDIDATE_TOKEN="abc123..."
$env:TEST_MODULE_ID="mod-uuid"
$env:RUN_CHAT_TOOLS="1"
npx playwright test seeded/

# Just one area
$env:TEST_CANDIDATE_TOKEN="abc123..."
npx playwright test seeded/questionnaire
```

## Creating seed data via UI

The suite deliberately avoids direct DB access — so to create fixtures,
use the UI:

1. **Candidate token:** `/candidates` → Invite Candidate → copy `/apply/<TOKEN>`
2. **Approved candidate:** Create candidate → complete questionnaire (use D-Seed.Q6 test flow or manual) → detail page → Approve
3. **Draft policy:** `/policies/new` → Save as draft
4. **Published policy:** Create → Submit for Review → Publish
5. **Module ID:** `/learning/library` → click a module, URL shows ID
6. **Marketing post:** `/marketing/content` → New Content → save as draft

## Contract

Every seeded test asserts only on user-visible UI. Env vars point to data —
they are not used to inject state, only to locate fixtures already created
via the UI. This keeps the suite pure UAT.
