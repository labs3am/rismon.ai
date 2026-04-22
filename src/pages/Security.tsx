import { Link } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, GitBranch, Lock, Database, Trash2, Github, KeyRound, FileCode2, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

const GITHUB_REPO_URL = 'https://github.com/labs3am/rismon.ai';

/* ---------- Tiny presentational primitives ---------- */

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontSize: 11,
      color: '#f97316',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      marginBottom: 14,
      fontWeight: 500,
    }}
  >
    {children}
  </div>
);

const SectionHeadline = ({ children }: { children: React.ReactNode }) => (
  <h2
    style={{
      fontSize: 'clamp(26px, 3.4vw, 36px)',
      fontWeight: 600,
      color: '#ffffff',
      letterSpacing: '-0.02em',
      lineHeight: 1.15,
      margin: 0,
      maxWidth: 720,
    }}
  >
    {children}
  </h2>
);

const SectionLead = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 16, color: '#777777', lineHeight: 1.7, marginTop: 16, maxWidth: 680 }}>{children}</p>
);

function PrincipleCard({ icon: Icon, title, body }: { icon: typeof ShieldCheck; title: string; body: string }) {
  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid #161616',
        borderRadius: 14,
        padding: 24,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'rgba(249,115,22,0.08)',
          border: '1px solid rgba(249,115,22,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f97316',
          marginBottom: 16,
        }}
      >
        <Icon size={18} />
      </div>
      <h3 style={{ color: '#ffffff', fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
      <p style={{ color: '#888888', fontSize: 14, lineHeight: 1.65, margin: '8px 0 0' }}>{body}</p>
    </div>
  );
}

