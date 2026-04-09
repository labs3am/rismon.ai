import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Github, Clock, Zap } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import WaitlistModal from '@/components/WaitlistModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  const [stats, setStats] = useState({ apps: 0, thisWeek: 0, totalGaps: 0 });
  const [weeklyScans, setWeeklyScans] = useState(0);
  const [weeklyLimitReached, setWeeklyLimitReached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [reconnectModal, setReconnectModal] = useState<App | null>(null);
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
    const dayOfWeek = now.getDay(); // 0=Sun
    if (dayOfWeek === 6) return 'tomorrow';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[0]; // resets on Sunday
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

      const { data: limits } = await supabase.from('scan_limits').select('scan_count').eq('user_id', user.id).gte('scan_date', weekStart.toISOString().split('T')[0]);
      const ws = (limits || []).reduce((sum, l) => sum + (l.scan_count || 0), 0);

      setApps(appsList);
      setStats({ apps: appsList.length, thisWeek: thisWeekAnalyses.length, totalGaps });
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
    if (s <= 40) return { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' };
    if (s <= 70) return { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' };
    return { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' };
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
        scopes: 'repo read:user',
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
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-8 max-w-[400px] w-full mx-4 text-center" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
            <Github size={36} style={{ color: '#71717a' }} className="mx-auto" />
            <h3 className="text-foreground text-[20px] font-semibold mt-4">Reconnect GitHub</h3>
            <p className="mt-2 text-sm" style={{ color: '#71717a' }}>
              We need to reconnect to GitHub to read your {reconnectModal.github_repo_name} repository. We will use the same repository you connected before.
            </p>
            <p className="mt-2 font-mono text-xs" style={{ color: '#52525b' }}>
              {reconnectModal.github_owner}/{reconnectModal.github_repo_name}
            </p>
            <button onClick={handleReconnectGithub}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg text-sm font-medium mt-6 hover:bg-primary/90 transition-colors">
              Reconnect GitHub
            </button>
            <button onClick={() => setReconnectModal(null)}
              className="w-full text-muted-foreground py-3 rounded-lg text-sm mt-2 hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1100px] mx-auto px-6 md:px-10 pt-24 pb-16">
        <h1 className="text-foreground text-[28px] font-semibold">{getGreeting()}</h1>
        <p className="text-muted-foreground mt-1">{apps.length === 0 ? 'Connect your first app to get started' : 'Ready to verify your next app?'}</p>

        {/* Free Plan Status Card */}
        <div className="rounded-xl p-4 mt-6 mb-6" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={18} style={{ color: '#6366f1' }} />
              <span className="text-foreground text-sm font-semibold">Free Plan</span>
            </div>
            <button onClick={() => setWaitlistOpen(true)} className="text-[13px] hover:underline" style={{ color: '#6366f1' }}>
              Upgrade to Pro →
            </button>
          </div>
          <div className="flex gap-6 mt-3">
            <span className="text-[13px]" style={{ color: stats.apps >= 1 ? '#f59e0b' : '#71717a' }}>
              {stats.apps} of 1 app used
            </span>
            <span className="text-[13px]" style={{ color: weeklyScans >= 3 ? '#ef4444' : '#71717a' }}>
              {weeklyScans} of 3 scans used this week
            </span>
            <span className="text-[13px]" style={{ color: '#71717a' }}>
              Resets {getResetDay()}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[{ v: stats.apps, l: 'Apps connected' }, { v: stats.thisWeek, l: 'Analyses this week' }, { v: stats.totalGaps, l: 'Total gaps found' }].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5">
              <p className="text-foreground text-[32px] font-bold">{s.v}</p>
              <p className="text-muted-foreground text-sm mt-1">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Weekly limit */}
        {weeklyLimitReached && (
          <div className="mt-6 rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Clock size={20} className="text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-foreground text-[15px]">You have used your 3 free analyses for this week.</p>
              <p className="text-muted-foreground text-[13px] mt-1">Your scans reset next week. Upgrade to Pro for unlimited access.</p>
              <button onClick={() => setWaitlistOpen(true)} className="text-primary text-[13px] mt-1 hover:underline">Join Pro waitlist →</button>
            </div>
          </div>
        )}

        {/* No apps */}
        {apps.length === 0 ? (
          <div className="mt-16 border-2 border-dashed border-input rounded-2xl p-16 text-center">
            <PlusCircle size={48} className="text-dimmed mx-auto" />
            <p className="text-foreground text-xl font-semibold mt-5">Connect your first app</p>
            <p className="text-muted-foreground text-[15px] max-w-[400px] mx-auto mt-3">Connect your GitHub repository to start your first analysis. Read only access. We never store or edit your code.</p>
            <Link to="/connect" className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-lg text-sm font-medium mt-7 hover:bg-primary/90 transition-colors">Connect an app</Link>
          </div>
        ) : (
          <div className="mt-12">
            <h2 className="text-foreground text-xl font-semibold">Your apps</h2>
            <div className="mt-4 space-y-4">
              {apps.map(app => (
                <div key={app.id} className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-foreground text-lg font-bold">{app.app_name}</p>
                    {app.platform && <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{app.platform}</span>}
                  </div>
                  {app.github_repo_name && (
                    <div className="flex items-center gap-1.5 mt-2"><Github size={14} className="text-muted-foreground" /><span className="text-muted-foreground text-sm">{app.github_owner}/{app.github_repo_name}</span></div>
                  )}
                  <div className="mt-4">
                    {app.has_analyses && app.latest_score !== null ? (
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: scoreColor(app.latest_score).bg, color: scoreColor(app.latest_score).text }}>{app.latest_score}</div>
                        <span className="text-muted-foreground text-[13px]">Last analyzed {app.latest_date ? relativeDate(app.latest_date) : ''}</span>
                      </div>
                    ) : (
                      <p className="text-subtle text-[13px] italic">Not analyzed yet</p>
                    )}
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => handleAnalyzeNow(app)} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Analyze now</button>
                    {app.has_analyses && app.latest_analysis_id && (
                      <Link to={`/report/${app.latest_analysis_id}`} className="border border-hover-border text-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:border-muted-foreground/30 transition-colors">View last report</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {apps.length >= 1 ? (
              <button onClick={() => setWaitlistOpen(true)} className="text-sm mt-4 inline-block hover:underline" style={{ color: '#6366f1' }}>
                Unlock unlimited apps →
              </button>
            ) : (
              <Link to="/connect" className="text-primary text-sm mt-4 inline-block hover:underline">+ Connect another app</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
