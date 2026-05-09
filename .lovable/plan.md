ns# Plan: Unified Dashboard (no separate Report page jump)

## Goal

Replace the current "Dashboard → Connect → Analyze → Report (separate page)" flow with a single workspace where the dashboard *is* the report. The user never navigates away.

## Honest assessment

This is the right move. The split between `/dashboard` and `/report/:id` is the #1 friction point — users finish a scan, get teleported to a long report page, and never come back. Consolidating into one screen means:

- One mental model ("my app's health lives here")
- Faster perceived speed (no full page transition)
- Higher fix-rate (fix prompts are 1 click away, not 2 navigations)
- Better retention (returning user lands on dashboard and sees current state, not an empty list)

Risk is low *if* we keep `/report/:id` working as a permalink (shared links, emails, PDF rendering still need it).

## New flow

```text
Dashboard (empty state)
   └─ "Scan an app" → Connect (modal or inline)
        └─ Analyze (inline progress card on dashboard, not a separate page)
             └─ Dashboard updates in place with results
                  ├─ Intent Score (hero)
                  ├─ Tabs: Business | Security | Legal | What works
                  ├─ Verified / Unverified toggle
                  ├─ Inline fix prompts (copy / send to Lovable)
                  └─ "Download PDF" + "Open shareable report" buttons
```

## Architecture

### Routes (unchanged on the outside)

- `/dashboard` — becomes the workspace. Shows the **latest analysis** for the selected app inline.
- `/report/:analysisId` — kept as a permalink / share / PDF view. Same data, read-only chrome.
- `/analyze/:appId` — kept but redirects to `/dashboard?app=:appId&analysis=:id` once results are ready. While running it can stay as the progress page OR be replaced by an inline panel (option A below).

### Two implementation options for the "scan in progress" state

**Option A (recommended): inline streaming on dashboard**
- Click "Scan" → dashboard shows a streaming progress card in place of the report area.
- `useAnalysisStream` hook polls the `analyses` row + `status` field.
- When status flips to `complete`, the card morphs into the full report sections.
- `/analyze/:appId` becomes a thin redirect for backward compatibility.

**Option B (smaller change): keep Analyze page, just redirect to dashboard on finish**
- Less code churn, but loses the "user never leaves" feel.

I recommend **A**.

### Component reuse (key — keeps work small)

Today `Report.tsx` is 1,136 lines doing all the heavy lifting. We extract its sections into reusable blocks under `src/components/report/`:

- `IntentScoreHero`
- `WhatWorksSection`
- `BusinessIssuesSection`
- `SecurityIssuesSection`
- `LegalSection`
- `FixPromptCard`
- `VerifiedToggle`
- `ReportActions` (download PDF, share, rescan)

Then both `/dashboard` and `/report/:id` render the same blocks with different chrome (dashboard = with sidebar/app switcher; report = standalone shareable view).

### Dashboard layout (new)

```text
┌─ DashboardNavbar ────────────────────────────────┐
├─ App switcher (dropdown) + "New scan" button     │
├─ ┌───────────────────────────────────────────┐   │
│  │  IntentScoreHero  +  ReportActions       │   │
│  └───────────────────────────────────────────┘   │
├─ Tabs: [Overview] [Business] [Security] [Legal]  │
├─ <active tab content with inline fix prompts>    │
└──────────────────────────────────────────────────┘
```

Empty states:
- No apps connected → CTA to `/connect`
- App connected, no scan yet → big "Run first scan" card
- Scan running → inline progress card with live log
- Scan complete → full report inline

## What does NOT change

- `analyses` table schema, RLS, edge functions (`analyze`, `submit-finding-dispute`, etc.)
- `/report/:id` URL (kept as shareable permalink + used for PDF generation)
- Email links pointing at `/report/:id`
- Sample report page
- Connect / GitHub OAuth flow
- Pricing / scan limits

## What WILL change (file-level)

1. **New** `src/components/report/*` — extract sections from `Report.tsx`.
2. **Refactor** `src/pages/Report.tsx` → thin wrapper around the new components.
3. **Refactor** `src/pages/Dashboard.tsx` → app switcher + inline workspace using the same components.
4. **Refactor** `src/pages/Analyze.tsx` → either inline panel triggered from dashboard, or thin redirect.
5. **Update** post-scan navigation in `Analyze`/scan trigger code: instead of `navigate('/report/:id')`, do `navigate('/dashboard?analysis=:id')` (or update state in place).
6. **Update** `Connect.tsx` success path: redirect to `/dashboard?app=:newAppId` and auto-open the scan flow.

## Backward compatibility

- Old `/report/:id` links keep working (still rendered, just not the default destination).
- Emails, "scan ready" notifications still link to `/report/:id` — unchanged.
- PDF export still generates from `/report/:id` markup.
- Bookmarked `/analyze/:appId` URLs redirect cleanly.

## Build order (when you say go)

1. Extract report sections into `src/components/report/*` (no behavior change).
2. Make `Report.tsx` use the new components (regression check).
3. Build new Dashboard layout: app switcher + inline workspace + tabs.
4. Wire "Run scan" to inline progress + stream results into the same view.
5. Update post-scan redirects + Connect success path.
6. Convert `Analyze.tsx` to redirect-only.
7. QA: run a real scan end-to-end on the preview, verify `/report/:id` still renders, verify email links still work.

## Will it break anything?

No, if we follow this order. The risk areas and mitigations:

- **PDF generation** — keep `/report/:id` route alive. Mitigated.
- **Email/share links** — unchanged. Mitigated.
- **State sync between scan progress and dashboard** — handled by polling the `analyses` row (already supported by RLS).
- **Mobile layout** — dashboard becomes denser; we'll keep tabs + collapsible sections so it works on 375px.

## Suggestions beyond the spec

1. **Persistent "last scan" timestamp + rescan button** in the hero so the dashboard always feels live.
2. **Diff view between scans** ("3 issues fixed since last scan, 1 new") — huge retention driver, easy once everything is on one screen.
3. **Inline "Send fix to Lovable" button** that deep-links to lovable.dev with the prompt prefilled (you already have the prompts; this is a 30-line addition).
4. **Sticky score bar** on scroll so the Intent Score stays visible while scrolling through findings.
5. **Keep `/report/:id` styled as the "shareable / public-facing" view** — slightly different chrome (no app switcher, has Rismon branding header) so it's good for sharing with cofounders/clients.

Tell me to start and I'll begin with step 1 (extracting report sections).
