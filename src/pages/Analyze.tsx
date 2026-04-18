import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, CheckCircle } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import BackButton from '@/components/BackButton';
import WaitlistModal from '@/components/WaitlistModal';
import AnalysisLoadingScreen from '@/components/AnalysisLoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RisGuide from '@/components/RisGuide';
import IntentTags from '@/components/IntentTags';

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
  const [concern, setConcern] = useState('');
  const [intentMeta, setIntentMeta] = useState<{ projectType: string | null; monetization: string | null }>({ projectType: null, monetization: null });
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

  const [scanSessionId, setScanSessionId] = useState<string | null>(null);
  const [resumingSession, setResumingSession] = useState(false);
  const [scanType, setScanType] = useState<'quick' | 'deep'>('quick');
  const [filesScanned, setFilesScanned] = useState(0);
  const scanStartedAtRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Load app and check limits, resume from saved state
  useEffect(() => {
    if (!user || !appId) return;
    const load = async () => {
      const { data: appData } = await supabase.from('apps').select('*').eq('id', appId).single();
      if (!appData) { toast.error('App not found'); navigate('/dashboard'); return; }
      setApp(appData);

      // Check for active scan_session in Supabase
      const { data: activeSession } = await supabase
        .from('scan_sessions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'analyzing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSession) {
        setScanSessionId(activeSession.id);
        setResumingSession(true);
        setStage('analyzing');
        // Poll for completion every 3 seconds
        pollRef.current = setInterval(async () => {
          const { data: updated } = await supabase
            .from('scan_sessions')
            .select('*')
            .eq('id', activeSession.id)
            .single();
          if (updated && updated.status === 'complete' && updated.report_id) {
            if (pollRef.current) clearInterval(pollRef.current);
            setResumingSession(false);
            navigate(`/report/${updated.report_id}`);
          }
        }, 3000);
        return;
      }

      // Check for existing in-progress analysis
      const savedId = localStorage.getItem('rismon_active_analysis');

      if (savedId) {
        const { data: existing } = await supabase.from('analyses').select('*').eq('id', savedId).eq('app_id', appId).single();
        if (existing) {
          setAnalysisId(existing.id);
          if (existing.status === 'questions_ready' && existing.code_understanding) {
            setCodeUnderstanding(existing.code_understanding);
            setQuestions((existing.smart_questions as any[]) || []);
            setStage('describe');
            return;
          }
          if (existing.status === 'review_pending' || existing.status === 'complete') {
            navigate(`/report/${existing.id}`);
            return;
          }
          if (existing.code_understanding) {
            setCodeUnderstanding(existing.code_understanding);
            setQuestions((existing.smart_questions as any[]) || []);
            setStage('describe');
            return;
          }
        }
      }

      // Server enforces all limits — client just proceeds. Server will return code: WEEKLY_LIMIT etc if blocked.
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
      const scanStartedAt = Date.now();
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        const token = s?.provider_token;
        if (!token) { toast.error('GitHub token expired. Please reconnect GitHub from the connect page.'); navigate('/dashboard'); return; }

        // Plan check — determines scan depth
        const { data: planRow } = await supabase
          .from('profiles')
          .select('plan, pro_credits')
          .eq('id', user.id)
          .single();
        const planName = (planRow?.plan || 'free') as string;
        const proCredits = planRow?.pro_credits ?? 0;

        // Try Pro with no credits left → block scan and reset to free
        if (planName === 'try_pro' && proCredits <= 0) {
          await supabase.from('profiles').update({ plan: 'free' }).eq('id', user.id);
          toast.error('You have used your deep scan credit. Your plan has been reset to free.');
          navigate('/dashboard');
          return;
        }

        const isDeepScan = planName === 'try_pro' || planName === 'pro';
        const scanType: 'quick' | 'deep' = isDeepScan ? 'deep' : 'quick';

        // Create analysis record first
        const { data: analysis } = await supabase.from('analyses').insert({
          app_id: appId, user_id: user.id, status: 'reading', scan_type: scanType
        }).select().single();
        if (analysis) {
          setAnalysisId(analysis.id);
          localStorage.setItem('rismon_active_analysis', analysis.id);
        }

        // Create scan_session record
        const { data: newSession } = await supabase.from('scan_sessions').insert({
          user_id: user.id,
          repo_name: `${app.github_owner}/${app.github_repo_name}`,
          status: 'analyzing',
        }).select().single();
        if (newSession) setScanSessionId(newSession.id);

        // Fetch file tree
        const treeRes = await fetch(`https://api.github.com/repos/${app.github_owner}/${app.github_repo_name}/git/trees/HEAD?recursive=1`, {
          headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
        });
        if (!treeRes.ok) { toast.error('Failed to read repository'); navigate('/dashboard'); return; }
        const tree = await treeRes.json();

        const exts = ['.ts', '.tsx', '.js', '.jsx', '.json'];
        const allBlobs = (tree.tree || []).filter((f: any) => f.type === 'blob');

        let frontendFiles: any[] = [];
        let edgeFiles: any[] = [];

        if (scanType === 'quick') {
          // FREE PLAN: prioritized list, capped at 20 files total.
          const candidate = allBlobs.filter((f: any) =>
            exts.some(e => f.path.endsWith(e)) &&
            !f.path.startsWith('supabase/functions/') &&
            (f.size || 0) < 50000
          );

          const priority = (path: string): number => {
            const p = path.toLowerCase();
            if (p === 'package.json' || p.endsWith('/package.json')) return 1;
            if (/(auth|login|signup|signin|register)/.test(p)) return 2;
            if (/(payment|stripe|checkout|billing|subscription|razorpay)/.test(p)) return 3;
            if (/(route|router|app\.tsx|app\.jsx|main\.tsx|main\.jsx)/.test(p)) return 4;
            if (/(supabase|client\.ts|integrations\/supabase)/.test(p)) return 5;
            if (/(pages\/|page\.tsx|page\.jsx)/.test(p)) return 6;
            if (/(query|queries|database|schema|hook)/.test(p)) return 7;
            return 99;
          };

          frontendFiles = candidate
            .map((f: any) => ({ ...f, _prio: priority(f.path) }))
            .sort((a: any, b: any) => a._prio - b._prio || a.path.localeCompare(b.path))
            .slice(0, 20);
          edgeFiles = []; // free plan: no edge function scan
        } else {
          // TRY PRO / PRO: fetch ALL files, no cap.
          frontendFiles = allBlobs.filter((f: any) =>
            exts.some(e => f.path.endsWith(e)) &&
            !f.path.startsWith('supabase/functions/') &&
            (f.size || 0) < 50000
          );
          edgeFiles = allBlobs.filter((f: any) =>
            f.path.startsWith('supabase/functions/') &&
            (f.path.endsWith('.ts') || f.path.endsWith('.js')) &&
            (f.size || 0) < 80000
          );
        }

        const totalFilesToFetch = frontendFiles.length + edgeFiles.length;
        setTotalFiles(totalFilesToFetch);

        // Fetch frontend
        let codeBundle = '';
        for (let i = 0; i < frontendFiles.length; i++) {
          const f = frontendFiles[i];
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

        // Fetch edge functions
        let edgeFunctionBundle = '';
        for (let i = 0; i < edgeFiles.length; i++) {
          const f = edgeFiles[i];
          setFileCount(frontendFiles.length + i + 1);
          setCurrentFile(f.path);
          try {
            const res = await fetch(`https://api.github.com/repos/${app.github_owner}/${app.github_repo_name}/contents/${f.path}`, {
              headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
            });
            const d = await res.json();
            if (d.content) {
              let content = atob(d.content.replace(/\n/g, ''));
              content = content.split('\n').slice(0, 200).join('\n');
              content = content.replace(/sk-[a-zA-Z0-9\-]{20,}/g, '[KEY_REMOVED]').replace(/service_role[^\s"']*/g, '[REMOVED]').replace(/ghp_[a-zA-Z0-9]{30,}/g, '[TOKEN_REMOVED]');
              edgeFunctionBundle += `=== ${f.path} ===\n${content}\n\n`;
            }
          } catch {}
        }
        codeBundle = codeBundle.slice(0, 60000);
        edgeFunctionBundle = edgeFunctionBundle.slice(0, 60000);

        let tableNames = '';
        if (app.supabase_url && app.supabase_anon_key) {
          try {
            const r = await fetch(`${app.supabase_url}/rest/v1/`, { headers: { apikey: app.supabase_anon_key } });
            if (r.ok) { const d = await r.json(); tableNames = Object.keys(d).join(', '); }
          } catch {}
        }

        // Update scan_session with repo size
        const repoSize = new Blob([codeBundle + edgeFunctionBundle]).size;
        if (newSession) {
          await supabase.from('scan_sessions').update({ repo_size_bytes: repoSize }).eq('id', newSession.id);
        }

        // Call edge function
        const { data, error } = await supabase.functions.invoke('analyze', {
          body: { action: 'read_code', codeBundle, edgeFunctionBundle, tableNames, platform: app.platform, app_id: appId, github_owner: app.github_owner, github_repo_name: app.github_repo_name, supabase_url: app.supabase_url, supabase_anon_key: app.supabase_anon_key }
        });
        if (error || !data) { toast.error('Analysis failed. Please try again.'); navigate('/dashboard'); return; }

        // Handle limit/abuse responses from server
        if (data.code === 'WEEKLY_LIMIT' || data.code === 'MONTHLY_LIMIT') {
          setBlocked(true);
          setStage('checking');
          if (newSession) await supabase.from('scan_sessions').delete().eq('id', newSession.id);
          return;
        }
        if (data.code === 'DUPLICATE_SCAN' && data.existingReportId) {
          toast.info('You already scanned this repo recently. Showing your existing report.');
          if (newSession) await supabase.from('scan_sessions').delete().eq('id', newSession.id);
          navigate(`/report/${data.existingReportId}`);
          return;
        }
        if (data.code === 'REPO_TOO_LARGE') {
          toast.error(data.error);
          if (newSession) await supabase.from('scan_sessions').delete().eq('id', newSession.id);
          navigate('/dashboard');
          return;
        }
        if (data.code === 'SCAN_IN_PROGRESS') {
          toast.error(data.error);
          navigate('/dashboard');
          return;
        }
        if (data.error) {
          toast.error(data.error);
          navigate('/dashboard');
          return;
        }

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

    // Update scan_session with intent data
    if (scanSessionId) {
      await supabase.from('scan_sessions').update({
        project_type: intentMeta.projectType,
        payment_type: intentMeta.monetization,
        concern_text: concern,
        status: 'analyzing',
      }).eq('id', scanSessionId);
    }

    try {
      const { data, error } = await supabase.functions.invoke('analyze', {
        body: { action: 'analyze', code_understanding: codeUnderstanding, founder_description: description, user_answers: answers, concern, project_type: intentMeta.projectType, monetization: intentMeta.monetization }
      });
      if (error || !data) { toast.error('Analysis failed'); analysisStarted.current = false; return; }

      await supabase.from('analyses').update({
        user_answers: answers, gaps: data.gaps, unknown_features: data.unknown_features,
        security_issues: data.security_issues, what_works: data.what_works,
        intent_match_score: data.intent_match_score, summary: data.summary, status: 'review_pending'
      }).eq('id', analysisId);

      // Update scan_session to complete
      if (scanSessionId) {
        await supabase.from('scan_sessions').update({
          status: 'complete',
          report_id: analysisId,
        }).eq('id', scanSessionId);
      }

      // Server-side usage increment (handles weekly + monthly atomically)
      try {
        await supabase.functions.invoke('analyze', { body: { action: 'increment_usage' } });
      } catch {}

      // Email notification (server checks plan internally; safe to call always)
      try {
        await supabase.functions.invoke('send-scan-ready-email', {
          body: { report_id: analysisId, app_name: app?.app_name, score: data.intent_match_score }
        });
      } catch {}

      setAnalysisResult(data);
      setStage('review');
      localStorage.removeItem('rismon_active_analysis');
      localStorage.removeItem('rismon_analysis_stage');
    } catch {
      toast.error('Analysis failed');
      analysisStarted.current = false;
    }
  }, [codeUnderstanding, description, answers, analysisId, user, concern, intentMeta, scanSessionId]);

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
            <h2 className="text-foreground text-[22px] font-semibold mt-4">You've used your free scans this week</h2>
            <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
              Free plan includes 3 scans per week.<br />
              Your scans reset every Monday.<br />
              Upgrade to Pro for unlimited deep scans.
            </p>
            <div className="flex flex-col gap-3 mt-6 items-center">
              <button onClick={() => setWaitlistOpen(true)} className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                Upgrade to Pro →
              </button>
              <Link to="/dashboard" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                Come back Monday
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading screens with animated visuals
  if (stage === 'checking' || stage === 'reading' || stage === 'analyzing') {
    if (resumingSession) {
      return (
        <div className="min-h-screen bg-background">
          <DashboardNavbar />
          <div className="flex items-center justify-center pt-40">
            <div className="text-center max-w-[480px]">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <h2 className="text-foreground text-[22px] font-semibold mt-6">Your scan is still running.</h2>
              <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">Please wait...</p>
            </div>
          </div>
        </div>
      );
    }
    return (
      <AnalysisLoadingScreen
        stage={stage === 'checking' ? 'reading' : stage}
        fileCount={fileCount}
        totalFiles={totalFiles}
        currentFile={currentFile}
      />
    );
  }

  // Guard: app failed to load outside of loading stages
  if (!app) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="flex items-center justify-center pt-40">
          <div className="text-center">
            <p className="text-foreground text-lg font-medium">Please select an app first</p>
            <Link to="/dashboard" className="text-primary text-sm mt-3 inline-block hover:underline">Go to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  // Describe stage
  if (stage === 'describe' && !showQuestions) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="max-w-[640px] mx-auto px-5 pt-24 pb-16">
          <BackButton to="/dashboard" label="Dashboard" />
          <p className="text-muted-foreground text-[13px] text-right">Step 1 of 2</p>

          {codeUnderstanding && (
            <div className="rounded-xl p-4 mt-4 mb-6" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p className="text-xs font-semibold" style={{ color: '#818cf8' }}>What we found in your code:</p>
              <p className="text-muted-foreground text-sm mt-2">{codeUnderstanding.business_type_guess}</p>
              {codeUnderstanding.features_found?.slice(0, 5).map((f: string, i: number) => (
                <p key={i} className="text-muted-foreground text-sm">• {f}</p>
              ))}
            </div>
          )}

          <IntentTags value={description} onChange={setDescription} concern={concern} onConcernChange={setConcern} onMetaChange={setIntentMeta} />
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
          <BackButton to="/dashboard" label="Dashboard" />
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
