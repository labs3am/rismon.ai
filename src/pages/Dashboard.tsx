import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlusCircle, Github, AlertTriangle, RefreshCw, Lock, Plug, ChevronDown,
  Activity, Radio, Sparkles, Rocket, Globe, Pencil, Plus,
} from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import WaitlistModal from '@/components/WaitlistModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getGithubToken, reauthenticateGithub, clearReauthFlag } from '@/lib/github-auth';
import ReportContent from '@/components/ReportContent';
import AnalysisLoadingScreen from '@/components/AnalysisLoadingScreen';
import DashboardSidebar, { SectionKey } from '@/components/dashboard/DashboardSidebar';
import { IntentGaugeCard, PromiseCoverageCard, SeverityBarCard } from '@/components/dashboard/OverviewCards';

// (Overview cards extracted to src/components/dashboard/OverviewCards.tsx)

interface App {
  id: string;
  app_name: string | null;
  github_repo_name: string | null;
  github_owner: string | null;
  platform: string | null;
  live_url: string | null;
  latest_score: number | null;
  latest_date: string | null;
  has_analyses: boolean;
  latest_analysis_id: string | null;
}

const PANEL_BG = '#0a0a0a';
const PANEL_BORDER = '#1f1f1f';

// ============================================================
// Locked / Pro placeholder card used by Performance / Monitoring
// ============================================================
function LockedSection({
  title, icon, description, onUpgrade,
}: { title: string; icon: React.ReactNode; description: string; onUpgrade: () => void }) {
  return (
    <div
      className="rounded-xl p-8 sm:p-12 text-center"
      style={{ background: PANEL_BG, border: '1px dashed #2a2a2a' }}
    >
      <div
        style={{
          width: 56, height: 56, borderRadius: 14, margin: '0 auto',
          background: 'linear-gradient(180deg, #1a1308, #0a0a0a)',
          border: '1px solid #2a2210',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#f97316',
        }}
      >
        {icon}
      </div>
      <div className="mt-5 inline-flex items-center gap-1.5"
        style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#1f1108', color: '#f97316', border: '1px solid #4f2710', letterSpacing: '0.08em' }}>
        <Lock size={10} /> PRO
      </div>
      <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 600, marginTop: 14, letterSpacing: '-0.02em' }}>{title}</h3>
      <p style={{ color: '#888', fontSize: 14, marginTop: 8, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>{description}</p>
      <button
        onClick={onUpgrade}
        style={{
          marginTop: 20, background: '#f97316', color: '#000', border: 'none',
          padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Upgrade to Pro
      </button>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div
      className="rounded-xl text-center"
      style={{ background: PANEL_BG, border: '1px solid #1a1a1a', padding: '56px 24px' }}
    >
      <div
        style={{
          width: 72, height: 72, borderRadius: 18, margin: '0 auto',
          background: 'linear-gradient(180deg, #1a1308, #0a0a0a)',
          border: '1px solid #3a2a14',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#f97316',
        }}
      >
        <Plug size={28} />
      </div>
      <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 600, marginTop: 22, letterSpacing: '-0.02em' }}>
        Connect your first app
      </h2>
      <p style={{ color: '#888', fontSize: 15, marginTop: 10, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
        Your dashboard unlocks the moment you connect a GitHub repo. We'll scan your code, read your homepage, and build a single view of how your app is really doing.
      </p>
      <Link
        to="/connect"
        className="inline-flex items-center gap-2 mt-7"
        style={{ background: '#f97316', color: '#000', padding: '12px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
      >
        <Github size={15} /> Connect a GitHub repo
      </Link>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-[640px] mx-auto">
        {[
          { t: 'Business intent score', d: 'Does your code do what you said?' },
          { t: 'Security findings', d: 'Critical issues, in plain English' },
          { t: 'Homepage promises', d: 'What your site claims vs what your code does' },
        ].map((x) => (
          <div key={x.t} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{x.t}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{x.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScanInProgressPanel({ appName }: { appName: string }) {
  return (
    <div className="rounded-xl p-6" style={{ background: PANEL_BG, border: '1px solid #1f1f1f' }}>
      <div className="flex items-center gap-3">
        <span style={{ position: 'relative', display: 'inline-flex', width: 12, height: 12 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', opacity: 0.6, animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />
          <span style={{ position: 'relative', display: 'inline-flex', width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
        </span>
        <div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>Scan running for {appName}</div>
          <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
            We'll email you when the report is ready. You can leave this page.
          </div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[180px] rounded-xl" />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Skeleton className="h-[140px] rounded-xl" />
        <Skeleton className="h-[140px] rounded-xl" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [reconnectModal, setReconnectModal] = useState<App | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [plainMode, setPlainMode] = useState(true);
  const [section, setSection] = useState<SectionKey>('overview');
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [activeScan, setActiveScan] = useState<{ sessionId: string; appId: string | null; appName: string | null; startedAt: number } | null>(null);
  const generateStarted = useRef<Record<string, boolean>>({});
  const generatingFor = useRef<string | null>(null);
  const [searchParams] = useSearchParams();
  const githubConflict = searchParams.get('github_conflict') === 'true';
  const urlAnalysisId = searchParams.get('analysis');
  const urlAppId = searchParams.get('app');
  const navigate = useNavigate();

  const isPro = (profile?.plan || 'free').toLowerCase() === 'pro' ||
    (profile?.plan || '').toLowerCase().startsWith('try_pro');

  // ---- load apps + analyses ----
  // IMPORTANT: depend on `user?.id` (a stable primitive), NOT the `user`
  // object. Supabase emits a fresh `user` reference on every TOKEN_REFRESHED
  // event (and the SDK auto-refreshes silently in the background). If we
  // depend on the object, this effect re-runs on every refresh, flips
  // `loading` back to `true`, and the dashboard "flashes" / re-loads while
  // the user is just sitting on the page.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data: appsData } = await supabase
        .from('apps')
        .select('id,user_id,app_name,platform,status,live_url,app_description,github_repo_url,github_repo_name,github_owner,created_at')
        .eq('user_id', userId);
      const { data: analysesData } = await supabase.from('analyses').select('*').eq('user_id', userId).order('created_at', { ascending: false });

      const isReportable = (a: any) =>
        ['complete', 'review_pending', 'generating_prompts'].includes(a.status) ||
        a.summary ||
        typeof a.intent_match_score === 'number';

      const appsList: App[] = (appsData || []).map((app) => {
        const appAnalyses = (analysesData || []).filter((a) => a.app_id === app.id && isReportable(a));
        const latest = appAnalyses[0];
        return {
          id: app.id, app_name: app.app_name, github_repo_name: app.github_repo_name,
          github_owner: app.github_owner, platform: app.platform,
          live_url: (app as any).live_url ?? null,
          latest_score: latest?.intent_match_score ?? null,
          latest_date: latest?.created_at ?? null,
          has_analyses: appAnalyses.length > 0,
          latest_analysis_id: latest?.id ?? null,
        };
      });

      setApps(appsList);

      let chosen: string | null = null;
      if (urlAnalysisId) {
        const owning = (analysesData || []).find((a) => a.id === urlAnalysisId);
        if (owning?.app_id) chosen = owning.app_id;
      }
      if (!chosen && urlAppId && appsList.some((a) => a.id === urlAppId)) chosen = urlAppId;
      if (!chosen) {
        const withAnalysis = appsList.find((a) => a.has_analyses);
        chosen = withAnalysis?.id || appsList[0]?.id || null;
      }
      setSelectedAppId(chosen);

      // resume banner
      const { data: liveSession } = await supabase
        .from('scan_sessions')
        .select('id, status, created_at, repo_name')
        .eq('user_id', userId)
        .in('status', ['pending', 'analyzing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (liveSession) {
        const startedAt = liveSession.created_at ? new Date(liveSession.created_at).getTime() : Date.now();
        const ageMin = (Date.now() - startedAt) / 60000;
        if (ageMin <= 12) {
          const owned = appsList.find((a) => `${a.github_owner}/${a.github_repo_name}` === liveSession.repo_name);
          if (!owned) {
            await supabase.from('scan_sessions').update({ status: 'cancelled' }).eq('id', liveSession.id);
            setActiveScan(null);
          } else {
            setActiveScan({ sessionId: liveSession.id, appId: owned.id, appName: owned.app_name ?? liveSession.repo_name ?? 'your app', startedAt });
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [userId, urlAnalysisId, urlAppId]);

  // ---- load analysis for selected app ----
  useEffect(() => {
    let cancelled = false;
    if (!selectedAppId) { setAnalysis(null); return; }
    const selected = apps.find((a) => a.id === selectedAppId);
    const aid = urlAnalysisId || selected?.latest_analysis_id;
    if (!selected || !aid) { setAnalysis(null); return; }
    setAnalysisLoading(true);
    (async () => {
      const { data } = await supabase.from('analyses').select('*').eq('id', aid).maybeSingle();
      if (cancelled) return;
      if (!data || data.app_id !== selectedAppId) { setAnalysis(null); setAnalysisLoading(false); return; }
      // Only generate fix prompts when the analysis pipeline has actually
      // produced findings. If the row is still 'reading' / 'questions_ready'
      // / 'analyzing' (e.g. the user just clicked "Scan again"), skip — the
      // background analyze job hasn't written gaps/security_issues yet, and
      // updating status to 'complete' here would prematurely "finish" the
      // in-progress scan with empty data.
      const readyForFixes =
        data.status === 'review_pending' || data.status === 'generating_prompts';
      if (readyForFixes && !data.fix_prompts) {
        if (!generateStarted.current[aid]) {
          generateStarted.current[aid] = true;
          generatingFor.current = aid;
          setGenerating(true);
          const { data: appPlatform } = await supabase.from('apps').select('platform').eq('id', data.app_id).single();
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
            await supabase.from('analyses').update({ fix_prompts: result.fix_prompts, status: 'complete' }).eq('id', aid);
            (data as any).fix_prompts = result.fix_prompts;
            (data as any).status = 'complete';
          }
          if (generatingFor.current === aid) {
            generatingFor.current = null;
            setGenerating(false);
          }
        }
      }
      if (cancelled) return;
      setAnalysis(data);
      setAnalysisLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedAppId, apps, urlAnalysisId]);

  const relativeDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const handleAnalyzeNow = async (app: App) => {
    // Always clear any stale re-auth flag from a previous OAuth round-trip
    // so that, if the token is still missing, we can trigger a fresh OAuth
    // flow instead of silently no-op'ing.
    clearReauthFlag();
    let token = await getGithubToken();
    if (!token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.provider_token ?? null;
    }
    if (token) {
      navigate(`/analyze/${app.id}`);
    } else {
      // No token cached — go straight through OAuth and come back to the
      // analyze page so the scan resumes immediately, instead of stopping
      // on a modal that the user has to click through.
      await reauthenticateGithub({
        redirectTo: `${window.location.origin}/analyze/${app.id}`,
        message: 'Reconnecting to GitHub to start your scan…',
      });
    }
  };

  const handleReconnectGithub = async () => {
    if (!reconnectModal) return;
    clearReauthFlag();
    await reauthenticateGithub({ redirectTo: `${window.location.origin}/analyze/${reconnectModal.id}`, notify: false });
  };

  const selectedApp = apps.find((a) => a.id === selectedAppId) || null;
  const hasApp = apps.length > 0;

  const promptEditUrl = async (app: App | null) => {
    if (!app) return;
    const current = app.live_url || '';
    const next = window.prompt('Live homepage URL (e.g. https://yoursite.com)', current);
    if (next == null) return;
    const trimmed = next.trim();
    const url = trimmed === '' ? null : (trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    await supabase.from('apps').update({ live_url: url }).eq('id', app.id);
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, live_url: url } : a)));
  };

  // ---------------- Loading skeleton ----------------
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="flex flex-col md:flex-row pt-16">
          <div className="hidden md:block" style={{ width: 240, padding: 20, borderRight: '1px solid #1a1a1a', background: '#080808', height: 'calc(100vh - 64px)' }}>
            <Skeleton className="h-4 w-20 mb-4" />
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 mb-2" />)}
          </div>
          <div className="flex-1 p-6 sm:p-10">
            <Skeleton className="h-7 w-72" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[200px] rounded-xl" />)}
            </div>
            <Skeleton className="h-[300px] rounded-xl mt-6" />
          </div>
        </div>
      </div>
    );
  }

  // ---------------- Main content per section ----------------
  const renderMain = () => {
    if (!hasApp) return <EmptyDashboard />;

    if (activeScan && (!selectedApp || !selectedApp.has_analyses)) {
      return <ScanInProgressPanel appName={activeScan.appName || 'your app'} />;
    }

    if (!selectedApp) return <EmptyDashboard />;

    if (!selectedApp.has_analyses) {
      return (
        <div className="rounded-xl text-center" style={{ background: PANEL_BG, border: '1px dashed #2a2a2a', padding: '48px 24px' }}>
          <Sparkles size={32} style={{ color: '#f97316', margin: '0 auto' }} />
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginTop: 14 }}>No scan yet for this app</h3>
          <p style={{ color: '#888', fontSize: 14, marginTop: 6 }}>Run your first scan to populate the dashboard.</p>
          <button onClick={() => handleAnalyzeNow(selectedApp)}
            style={{ marginTop: 16, background: '#fff', color: '#000', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Run scan
          </button>
        </div>
      );
    }

    if (analysisLoading || generating) return <AnalysisLoadingScreen stage={generating ? 'generating' : 'reading'} />;
    if (!analysis) return null;

    const intentScore = analysis.intent_match_score ?? null;
    const promises = Array.isArray(analysis.landing_page_promises) ? analysis.landing_page_promises : [];

    const secCount = Array.isArray(analysis.security_issues) ? analysis.security_issues.length : 0;
    const secIssues: any[] = Array.isArray(analysis.security_issues) ? analysis.security_issues : [];

    if (section === 'performance') {
      return (
        <LockedSection
          title="Performance monitoring"
          icon={<Activity size={26} />}
          description="Lighthouse-grade metrics for your live site — Core Web Vitals, render-blocking resources, image weight, and weekly trend lines."
          onUpgrade={() => navigate('/pricing')}
        />
      );
    }

    if (section === 'monitoring') {
      return (
        <LockedSection
          title="Continuous monitoring"
          icon={<Radio size={26} />}
          description="Auto re-scan every time you push to GitHub. Get an instant alert if a new security issue, broken promise, or legal gap shows up."
          onUpgrade={() => navigate('/pricing')}
        />
      );
    }

    return (
      <div className="space-y-6">
        {section === 'overview' && (
          <>
            {analysis.summary && (
              <div className="rounded-xl p-5 sm:p-6" style={{ background: '#000', border: '1px solid ' + PANEL_BORDER }}>
                <div className="text-[11px] uppercase tracking-[0.12em] font-semibold mb-3" style={{ color: '#9ca3af' }}>Summary</div>
                <div className="text-[15px] leading-[1.75]" style={{ color: '#ffffff' }}>{analysis.summary}</div>
              </div>
            )}

            <IntentGaugeCard score={intentScore} />

            <PromiseCoverageCard
              liveUrl={selectedApp?.live_url ?? null}
              promises={promises}
              onView={() => setSection('seo')}
            />

            <SeverityBarCard securityIssues={secIssues} onViewAll={() => setSection('security')} />

            <div className="rounded-xl p-5 sm:p-6" style={{ background: PANEL_BG, border: '1px solid ' + PANEL_BORDER }}>
              <ReportContent
                analysis={analysis}
                app={selectedApp}
                analysisId={selectedApp.latest_analysis_id || undefined}
                plainMode={plainMode}
                onTogglePlainMode={setPlainMode}
                isPro={isPro}
                section="overview"
                onNavigateSection={(s) => setSection(s)}
              />
            </div>
          </>
        )}

        {section !== 'overview' && (
          <div className="rounded-xl p-5 sm:p-6" style={{ background: PANEL_BG, border: '1px solid ' + PANEL_BORDER }}>
            <ReportContent
              analysis={analysis}
              app={selectedApp}
              analysisId={selectedApp.latest_analysis_id || undefined}
              plainMode={plainMode}
              onTogglePlainMode={setPlainMode}
              isPro={isPro}
              section={section as any}
            />
          </div>
        )}
      </div>
    );
  };

  // ---------------- Render ----------------
  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

      {reconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="text-center" style={{ background: '#0a0a0a', border: '1px solid #ffffff14', borderRadius: 12, padding: 32, maxWidth: 400, width: '100%', margin: '0 16px' }}>
            <Github size={36} style={{ color: '#888' }} className="mx-auto" />
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 600, marginTop: 16, letterSpacing: '-0.02em' }}>Reconnect GitHub</h3>
            <p style={{ color: '#888', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
              We need to reconnect to GitHub to read your {reconnectModal.github_repo_name} repository.
            </p>
            <button onClick={handleReconnectGithub} className="btn-cyber-primary w-full mt-6">Reconnect GitHub</button>
            <button onClick={() => setReconnectModal(null)} className="w-full py-3 mt-2" style={{ color: '#888', background: 'transparent', border: 'none', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row pt-16">
        <DashboardSidebar
          active={section}
          onSelect={(k) => setSection(k)}
          hasApp={hasApp}
          isPro={isPro}
        />

        <main className="flex-1 min-w-0">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10">
            {/* Header bar: app switcher + scan again */}
            {hasApp && (
              <div className="flex flex-wrap items-center gap-3 justify-between mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <button
                      onClick={() => setAppSwitcherOpen((o) => !o)}
                      className="inline-flex items-center gap-2"
                      style={{
                        background: PANEL_BG, border: '1px solid #222', borderRadius: 8,
                        padding: '8px 12px', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      <Github size={13} />
                      <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedApp ? (selectedApp.github_repo_name ? `${selectedApp.github_owner}/${selectedApp.github_repo_name}` : selectedApp.app_name) : 'Pick an app'}
                      </span>
                      <ChevronDown size={13} style={{ color: '#888' }} />
                    </button>
                    {appSwitcherOpen && (
                      <div
                        className="absolute left-0 mt-2 w-72 z-40"
                        style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', padding: 6 }}
                      >
                        {apps.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => { setSelectedAppId(a.id); setAppSwitcherOpen(false); }}
                            className="w-full text-left px-3 py-2 rounded-md"
                            style={{ background: a.id === selectedAppId ? '#181818' : 'transparent', color: '#fff', fontSize: 13, border: 'none', cursor: 'pointer' }}
                          >
                            <div style={{ fontWeight: 500 }}>
                              {a.github_repo_name ? `${a.github_owner}/${a.github_repo_name}` : a.app_name}
                            </div>
                            {a.latest_date && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Last scan {relativeDate(a.latest_date)}</div>}
                          </button>
                        ))}
                        <Link
                          to="/connect"
                          onClick={() => setAppSwitcherOpen(false)}
                          className="block px-3 py-2 mt-1 rounded-md"
                          style={{ borderTop: '1px solid #1a1a1a', color: '#f97316', fontSize: 13, textDecoration: 'none' }}
                        >
                          <PlusCircle size={12} style={{ display: 'inline', marginRight: 6 }} /> Connect another app
                        </Link>
                      </div>
                    )}
                  </div>
                  {selectedApp?.latest_date && (
                    <span style={{ color: '#666', fontSize: 12 }}>· Last scan {relativeDate(selectedApp.latest_date)}</span>
                  )}
                  {selectedApp && (
                    selectedApp.live_url ? (
                      <button
                        onClick={() => promptEditUrl(selectedApp)}
                        className="inline-flex items-center gap-1.5"
                        style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 999, padding: '5px 10px', color: '#cbd5e1', fontSize: 12, cursor: 'pointer' }}
                        title="Edit homepage URL"
                      >
                        <Globe size={11} style={{ color: '#888' }} />
                        <span>Verifying against: {selectedApp.live_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                        <Pencil size={10} style={{ color: '#888' }} />
                      </button>
                    ) : null
                  )}
                </div>
                {selectedApp && (
                  <button
                    onClick={() => handleAnalyzeNow(selectedApp)}
                    className="inline-flex items-center gap-1.5"
                    style={{ background: '#fff', color: '#000', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                  >
                    <RefreshCw size={13} /> {selectedApp.has_analyses ? 'Scan again' : 'Run first scan'}
                  </button>
                )}
              </div>
            )}

            {githubConflict && (
              <div className="flex items-start gap-3 mb-4 p-4" style={{ background: '#1a0a0a', border: '1px solid #421616', borderRadius: 8 }}>
                <AlertTriangle size={20} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                <p style={{ color: '#fff', fontSize: 14 }}>GitHub is already linked to a different account.</p>
              </div>
            )}

            {activeScan && hasApp && selectedApp?.has_analyses && (
              <div className="mb-4 p-3 flex items-center justify-between gap-3" style={{ background: '#10111e', border: '1px solid #363c70', borderRadius: 10 }}>
                <div className="flex items-center gap-3 min-w-0">
                  <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
                    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', opacity: 0.6, animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />
                    <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                  </span>
                  <span style={{ color: '#fff', fontSize: 13 }}>New scan running for {activeScan.appName}. We'll email you when it's done.</span>
                </div>
                {activeScan.appId && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (!activeScan?.sessionId) return;
                        const ok = window.confirm('Cancel this scan? You can start a new one immediately.');
                        if (!ok) return;
                        await supabase
                          .from('scan_sessions')
                          .update({ status: 'cancelled' })
                          .eq('id', activeScan.sessionId);
                        if (typeof window !== 'undefined') {
                          window.localStorage.removeItem('rismon_active_analysis');
                          window.localStorage.removeItem('rismon_analysis_stage');
                        }
                        setActiveScan(null);
                        toast.success('Scan cancelled.');
                      }}
                      style={{ background: '#1a0a0a', border: '1px solid #421616', color: '#fca5a5', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Cancel scan
                    </button>
                    <button
                      onClick={() => navigate(`/analyze/${activeScan.appId}`)}
                      style={{ background: '#1f223e', border: '1px solid #444b94', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      View live →
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isPro && hasApp && (
              <div
                className="mb-6 flex items-center justify-between gap-4 flex-wrap"
                style={{ background: 'linear-gradient(180deg, #1a1308, #0c0a05)', border: '1px solid #3a2a14', borderRadius: 12, padding: '14px 18px' }}
              >
                <div className="flex items-center gap-3">
                  <Rocket size={16} style={{ color: '#f97316' }} />
                  <div>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Unlock Performance & Continuous Monitoring</div>
                    <div style={{ color: '#a98455', fontSize: 12, marginTop: 2 }}>Auto-rescan on every push, deeper code coverage, full claim verification.</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/pricing')}
                  style={{ background: '#f97316', color: '#000', border: 'none', padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Upgrade to Pro
                </button>
              </div>
            )}

            {renderMain()}
          </div>
        </main>
      </div>
    </div>
  );
}
