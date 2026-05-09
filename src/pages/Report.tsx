import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Check, Copy, ShieldAlert, FileText, AlertCircle, Database, Lock,
} from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import FindingReviewPills from '@/components/FindingReviewPills';
import ReportFeedbackCard from '@/components/ReportFeedbackCard';
import AnalysisLoadingScreen from '@/components/AnalysisLoadingScreen';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Live report page — visually mirrors SampleReport so what visitors see
 * advertised on /sample-report is exactly what they get on a real scan.
 *
 * Sections, in order:
 *   1. Header — app name + platform badge + scan-type chip
 *   2. Intent score hero + warning chips
 *   3. Overview / summary
 *   4. Verdict (one-line, centered)
 *   5. Intent gaps  ("What you wanted vs what your code does")
 *   6. Promises vs code
 *   7. Security
 *   8. Legal
 *   9. What works (always at the end)
 *  10. Quick-scan upsell + feedback + actions
 */

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
  info: '#71717a',
};

function scoreColor(score: number) {
  if (score >= 89) return '#22c55e';
  if (score >= 75) return '#84cc16';
  if (score >= 65) return '#f59e0b';
  return '#f97316';
}

function scoreLabelFor(score: number) {
  if (score >= 93) return 'Excellent';
  if (score >= 85) return 'Strong';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Getting there';
  if (score >= 40) return 'Significant work needed';
  return 'Critical issues';
}

function splitSummaryVerdict(text: string): { summary: string; verdict: string } {
  if (!text) return { summary: '', verdict: '' };
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length < 2) return { summary: text.trim(), verdict: '' };
  const verdict = sentences[sentences.length - 1].trim();
  const summary = sentences.slice(0, -1).join(' ').trim();
  return { summary, verdict };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground mb-4">
      {children}
    </div>
  );
}

function IntentScoreCard({
  score, label, scanType,
}: { score: number; label: string; scanType: string }) {
  const c = scoreColor(score);
  const ceiling = scanType === 'deep' ? 100 : 90;
  return (
    <div className="bg-card border border-border rounded-2xl px-8 py-10 text-center">
      <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground mb-4">
        Intent match
      </div>
      <div
        className="font-bold leading-[0.95] tracking-[-0.04em]"
        style={{ fontSize: 88, color: c }}
      >
        {score}
        <span className="text-[28px] font-medium ml-1" style={{ color: '#444' }}>/100</span>
      </div>
      <div className="text-base font-medium text-foreground mt-4">{label}</div>
      <div className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
        Does your code do what you said your app does?
      </div>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3.5 py-1.5 text-xs text-muted-foreground">
        <span aria-hidden style={{ width: 5, height: 5, borderRadius: 999, background: 'hsl(var(--muted-foreground))' }} />
        <span>
          {scanType === 'deep' ? 'Deep scan' : 'Quick scan'} ceiling{' '}
          <span className="text-foreground tabular-nums">{ceiling}/100</span>
          {scanType !== 'deep' && (
            <>
              <span className="mx-1.5 text-border">·</span>
              Run a deep scan to unlock the full 100.
            </>
          )}
        </span>
      </div>
    </div>
  );
}

function WarningChip({
  icon, count, label, tone, onClick,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  tone: 'sharp' | 'soft' | 'clear';
  onClick?: () => void;
}) {
  const dotColor = tone === 'sharp' ? '#ef4444' : tone === 'soft' ? '#f59e0b' : '#22c55e';
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-card/80"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: dotColor, boxShadow: `0 0 0 3px ${dotColor}1f` }} />
      <span className="flex text-muted-foreground group-hover:text-foreground transition-colors">{icon}</span>
      <span className="tabular-nums text-foreground">{count}</span>
      <span className="text-muted-foreground">{label}</span>
    </button>
  );
}

