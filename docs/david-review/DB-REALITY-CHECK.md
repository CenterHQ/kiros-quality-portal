# DB Reality Check — Kiros Quality Portal

**Date:** 2026-04-19  
**Method:** Live Supabase REST API (service role key) + migration SQL analysis  
**Purpose:** Verify that what was documented matches what actually exists in the live database

---

## 1. Live Schema Overview

**76 tables confirmed in production Supabase instance** via OpenAPI introspection.

The REQUIREMENTS-SPECIFICATION.md data model section specifies approximately 45 tables. The gap of ~31 tables is a combination of: tables missed from the spec, legacy tables to drop, junction tables omitted from the spec, and two naming mismatches.

---

## 2. Row Counts — Full Table Audit

Queried via Supabase REST API with `Prefer: count=exact` header. Date: 2026-04-19.

### Heavily Used (Real Production Data)

| Table | Rows | Interpretation |
|---|---|---|
| `chat_messages` | 539 | AI Chat is the most-used feature by far |
| `lms_module_centre_content` | 186 | Centre-specific LMS content — heavily populated |
| `lms_module_sections` | 164 | LMS content well structured |
| `centre_context` | 127 | AI grounding data is actively maintained |
| `lms_quiz_questions` | 123 | Quizzes are built out |
| `marketing_messages_inbox` | 92 | Read-only integration data from Meta (not created in portal) |
| `sharepoint_documents` | 91 | SharePoint sync is working |
| `recruitment_question_templates` | 60 | Recruitment is heavily configured |
| `ai_tool_permissions` | 49 | AI tool access matrix is configured |
| `lms_modules` | 41 | 41 learning modules exist |
| `qa_elements` | 40 | Exactly 40 NQS elements — fully seeded |
| `ratio_rules` | 32 | Rostering ratios defined |
| `lms_pathway_modules` | 29 | Pathway content linked |
| `tasks` | 22 | Some tasks active |
| `recruitment_candidates` | 14 | 14 candidates in system |
| `service_details` | 12 | Centre service info populated |
| `ai_agent_definitions` | 12 | AI agents configured |
| `policy_categories` | 12 | Policy categories exist but no policies |
| `chat_conversations` | 78 | Active chat history |
| `ai_config` | 69 | AI configuration entries |
| `element_actions` | 68 | QA improvement actions logged |
| `activity_log` | 79 | Activity being tracked |
| `recruitment_positions` | 19 | 19 job positions defined |
| `checklist_templates` | 19 | Checklist templates exist |
| `tags` | 19 | Tag taxonomy exists |
| `lms_pathway_enrollments` | 1 | Pathway tracking barely started |
| `lms_pathways` | 5 | Learning pathways defined |
| `lms_enrollments` | 4 | Only 4 module enrollments |
| `lms_section_progress` | 4 | Almost no learning progress recorded |
| `lms_certificates` | 1 | 1 certificate issued |
| `lms_reflections` | 1 | 1 reflection written |
| `lms_quiz_responses` | 3 | 3 quiz attempts |
| `resources` | 35 | Resources library populated |
| `register_definitions` | 7 | 7 registers defined |
| `compliance_items` | 9 | 9 compliance items |
| `comments` | 7 | Very little commenting activity |
| `rooms` | 3 | 3 rooms defined |
| `profiles` | 3 | **Only 3 users** — tiny team |
| `ai_document_styles` | 4 | Document style templates |
| `ai_generated_documents` | 15 | Some AI docs generated |
| `sharepoint_connection` | 1 | 1 SharePoint connection configured |
| `marketing_social_accounts` | 1 | 1 social account linked |
| `training_modules` | 8 | Legacy training — some content exists |

### Empty — Abandoned or Never Activated

