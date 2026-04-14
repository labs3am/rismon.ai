import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Copy, Check, AlertTriangle, Shield, MinusCircle } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import BackButton from '@/components/BackButton';
import AnalysisLoadingScreen from '@/components/AnalysisLoadingScreen';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Report() {
  const { analysisId } = useParams();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const generateStarted = useRef(false);

  useEffect(() => {
    if (!analysisId) return;
    const load = async () => {
      const { data } = await supabase.from('analyses').select('*').eq('id', analysisId).single();
      if (!data) { toast.error('Report not found'); return; }

      if (!data.fix_prompts || data.status === 'generating_prompts') {
        if (generateStarted.current) return;
        generateStarted.current = true;
        setGenerating(true);
        const { data: app } = await supabase.from('apps').select('*').eq('id', data.app_id).single();
        const { data: result, error } = await supabase.functions.invoke('analyze', {
          body: {
            action: 'generate_fixes', platform: app?.platform,
            code_understanding: data.code_understanding,
            gaps: data.gaps, security_issues: data.security_issues, unknown_features: data.unknown_features,
          }
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

  const copyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const shareScore = () => {
    navigator.clipboard.writeText(`I verified my app with Rismon.ai\nIntent match: ${analysis.intent_match_score}%.\nKnow your app. Trust your product.\nrismon.ai`);
    toast.success('Copied to clipboard');
  };

  if (loading || generating) {
    return <AnalysisLoadingScreen stage="generating" />;
  }

  if (!analysis) return null;

  const { intent_match_score: score, summary, fix_prompts = [], what_works = [], gaps = [], security_issues = [], unknown_features = [] } = analysis;
  const gapsList = Array.isArray(gaps) ? gaps : [];
  const secList = Array.isArray(security_issues) ? security_issues : [];
  const unknownList = Array.isArray(unknown_features) ? unknown_features : [];
  const whatWorksList = Array.isArray(what_works) ? what_works : [];
  const fixList = Array.isArray(fix_prompts) ? fix_prompts : [];

  const scoreColor = score <= 40 ? '#ef4444' : score <= 70 ? '#f59e0b' : '#22c55e';
  const platformColors: Record<string, { bg: string; text: string }> = {
    lovable: { bg: 'rgba(99,102,241,0.1)', text: '#818cf8' },
    cursor: { bg: 'rgba(59,130,246,0.1)', text: '#60a5fa' },
    supabase: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e' },
    general: { bg: 'rgba(113,113,122,0.1)', text: '#71717a' },
  };

  const defaultSecurityAreas = [
    { id: 'sec_api_keys', title: 'API key exposure', status: 'not_checked', explanation: 'Connect your app to check for exposed keys' },
    { id: 'sec_rls', title: 'Database protection (RLS)', status: 'not_checked', explanation: 'Connect Supabase for database security checks' },
    { id: 'sec_auth_routes', title: 'Authentication on routes', status: 'not_checked', explanation: 'Run a full analysis to check route protection' },
    { id: 'sec_env_vars', title: 'Environment variable usage', status: 'not_checked', explanation: 'Run a full analysis to check secret handling' },
    { id: 'sec_rate_limit', title: 'Rate limiting', status: 'not_checked', explanation: 'Run a full analysis to check rate limits' },
    { id: 'sec_public_private', title: 'Public vs private routes', status: 'not_checked', explanation: 'Run a full analysis to check route access' },
  ];

  const securityItems = secList.length > 0 ? secList : defaultSecurityAreas;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="max-w-[800px] mx-auto px-5 pt-24 pb-16">
        <BackButton to="/dashboard" label="Dashboard" />

        <div className="mt-4">
          {gapsList.some((g: any) => g.severity === 'critical') || secList.some((s: any) => s.severity === 'critical')
            ? <RisGuide pageKey="report_critical" message={"Start with the red issues first.\nCopy the fix prompt → paste into Lovable → come back and rescan.\nTakes less than 5 minutes per fix."} />
            : <RisGuide pageKey="report_ok" message={"Great news — no critical issues found.\nCheck the medium issues next and consider a Deep Scan for a full business logic analysis."} />
          }
        </div>

        {/* SECTION 1: Score and summary */}
        <div className="text-center mt-4">
          <div className="w-[130px] h-[130px] rounded-full flex items-center justify-center mx-auto" style={{ border: `3px solid ${scoreColor}` }}>
            <span className="text-foreground text-4xl font-bold">{score}</span>
          </div>
          <p className="text-foreground text-lg font-medium mt-4">{score}% match with your description</p>
          <div className="bg-card border border-border rounded-xl p-5 mt-4">
            <p className="text-muted-foreground text-[15px] leading-[1.6]">{summary}</p>
          </div>
        </div>

        {/* SECTION 2: Gaps */}
        <div className="mt-12">
          <h2 className="text-foreground text-[20px] font-semibold">Business logic gaps</h2>
          {gapsList.length > 0 ? (
            <div className="mt-4 space-y-4">
              {gapsList.map((g: any, i: number) => {
                const bc = g.severity === 'critical' ? '#ef4444' : g.severity === 'high' ? '#f97316' : g.severity === 'medium' ? '#f59e0b' : '#6366f1';
                return (
                  <div key={g.id || i} className="bg-card border border-border rounded-r-2xl p-6" style={{ borderLeft: `4px solid ${bc}` }}>
                    <div className="flex items-center justify-between">
                      <p className="text-foreground font-bold text-[17px]">{g.title}</p>
                      <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: `${bc}20`, color: bc }}>{g.severity}</span>
                    </div>
                    <p className="text-muted-foreground text-[13px] font-semibold mt-3">You described:</p>
                    <p className="text-foreground text-[15px] mt-1">{g.you_said}</p>
                    <p className="text-muted-foreground text-[13px] font-semibold mt-3">What was built:</p>
                    <p className="text-foreground text-[15px] mt-1">{g.what_was_built}</p>
                    <div className="rounded-lg p-3 mt-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <p className="text-destructive text-xs font-semibold">Business impact:</p>
                      <p className="text-foreground text-sm mt-1">{g.business_impact}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl p-6 flex items-center gap-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircle size={24} className="text-success shrink-0" />
              <div>
                <p className="text-foreground font-semibold">No business logic gaps found</p>
                <p className="text-muted-foreground text-sm mt-1">Your app matches your description</p>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Security findings */}
        <div className="mt-12">
          <h2 className="text-foreground text-[20px] font-semibold">Security findings</h2>
          <div className="mt-4 space-y-3">
            {securityItems.map((s: any, i: number) => {
              const isPassed = s.status === 'passed';
              const isNotChecked = s.status === 'not_checked';

              if (isPassed) {
                return (
                  <div key={s.id || i} className="bg-card border border-border rounded-r-2xl p-5" style={{ borderLeft: '4px solid #22c55e' }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-success shrink-0" />
                      <p className="text-success font-semibold text-[15px]">Passed: {s.title}</p>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1 ml-7">{s.explanation || 'We checked this and found no issues'}</p>
                  </div>
                );
              }

              if (isNotChecked) {
                return (
                  <div key={s.id || i} className="bg-card border border-border rounded-r-2xl p-5" style={{ borderLeft: '4px solid #52525b' }}>
                    <div className="flex items-center gap-2">
                      <MinusCircle size={18} style={{ color: '#52525b' }} className="shrink-0" />
                      <p className="text-muted-foreground font-semibold text-[15px]">Not checked: {s.title}</p>
                    </div>
                    <p className="text-sm mt-1 ml-7" style={{ color: '#52525b' }}>{s.explanation}</p>
                  </div>
                );
              }

              const bc = s.severity === 'critical' ? '#ef4444' : s.severity === 'high' ? '#f97316' : s.severity === 'medium' ? '#f59e0b' : '#6366f1';
              return (
                <div key={s.id || i} className="bg-card border border-border rounded-r-2xl p-6" style={{ borderLeft: `4px solid ${bc}` }}>
                  <div className="flex items-center justify-between">
                    <p className="text-foreground font-bold text-[17px]">{s.title}</p>
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: `${bc}20`, color: bc }}>{s.severity}</span>
                  </div>
                  <p className="text-muted-foreground text-[15px] mt-3">{s.explanation}</p>
                  {s.business_impact && (
                    <div className="rounded-lg p-3 mt-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <p className="text-destructive text-xs font-semibold">Business impact:</p>
                      <p className="text-foreground text-sm mt-1">{s.business_impact}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: Unknown features */}
        <div className="mt-12">
          <h2 className="text-foreground text-[20px] font-semibold">Features we found</h2>
          {unknownList.length > 0 ? (
            <div className="mt-4 space-y-4">
              {unknownList.map((f: any, i: number) => (
                <div key={f.id || i} className="bg-card border border-border rounded-2xl p-6">
                  <p className="text-foreground font-bold text-[17px]">{f.feature_name}</p>
                  <p className="text-muted-foreground text-[15px] mt-2">{f.description}</p>
                  <p className="text-muted-foreground text-[13px] italic mt-1">Found in: {f.found_where}</p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="rounded-lg p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <p className="text-warning text-xs font-semibold">If you keep it:</p>
                      <p className="text-muted-foreground text-sm mt-1">{f.risk_if_kept}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <p className="text-destructive text-xs font-semibold">If you remove it:</p>
                      <p className="text-muted-foreground text-sm mt-1">{f.risk_if_removed}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm mt-4">No unexpected features found</p>
          )}
        </div>

        {/* SECTION 5: What works */}
        <div className="mt-12">
          <h2 className="text-foreground text-[20px] font-semibold">What your app does right</h2>
          {whatWorksList.length > 0 ? (
            <div className="mt-4 space-y-2">
              {whatWorksList.map((w: string, i: number) => (
                <div key={i} className="flex items-center gap-2.5 rounded-lg p-3" style={{ background: 'rgba(34,197,94,0.04)' }}>
                  <CheckCircle size={16} className="text-success shrink-0" />
                  <span className="text-muted-foreground text-[15px]">{w}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm mt-4">Analysis did not identify specific passing areas</p>
          )}
        </div>

        {/* SECTION 6: Fix prompts */}
        <div className="mt-12">
          <h2 className="text-foreground text-[20px] font-semibold">Your fix prompts</h2>
          {fixList.length > 0 ? (
            <>
              <p className="text-muted-foreground text-sm mt-1">Made for your app and your code. Copy each prompt and paste it into your platform.</p>
              <div className="mt-6 space-y-5">
                {fixList.map((fp: any, i: number) => {
                  const pc = platformColors[fp.platform?.toLowerCase()] || platformColors.general;
                  return (
                    <div key={i} className="bg-card border border-border rounded-2xl p-7">
                      <div className="flex items-center justify-between">
                        <p className="text-foreground font-bold text-[17px]">{fp.title}</p>
                        <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: pc.bg, color: pc.text }}>{fp.platform}</span>
                      </div>
                      <p className="text-muted-foreground text-[13px] font-semibold mt-4">Where to paste this:</p>
                      <p className="text-foreground text-sm mt-1">{fp.where_to_paste}</p>
                      <div className="relative mt-4 bg-input-bg border border-border rounded-lg p-5">
                        <pre className="text-[14px] text-foreground/90 font-mono whitespace-pre-wrap overflow-x-auto">{fp.prompt}</pre>
                        <button onClick={() => copyPrompt(fp.fix_id || `fp-${i}`, fp.prompt)}
                          className="absolute top-3 right-3 flex items-center gap-1 bg-muted border border-input px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
                          {copiedId === (fp.fix_id || `fp-${i}`) ? <><Check size={12} className="text-success" /> Copied</> : <><Copy size={12} /> Copy</>}
                        </button>
                      </div>
                      {fp.expected_result && (
                        <div className="rounded-lg p-3 mt-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                          <p className="text-success text-xs font-semibold">After applying this fix:</p>
                          <p className="text-foreground text-sm mt-1">{fp.expected_result}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm mt-4">You marked all items as fine. Run a new analysis anytime.</p>
          )}
        </div>

        {/* SECTION 7: Actions */}
        <div className="flex flex-wrap gap-3 mt-12">
          <Link to={`/analyze/${analysis.app_id}`} className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary/90">Analyze again</Link>
          <Link to="/dashboard" className="border border-hover-border text-foreground px-6 py-3 rounded-lg text-sm font-medium hover:border-muted-foreground/30">Back to dashboard</Link>
          <button onClick={shareScore} className="border border-hover-border text-foreground px-6 py-3 rounded-lg text-sm font-medium hover:border-muted-foreground/30">Share my score</button>
        </div>
      </div>
    </div>
  );
}
