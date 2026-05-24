import { Link } from 'react-router-dom';
import { Github, Star, GitFork, Scale, BookOpen, Bug, ArrowRight, GitPullRequest } from 'lucide-react';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

const GITHUB_REPO_URL = 'https://github.com/labs3am/rismon.ai';
const GITHUB_API_URL = 'https://api.github.com/repos/labs3am/rismon.ai';

const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, color: '#f97316', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14, fontWeight: 500 }}>{children}</div>
);

function StatCard({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #161616', borderRadius: 14, padding: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1a0e06', border: '1px solid #3a1d0c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', flexShrink: 0 }}>
        <Icon size={16} />
      </div>
      <div>
        <div style={{ color: '#ffffff', fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>{value}</div>
        <div style={{ color: '#777777', fontSize: 12, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function PathCard({ icon: Icon, title, body, href, cta }: { icon: typeof BookOpen; title: string; body: string; href: string; cta: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'block', background: '#0a0a0a', border: '1px solid #161616', borderRadius: 14, padding: 24, textDecoration: 'none', transition: 'border-color 0.15s' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#161616')}
    >
      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1a0e06', border: '1px solid #3a1d0c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', marginBottom: 16 }}>
        <Icon size={18} />
      </div>
      <h3 style={{ color: '#ffffff', fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
      <p style={{ color: '#888888', fontSize: 14, lineHeight: 1.65, margin: '8px 0 14px' }}>{body}</p>
      <span style={{ color: '#f97316', fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {cta} <ArrowRight size={13} />
      </span>
    </a>
  );
}

export default function OpenSource() {
  const [stars, setStars] = useState<number | null>(null);
  const [forks, setForks] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(GITHUB_API_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          if (typeof data.stargazers_count === 'number') setStars(data.stargazers_count);
          if (typeof data.forks_count === 'number') setForks(data.forks_count);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const fmt = (n: number | null) => n === null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Open Source — Rismon.ai"
        description="Rismon is open source. Read the scanner, inspect the prompts, file issues, or fork it. MIT-licensed and built in public."
        canonicalPath="/open-source"
        robots="index, follow"
      />
      <Navbar />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        {/* Hero */}
        <section style={{ maxWidth: 760 }}>
          <Label>Open source</Label>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0 }}>
            Don't trust us. <span style={{ color: '#f97316' }}>Read the code.</span>
          </h1>
          <p style={{ fontSize: 18, color: '#888888', lineHeight: 1.7, marginTop: 20 }}>
            Rismon scans your code, so it'd be strange if you couldn't scan ours. The whole project is on GitHub under the MIT license — prompts, scanners, edge functions, frontend. Inspect anything.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ffffff', color: '#000000', padding: '11px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              <Github size={16} /> Star on GitHub
            </a>
            <a href={`${GITHUB_REPO_URL}/issues/new`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#ffffff', padding: '11px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', border: '1px solid #222222' }}>
              <Bug size={15} /> Open an issue
            </a>
          </div>
        </section>

        {/* Stats */}
        <section style={{ marginTop: 64, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <StatCard icon={Star} label="GitHub stars" value={fmt(stars)} />
          <StatCard icon={GitFork} label="Forks" value={fmt(forks)} />
          <StatCard icon={Scale} label="License" value="MIT" />
        </section>

        {/* Why OSS */}
        <section style={{ marginTop: 96 }}>
          <Label>Why open source</Label>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', margin: '0 0 28px', maxWidth: 640 }}>
            A security tool you can't audit isn't a security tool.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div style={{ background: '#0a0a0a', border: '1px solid #161616', borderRadius: 14, padding: 24 }}>
              <h3 style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, margin: 0 }}>You see what we send to the LLM</h3>
              <p style={{ color: '#888888', fontSize: 14, lineHeight: 1.65, margin: '8px 0 0' }}>Every prompt, every redaction rule, every output schema lives in the repo. No surprises.</p>
            </div>
            <div style={{ background: '#0a0a0a', border: '1px solid #161616', borderRadius: 14, padding: 24 }}>
              <h3 style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, margin: 0 }}>You can self-host</h3>
              <p style={{ color: '#888888', fontSize: 14, lineHeight: 1.65, margin: '8px 0 0' }}>For teams that need code never leaves their infra, fork it and run it yourself. Bring your own LLM key.</p>
            </div>
            <div style={{ background: '#0a0a0a', border: '1px solid #161616', borderRadius: 14, padding: 24 }}>
              <h3 style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, margin: 0 }}>You can contribute checks</h3>
              <p style={{ color: '#888888', fontSize: 14, lineHeight: 1.65, margin: '8px 0 0' }}>Found a class of bug we miss? Add it. New checks ship to every Rismon user the moment they're merged.</p>
            </div>
          </div>
        </section>

        {/* Get involved */}
        <section style={{ marginTop: 96 }}>
          <Label>Get involved</Label>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', margin: '0 0 28px', maxWidth: 640 }}>
            Three ways to help.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <PathCard icon={Star} title="Star the repo" body="Lowest-effort, highest-impact. Stars help other founders find Rismon when they search GitHub." href={GITHUB_REPO_URL} cta="Open repo" />
            <PathCard icon={Bug} title="Report a missed finding" body="Got a real-world bug Rismon should have caught? Open an issue with the repo URL and we'll add a check." href={`${GITHUB_REPO_URL}/issues/new`} cta="File an issue" />
            <PathCard icon={GitPullRequest} title="Send a PR" body="Improvements to prompts, new checks, doc fixes — all welcome. Read the contributing guide first." href={`${GITHUB_REPO_URL}/blob/main/README.md`} cta="Read the guide" />
          </div>
        </section>

        {/* License */}
        <section style={{ marginTop: 96, padding: 28, background: '#0a0a0a', border: '1px solid #161616', borderRadius: 14, maxWidth: 760 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#f97316', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <Scale size={14} /> MIT License
          </div>
          <p style={{ fontSize: 15, color: '#aaaaaa', lineHeight: 1.7, margin: '12px 0 0' }}>
            Use Rismon for anything — commercial, personal, internal. Modify it, redistribute it, ship it. The only ask: keep the license notice. Read the full text in the repo.
          </p>
        </section>

        {/* CTA */}
        <section style={{ marginTop: 96, textAlign: 'center', maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
            Try the hosted version.
          </h2>
          <p style={{ fontSize: 15, color: '#888888', lineHeight: 1.7, marginTop: 14 }}>
            Same scanner, zero setup. Free scan, no credit card.
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