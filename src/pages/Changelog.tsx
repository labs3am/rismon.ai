import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

interface Change {
  type: 'NEW' | 'IMPROVED' | 'FIXED';
  text: string;
}

interface Entry {
  version: string;
  date: string; // ISO
  title: string;
  summary: string;
  changes: Change[];
}

// Reverse-chronological order
const ENTRIES: Entry[] = [
  {
    version: 'v2.3',
    date: '2026-04-22',
    title: 'Admin command center',
    summary:
      'A private admin dashboard for the Rismon team — privacy-safe overview of users, scans and growth, with email alerts on key events.',
    changes: [
      { type: 'NEW', text: 'Admin dashboard at /admin (gated to the Rismon team only).' },
      { type: 'NEW', text: '30-day activity chart of signups & scans.' },
      { type: 'NEW', text: 'Plan distribution, top scanners with last-scan time.' },
      { type: 'NEW', text: 'Inactive users and "no GitHub connected" segments for outreach.' },
      { type: 'NEW', text: 'Email alerts via Resend on every new signup and first completed scan.' },
      { type: 'IMPROVED', text: 'Privacy: admins see metadata only — never user reports, code or scan content.' },
    ],
  },
  {
    version: 'v2.2',
    date: '2026-04-10',
    title: 'Smarter loading & resilience',
    summary:
      'Long scans no longer feel like waiting in the dark. Added live progress, tab-switch warnings and better error recovery.',
    changes: [
      { type: 'NEW', text: 'Live file-by-file progress during scans.' },
      { type: 'NEW', text: 'Stage labels: Reading → Analyzing → Generating fixes.' },
      { type: 'NEW', text: 'Warning when you switch tabs mid-scan (browser throttling kills in-flight work).' },
      { type: 'IMPROVED', text: 'Cleaner indeterminate progress bar with brand accent.' },
      { type: 'FIXED', text: 'Scans timing out silently when the tab was backgrounded.' },
    ],
  },
  {
    version: 'v2.1',
    date: '2026-03-28',
    title: 'Findings you can argue with',
    summary:
      'Every finding can now be reviewed, agreed with, or disputed. Your feedback trains the next scan.',
    changes: [
      { type: 'NEW', text: 'Agree / Disagree pills on every finding.' },
      { type: 'NEW', text: 'Dispute a finding with a written reason — sent to the Rismon team for review.' },
      { type: 'NEW', text: 'AI-summarized review highlights per report.' },
      { type: 'IMPROVED', text: 'Finding cards redesigned for faster triage.' },
    ],
  },
  {
    version: 'v2.0',
    date: '2026-03-15',
    title: 'Rismon v2 — intent verification, not just security scans',
    summary:
      'A complete rewrite. v2 doesn\'t just scan your code for vulnerabilities — it verifies whether your app actually does what your landing page promises.',
    changes: [
      { type: 'NEW', text: 'Intent-match score: how well your code matches your stated product.' },
      { type: 'NEW', text: 'Landing-page promise extraction — we read your site to learn what you sell.' },
      { type: 'NEW', text: 'Smart questions: AI asks you what matters before scanning.' },
      { type: 'NEW', text: 'Code understanding card — a plain-English summary of what your app actually is.' },
      { type: 'NEW', text: 'Gaps section: features you sell but haven\'t built (or built but don\'t sell).' },
      { type: 'NEW', text: 'Platform-aware fix prompts — copy/paste straight into Lovable, Cursor, or Bolt.' },
      { type: 'NEW', text: 'Legal findings: missing privacy policy, terms, cookie consent.' },
      { type: 'NEW', text: 'Pro plan with deeper scans, monitoring and unlimited prompts.' },
      { type: 'IMPROVED', text: 'New dark editorial design across the entire app.' },
      { type: 'IMPROVED', text: '5x faster scans on average.' },
    ],
  },
];

const TYPE_STYLES: Record<Change['type'], { bg: string; color: string; border: string }> = {
  NEW: { bg: 'rgba(249,115,22,0.08)', color: '#f97316', border: 'rgba(249,115,22,0.25)' },
  IMPROVED: { bg: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  FIXED: { bg: 'rgba(34,197,94,0.08)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Changelog() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Changelog — Rismon.ai"
        description="What's new in Rismon. Every shipped feature, improvement and fix — newest first."
        canonicalPath="/changelog"
      />
      <Navbar />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        {/* Header */}
        <div>
          <div
            style={{
              fontSize: 11,
              color: '#f97316',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 16,
              fontWeight: 500,
            }}
          >
            Changelog
          </div>
          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            What's new in Rismon.
          </h1>
          <p style={{ fontSize: 16, color: '#555555', marginTop: 12 }}>
            Every shipped feature, improvement and fix — newest first.
          </p>
        </div>

        <div style={{ height: 1, background: '#1a1a1a', margin: '48px 0' }} />

        {/* Entries */}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {ENTRIES.map((entry, idx) => (
            <li
              key={entry.version}
              className="cl-row"
              style={{ borderTop: idx === 0 ? 'none' : '1px solid #1a1a1a' }}
            >
              <div className="cl-grid">
                {/* Left: meta */}
                <div>
                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#ffffff',
                      background: 'rgba(249,115,22,0.1)',
                      border: '1px solid rgba(249,115,22,0.3)',
                      borderRadius: 8,
                      padding: '4px 12px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {entry.version}
                  </div>
                  <div style={{ fontSize: 13, color: '#555555', marginTop: 12, fontWeight: 500 }}>
                    {formatDate(entry.date)}
                  </div>
                </div>

                {/* Right: content */}
                <div>
                  <h2
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: '#ffffff',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.3,
                      margin: 0,
                    }}
                  >
                    {entry.title}
                  </h2>
                  <p style={{ fontSize: 15, color: '#555555', lineHeight: 1.7, marginTop: 10, maxWidth: 640 }}>
                    {entry.summary}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0' }}>
                    {entry.changes.map((c, i) => {
                      const s = TYPE_STYLES[c.type];
                      return (
                        <li
                          key={i}
                          style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                            padding: '10px 0',
                            borderTop: i === 0 ? 'none' : '1px solid #141414',
                          }}
                        >
                          <span
                            style={{
                              flexShrink: 0,
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              color: s.color,
                              background: s.bg,
                              border: `1px solid ${s.border}`,
                              borderRadius: 999,
                              padding: '3px 10px',
                              minWidth: 78,
                              textAlign: 'center',
                              marginTop: 2,
                            }}
                          >
                            {c.type}
                          </span>
                          <span style={{ fontSize: 14.5, color: '#cccccc', lineHeight: 1.6 }}>{c.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Footer note */}
        <div
          style={{
            marginTop: 64,
            padding: 28,
            borderRadius: 14,
            border: '1px solid #1a1a1a',
            background: '#0a0a0a',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 14, color: '#a1a1aa', margin: 0 }}>
            Want deep-dives on each release?{' '}
            <Link to="/blog" style={{ color: '#f97316', textDecoration: 'none' }}>
              Read the blog →
            </Link>
          </p>
        </div>

        <style>{`
          .cl-row { padding: 48px 0; }
          .cl-grid {
            display: grid;
            grid-template-columns: 1fr 2.5fr;
            gap: 48px;
          }
          @media (max-width: 767px) {
            .cl-row { padding: 32px 0; }
            .cl-grid { grid-template-columns: 1fr; gap: 20px; }
          }
        `}</style>
      </main>

      <Footer />
    </div>
  );
}