| Table | Rows | Interpretation |
|---|---|---|
| `ai_suggestions` | 0 | **Confirmed abandoned.** Never populated. |
| `ai_learnings` | 0 | AI learning capture never used |
| `ai_agent_feedback` | 0 | No feedback collected |
| `ai_agent_performance` | 0 | No performance data |
| `ai_agent_sessions` | 0 | Session tracking never triggered |
| `ai_system_prompts` | 0 | System prompt overrides unused |
| `checklist_instances` | 0 | **Critical gap:** Checklist templates exist but are NEVER run |
| `checklist_schedules` | 0 | No scheduled checklists configured |
| `policies` | 0 | **Policy module has categories but ZERO policies** |
| `policy_versions` | 0 | No policy versions |
| `acknowledgements` | 0 | Staff have never acknowledged any policies |
| `policy_acknowledgements` | 0 | Same — compliance risk |
| `documents` | 0 | Document management module never used |
| `form_submissions` | 0 | Forms module never used |
| `smart_tickets` | 0 | Auto-remediation never triggered (because checklists never run) |
| `register_entries` | 0 | 7 registers defined but zero entries logged |
| `entity_tags` | 0 | Tag system defined but nothing tagged |
| `roster_shifts` | 0 | **Rostering not operational** |
| `roster_templates` | 0 | No templates |
| `staff_availability` | 0 | Availability not tracked |
| `staff_qualifications` | 0 | Qualifications not recorded |
| `staff_disc_profiles` | 0 | DISC profiles never completed |
| `leave_requests` | 0 | Leave management not used |
| `casual_pool` | 0 | Casual pool not used |
| `lms_pdp_goals` | 0 | PDP system never used |
| `lms_pdp_reviews` | 0 | PDP reviews never done |
| `programming_time` | 0 | Programming time tracking never used |
| `marketing_ad_campaigns` | 0 | No ad campaigns |
| `marketing_analytics_cache` | 0 | No analytics data |
| `marketing_comments` | 0 | No marketing comments |
| `marketing_content` | 0 | No marketing content |
| `marketing_content_calendar` | 0 | No content calendar |
| `marketing_conversations` | 0 | No marketing conversations |
| `marketing_messages` | 0 | No outbound messages sent |
| `marketing_post_engagement` | 0 | No engagement |
| `marketing_reviews` | 0 | No reviews |
| `training_assignments` | 0 | Legacy training never assigned |

---

## 3. Schema vs Specification Discrepancies

### Tables in Live DB NOT Captured in REQUIREMENTS-SPECIFICATION.md

These tables exist in production and have real data — the rebuild spec must include them.

| Table | Rows | Spec Gap | Action for Rebuild |
|---|---|---|---|
| `element_actions` | 68 | Missing from spec | **Add.** Core to QA improvement cycle — this is where improvement plans are tracked per NQS element |
| `lms_module_centre_content` | 186 | Missing from spec | **Add.** Critical — centre adds their own content to each LMS module |
| `lms_pathway_modules` | 29 | Missing from spec (junction table) | **Add.** Required to link pathways → modules |
| `checklist_categories` | 8 | Missing from spec | **Add.** Checklists need to be categorised |
| `policy_categories` | 12 | Missing from spec | **Add.** Policy categories exist and are used |
| `smart_tickets` | 0 | Missing from spec | **Add.** The automated checklist failure → ticket flow is a key design feature |
| `resources` | 35 | Missing from spec | **Add.** Resources library is populated and presumably visible to staff |
| `ai_tool_permissions` | 49 | Missing from spec | **Add.** Role-based AI tool access is actively configured |
| `ai_document_styles` | 4 | Missing from spec | **Add.** Required for AI document generation |
| `marketing_messages_inbox` | 92 | Missing from spec (separate from `marketing_messages`) | **Add separately.** Read-only inbox from Meta integration |
| `lms_pdp_reviews` | 0 | Missing from spec | **Add alongside `lms_pdp_goals`** |
| `lms_reflections` | 1 | Missing from spec | **Add.** Part of LMS learner journey |
| `acknowledgements` | 0 | Possibly duplicate of `policy_acknowledgements` | **Clarify.** Two ack tables exist — understand which is used |

### Naming Mismatches: Spec vs Live DB

| Spec Name | Live DB Name | Action |
|---|---|---|
| `shifts` | `roster_shifts` | Use `roster_shifts` in rebuild spec |
| `sharepoint_credentials` | `sharepoint_connection` | Use `sharepoint_connection` in rebuild spec |

### Tables in Live DB to Explicitly NOT Carry Forward

