import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Globe, CheckCircle2, AlertTriangle, Loader2, ExternalLink, Lock, Shield, Sparkles, Share2, Copy, Check, Twitter, Linkedin, Facebook } from 'lucide-react';
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
  id?: string | null;
  url: string;
  host: string;
  title?: string;
  description?: string;
  promises: Promise_[];
  clarity_score: number | null;
  promise_count: number;
  clear_count: number;
  vague_count: number;
  remaining_today?: number;
};

const CAT_LABEL: Record<string, string> = {
  ai: 'AI', auth: 'Auth', payments: 'Payments', integration: 'Integration',
  data: 'Data', security: 'Security', performance: 'Performance',
  support: 'Support', feature: 'Feature', other: 'Other',
};

export default function PromiseAudit() {
  const { id: permalinkId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [stats, setStats] = useState<{ total_24h: number; total_all_time: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // Load live social-proof stats once.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('public_audit_stats');
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setStats({ total_24h: Number(row.total_24h) || 0, total_all_time: Number(row.total_all_time) || 0 });
    })();
  }, []);

  // Load shared audit by id from URL.
  useEffect(() => {
    if (!permalinkId) return;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: rpcErr } = await supabase.rpc('get_public_audit', { _id: permalinkId });
      setLoading(false);
      if (rpcErr || !data || (Array.isArray(data) && data.length === 0)) {
        setError("This audit link is invalid or has expired.");
        return;
      }
      const row: any = Array.isArray(data) ? data[0] : data;
      setResult({
        id: row.id,
        url: row.url,
        host: row.url_host,
        promises: (row.promises as Promise_[]) || [],
        clarity_score: row.clarity_score,
        promise_count: row.promise_count,
        clear_count: row.clear_count,
        vague_count: row.vague_count,
      });
    })();
  }, [permalinkId]);

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
      const r = data as AuditResult;
      setResult(r);
      if (r.id) {
        // Clean permalink in the URL bar — no reload.
        window.history.replaceState(null, '', `/promise-audit/${r.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const permalink = result?.id ? `https://rismon.ai/promise-audit/${result.id}` : '';
  const shareTitle = result
    ? `${result.host} scored ${result.clarity_score ?? '—'}/100 on the Rismon Promise Audit — ${result.clear_count} specific claims, ${result.vague_count} fluffy. Audit any site free:`
    : '';
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(permalink)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(permalink)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(permalink)}`,
  };

  const copyLink = async () => {
    if (!permalink) return;
    try {
      await navigator.clipboard.writeText(permalink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {/* ignore */}
  };

  const resetAudit = () => {
    setResult(null);
    setUrl('');
    setError(null);
    if (permalinkId) navigate('/promise-audit', { replace: true });
  };

  return (
    <div className="min-h-screen" style={{ background: '#000', color: '#fff' }}>
      <SEO
        title={result ? `Promise Audit · ${result.host} — ${result.clarity_score ?? '—'}/100 | Rismon` : 'Promise Audit — Free, no login | Rismon'}
        description={result
          ? `${result.host} scored ${result.clarity_score ?? '—'}/100. ${result.clear_count} specific, ${result.vague_count} fluffy promises. Audit your own homepage free.`
          : 'Paste any URL. We extract every claim your homepage makes and grade how specific vs. fluffy your marketing is. No login. No repo. 60 seconds.'}
        canonicalPath={result?.id ? `/promise-audit/${result.id}` : '/promise-audit'}
      />
      <Navbar />

      <main>
        {/* HERO + FORM */}
        <section className="px-5 sm:px-6 pt-16 sm:pt-20 pb-12" style={{ background: '#000' }}>
          <div className="max-w-[760px] mx-auto text-center">
            <span className="vercel-pill">Free · No login · No GitHub</span>
            <h1 className="vercel-hero-h1">Audit your<br />homepage promises</h1>
            <p className="vercel-hero-sub text-center">
              Paste any URL. We pull every claim your site makes and tell you which are specific (testable) vs. fluffy (marketing words). Takes about 30 seconds.
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
                  <span style={{ color: '#22c55e' }}>● {result.clear_count} specific</span>
                  <span style={{ color: '#f59e0b' }}>● {result.vague_count} fluffy</span>
                  <span style={{ color: '#555', marginLeft: 'auto' }}>{result.promise_count} total promises</span>
                </div>
                <div
                  className="mt-5 rounded-lg p-4"
                  style={{ background: '#0f0f0f', border: '1px solid #1f1f1f', fontSize: 13, color: '#999', lineHeight: 1.6 }}
                >
                  <p style={{ marginBottom: 6 }}>
                    <span style={{ color: '#22c55e', fontWeight: 600 }}>● Specific</span>
                    <span style={{ color: '#666' }}> — a real, testable claim. Something a user (or a scanner) can actually check, like "Sign in with Google" or "Stripe checkout".</span>
                  </p>
                  <p>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>● Fluffy</span>
                    <span style={{ color: '#666' }}> — marketing language with no proof. Words like "powerful", "seamless", or "founder-friendly" — nice to read, impossible to verify.</span>
                  </p>
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
                          <span
                            title={isClear ? 'Specific claim — testable against real code or behavior.' : 'Marketing fluff — no concrete promise to verify.'}
                            style={{ fontSize: 10, letterSpacing: '0.08em', color: isClear ? '#22c55e' : '#f59e0b', fontWeight: 600 }}
                          >
                            ● {isClear ? 'SPECIFIC' : 'TOO VAGUE'}
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

              {/* What to do next — prioritized actions */}
              {(() => {
                const fluffy = result.promises.filter(p => p.clarity === 'vague');
                const specific = result.promises.filter(p => p.clarity === 'clear');
                const sensitive = specific.filter(p => ['auth', 'payments', 'security', 'data'].includes(p.category));
                const topFluffy = fluffy.slice(0, 3);
                const topSensitive = (sensitive.length ? sensitive : specific).slice(0, 3);
                const score = result.clarity_score ?? 0;

                const actions: { num: string; icon: any; title: string; body: React.ReactNode; cta?: { label: string; to: string }; tone: string }[] = [];

                // Action 1 — fix the fluff (only if there is fluff)
                if (topFluffy.length > 0) {
                  actions.push({
                    num: '01',
                    icon: AlertTriangle,
                    tone: '#f59e0b',
                    title: `Rewrite ${fluffy.length} fluffy claim${fluffy.length === 1 ? '' : 's'} with proof`,
                    body: (
                      <>
                        <p style={{ fontSize: 13, color: '#999', lineHeight: 1.55, marginBottom: 10 }}>
                          Replace marketing words with one specific fact a visitor can test. Example: "powerful AI" → "GPT-4o-powered, 2s avg response".
                        </p>
                        <ul style={{ fontSize: 12.5, color: '#bbb', lineHeight: 1.7, paddingLeft: 14, listStyle: 'disc' }}>
                          {topFluffy.map((p, i) => (
                            <li key={i} style={{ marginBottom: 2 }}>"{p.claim.slice(0, 80)}{p.claim.length > 80 ? '…' : ''}"</li>
                          ))}
                        </ul>
                      </>
                    ),
                  });
                }

                // Action 2 — verify specific claims (always, this is the signup push)
                if (topSensitive.length > 0) {
                  actions.push({
                    num: actions.length === 0 ? '01' : '02',
                    icon: Shield,
                    tone: '#22c55e',
                    title: `Verify ${specific.length} specific claim${specific.length === 1 ? '' : 's'} against your code`,
                    body: (
                      <>
                        <p style={{ fontSize: 13, color: '#999', lineHeight: 1.55, marginBottom: 10 }}>
                          These promises say something real. The next question is: do they actually work? Riskiest ones first:
                        </p>
                        <ul style={{ fontSize: 12.5, color: '#bbb', lineHeight: 1.7, paddingLeft: 14, listStyle: 'disc' }}>
                          {topSensitive.map((p, i) => (
                            <li key={i} style={{ marginBottom: 2 }}>
                              <span style={{ color: '#666', fontSize: 10, letterSpacing: '0.08em', marginRight: 6 }}>{(CAT_LABEL[p.category] || 'OTHER').toUpperCase()}</span>
                              "{p.claim.slice(0, 70)}{p.claim.length > 70 ? '…' : ''}"
                            </li>
                          ))}
                        </ul>
                      </>
                    ),
                    cta: { label: 'Run full scan — free', to: '/signup' },
                  });
                }

                // Action 3 — based on score
                actions.push({
                  num: String(actions.length + 1).padStart(2, '0'),
                  icon: Sparkles,
                  tone: '#f97316',
                  title: score < 50
                    ? 'Your homepage sells vibes, not features'
                    : score < 80
                      ? 'Tighten the weakest section'
                      : 'Prove it with a public scan badge',
                  body: (
                    <p style={{ fontSize: 13, color: '#999', lineHeight: 1.55 }}>
                      {score < 50
                        ? `A ${score}/100 clarity score means visitors can't tell what your product does. Pick your top 3 features, write one specific sentence each, and re-audit.`
                        : score < 80
                          ? `${score}/100 is solid — but the fluffy claims drag trust down. Rewrite them, then connect your repo to prove the rest is real.`
                          : `${score}/100 — strong clarity. Run a full scan and we'll give you a public Verified badge for your landing page.`}
                    </p>
                  ),
                  cta: { label: 'Get my full scan', to: '/signup' },
                });

                return (
                  <div className="mt-8 rounded-xl p-6 sm:p-8" style={{ background: '#0a0a0a', border: '1px solid #1f1f1f' }}>
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
                      <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.12em', fontWeight: 600 }}>WHAT TO DO NEXT</p>
                      <span style={{ fontSize: 11, color: '#666' }}>Prioritized by impact</span>
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                      {actions.length} action{actions.length === 1 ? '' : 's'} to raise your clarity score
                    </h2>
                    <div className="mt-6 grid grid-cols-1 gap-3">
                      {actions.map((a, i) => {
                        const Icon = a.icon;
                        return (
                          <div key={i} className="rounded-lg p-5" style={{ background: '#0f0f0f', border: '1px solid #1f1f1f' }}>
                            <div className="flex items-start gap-4">
                              <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: `${a.tone}14`, border: `1px solid ${a.tone}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon size={16} style={{ color: a.tone }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-2 mb-1.5">
                                  <span style={{ fontSize: 10, letterSpacing: '0.12em', color: '#666', fontWeight: 700 }}>{a.num}</span>
                                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>{a.title}</h3>
                                </div>
                                <div>{a.body}</div>
                                {a.cta && (
                                  <Link
                                    to={a.cta.to}
                                    className="inline-flex items-center gap-1.5 mt-4"
                                    style={{ fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none', borderBottom: '1px solid #444', paddingBottom: 2 }}
                                  >
                                    {a.cta.label} <ArrowRight size={13} />
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* CTA */}
              <div
                className="mt-8 rounded-xl p-6 sm:p-8 text-center"
                style={{ background: 'radial-gradient(120% 100% at 0% 0%, #1a1308 0%, #0a0a0a 60%)', border: '1px solid #2a2a2a' }}
              >
                <p style={{ fontSize: 11, color: '#f97316', letterSpacing: '0.1em', fontWeight: 600 }}>GO DEEPER · FREE</p>
                <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginTop: 8 }}>
                  This audit checked your words.<br/>The full scan checks your code.
                </h2>
                <p style={{ fontSize: 15, color: '#aaa', marginTop: 12, lineHeight: 1.6, maxWidth: 560, margin: '12px auto 0' }}>
                  Sign up free, connect your repo (read-only), and every promise above gets a real verdict — <span style={{ color: '#22c55e' }}>Verified</span>, <span style={{ color: '#f59e0b' }}>Partial</span>, or <span style={{ color: '#ef4444' }}>Contradicted</span> — plus exposed API keys, broken auth, and security gaps.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
                  <Link
                    to="/signup"
                    className="vercel-btn-primary inline-flex items-center gap-2"
                    style={{ minHeight: 44 }}
                  >
                    Sign up & run full scan <ArrowRight size={16} />
                  </Link>
                  <Link
                    to="/sample-report"
                    className="inline-flex items-center gap-2"
                    style={{ fontSize: 13.5, color: '#aaa', textDecoration: 'none', minHeight: 44, padding: '0 12px' }}
                  >
                    See a real report <ExternalLink size={13} />
                  </Link>
                </div>
                <p style={{ fontSize: 12, color: '#666', marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Lock size={11} /> Free forever · Read-only GitHub · Code never stored
                </p>
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
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Specific vs. fluffy</p>
                  <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>Real, testable claims score high. Marketing fluff with nothing to verify drags your clarity score down.</p>
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