function CanRow({ allowed, children }: { allowed: boolean; children: React.ReactNode }) {
  return (
    <li
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '14px 0',
        borderTop: '1px solid #141414',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: 999,
          background: allowed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${allowed ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}`,
          color: allowed ? '#4ade80' : '#f87171',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          marginTop: 1,
        }}
        aria-hidden
      >
        {allowed ? '✓' : '✕'}
      </span>
      <span style={{ color: '#cccccc', fontSize: 14.5, lineHeight: 1.6 }}>{children}</span>
    </li>
  );
}

function DataRow({ field, retention, who }: { field: string; retention: string; who: string }) {
  return (
    <tr style={{ borderTop: '1px solid #141414' }}>
      <td style={{ padding: '14px 16px', color: '#ffffff', fontSize: 14, fontWeight: 500, verticalAlign: 'top' }}>{field}</td>
      <td style={{ padding: '14px 16px', color: '#a3a3a3', fontSize: 14, verticalAlign: 'top' }}>{retention}</td>
      <td style={{ padding: '14px 16px', color: '#a3a3a3', fontSize: 14, verticalAlign: 'top' }}>{who}</td>
    </tr>
  );
}

/* ---------- Page ---------- */

export default function Security() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Security & Trust — Rismon.ai"
        description="How Rismon protects your code: read-only GitHub access, code never stored, what data we keep, and exactly what our team can and cannot see."
        canonicalPath="/security"
      />
      <Navbar />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 120px' }}>
        {/* Hero */}
        <div style={{ maxWidth: 760 }}>
          <SectionLabel>Security &amp; Trust</SectionLabel>
          <h1
            style={{
              fontSize: 'clamp(36px, 5.5vw, 56px)',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Your code stays yours.
            <br />
            <span style={{ color: '#666666' }}>We just read it, then forget it.</span>
          </h1>
          <p style={{ fontSize: 17, color: '#888888', lineHeight: 1.65, marginTop: 20 }}>
            Rismon scans your repository to produce a report — it never writes to your code, never persists your source,
            and only stores the findings you see in your dashboard. Below: exactly how it works, what we keep, and what
            our team can and cannot see.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#ffffff',
                color: '#000000',
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              <Github size={16} />
              Verify on GitHub
            </a>
            <Link
              to="/privacy"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                color: '#cccccc',
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                border: '1px solid #1f1f1f',
                textDecoration: 'none',
              }}
            >
              Read Privacy Policy
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Principles */}
        <section style={{ marginTop: 96 }}>
          <SectionLabel>Principles</SectionLabel>
          <SectionHeadline>Four guarantees we engineered into the product.</SectionHeadline>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              marginTop: 40,
            }}
          >
            <PrincipleCard
              icon={EyeOff}
              title="Read-only access"
              body="We request read scopes on GitHub. We literally cannot push, merge, open PRs, or change a single line."
            />
            <PrincipleCard
              icon={Trash2}
              title="Code never stored"
              body="Your source is fetched into memory, scanned, then discarded. Nothing touches our database."
            />
            <PrincipleCard
              icon={Github}
              title="Open source"
              body="Every line that handles your code is public. Read it, audit it, fork it — don't take our word for it."
            />
            <PrincipleCard
              icon={Lock}
              title="You own the report"
              body="Findings are saved to your account only. Delete your account and the report is gone — no backups, no archives."
            />
          </div>
        </section>

        {/* How a scan works */}
        <section style={{ marginTop: 120 }}>
          <SectionLabel>How a scan works</SectionLabel>
          <SectionHeadline>The exact data path, end to end.</SectionHeadline>
          <SectionLead>
            Six steps. Nothing hidden, nothing shipped to a third party we don't list. The whole flow is in our public
            repository if you want to read the source.
          </SectionLead>

          <ol style={{ listStyle: 'none', padding: 0, margin: '40px 0 0', counterReset: 'step' }}>
            {[
              {
                title: 'You connect GitHub',
                body:
                  'OAuth with read-only scopes (public_repo or repo:read). You can revoke access anytime from GitHub Settings → Applications.',
              },
              {
                title: 'We fetch a snapshot',
                body:
                  'For each scan, we pull the current branch as a tarball over HTTPS into a short-lived sandboxed worker. No clone is persisted.',
              },
              {
                title: 'We read your live URL',
                body:
                  'We fetch the public HTML of the URL you provided to extract product promises. We do not log in, click, or interact.',
              },
              {
                title: 'AI analysis runs in memory',
                body:
                  'Code and landing-page text are sent to our LLM provider for analysis. Provider terms forbid training on customer data.',
              },
              {
                title: 'Findings are written to your account',
                body:
                  'Only the report (scores, summaries, file/line references) is persisted. The raw source is never written to disk.',
              },
              {
                title: 'Worker is destroyed',
                body:
                  'The sandbox is torn down at the end of every scan. No cache, no temp files, no leftover artifacts.',
              },
            ].map((s, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  gap: 20,
                  padding: '20px 0',
                  borderTop: i === 0 ? '1px solid #1a1a1a' : '1px solid #141414',
                  borderBottom: i === 5 ? '1px solid #1a1a1a' : 'none',
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: '#0a0a0a',
                    border: '1px solid #1f1f1f',
                    color: '#777777',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 style={{ color: '#ffffff', fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
                    {s.title}
                  </h3>
                  <p style={{ color: '#888888', fontSize: 14.5, lineHeight: 1.65, margin: '6px 0 0', maxWidth: 720 }}>
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* What our team can / cannot see */}
        <section style={{ marginTop: 120 }}>
          <SectionLabel>Team access</SectionLabel>
          <SectionHeadline>What the Rismon team can and cannot see.</SectionHeadline>
          <SectionLead>
            We hold ourselves to the same rules we'd want a vendor to hold to us. Most of the time we see less than you'd
            expect from a typical SaaS — by design.
          </SectionLead>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 24,
              marginTop: 40,
            }}
          >
            <div style={{ background: '#0a0a0a', border: '1px solid #161616', borderRadius: 14, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Eye size={16} style={{ color: '#4ade80' }} />
                <h3 style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, margin: 0 }}>What we CAN see</h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
                <CanRow allowed>Your email, plan, and account creation date.</CanRow>
                <CanRow allowed>Scan metadata: when, how long, success or failure, file count.</CanRow>
                <CanRow allowed>Repository name and the live URL you submitted.</CanRow>
                <CanRow allowed>Disputes you submit when you Disagree with a finding (the reason, not your code).</CanRow>
                <CanRow allowed>Aggregated, anonymized usage stats for product analytics.</CanRow>
              </ul>
            </div>

            <div style={{ background: '#0a0a0a', border: '1px solid #161616', borderRadius: 14, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <EyeOff size={16} style={{ color: '#f87171' }} />
                <h3 style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, margin: 0 }}>What we CANNOT see</h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
                <CanRow allowed={false}>Your source code. It's never written to our database.</CanRow>
                <CanRow allowed={false}>The contents of your reports, findings, or fix prompts.</CanRow>
                <CanRow allowed={false}>Your environment variables, secrets, or .env files.</CanRow>
                <CanRow allowed={false}>Your Supabase data, database rows, or production traffic.</CanRow>
                <CanRow allowed={false}>Anything from private repositories you haven't connected to Rismon.</CanRow>
              </ul>
            </div>
          </div>
        </section>

        {/* Data retention */}
        <section style={{ marginTop: 120 }}>
          <SectionLabel>Data retention</SectionLabel>
          <SectionHeadline>Exactly what we keep, for how long, and who can access it.</SectionHeadline>

          <div
            style={{
              marginTop: 40,
              border: '1px solid #1a1a1a',
              borderRadius: 14,
              overflow: 'hidden',
              background: '#0a0a0a',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0d0d0d' }}>
                  <th style={{ textAlign: 'left', padding: '14px 16px', color: '#777777', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Data
                  </th>
                  <th style={{ textAlign: 'left', padding: '14px 16px', color: '#777777', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Retention
                  </th>
                  <th style={{ textAlign: 'left', padding: '14px 16px', color: '#777777', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Who can access
                  </th>
                </tr>
              </thead>
              <tbody>
                <DataRow field="Source code" retention="Never written to disk. Discarded the moment a scan completes." who="Nobody. Not even you — re-scan to read it again." />
                <DataRow field="Scan reports & findings" retention="Kept until you delete the report or your account." who="Only you. Encrypted at rest, RLS-protected per user." />
                <DataRow field="GitHub OAuth token" retention="Stored encrypted while the connection is active. Deleted when you disconnect." who="The scan worker only. Revocable from GitHub Settings." />
                <DataRow field="Account info (email, name, plan)" retention="Until you delete your account." who="You, plus the Rismon team for support." />
                <DataRow field="Scan metadata (timestamps, duration, file count)" retention="24 months for product analytics." who="The Rismon team. Aggregated for usage stats." />
                <DataRow field="Disputes & feedback" retention="Until reviewed, then archived for model improvement." who="The Rismon team. Your reason text only — never your code." />
                <DataRow field="Server logs" retention="30 days, then automatically purged." who="The Rismon team for debugging. No source code is ever logged." />
              </tbody>
            </table>
          </div>

          <p style={{ color: '#666666', fontSize: 13, marginTop: 16, lineHeight: 1.6 }}>
            Want everything gone? Settings → Delete account purges all of the above immediately. There are no backups
            you'd need to wait on.
          </p>
        </section>

        {/* Infrastructure */}
        <section style={{ marginTop: 120 }}>
          <SectionLabel>Infrastructure</SectionLabel>
          <SectionHeadline>The boring details, made explicit.</SectionHeadline>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
              marginTop: 40,
            }}
          >
            <PrincipleCard icon={Database} title="Encrypted storage" body="All data at rest is AES-256 encrypted. All traffic is TLS 1.3. Database access is gated by row-level security." />
            <PrincipleCard icon={KeyRound} title="OAuth scopes" body="Public repos use public_repo. Private repos require repo:read. We never request write, admin, or delete." />
            <PrincipleCard icon={GitBranch} title="Branch isolation" body="A scan only ever touches the branch you select. We don't enumerate or read other branches." />
            <PrincipleCard icon={FileCode2} title="Sandboxed workers" body="Every scan runs in an isolated, ephemeral sandbox. It's destroyed at the end of the scan — no shared filesystem." />
          </div>
        </section>

        {/* Open source CTA */}
        <section
          style={{
            marginTop: 120,
            padding: '40px 32px',
            background: 'linear-gradient(180deg, #0a0a0a 0%, #060606 100%)',
            border: '1px solid #1a1a1a',
            borderRadius: 16,
            textAlign: 'center',
          }}
        >
          <Github size={28} style={{ color: '#f97316', margin: '0 auto 16px' }} />
          <h2 style={{ color: '#ffffff', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
            Don't trust us. Verify us.
          </h2>
          <p style={{ color: '#888888', fontSize: 15, lineHeight: 1.6, margin: '12px auto 0', maxWidth: 540 }}>
            Every line of code that handles your repository is on GitHub. Read it, fork it, file an issue — that's the
            whole point of being open source.
          </p>
          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 12, marginTop: 24, justifyContent: 'center' }}>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#ffffff',
                color: '#000000',
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              <Github size={16} />
              View the repository
            </a>
            <Link
              to="/contact"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                color: '#cccccc',
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                border: '1px solid #1f1f1f',
                textDecoration: 'none',
              }}
            >
              Report a security issue
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}