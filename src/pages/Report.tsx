import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Copy, Check } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
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

  const { intent_match_score: score, summary, fix_prompts = [], what_works = [] } = analysis;
  const scoreColor = score <= 40 ? '#ef4444' : score <= 70 ? '#f59e0b' : '#22c55e';
  const platformColors: Record<string, { bg: string; text: string }> = {
    lovable: { bg: 'rgba(99,102,241,0.1)', text: '#818cf8' },
    cursor: { bg: 'rgba(59,130,246,0.1)', text: '#60a5fa' },
    supabase: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e' },
    general: { bg: 'rgba(113,113,122,0.1)', text: '#71717a' },
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="max-w-[800px] mx-auto px-5 pt-24 pb-16">
        <div className="flex justify-between items-center">
          <Link to="/dashboard" className="text-muted-foreground text-sm hover:text-foreground">← Dashboard</Link>
        </div>

        {/* Score */}
        <div className="text-center mt-8">
          <div className="w-[130px] h-[130px] rounded-full flex items-center justify-center mx-auto" style={{ border: `3px solid ${scoreColor}` }}>
            <span className="text-foreground text-4xl font-bold">{score}</span>
          </div>
          <p className="text-foreground text-lg font-medium mt-4">{score}% match with your description</p>
          <div className="bg-card border border-border rounded-xl p-5 mt-4"><p className="text-muted-foreground text-[15px] leading-[1.6]">{summary}</p></div>
        </div>

        {/* Fix Prompts */}
        {Array.isArray(fix_prompts) && fix_prompts.length > 0 && (
          <div className="mt-10">
            <h2 className="text-foreground text-[22px] font-semibold">Your fix prompts</h2>
            <p className="text-muted-foreground text-sm mt-1">Made for your app and your code. Copy each prompt and paste it into your platform.</p>
            <div className="mt-6 space-y-5">
              {fix_prompts.map((fp: any, i: number) => {
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
                        {copiedId === (fp.fix_id || `fp-${i}`) ? <><Check size={12} className="text-success" /> Copied ✓</> : <><Copy size={12} /> Copy</>}
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
          </div>
        )}

        {/* What works */}
        {Array.isArray(what_works) && what_works.length > 0 && (
          <div className="mt-10">
            <h2 className="text-foreground text-xl font-semibold">What your app does right</h2>
            <div className="mt-4 space-y-2">
              {what_works.map((w: string, i: number) => (
                <div key={i} className="flex items-center gap-2.5"><CheckCircle size={16} className="text-success shrink-0" /><span className="text-muted-foreground text-[15px]">{w}</span></div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="rounded-2xl p-6 mt-10" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <p className="text-foreground text-[17px] font-semibold">After applying your fixes:</p>
          <ol className="mt-3 space-y-1 text-muted-foreground text-sm list-decimal list-inside">
            <li>Apply each fix prompt to your app</li><li>Deploy your updated version</li><li>Come back to Rismon.ai</li><li>Run a new analysis</li><li>Your score should improve</li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-3 mt-10">
          <Link to={`/analyze/${analysis.app_id}`} className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary/90">Analyze again</Link>
          <Link to="/dashboard" className="border border-hover-border text-foreground px-6 py-3 rounded-lg text-sm font-medium hover:border-muted-foreground/30">Back to dashboard</Link>
          <button onClick={shareScore} className="border border-hover-border text-foreground px-6 py-3 rounded-lg text-sm font-medium hover:border-muted-foreground/30">Share my score</button>
        </div>
      </div>
    </div>
  );
}
