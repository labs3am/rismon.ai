import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, CheckCircle } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import WaitlistModal from '@/components/WaitlistModal';
import AnalysisLoadingScreen from '@/components/AnalysisLoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Analyze() {
  const { appId } = useParams();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState<'checking' | 'reading' | 'describe' | 'analyzing' | 'review'>('checking');
  const [app, setApp] = useState<any>(null);
  const [analysisId, setAnalysisId] = useState('');
  const [codeUnderstanding, setCodeUnderstanding] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [questionStep, setQuestionStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showQuestions, setShowQuestions] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('gaps');
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [currentFile, setCurrentFile] = useState('');

  // Prevent double API calls
  const readingStarted = useRef(false);
  const analysisStarted = useRef(false);

  // Persist stage to localStorage
  useEffect(() => {
    if (stage === 'reading' || stage === 'analyzing') {
      localStorage.setItem('rismon_analysis_stage', stage);
    }
  }, [stage]);

  useEffect(() => {
    if (analysisId) {
      localStorage.setItem('rismon_active_analysis', analysisId);
    }
  }, [analysisId]);

  // Load app and check limits, resume from saved state
  useEffect(() => {
    if (!user || !appId) return;
    const load = async () => {
      const { data: appData } = await supabase.from('apps').select('*').eq('id', appId).single();
      if (!appData) { toast.error('App not found'); navigate('/dashboard'); return; }
      setApp(appData);

      // Check for existing in-progress analysis
      const savedId = localStorage.getItem('rismon_active_analysis');
      const savedStage = localStorage.getItem('rismon_analysis_stage');

      if (savedId) {
        const { data: existing } = await supabase.from('analyses').select('*').eq('id', savedId).eq('app_id', appId).single();
        if (existing) {
          setAnalysisId(existing.id);
          if (existing.status === 'questions_ready' && existing.code_understanding) {
            setCodeUnderstanding(existing.code_understanding);
            setQuestions(existing.smart_questions || []);
            setStage('describe');
            return;
          }
          if (existing.status === 'review_pending' || existing.status === 'complete') {
            navigate(`/report/${existing.id}`);
            return;
          }
          // If reading was already done (has code_understanding), skip to describe
          if (existing.code_understanding) {
            setCodeUnderstanding(existing.code_understanding);
            setQuestions(existing.smart_questions || []);
            setStage('describe');
            return;
          }
        }
      }

      // Check weekly limit
      const now = new Date();
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
      const { data: limits } = await supabase.from('scan_limits').select('scan_count').eq('user_id', user.id).gte('scan_date', weekStart.toISOString().split('T')[0]);
      const total = (limits || []).reduce((s, l) => s + (l.scan_count || 0), 0);
      if (total >= 3) { setBlocked(true); setStage('checking'); return; }
      setStage('reading');
    };
    load();
  }, [user, appId]);

  // Stage 1: Reading
  useEffect(() => {
    if (stage !== 'reading' || !app || !user) return;
    if (readingStarted.current) return;
    readingStarted.current = true;

    const run = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        const token = s?.provider_token;
        if (!token) { toast.error('GitHub token expired. Please reconnect GitHub from the connect page.'); navigate('/dashboard'); return; }

        // Create analysis record first
        const { data: analysis } = await supabase.from('analyses').insert({
          app_id: appId, user_id: user.id, status: 'reading'
        }).select().single();
        if (analysis) {
          setAnalysisId(analysis.id);
          localStorage.setItem('rismon_active_analysis', analysis.id);
        }

        // Fetch file tree
        const treeRes = await fetch(`https://api.github.com/repos/${app.github_owner}/${app.github_repo_name}/git/trees/HEAD?recursive=1`, {
          headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
        });
        if (!treeRes.ok) { toast.error('Failed to read repository'); navigate('/dashboard'); return; }
        const tree = await treeRes.json();

        const keywords = ['auth', 'login', 'payment', 'pay', 'stripe', 'razorpay', 'subscription', 'user', 'admin', 'role', 'route', 'api', 'middleware', 'supabase', 'database', 'schema', 'policy', 'hook', 'guard', 'protect', 'permission'];
        const exts = ['.ts', '.tsx', '.js', '.jsx', '.json'];
        const files = (tree.tree || [])
          .filter((f: any) => f.type === 'blob' && exts.some(e => f.path.endsWith(e)) && keywords.some(k => f.path.toLowerCase().includes(k)) && (f.size || 0) < 50000)
          .slice(0, 20);

        setTotalFiles(files.length);

        // Fetch file contents
        let codeBundle = '';
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setFileCount(i + 1);
          setCurrentFile(f.path);
          try {
            const res = await fetch(`https://api.github.com/repos/${app.github_owner}/${app.github_repo_name}/contents/${f.path}`, {
              headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
            });
            const d = await res.json();
            if (d.content) {
              let content = atob(d.content.replace(/\n/g, ''));
              content = content.split('\n').slice(0, 80).join('\n');
              content = content.replace(/sk-[a-zA-Z0-9\-]{20,}/g, '[KEY_REMOVED]').replace(/service_role[^\s"']*/g, '[REMOVED]').replace(/ghp_[a-zA-Z0-9]{30,}/g, '[TOKEN_REMOVED]');
              codeBundle += `=== ${f.path} ===\n${content}\n\n`;
            }
          } catch {}
        }
        codeBundle = codeBundle.slice(0, 15000);

        let tableNames = '';
        if (app.supabase_url && app.supabase_anon_key) {
          try {
            const r = await fetch(`${app.supabase_url}/rest/v1/`, { headers: { apikey: app.supabase_anon_key } });
            if (r.ok) { const d = await r.json(); tableNames = Object.keys(d).join(', '); }
          } catch {}
        }

        // Call edge function
        const { data, error } = await supabase.functions.invoke('analyze', {
          body: { action: 'read_code', codeBundle, tableNames, platform: app.platform }
        });
        if (error || !data) { toast.error('Analysis failed. Please try again.'); navigate('/dashboard'); return; }

        // Update analysis record
        if (analysis) {
          await supabase.from('analyses').update({
            code_understanding: data.app_understanding,
            smart_questions: data.questions,
            status: 'questions_ready'
          }).eq('id', analysis.id);
        }

        setCodeUnderstanding(data.app_understanding);
        setQuestions(data.questions || []);
        setStage('describe');
        localStorage.setItem('rismon_analysis_stage', 'describe');
      } catch (e: any) {
        toast.error(e.message || 'Analysis failed');
        navigate('/dashboard');
      }
    };
    run();
  }, [stage, app, user]);

  // Stage 3: Analysis
  const runAnalysis = useCallback(async () => {
    if (analysisStarted.current) return;
    analysisStarted.current = true;
    setStage('analyzing');
    try {
      const { data, error } = await supabase.functions.invoke('analyze', {
        body: { action: 'analyze', code_understanding: codeUnderstanding, founder_description: description, user_answers: answers }
      });
      if (error || !data) { toast.error('Analysis failed'); analysisStarted.current = false; return; }

      await supabase.from('analyses').update({
        user_answers: answers, gaps: data.gaps, unknown_features: data.unknown_features,
        security_issues: data.security_issues, what_works: data.what_works,
        intent_match_score: data.intent_match_score, summary: data.summary, status: 'review_pending'
      }).eq('id', analysisId);

      // Update scan limits
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase.from('scan_limits').select('*').eq('user_id', user!.id).eq('scan_date', today).single();
      if (existing) {
        await supabase.from('scan_limits').update({ scan_count: (existing.scan_count || 0) + 1 }).eq('id', existing.id);
      } else {
        await supabase.from('scan_limits').insert({ user_id: user!.id, scan_date: today, scan_count: 1 });
      }

      setAnalysisResult(data);
      setStage('review');
      // Clean up localStorage on completion of review stage
      localStorage.removeItem('rismon_active_analysis');
      localStorage.removeItem('rismon_analysis_stage');
    } catch {
      toast.error('Analysis failed');
      analysisStarted.current = false;
    }
  }, [codeUnderstanding, description, answers, analysisId, user]);

  const handleAnswer = (qId: string, val: any) => setAnswers(prev => ({ ...prev, [qId]: val }));

  const fixCount = Object.values(decisions).filter(d => d === 'fix').length;

  const generatePrompts = async () => {
    await supabase.from('analyses').update({ status: 'generating_prompts' }).eq('id', analysisId);
    localStorage.removeItem('rismon_active_analysis');
    localStorage.removeItem('rismon_analysis_stage');
    navigate(`/report/${analysisId}`);
  };

  // Blocked screen
  if (blocked) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
        <div className="flex items-center justify-center pt-40">
          <div className="text-center max-w-[480px]">
            <Clock size={40} className="text-warning mx-auto" />
            <h2 className="text-foreground text-[22px] font-semibold mt-4">Weekly limit reached</h2>
            <p className="text-muted-foreground mt-2">You have used your 3 free analyses for this week. Your scans reset next week.</p>
            <button onClick={() => setWaitlistOpen(true)} className="text-primary text-sm mt-4 hover:underline">Join Pro waitlist</button>
            <Link to="/dashboard" className="block mt-4 border border-hover-border text-foreground px-6 py-2.5 rounded-lg text-sm mx-auto w-fit">Back to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading screens with animated visuals
  if (stage === 'checking' || stage === 'reading' || stage === 'analyzing') {
    return (
      <AnalysisLoadingScreen
        stage={stage === 'checking' ? 'reading' : stage}
        fileCount={fileCount}
        totalFiles={totalFiles}
        currentFile={currentFile}
      />
    );
  }

  // Describe stage
  if (stage === 'describe' && !showQuestions) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="max-w-[640px] mx-auto px-5 pt-24 pb-16">
          <p className="text-muted-foreground text-[13px] text-right">Step 1 of 2</p>
          <h2 className="text-foreground text-2xl font-semibold">Tell us about your app</h2>
          <p className="text-muted-foreground mt-2">We have read your code. Now tell us what your app is supposed to do.</p>
          {codeUnderstanding && (
            <div className="rounded-xl p-4 mt-5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p className="text-xs font-semibold" style={{ color: '#818cf8' }}>What we found in your code:</p>
              <p className="text-muted-foreground text-sm mt-2">{codeUnderstanding.business_type_guess}</p>
              {codeUnderstanding.features_found?.slice(0, 5).map((f: string, i: number) => (
                <p key={i} className="text-muted-foreground text-sm">• {f}</p>
              ))}
            </div>
          )}
          <label className="text-foreground text-[15px] font-semibold block mt-6">What is your app supposed to do?</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Describe in plain English. Example: A marketplace where verified tutors post lessons and students book paid sessions."
            className="w-full bg-input-bg border border-input rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors mt-2 resize-none" />
          <button onClick={() => setShowQuestions(true)} disabled={description.length < 30}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium mt-4 hover:bg-primary/90 disabled:opacity-50">Continue →</button>
        </div>
      </div>
    );
  }

  // Questions stage
  if (stage === 'describe' && showQuestions) {
    const q = questions[questionStep];
    if (!q) {
      runAnalysis();
      return null;
    }
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="max-w-[640px] mx-auto px-5 pt-24 pb-16">
          <p className="text-muted-foreground text-[13px] text-right">Question {questionStep + 1} of {questions.length}</p>
          <h2 className="text-foreground text-[22px] font-semibold">A few questions about your app</h2>
          <div className="bg-card border border-border rounded-2xl p-8 mt-6">
            {q.context && <p className="text-muted-foreground text-sm italic mb-5">{q.context}</p>}
            <p className="text-foreground text-xl font-semibold leading-[1.4]">{q.question}</p>
            <div className="mt-6">
              {q.answer_type === 'yes_no' && (
                <div className="flex gap-3">
                  {['Yes', 'No'].map(v => (
                    <button key={v} onClick={() => handleAnswer(q.id, v)}
                      className={`w-[130px] py-3 rounded-lg text-sm font-medium border transition-colors ${answers[q.id] === v ? 'bg-primary text-primary-foreground border-primary' : 'border-input text-foreground hover:border-hover-border'}`}>{v}</button>
                  ))}
                </div>
              )}
              {q.answer_type === 'text' && (
                <textarea value={answers[q.id] || ''} onChange={e => handleAnswer(q.id, e.target.value)} rows={3} placeholder="Describe in plain English..."
                  className="w-full bg-input-bg border border-input rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none" />
              )}
              {q.answer_type === 'select' && q.options && (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o: string) => (
                    <button key={o} onClick={() => handleAnswer(q.id, o)}
                      className={`px-4 py-2.5 rounded-lg text-sm border transition-colors ${answers[q.id] === o ? 'border-primary bg-primary/10 text-foreground' : 'border-input text-foreground hover:border-hover-border'}`}>{o}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => questionStep > 0 ? setQuestionStep(questionStep - 1) : setShowQuestions(false)} className="text-muted-foreground text-sm hover:text-foreground">← Back</button>
            <button onClick={() => questionStep < questions.length - 1 ? setQuestionStep(questionStep + 1) : runAnalysis()} disabled={!answers[q.id]}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {questionStep < questions.length - 1 ? 'Next →' : 'See my results →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Review stage
  if (stage === 'review' && analysisResult) {
    const { intent_match_score: score, summary, gaps = [], unknown_features = [], security_issues = [], what_works = [] } = analysisResult;
    const scoreColor = score <= 40 ? '#ef4444' : score <= 70 ? '#f59e0b' : '#22c55e';

    return (
      <div className="min-h-screen bg-background pb-24">
        <DashboardNavbar />
        <div className="max-w-[800px] mx-auto px-5 pt-24 pb-16">
          {/* Score */}
          <div className="text-center">
            <div className="w-[120px] h-[120px] rounded-full flex items-center justify-center mx-auto" style={{ border: `3px solid ${scoreColor}` }}>
              <span className="text-foreground text-[32px] font-bold">{score}</span>
            </div>
            <p className="text-foreground text-lg font-medium mt-3">{score}% match with your description</p>
            <div className="bg-card border border-border rounded-xl p-5 mt-4"><p className="text-muted-foreground text-[15px] leading-[1.6]">{summary}</p></div>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-b border-border mt-8">
            {[{ k: 'gaps', l: `Gaps (${gaps.length})` }, { k: 'unknown', l: `Unknown features (${unknown_features.length})` }, { k: 'security', l: `Security (${security_issues.length})` }].map(t => (
              <button key={t.k} onClick={() => setActiveTab(t.k)}
                className={`pb-3 text-[15px] font-medium transition-colors ${activeTab === t.k ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground'}`}>{t.l}</button>
            ))}
          </div>

          {/* Gaps */}
          {activeTab === 'gaps' && (
            <div className="mt-6 space-y-4">
              {gaps.map((g: any) => {
                const bc = g.severity === 'critical' ? '#ef4444' : g.severity === 'high' ? '#f97316' : g.severity === 'medium' ? '#f59e0b' : '#6366f1';
                const d = decisions[g.id];
                return (
                  <div key={g.id} className={`bg-card border border-border rounded-r-2xl p-6 ${d === 'ignore' ? 'opacity-50' : ''}`} style={{ borderLeft: `4px solid ${d === 'fix' ? '#6366f1' : bc}` }}>
                    <div className="flex items-center justify-between">
                      <p className="text-foreground font-bold text-[17px]">{g.title}</p>
                      <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: `${bc}20`, color: bc }}>{g.severity}</span>
                    </div>
                    <p className="text-muted-foreground text-[13px] font-semibold mt-3">You said:</p>
                    <p className="text-foreground text-[15px] mt-1">{g.you_said}</p>
                    <p className="text-muted-foreground text-[13px] font-semibold mt-3">What was built:</p>
                    <p className="text-foreground text-[15px] mt-1">{g.what_was_built}</p>
                    <div className="rounded-lg p-3 mt-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <p className="text-destructive text-xs font-semibold">Business impact:</p>
                      <p className="text-foreground text-sm mt-1">{g.business_impact}</p>
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button onClick={() => setDecisions(p => ({ ...p, [g.id]: 'fix' }))}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${d === 'fix' ? 'bg-primary/10 text-primary border-none' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
                        {d === 'fix' ? '✓ Will be fixed' : 'Fix this'}
                      </button>
                      <button onClick={() => setDecisions(p => ({ ...p, [g.id]: 'ignore' }))}
                        className={`px-5 py-2.5 rounded-lg text-sm border transition-colors ${d === 'ignore' ? 'bg-secondary text-muted-foreground' : 'border-hover-border text-foreground hover:border-muted-foreground/30'}`}>
                        {d === 'ignore' ? '✓ Ignored' : 'This is fine'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Unknown features */}
          {activeTab === 'unknown' && (
            <div className="mt-6 space-y-4">
              {unknown_features.map((f: any) => (
                <div key={f.id} className="bg-card border border-border rounded-2xl p-6">
                  <p className="text-foreground font-bold text-[17px]">{f.feature_name}</p>
                  <p className="text-muted-foreground text-[13px] mt-1">We found this in your app:</p>
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
                  <p className="text-foreground text-[15px] font-medium mt-4">Did you ask for this feature?</p>
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => setDecisions(p => ({ ...p, [f.id]: 'keep' }))}
                      className={`px-5 py-2.5 rounded-lg text-sm border transition-colors ${decisions[f.id] === 'keep' ? 'border-primary bg-primary/10' : 'border-hover-border text-foreground'}`}>Keep this feature</button>
                    <button onClick={() => setDecisions(p => ({ ...p, [f.id]: 'remove' }))}
                      className={`px-5 py-2.5 rounded-lg text-sm border transition-colors ${decisions[f.id] === 'remove' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-destructive/50 text-destructive'}`}>Remove this feature</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="mt-6 space-y-4">
              {security_issues.map((s: any) => (
                <div key={s.id} className="bg-card border border-border rounded-r-2xl p-6" style={{ borderLeft: '4px solid #ef4444' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-foreground font-bold text-[17px]">{s.title}</p>
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{s.severity}</span>
                  </div>
                  <p className="text-muted-foreground text-[15px] mt-3">{s.explanation}</p>
                  <div className="rounded-lg p-3 mt-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <p className="text-destructive text-xs font-semibold">Business impact:</p>
                    <p className="text-foreground text-sm mt-1">{s.business_impact}</p>
                  </div>
                  <button onClick={() => setDecisions(p => ({ ...p, [s.id]: 'fix' }))}
                    className={`mt-4 px-5 py-2.5 rounded-lg text-sm font-medium ${decisions[s.id] === 'fix' ? 'bg-primary/10 text-primary' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
                    {decisions[s.id] === 'fix' ? '✓ Added to fix list' : 'Add to fix list'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-4">
          <div className="max-w-[800px] mx-auto flex items-center justify-between">
            <p className="text-muted-foreground text-sm">{fixCount} fixes selected</p>
            <button onClick={generatePrompts} disabled={fixCount === 0}
              className="bg-primary text-primary-foreground px-7 py-3 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Generate fix prompts →</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