function FindingCard({
  f, idx, analysisId,
}: { f: any; idx: number; analysisId?: string }) {
  const [copied, setCopied] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSending, setDisputeSending] = useState(false);
  const [disputeSent, setDisputeSent] = useState(false);

  const sev = (f.severity || 'medium').toLowerCase();
  const color = SEVERITY_COLORS[sev] || SEVERITY_COLORS.medium;
  const confidence = (f.confidence || 'verified').toLowerCase();
  const confColor = confidence === 'verified' ? '#22c55e' : '#71717a';
  const confLabel = confidence === 'verified' ? 'Verified' : 'Unverified';

  const title = f.title || 'Issue';
  const whatWeFoundRaw = f.what_we_found || f.you_said || f.explanation || '';
  const whatThisMeansRaw = f.what_this_means || f.business_impact || '';
  const norm = (s: string) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const isDup =
    whatWeFoundRaw &&
    whatThisMeansRaw &&
    (norm(whatWeFoundRaw) === norm(whatThisMeansRaw) ||
      norm(whatWeFoundRaw).includes(norm(whatThisMeansRaw)) ||
      norm(whatThisMeansRaw).includes(norm(whatWeFoundRaw)));
  const showWhatWeFound = !isDup && !!whatWeFoundRaw;
  const impactText = whatThisMeansRaw || (isDup ? whatWeFoundRaw : '');

  const howToFix = f.how_to_fix || '';
  const fixPrompt = f.fix_prompt || '';
  const techRef = f.technical_reference || '';
  const filePath = f.file_path || '';
  const lineNumber = f.line_number;
  const codeSnippet = f.code_snippet || '';

  const onCopy = () => {
    if (!fixPrompt) return;
    navigator.clipboard.writeText(fixPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitDispute = async () => {
    if (disputeReason.trim().length < 5) {
      toast.error('Please add a few words explaining why this is wrong.');
      return;
    }
    setDisputeSending(true);
    try {
      const { error } = await supabase.functions.invoke('submit-finding-dispute', {
        body: {
          analysis_id: analysisId,
          finding_id: f.id,
          finding_name: title,
          finding_category: sev,
          reason: disputeReason.trim(),
        },
      });
      if (error) throw error;
      setDisputeSent(true);
      toast.success("Thanks, we'll review this finding.");
      setTimeout(() => { setDisputeOpen(false); setDisputeSent(false); setDisputeReason(''); }, 1500);
    } catch (e: any) {
      toast.error(e.message || 'Could not send dispute.');
    } finally {
      setDisputeSending(false);
    }
  };

  return (
    <div
      className="bg-card border border-border rounded-lg p-6 mb-3"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="text-base font-semibold text-foreground mb-2 flex-1">{title}</div>
        <div className="flex gap-2 items-center">
          <span
            className="text-[10px] uppercase tracking-[0.08em] font-semibold whitespace-nowrap rounded-full px-2 py-[2px]"
            style={{ color: confColor, border: `1px solid ${confColor}33` }}
            title={confidence === 'verified' ? 'Cross-checked by a second AI pass' : 'Could not verify directly'}
          >
            {confLabel}
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.08em] font-semibold whitespace-nowrap"
            style={{ color }}
          >
            {sev}
          </span>
        </div>
      </div>

      {showWhatWeFound && (
        <div className="text-sm text-muted-foreground leading-relaxed mb-3">
          {whatWeFoundRaw}
        </div>
      )}

      {/* Proof: file_path + line + snippet */}
      {filePath && (
        <div
          className="rounded-md px-3 py-2.5 mb-3.5 font-mono"
          style={{ background: '#000', border: '1px solid #1a1a1a' }}
        >
          <div className="text-[11px] mb-1.5" style={{ color: '#666' }}>
            <span style={{ color: '#22c55e' }}>● Proof</span> · {filePath}
            {lineNumber ? `:${lineNumber}` : ''}
          </div>
          {codeSnippet && (
            <div className="text-[12px] whitespace-pre-wrap" style={{ color: '#aaa' }}>
              {codeSnippet}
            </div>
          )}
        </div>
      )}

      {impactText && (
        <>
          <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-1">
            Impact
          </div>
          <div className="text-sm text-foreground leading-relaxed mb-4">{impactText}</div>
        </>
      )}

      {(f.requires_supabase_verification || (confidence === 'unverified' && f.verification_note)) && (
        <div
          className="rounded-md px-3.5 py-2.5 mb-4 flex items-start gap-2.5"
          style={{ background: '#150f05', border: '1px solid #473012' }}
        >
          <Database size={14} style={{ color: '#f59e0b', marginTop: 2, flexShrink: 0 }} />
          <div className="text-[13px] leading-relaxed" style={{ color: '#cbb37a' }}>
            {f.verification_note ||
              'Connect your Supabase project to verify this finding accurately. Without Supabase access this is based on code patterns only.'}{' '}
            <Link to="/connect" className="underline" style={{ color: '#f59e0b' }}>
              Connect Supabase
            </Link>
          </div>
        </div>
      )}

      {(howToFix || fixPrompt) && <div className="border-t border-border my-4" />}

      {howToFix && (
        <>
          <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-2">
            How to fix
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed mb-4">{howToFix}</div>
        </>
      )}

      {fixPrompt && (
        <div className="relative">
          <div
            className="rounded-md text-[13px] leading-relaxed whitespace-pre-wrap break-words font-mono"
            style={{
              background: '#000000',
              border: '1px solid #222222',
              color: '#888888',
              padding: 16,
              paddingTop: 40,
            }}
          >
            {fixPrompt}
          </div>
          <button
            onClick={onCopy}
            className="absolute top-2 right-2 inline-flex items-center gap-1 rounded text-[11px] px-2.5 py-1"
            style={{ background: 'transparent', border: '1px solid #333333', color: '#888888' }}
          >
            {copied ? (<><Check size={11} /> Copied</>) : (<><Copy size={11} /> Copy prompt</>)}
          </button>
        </div>
      )}

      {techRef && (
        <div className="mt-3">
          <div className="text-[11px] font-mono" style={{ color: '#333' }}>{techRef}</div>
        </div>
      )}

      {/* Per-finding review pills */}
      {analysisId && (
        <FindingReviewPills
          analysisId={analysisId}
          findingId={f.id || `idx-${idx}`}
          findingName={title}
          findingSeverity={sev}
          findingCategory={f.category || 'general'}
        />
      )}

      {/* Dispute footer */}
      <div className="mt-4 pt-3 border-t border-border flex justify-end">
        {!disputeOpen ? (
          <button
            onClick={() => setDisputeOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Report wrong finding
          </button>
        ) : disputeSent ? (
          <div className="text-xs" style={{ color: '#22c55e' }}>Thanks, we'll review it.</div>
        ) : (
          <div className="w-full">
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Why is this finding wrong? (e.g., 'I checked, this is actually protected')"
              rows={3}
              className="w-full bg-background border border-border rounded-md p-2.5 text-foreground text-sm font-sans resize-y"
            />
            <div className="flex gap-2 mt-2 justify-end">
              <button
                onClick={() => { setDisputeOpen(false); setDisputeReason(''); }}
                className="bg-transparent border border-border text-muted-foreground px-3 py-1.5 rounded-md text-xs"
              >
                Cancel
              </button>
              <button
                onClick={submitDispute}
                disabled={disputeSending}
                className="bg-foreground text-background px-3.5 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60"
              >
                {disputeSending ? 'Sending...' : 'Send to Rismon team'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LegalCard({ f }: { f: any }) {
  return (
    <div
      className="bg-card border border-border rounded-lg p-5 mb-3"
      style={{ borderLeft: '3px solid #f59e0b' }}
    >
      <div className="text-base font-semibold text-foreground mb-2">{f.title}</div>
      {f.what_we_found && (
        <div className="text-sm text-muted-foreground leading-relaxed mb-3">{f.what_we_found}</div>
      )}
      {f.what_this_means && (
        <>
          <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-1">
            Why it matters
          </div>
          <div className="text-sm text-foreground leading-relaxed mb-3">{f.what_this_means}</div>
        </>
      )}
      {f.how_to_fix && (
        <>
          <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-1">
            What to do
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">{f.how_to_fix}</div>
        </>
      )}
    </div>
  );
}

function PromiseRow({ p }: { p: any }) {
  const v = (p.verdict || 'not_found').toLowerCase();
  const palette =
    v === 'found'
      ? { color: '#22c55e', label: 'Found in code', bg: '#08130a' }
      : v === 'partial'
        ? { color: '#f59e0b', label: 'Partial', bg: 'rgba(245,158,11,0.05)' }
        : { color: '#71717a', label: 'Not found in code', bg: '#0c0c0d' };
  return (
    <div
      className="grid gap-4 px-4 py-4 rounded-lg mb-2.5 border border-border"
      style={{ gridTemplateColumns: '1fr auto', background: palette.bg }}
    >
      <div>
        <div className="text-sm text-foreground font-medium mb-1.5 leading-snug">
          {p.claim || '(no claim text)'}
        </div>
        {p.evidence && (
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span style={{ color: '#555' }}>From your {p.claim_source || 'homepage'} · </span>
            {p.evidence}
          </div>
        )}
      </div>
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.04em] rounded-full px-2.5 py-1 h-fit whitespace-nowrap"
        style={{ color: palette.color, border: `1px solid ${palette.color}40` }}
      >
        {palette.label}
      </span>
    </div>
  );
}

export default function Report() {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [analysis, setAnalysis] = useState<any>(null);
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const generateStarted = useRef(false);

  useEffect(() => {
    if (!analysisId) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .maybeSingle();
      if (error || !data) {
        setLoading(false);
        setNotFound(true);
        return;
      }

      // Hydrate the app row in parallel for the header (app name + platform).
      if (data.app_id) {
        supabase.from('apps').select('app_name,platform,github_repo_name').eq('id', data.app_id).maybeSingle()
          .then(({ data: appRow }) => { if (appRow) setApp(appRow); });
      }

      if (!data.fix_prompts || data.status === 'generating_prompts') {
        if (generateStarted.current) return;
        generateStarted.current = true;
        setGenerating(true);
        const { data: appPlatform } = await supabase
          .from('apps').select('platform').eq('id', data.app_id).single();
        const { data: result, error: invErr } = await supabase.functions.invoke('analyze', {
          body: {
            action: 'generate_fixes',
            platform: appPlatform?.platform,
            code_understanding: data.code_understanding,
            gaps: data.gaps,
            security_issues: data.security_issues,
            unknown_features: data.unknown_features,
          },
        });
        if (!invErr && result?.fix_prompts) {
          await supabase.from('analyses').update({ fix_prompts: result.fix_prompts, status: 'complete' }).eq('id', analysisId);
          data.fix_prompts = result.fix_prompts;
          data.status = 'complete';
        }
        setGenerating(false);
      }
      setAnalysis(data);
      setLoading(false);
      localStorage.removeItem('rismon_active_analysis');
      localStorage.removeItem('rismon_analysis_stage');
    };
    load();
  }, [analysisId]);

  useEffect(() => {
    if (!notFound) return;
    const t = setTimeout(() => navigate('/dashboard'), 3000);
    return () => clearTimeout(t);
  }, [notFound, navigate]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="text-xl font-semibold text-foreground">Report not found</div>
        <div className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
          This report doesn't exist or you don't have access to it.
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 bg-foreground text-background px-5 py-2.5 rounded-md text-sm font-medium"
        >
          Go to dashboard →
        </button>
      </div>
    );
  }

  if (loading || generating) {
    return <AnalysisLoadingScreen stage={generating ? 'generating' : 'reading'} />;
  }
  if (!analysis) return null;

  const score = analysis.intent_match_score ?? 0;
  const scanType: string = analysis.scan_type || 'quick';
  const isQuick = scanType === 'quick';
  const isPro = profile?.plan === 'pro' || profile?.plan === 'try_pro';

  const fixPromptsList = Array.isArray(analysis.fix_prompts) ? analysis.fix_prompts : [];
  const fixById = new Map<string, any>();
  fixPromptsList.forEach((fp: any, i: number) => {
    if (fp?.fix_id) fixById.set(fp.fix_id, fp);
    else fixById.set(`fp-${i}`, fp);
  });
  const attachFix = (item: any) => {
    if (item.fix_prompt) return item;
    const fp = item.id ? fixById.get(item.id) : undefined;
    if (fp) {
      return {
        ...item,
        fix_prompt: fp.prompt || item.fix_prompt,
        how_to_fix: item.how_to_fix || fp.where_to_paste || '',
      };
    }
    return item;
  };

  const gapsList = (Array.isArray(analysis.gaps) ? analysis.gaps : []).map(attachFix);
  const secList = (Array.isArray(analysis.security_issues) ? analysis.security_issues : []).map(attachFix);
  const whatWorksList = Array.isArray(analysis.what_works) ? analysis.what_works : [];
  const legalList = Array.isArray(analysis.legal_findings) ? analysis.legal_findings : [];
  const promisesList = Array.isArray(analysis.landing_page_promises) ? analysis.landing_page_promises : [];
  const homepageSignals = analysis.homepage_signals || null;

  const { summary, verdict } = splitSummaryVerdict(analysis.summary || '');
  const label = analysis.score_label || scoreLabelFor(score);

  const promisesVisible = isPro ? promisesList : promisesList.slice(0, 2);
  const promisesLocked = isPro ? 0 : Math.max(0, promisesList.length - 2);

  const appName = app?.app_name || app?.github_repo_name || 'Your app';
  const platform = app?.platform || 'Lovable';
  const unverifiedPromises = promisesList.filter((p: any) => p.verdict !== 'found').length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />

      <div className="report-container mx-auto px-6 pt-24 pb-12" style={{ maxWidth: 800 }}>
        {/* SECTION 1, HEADER */}
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <div className="text-[13px] text-muted-foreground">
            App scanned: <span className="text-foreground font-medium">{appName}</span>
            <span
              className="ml-2 inline-block text-[10px] uppercase tracking-[0.08em] font-semibold rounded-full px-2 py-[2px]"
              style={{ background: '#1f1108', color: '#fdba74' }}
            >
              {platform}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Dashboard
            </Link>
            <span
              className="text-[10px] uppercase tracking-[0.08em] font-semibold rounded px-2.5 py-[3px] text-muted-foreground"
              style={{ border: '1px solid hsl(var(--border))' }}
            >
              {isQuick ? 'Quick Scan' : 'Deep Scan'}
            </span>
          </div>
        </div>

        {/* SECTION 2, INTENT HERO + WARNING CHIPS */}
        <div className="pt-10 pb-3">
          <IntentScoreCard score={score} label={label} scanType={scanType} />
          <div className="flex flex-wrap gap-2.5 justify-center mt-5">
            <WarningChip
              icon={<ShieldAlert size={14} />}
              count={secList.length}
              label={secList.length === 1 ? 'security issue' : 'security issues'}
              tone={secList.length === 0 ? 'clear' : 'sharp'}
              onClick={() => document.getElementById('security-section')?.scrollIntoView({ behavior: 'smooth' })}
            />
            <WarningChip
              icon={<FileText size={14} />}
              count={legalList.length}
              label={legalList.length === 1 ? 'legal gap' : 'legal gaps'}
              tone={legalList.length === 0 ? 'clear' : 'soft'}
              onClick={() => document.getElementById('legal-section')?.scrollIntoView({ behavior: 'smooth' })}
            />
            {promisesList.length > 0 && (
              <WarningChip
                icon={<AlertCircle size={14} />}
                count={unverifiedPromises}
                label="unverified promises"
                tone="soft"
                onClick={() => document.getElementById('promises-section')?.scrollIntoView({ behavior: 'smooth' })}
              />
            )}
          </div>
        </div>

        {/* SECTION 3, SUMMARY */}
        {summary && (
          <div className="bg-card border border-border rounded-lg p-6 mt-8 mb-6">
            <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground mb-3">
              Overview
            </div>
            <div className="text-[15px] text-muted-foreground leading-[1.7]">{summary}</div>
            {homepageSignals && (homepageSignals.has_live_url || homepageSignals.readme_found) && (
              <div className="text-xs text-muted-foreground mt-3.5 pt-3.5" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                We also read your{' '}
                {[
                  homepageSignals.readme_found && 'README',
                  homepageSignals.has_live_url && 'homepage',
                  homepageSignals.privacy_page_found && 'privacy page',
                  homepageSignals.terms_page_found && 'terms page',
                ].filter(Boolean).join(', ')}.
              </div>
            )}
          </div>
        )}

        {/* SECTION 4, VERDICT */}
        {verdict && (
          <div
            className="text-center text-lg font-semibold text-foreground leading-snug py-6 mb-8"
            style={{
              borderTop: '1px solid hsl(var(--border))',
              borderBottom: '1px solid hsl(var(--border))',
            }}
          >
            {verdict}
          </div>
        )}

        {/* SECTION 5, INTENT GAPS */}
        <div className="mb-8">
          <SectionLabel>What you wanted vs what your code does</SectionLabel>
          {gapsList.length === 0 ? (
            <div
              className="rounded-lg px-5 py-4 text-sm"
              style={{
                background: '#0a160c',
                border: '1px solid #16401f',
                color: '#86efac',
              }}
            >
              No intent gaps found. Your code matches what you described.
            </div>
          ) : (
            gapsList.map((g: any, i: number) => (
              <FindingCard key={g.id || `g-${i}`} f={g} idx={i} analysisId={analysisId} />
            ))
          )}
        </div>

        {/* SECTION 6, PROMISES VS CODE */}
        {promisesList.length > 0 && (
          <div id="promises-section" className="mb-8">
            <SectionLabel>Promises on your homepage vs your code</SectionLabel>
            <p className="text-[13px] text-muted-foreground leading-relaxed -mt-2 mb-4">
              We read what your homepage and README claim, then checked your code for proof. Items
              marked &quot;not found&quot; may still exist, they were just not in the code we scanned.
            </p>
            {promisesVisible.map((p: any, i: number) => (
              <PromiseRow key={p.id || `p-${i}`} p={p} />
            ))}
            {promisesLocked > 0 && (
              <div className="bg-card border border-border rounded-lg px-6 py-5 mt-3 flex items-center gap-3.5">
                <Lock size={18} className="text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-foreground font-medium">
                    {promisesLocked} more {promisesLocked === 1 ? 'promise' : 'promises'} to verify
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Pro shows the full claim-by-claim table, investor-ready diligence.
                  </div>
                </div>
                <Link to="/#pricing" className="vercel-btn-primary text-[13px] px-4.5 py-2.5 whitespace-nowrap">
                  Unlock with Pro
                </Link>
              </div>
            )}
          </div>
        )}

        {/* SECTION 7, SECURITY */}
        <div id="security-section" className="mb-8">
          <SectionLabel>Security · these can hurt you in production</SectionLabel>
          {secList.length === 0 ? (
            <div
              className="rounded-lg px-5 py-4 text-sm"
              style={{
                background: '#0a160c',
                border: '1px solid #16401f',
                color: '#86efac',
              }}
            >
              No security issues found in the code we scanned.
            </div>
          ) : (
            secList.map((s: any, i: number) => (
              <FindingCard key={s.id || `s-${i}`} f={s} idx={i} analysisId={analysisId} />
            ))
          )}
        </div>

        {/* SECTION 8, LEGAL */}
        {legalList.length > 0 && (
          <div id="legal-section" className="mb-8">
            <SectionLabel>Legal &amp; trust · what to add before launch</SectionLabel>
            {legalList.map((f: any, i: number) => <LegalCard key={f.id || `l-${i}`} f={f} />)}
          </div>
        )}

        {/* SECTION 9, WHAT WORKS — always at the end, like SampleReport */}
        {whatWorksList.length > 0 && (
          <div className="mb-8">
            <SectionLabel>What your app does right</SectionLabel>
            <div>
              {whatWorksList.map((w: string, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-3"
                  style={{ borderBottom: '1px solid hsl(var(--border))' }}
                >
                  <Check size={14} className="shrink-0 mt-1" style={{ color: '#22c55e' }} />
                  <span className="text-sm text-muted-foreground leading-relaxed">{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QUICK SCAN BANNER */}
        {isQuick && !isPro && (
          <div className="quick-scan-banner bg-card border border-border rounded-lg px-6 py-5 mt-8 flex justify-between items-center gap-4">
            <div>
              <div className="text-sm text-foreground font-medium">
                This was a Quick Scan covering your most critical files.
              </div>
              <div className="text-[13px] text-muted-foreground mt-1">
                A Deep Scan analyzes your full codebase and may find more issues.
              </div>
            </div>
            <Link to="/#pricing" className="vercel-btn-primary text-[13px] px-4.5 py-2.5 whitespace-nowrap">
              Get Deep Scan
            </Link>
          </div>
        )}

        {/* FEEDBACK */}
        {analysisId && <ReportFeedbackCard analysisId={analysisId} />}

        {/* ACTIONS */}
        <div className="report-actions mt-10 flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => navigate(`/analyze/${analysis.app_id}`)}
            className="vercel-btn-primary"
          >
            Scan again
          </button>
          <Link to="/dashboard" className="vercel-btn-secondary">Back to dashboard</Link>
          {isPro && (
            <button onClick={() => window.print()} className="vercel-btn-secondary cursor-pointer">
              Download PDF
            </button>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .report-container { padding-left: 16px !important; padding-right: 16px !important; padding-top: 80px !important; }
          .report-actions { flex-direction: column; align-items: stretch; }
          .report-actions a, .report-actions button { text-align: center; justify-content: center; }
          .quick-scan-banner { flex-direction: column; align-items: flex-start; }
          .quick-scan-banner a { width: 100%; text-align: center; }
        }
      `}</style>
    </div>
  );
}
