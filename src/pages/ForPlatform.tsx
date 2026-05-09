import { useParams, Link, Navigate } from 'react-router-dom';
import { Check, AlertTriangle, ArrowRight, ShieldCheck, Eye, Wand2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

type PlatformKey = 'lovable' | 'bolt' | 'cursor';

interface PlatformContent {
  name: string;
  tagline: string;
  intro: string;
  pitfalls: { title: string; body: string }[];
  checks: string[];
  workflow: string;
}

const CONTENT: Record<PlatformKey, PlatformContent> = {
  lovable: {
    name: 'Lovable',
    tagline: 'Built your app on Lovable? Make sure it actually ships.',
    intro:
      "Lovable lets you describe an app and watch it appear. The frontend looks great, the flows work — but is the Supabase setup safe? Are your RLS policies real? Rismon scans your Lovable project end-to-end and tells you what to fix.",
    pitfalls: [
      { title: 'RLS off on user-data tables', body: 'Lovable scaffolds Supabase tables fast. If RLS isn\'t enabled, anyone with the anon key can read every row.' },
      { title: 'Supabase keys in the bundle', body: 'The anon key is fine in the client. The service-role key is not. We check.' },
      { title: 'Auth flows that don\'t actually authenticate', body: 'Routes marked "protected" that read from localStorage instead of the session. We catch the pattern.' },
      { title: 'Privacy policy promises the code doesn\'t keep', body: 'Generated policies often mention features (cookies, analytics, deletion) that the app never implements.' },
    ],
    checks: [
      'Supabase RLS coverage on every public table',
      'Service-role and other secrets accidentally exposed to the client',
      'Edge function auth and CORS configuration',
      'Auth gating on protected routes (real session check vs. localStorage)',
      'Stripe webhook signature verification',
      'Privacy policy ↔ actual data collection alignment',
    ],
    workflow: 'Connect your GitHub repo (read-only), run a free scan, paste the fix prompt back into Lovable. Done in under 5 minutes.',
  },
  bolt: {
    name: 'Bolt',
    tagline: 'Shipped a Bolt app? Find what the AI quietly skipped.',
    intro:
      "Bolt is fast — sometimes faster than the safety checks deserve. Rismon reads what your Bolt project actually does, then tells you in plain English what's missing before real users hit it.",
    pitfalls: [
      { title: 'Hard-coded API keys in client code', body: 'OpenAI, Stripe, third-party keys committed straight into the bundle. We grep with intent.' },
      { title: 'Missing input validation on serverless routes', body: 'Edge functions that trust whatever the client sends. We flag the unsanitized inputs.' },
      { title: 'CORS set to "*" in production', body: 'Convenient during dev, dangerous in prod. Rismon catches it.' },
      { title: 'No rate limiting on expensive endpoints', body: 'AI-call endpoints that any visitor can hammer. Costs spiral; we warn early.' },
    ],
    checks: [
      'Secrets and API keys in client bundles',
      'Server-route input validation gaps',
      'CORS, CSP and security headers',
      'Rate limiting on LLM and payment endpoints',
      'Database query patterns that leak across users',
      'Privacy / Terms alignment with actual code behavior',
    ],
    workflow: 'Push your Bolt app to GitHub, connect the repo to Rismon, get a verdict in 90 seconds. Fix prompt is paste-ready.',
  },
  cursor: {
    name: 'Cursor',
    tagline: 'Cursor wrote half your codebase. Rismon reads all of it.',
    intro:
      "Cursor is great at writing code. It's not great at remembering what it wrote three sessions ago. Rismon scans the whole repo with fresh eyes and surfaces the contradictions, drift, and gaps that build up over weeks of AI-assisted coding.",
    pitfalls: [
      { title: 'Conflicting auth patterns', body: 'Different sessions, different solutions. Three ways to check "is the user logged in" — only one works.' },
      { title: 'Dead routes still wired up', body: 'Endpoints from a refactor that was never finished. Sometimes they still leak data.' },
      { title: 'Half-migrated database schemas', body: 'Old columns referenced alongside new ones. Queries silently return wrong results.' },
      { title: 'Env vars referenced but never set', body: 'Code paths that rely on `process.env.X` where X is never defined in prod.' },
    ],
    checks: [
      'Auth pattern consistency across the codebase',
      'Dead routes and orphaned API endpoints',
      'Environment variables used but not configured',
      'Schema drift between code and migrations',
      'Secret exposure in committed files',
      'Stated features vs. actually-shipped behavior',
    ],
    workflow: 'Point Rismon at your repo. We read every file, run cross-checks, and hand back a report with file-and-line evidence for each finding.',
  },
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, color: '#f97316', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14, fontWeight: 500 }}>{children}</div>
);

