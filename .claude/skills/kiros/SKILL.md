---
name: kiros
description: "Business intelligence skill for Kiros Early Education Centre. Fetches real operational data from the live Supabase database to ground code and design decisions in actual centre knowledge. Two tools — context (centre philosophy, QIP goals, teaching practice, values, safety, families) and nqs (all 40 NQS elements with compliance ratings, inspector findings, improvement actions). Use when writing code that touches centre-specific business logic, NQS compliance, AI grounding, or anything requiring knowledge of what this centre actually is and where it stands."
---

# KIROS — Business Intelligence Skill

Invocation: `/kiros <tool> [filter]`

- `/kiros` — list available tools
- `/kiros context [category]` — load centre philosophy, goals, practice
- `/kiros nqs [filter]` — load NQS compliance data

Scripts live in `.claude/skills/kiros/scripts/`. Run from project root (reads credentials from `.env.local`).

---

## Tool: context

Queries `centre_context` table (127 rows). Loads centre philosophy, QIP goals, teaching approaches, family engagement, safety protocols, and more.

**No filter — list categories:**
```bash
bash .claude/skills/kiros/scripts/context.sh
```

**With filter — fuzzy match to context_type:**
```bash
bash .claude/skills/kiros/scripts/context.sh <context_type>
```

Fuzzy mapping — match user input to exact `context_type`:

| User says | context_type |
|---|---|
| goals, qip, improvement | `qip_goal` |
| safety, emergency, risk | `safety_protocol` |
| values, culture, ethos | `service_value` |
| policies, policy | `policy_requirement` |
| procedures, steps, how | `procedure_step` |
| strategy, planning | `qip_strategy` |
| teaching, pedagogy, eylf | `teaching_approach` |
| families, parents, orientation | `family_engagement` |
| leadership, governance | `leadership_goal` |
| philosophy, principles, kiros | `philosophy_principle` |
| environment, rooms, spaces | `environment_feature` |
| inclusion, diversity, support | `inclusion_practice` |

If no match, show the category list and ask the user to pick.

---

## Tool: nqs

Queries `qa_elements` (40 rows) and `element_actions` (68 rows). Shows the centre's live NQS compliance position — what's met, what isn't, inspector findings, and improvement actions.

**All 40 elements, grouped by QA area (compact):**
```bash
python3 .claude/skills/kiros/scripts/nqs.py
```

**Filter options:**

| Filter | Command |
|---|---|
| QA area (e.g. qa1, qa4, 3) | `python3 .claude/skills/kiros/scripts/nqs.py qa1` |
| Single element | `python3 .claude/skills/kiros/scripts/nqs.py 1.1.1` |
| Not met (34 elements) | `python3 .claude/skills/kiros/scripts/nqs.py "not met"` |
| Met (6 elements) | `python3 .claude/skills/kiros/scripts/nqs.py met` |
| In progress | `python3 .claude/skills/kiros/scripts/nqs.py "in progress"` |
| Not started | `python3 .claude/skills/kiros/scripts/nqs.py "not started"` |
| Staff name | `python3 .claude/skills/kiros/scripts/nqs.py "Rony"` |

Single element output includes: rating, target, status, concept, inspector finding, centre response, meeting criteria, training points, and all linked `element_actions` rows.

**Key facts about this centre's NQS position:**
- 34 of 40 elements: `not_met`
- 6 of 40 elements: `met`
- 25 elements: `in_progress`, 15: `not_started`

---

## When no tool is specified

List available tools:

```
KIROS — Available tools:

  context   Centre philosophy, QIP goals, teaching practice, values,
            safety, families, inclusion, environment.
            Usage: /kiros context
                   /kiros context <category>

  nqs       NQS compliance position — all 40 elements with ratings,
            inspector findings, improvement actions.
            Usage: /kiros nqs
                   /kiros nqs qa1 | 1.1.1 | "not met" | met | <name>

More tools will be added as the project grows.
```

---

## Notes

- Always run scripts from project root — they read `.env.local` for credentials.
- Data is live production — treat as ground truth.
- `context.sh` uses `bash`. `nqs.py` uses `python3`. Both available on this machine.
