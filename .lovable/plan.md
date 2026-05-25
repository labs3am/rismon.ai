
# Make Rismon stand out for the Lovable sweepstake

Three additions to the landing + Promise Audit pages so judges immediately see Rismon is built on Lovable, serves Lovable's own users, and has real traction.

## 1. "Built on Lovable" badge

- Add a small badge in the homepage hero area and in the footer (next to the Product Hunt badge).
- Links to `https://lovable.dev`.
- Uses Lovable's wordmark + "Built on" label, styled to match the site's dark theme (no clash with the existing PH badge).
- Also surface it once on `/promise-audit` so judges who land there see it.

## 2. Featured example scans on /promise-audit

- Add a "Featured scans" row under the URL input on `/promise-audit`.
- Show 3 pre-cached scans of well-known AI-built apps (e.g. a Lovable showcase app, a Bolt demo, a Cursor-built indie app). Each card shows: app name, score donut, top 2 findings, "View full report" link.
- Implementation: store the 3 featured scan IDs in a small `featured_scans` config (either a new tiny table or a hardcoded array of existing public scan IDs). Clicking opens the existing `/promise-audit/:id` route — no new report UI needed.
- Goal: a judge can click and see a real report in 2 seconds, without having to run a scan themselves.

## 3. Public scan counter ("X apps audited")

- Add a live count above the fold on the homepage and on `/promise-audit`: "1,247 apps audited — and counting".
- Source: `count(*)` on the existing `public_promise_audits` table (or whatever the public-audit table is called — will confirm during build).
- Fetched via a lightweight Supabase query on mount, cached for 60s in React Query. No new edge function needed if RLS allows a public count; otherwise a tiny `get-audit-count` edge function.
- Falls back gracefully if the query fails (just hides the counter).

## Technical notes

- All three are frontend-only except #2 (needs to know 3 real scan IDs to feature) and possibly #3 (may need a count RPC).
- No schema changes unless featured scans need a config table — will prefer hardcoding 3 IDs in a constants file to keep it simple.
- Will reuse existing components: `ScoreDonut`, audit card styling from `/promise-audit`, footer badge layout.
- Will verify `public_promise_audits` table name and public-read RLS before wiring the counter.

## Out of scope (for this pass)

- The "For Lovable" page polish, the 30-sec demo GIF, and the actual sweepstake form submission — those are separate next steps once these three land.

Want me to proceed?
