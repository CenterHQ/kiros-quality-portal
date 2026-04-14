# Recruitment System — Comprehensive Testing Checklist

## PRE-REQUISITES

Before testing, run these SQL files in Supabase SQL Editor (in order):

1. **`supabase-migration-recruitment.sql`** — Creates 4 tables + seeds 60 questions + induction checklist + config keys + tool permissions
2. **`supabase-new-agents.sql`** — Creates 3 new agent definitions

### Verify SQL ran correctly:
```sql
-- Check tables exist
SELECT 'recruitment_positions' as tbl, COUNT(*) FROM recruitment_positions
UNION ALL SELECT 'recruitment_candidates', COUNT(*) FROM recruitment_candidates
UNION ALL SELECT 'recruitment_question_templates', COUNT(*) FROM recruitment_question_templates
UNION ALL SELECT 'staff_disc_profiles', COUNT(*) FROM staff_disc_profiles;
-- Expected: 4 rows, all with count 0 (except question_templates which should have 60)

-- Check question templates
SELECT category, COUNT(*) FROM recruitment_question_templates GROUP BY category;
-- Expected: knowledge=30, disc=20, personality=10

-- Check agents
SELECT name, priority, array_length(available_tools, 1) as tools FROM ai_agent_definitions WHERE name IN ('Recruitment Agent', 'Educational Leadership Agent', 'Learning Module Agent');
-- Expected: 3 rows with 13, 14, 11 tools respectively

-- Check config keys
SELECT config_key FROM ai_config WHERE category = 'recruitment';
-- Expected: 4 keys (score weights + time limit)

-- Check tool permissions
SELECT tool_name FROM ai_tool_permissions WHERE tool_name IN ('create_candidate_invite', 'get_candidates', 'score_candidate', 'create_onboarding_plan', 'generate_interview_questions', 'create_lms_module', 'get_team_profiles');
-- Expected: 7 rows

-- Check induction checklist
SELECT name FROM checklist_templates WHERE name = 'Staff Induction Checklist';
-- Expected: 1 row
```

---

## TEST GROUP 1: Sidebar & Navigation

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 1.1 | Recruitment section visible to admin | Login as admin → check sidebar | "Recruitment" section with Candidates + Positions links | |
| 1.2 | Recruitment section visible to manager | Login as manager → check sidebar | Same links visible | |
| 1.3 | Recruitment section visible to NS | Login as NS → check sidebar | Same links visible | |
| 1.4 | Recruitment hidden from educator | Login as educator → check sidebar | No "Recruitment" section | |
| 1.5 | Recruitment hidden from EL | Login as EL → check sidebar | No "Recruitment" section | |

---

## TEST GROUP 2: Position Management

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 2.1 | Create position | /candidates → "Create Position" → fill form → save | Position appears in DB and in positions list | |
| 2.2 | Position status | Create position → check status is "draft" | Status badge shows "Draft" | |
| 2.3 | Edit position | /candidates/positions → click edit → change title → save | Title updated | |
| 2.4 | Close position | /candidates/positions → click "Close" | Status changes to "closed" | |
| 2.5 | Position with role | Create position with role "educator" | Role stored correctly | |
| 2.6 | Position with room | Create position with room "Toddlers" | Room stored correctly | |

---

## TEST GROUP 3: Candidate Invite

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 3.1 | Create invite | /candidates → "Invite Candidate" → fill form → submit | Candidate record created, invite URL shown | |
| 3.2 | Copy link | Click "Copy" on invite URL | URL copied to clipboard | |
| 3.3 | Invite with referrer | Fill in referring staff member name | referred_by populated in DB | |
| 3.4 | Multiple invites same position | Create 2 invites for same position | Both candidates have different access tokens | |
| 3.5 | Candidate appears in list | After creating invite | Card shows in "Invited" tab | |

---

## TEST GROUP 4: Standalone Questionnaire (Public Page)

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 4.1 | Access via link | Open invite URL in incognito browser | Questionnaire page loads with centre branding | |
| 4.2 | No auth required | Open URL without login | Page loads — no redirect to login | |
| 4.3 | Brand colours | Check header/buttons | Uses centre primary colour from ai_config | |
| 4.4 | Centre name shown | Check header | Shows "Kiros Early Education" (or configured name) | |
| 4.5 | Question display | First question appears | Shows question text, timer, progress bar | |
| 4.6 | Per-question timer | Watch countdown | Timer counts down from configured seconds | |
| 4.7 | Timer auto-submit | Let timer reach 0 | Auto-submits current answer, moves to next | |
| 4.8 | Multiple choice | Answer a multiple choice question | Radio buttons work, submit saves | |
| 4.9 | Open text | Answer an open text question | Textarea accepts input, submit saves | |
| 4.10 | Scale (1-5) | Answer a scale question | Numbered buttons work, submit saves | |
| 4.11 | Progress bar | Answer several questions | Progress bar advances | |
| 4.12 | Section transition | Complete knowledge questions | Transitions to "Professional Profile" section | |
| 4.13 | Progress save | Answer 5 questions, close browser | Progress saved to DB | |
| 4.14 | Resume | Reopen same URL after closing | Resumes from question 6 (skips answered) | |
| 4.15 | Mobile responsive | Open on mobile device/emulator | Layout adapts, buttons are touch-friendly | |
| 4.16 | Completion | Answer all questions | "Thank you" page shows, no results visible | |
| 4.17 | Invalid token | Open URL with random token | Error message shown | |
| 4.18 | Already completed | Open URL after completion | "Already completed" message | |
| 4.19 | Closed position | Close position, then open candidate's URL | "Position no longer available" message | |

