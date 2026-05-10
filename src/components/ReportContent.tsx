import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, Copy, ShieldAlert, FileText, AlertCircle, Database, Lock, Flag,
  Eye, Code2, ExternalLink, Globe, BookOpen, ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReportFeedbackCard from '@/components/ReportFeedbackCard';

/**
 * Inline report renderer used on the Dashboard.
 *
 * Two viewing modes:
 *   - Plain mode (default): hides file paths, code snippets, severity codes,
 *     verified chips, and raw fix prompts. Severity collapses to
 *     "Fix now / Watch out / Minor" so non-technical founders can read it.
 *   - Technical mode: full developer view (file_path:line, code snippet,
 *     copyable fix_prompt, technical_reference).
 *
 * Flagging is a single button → inline textarea → submit-finding-dispute.
 */

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
  info: '#71717a',
};

function plainSeverity(sev: string) {
  const s = (sev || 'medium').toLowerCase();
  if (s === 'critical' || s === 'high') return { label: 'Fix now', color: '#ef4444' };
  if (s === 'medium') return { label: 'Watch out', color: '#f59e0b' };
  return { label: 'Minor', color: '#3b82f6' };
}

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
    <div className="bg-card border border-border rounded-2xl px-6 sm:px-8 py-8 sm:py-10 text-center">
      <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground mb-3">
        Intent match
      </div>
      <div className="font-bold leading-[0.95] tracking-[-0.04em]" style={{ fontSize: 80, color: c }}>
        {score}
        <span className="text-[26px] font-medium ml-1" style={{ color: '#444' }}>/100</span>
      </div>
      <div className="text-base font-medium text-foreground mt-3">{label}</div>
      <div className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
        Does your code do what you said your app does?
      </div>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
        <span aria-hidden style={{ width: 5, height: 5, borderRadius: 999, background: 'hsl(var(--muted-foreground))' }} />
        <span>
          {scanType === 'deep' ? 'Deep scan' : 'Quick scan'} ceiling{' '}
          <span className="text-foreground tabular-nums">{ceiling}/100</span>
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

