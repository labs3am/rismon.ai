# Aikido-style Dashboard Redesign

## Goal
Turn the dashboard into the user's permanent home. Left sidebar navigation (like Aikido). On first login, only "Connect your app" is unlocked — every other section is locked until a repo is connected and the first scan runs. After Connect → questions → analyze runs in the background, user is forwarded straight to the dashboard, which shows a graph-driven overview (Intent Match Score, Business Validation Score, issues by severity) plus drill-down sections.

## Flow

```text
Login
  └─ /dashboard (empty state: only "Connect your app" enabled, all other sidebar items locked)
       └─ Connect GitHub repo  →  Smart questions modal
              └─ "Start scan" → fire analyze edge function (no await)
                     └─ Redirect immediately to /dashboard?analysis=<id>
                            └─ Dashboard polls analysis row; shows skeleton charts
                                  → when status=complete, charts + sections fill in
                                  → email "your scan is ready" still fires from edge function
```

## Layout (Aikido-inspired)

```text
┌────────────────────────────────────────────────────────────┐
│  Top bar: Logo · App switcher · avatar                     │
├──────────────┬─────────────────────────────────────────────┤
│ SIDEBAR      │  MAIN                                        │
│              │                                              │
│ ▸ Overview   │  [App: my-app ▾]   Last scan: 2m ago  ↻     │
│ ▸ Business   │                                              │
│   Intent     │  ┌─Intent─┐ ┌─Validation┐ ┌─Security─┐      │
│ ▸ Security   │  │  82 ◐  │ │   71 ◐    │ │  64 ◐    │      │
│ ▸ SEO &      │  └────────┘ └───────────┘ └──────────┘      │
│   Homepage   │                                              │
│ ▸ Legal 🔒    │  Issues by severity (bar chart)             │
│ ▸ Performance│  Trend over scans (line chart)               │
│   🔒 Upgrade │                                              │
│ ▸ Monitoring │  Top 5 issues to fix · [Flag wrong]          │
│   🔒 Upgrade │                                              │
│              │                                              │
│ ─ Connect    │                                              │
│ ─ Settings   │                                              │
└──────────────┴─────────────────────────────────────────────┘
```

## Sections (sidebar items)

| Section | Free / Pro | Source |
|---|---|---|
| Overview | Free | Aggregate scores + charts |
| Business Intent | Free | `landing_page_promises`, `intent_match_score`, `code_understanding` |
| Security Issues | Free | `security_issues`, `security_score` (Plain English + Tech toggle, 1-click flag) |
| SEO & Homepage | Free | `homepage_signals` (title, desc, OG, screenshot, perf basics) |
| Legal & Trust | Free preview / Pro deep | `legal_findings` (privacy/terms/cookies presence) |
| Performance | Pro 🔒 | Lighthouse-style metrics (placeholder + upgrade card) |
| Continuous Monitoring | Pro 🔒 | Webhook re-scans on push (placeholder + upgrade card) |

Locked items render with a 🔒 icon and an upgrade banner inside the panel instead of the data.

## Empty / locked state (no app connected)

- All sidebar items except **Connect** appear greyed out with a lock.
- Main area shows a single big card: "Connect your first app to unlock your dashboard" → button to `/connect`.

## Background-scan UX

- `Connect.tsx` after questions: `supabase.functions.invoke('analyze', { ... })` **without** `await` (fire-and-forget) and immediately `navigate('/dashboard?analysis=' + newAnalysisId&pending=1)`.
- Dashboard, when `pending=1` or analysis row `status !== 'complete'`, shows a thin top progress bar "Scan in progress — we'll email you when it's ready" and skeleton charts.
- Polls `analyses` row every 4s until status flips. Then renders full data.

## Charts

Use existing `recharts` (already in project via `chart.tsx`):
- 3 score donuts (Intent / Validation / Security) — simple SVG arc, no recharts needed.
- Bar chart: issues count by severity (Fix now / Watch out / Minor).
- Line chart: score trend across last N analyses for this app.

## Files to change

| File | Change |
|---|---|
| `src/components/DashboardSidebar.tsx` | NEW — left nav with lock states, active section highlight |
| `src/components/dashboard/ScoreDonut.tsx` | NEW — SVG donut for a single score |
| `src/components/dashboard/SeverityBar.tsx` | NEW — recharts bar of issue counts |
| `src/components/dashboard/TrendLine.tsx` | NEW — recharts line of scores over time |
| `src/components/dashboard/UpgradeLock.tsx` | NEW — locked-section placeholder w/ upgrade CTA |
| `src/components/dashboard/sections/OverviewSection.tsx` | NEW |
| `src/components/dashboard/sections/IntentSection.tsx` | NEW (uses existing AppUnderstandingCard logic) |
| `src/components/dashboard/sections/SecuritySection.tsx` | NEW (wraps current ReportContent in plain/tech toggle) |
| `src/components/dashboard/sections/SeoSection.tsx` | NEW |
| `src/components/dashboard/sections/LegalSection.tsx` | NEW |
| `src/pages/Dashboard.tsx` | Rewrite: sidebar layout, app switcher in header, route by `?section=`, polling for pending analysis, locked empty state |
| `src/pages/Connect.tsx` | After "Start scan": fire analyze without await, navigate to `/dashboard?analysis=<id>&pending=1` |
| `src/components/DashboardNavbar.tsx` | Slim down (sidebar takes most nav); keep top bar with logo + avatar only |
| `src/components/ReportContent.tsx` | Reused inside SecuritySection |

No DB / edge-function / migration changes needed — all data already exists on the `analyses` row. `analyses.status` already supports polling.

## Out of scope for this iteration
- Real Lighthouse perf data (Performance section is locked/Pro placeholder).
- Real continuous-monitoring webhook UI (placeholder).
- Multi-scan trend line uses whatever history exists; if only one scan, shows a single point with a "Scan again" hint.

## Acceptance
- New user with no apps sees locked sidebar + Connect CTA.
- Completing Connect + questions returns user to dashboard within ~1s; charts skeleton until scan finishes.
- After scan, three score donuts, severity bar, and section drill-downs render.
- Pro-only sections show a clean upgrade card instead of fake data.
