import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PlusCircle, Github, Clock, AlertTriangle, Rocket, RefreshCw } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import { Skeleton } from '@/components/ui/skeleton';
import WaitlistModal from '@/components/WaitlistModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import RisGuide from '@/components/RisGuide';
import { UpgradeBanner } from '@/components/ui/upgrade-banner';
import WelcomeGuide from '@/components/WelcomeGuide';
import { getGithubToken, reauthenticateGithub } from '@/lib/github-auth';
import ReportContent from '@/components/ReportContent';
import AnalysisLoadingScreen from '@/components/AnalysisLoadingScreen';

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

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [apps, setApps] = useState<App[]>([]);
  const [stats, setStats] = useState({ apps: 0, thisWeek: 0, totalGaps: 0, totalSecurity: 0 });
  const [weeklyScans, setWeeklyScans] = useState(0);
  const [weeklyLimitReached, setWeeklyLimitReached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [reconnectModal, setReconnectModal] = useState<App | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [plainMode, setPlainMode] = useState(true);
  const generateStarted = useRef<Record<string, boolean>>({});
  // Resume-in-progress banner: surfaces an active scan_session so users
  // who switched tabs (or got disconnected) can hop back into the live
  // analysis screen without losing their slot.
  const [activeScan, setActiveScan] = useState<{
    sessionId: string;
    appId: string | null;
    appName: string | null;
    startedAt: number;
  } | null>(null);
  const [searchParams] = useSearchParams();
  const githubConflict = searchParams.get('github_conflict') === 'true';
  const urlAnalysisId = searchParams.get('analysis');
  const urlAppId = searchParams.get('app');
  const navigate = useNavigate();

  const getGreeting = () => {
    const h = new Date().getHours();
    const name = profile?.full_name?.split(' ')[0] || '';
    if (h < 12) return `Good morning, ${name}`;
    if (h < 18) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  };

  const getResetDay = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
    if (daysUntilMonday === 1) return 'tomorrow';
    if (daysUntilMonday === 7) return 'next Monday';
    const next = new Date(now);
    next.setDate(now.getDate() + daysUntilMonday);
    return next.toLocaleDateString('en-US', { weekday: 'long' });
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Avoid selecting credential columns (supabase_url, supabase_anon_key) on
      // the client. Those are only needed by server-side analysis.
      const { data: appsData } = await supabase
        .from('apps')
        .select('id,user_id,app_name,platform,status,live_url,app_description,github_repo_url,github_repo_name,github_owner,created_at')
        .eq('user_id', user.id);
      const { data: analysesData } = await supabase.from('analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

      const appsList: App[] = (appsData || []).map(app => {
        const appAnalyses = (analysesData || []).filter(a => a.app_id === app.id);
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

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const thisWeekAnalyses = (analysesData || []).filter(a => a.created_at && new Date(a.created_at) >= weekStart);
      const totalGaps = (analysesData || []).reduce((sum, a) => sum + (Array.isArray(a.gaps) ? a.gaps.length : 0), 0);
      const totalSecurity = (analysesData || []).reduce((sum, a) => sum + (Array.isArray(a.security_issues) ? a.security_issues.length : 0), 0);

      // Use Monday-based week for scan_usage
      const dayOfW = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfW + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const mondayStr = monday.toISOString().split('T')[0];
      const { data: usageRows } = await supabase.from('scan_usage').select('scan_count').eq('user_id', user.id).eq('week_start', mondayStr);
      const ws = (usageRows || []).reduce((sum, l) => sum + (l.scan_count || 0), 0);

      setApps(appsList);
      setStats({ apps: appsList.length, thisWeek: thisWeekAnalyses.length, totalGaps, totalSecurity });
      setWeeklyScans(ws);
      setWeeklyLimitReached(ws >= 3);

      // Decide which app's report to show:
      //   1. ?analysis=<id> in URL (legacy /report/:id redirect)
      //   2. ?app=<id> in URL
      //   3. App with the most recent analysis
      //   4. First app
      let chosen: string | null = null;
      if (urlAnalysisId) {
        const owning = (analysesData || []).find((a) => a.id === urlAnalysisId);
        if (owning?.app_id) chosen = owning.app_id;
      }
      if (!chosen && urlAppId && appsList.some((a) => a.id === urlAppId)) {
        chosen = urlAppId;
      }
      if (!chosen) {
        const withAnalysis = appsList.find((a) => a.has_analyses);
        chosen = withAnalysis?.id || appsList[0]?.id || null;
      }
      setSelectedAppId(chosen);

      // Look for an in-progress scan to surface in a "Resume" banner.
      // We only consider sessions started within the last 12 minutes —
      // anything older is almost certainly stuck and the analyze page
      // will clean it up on entry.
      const { data: liveSession } = await supabase
        .from('scan_sessions')
        .select('id, status, created_at, repo_name')
        .eq('user_id', user.id)
        .in('status', ['pending', 'analyzing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (liveSession) {
        const startedAt = liveSession.created_at ? new Date(liveSession.created_at).getTime() : Date.now();
        const ageMin = (Date.now() - startedAt) / 60000;
        if (ageMin <= 12) {
          // Match the session's repo_name back to one of the user's apps so
          // we can deep-link the resume button to /analyze/:appId.
          const owned = appsList.find((a) => `${a.github_owner}/${a.github_repo_name}` === liveSession.repo_name);
          if (!owned) {
            // The app this scan was running against has been deleted.
            // Cancel the orphaned session so we never surface a broken
            // "resume" CTA that would just error out.
            await supabase
              .from('scan_sessions')
              .update({ status: 'cancelled' })
              .eq('id', liveSession.id);
            setActiveScan(null);
          } else {
            setActiveScan({
              sessionId: liveSession.id,
              appId: owned.id,
              appName: owned.app_name ?? liveSession.repo_name ?? 'your app',
              startedAt,
            });
          }
        } else {
          setActiveScan(null);
        }
      } else {
        setActiveScan(null);
      }

      setLoading(false);
    };
    load();
  }, [user, urlAnalysisId, urlAppId]);

  // Load the selected app's latest analysis (and lazily generate fix prompts).
  useEffect(() => {
    if (!selectedAppId) {
      setAnalysis(null);
      return;
    }
    const selected = apps.find((a) => a.id === selectedAppId);
    if (!selected || !selected.latest_analysis_id) {
      setAnalysis(null);
      return;
    }
    const aid = selected.latest_analysis_id;
    setAnalysisLoading(true);
    (async () => {
      const { data } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', aid)
        .maybeSingle();
      if (!data) {
        setAnalysis(null);
        setAnalysisLoading(false);
        return;
      }
      // Lazily generate fix prompts (mirrors old /report behaviour) so the
      // dashboard view is functionally identical.
      if (!data.fix_prompts || data.status === 'generating_prompts') {
        if (!generateStarted.current[aid]) {
          generateStarted.current[aid] = true;
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
            await supabase.from('analyses').update({ fix_prompts: result.fix_prompts, status: 'complete' }).eq('id', aid);
            (data as any).fix_prompts = result.fix_prompts;
            (data as any).status = 'complete';
          }
          setGenerating(false);
        }
      }
      setAnalysis(data);
      setAnalysisLoading(false);
    })();
  }, [selectedAppId, apps]);

  const relativeDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const scoreColor = (s: number) => {
    if (s <= 40) return '#ef4444';
    if (s <= 70) return '#f59e0b';
    return '#22c55e';
  };

  const handleAnalyzeNow = async (app: App) => {
    // Check if GitHub token is available. If a refresh recovers it we skip
    // the reconnect modal entirely.
    let token = await getGithubToken();
    if (!token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.provider_token ?? null;
    }

    if (token) {
      navigate(`/analyze/${app.id}`);
    } else {
      // Still no token — show reconnect modal so the user can re-authorize.
      setReconnectModal(app);
    }
  };

  const handleReconnectGithub = async () => {
    if (!reconnectModal) return;
    await reauthenticateGithub({
      redirectTo: `${window.location.origin}/analyze/${reconnectModal.id}`,
      notify: false,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="max-w-[1100px] mx-auto pt-20 sm:pt-24 pb-16 px-4 sm:px-6 md:px-12">
          {/* Greeting */}
          <Skeleton className="h-7 sm:h-8 w-56 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full mt-3" />

          {/* Plan card */}
          <Skeleton className="h-24 w-full rounded-lg mt-6" />

          {/* Stats: 2x2 on mobile, 4 across on desktop — matches real layout */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[88px] sm:h-[112px] rounded-lg" />
            ))}
          </div>

          {/* App rows */}
          <Skeleton className="h-5 w-32 mt-12" />
          <div className="mt-4 space-y-4">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-[120px] sm:h-[96px] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

      {/* Reconnect GitHub Modal */}
      {reconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="text-center" style={{ background: '#0a0a0a', border: '1px solid #ffffff14', borderRadius: 12, padding: 32, maxWidth: 400, width: '100%', margin: '0 16px' }}>
            <Github size={36} style={{ color: '#888888' }} className="mx-auto" />
            <h3 style={{ color: '#ffffff', fontSize: 20, fontWeight: 600, marginTop: 16, letterSpacing: '-0.02em' }}>Reconnect GitHub</h3>
            <p style={{ color: '#888888', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
              We need to reconnect to GitHub to read your {reconnectModal.github_repo_name} repository. We will use the same repository you connected before.
            </p>
            <p className="font-mono" style={{ color: '#555555', fontSize: 12, marginTop: 8 }}>
              {reconnectModal.github_owner}/{reconnectModal.github_repo_name}
            </p>
            <button onClick={handleReconnectGithub} className="btn-cyber-primary w-full mt-6">
              Reconnect GitHub
            </button>
            <button onClick={() => setReconnectModal(null)} className="w-full py-3 mt-2" style={{ color: '#888888', background: 'transparent', border: 'none', fontSize: 14, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1100px] mx-auto pt-20 sm:pt-24 pb-16 px-4 sm:px-6 md:px-12">
        <h1 className="text-[24px] sm:text-[28px]" style={{ color: '#ffffff', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{getGreeting()}</h1>
        <p className="text-[14px] sm:text-[15px]" style={{ color: '#555555', marginTop: 4 }}>{apps.length === 0 ? 'Connect your first app to get started' : 'Ready to verify your next app?'}</p>

        {activeScan && (
          <div
            className="flex-col sm:flex-row sm:items-center"
            style={{
              marginTop: 20,
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 16px',
              borderRadius: 12,
              background: 'linear-gradient(180deg, #10111e, #070710)',
              border: '1px solid #363c70',
              color: '#ffffff',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, flex: 1 }}>
              <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', opacity: 0.6, animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />
                <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Scan in progress for {activeScan.appName}
                </div>
                <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>
                  Running in the background — you can leave this tab. {activeScan.appId ? 'Click to watch live progress.' : 'It will finish on its own.'}
                </div>
              </div>
            </div>
            <div className="self-stretch sm:self-auto" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button
                onClick={async () => {
                  await supabase
                    .from('scan_sessions')
                    .update({ status: 'cancelled' })
                    .eq('id', activeScan.sessionId);
                  setActiveScan(null);
                }}
                className="flex-1 sm:flex-none"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#a1a1aa',
                  background: 'transparent',
                  border: '1px solid #2a2a2a',
                  padding: '8px 14px',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Cancel scan
              </button>
              {activeScan.appId && (
                <button
                  onClick={() => navigate(`/analyze/${activeScan.appId}`)}
                  className="flex-1 sm:flex-none"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#ffffff',
                    background: '#1f223e',
                    border: '1px solid #444b94',
                    padding: '8px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Resume →
                </button>
              )}
            </div>
          </div>
        )}

        <WelcomeGuide />

        {((profile?.plan || 'free').toLowerCase() !== 'pro') && (
          <div className="mt-5">
            <UpgradeBanner
              buttonText="Upgrade to Pro"
              description="for unlimited Deep Scans and faster, deeper analysis."
              accent="#f97316"
              icon={<Rocket className="h-3 w-3" strokeWidth={2.4} />}
              onClick={() => navigate('/pricing')}
            />
          </div>
        )}

        {apps.length === 0 && (
          <div className="mt-4">
            <RisGuide pageKey="dashboard_empty" message={"You haven't analyzed anything yet.\nConnect your first app and find out if it does what you actually meant to build."} />
          </div>
        )}

        {githubConflict && (
          <div className="flex items-start gap-3 mt-4 p-4" style={{ background: '#1a0a0a', border: '1px solid #421616', borderRadius: 8 }}>
            <AlertTriangle size={20} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
            <p style={{ color: '#ffffff', fontSize: 14 }}>GitHub is already linked to a different account. Please use a different GitHub account or disconnect it from the other account first.</p>
          </div>
        )}

        {/* Plan Status Card */}
        {(() => {
          const plan = (profile?.plan || 'free').toLowerCase();
          const proCredits = profile?.pro_credits ?? 0;
          const cardBase: React.CSSProperties = { background: '#111111', border: '1px solid #222222', borderRadius: 8, padding: '20px 24px' };

          if (plan === 'pro') {
            return (
              <div className="mt-6 mb-6" style={{ ...cardBase, borderLeft: '3px solid #f97316' }}>
                <p style={{ color: '#ffffff', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PRO</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                  <span style={{ fontSize: 13, color: '#555555' }}>Unlimited apps</span>
                  <span style={{ fontSize: 13, color: '#333333' }}>·</span>
                  <span style={{ fontSize: 13, color: '#555555' }}>Unlimited scans</span>
                  <span style={{ fontSize: 13, color: '#333333' }}>·</span>
                  <span style={{ fontSize: 13, color: '#555555' }}>Deep scan enabled</span>
                </div>
              </div>
            );
          }

          if (plan === 'try_pro' || plan === 'trypro') {
            const used = proCredits <= 0;
            return (
              <div className="mt-6 mb-6" style={{ ...cardBase, borderLeft: '3px solid #ffffff' }}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p style={{ color: '#ffffff', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>TRY PRO</p>
                    {used ? (
                      <>
                        <p style={{ color: '#ffffff', fontSize: 14, marginTop: 8 }}>Deep scan used</p>
                        <p style={{ color: '#555555', fontSize: 13, marginTop: 4 }}>Your app has been fully analyzed.</p>
                      </>
                    ) : (
                      <>
                        <p style={{ color: '#ffffff', fontSize: 14, marginTop: 8 }}>1 Deep Scan available</p>
                        <p style={{ color: '#555555', fontSize: 13, marginTop: 4 }}>Use it on your connected app before it expires.</p>
                      </>
                    )}
                  </div>
                  {used ? (
                    <button
                      onClick={() => setWaitlistOpen(true)}
                      style={{ border: '1px solid #f97316', color: '#f97316', background: 'transparent', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
                    >
                      Buy another deep scan
                    </button>
                  ) : (
                    <button
                      onClick={() => apps[0] && handleAnalyzeNow(apps[0])}
                      style={{ background: '#ffffff', color: '#000000', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}
                    >
                      Run Deep Scan
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // FREE
          return (
            <div className="mt-6 mb-6" style={{ ...cardBase, borderLeft: '3px solid #f97316' }}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p style={{ color: '#ffffff', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Free Plan</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                    <span style={{ fontSize: 13, color: '#555555' }}>{stats.apps} of 1 app</span>
                    <span style={{ fontSize: 13, color: '#333333' }}>·</span>
                    <span style={{ fontSize: 13, color: '#555555' }}>{weeklyScans} of 3 scans</span>
                    <span style={{ fontSize: 13, color: '#333333' }}>·</span>
                    <span style={{ fontSize: 13, color: '#555555' }}>Resets {getResetDay()}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#f97316', marginTop: 8 }}>40% code coverage</p>
                </div>
                <button
                  onClick={() => setWaitlistOpen(true)}
                  style={{ border: '1px solid #f97316', color: '#f97316', background: 'transparent', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          );
        })()}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { v: stats.apps, l: 'Apps connected' },
            { v: stats.thisWeek, l: 'Analyses this week' },
            { v: stats.totalGaps, l: 'Total gaps found' },
            { v: stats.totalSecurity, l: 'Security issues found' },
          ].map((s, i) => (
            <div key={i} className="p-4 sm:p-6" style={{ background: '#111111', border: '1px solid #222222', borderRadius: 8 }}>
              <p className="text-[28px] sm:text-[40px]" style={{ color: '#ffffff', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.v}</p>
              <p className="text-[12px] sm:text-[13px]" style={{ color: '#555555', marginTop: 8 }}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* Weekly limit */}
        {weeklyLimitReached && (profile?.plan || 'free').toLowerCase() === 'free' && (
          <div className="mt-6 p-4 flex items-start gap-3" style={{ background: '#191207', border: '1px solid #3a2810', borderRadius: 8 }}>
            <Clock size={20} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
            <div>
              <p style={{ color: '#ffffff', fontSize: 15 }}>You have used your 3 free analyses for this week.</p>
              <p style={{ color: '#888888', fontSize: 13, marginTop: 4 }}>Your scans reset next week. Upgrade to Pro for unlimited access.</p>
              <button onClick={() => setWaitlistOpen(true)} style={{ color: '#f97316', fontSize: 13, marginTop: 4, background: 'transparent', border: 'none', cursor: 'pointer' }} className="hover:underline">Join Pro waitlist →</button>
            </div>
          </div>
        )}

        {/* No apps */}
        {apps.length === 0 ? (
          <div className="mt-16 text-center" style={{ border: '2px dashed #1f1f1f', borderRadius: 12, padding: 64 }}>
            <PlusCircle size={48} style={{ color: '#333333' }} className="mx-auto" />
            <p style={{ color: '#ffffff', fontSize: 20, fontWeight: 600, marginTop: 20, letterSpacing: '-0.02em' }}>Connect your first app</p>
            <p className="max-w-[400px] mx-auto" style={{ color: '#888888', fontSize: 15, marginTop: 12, lineHeight: 1.6 }}>Connect your GitHub repository to start your first analysis. Read only access. We never store or edit your code.</p>
            <Link to="/connect" className="btn-cyber-primary inline-block mt-7">Connect an app</Link>
          </div>
        ) : (
          <div className="mt-10">
            {/* App switcher (only when more than one app) */}
            {apps.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {apps.map((a) => {
                  const active = a.id === selectedAppId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedAppId(a.id)}
                      className="inline-flex items-center gap-2 text-[13px] px-3 py-2 rounded-md transition-colors"
                      style={{
                        background: active ? '#1a1a1a' : 'transparent',
                        color: active ? '#ffffff' : '#888888',
                        border: `1px solid ${active ? '#333' : '#1f1f1f'}`,
                        cursor: 'pointer',
                      }}
                    >
                      {a.github_repo_name && <Github size={13} />}
                      {a.github_repo_name ? `${a.github_owner}/${a.github_repo_name}` : a.app_name}
                    </button>
                  );
                })}
                <Link
                  to="/connect"
                  className="inline-flex items-center gap-2 text-[13px] px-3 py-2 rounded-md"
                  style={{ border: '1px dashed #2a2a2a', color: '#666' }}
                >
                  <PlusCircle size={13} /> Add app
                </Link>
              </div>
            )}

            {/* Selected app header */}
            {(() => {
              const sel = apps.find((a) => a.id === selectedAppId);
              if (!sel) return null;
              return (
                <div
                  className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6 mb-6"
                  style={{ background: '#111111', border: '1px solid #222222', borderRadius: 12 }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {sel.github_repo_name && <Github size={16} style={{ color: '#fff' }} />}
                      <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
                        {sel.github_repo_name ? `${sel.github_owner}/${sel.github_repo_name}` : sel.app_name}
                      </span>
                      {sel.platform && (
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, background: '#1f1108', color: '#f97316', border: '1px solid #4f2710' }}>
                          {sel.platform}
                        </span>
                      )}
                    </div>
                    <p style={{ color: '#666', fontSize: 13, marginTop: 6 }}>
                      {sel.has_analyses && sel.latest_date
                        ? `Last scanned ${relativeDate(sel.latest_date)}`
                        : 'Not scanned yet'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAnalyzeNow(sel)}
                      className="inline-flex items-center gap-1.5"
                      style={{ background: '#ffffff', color: '#000', padding: '9px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}
                    >
                      <RefreshCw size={13} /> {sel.has_analyses ? 'Scan again' : 'Run first scan'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Inline report */}
            {(() => {
              const sel = apps.find((a) => a.id === selectedAppId);
              if (!sel) return null;
              if (!sel.has_analyses) {
                return (
                  <div className="text-center" style={{ border: '1px dashed #1f1f1f', borderRadius: 12, padding: '40px 24px' }}>
                    <p style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>No scan yet for this app</p>
                    <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>Run your first scan to see the full report here.</p>
                    <button
                      onClick={() => handleAnalyzeNow(sel)}
                      className="btn-cyber-primary inline-block mt-5"
                    >
                      Run scan
                    </button>
                  </div>
                );
              }
              if (analysisLoading || generating) {
                return <AnalysisLoadingScreen stage={generating ? 'generating' : 'reading'} />;
              }
              if (!analysis) return null;
              const isPro = (profile?.plan || 'free').toLowerCase() === 'pro' || (profile?.plan || '').toLowerCase().startsWith('try_pro');
              return (
                <ReportContent
                  analysis={analysis}
                  app={sel}
                  analysisId={sel.latest_analysis_id || undefined}
                  plainMode={plainMode}
                  onTogglePlainMode={setPlainMode}
                  isPro={isPro}
                />
              );
            })()}

            {/* Add another app for free users */}
            {(() => {
              const plan = (profile?.plan || 'free').toLowerCase();
              if (apps.length > 1) return null;
              if (plan === 'pro') {
                return (
                  <Link
                    to="/connect"
                    className="mt-8 block text-center transition-colors"
                    style={{ background: 'transparent', border: '1px dashed #333333', borderRadius: 8, padding: '16px 24px', fontSize: 14, color: '#555555' }}
                  >
                    + Connect another app
                  </Link>
                );
              }
              if (plan === 'try_pro' || plan === 'trypro') return null;
              return (
                <div className="mt-8 text-center" style={{ background: '#0a0a0a', border: '1px dashed #222222', borderRadius: 8, padding: '20px 24px', opacity: 0.7 }}>
                  <p style={{ fontSize: 14, color: '#555555' }}>Want to scan another app?</p>
                  <button
                    onClick={() => setWaitlistOpen(true)}
                    style={{ background: 'transparent', border: '1px solid #f97316', color: '#f97316', padding: '8px 16px', borderRadius: 6, fontSize: 13, marginTop: 12, cursor: 'pointer' }}
                  >
                    Unlock unlimited apps
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