---

## TEST GROUP 5: Candidate Scoring

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 5.1 | Trigger scoring | /candidates/[id] → "Score Candidate" button | Scoring initiates, loading indicator | |
| 5.2 | Knowledge scores | Check Knowledge Results tab after scoring | Each question scored 0-10, overall percentage shown | |
| 5.3 | DISC profile | Check DISC Profile tab | Radar chart with D/I/S/C scores, primary/secondary type | |
| 5.4 | Personality analysis | Check Personality tab | AI narrative text, strengths, growth areas | |
| 5.5 | Team fit (no staff profiles) | Score without staff DISC data | Team fit shows "Insufficient staff profiles for mapping" | |
| 5.6 | Overall rank | Check AI Recommendation tab | Score out of 100, hire recommendation, weight breakdown | |
| 5.7 | Score weights from config | Change weights in /admin/ai-config | New weights reflected in next scoring | |

---

## TEST GROUP 6: Candidate Actions

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 6.1 | Approve candidate | Click "Approve" | Status changes to "approved", onboarding button appears | |
| 6.2 | Reject candidate | Click "Reject" → enter notes → confirm | Status changes to "rejected", notes saved | |
| 6.3 | Reject notes saved | Check DB after rejection | reviewer_notes and reviewed_by populated | |

---

## TEST GROUP 7: Onboarding

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 7.1 | Start onboarding | Approved candidate → "Start Onboarding" | Loading, then success message | |
| 7.2 | Auth user created | Check Supabase Auth → Users | New user exists with candidate's email | |
| 7.3 | Profile created | Check profiles table | Profile row exists with correct role | |
| 7.4 | Training assigned | Check lms_enrollments | Mandatory modules assigned to new user | |
| 7.5 | Induction checklist | Check checklist_instances | "Staff Induction Checklist" instance created | |
| 7.6 | Orientation tasks | Check tasks table | Orientation tasks created for new user | |
| 7.7 | Candidate status | Check recruitment_candidates | Status updated to "hired" or "onboarding" | |

---

## TEST GROUP 8: Staff DISC Assessment

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 8.1 | DISC module visible | Login as educator → Learning page | "Professional Profile Assessment" module visible | |
| 8.2 | Complete assessment | Complete DISC + personality questions | Results saved to staff_disc_profiles | |
| 8.3 | Profile stored | Check staff_disc_profiles table | D/I/S/C scores, analysis text stored | |

---

## TEST GROUP 9: AI Agent Delegation

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 9.1 | Recruitment agent | Chat: "Help me recruit an educator" | Master AI delegates to Recruitment Agent | |
| 9.2 | Recruitment invite | Chat: "Create an invite for John Smith for the educator position" | Agent creates invite, returns link | |
| 9.3 | EL agent | Chat: "Create a weekly program plan for the toddler room" | Master AI delegates to Educational Leadership Agent | |
| 9.4 | EL document | Chat: "Write a learning story about sensory play" | Agent generates learning story document | |
| 9.5 | EL philosophy ref | Check generated content | References Kiros philosophy and EYLF V2.0 | |
| 9.6 | Learning module agent | Chat: "Create a training module on positive behaviour guidance" | Master AI delegates to Learning Module Agent | |
| 9.7 | LMS module created | Check lms_modules table | New module with sections and quiz questions | |
| 9.8 | Enrolment suggestion | Check response | Agent suggests which staff to enrol | |

---

## TEST GROUP 10: Regression — Existing Agents

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 10.1 | QA1 agent works | Chat: "What's our QA1 status?" | Delegates to QA1, returns progress | |
| 10.2 | QA2 agent works | Chat: "Show me our health and safety compliance" | Delegates to QA2 | |
| 10.3 | Marketing agent works | Chat: "Generate a social media post about our centre" | Delegates to Marketing Agent | |
| 10.4 | Compliance agent works | Chat: "Check our regulatory compliance" | Delegates to Compliance Agent | |
| 10.5 | All 12 agents in admin | /admin/agents | All 12 agents listed with correct tools | |
| 10.6 | File attachment works | Attach a file in chat | AI reads and responds to file content | |
| 10.7 | Existing chat works | "What's our QA progress?" | Normal response without errors | |
| 10.8 | Document generation | "Generate a board report" | Document generated, SharePoint upload works | |

---

## TEST GROUP 11: Admin Configuration

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 11.1 | New tools in config | /admin/ai-config → Tool Permissions tab | 7 new tools visible in grid | |
| 11.2 | Recruitment config | /admin/ai-config → check for recruitment category | 4 recruitment keys shown | |
| 11.3 | Agent config | /admin/agents → edit Recruitment Agent | All 13 tools listed in checkbox grid | |

---

## TEST GROUP 12: TypeScript & Build

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 12.1 | TypeScript compiles | `npx tsc --noEmit` | Zero errors | |
| 12.2 | Vercel build | Push to main | Build succeeds | |
| 12.3 | No console errors | Open browser console on all new pages | No JavaScript errors | |

---

## SUMMARY

**Total tests: 78**
- Group 1: Sidebar (5 tests)
- Group 2: Positions (6 tests)
- Group 3: Invites (5 tests)
- Group 4: Questionnaire (19 tests)
- Group 5: Scoring (7 tests)
- Group 6: Actions (3 tests)
- Group 7: Onboarding (7 tests)
- Group 8: Staff DISC (3 tests)
- Group 9: Agent Delegation (8 tests)
- Group 10: Regression (8 tests)
- Group 11: Admin Config (3 tests)
- Group 12: Build (3 tests)
