import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import BackButton from '@/components/BackButton';
import WaitlistModal from '@/components/WaitlistModal';
import AnalysisLoadingScreen from '@/components/AnalysisLoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RisGuide from '@/components/RisGuide';
import { PreAnalysis } from '@/components/SmartIntentQuestions';
import AppUnderstandingCard from '@/components/AppUnderstandingCard';
import AiSmartQuestions from '@/components/AiSmartQuestions';
import { githubFetch, getGithubToken, GithubAuthRequiredError, reauthenticateGithub, clearReauthFlag } from '@/lib/github-auth';

export default function Analyze() {
  const { appId } = useParams();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState<'checking' | 'reading' | 'confirm' | 'questions' | 'analyzing' | 'review' | 'failed'>('checking');
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [understandingCorrection, setUnderstandingCorrection] = useState<string>('');
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
  const [preAnalysis, setPreAnalysis] = useState<PreAnalysis | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('gaps');
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  // Keep code bundles in memory so the analyze step can ship them to Gemini for file-level verification.
  const codeBundleRef = useRef<string>('');
  const edgeBundleRef = useRef<string>('');

  // Prevent double API calls
  const readingStarted = useRef(false);
  const analysisStarted = useRef(false);

  const [scanSessionId, setScanSessionId] = useState<string | null>(null);
  const [resumingSession, setResumingSession] = useState(false);
  const [resumeStartedAt, setResumeStartedAt] = useState<number | null>(null);
  const [resumeElapsed, setResumeElapsed] = useState(0);
  const [scanType, setScanType] = useState<'quick' | 'deep'>('quick');
  const [filesScanned, setFilesScanned] = useState(0);
  const scanStartedAtRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guard: ensure the scan-ready email is fired exactly once per report,
  // even if multiple poll ticks land in flight or the user reloads /analyze
  // after the session is already complete.
  const scanReadyHandledRef = useRef<Set<string>>(new Set());

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

  // Clear any stale GitHub re-auth flag on mount. The flag is set right before
  // we redirect the user through OAuth; once they land back here, we MUST clear
  // it so a follow-up reauth attempt (e.g. if Supabase hasn't surfaced the new
  // provider_token yet) can actually run instead of silently no-op'ing and
  // leaving the scan stuck.
  useEffect(() => {
    clearReauthFlag();
  }, []);

  // When the user switches tabs and comes back, re-sync stage from the DB.
  // Without this, the loading screen can show a stale "reading" message even
  // though the scan has progressed to analyzing/questions/complete server-side.
  useEffect(() => {
    if (!user || !appId) return;
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      const savedId = localStorage.getItem('rismon_active_analysis');
      if (!savedId) return;
      const { data: existing } = await supabase
        .from('analyses')
        .select('id, status, code_understanding, smart_questions')
        .eq('id', savedId)
        .maybeSingle();
      if (!existing) return;
      if ((existing.status === 'review_pending' || existing.status === 'complete') && existing.id) {
        navigate(`/report/${existing.id}`);
        return;
      }
      if (existing.status === 'questions_ready' && existing.code_understanding) {
        setCodeUnderstanding(existing.code_understanding);
        setQuestions((existing.smart_questions as any[]) || []);
        setStage('confirm');
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [user, appId, navigate]);

  // Tick elapsed timer while resuming a running scan
  useEffect(() => {
    if (!resumingSession || !resumeStartedAt) return;
    const tick = () => setResumeElapsed(Math.floor((Date.now() - resumeStartedAt) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [resumingSession, resumeStartedAt]);

  // Load app and check limits, resume from saved state
  useEffect(() => {
    if (!user || !appId) return;
    const load = async () => {
      // Do NOT select supabase_url / supabase_anon_key on the client. The analyze
      // edge function looks them up server-side using RLS-restricted access. This
      // prevents these credentials from ever being exposed in browser memory or
      // network responses.
      const { data: appData } = await supabase
        .from('apps')
        .select('id,user_id,app_name,platform,status,live_url,app_description,github_repo_url,github_repo_name,github_owner,created_at')
        .eq('id', appId)
        .single();
      if (!appData) { toast.error('App not found'); navigate('/dashboard'); return; }
      setApp(appData);

      // First reconcile any locally saved analysis. If the report is already
      // ready, never resume the loader again — this prevents completed scans
      // from bouncing back into "analyzing" after a reload/refocus.
      const savedAnalysisId = localStorage.getItem('rismon_active_analysis');
      if (savedAnalysisId) {
        const { data: savedAnalysis } = await supabase
          .from('analyses')
          .select('*')
          .eq('id', savedAnalysisId)
          .eq('app_id', appId)
          .maybeSingle();
        if (savedAnalysis) {
          const reportReady =
            !['failed', 'cancelled'].includes(savedAnalysis.status) &&
            (['review_pending', 'generating_prompts', 'complete'].includes(savedAnalysis.status) ||
              !!savedAnalysis.summary ||
              typeof savedAnalysis.intent_match_score === 'number');
          if (reportReady) {
            localStorage.removeItem('rismon_active_analysis');
            localStorage.removeItem('rismon_analysis_stage');
            navigate(`/report/${savedAnalysis.id}`);
            return;
          }
          if (savedAnalysis.status === 'questions_ready' && savedAnalysis.code_understanding) {
            setAnalysisId(savedAnalysis.id);
            setCodeUnderstanding(savedAnalysis.code_understanding);
            setQuestions((savedAnalysis.smart_questions as any[]) || []);
            setStage('confirm');
            return;
          }
        }
      }

      // Check for active scan_session in Supabase, scoped to this exact repo.
      // A scan running for another app should not hijack this analyze page.
      const { data: activeSession } = await supabase
        .from('scan_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('repo_name', `${appData.github_owner}/${appData.github_repo_name}`)
        .in('status', ['pending', 'analyzing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSession) {
        const startedAtMs = activeSession.created_at ? new Date(activeSession.created_at).getTime() : Date.now();
        const ageSec = Math.floor((Date.now() - startedAtMs) / 1000);

        // Auto-cancel sessions older than 12 minutes. Background analyze
        // jobs typically complete in 2-3 minutes; anything past 12 minutes
        // is almost certainly genuinely stuck (e.g. Gemini upstream outage).
        // We deliberately do NOT auto-fail at 3 minutes anymore — that was
        // killing healthy scans whenever the user switched tabs.
        if (ageSec > 12 * 60) {
          await supabase.from('scan_sessions').update({ status: 'cancelled' }).eq('id', activeSession.id);
          localStorage.removeItem('rismon_active_analysis');
          localStorage.removeItem('rismon_analysis_stage');
          toast.error('Previous scan timed out. Starting fresh.');
          // fall through to a new scan below
        } else {
          setScanSessionId(activeSession.id);
          setResumingSession(true);
          setResumeStartedAt(startedAtMs);
          setStage('analyzing');
          // Poll for completion every 3 seconds
          pollRef.current = setInterval(async () => {
            const { data: updated } = await supabase
              .from('scan_sessions')
              .select('*')
              .eq('id', activeSession.id)
              .single();
            if (!updated) return;
            if (updated.status === 'complete' && updated.report_id) {
              if (pollRef.current) clearInterval(pollRef.current);
              setResumingSession(false);
              navigate(`/report/${updated.report_id}`);
              return;
            }
            if (updated.status === 'cancelled' || updated.status === 'failed') {
              if (pollRef.current) clearInterval(pollRef.current);
              setResumingSession(false);
              localStorage.removeItem('rismon_active_analysis');
              localStorage.removeItem('rismon_analysis_stage');
              toast.error(updated.status === 'failed' ? 'Scan failed. Please try again.' : 'Scan was cancelled.');
              navigate('/dashboard');
              return;
            }
            // Soft timeout: only mark failed after 12 minutes (was 3).
            // The background job on the server controls the real outcome —
            // we never decide "failed" purely from a stale wall clock.
            const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
            if (elapsed > 12 * 60) {
              if (pollRef.current) clearInterval(pollRef.current);
              await supabase.from('scan_sessions').update({ status: 'failed' }).eq('id', activeSession.id);
              setResumingSession(false);
              localStorage.removeItem('rismon_active_analysis');
              localStorage.removeItem('rismon_analysis_stage');
              toast.error('Scan took too long. Please try again.');
              navigate('/dashboard');
            }
          }, 3000);
          return;
        }
      }

      // Check for existing in-progress analysis
      const savedId = localStorage.getItem('rismon_active_analysis');

      if (savedId) {
        const { data: existing } = await supabase.from('analyses').select('*').eq('id', savedId).eq('app_id', appId).single();
        if (existing) {
          // Auto-fail stale 'reading' analyses with no progress (older than 5 min, no files scanned)
          const ageMs = Date.now() - new Date(existing.created_at || Date.now()).getTime();
          const isStaleReading = existing.status === 'reading'
            && !existing.code_understanding
            && !existing.files_scanned
            && ageMs > 5 * 60 * 1000;
          if (isStaleReading) {
            await supabase.from('analyses').update({ status: 'failed' }).eq('id', existing.id);
            localStorage.removeItem('rismon_active_analysis');
            localStorage.removeItem('rismon_analysis_stage');
            // Continue to start a fresh scan below
          } else {
            setAnalysisId(existing.id);
            if (existing.status === 'questions_ready' && existing.code_understanding) {
              setCodeUnderstanding(existing.code_understanding);
              setQuestions((existing.smart_questions as any[]) || []);
              setStage('confirm');
              return;
            }
            if (existing.status === 'review_pending' || existing.status === 'complete') {
              navigate(`/report/${existing.id}`);
              return;
            }
            if (existing.code_understanding) {
              setCodeUnderstanding(existing.code_understanding);
              setQuestions((existing.smart_questions as any[]) || []);
              setStage('confirm');
              return;
            }
            // status 'reading' but recent and no progress → let user wait OR start fresh
            // Clear localStorage so a fresh scan can begin
            localStorage.removeItem('rismon_active_analysis');
            localStorage.removeItem('rismon_analysis_stage');
          }
        } else {
          // Saved id no longer exists in DB — clear it
          localStorage.removeItem('rismon_active_analysis');
          localStorage.removeItem('rismon_analysis_stage');
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
      scanStartedAtRef.current = Date.now();
      try {
        const token = await getGithubToken();
        if (!token) {
          // No provider_token cached. Kick the user through OAuth and bring
          // them back to this exact analyze URL so the scan resumes.
          await reauthenticateGithub({
            redirectTo: `${window.location.origin}/analyze/${appId}`,
            message: 'Reconnecting to GitHub to read your repo…',
          });
          return;
        }

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
        const localScanType: 'quick' | 'deep' = isDeepScan ? 'deep' : 'quick';
        setScanType(localScanType);

        // Create analysis record first
        const { data: analysis } = await supabase.from('analyses').insert({
          app_id: appId, user_id: user.id, status: 'reading', scan_type: localScanType
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

        // Fetch file tree (githubFetch auto-refreshes the token on 401/403)
        let treeRes: Response;
        try {
          treeRes = await githubFetch(
            `https://api.github.com/repos/${app.github_owner}/${app.github_repo_name}/git/trees/HEAD?recursive=1`,
            { reauthRedirectTo: `${window.location.origin}/analyze/${appId}` }
          );
        } catch (err) {
          if (err instanceof GithubAuthRequiredError) return; // OAuth redirect already kicked off
          throw err;
        }
        if (!treeRes.ok) { toast.error('Failed to read repository'); navigate('/dashboard'); return; }
        const tree = await treeRes.json();

        const exts = ['.ts', '.tsx', '.js', '.jsx', '.json'];
        const allBlobs = (tree.tree || []).filter((f: any) => f.type === 'blob');

        let frontendFiles: any[] = [];
        let edgeFiles: any[] = [];

        if (localScanType === 'quick') {
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

          // Free plan: ~40% coverage — scan up to 40 prioritized frontend files.
          frontendFiles = candidate
            .map((f: any) => ({ ...f, _prio: priority(f.path) }))
            .sort((a: any, b: any) => a._prio - b._prio || a.path.localeCompare(b.path))
            .slice(0, 40);
          edgeFiles = []; // free plan: no edge function scan
        } else {
          // TRY PRO / PRO: priority-sorted, capped at 40 files total to stay under edge timeout.
          const frontCandidates = allBlobs.filter((f: any) =>
            exts.some(e => f.path.endsWith(e)) &&
            !f.path.startsWith('supabase/functions/') &&
            (f.size || 0) < 50000
          );
          const edgeCandidates = allBlobs.filter((f: any) =>
            f.path.startsWith('supabase/functions/') &&
            (f.path.endsWith('.ts') || f.path.endsWith('.js')) &&
            (f.size || 0) < 80000
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

          // Reserve up to 10 slots for edge functions, rest for frontend, total cap = 40.
          edgeFiles = edgeCandidates
            .map((f: any) => ({ ...f, _prio: priority(f.path) }))
            .sort((a: any, b: any) => a._prio - b._prio || a.path.localeCompare(b.path))
            .slice(0, 10);
          const remaining = 40 - edgeFiles.length;
          frontendFiles = frontCandidates
            .map((f: any) => ({ ...f, _prio: priority(f.path) }))
            .sort((a: any, b: any) => a._prio - b._prio || a.path.localeCompare(b.path))
            .slice(0, remaining);
        }

        const totalFilesToFetch = frontendFiles.length + edgeFiles.length;
        setTotalFiles(totalFilesToFetch);
        setFilesScanned(totalFilesToFetch);

        // Fetch frontend
        let codeBundle = '';
        for (let i = 0; i < frontendFiles.length; i++) {
          const f = frontendFiles[i];
          setFileCount(i + 1);
          setCurrentFile(f.path);
          try {
            // Use githubFetch so a mid-scan token expiry triggers a single
            // session refresh rather than silently emptying the bundle.
            const res = await githubFetch(
              `https://api.github.com/repos/${app.github_owner}/${app.github_repo_name}/contents/${f.path}`,
              { autoReauth: false }
            );
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
            const res = await githubFetch(
              `https://api.github.com/repos/${app.github_owner}/${app.github_repo_name}/contents/${f.path}`,
              { autoReauth: false }
            );
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
        // Cache for the analyze step (Gemini file re-read verifier needs the actual file contents)
        codeBundleRef.current = codeBundle;
        edgeBundleRef.current = edgeFunctionBundle;

        // Table-name discovery is done server-side inside the analyze edge
        // function so the app's Supabase URL and anon key never reach the browser.
        const tableNames = '';

        // Update scan_session with repo size
        const repoSize = new Blob([codeBundle + edgeFunctionBundle]).size;
        if (newSession) {
          await supabase.from('scan_sessions').update({ repo_size_bytes: repoSize }).eq('id', newSession.id);
        }

        // Call edge function
        const { data, error } = await supabase.functions.invoke('analyze', {
          body: {
            action: 'read_code',
            codeBundle,
            edgeFunctionBundle,
            tableNames,
            platform: app.platform,
            app_id: appId,
            github_owner: app.github_owner,
            github_repo_name: app.github_repo_name,
            // supabase_url / supabase_anon_key are intentionally omitted —
            // the edge function reads them from the apps table under RLS.
            scan_type: localScanType,
            scan_session_id: newSession?.id ?? null,
          }
        });
        // FunctionsHttpError swallows non-2xx response bodies — try to recover them
        // so server-sent error codes (DUPLICATE_SCAN, WEEKLY_LIMIT, etc.) reach the user.
        let payload: any = data;
        if (error && (error as any)?.context?.body) {
          try {
            const ctxBody = (error as any).context.body;
            const text = typeof ctxBody === 'string' ? ctxBody : await new Response(ctxBody).text();
            payload = JSON.parse(text);
          } catch { /* fall through */ }
        }
        if (!payload) {
          if (newSession) await supabase.from('scan_sessions').update({ status: 'failed' }).eq('id', newSession.id);
          const msg = (error as any)?.message || 'Analysis failed. Please try again.';
          setFailureMessage(msg);
          setStage('failed');
          readingStarted.current = false;
          return;
        }

        // Handle limit/abuse responses from server (use recovered payload)
        if (payload.code === 'WEEKLY_LIMIT' || payload.code === 'MONTHLY_LIMIT') {
          setBlocked(true);
          setStage('checking');
          if (newSession) await supabase.from('scan_sessions').delete().eq('id', newSession.id);
          toast.error(payload.error || 'Scan limit reached.');
          return;
        }
        if (payload.code === 'DUPLICATE_SCAN' && payload.existingReportId) {
          toast.info('You already scanned this repo recently. Showing your existing report.');
          if (newSession) await supabase.from('scan_sessions').delete().eq('id', newSession.id);
          navigate(`/report/${payload.existingReportId}`);
          return;
        }
        if (payload.code === 'REPO_TOO_LARGE') {
          toast.error(payload.error);
          if (newSession) await supabase.from('scan_sessions').delete().eq('id', newSession.id);
          navigate('/dashboard');
          return;
        }
        if (payload.code === 'SCAN_IN_PROGRESS') {
          if (newSession) await supabase.from('scan_sessions').update({ status: 'failed' }).eq('id', newSession.id);
          toast.error(payload.error || 'You already have a scan running.');
          navigate('/dashboard');
          return;
        }
        if (payload.code === 'RATE_LIMITED') {
          if (newSession) await supabase.from('scan_sessions').update({ status: 'failed' }).eq('id', newSession.id);
          toast.error(payload.error || 'AI rate limit hit. Try again in a minute.');
          navigate('/dashboard');
          return;
        }
        if (payload.error) {
          if (newSession) await supabase.from('scan_sessions').update({ status: 'failed' }).eq('id', newSession.id);
          setFailureMessage(payload.error);
          setStage('failed');
          readingStarted.current = false;
          return;
        }
        // Re-bind data to recovered payload for the success path below
        const data2 = payload;

        // Update analysis record
        if (analysis) {
          await supabase.from('analyses').update({
            code_understanding: data2.app_understanding,
            smart_questions: data2.questions,
            files_scanned: totalFilesToFetch,
            status: 'questions_ready'
          }).eq('id', analysis.id);
        }

        setCodeUnderstanding(data2.app_understanding);
        const { data: hasBackendData } = await supabase.rpc('app_has_backend', { _app_id: app.id });
        const hasBackend = !!hasBackendData;
        setPreAnalysis({
          ...((data2.pre_analysis as PreAnalysis) || {}),
          backendVisibility: hasBackend ? 'partial' : 'none',
        });
        setQuestions(data2.questions || []);
        setStage('confirm');
        localStorage.setItem('rismon_analysis_stage', 'confirm');
      } catch (e: any) {
        if (scanSessionId) {
          await supabase.from('scan_sessions').update({ status: 'failed' }).eq('id', scanSessionId);
        }
        setFailureMessage(e?.message || 'Analysis failed. The scan may have been interrupted.');
        setStage('failed');
        readingStarted.current = false;
      }
    };
    run();
  }, [stage, app, user]);

  // Stage 3: Analysis
  const runAnalysis = useCallback(async () => {
    if (analysisStarted.current) return;
    analysisStarted.current = true;
    setStage('analyzing');
    // Switch the loader UI into "scan running" mode immediately so the
    // user sees the resume-style timer (and the "you can leave this tab"
    // copy) as soon as the background job is dispatched.
    setResumingSession(true);
    setResumeStartedAt(Date.now());

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
      // Dispatch the heavy analysis as a background job. The edge function
      // returns 202 immediately and runs Gemini/Claude inside
      // EdgeRuntime.waitUntil. The browser then only needs to poll the
      // scan_sessions row — so tab switches, network drops, and fetch
      // throttling can no longer kill an in-flight scan.
      const { data: rawData, error } = await supabase.functions.invoke('analyze', {
        body: {
          action: 'analyze_async',
          app_id: appId,
          scan_session_id: scanSessionId,
          analysis_id: analysisId,
          code_understanding: codeUnderstanding,
          founder_description: description,
          user_answers: answers,
          concern,
          project_type: intentMeta.projectType,
          monetization: intentMeta.monetization,
          scan_type: scanType,
          // Send the bundles so the deterministic scanner can produce
          // verified findings AND so Gemini can re-open cited files.
          codeBundle: codeBundleRef.current,
          edgeFunctionBundle: edgeBundleRef.current,
          // Forward the read_code questions so the harvester can promote
          // their cited file/line evidence into security findings.
          smart_questions: questions,
        }
      });
      // Recover body from non-2xx responses so server error codes reach the user.
      let payload: any = rawData;
      if (error && (error as any)?.context?.body) {
        try {
          const ctxBody = (error as any).context.body;
          const text = typeof ctxBody === 'string' ? ctxBody : await new Response(ctxBody).text();
          payload = JSON.parse(text);
        } catch { /* ignore */ }
      }
      if (!payload) {
        // We could not even kick the job off — that's a real failure.
        // (If the kickoff succeeded we never reach this branch.)
        if (scanSessionId) {
          await supabase.from('scan_sessions').update({ status: 'failed' }).eq('id', scanSessionId);
        }
        setFailureMessage((error as any)?.message || 'Could not start the scan. Please try again.');
        setStage('failed');
        setResumingSession(false);
        analysisStarted.current = false;
        return;
      }
      if (payload.code && ['WEEKLY_LIMIT','MONTHLY_LIMIT','DUPLICATE_SCAN','SCAN_IN_PROGRESS','REPO_TOO_LARGE','RATE_LIMITED','CREDITS_EXHAUSTED'].includes(payload.code)) {
        toast.error(payload.error || 'Scan blocked.');
        setResumingSession(false);
        analysisStarted.current = false;
        return;
      }
      if (payload.error && !payload.background) {
        // The server rejected the kickoff with a real error (not a 202).
        if (scanSessionId) {
          await supabase.from('scan_sessions').update({ status: 'failed' }).eq('id', scanSessionId);
        }
        setFailureMessage(payload.error);
        setStage('failed');
        setResumingSession(false);
        analysisStarted.current = false;
        return;
      }

      // SUCCESS PATH: server accepted the job (HTTP 202). The result is now
      // being computed in the background; we poll scan_sessions for status.
      // The browser tab can be backgrounded, the laptop can sleep briefly,
      // network can blip — none of it kills the scan anymore.
      if (pollRef.current) clearInterval(pollRef.current);
      const startedAt = Date.now();
      pollRef.current = setInterval(async () => {
        try {
          const { data: updatedSession } = await supabase
            .from('scan_sessions')
            .select('status, report_id')
            .eq('id', scanSessionId)
            .single();
          if (!updatedSession) return;

          if (updatedSession.status === 'complete' && updatedSession.report_id) {
            if (pollRef.current) clearInterval(pollRef.current);

            // Fire-and-forget: usage increment + scan-ready email.
            // We deliberately do NOT await these — the user has already
            // earned their report and we don't want to block the redirect.
            //
            // Guard against duplicate sends: multiple poll ticks can land
            // before clearInterval takes effect, and a page reload while the
            // session is already 'complete' would otherwise re-fire the email
            // on every mount. We dedupe per report_id using both an in-memory
            // ref (covers same-tab races) and sessionStorage (covers reloads).
            const reportId = updatedSession.report_id;
            const storageKey = `rismon_scan_ready_sent_${reportId}`;
            const alreadySent =
              scanReadyHandledRef.current.has(reportId) ||
              sessionStorage.getItem(storageKey) === '1';
            if (!alreadySent) {
              scanReadyHandledRef.current.add(reportId);
              try { sessionStorage.setItem(storageKey, '1'); } catch {}
              supabase.functions.invoke('analyze', { body: { action: 'increment_usage' } }).catch(() => {});
              supabase.functions.invoke('send-scan-ready-email', {
                body: { report_id: reportId, app_name: app?.app_name },
              }).catch(() => {});
            }

            // Try Pro: deduct 1 deep-scan credit on the client side too,
            // so the dashboard reflects the new credit balance immediately.
            if (scanType === 'deep' && user) {
              const { data: planRow } = await supabase
                .from('profiles').select('plan, pro_credits').eq('id', user.id).single();
              if (planRow?.plan === 'try_pro') {
                const remaining = Math.max(0, (planRow.pro_credits ?? 0) - 1);
                await supabase.from('profiles').update({
                  pro_credits: remaining,
                  ...(remaining === 0 ? { plan: 'free' } : {}),
                }).eq('id', user.id);
              }
            }

            // Stamp scan_duration on the analyses row using our local clock
            // (server doesn't know exactly when the user started reading).
            const durationSeconds = scanStartedAtRef.current
              ? Math.round((Date.now() - scanStartedAtRef.current) / 1000)
              : null;
            if (durationSeconds && analysisId) {
              await supabase.from('analyses').update({
                scan_duration_seconds: durationSeconds,
                files_scanned: filesScanned,
              }).eq('id', analysisId);
            }

            localStorage.removeItem('rismon_active_analysis');
            localStorage.removeItem('rismon_analysis_stage');
            navigate(`/report/${updatedSession.report_id}`);
            return;
          }

          if (updatedSession.status === 'failed' || updatedSession.status === 'cancelled') {
            if (pollRef.current) clearInterval(pollRef.current);
            setResumingSession(false);
            const failed = updatedSession.status === 'failed';
            setFailureMessage(failed
              ? 'The analysis ran into an error on the server. Please try again.'
              : 'Scan was cancelled.');
            setStage('failed');
            analysisStarted.current = false;
            return;
          }

          // Soft cap: 12 minutes. Anything past this is genuinely stuck.
          const elapsed = Math.floor((Date.now() - startedAt) / 1000);
          if (elapsed > 12 * 60) {
            if (pollRef.current) clearInterval(pollRef.current);
            await supabase.from('scan_sessions').update({ status: 'failed' }).eq('id', scanSessionId);
            setResumingSession(false);
            setFailureMessage('Scan is taking too long. Please try again.');
            setStage('failed');
            analysisStarted.current = false;
          }
        } catch {
          // Network blip while polling — just try again on the next tick.
        }
      }, 3000);
    } catch (e: any) {
      // We only land here if the *kickoff fetch* itself threw. The
      // background job on the server may or may not be running, so we
      // do NOT mark the scan failed from here. Instead we tell the user
      // we'll keep watching, and the visibility-resync effect (or the
      // polling we just installed) will pick up the real outcome.
      console.warn('[analyze] Kickoff fetch threw, waiting for server status:', e);
      // Make sure we're polling even if the catch happened before we set up the interval.
      if (!pollRef.current && scanSessionId) {
        const startedAt = Date.now();
        pollRef.current = setInterval(async () => {
          const { data: s } = await supabase
            .from('scan_sessions').select('status, report_id').eq('id', scanSessionId).single();
          if (!s) return;
          if (s.status === 'complete' && s.report_id) {
            if (pollRef.current) clearInterval(pollRef.current);
            navigate(`/report/${s.report_id}`);
          } else if (s.status === 'failed' || s.status === 'cancelled') {
            if (pollRef.current) clearInterval(pollRef.current);
            setResumingSession(false);
            setFailureMessage('Scan failed. Please try again.');
            setStage('failed');
          } else if (Date.now() - startedAt > 12 * 60 * 1000) {
            if (pollRef.current) clearInterval(pollRef.current);
            setResumingSession(false);
            setFailureMessage('Scan took too long. Please try again.');
            setStage('failed');
          }
        }, 3000);
      }
    }
  }, [codeUnderstanding, description, answers, analysisId, user, concern, intentMeta, scanSessionId, scanType, filesScanned, app, navigate, questions]);

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

  // Loading screens with animated visuals.
  //
  // We intentionally show the calmer "scan running, you can close this tab"
  // UI for ANY analyzing state — whether it's a fresh scan we just kicked
  // off or a session we resumed after a tab refocus. Previously this branch
  // was gated on `resumingSession`, which caused the UI to flash back to
  // the default Rismon AnalysisLoadingScreen at the tail end of a scan.
  if (stage === 'checking' || stage === 'reading' || stage === 'analyzing') {
    // Unified minimal loading screen — same calm Rismon.ai logo + progress
    // bar + "keep this tab open" UI for every in-progress state (checking,
    // reading, analyzing, resuming a session). The full scan/poll/email
    // logic still runs underneath; this just hides the noisy timer UI.
    const loadingStage: 'reading' | 'analyzing' | 'generating' =
      stage === 'analyzing' ? 'analyzing' : 'reading';
    return (
      <AnalysisLoadingScreen
        stage={loadingStage}
        fileCount={fileCount}
        totalFiles={totalFiles}
        currentFile={currentFile}
      />
    );
  }

  // Scan failed — show a clear restart screen instead of bouncing to dashboard
  if (stage === 'failed') {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="max-w-[520px] mx-auto px-5 pt-32 pb-16">
          <div className="rounded-2xl p-8 text-center" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#1f0c0c', border: '1px solid #5e2020' }}>
              <span className="text-destructive text-xl font-semibold">!</span>
            </div>
            <h2 className="text-foreground text-[22px] font-semibold mt-5">Scan was interrupted</h2>
            <p className="text-muted-foreground text-[14px] leading-relaxed mt-3">
              {failureMessage || 'Your scan did not finish.'}
            </p>
            <div className="rounded-lg p-4 mt-6 text-left" style={{ background: '#160d05', border: '1px solid #40200d' }}>
              <p className="text-[12px] font-semibold uppercase" style={{ color: '#f97316', letterSpacing: '0.05em' }}>Tip</p>
              <p className="text-[13px] mt-2" style={{ color: '#a1a1aa', lineHeight: 1.6 }}>
                Scans can fail when you switch tabs or close the window during analysis. Please keep this tab open and active until your report appears.
              </p>
            </div>
            <div className="flex flex-col gap-3 mt-7 items-center">
              <button
                onClick={() => {
                  setFailureMessage(null);
                  setStage('checking');
                  readingStarted.current = false;
                  analysisStarted.current = false;
                  // Re-trigger the loader
                  setTimeout(() => setStage('reading'), 50);
                }}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors w-full"
              >
                Restart scan
              </button>
              <Link to="/dashboard" className="text-muted-foreground text-[13px] hover:text-foreground transition-colors">
                ← Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
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

  // Step 1: Confirm what Claude understood about the app.
  if (stage === 'confirm') {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="pt-20">
          <div className="max-w-[640px] mx-auto px-5">
            <BackButton to="/dashboard" label="Dashboard" />
          </div>
          <AppUnderstandingCard
            understanding={codeUnderstanding || {}}
            onConfirm={(correction) => {
              if (correction) {
                setUnderstandingCorrection(correction);
                setDescription(correction);
                // Stash the correction so the AI sees it as the founder's own description.
                setAnswers((prev) => ({ ...prev, _user_correction: correction }));
              }
              setStage('questions');
              localStorage.setItem('rismon_analysis_stage', 'questions');
            }}
          />
        </div>
      </div>
    );
  }

  // Step 2: Ask Claude's dynamic questions + the always-ask ones.
  if (stage === 'questions') {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="pt-20">
          <div className="max-w-[640px] mx-auto px-5">
            <BackButton to="/dashboard" label="Dashboard" />
          </div>
          <AiSmartQuestions
            signals={{
              hasPayments: !!preAnalysis?.hasPayments,
              hasUserAccounts: !!preAnalysis?.hasUserAccounts,
              hasAdminRoutes: !!preAnalysis?.hasAdminRoutes,
              hasFreePaidTiers: !!preAnalysis?.hasFreePaidTiers,
            }}
            userCorrection={understandingCorrection}
            answers={answers}
            setAnswers={setAnswers}
            onComplete={() => {
              // The founder's "core promise" answer is the most important signal —
              // mirror it into `concern` so the analyze edge function uses it as
              // the primary thing to verify.
              if (answers.corePromise && answers.corePromise !== '__skip__') {
                setConcern(String(answers.corePromise).trim());
              }
              runAnalysis();
            }}
          />
        </div>
      </div>
    );
  }


  // Review stage
  if (stage === 'review' && analysisResult) {
    const { intent_match_score: score, summary, gaps = [], unknown_features = [], security_issues = [], what_works = [] } = analysisResult;
    const scoreColor = score <= 40 ? '#ef4444' : score <= 70 ? '#f59e0b' : '#22c55e';

    return (
      <div className="min-h-screen pb-24" style={{ background: '#000000' }}>
        <DashboardNavbar />
        <div className="max-w-[800px] mx-auto px-5 pt-24 pb-16">
          <BackButton to="/dashboard" label="Dashboard" />
          {/* Score */}
          <div className="text-center">
            <div className="text-[80px] font-bold leading-none tabular-nums" style={{ color: scoreColor, letterSpacing: '-0.03em' }}>{score}</div>
            <p className="mt-3 text-[12px] uppercase font-semibold" style={{ color: '#888888', letterSpacing: '0.1em' }}>Intent Match</p>
            <div className="rounded-xl p-5 mt-6 text-left" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
              <p className="text-[15px] leading-[1.6]" style={{ color: '#ffffff' }}>{summary}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 mt-8" style={{ borderBottom: '1px solid #1a1a1a' }}>
            {[{ k: 'gaps', l: `Gaps (${gaps.length})` }, { k: 'unknown', l: `Unknown features (${unknown_features.length})` }, { k: 'security', l: `Security (${security_issues.length})` }].map(t => (
              <button key={t.k} onClick={() => setActiveTab(t.k)}
                className="pb-3 text-[15px] font-medium transition-colors"
                style={ activeTab === t.k ? { color: '#ffffff', borderBottom: '2px solid #f97316' } : { color: '#888888' } }>{t.l}</button>
            ))}
          </div>

          {/* Gaps */}
          {activeTab === 'gaps' && (
            <div className="mt-6 space-y-4">
              {gaps.map((g: any) => {
                const bc = g.severity === 'critical' ? '#ef4444' : g.severity === 'high' ? '#f97316' : g.severity === 'medium' ? '#f59e0b' : '#6366f1';
                const d = decisions[g.id];
                return (
                  <div key={g.id} className={`rounded-r-2xl p-6 ${d === 'ignore' ? 'opacity-50' : ''}`} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderLeft: `4px solid ${d === 'fix' ? '#f97316' : bc}` }}>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-[17px]" style={{ color: '#ffffff' }}>{g.title}</p>
                      <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: `${bc}20`, color: bc }}>{g.severity}</span>
                    </div>
                    <p className="text-[13px] font-semibold mt-3" style={{ color: '#888888' }}>You said:</p>
                    <p className="text-[15px] mt-1" style={{ color: '#ffffff' }}>{g.you_said}</p>
                    <p className="text-[13px] font-semibold mt-3" style={{ color: '#888888' }}>What was built:</p>
                    <p className="text-[15px] mt-1" style={{ color: '#ffffff' }}>{g.what_was_built}</p>
                    <div className="rounded-lg p-3 mt-4" style={{ background: '#160808', border: '1px solid #321212' }}>
                      <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>Business impact:</p>
                      <p className="text-sm mt-1" style={{ color: '#ffffff' }}>{g.business_impact}</p>
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button onClick={() => setDecisions(p => ({ ...p, [g.id]: 'fix' }))}
                        className="text-[13px] font-medium transition-colors"
                        style={ d === 'fix'
                          ? { background: 'transparent', border: '1px solid #f97316', color: '#f97316', borderRadius: 6, padding: '6px 14px' }
                          : { background: 'transparent', border: '1px solid #333333', color: '#888888', borderRadius: 6, padding: '6px 14px' } }>
                        {d === 'fix' ? 'Added to fix list' : 'Add to fix list'}
                      </button>
                      <button onClick={() => setDecisions(p => ({ ...p, [g.id]: 'ignore' }))}
                        className="text-[13px] transition-colors"
                        style={{ background: 'transparent', border: '1px solid #333333', color: '#888888', borderRadius: 6, padding: '6px 14px' }}>
                        {d === 'ignore' ? 'Ignored' : 'This is fine'}
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
                <div key={f.id} className="rounded-2xl p-6" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
                  <p className="font-bold text-[17px]" style={{ color: '#ffffff' }}>{f.feature_name}</p>
                  <p className="text-[13px] mt-1" style={{ color: '#888888' }}>We found this in your app:</p>
                  <p className="text-[15px] mt-2" style={{ color: '#ffffff' }}>{f.description}</p>
                  <p className="text-[13px] italic mt-1" style={{ color: '#888888' }}>Found in: {f.found_where}</p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="rounded-lg p-3" style={{ background: '#150f05', border: '1px solid #3a2810' }}>
                      <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>If you keep it:</p>
                      <p className="text-sm mt-1" style={{ color: '#888888' }}>{f.risk_if_kept}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: '#160808', border: '1px solid #421616' }}>
                      <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>If you remove it:</p>
                      <p className="text-sm mt-1" style={{ color: '#888888' }}>{f.risk_if_removed}</p>
                    </div>
                  </div>
                  <p className="text-[15px] font-medium mt-4" style={{ color: '#ffffff' }}>Did you ask for this feature?</p>
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => setDecisions(p => ({ ...p, [f.id]: 'keep' }))}
                      className="text-[13px] transition-colors"
                      style={ decisions[f.id] === 'keep'
                        ? { background: 'transparent', border: '1px solid #f97316', color: '#f97316', borderRadius: 6, padding: '6px 14px' }
                        : { background: 'transparent', border: '1px solid #333333', color: '#888888', borderRadius: 6, padding: '6px 14px' } }>Keep this feature</button>
                    <button onClick={() => setDecisions(p => ({ ...p, [f.id]: 'remove' }))}
                      className="text-[13px] transition-colors"
                      style={ decisions[f.id] === 'remove'
                        ? { background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, padding: '6px 14px' }
                        : { background: 'transparent', border: '1px solid #333333', color: '#888888', borderRadius: 6, padding: '6px 14px' } }>Remove this feature</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="mt-6 space-y-4">
              {security_issues.map((s: any) => (
                <div key={s.id} className="rounded-r-2xl p-6" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderLeft: '4px solid #ef4444' }}>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[17px]" style={{ color: '#ffffff' }}>{s.title}</p>
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: '#1f0c0c', color: '#ef4444' }}>{s.severity}</span>
                  </div>
                  <p className="text-[15px] mt-3" style={{ color: '#888888' }}>{s.explanation}</p>
                  <div className="rounded-lg p-3 mt-4" style={{ background: '#160808', border: '1px solid #321212' }}>
                    <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>Business impact:</p>
                    <p className="text-sm mt-1" style={{ color: '#ffffff' }}>{s.business_impact}</p>
                  </div>
                  <button onClick={() => setDecisions(p => ({ ...p, [s.id]: 'fix' }))}
                    className="mt-4 text-[13px] font-medium transition-colors"
                    style={ decisions[s.id] === 'fix'
                      ? { background: 'transparent', border: '1px solid #f97316', color: '#f97316', borderRadius: 6, padding: '6px 14px' }
                      : { background: 'transparent', border: '1px solid #333333', color: '#888888', borderRadius: 6, padding: '6px 14px' } }>
                    {decisions[s.id] === 'fix' ? 'Added to fix list' : 'Add to fix list'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div
          className="fixed bottom-0 left-0 right-0 px-4 sm:px-6 py-3 sm:py-4"
          style={{ background: '#000000', borderTop: '1px solid #1a1a1a', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <div className="max-w-[800px] mx-auto flex items-center justify-between gap-3">
            <p className="text-[13px] sm:text-sm shrink-0" style={{ color: '#888888' }}>{fixCount} <span className="hidden sm:inline">fixes selected</span><span className="sm:hidden">selected</span></p>
            <button
              onClick={generatePrompts}
              disabled={fixCount === 0}
              className="text-[13px] sm:text-[14px] font-medium transition-opacity disabled:opacity-50"
              style={{ background: '#ffffff', color: '#000000', borderRadius: 6, padding: '10px 16px', fontWeight: 500 }}
            >
              Generate fix prompts →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
