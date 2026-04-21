import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Check, ShieldAlert, FileText, AlertCircle, Lock } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import AnalysisLoadingScreen from '@/components/AnalysisLoadingScreen';
import FindingReviewPills from '@/components/FindingReviewPills';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  if (score >= 95) return 'Excellent, launch ready';
  if (score >= 89) return 'Strong, minor polish';
  if (score >= 75) return 'Good, fix a few things';
  if (score >= 65) return 'Needs work, solid base';
  return 'Significant work needed';
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
    <div
      style={{
        fontSize: 11,
        color: '#555555',
        letterSpacing: '0.1em',
        marginBottom: 16,
        textTransform: 'uppercase',
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

// Hero score card. Big intent number with sub-label.
function IntentScoreCard({ score, label }: { score: number; label: string }) {
  const c = scoreColor(score);
  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: 16,
        padding: '40px 32px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: '#555',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        Intent match
      </div>
      <div
        style={{
          fontSize: 88,
          fontWeight: 700,
          letterSpacing: '-0.04em',
          color: c,
          lineHeight: 0.95,
        }}
      >
        {score}
        <span style={{ fontSize: 28, color: '#444', fontWeight: 500, marginLeft: 4 }}>/100</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginTop: 16 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#666', marginTop: 6, lineHeight: 1.5 }}>
        Does your code do what you said your app does?
      </div>
    </div>
  );
}

// Warning chip. Sits below the intent score. Sharp for security, soft for legal/promises.
function WarningChip({
  icon,
  count,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  tone: 'sharp' | 'soft' | 'clear';
  onClick?: () => void;
}) {
  const dotColor =
    tone === 'sharp' ? '#ef4444' : tone === 'soft' ? '#f59e0b' : '#22c55e';
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-card/80"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: dotColor,
          boxShadow: `0 0 0 3px ${dotColor}1f`,
        }}
      />
      <span className="flex text-muted-foreground group-hover:text-foreground transition-colors">
        {icon}
      </span>
      <span className="tabular-nums text-foreground">{count}</span>
      <span className="text-muted-foreground">{label}</span>
    </button>
  );
}

