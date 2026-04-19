import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import AnalysisLoadingScreen from '@/components/AnalysisLoadingScreen';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
};

function scoreColor(score: number) {
  if (score >= 90) return '#22c55e';
  if (score >= 70) return '#f59e0b';
  if (score >= 50) return '#f97316';
  return '#ef4444';
}

function scoreLabelFor(score: number) {
  if (score >= 90) return 'Launch ready';
  if (score >= 70) return 'Almost ready';
  if (score >= 50) return 'Needs work';
  if (score >= 30) return 'Not ready';
  return 'Critical issues';
}

// Try to split a combined "summary verdict" string back into two parts.
function splitSummaryVerdict(text: string): { summary: string; verdict: string } {
  if (!text) return { summary: '', verdict: '' };
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length < 2) return { summary: text.trim(), verdict: '' };
  const verdict = sentences[sentences.length - 1].trim();
  const summary = sentences.slice(0, -1).join(' ').trim();
  return { summary, verdict };
}

// Section label component
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
  const whatWeFound = f.what_we_found || f.you_said || f.explanation || '';
  const whatThisMeans = f.what_this_means || f.business_impact || '';
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
      toast.success('Thanks — we\'ll review this finding.');
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
            title={confidence === 'unverified' ? 'We could not verify this directly — connect your backend for accurate scans.' : ''}
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

      {whatWeFound && (
        <div style={{ fontSize: 14, color: '#888888', lineHeight: 1.6, marginBottom: 12 }}>
          {whatWeFound}
        </div>
      )}

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
                <Check size={11} /> Copied!
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
          <div style={{ fontSize: 12, color: '#22c55e' }}>✓ Thanks — we'll review it.</div>
        ) : (
          <div style={{ width: '100%' }}>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Why is this finding wrong? (e.g., 'RLS is actually enabled on this table — I checked')"
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
                style={{ background: '#f97316', border: 'none', color: '#000', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: disputeSending ? 0.6 : 1 }}
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
        const { data: app } = await supabase.from('apps').select('*').eq('id', data.app_id).single();
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
  // Index fix prompts by fix_id so we can attach them to gaps/security findings
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

  const { summary, verdict } = splitSummaryVerdict(analysis.summary || '');
  const label = analysis.score_label || scoreLabelFor(score);
  const sColor = scoreColor(score);

  // Compute a separate Security score from security findings only.
  // Intent score (above) covers business logic gaps; this gives users a clean
  // "is my data safe?" number alongside it.
  const sevPoints: Record<string, number> = { critical: 20, high: 10, medium: 5, low: 2 };
  const securityDeduction = secList.reduce(
    (sum: number, f: any) => sum + (sevPoints[(f.severity || 'medium').toLowerCase()] || 5),
    0,
  );
  const securityScore = Math.max(0, 100 - securityDeduction);
  const securityColor = scoreColor(securityScore);
  const securityLabel = scoreLabelFor(securityScore);

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <DashboardNavbar />

      <div className="report-container" style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px', paddingTop: 96 }}>
        {/* SECTION 1 — HEADER */}
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

        {/* SECTION 2 — DUAL SCORES (Intent | Security) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            padding: '48px 0 40px',
          }}
        >
          <ScorePanel
            score={score}
            color={sColor}
            label="Intent match"
            sublabel={label}
            tooltip="Does the code do what you said the app does?"
            primary
          />
          <ScorePanel
            score={securityScore}
            color={securityColor}
            label="Security"
            sublabel={securityLabel}
            tooltip="Are your secrets safe and your data protected?"
          />
        </div>

        {/* SECTION 3 — SUMMARY */}
        {summary && (
          <div
            style={{
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: 8,
              padding: 24,
              marginBottom: 32,
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
          </div>
        )}

        {/* SECTION 4 — VERDICT */}
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

        {/* SECTION 5 — BUSINESS LOGIC GAPS */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Business logic gaps</SectionLabel>
          {gapsList.length === 0 ? (
            <div
              style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 8,
                padding: '16px 20px',
                color: '#22c55e',
                fontSize: 14,
              }}
            >
              No business logic gaps found.
            </div>
          ) : (
            gapsList.map((g: any, i: number) => <FindingCard key={g.id || `g-${i}`} f={g} idx={i} analysisId={analysisId} />)
          )}
        </div>

        {/* SECTION 6 — SECURITY FINDINGS */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Security findings</SectionLabel>
          {secList.length === 0 ? (
            <div
              style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 8,
                padding: '16px 20px',
                color: '#22c55e',
                fontSize: 14,
              }}
            >
              No security issues found.
            </div>
          ) : (
            secList.map((s: any, i: number) => <FindingCard key={s.id || `s-${i}`} f={s} idx={i} analysisId={analysisId} />)
          )}
        </div>

        {/* SECTION 7 — WHAT WORKS */}
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
                  <span style={{ color: '#22c55e', fontSize: 16, flexShrink: 0, lineHeight: 1.5 }}>✓</span>
                  <span style={{ fontSize: 14, color: '#888888', lineHeight: 1.5 }}>{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 8 — QUICK SCAN BANNER */}
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
              <div style={{ fontSize: 14, color: '#555555' }}>
                This was a Quick Scan covering your most critical files.
              </div>
              <div style={{ fontSize: 13, color: '#444444', marginTop: 4 }}>
                A Deep Scan analyzes your full codebase and may find more issues.
              </div>
            </div>
            <Link
              to="/#pricing"
              className="deep-scan-cta"
              style={{
                background: 'transparent',
                border: '1px solid #f97316',
                color: '#f97316',
                padding: '10px 20px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(249,115,22,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Get Deep Scan — $14.99
            </Link>
          </div>
        )}

        {/* SECTION 9 — ACTIONS */}
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
            style={{
              background: '#ffffff',
              color: '#000000',
              padding: '12px 24px',
              borderRadius: 8,
              fontWeight: 500,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Scan again
          </button>
          <Link
            to="/dashboard"
            style={{
              background: 'transparent',
              border: '1px solid #333333',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: 8,
              fontWeight: 500,
              fontSize: 14,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Back to dashboard
          </Link>
          {isPro && (
            <button
              onClick={() => window.print()}
              style={{
                background: 'transparent',
                border: '1px solid #333333',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 14,
                cursor: 'pointer',
              }}
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
          .report-score { font-size: 60px !important; }
          .report-actions { flex-direction: column; align-items: stretch; }
          .report-actions a, .report-actions button { text-align: center; justify-content: center; }
          .quick-scan-banner { flex-direction: column; align-items: flex-start; }
          .quick-scan-banner .deep-scan-cta { align-self: stretch; text-align: center; }
        }
      `}</style>
    </div>
  );
}
