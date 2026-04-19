---
name: kiros
description: Business intelligence skill for Kiros Early Education Centre. Loads real operational data from the live Supabase database into conversation context to ground code and design decisions in actual centre knowledge. First tool — context — queries the centre_context table. More tools will be added as the project grows.
---

# KIROS — Business Intelligence Skill

You are acting as the Kiros business intelligence layer. Your job is to fetch real data from the Kiros Early Education Centre's live Supabase database and load it into the conversation so that decisions are grounded in actual business knowledge, not assumptions.

## Invocation Pattern

The skill is called as: `/kiros <tool> [optional: filter]`

- `/kiros` — list available tools
- `/kiros context` — list available categories with row counts
- `/kiros context <fuzzy term>` — load rows from the best-matching category

## Tool: context

Queries the `centre_context` table in the live Supabase database.

### Step 1 — Read credentials from .env.local

Run:
```bash
grep "NEXT_PUBLIC_SUPABASE_URL\|SUPABASE_SERVICE_ROLE_KEY" .env.local
```

Extract `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### Step 2a — No filter given: list available categories

Query distinct context_types with counts:

```bash
curl -s "https://<project-ref>.supabase.co/rest/v1/centre_context?select=context_type" \
  -H "apikey: <SERVICE_KEY>" \
  -H "Authorization: Bearer <SERVICE_KEY>"
```

Parse the JSON array and count occurrences of each `context_type`. Display as a numbered list:

```
Available categories in centre_context:
  1. qip_goal            (46 rows) — Quality Improvement Plan goals
  2. safety_protocol     (10 rows) — Emergency and risk procedures
  3. service_value       ( 9 rows) — Core centre values
  4. policy_requirement  ( 9 rows) — Operational policy rules
  5. procedure_step      ( 9 rows) — How things are done step by step
  6. qip_strategy        ( 8 rows) — Improvement strategies
  7. teaching_approach   ( 8 rows) — How educators work with children
  8. family_engagement   ( 7 rows) — Orienting and involving families
  9. leadership_goal     ( 7 rows) — Governance and management intent
 10. philosophy_principle ( 5 rows) — K.I.R.O.S philosophy
 11. environment_feature  ( 5 rows) — Physical spaces and room setup
 12. inclusion_practice   ( 4 rows) — Diversity and support needs

Run `/kiros context <category>` to load rows from any category.
You can use plain language — "goals", "safety", "teaching" etc.
```

### Step 2b — Filter given: fuzzy match then fetch

Map the user's input to the closest `context_type` using this table:

| User says | Maps to |
|---|---|
| goals, qip, improvement, targets | `qip_goal` |
| safety, emergency, risk, drills, evacuation | `safety_protocol` |
| values, culture, ethos | `service_value` |
| policies, policy, compliance, requirements | `policy_requirement` |
| procedures, procedure, steps, operations, how | `procedure_step` |
| strategy, strategies, plan, planning | `qip_strategy` |
| teaching, pedagogy, curriculum, eylf, educators, learning approach | `teaching_approach` |
| families, family, orientation, parents, carers | `family_engagement` |
| leadership, governance, management, director, el | `leadership_goal` |
| philosophy, principles, kiros, acronym | `philosophy_principle` |
| environment, rooms, spaces, physical, room setup | `environment_feature` |
| inclusion, diversity, support, allied health, diagnosis | `inclusion_practice` |

If the input matches none of the above, tell the user and show the category list.

Fetch the matched category:

```bash
curl -s "https://<project-ref>.supabase.co/rest/v1/centre_context?context_type=eq.<MATCHED_TYPE>&select=title,content,source_quote" \
  -H "apikey: <SERVICE_KEY>" \
  -H "Authorization: Bearer <SERVICE_KEY>"
```

### Step 3 — Format output

For each row, display:

```
── <title>
   <content>
   (source: "<source_quote>")  ← omit if source_quote is null or empty
```

After displaying all rows, add a one-line summary:

```
Loaded <N> rows from centre_context [<context_type>] into conversation context.
```

## When no tool is specified

If the user types just `/kiros` with no tool name, list available tools:

```
KIROS — Available tools:

  context   Query the centre_context table for business knowledge
            about Kiros Early Education Centre (philosophy, goals,
            teaching practice, safety, families, and more).

            Usage: /kiros context
                   /kiros context <category>

More tools will be added as the project grows.
```

## Important notes

- Always read credentials fresh from `.env.local` — do not hardcode them.
- Use the service role key (not the anon key) — RLS on centre_context uses `FOR ALL USING(true)` so either key works, but service role is consistent with how other kiros tools will operate.
- This is a project-local skill. Credentials and data are specific to the Kiros Early Education Centre Supabase instance.
- Data loaded by this skill is real production data — treat it as ground truth for business decisions.
