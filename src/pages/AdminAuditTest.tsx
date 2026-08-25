import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import DashboardNavbar from "@/components/DashboardNavbar";
import { supabase } from "@/integrations/supabase/client";
import SEO from '@/components/SEO';

interface Promise_ {
  claim: string;
  category: string;
  clarity: "clear" | "vague";
  why: string;
}

interface AuditResult {
  id: string | null;
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
  debug?: boolean;
}

export default function AdminAuditTest() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("admin-test-audit", {
        body: { url: url.trim() },
      });
      if (invokeErr) throw invokeErr;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as AuditResult);
    } catch (err: any) {
      setError(err?.message || "Failed to run audit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Admin: Audit test — Rismon" description="Internal promise audit testing tool for Rismon staff." noindex />
      <DashboardNavbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <Link to="/admin" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6">
          <ArrowLeft size={14} /> Back to admin
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={18} className="text-primary" />
          <span className="text-xs font-semibold tracking-wider uppercase text-primary">Admin debug</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">Promise Audit tester</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Runs <code className="text-foreground">public-promise-audit</code> server-side with the debug bypass token,
          skipping the 3/IP/day rate limit. Token never reaches the browser.
        </p>

        <form onSubmit={run} className="mt-6 flex gap-2">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Auditing…</> : "Run audit"}
          </button>
        </form>

        {error && (
          <div className="mt-4 flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{result.host}</div>
                  <div className="text-foreground font-semibold mt-0.5">{result.title || "(no title)"}</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Clarity</span>
                  <span className="text-2xl font-bold text-foreground tabular-nums">
                    {result.clarity_score ?? "—"}{result.clarity_score != null && <span className="text-base text-muted-foreground">%</span>}
                  </span>
                </div>
              </div>
              <div className="flex gap-4 mt-4 text-sm">
                <span className="text-muted-foreground">Total: <span className="text-foreground font-medium">{result.promise_count}</span></span>
                <span className="text-success">Clear: <span className="font-medium">{result.clear_count}</span></span>
                <span className="text-warning">Vague: <span className="font-medium">{result.vague_count}</span></span>
                {result.debug && (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs text-primary">
                    <CheckCircle2 size={12} /> Debug bypass active
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {result.promises.map((p, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-foreground text-sm font-medium">{p.claim}</div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${
                      p.clarity === "clear" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                    }`}>{p.clarity}</span>
                  </div>
                  <div className="text-muted-foreground text-xs mt-1.5">
                    <span className="uppercase tracking-wider mr-2">{p.category}</span>
                    {p.why}
                  </div>
                </div>
              ))}
            </div>

            {result.id && (
              <Link to={`/promise-audit/${result.id}`} className="inline-block text-sm text-primary hover:underline">
                Open public audit page →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}