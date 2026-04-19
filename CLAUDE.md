**System context**: See [CONTEXT.md](CONTEXT.md) for purpose, core abstractions, key workflows, design decisions, non-obvious constraints, expert mental model, scope limits, and failure modes.

## Temporary Code Changes (DO NOT COMMIT)

### ProtectedLayout.tsx — service role key guard
`src/components/ProtectedLayout.tsx` was patched to gracefully handle a missing `SUPABASE_SERVICE_ROLE_KEY` by returning zero badge counts instead of crashing. This was applied to allow the dev session to run without that key set.

**Revert before committing.** The correct fix is to supply `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

The change is a single added guard line in `getBadgeCounts`:
```ts
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { '/tasks': 0, '/checklists': 0 }
```

## North Stars

### North Star 1 — Rebuild (Baku)
Produce two documents for feeding into Baku (Anthropic's AI app builder, similar to Lovable):
- `docs/UX-SPECIFICATION.md` — every screen, layout, user flows, role-based access, empty states, interactions
- `docs/REQUIREMENTS-SPECIFICATION.md` — functional requirements by feature, what it must/must not do, integration requirements, data model

### North Star 2 — Current System Health (for Rony)
Produce a "State of the System" document for Rony (the developer maintaining this for the next 1–2 months):
- `docs/SYSTEM-HEALTH.md` — bugs, architectural problems, what was bolted on badly, what's silently broken, immediate maintenance priorities

## Screenshot Tour — Incomplete Sections

The following sections were NOT toured and need a future session with the screenshot-tour skill:

### Recruitment
- `/recruitment` and all sub-pages — visible in sidebar nav, not visited

### Programming  
- `/programming` and all sub-pages — visible in sidebar nav, not visited

### Marketing sub-pages
- Status TBD (haiku agent checking whether these are real features or stubs — 2026-04-19)
- `/marketing/ads`, `/marketing/analytics`, `/marketing/calendar`, `/marketing/chat`
- `/marketing/comments`, `/marketing/content`, `/marketing/feed`, `/marketing/inbox`
- `/marketing/reviews`, `/marketing/settings`

To continue the tour: open a new session, run `/screenshot-tour` and select the `full-system` tour to continue from where it left off.

## Environment Variables

`.env.local` exists at project root. Supabase URL and anon key are populated.

**Still need values for:**
- `SUPABASE_SERVICE_ROLE_KEY` — required for AI chat tools, cron, document export, reports extract, badge counts
- `ANTHROPIC_API_KEY` — required for Kiros AI Chat
- `OWNA_API_KEY` — required for all OWNA integration pages
- Microsoft/SharePoint keys — for SharePoint sync
- Google Ads + Meta keys — for Marketing module

## Dev Server
Runs on port 3333: `npm run dev` (configured in package.json)
