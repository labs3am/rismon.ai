import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe, CheckCircle2, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';

type Promise_ = {
  claim: string;
  category: string;
  clarity: 'clear' | 'vague';
  why: string;
};

type AuditResult = {
  url: string;
  host: string;
  title: string;
  description: string;
  promises: Promise_[];
  clarity_score: number | null;
  promise_count: number;
  clear_count: number;
  vague_count: number;
  remaining_today: number;
};

const CAT_LABEL: Record<string, string> = {
  ai: 'AI', auth: 'Auth', payments: 'Payments', integration: 'Integration',
  data: 'Data', security: 'Security', performance: 'Performance',
  support: 'Support', feature: 'Feature', other: 'Other',
};

export default function PromiseAudit() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  const runAudit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('public-promise-audit', {
        body: { url: trimmed },
      });
      if (fnError) {
        setError((fnError as any)?.context?.error || fnError.message || 'Something went wrong.');
        return;
      }
      if ((data as any)?.error) {
        setError((data as any).error);
        return;
      }
      setResult(data as AuditResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#000', color: '#fff' }}>
      <SEO
        title="Promise Audit — Free, no login | Rismon"
        description="Paste any URL. We extract every claim your homepage makes and grade how concrete vs. vague your marketing is. No login. No repo. 60 seconds."
        canonicalPath="/promise-audit"
      />
      <Navbar />

      <main>
        {/* HERO + FORM */}
        <section className="px-5 sm:px-6 pt-16 sm:pt-20 pb-12" style={{ background: '#000' }}>
          <div className="max-w-[760px] mx-auto text-center">
            <span className="vercel-pill">Free · No login · No GitHub</span>
            <h1 className="vercel-hero-h1">Audit your<br />homepage promises</h1>
            <p className="vercel-hero-sub text-center">
              Paste any URL. We pull every claim your site makes and tell you which are concrete vs. vague marketing fluff. Takes about 30 seconds.
            </p>

            <form onSubmit={runAudit} className="flex flex-col sm:flex-row gap-2 mt-4 max-w-[560px] mx-auto">
              <div className="flex-1 flex items-center gap-2 px-4" style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 8, minHeight: 48 }}>
                <Globe size={16} style={{ color: '#666' }} />
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="yourapp.com"
                  disabled={loading}
                  maxLength={500}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 15, padding: '12px 0' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="vercel-btn-primary"
                style={{ minHeight: 48, opacity: loading || !url.trim() ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }}
              >
                {loading ? (<span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Auditing…</span>) : (<>Run audit →</>)}
              </button>
            </form>
            <p style={{ fontSize: 12, color: '#555', marginTop: 12 }}>3 free audits per day per IP. No credit card.</p>

            {error && (
              <div className="mt-6 mx-auto max-w-[560px] text-left px-4 py-3" style={{ background: '#1a0a0a', border: '1px solid #3a1010', borderRadius: 8 }}>
                <p style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.5 }}>{error}</p>
              </div>
            )}
          </div>
        </section>

        {/* RESULTS */}
        {result && (
          <section className="px-5 sm:px-6 pb-12" style={{ background: '#000' }}>
            <div className="max-w-[900px] mx-auto">
              {/* Summary card */}
              <div className="rounded-xl p-6 sm:p-8" style={{ background: '#0a0a0a', border: '1px solid #1f1f1f' }}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: 11, color: '#666', letterSpacing: '0.1em', fontWeight: 600 }}>AUDITED</p>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-1"
                      style={{ color: '#fff', fontSize: 18, fontWeight: 600, textDecoration: 'none' }}
                    >
                      {result.host} <ExternalLink size={14} style={{ color: '#666' }} />
                    </a>
                    {result.title && (
                      <p style={{ fontSize: 13, color: '#888', marginTop: 6, lineHeight: 1.5 }}>{result.title}</p>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span style={{ fontSize: 48, fontWeight: 700, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                      {result.clarity_score ?? '—'}
                    </span>
                    <span style={{ fontSize: 13, color: '#888' }}>clarity</span>
                  </div>
                </div>

                <div className="mt-6 flex h-2.5 rounded-full overflow-hidden" style={{ background: '#161616' }}>
                  {result.clear_count > 0 && (
                    <div style={{ width: `${(result.clear_count / Math.max(1, result.promise_count)) * 100}%`, background: '#22c55e' }} />
                  )}
                  {result.vague_count > 0 && (
                    <div style={{ width: `${(result.vague_count / Math.max(1, result.promise_count)) * 100}%`, background: '#f59e0b' }} />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5" style={{ fontSize: 13 }}>
                  <span style={{ color: '#22c55e' }}>● {result.clear_count} concrete</span>
                  <span style={{ color: '#f59e0b' }}>● {result.vague_count} vague</span>
                  <span style={{ color: '#555', marginLeft: 'auto' }}>{result.promise_count} total promises</span>
                </div>
              </div>

              {/* Promises list */}
              <div className="mt-6 grid grid-cols-1 gap-3">
                {result.promises.map((p, i) => {
                  const isClear = p.clarity === 'clear';
                  return (
                    <div key={i} className="vercel-card flex items-start gap-3">
                      {isClear ? (
                        <CheckCircle2 size={18} style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
                      ) : (
                        <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span style={{ fontSize: 10, letterSpacing: '0.08em', color: '#666', fontWeight: 600 }}>
                            {CAT_LABEL[p.category] || 'OTHER'}
                          </span>
                          <span style={{ fontSize: 10, letterSpacing: '0.08em', color: isClear ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
                            ● {isClear ? 'CONCRETE' : 'VAGUE'}
                          </span>
                        </div>
                        <p style={{ fontSize: 15, color: '#fff', fontWeight: 500, lineHeight: 1.45 }}>"{p.claim}"</p>
                        {p.why && (
                          <p style={{ fontSize: 13, color: '#888', marginTop: 6, lineHeight: 1.5 }}>{p.why}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <div
                className="mt-8 rounded-xl p-6 sm:p-8 text-center"
                style={{ background: 'radial-gradient(120% 100% at 0% 0%, #1a1308 0%, #0a0a0a 60%)', border: '1px solid #2a2a2a' }}
              >
                <p style={{ fontSize: 11, color: '#f97316', letterSpacing: '0.1em', fontWeight: 600 }}>NEXT STEP</p>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginTop: 8 }}>
                  Which of these are actually built?
                </h2>
                <p style={{ fontSize: 15, color: '#888', marginTop: 10, lineHeight: 1.6, maxWidth: 520, margin: '10px auto 0' }}>
                  Connect your repo and we'll verify every promise against your code. Verified · Partial · Contradicted. Free forever.
                </p>
                <Link
                  to="/signup"
                  className="vercel-btn-primary inline-flex items-center gap-2 mt-6"
                  style={{ minHeight: 44 }}
                >
                  Verify against my code <ArrowRight size={16} />
                </Link>
                <p style={{ fontSize: 12, color: '#555', marginTop: 14 }}>
                  {result.remaining_today} audits left today.{' '}
                  <button onClick={() => { setResult(null); setUrl(''); }} style={{ background: 'none', border: 'none', color: '#888', textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>
                    Audit another site
                  </button>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* HOW IT WORKS (only when no result) */}
        {!result && !loading && (
          <section className="px-5 sm:px-6 py-16" style={{ background: '#0a0a0a', borderTop: '1px solid #ffffff14' }}>
            <div className="max-w-[1000px] mx-auto">
              <p className="vercel-label" style={{ textAlign: 'center' }}>HOW IT WORKS</p>
              <h2 className="vercel-headline" style={{ textAlign: 'center' }}>What the audit does</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
                <div className="vercel-card">
                  <p style={{ fontSize: 11, color: '#666', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 10 }}>01 — READ</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 8 }}>We fetch your homepage</p>
                  <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>Including SPA shells. We pull the rendered text, title, and metadata.</p>
                </div>
                <div className="vercel-card">
                  <p style={{ fontSize: 11, color: '#666', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 10 }}>02 — EXTRACT</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 8 }}>AI pulls every promise</p>
                  <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>Auth, payments, AI features, integrations — anything a visitor would expect to actually work.</p>
                </div>
                <div className="vercel-card">
                  <p style={{ fontSize: 11, color: '#666', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 10 }}>03 — GRADE</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Concrete vs. vague</p>
                  <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>Each promise gets a verdict. The more concrete claims, the higher your clarity score.</p>
                </div>
              </div>
              <p style={{ fontSize: 14, color: '#666', textAlign: 'center', marginTop: 32, lineHeight: 1.6 }}>
                Want to verify the promises against real code?{' '}
                <Link to="/signup" style={{ color: '#fff', textDecoration: 'underline' }}>
                  Sign up free and connect GitHub →
                </Link>
              </p>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}