| Table | Rows | Reason |
|---|---|---|
| `ai_suggestions` | 0 | Confirmed abandoned — zero rows ever |
| `training_modules` | 8 | Legacy system — consolidate into single LMS |
| `training_assignments` | 0 | Legacy system — consolidate into single LMS |

---

## 4. RLS Policy Audit

### Critical: 17 Tables with `FOR ALL USING(true)` — Full Write Access for Any Authenticated User

This means any logged-in staff member can create, modify, or delete ANY row in these tables. This is a serious data integrity risk for the LMS system.

| Table | Policy Name |
|---|---|
| `centre_context` | `auth_centre_context` |
| `lms_certificates` | `auth_lms_certificates` |
| `lms_enrollments` | `auth_lms_enrollments` |
| `lms_module_centre_content` | `auth_lms_module_centre_content` |
| `lms_module_sections` | `auth_lms_module_sections` |
| `lms_modules` | `auth_lms_modules` |
| `lms_pathway_enrollments` | `auth_lms_pathway_enrollments` |
| `lms_pathway_modules` | `auth_lms_pathway_modules` |
| `lms_pathways` | `auth_lms_pathways` |
| `lms_pdp_goals` | `auth_lms_pdp_goals` |
| `lms_pdp_reviews` | `auth_lms_pdp_reviews` |
| `lms_quiz_questions` | `auth_lms_quiz_questions` |
| `lms_quiz_responses` | `auth_lms_quiz_responses` |
| `lms_reflections` | `auth_lms_reflections` |
| `lms_section_progress` | `auth_lms_section_progress` |
| `sharepoint_connection` | `auth_sharepoint_connection` |
| `sharepoint_documents` | `auth_sharepoint_documents` |

**Impact:** Any educator can delete all LMS modules, enroll/unenroll other staff, issue themselves certificates, or overwrite SharePoint sync data.

**Rebuild requirement:** All LMS tables must have role-differentiated RLS. Educators can only write their own progress/responses; admin/manager can manage modules.

### SELECT-only `USING(true)` — Acceptable for Reference Data

These tables allow all authenticated users to read (but not freely write):

`ratio_rules`, `rooms`, `register_definitions`, `register_entries`, `tags`, `checklist_templates`, `checklist_instances`, `checklist_categories`, `checklist_schedules`, `element_actions`, `policies`, `policy_versions`, `policy_categories`, `acknowledgements`, `policy_acknowledgements`, `roster_shifts`, `roster_templates`, `staff_availability`, `staff_qualifications`, `service_details`, `smart_tickets`, `programming_time`, `casual_pool`, `ai_config`, `ai_document_styles`, `ai_tool_permissions`

These are appropriate for shared reference data. The MUST NOT USING(true) requirement in the spec applies to write access, not select-only policies on reference tables.

---

## 5. Key Findings Summary

### What's Actually Being Used

1. **AI Chat is the primary value driver.** 539 messages across 78 conversations — the most active part of the system.
2. **LMS is substantial.** 41 modules with 186 centre-content entries and 123 quiz questions — real investment. But only 4 enrollments. Content exists; usage doesn't.
3. **Recruitment is active.** 14 candidates, 19 positions, 60 question templates — clearly in operational use.
4. **NQS elements are fully seeded.** All 40 elements present. element_actions (68 rows) shows ongoing improvement planning.
5. **Checklists exist as templates only.** 19 templates, 0 instances. The checklist completion workflow has NEVER run in production. smart_tickets at 0 is a direct consequence.
6. **Policy module is incomplete.** 12 categories, 0 actual policies. Staff have never acknowledged anything. Compliance exposure.
7. **Rostering is not operational.** 0 shifts, 0 templates. The rostering module is built but unused.
8. **Marketing is read-only.** The 92 rows in `marketing_messages_inbox` are ingested from Meta — not created by the portal. All outbound marketing tables are empty.
9. **Documents module never used.** 0 rows in `documents`.
10. **Only 3 users.** The system is in early operational use or pre-launch testing.

### Confirmed Gaps the Rebuild Must Address

- Checklist instantiation workflow must actually work at launch — it's the core compliance mechanism
- Policy creation + staff acknowledgement is a critical unfinished feature
- LMS has content but no adoption — onboarding flow or mandatory assignment mechanism needed
- Registers need an entry workflow (7 defined, 0 entries)