export default function ForPlatform() {
  const { platform } = useParams<{ platform: string }>();
  const key = (platform || '').toLowerCase() as PlatformKey;

  if (!CONTENT[key]) {
    return <Navigate to="/" replace />;
  }

  const c = CONTENT[key];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Rismon for ${c.name} — Scan your AI-built app`}
        description={`${c.tagline} Rismon reviews ${c.name} apps for security gaps, intent drift, and legal mismatches. Free first scan.`}
        canonicalPath={`/for/${key}`}
      />
      <Navbar />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        {/* Hero */}
        <section style={{ maxWidth: 780 }}>
          <Label>Rismon for {c.name}</Label>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0 }}>
            {c.tagline}
          </h1>
          <p style={{ fontSize: 18, color: '#888888', lineHeight: 1.7, marginTop: 20 }}>{c.intro}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ffffff', color: '#000000', padding: '11px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              Scan my {c.name} app <ArrowRight size={14} />
            </Link>
            <Link to="/sample-report" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#ffffff', padding: '11px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', border: '1px solid #222222' }}>
              See a sample report
            </Link>
          </div>
        </section>

        {/* Common pitfalls */}
        <section style={{ marginTop: 96 }}>
          <Label>What we keep finding</Label>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', margin: '0 0 28px', maxWidth: 700 }}>
            The four things {c.name} apps ship with — by accident.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {c.pitfalls.map((p, i) => (
              <div key={i} style={{ background: '#0a0a0a', border: '1px solid #161616', borderRadius: 14, padding: 22 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1a0e06', border: '1px solid #3a1d0c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', marginBottom: 14 }}>
                  <AlertTriangle size={15} />
                </div>
                <h3 style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, margin: 0, letterSpacing: '-0.005em' }}>{p.title}</h3>
                <p style={{ color: '#888888', fontSize: 14, lineHeight: 1.65, margin: '8px 0 0' }}>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Checks */}
        <section style={{ marginTop: 96 }}>
          <Label>What we check</Label>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', margin: '0 0 28px', maxWidth: 700 }}>
            Every scan covers these — at minimum.
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
            {c.checks.map((check, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', background: '#0a0a0a', border: '1px solid #161616', borderRadius: 10 }}>
                <Check size={16} style={{ color: '#f97316', flexShrink: 0, marginTop: 2 }} />
                <span style={{ color: '#cccccc', fontSize: 14, lineHeight: 1.5 }}>{check}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Workflow */}
        <section style={{ marginTop: 96 }}>
          <Label>How it works with {c.name}</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 24 }}>
            {[
              { icon: Eye, title: 'Connect read-only', body: 'GitHub OAuth with read-only scope. Source is never stored.' },
              { icon: ShieldCheck, title: 'Scan in 90 seconds', body: 'We read every file, check intent vs. behavior, and rank findings by severity.' },
              { icon: Wand2, title: 'Paste the fix prompt', body: `Each finding ships with a fix prompt you can paste back into ${c.name}.` },
            ].map((step, i) => (
              <div key={i} style={{ background: '#0a0a0a', border: '1px solid #161616', borderRadius: 14, padding: 22 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1a0e06', border: '1px solid #3a1d0c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', marginBottom: 14 }}>
                  <step.icon size={16} />
                </div>
                <div style={{ color: '#444444', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>STEP {i + 1}</div>
                <h3 style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, margin: 0 }}>{step.title}</h3>
                <p style={{ color: '#888888', fontSize: 14, lineHeight: 1.6, margin: '6px 0 0' }}>{step.body}</p>
              </div>
            ))}
          </div>
          <p style={{ color: '#777777', fontSize: 14, lineHeight: 1.7, marginTop: 24, maxWidth: 720 }}>{c.workflow}</p>
        </section>

        {/* CTA */}
        <section style={{ marginTop: 96, textAlign: 'center', maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
            Run your first {c.name} scan free.
          </h2>
          <p style={{ fontSize: 15, color: '#888888', lineHeight: 1.7, marginTop: 14 }}>
            No credit card. Read-only access. Real verdict in under 90 seconds.
          </p>
          <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 24, background: '#ffffff', color: '#000000', padding: '12px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            Get started <ArrowRight size={14} />
          </Link>
          <div style={{ marginTop: 32, fontSize: 13, color: '#555555' }}>
            Also for{' '}
            {(['lovable', 'bolt', 'cursor'] as PlatformKey[]).filter(p => p !== key).map((p, i, arr) => (
              <span key={p}>
                <Link to={`/for/${p}`} style={{ color: '#888888', textDecoration: 'underline', textUnderlineOffset: 3 }}>{CONTENT[p].name}</Link>
                {i < arr.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}