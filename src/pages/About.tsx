import { Link } from 'react-router-dom';
import { Sparkles, Eye, ShieldCheck, Github, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

const GITHUB_REPO_URL = 'https://github.com/labs3am/rismon.ai';

const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, color: '#f97316', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14, fontWeight: 500 }}>{children}</div>
);

function ValueCard({ icon: Icon, title, body }: { icon: typeof Sparkles; title: string; body: string }) {
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #161616', borderRadius: 14, padding: 24 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', marginBottom: 16 }}>
        <Icon size={18} />
      </div>
      <h3 style={{ color: '#ffffff', fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
      <p style={{ color: '#888888', fontSize: 14, lineHeight: 1.65, margin: '8px 0 0' }}>{body}</p>
    </div>
  );
}

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="About — Rismon.ai"
        description="Why we built Rismon: every founder shipping with AI deserves to understand what their app actually does — and whether it's safe."
        canonicalPath="/about"
      />
      <Navbar />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        {/* Hero */}
        <section style={{ maxWidth: 760 }}>
          <Label>About Rismon</Label>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0 }}>
            Every founder deserves to understand what they built.
          </h1>
          <p style={{ fontSize: 18, color: '#888888', lineHeight: 1.7, marginTop: 20 }}>
            AI made shipping software easy. It also made shipping <em style={{ fontStyle: 'normal', color: '#ffffff' }}>broken</em> software easy. Rismon reads what your AI built, explains it in plain English, and tells you exactly what to fix — with proof.
          </p>
        </section>

        {/* Story */}
        <section style={{ marginTop: 80, display: 'grid', gridTemplateColumns: '1fr', gap: 24, maxWidth: 760 }}>
          <Label>The story</Label>
          <div style={{ fontSize: 16, color: '#aaaaaa', lineHeight: 1.85 }}>
            <p style={{ margin: '0 0 18px' }}>
              We watched friends ship AI-built apps to production — beautiful landing pages, working flows, real users. And then we'd open the code.
            </p>
            <p style={{ margin: '0 0 18px' }}>
              Hard-coded API keys. RLS turned off. Auth that didn't actually authenticate. Privacy policies that promised things the code never did. Not because anyone was careless — because nobody had read it.
            </p>
            <p style={{ margin: 0 }}>
              Rismon exists so that founders shipping with Lovable, Bolt, Cursor, or any AI tool can know what they shipped. Every scan ends with a clear verdict, evidence you can verify, and a fix prompt you can paste back into your editor.
            </p>
          </div>
        </section>

        {/* Principles */}
        <section style={{ marginTop: 80 }}>
          <Label>What we believe</Label>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', margin: '0 0 32px', maxWidth: 640 }}>
            Three principles guide every line of Rismon.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <ValueCard icon={Eye} title="Transparency over magic" body="Every finding includes the file, the line, and the reason. No black boxes. If we can't show you proof, we don't ship the finding." />
            <ValueCard icon={ShieldCheck} title="Safe by default" body="Read-only GitHub access. Your source is never stored. Reports live behind RLS. We treat your code the way we'd want ours treated." />
            <ValueCard icon={Sparkles} title="Built for builders" body="We're founders too. The fix prompt is the feature — paste, ship, move on. Rismon should feel like a senior engineer reviewing your PR, not a compliance form." />
          </div>
        </section>

        {/* Open source callout */}
        <section style={{ marginTop: 96, padding: 32, background: '#0a0a0a', border: '1px solid #161616', borderRadius: 16 }}>
          <Label>Open source</Label>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#ffffff', margin: '0 0 12px', letterSpacing: '-0.015em' }}>
            Rismon is open source.
          </h2>
          <p style={{ fontSize: 15, color: '#888888', lineHeight: 1.7, margin: '0 0 20px', maxWidth: 600 }}>
            You don't have to trust us — you can read the scanner. Inspect the prompts, check the data flows, file an issue, or fork it.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ffffff', color: '#000000', padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              <Github size={16} /> View on GitHub
            </a>
            <Link to="/open-source" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#aaaaaa', padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', border: '1px solid #222222' }}>
              How it's built <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section style={{ marginTop: 96, textAlign: 'center', maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
            Scan your app. Sleep better tonight.
          </h2>
          <p style={{ fontSize: 15, color: '#888888', lineHeight: 1.7, marginTop: 14 }}>
            One free scan. No credit card. You'll get a real verdict in under 90 seconds.
          </p>
          <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 24, background: '#ffffff', color: '#000000', padding: '12px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            Run a free scan <ArrowRight size={14} />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}