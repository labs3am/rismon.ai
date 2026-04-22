/**
 * Release notes — newest first, separated by `---` on its own line.
 *
 * Header format:  # <version> — <YYYY-MM-DD> — <title>
 * Then a summary paragraph, then bullet lines:
 *   - NEW: …
 *   - IMPROVED: …
 *   - FIXED: …
 *
 * To ship a new release, paste a new block at the top.
 */
export const CHANGELOG_SOURCE = `
# v2.3 — 2026-04-22 — Admin command center
A private admin dashboard for the Rismon team — privacy-safe overview of users, scans and growth, with email alerts on key events.

- NEW: Admin dashboard at /admin (gated to the Rismon team only).
- NEW: 30-day activity chart of signups & scans.
- NEW: Plan distribution, top scanners with last-scan time.
- NEW: Inactive users and "no GitHub connected" segments for outreach.
- NEW: Email alerts via Resend on every new signup and first completed scan.
- IMPROVED: Privacy: admins see metadata only — never user reports, code or scan content.

---

# v2.2 — 2026-04-10 — Smarter loading & resilience
Long scans no longer feel like waiting in the dark. Added live progress, tab-switch warnings and better error recovery.

- NEW: Live file-by-file progress during scans.
- NEW: Stage labels: Reading → Analyzing → Generating fixes.
- NEW: Warning when you switch tabs mid-scan (browser throttling kills in-flight work).
- IMPROVED: Cleaner indeterminate progress bar with brand accent.
- FIXED: Scans timing out silently when the tab was backgrounded.

---

# v2.1 — 2026-03-28 — Findings you can argue with
Every finding can now be reviewed, agreed with, or disputed. Your feedback trains the next scan.

- NEW: Agree / Disagree pills on every finding.
- NEW: Dispute a finding with a written reason — sent to the Rismon team for review.
- NEW: AI-summarized review highlights per report.
- IMPROVED: Finding cards redesigned for faster triage.

---

# v2.0 — 2026-03-15 — Rismon v2 — intent verification, not just security scans
A complete rewrite. v2 doesn't just scan your code for vulnerabilities — it verifies whether your app actually does what your landing page promises.

- NEW: Intent-match score: how well your code matches your stated product.
- NEW: Landing-page promise extraction — we read your site to learn what you sell.
- NEW: Smart questions: AI asks you what matters before scanning.
- NEW: Code understanding card — a plain-English summary of what your app actually is.
- NEW: Gaps section: features you sell but haven't built (or built but don't sell).
- NEW: Platform-aware fix prompts — copy/paste straight into Lovable, Cursor, or Bolt.
- NEW: Legal findings: missing privacy policy, terms, cookie consent.
- NEW: Pro plan with deeper scans, monitoring and unlimited prompts.
- IMPROVED: New dark editorial design across the entire app.
- IMPROVED: 5x faster scans on average.
`;