function FindingCard({ f, idx, analysisId }: { f: any; idx: number; analysisId?: string }) {
  const [copied, setCopied] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSending, setDisputeSending] = useState(false);
  const [disputeSent, setDisputeSent] = useState(false);
  const sev = (f.severity || 'medium').toLowerCase();
  const color = SEVERITY_COLORS[sev] || SEVERITY_COLORS.medium;
  const confidence = (f.confidence || 'verified').toLowerCase();
  const confColor =
    confidence === 'verified' ? '#22c55e' : confidence === 'likely' ? '#f59e0b' : '#71717a';
  const confLabel =
    confidence === 'verified' ? 'Verified' : confidence === 'likely' ? 'Likely' : 'Unverified';

  const title = f.title || 'Issue';
  const whatWeFoundRaw = f.what_we_found || f.you_said || f.explanation || '';
  const whatThisMeansRaw = f.what_this_means || f.business_impact || '';
  const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
  // De-duplicate: when the model fills both fields with the same impact text,
  // only render the Impact section once.
  const isDup =
    whatWeFoundRaw &&
    whatThisMeansRaw &&
    (norm(whatWeFoundRaw) === norm(whatThisMeansRaw) ||
      norm(whatWeFoundRaw).includes(norm(whatThisMeansRaw)) ||
      norm(whatThisMeansRaw).includes(norm(whatWeFoundRaw)));
  const whatWeFound = isDup ? '' : whatWeFoundRaw;
  const whatThisMeans = whatThisMeansRaw || (isDup ? whatWeFoundRaw : '');
  const howToFix = f.how_to_fix || '';
  const fixPrompt = f.fix_prompt || '';
  const techRef = f.technical_reference || '';
  const googleQuery = f.google_query || '';

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
      style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: 24,
        marginBottom: 12,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#ffffff', marginBottom: 8, flex: 1 }}>
          {title}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span
            title={confidence === 'unverified' ? 'We could not verify this directly, connect your backend for accurate scans.' : ''}
            style={{
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: confColor, fontWeight: 600, border: `1px solid ${confColor}33`,
              padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
            }}
          >
            {confLabel}
          </span>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {sev}
          </span>
        </div>
      </div>

      {whatThisMeans && (
        <>
          <div style={{ fontSize: 10, color: '#555555', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
            Impact
          </div>
          <div style={{ fontSize: 14, color: '#ffffff', lineHeight: 1.6, marginBottom: 16 }}>
            {whatThisMeans}
          </div>
        </>
      )}

      {/* Verification note — shown when this DB-related finding could not be
          confirmed against a live Supabase connection. Backend marks the
          finding with `requires_supabase_verification` + `verification_note`. */}
      {(f.requires_supabase_verification || (confidence === 'unverified' && f.verification_note)) && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.08em', marginTop: 2, flexShrink: 0 }}>
            NOTE
          </span>
          <div style={{ fontSize: 13, color: '#cbb37a', lineHeight: 1.6 }}>
            {f.verification_note ||
              'Connect your Supabase project to verify this finding accurately. Without Supabase access this is based on code patterns only.'}
            {' '}
            <Link to="/connect" style={{ color: '#f59e0b', textDecoration: 'underline' }}>
              Connect Supabase
            </Link>
          </div>
        </div>
      )}

      {(howToFix || fixPrompt) && (
        <div style={{ borderTop: '1px solid #1a1a1a', margin: '16px 0' }} />
      )}

      {howToFix && (
        <>
          <div style={{ fontSize: 10, color: '#555555', letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
            How to fix
          </div>
          <div style={{ fontSize: 14, color: '#888888', lineHeight: 1.6, marginBottom: 16 }}>
            {howToFix}
          </div>
        </>
      )}

      {fixPrompt && (
        <div style={{ position: 'relative' }}>
          <div
            style={{
              background: '#000000',
              border: '1px solid #222222',
              borderRadius: 6,
              padding: 16,
              paddingTop: 40,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 13,
              color: '#888888',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {fixPrompt}
          </div>
          <button
            onClick={onCopy}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'transparent',
              border: '1px solid #333333',
              color: '#888888',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#555555')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#333333')}
          >
            {copied ? (
              <>
                <Check size={11} /> Copied
              </>
            ) : (
              'Copy prompt'
            )}
          </button>
        </div>
      )}

      {(techRef || googleQuery) && (
        <div style={{ marginTop: 12 }}>
          {techRef && (
            <div style={{ fontSize: 11, color: '#333333', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              {techRef}
            </div>
          )}
          {googleQuery && (
            <div style={{ fontSize: 11, color: '#333333', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', marginTop: 2 }}>
              Search: {googleQuery}
            </div>
          )}
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
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'flex-end' }}>
        {!disputeOpen ? (
          <button
            onClick={() => setDisputeOpen(true)}
            style={{ background: 'transparent', border: 'none', color: '#555555', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#888888')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#555555')}
          >
            Report wrong finding
          </button>
        ) : disputeSent ? (
          <div style={{ fontSize: 12, color: '#22c55e' }}>Thanks, we'll review it.</div>
        ) : (
          <div style={{ width: '100%' }}>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Why is this finding wrong? (e.g., 'I checked, this is actually protected')"
              rows={3}
              style={{
                width: '100%', background: '#000', border: '1px solid #222', borderRadius: 6,
                padding: 10, color: '#fff', fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setDisputeOpen(false); setDisputeReason(''); }}
                style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={submitDispute}
                disabled={disputeSending}
                style={{ background: '#ffffff', border: 'none', color: '#000', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: disputeSending ? 0.6 : 1 }}
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

// Soft, plain card for legal findings (privacy/terms missing or weak).
function LegalCard({ f }: { f: any }) {
  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderLeft: '3px solid #f59e0b',
        borderRadius: 8,
        padding: 22,
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, color: '#ffffff', marginBottom: 8 }}>{f.title}</div>
      {f.what_we_found && (
        <div style={{ fontSize: 14, color: '#888888', lineHeight: 1.6, marginBottom: 12 }}>{f.what_we_found}</div>
      )}
      {f.what_this_means && (
        <>
          <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
            Why it matters
          </div>
          <div style={{ fontSize: 14, color: '#ffffff', lineHeight: 1.6, marginBottom: 12 }}>{f.what_this_means}</div>
        </>
      )}
      {f.how_to_fix && (
        <>
          <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
            What to do
          </div>
          <div style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>{f.how_to_fix}</div>
        </>
      )}
    </div>
  );
}

// Promises vs code, the killer find. Soft tone always.
function PromiseRow({ p }: { p: any }) {
  const v = (p.verdict || 'not_found').toLowerCase();
  const palette =
    v === 'found'
      ? { color: '#22c55e', label: 'Found in code', bg: 'rgba(34,197,94,0.05)' }
      : v === 'partial'
        ? { color: '#f59e0b', label: 'Partial', bg: 'rgba(245,158,11,0.05)' }
        : { color: '#71717a', label: 'Not found in code', bg: 'rgba(113,113,122,0.05)' };
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 16,
        padding: '16px 18px',
        background: palette.bg,
        border: '1px solid #1a1a1a',
        borderRadius: 8,
        marginBottom: 10,
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: '#fff', fontWeight: 500, marginBottom: 6, lineHeight: 1.4 }}>
          {p.claim || '(no claim text)'}
        </div>
        {p.evidence && (
          <div style={{ fontSize: 12, color: '#777', lineHeight: 1.5 }}>
            <span style={{ color: '#555' }}>From your {p.claim_source || 'homepage'} · </span>
            {p.evidence}
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: palette.color,
          border: `1px solid ${palette.color}40`,
          padding: '4px 10px',
          borderRadius: 999,
          height: 'fit-content',
          whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
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
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const generateStarted = useRef(false);

  useEffect(() => {
    if (!analysisId) return;
    const load = async () => {
      const { data } = await supabase.from('analyses').select('*').eq('id', analysisId).single();
      if (!data) {
        toast.error('Report not found');
        return;
      }

      if (!data.fix_prompts || data.status === 'generating_prompts') {
        if (generateStarted.current) return;
        generateStarted.current = true;
        setGenerating(true);
        const { data: app } = await supabase
          .from('apps')
          .select('id,platform')
          .eq('id', data.app_id)
          .single();
        const { data: result, error } = await supabase.functions.invoke('analyze', {
          body: {
            action: 'generate_fixes',
            platform: app?.platform,
            code_understanding: data.code_understanding,
            gaps: data.gaps,
            security_issues: data.security_issues,
            unknown_features: data.unknown_features,
          },
        });
        if (!error && result?.fix_prompts) {
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

  if (loading || generating) {
    return <AnalysisLoadingScreen stage="generating" />;
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

  const attachFix = (item: any, i: number) => {
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
  const falsePromisesList = Array.isArray(analysis.false_promises) ? analysis.false_promises : [];
  const homepageSignals = analysis.homepage_signals || null;
  const grade: string | undefined = analysis.grade;
  const launchStatus: string | undefined = analysis.launch_status;
  const nextStep: string | undefined = analysis.next_step;
  const launchColors: Record<string, { bg: string; text: string; label: string }> = {
    ready:      { bg: 'rgba(34,197,94,0.1)',  text: '#22c55e', label: 'Ready to launch' },
    almost:     { bg: 'rgba(99,102,241,0.1)', text: '#818cf8', label: 'Almost ready' },
    needs_work: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', label: 'Needs work' },
    not_ready:  { bg: 'rgba(249,115,22,0.1)', text: '#f97316', label: 'Not ready' },
    critical:   { bg: 'rgba(239,68,68,0.1)',  text: '#ef4444', label: 'Critical issues' },
  };
  const launchStyle = launchStatus ? (launchColors[launchStatus] || null) : null;

  const { summary, verdict } = splitSummaryVerdict(analysis.summary || '');
  const label = analysis.score_label || scoreLabelFor(score);

  // Promises gating: free tier sees up to 2, the rest are locked behind Pro.
  const promisesVisible = isPro ? promisesList : promisesList.slice(0, 2);
  const promisesLocked = isPro ? 0 : Math.max(0, promisesList.length - 2);

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <DashboardNavbar />

      <div className="report-container" style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px', paddingTop: 96 }}>
        {/* SECTION 1, HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link
            to="/dashboard"
            className="report-back"
            style={{ fontSize: 13, color: '#555555', textDecoration: 'none', cursor: 'pointer' }}
          >
            ← Back to dashboard
          </Link>
          <span
            style={{
              background: 'transparent',
              border: '1px solid #333333',
              color: '#888888',
              fontSize: 10,
              padding: '3px 10px',
              borderRadius: 4,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {isQuick ? 'Quick Scan' : 'Deep Scan'}
          </span>
        </div>

        {/* SECTION 2, INTENT HERO + WARNING CHIPS */}
        <div style={{ padding: '40px 0 12px' }}>
          <IntentScoreCard score={score} label={label} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 20 }}>
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
            {(promisesList.length > 0 || falsePromisesList.length > 0) && (
              <WarningChip
                icon={<AlertCircle size={14} />}
                count={promisesList.length > 0
                  ? promisesList.filter((p: any) => p.verdict !== 'found').length
                  : falsePromisesList.length}
                label="unverified promises"
                tone="soft"
                onClick={() => document.getElementById('promises-section')?.scrollIntoView({ behavior: 'smooth' })}
              />
            )}
            {launchStyle && (
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, background: launchStyle.bg, color: launchStyle.text, border: `1px solid ${launchStyle.text}40` }}>
                {grade && <strong style={{ marginRight: 6 }}>{grade}</strong>}{launchStyle.label}
              </span>
            )}
          </div>
        </div>

        {/* SECTION 3, SUMMARY */}
        {summary && (
          <div
            style={{
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: 8,
              padding: 24,
              marginTop: 32,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: '#555555',
                letterSpacing: '0.1em',
                marginBottom: 12,
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Overview
            </div>
            <div style={{ fontSize: 15, color: '#888888', lineHeight: 1.7 }}>{summary}</div>
            {homepageSignals && (homepageSignals.has_live_url || homepageSignals.readme_found) && (
              <div style={{ fontSize: 12, color: '#555', marginTop: 14, paddingTop: 14, borderTop: '1px solid #1a1a1a' }}>
                We also read your{' '}
                {[
                  homepageSignals.readme_found && 'README',
                  homepageSignals.has_live_url && 'homepage',
                  homepageSignals.privacy_page_found && 'privacy page',
                  homepageSignals.terms_page_found && 'terms page',
                ]
                  .filter(Boolean)
                  .join(', ')}
                .
              </div>
            )}
          </div>
        )}

        {/* NEXT STEP BANNER */}
        {nextStep && (
          <div
            style={{
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 8,
              padding: '16px 20px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <span style={{ color: '#6366f1', fontSize: 16, flexShrink: 0 }}>→</span>
            <div>
              <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Your next step</div>
              <div style={{ fontSize: 15, color: '#ffffff' }}>{nextStep}</div>
            </div>
          </div>
        )}

        {/* SECTION 4, VERDICT */}
        {verdict && (
          <div
            style={{
              padding: 24,
              borderTop: '1px solid #1a1a1a',
              borderBottom: '1px solid #1a1a1a',
              marginBottom: 32,
              textAlign: 'center',
              fontSize: 18,
              fontWeight: 600,
              color: '#ffffff',
              lineHeight: 1.5,
            }}
          >
            {verdict}
          </div>
        )}

        {/* SECTION 5, INTENT GAPS */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>What you wanted vs what your code does</SectionLabel>
          {gapsList.length === 0 ? (
            <div
              style={{
                background: 'rgba(34,197,94,0.06)',
                border: '1px solid rgba(34,197,94,0.18)',
                borderRadius: 8,
                padding: '16px 20px',
                color: '#86efac',
                fontSize: 14,
              }}
            >
              No intent gaps found. Your code matches what you described.
            </div>
          ) : (
            gapsList.map((g: any, i: number) => <FindingCard key={g.id || `g-${i}`} f={g} idx={i} analysisId={analysisId} />)
          )}
        </div>

        {/* SECTION 6, PROMISES VS CODE */}
        {(promisesList.length > 0 || falsePromisesList.length > 0) && (
          <div id="promises-section" style={{ marginBottom: 32 }}>
            <SectionLabel>Promises on your homepage vs your code</SectionLabel>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginTop: -8, marginBottom: 16 }}>
              We read what your homepage and README claim, then checked your code for proof. Items marked
              "not found" may still exist, they were just not in the code we scanned.
            </p>
            {promisesVisible.map((p: any) => (
              <PromiseRow key={p.id} p={p} />
            ))}
            {promisesList.length === 0 && falsePromisesList.map((fp: any, i: number) => (
              <PromiseRow key={fp.id || `fp-${i}`} p={{ claim: fp.claim || fp.title, verdict: 'not_found', evidence: fp.explanation || fp.what_we_found }} />
            ))}
            {promisesLocked > 0 && (
              <div
                style={{
                  background: '#0a0a0a',
                  border: '1px solid #1a1a1a',
                  borderRadius: 8,
                  padding: '20px 24px',
                  marginTop: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <Lock size={18} style={{ color: '#888', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>
                    {promisesLocked} more {promisesLocked === 1 ? 'promise' : 'promises'} to verify
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                    Pro shows the full claim-by-claim table, investor-ready diligence.
                  </div>
                </div>
                <Link
                  to="/#pricing"
                  className="vercel-btn-primary"
                  style={{ fontSize: 13, padding: '10px 18px', whiteSpace: 'nowrap' }}
                >
                  Unlock with Pro
                </Link>
              </div>
            )}
          </div>
        )}

        {/* SECTION 7, SECURITY (sharp tone) */}
        <div id="security-section" style={{ marginBottom: 32 }}>
          <SectionLabel>Security · these can hurt you in production</SectionLabel>
          {secList.length === 0 ? (
            <div
              style={{
                background: 'rgba(34,197,94,0.06)',
                border: '1px solid rgba(34,197,94,0.18)',
                borderRadius: 8,
                padding: '16px 20px',
                color: '#86efac',
                fontSize: 14,
              }}
            >
              No security issues found in the code we scanned.
            </div>
          ) : (
            secList.map((s: any, i: number) => <FindingCard key={s.id || `s-${i}`} f={s} idx={i} analysisId={analysisId} />)
          )}
        </div>

        {/* SECTION 8, LEGAL (soft tone) */}
        {legalList.length > 0 && (
          <div id="legal-section" style={{ marginBottom: 32 }}>
            <SectionLabel>Legal &amp; trust · what to add before launch</SectionLabel>
            {legalList.map((f: any) => <LegalCard key={f.id} f={f} />)}
          </div>
        )}

        {/* SECTION 9, WHAT WORKS (small, demoted) */}
        {whatWorksList.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <SectionLabel>What your app does right</SectionLabel>
            <div>
              {whatWorksList.map((w: string, i: number) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: '1px solid #0f0f0f',
                  }}
                >
                  <Check size={14} style={{ color: '#22c55e', flexShrink: 0, marginTop: 4 }} />
                  <span style={{ fontSize: 14, color: '#888888', lineHeight: 1.5 }}>{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 10, QUICK SCAN BANNER */}
        {isQuick && !isPro && (
          <div
            className="quick-scan-banner"
            style={{
              background: '#0a0a0a',
              border: '1px solid #222222',
              borderRadius: 8,
              padding: '20px 24px',
              marginTop: 32,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>
                This was a Quick Scan covering your most critical files.
              </div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                A Deep Scan analyzes your full codebase and may find more issues.
              </div>
            </div>
            <Link
              to="/#pricing"
              className="vercel-btn-primary"
              style={{ fontSize: 13, padding: '10px 18px', whiteSpace: 'nowrap' }}
            >
              Get Deep Scan
            </Link>
          </div>
        )}

        {/* SECTION 11, ACTIONS */}
        <div
          className="report-actions"
          style={{
            marginTop: 40,
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => navigate(`/analyze/${analysis.app_id}`)}
            className="vercel-btn-primary"
          >
            Scan again
          </button>
          <Link
            to="/dashboard"
            className="vercel-btn-secondary"
          >
            Back to dashboard
          </Link>
          {isPro && (
            <button
              onClick={() => window.print()}
              className="vercel-btn-secondary"
              style={{ cursor: 'pointer' }}
            >
              Download PDF
            </button>
          )}
        </div>
      </div>

      <style>{`
        .report-back:hover { color: #ffffff !important; }
        @media (max-width: 640px) {
          .report-container { padding: 24px 16px !important; padding-top: 88px !important; }
          .report-actions { flex-direction: column; align-items: stretch; }
          .report-actions a, .report-actions button { text-align: center; justify-content: center; }
          .quick-scan-banner { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
