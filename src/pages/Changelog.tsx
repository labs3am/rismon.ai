import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { parseChangelog, type Change } from '@/lib/changelog-parser';
import { CHANGELOG_SOURCE } from '@/data/changelog';

// Parsed once at module load. Edit src/data/changelog.ts to add a release.
const ENTRIES = parseChangelog(CHANGELOG_SOURCE);

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
