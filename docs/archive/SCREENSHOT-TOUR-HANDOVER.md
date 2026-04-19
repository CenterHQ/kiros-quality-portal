# Screenshot Tour Handover — Kiros Quality Portal

**Purpose:** Understand the system from the outside in, for a full rebuild. Every pass adds a new lens — breadth first, depth later.  
**Constraint:** READ-ONLY throughout. No clicking "+ New", no creating records, no editing. Observe only.

---

## Project context

- **Project:** `/Users/davidcruwys/dev/clients/kiros/kiros-quality-portal`
- **Dev server:** `npm run dev` → http://localhost:3333
- **Tour file:** `.screenshots/full-system/tour.yml`
- **Output dir:** `.screenshots/full-system/`
- **Primary login (Approved Provider):** rony@kiros.com.au / Winter12!

---

## Checklist — what has been done

### Pass 1 — Breadth (AP role, all nav routes)
- [x] 55 routes captured as Approved Provider (rony@kiros.com.au)
- [x] All routes have `description`, `functional_confidence` (0–100), `confidence_note`
- [x] OWNA pages (26–27) re-shot after OWNA_API_KEY was added — live data confirmed
- [x] 4 skipped OWNA pages now captured (52–55: staff, families, enrolments, health)
- [x] AI Chat confirmed working (Anthropic key set, real conversation history)
- [x] Marketing Settings now shows Meta/Facebook as Connected
- [x] `synthesis:` block written (~800 words)
- [x] `confidence_summary:` appended to synthesis

### Known issues recorded in tour.yml
- [x] OWNA Attendance (27) — returns 400, not 500. Key works, but endpoint has a parameter bug. Flagged for Rony.
- [x] `/recruitment` root → 404. Broken nav link. Real pages are `/candidates` and `/candidates/positions`.
- [x] All 14 candidates + 18 positions are test/UAT data. Needs cleanup.
- [x] Admin `/agents` page titled "AI Configuration" but is actually the agents list — confusing.

---

## Checklist — what is incomplete

### [ ] Role variant passes
- [ ] **Educator role** — Justina Abadier. Credentials unknown; retrieve from Supabase (check `auth.users` or `public.users` table) or reset via Supabase dashboard. Goal: capture only pages that differ from the AP view. Add `visible_to_roles:` annotation to each route.
- [ ] **Nominated Supervisor role** — Annette Ballard. Same — credentials unknown, retrieve same way.
- [ ] **Reason not done:** Only one set of credentials was available at tour time.

### [ ] Detail/record views
- [ ] Click into an existing NQS Element to see its detail page (e.g. element 1.1.1)
- [ ] Click into an existing Task card to see its detail/modal
- [ ] Click into a Compliance regulation row to see any expanded detail
- [ ] Click into a Learning Module to see its content page
- [ ] Click into a Candidate record to see the candidate profile
- [ ] Click into a Register to see its entries (e.g. open the Chemical Register)
- [ ] Click into a Centre Context record (admin/context) to see its full content
- [ ] **Reason not done:** First pass captured list views only. Detail views are a different component layer and matter for the rebuild spec.

### [ ] Multi-step wizard flows (read-only observation only — navigate steps, do not submit)
- [ ] Data Extract Wizard — Step 1 was captured (24-reports-extract.png). Navigate through steps 2–5 to see what the full flow looks like. Do not export.
- [ ] **Reason not done:** First pass only captured the entry step.

### [ ] Unvisited route — `/documents/library`
- [ ] Flagged in synthesis as potentially the AI Documents library. Not visited in any pass.
- [ ] **Reason not done:** Not surfaced in sidebar nav discovery during the tour.

### [ ] Formal nav discovery pass
- [ ] The skill defines a Step 5 nav discovery pass: collect all `nav a` links from every visited page, deduplicate, and screenshot any new URLs not already in tour.yml.
- [ ] This was never run. There may be routes that exist but aren't in the sidebar (deep links, admin-only URLs, URL-bar-navigable pages).
- [ ] **Reason not done:** Skipped in all three passes.

### [ ] Mobile/tablet viewport
- [ ] All 55 screenshots are full desktop width. Educators likely use a tablet in the room.
- [ ] A targeted pass at 768px or 1024px on the 10 highest-confidence routes would show whether the layout degrades.
- [ ] **Reason not done:** Not discussed until now.

### [ ] AI Config tabs (admin/ai-config)
- [ ] Screenshot 51 only captured the "Model & Thinking" tab (1 of 15 tabs). 14 tabs unseen: Chat, Agent Defaults, Uploads, Learning, Brand, Document Styling, Tool Permissions, Display, Marketing, Widget, Reports, Cron & Jobs, Service Details, System.
- [ ] **Reason not done:** Only the active/default tab was captured.