function FlagFooter({
  analysisId, finding, title, sev,
}: { analysisId?: string; finding: any; title: string; sev: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 5) {
      toast.error('Please add a few words explaining why this is wrong.');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('submit-finding-dispute', {
        body: {
          analysis_id: analysisId,
          finding_id: finding.id,
          finding_name: title,
          finding_category: sev,
          reason: reason.trim(),
        },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Thanks — we'll review this finding.");
      setTimeout(() => { setOpen(false); setSent(false); setReason(''); }, 1500);
    } catch (e: any) {
      toast.error(e.message || 'Could not send.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4 pt-3 border-t border-border">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Flag size={11} /> Flag as wrong
        </button>
      ) : sent ? (
        <div className="text-xs" style={{ color: '#22c55e' }}>Thanks, we'll review it.</div>
      ) : (
        <div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What did we get wrong? (e.g., 'I checked, this is actually protected')"
            rows={2}
            className="w-full bg-background border border-border rounded-md p-2.5 text-foreground text-sm font-sans resize-y"
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button
              onClick={() => { setOpen(false); setReason(''); }}
              className="bg-transparent border border-border text-muted-foreground px-3 py-1.5 rounded-md text-xs"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={sending}
              className="bg-foreground text-background px-3.5 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send to Rismon team'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FindingCard({
  f, idx, analysisId, plainMode,
}: { f: any; idx: number; analysisId?: string; plainMode: boolean }) {
  const [copied, setCopied] = useState(false);

  const sev = (f.severity || 'medium').toLowerCase();
  const techColor = SEVERITY_COLORS[sev] || SEVERITY_COLORS.medium;
  const ps = plainSeverity(sev);
  const color = plainMode ? ps.color : techColor;
  const confidence = (f.confidence || 'verified').toLowerCase();
  const confColor = confidence === 'verified' ? '#22c55e' : '#71717a';
  const confLabel = confidence === 'verified' ? 'Verified' : 'Unverified';

  const title = f.title || 'Issue';
  const whatWeFoundRaw = f.what_we_found || f.you_said || f.explanation || '';
  const whatThisMeansRaw = f.what_this_means || f.business_impact || '';
  const norm = (s: string) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const isDup =
    whatWeFoundRaw && whatThisMeansRaw &&
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

  return (
    <div
      className="bg-card border border-border rounded-lg p-5 sm:p-6 mb-3"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="text-base font-semibold text-foreground mb-2 flex-1">{title}</div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          {!plainMode && (
            <span
              className="text-[10px] uppercase tracking-[0.08em] font-semibold whitespace-nowrap rounded-full px-2 py-[2px]"
              style={{ color: confColor, border: `1px solid ${confColor}33` }}
              title={confidence === 'verified' ? 'Cross-checked by a second AI pass' : 'Could not verify directly'}
            >
              {confLabel}
            </span>
          )}
          <span
            className="text-[10px] uppercase tracking-[0.08em] font-semibold whitespace-nowrap rounded-full px-2 py-[2px]"
            style={{ color, border: `1px solid ${color}40` }}
          >
            {plainMode ? ps.label : sev}
          </span>
        </div>
      </div>

      {showWhatWeFound && (
        <div className="text-sm text-muted-foreground leading-relaxed mb-3">
          {whatWeFoundRaw}
        </div>
      )}

      {!plainMode && filePath && (
        <div className="rounded-md px-3 py-2.5 mb-3.5 font-mono" style={{ background: '#000', border: '1px solid #1a1a1a' }}>
          <div className="text-[11px] mb-1.5" style={{ color: '#666' }}>
            <span style={{ color: '#22c55e' }}>● Proof</span> · {filePath}{lineNumber ? `:${lineNumber}` : ''}
          </div>
          {codeSnippet && (
            <div className="text-[12px] whitespace-pre-wrap" style={{ color: '#aaa' }}>{codeSnippet}</div>
          )}
        </div>
      )}

      {impactText && (
        <>
          <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-1">
            {plainMode ? 'Why this matters' : 'Impact'}
          </div>
          <div className="text-sm text-foreground leading-relaxed mb-4">{impactText}</div>
        </>
      )}

      {!plainMode && (f.requires_supabase_verification || (confidence === 'unverified' && f.verification_note)) && (
        <div
          className="rounded-md px-3.5 py-2.5 mb-4 flex items-start gap-2.5"
          style={{ background: '#150f05', border: '1px solid #473012' }}
        >
          <Database size={14} style={{ color: '#f59e0b', marginTop: 2, flexShrink: 0 }} />
          <div className="text-[13px] leading-relaxed" style={{ color: '#cbb37a' }}>
            {f.verification_note ||
              'Connect your Supabase project to verify this finding accurately.'}{' '}
            <Link to="/connect" className="underline" style={{ color: '#f59e0b' }}>Connect Supabase</Link>
          </div>
        </div>
      )}

      {howToFix && (
        <>
          <div className="border-t border-border my-4" />
          <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-2">
            {plainMode ? 'What to do' : 'How to fix'}
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed mb-3">{howToFix}</div>
        </>
      )}

      {!plainMode && fixPrompt && (
        <div className="relative">
          <div
            className="rounded-md text-[13px] leading-relaxed whitespace-pre-wrap break-words font-mono"
            style={{ background: '#000000', border: '1px solid #222222', color: '#888888', padding: 16, paddingTop: 40 }}
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

      {!plainMode && techRef && (
        <div className="mt-3">
          <div className="text-[11px] font-mono" style={{ color: '#333' }}>{techRef}</div>
        </div>
      )}

      <FlagFooter analysisId={analysisId} finding={f} title={title} sev={sev} />
    </div>
  );
}

function LegalCard({ f }: { f: any }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-3" style={{ borderLeft: '3px solid #f59e0b' }}>
      <div className="text-base font-semibold text-foreground mb-2">{f.title}</div>
      {f.what_we_found && (
        <div className="text-sm text-muted-foreground leading-relaxed mb-3">{f.what_we_found}</div>
      )}
      {f.what_this_means && (
        <>
          <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-1">Why it matters</div>
          <div className="text-sm text-foreground leading-relaxed mb-3">{f.what_this_means}</div>
        </>
      )}
      {f.how_to_fix && (
        <>
          <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-1">What to do</div>
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
      ? { color: '#22c55e', label: 'Delivered', bg: '#08130a' }
      : v === 'partial'
        ? { color: '#f59e0b', label: 'Partial', bg: '#13100a' }
        : { color: '#71717a', label: 'Not found in code', bg: '#0c0c0d' };
  return (
    <div className="grid gap-4 px-4 py-4 rounded-lg mb-2.5 border border-border" style={{ gridTemplateColumns: '1fr auto', background: palette.bg }}>
      <div>
        <div className="text-sm text-foreground font-medium mb-1.5 leading-snug">{p.claim || '(no claim text)'}</div>
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

function HomepageCard({ signals, liveUrl }: { signals: any; liveUrl?: string | null }) {
  if (!signals && !liveUrl) return null;
  const items: Array<{ icon: any; label: string; ok: boolean }> = [
    { icon: Globe, label: 'Live homepage', ok: !!signals?.has_live_url || !!liveUrl },
    { icon: BookOpen, label: 'README', ok: !!signals?.readme_found },
    { icon: ShieldCheck, label: 'Privacy page', ok: !!signals?.privacy_page_found },
    { icon: FileText, label: 'Terms page', ok: !!signals?.terms_page_found },
  ];
  return (
    <div className="bg-card border border-border rounded-lg p-5 sm:p-6 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground mb-2">
            What we read about your app
          </div>
          <div className="text-sm text-foreground leading-relaxed">
            We checked your public site and repo to understand what you promise users.
          </div>
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] text-foreground mt-3 hover:underline"
              style={{ wordBreak: 'break-all' }}
            >
              {liveUrl} <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md px-3 py-2.5"
              style={{
                background: it.ok ? '#08130a' : '#0c0c0d',
                border: `1px solid ${it.ok ? '#16401f' : 'hsl(var(--border))'}`,
              }}
            >
              <Icon size={14} style={{ color: it.ok ? '#22c55e' : '#71717a' }} />
              <span className="text-[12px]" style={{ color: it.ok ? '#86efac' : '#71717a' }}>
                {it.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportContent({
  analysis, app, analysisId, plainMode, onTogglePlainMode, isPro,
}: {
  analysis: any;
  app: any;
  analysisId?: string;
  plainMode: boolean;
  onTogglePlainMode: (v: boolean) => void;
  isPro: boolean;
}) {
  if (!analysis) return null;

  const score = analysis.intent_match_score ?? 0;
  const scanType: string = analysis.scan_type || 'quick';
  const isQuick = scanType === 'quick';

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
  const label = (analysis as any).score_label || scoreLabelFor(score);

  const promisesVisible = isPro ? promisesList : promisesList.slice(0, 2);
  const promisesLocked = isPro ? 0 : Math.max(0, promisesList.length - 2);
  const unverifiedPromises = promisesList.filter((p: any) => p.verdict !== 'found').length;

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground">
          {isQuick ? 'Quick Scan report' : 'Deep Scan report'}
        </div>
        <div
          className="inline-flex rounded-md p-0.5"
          style={{ background: '#0a0a0a', border: '1px solid hsl(var(--border))' }}
        >
          <button
            onClick={() => onTogglePlainMode(true)}
            className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded transition-colors"
            style={{
              background: plainMode ? 'hsl(var(--foreground))' : 'transparent',
              color: plainMode ? 'hsl(var(--background))' : 'hsl(var(--muted-foreground))',
              fontWeight: plainMode ? 600 : 500,
            }}
          >
            <Eye size={12} /> Plain English
          </button>
          <button
            onClick={() => onTogglePlainMode(false)}
            className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded transition-colors"
            style={{
              background: !plainMode ? 'hsl(var(--foreground))' : 'transparent',
              color: !plainMode ? 'hsl(var(--background))' : 'hsl(var(--muted-foreground))',
              fontWeight: !plainMode ? 600 : 500,
            }}
          >
            <Code2 size={12} /> Technical
          </button>
        </div>
      </div>

      {/* Intent score hero */}
      <IntentScoreCard score={score} label={label} scanType={scanType} />
      <div className="flex flex-wrap gap-2.5 justify-center mt-5 mb-8">
        <WarningChip
          icon={<ShieldAlert size={14} />}
          count={secList.length}
          label={secList.length === 1 ? 'security issue' : 'security issues'}
          tone={secList.length === 0 ? 'clear' : 'sharp'}
          onClick={() => document.getElementById('rc-security')?.scrollIntoView({ behavior: 'smooth' })}
        />
        <WarningChip
          icon={<FileText size={14} />}
          count={legalList.length}
          label={legalList.length === 1 ? 'legal gap' : 'legal gaps'}
          tone={legalList.length === 0 ? 'clear' : 'soft'}
          onClick={() => document.getElementById('rc-legal')?.scrollIntoView({ behavior: 'smooth' })}
        />
        {promisesList.length > 0 && (
          <WarningChip
            icon={<AlertCircle size={14} />}
            count={unverifiedPromises}
            label="unverified promises"
            tone="soft"
            onClick={() => document.getElementById('rc-promises')?.scrollIntoView({ behavior: 'smooth' })}
          />
        )}
      </div>

      {/* Homepage / repo signals */}
      <HomepageCard signals={homepageSignals} liveUrl={app?.live_url} />

      {/* Summary */}
      {summary && (
        <div className="bg-card border border-border rounded-lg p-5 sm:p-6 mb-6">
          <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground mb-3">Overview</div>
          <div className="text-[15px] text-muted-foreground leading-[1.7]">{summary}</div>
        </div>
      )}

      {/* Verdict */}
      {verdict && (
        <div
          className="text-center text-lg font-semibold text-foreground leading-snug py-6 mb-8"
          style={{ borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }}
        >
          {verdict}
        </div>
      )}

      {/* Intent gaps */}
      <div className="mb-8">
        <SectionLabel>What you wanted vs what your code does</SectionLabel>
        {gapsList.length === 0 ? (
          <div className="rounded-lg px-5 py-4 text-sm" style={{ background: '#0a160c', border: '1px solid #16401f', color: '#86efac' }}>
            No intent gaps found. Your code matches what you described.
          </div>
        ) : (
          gapsList.map((g: any, i: number) => (
            <FindingCard key={g.id || `g-${i}`} f={g} idx={i} analysisId={analysisId} plainMode={plainMode} />
          ))
        )}
      </div>

      {/* Promises */}
      {promisesList.length > 0 && (
        <div id="rc-promises" className="mb-8">
          <SectionLabel>Promises on your homepage vs your code</SectionLabel>
          <p className="text-[13px] text-muted-foreground leading-relaxed -mt-2 mb-4">
            We read what your homepage and README claim, then checked your code for proof.
          </p>
          {promisesVisible.map((p: any, i: number) => (
            <PromiseRow key={p.id || `p-${i}`} p={p} />
          ))}
          {promisesLocked > 0 && (
            <div className="bg-card border border-border rounded-lg px-5 py-4 mt-3 flex items-center gap-3.5 flex-wrap">
              <Lock size={18} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-[180px]">
                <div className="text-sm text-foreground font-medium">
                  {promisesLocked} more {promisesLocked === 1 ? 'promise' : 'promises'} to verify
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Pro shows the full claim-by-claim table.
                </div>
              </div>
              <Link to="/pricing" className="vercel-btn-primary text-[13px] px-4 py-2 whitespace-nowrap">
                Unlock with Pro
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Security */}
      <div id="rc-security" className="mb-8">
        <SectionLabel>Security · these can hurt you in production</SectionLabel>
        {secList.length === 0 ? (
          <div className="rounded-lg px-5 py-4 text-sm" style={{ background: '#0a160c', border: '1px solid #16401f', color: '#86efac' }}>
            No security issues found in the code we scanned.
          </div>
        ) : (
          secList.map((s: any, i: number) => (
            <FindingCard key={s.id || `s-${i}`} f={s} idx={i} analysisId={analysisId} plainMode={plainMode} />
          ))
        )}
      </div>

      {/* Legal */}
      {legalList.length > 0 && (
        <div id="rc-legal" className="mb-8">
          <SectionLabel>Legal &amp; trust · what to add before launch</SectionLabel>
          {legalList.map((f: any, i: number) => <LegalCard key={f.id || `l-${i}`} f={f} />)}
        </div>
      )}

      {/* What works */}
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

      {/* Quick scan upsell */}
      {isQuick && !isPro && (
        <div className="bg-card border border-border rounded-lg p-5 mt-8 flex justify-between items-center gap-4 flex-wrap">
          <div className="min-w-[200px]">
            <div className="text-sm text-foreground font-medium">
              This was a Quick Scan covering your most critical files.
            </div>
            <div className="text-[13px] text-muted-foreground mt-1">
              A Deep Scan analyzes your full codebase and may find more issues.
            </div>
          </div>
          <Link to="/pricing" className="vercel-btn-primary text-[13px] px-4 py-2 whitespace-nowrap">
            Get Deep Scan
          </Link>
        </div>
      )}

      {/* Feedback */}
      {analysisId && <ReportFeedbackCard analysisId={analysisId} />}
    </div>
  );
}