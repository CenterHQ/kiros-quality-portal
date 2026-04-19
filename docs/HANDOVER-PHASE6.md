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

When we built the `nqs` tool for the kiros skill, we queried the live `qa_elements` table and discovered the column names in REQUIREMENTS-SPECIFICATION.md Section 22 are wrong:

| Spec said | Live DB actually has |
|---|---|
| `name` | `element_name` |
| `rating` | `current_rating` (values: `not_met`, `met`) |
| `work_status` | `status` (values: `not_started`, `in_progress`) |

We fixed the kiros script but did NOT update the spec. There are likely other tables in Section 22 with similar mismatches — we only verified `qa_elements` and `centre_context` against the live DB. The other ~45 tables in Section 22 are still spec-derived, not live-verified.

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

### Task 2 — Spot-check the other high-stakes tables against the live DB

Use the kiros skill and direct Supabase REST API calls (credentials in `.env.local`) to verify the actual column names for these tables, which are most likely to have drifted or been misremembered:

Priority order:
1. `tasks` — spec says `status (todo|in_progress|review|done)` — verify the enum values match live DB
2. `checklist_templates` — spec says `items (JSONB)` and `frequency` — verify column names
3. `checklist_instances` — spec says `items_snapshot (JSONB)` — verify
4. `lms_modules` — spec says `status` — verify
5. `chat_conversations` and `chat_messages` — spec says specific role enums — verify
6. `profiles` — spec says `allowed_pages (text[])` — verify column name and type

For each: query `?limit=1` via curl with the service role key and print the actual keys. Fix any mismatches in Section 22 of the spec.

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

The one-line brief: the specs are nearly Baku-ready, but we found one confirmed schema error and likely more — do a targeted live-DB verification pass on the highest-stakes tables in Section 22, fix the spec, remove the temporary code patch, then return to the Baku handoff track.
