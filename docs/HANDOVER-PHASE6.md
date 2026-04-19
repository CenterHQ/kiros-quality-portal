# Handover — Kiros Quality Portal: Phase 6

Project: /Users/davidcruwys/dev/clients/kiros/kiros-quality-portal

Read these files before doing anything else:
- `CONTEXT.md` — system purpose, roles, workflows, constraints
- `docs/REQUIREMENTS-SPECIFICATION.md` — rebuild spec for Baku (Sections 22–27 are most relevant)
- `docs/DB-REALITY-CHECK.md` — live schema audit from Phase 5
- `.claude/skills/kiros/SKILL.md` — the kiros business intelligence skill

---

## Where We Are Headed

The destination is a clean handoff to Baku (Anthropic's AI app builder) with two verified documents:
- `docs/UX-SPECIFICATION.md` — 55 routes, 14 feature domains, role-access table, UX patterns
- `docs/REQUIREMENTS-SPECIFICATION.md` — 31 features, ~50 data entities, 8 integrations

Phase 5 added feature classification (Core / High Value / Uncertain / Out of Scope) and adjusted the v1 scope. That work is committed and solid. The specs are close to Baku-ready.

Before they go to Baku, one problem was found that must be resolved first.

---

## The Rabbit Hole — Schema Accuracy Pass

### How we got here — and why the posture matters

When we built the `nqs` tool for the kiros skill, we queried the live `qa_elements` table expecting to confirm the schema we had documented. Instead we found the spec was wrong in three places:

| Spec said | Live DB actually has |
|---|---|
| `name` | `element_name` |
| `rating` | `current_rating` (values: `not_met`, `met`) |
| `work_status` | `status` (values: `not_started`, `in_progress`) |

We also found columns the spec never mentioned at all — `qa_name`, `standard_name`, `concept`, `meeting_criteria`, `exceeding_criteria`, `training_points`, `target_rating`. The table is substantially richer than documented.

None of this was caught by reading migrations or TypeScript types. It was only caught by querying the live DB directly.

**This is the lesson that shapes Phase 6:** the spec was written by reading code and migrations, not by reading the live database. The live database is the authority. Assume any table could have drifted, be richer than documented, or use different naming conventions than the spec implies. Go looking for what you don't know you don't know — not just verifying a checklist.

We fixed the kiros script but did NOT update the spec. The other ~45 tables in Section 22 are still spec-derived, not live-verified.

This matters because Baku will build a database from this spec. Wrong column names = broken migrations from day one.

---

## Phase 6 Tasks

### Task 1 — Fix qa_elements in the spec (known, do this first)

Update `docs/REQUIREMENTS-SPECIFICATION.md` Section 22.1 `qa_elements` row with the correct column names from the live DB:

Correct schema (verified live 2026-04-19):
```
element_code, element_name, qa_number, qa_name, standard_number, standard_name,
concept, current_rating (not_met|met), target_rating, status (not_started|in_progress),
assigned_to, officer_finding, our_response, actions_taken,
meeting_criteria, exceeding_criteria, training_points, due_date, notes
```

### Task 2 — Full schema scan of every table in Section 22

Do not limit this to a pre-identified list. Query every table named in Section 22 of the spec with `?limit=1` and compare the actual keys against what the spec documents. The NQS discovery proved that pre-identified priorities miss the real surprises.

For each table: print all actual column names, note anything the spec got wrong (wrong name, wrong type, missing column, undocumented column), and record your findings. Update Section 22 immediately for each table as you go — don't batch the fixes.

Start with these because they are core to the rebuild and most likely to have drifted:
1. `tasks` — spec says `status (todo|in_progress|review|done)` — are those the actual enum values?
2. `checklist_templates` and `checklist_instances` — spec says `items (JSONB)` and `items_snapshot (JSONB)` — verify names and structure
3. `profiles` — spec says `allowed_pages (text[])` — verify column name and type
4. `chat_conversations` and `chat_messages` — spec says specific role enums (`user|assistant|tool_call|tool_result`) — verify
5. `lms_modules`, `lms_enrollments`, `lms_section_progress` — LMS has the most complex schema in the spec
6. `element_actions` — used in the kiros nqs tool but its actual columns were never verified

Then work through every remaining table in Section 22 in order. Expect to find surprises. Document them in a Phase 6 Findings section (Section 28) as you go.

To query live DB:
```bash
SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d'=' -f2 | tr -d '[:space:]')
URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d'=' -f2 | tr -d '[:space:]')
curl -s "$URL/rest/v1/<table>?limit=1" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY"
```

### Task 3 — Remove the ProtectedLayout.tsx temporary patch

`src/components/ProtectedLayout.tsx` line 14 has a guard that was added when `SUPABASE_SERVICE_ROLE_KEY` was missing:

```ts
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { '/tasks': 0, '/checklists': 0 }
```

The key IS now set in `.env.local`. Remove this line. CLAUDE.md explicitly says "Revert before committing." This must not be committed to the repo.

### Task 4 — Flag any other spec inaccuracies found

If spot-checking reveals other column name mismatches or table structure differences, update Section 22 of `docs/REQUIREMENTS-SPECIFICATION.md` and add a summary of what was corrected to a Phase 6 Findings section (Section 28).

---

## After the Rabbit Hole — Return to the Destination

Once the schema accuracy pass is done, the next step toward Baku is:

**Review `docs/UX-SPECIFICATION.md` against the Phase 5 feature classification.**

The UX spec was written before Phase 5 and likely contains full page designs for features now marked Out of Scope or Deferred (Marketing, OWNA, SharePoint, PDP, legacy training). Those sections need to either be cut or clearly labelled as v2 so Baku doesn't build them.

That review is a separate task from this handover — do not start it until the schema pass is complete and committed.

---

## Tools Available

The `kiros` skill is project-local at `.claude/skills/kiros/`. Use it:
- `/kiros context` — load centre business knowledge
- `/kiros nqs` — load NQS compliance position (34 of 40 elements not_met)
- `/kiros nqs 1.1.1` — single element detail with inspector findings and improvement actions

---

## What This Session Does NOT Do

- Does not redesign the skill or add new tools
- Does not start the UX spec review
- Does not interview users
- Does not touch application code beyond removing the ProtectedLayout.tsx patch

---

The one-line brief: we thought we knew the schema from migrations and code — we were wrong about `qa_elements` and we'll likely be wrong about others. Query every table in Section 22 against the live DB, treat every surprise as expected, fix the spec as you go, remove the temporary code patch, then return to the Baku handoff track.