### [ ] OWNA Attendance bug
- [ ] Returns HTTP 400 — the endpoint is reachable but something in the request parameters is wrong (likely a date or room ID parameter). Not investigated at code level.
- [ ] **Reason not done:** Out of scope for a screenshot tour. Flagged for Rony.

---

## Priority order for the next session

Work broad-to-deep. Do not go down rabbit holes. Each priority is one coherent pass.

### Priority 1 — Unvisited routes (30 min, READ-ONLY)
Navigate to these and screenshot:
1. `/documents/library` — AI Documents library (number: 57)
2. Run a nav discovery pass from the sidebar of each major section: collect all `nav a` hrefs, check for any URL not already in tour.yml, screenshot any new ones sequentially.

Add new entries to `routes:` in tour.yml. Update screenshot count in tours.yml.

### Priority 2 — Detail views for top-5 features (45 min, READ-ONLY)
Click into ONE existing record per feature. Do not create anything. Screenshot the detail view, save as `NN-name.png` with suffix `b` if re-using a slot (e.g. `05b-element-detail.png`). Add as new route entries with `is_detail_view: true`.

Features to cover:
1. NQS Element detail — click any element in `/elements`
2. Task detail — click any task card in `/tasks`
3. Learning Module detail — click any module in `/learning/library`
4. Candidate detail — click any candidate in `/candidates`
5. Register entries — click "Open" on any register in `/registers` to see its row data

### Priority 3 — AI Config remaining tabs (20 min, READ-ONLY)
In `/admin/ai-config`, click through each of the 15 tabs and screenshot them. Save as `51b-ai-config-chat.png`, `51c-ai-config-agent-defaults.png`, etc. Add as sub-entries or annotate the existing route entry.

### Priority 4 — Role variants (60 min, READ-ONLY)
Requires finding Educator and NS credentials first.

**To find credentials:** Ask Claude to query Supabase. The project uses Supabase at https://fjecuwxorvjdxxukkviv.supabase.co. The service role key is in `.env.local`. Users are likely in `public.users` or findable via the Supabase dashboard → Authentication → Users. Passwords may need to be reset via Supabase dashboard (this is an admin action, not a data mutation).

Once logged in as each role:
- Screenshot the sidebar (just the nav structure is enough)
- Screenshot any page that looks different from the AP view
- Add `visible_to_roles:` to relevant tour.yml entries

### Priority 5 — Data Extract Wizard full flow (15 min, READ-ONLY)
Navigate to `/reports/extract`. Click through each step of the wizard to see the full flow. Screenshot each step. Save as `24b-`, `24c-`, etc. Do NOT click the final export/download button.

### Defer — Mobile/tablet viewport
Lower priority. Do this only if the above passes are complete and there is session time remaining. Use Playwright's `browser_resize` to set viewport to 768×1024, re-screenshot the 5 highest-confidence routes.

---

## How to update tour.yml after each pass

1. Append new route entries to the `routes:` list (do not modify existing entries unless correcting an error)
2. Use the format:
```yaml
  - url: /some/path
    name: some-name
    title: "Human Title"
    file: NN-some-name.png
    functional_confidence: 75
    confidence_note: "One sentence reason"
    description: "3–5 sentence description of what you saw"
```
3. Update `screenshots:` count at top of tour.yml
4. Update `.screenshots/tours.yml` with new count and date

---

## Credentials summary

| Role | Email | Password | Status |
|---|---|---|---|
| Approved Provider | rony@kiros.com.au | Winter12! | Confirmed working |
| Nominated Supervisor | annette@kiros.com.au (guess) | Unknown | Retrieve from Supabase |
| Educator | justina@kiros.com.au (guess) | Unknown | Retrieve from Supabase |

To retrieve: open Supabase dashboard → project `fjecuwxorvjdxxukkviv` → Authentication → Users. Or ask Claude to query `select email from auth.users` using the service role key.

---

## What the tour artifact is for

The tour.yml and screenshots are feeding two documents:
1. `docs/UX-SPECIFICATION.md` — every screen, layout, role-based access, empty states, interactions
2. `docs/REQUIREMENTS-SPECIFICATION.md` — functional requirements by feature, what it must/must not do

These will be handed to Baku (AI app builder) to drive a full rebuild. The more complete the tour, the better the rebuild spec. The `functional_confidence` scores tell Baku what to prioritise and what to skip.
