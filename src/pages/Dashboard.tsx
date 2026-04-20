import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PlusCircle, Github, Clock, Zap, AlertTriangle, Rocket } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import WaitlistModal from '@/components/WaitlistModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import RisGuide from '@/components/RisGuide';
import { UpgradeBanner } from '@/components/ui/upgrade-banner';
import WelcomeGuide from '@/components/WelcomeGuide';

interface App {
  id: string;
  app_name: string | null;
  github_repo_name: string | null;
  github_owner: string | null;
  platform: string | null;
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
  const [searchParams] = useSearchParams();
  const githubConflict = searchParams.get('github_conflict') === 'true';
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
      const { data: appsData } = await supabase.from('apps').select('*').eq('user_id', user.id);
      const { data: analysesData } = await supabase.from('analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

      const appsList: App[] = (appsData || []).map(app => {
        const appAnalyses = (analysesData || []).filter(a => a.app_id === app.id);
        const latest = appAnalyses[0];
        return {
          id: app.id, app_name: app.app_name, github_repo_name: app.github_repo_name,
          github_owner: app.github_owner, platform: app.platform,
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

      setLoading(false);
    };
    load();
  }, [user]);

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
    // Check if GitHub token is available
    const { data: { session: s } } = await supabase.auth.getSession();
    const token = s?.provider_token;

    if (token) {
      // Token available — go directly to analyze with saved repo
      navigate(`/analyze/${app.id}`);
    } else {
      // Token expired — show reconnect modal
      setReconnectModal(app);
    }
  };

  const handleReconnectGithub = async () => {
    if (!reconnectModal) return;
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'repo read:user user:email',
        redirectTo: `${window.location.origin}/analyze/${reconnectModal.id}`,
        skipBrowserRedirect: false
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="pt-24 flex justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
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

      <div className="max-w-[1100px] mx-auto pt-24 pb-16" style={{ paddingLeft: 48, paddingRight: 48 }}>
        <h1 style={{ color: '#ffffff', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>{getGreeting()}</h1>
        <p style={{ color: '#555555', fontSize: 15, marginTop: 4 }}>{apps.length === 0 ? 'Connect your first app to get started' : 'Ready to verify your next app?'}</p>

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
          <div className="flex items-start gap-3 mt-4 p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
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
            <div key={i} style={{ background: '#111111', border: '1px solid #222222', borderRadius: 8, padding: 24 }}>
              <p style={{ color: '#ffffff', fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.v}</p>
              <p style={{ color: '#555555', fontSize: 13, marginTop: 8 }}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* Weekly limit */}
        {weeklyLimitReached && (profile?.plan || 'free').toLowerCase() === 'free' && (
          <div className="mt-6 p-4 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8 }}>
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
          <div className="mt-12">
            <h2 style={{ color: '#ffffff', fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>Your apps</h2>
            <div className="mt-4 space-y-4">
              {apps.map(app => {
                const isPro = (profile?.plan || 'free').toLowerCase() === 'pro';
                return (
                  <div key={app.id} style={{ background: '#111111', border: '1px solid #222222', borderRadius: 8, padding: '20px 24px' }}>
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {app.github_repo_name && <Github size={15} style={{ color: '#ffffff' }} />}
                          <p style={{ color: '#ffffff', fontSize: 15, fontWeight: 500 }}>
                            {app.github_repo_name ? `${app.github_owner}/${app.github_repo_name}` : app.app_name}
                          </p>
                          {isPro && (
                            <span style={{ background: 'transparent', border: '1px solid #333333', color: '#888888', fontSize: 10, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>
                              DEEP SCAN
                            </span>
                          )}
                          {app.platform && (
                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }}>{app.platform}</span>
                          )}
                        </div>
                        {app.has_analyses && app.latest_date ? (
                          <p style={{ color: '#555555', fontSize: 13, marginTop: 6 }}>Last analyzed {relativeDate(app.latest_date)}</p>
                        ) : (
                          <p style={{ color: '#555555', fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>Not analyzed yet</p>
                        )}
                      </div>

                      {app.has_analyses && app.latest_score !== null && (
                        <div className="text-right">
                          <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: scoreColor(app.latest_score), lineHeight: 1 }}>
                            {app.latest_score}
                          </p>
                          <p style={{ fontSize: 11, color: '#555555', marginTop: 4 }}>Intent Score</p>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleAnalyzeNow(app)}
                          style={{ background: '#ffffff', color: '#000000', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}
                        >
                          Analyze now
                        </button>
                        {app.has_analyses && app.latest_analysis_id && (
                          <Link
                            to={`/report/${app.latest_analysis_id}`}
                            style={{ border: '1px solid #333333', color: '#ffffff', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, background: 'transparent', textAlign: 'center' }}
                          >
                            View report
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Locked / Add-app cards by plan */}
            {(() => {
              const plan = (profile?.plan || 'free').toLowerCase();
              if (plan === 'pro') {
                return (
                  <Link
                    to="/connect"
                    className="mt-4 block text-center transition-colors"
                    style={{ background: 'transparent', border: '1px dashed #333333', borderRadius: 8, padding: '16px 24px', fontSize: 14, color: '#555555' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#555555')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#333333')}
                  >
                    + Connect another app
                  </Link>
                );
              }
              if (plan === 'try_pro' || plan === 'trypro') {
                return null;
              }
              // FREE — locked card
              return (
                <div className="mt-4 text-center" style={{ background: '#0a0a0a', border: '1px dashed #222222', borderRadius: 8, padding: '20px 24px', opacity: 0.6 }}>
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
