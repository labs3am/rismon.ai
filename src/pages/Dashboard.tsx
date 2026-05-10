import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlusCircle, Github, AlertTriangle, RefreshCw, Lock, Plug, ChevronDown,
  Activity, Radio, Sparkles, Rocket, Globe, Check, X as XIcon, Search,
} from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import { Skeleton } from '@/components/ui/skeleton';
import WaitlistModal from '@/components/WaitlistModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getGithubToken, reauthenticateGithub } from '@/lib/github-auth';
import ReportContent from '@/components/ReportContent';
import AnalysisLoadingScreen from '@/components/AnalysisLoadingScreen';
import DashboardSidebar, { SectionKey } from '@/components/dashboard/DashboardSidebar';
import ScoreDonut from '@/components/dashboard/ScoreDonut';

// ----- Inline gauge for the new Intent Match card -----
function IntentGaugeCard({ score }: { score: number | null }) {
  const v = score == null ? 0 : Math.max(0, Math.min(100, score));
  const has = score != null;
  const color =
    !has ? '#3a3a3a' :
    v >= 85 ? '#22c55e' :
    v >= 70 ? '#84cc16' :
    v >= 50 ? '#f59e0b' : '#ef4444';
  const status =
    !has ? 'Awaiting scan' :
    v >= 90 ? 'Excellent — your code lives up to your pitch' :
    v >= 75 ? 'Strong — a few small gaps' :
    v >= 60 ? 'Good — some claims aren’t backed by code' :
    v >= 40 ? 'Needs work — several intent gaps' :
    'Critical — your code does not match what you described';

  // Half-circle gauge
  const W = 220, H = 130, stroke = 14;
  const cx = W / 2, cy = H - 10, r = (W - stroke) / 2;
  const arcLen = Math.PI * r;
  const dash = (v / 100) * arcLen;

  const polarArc = (start: number, end: number) => {
    const sx = cx + r * Math.cos(Math.PI - Math.PI * start);
    const sy = cy - r * Math.sin(Math.PI - Math.PI * start);
    const ex = cx + r * Math.cos(Math.PI - Math.PI * end);
    const ey = cy - r * Math.sin(Math.PI - Math.PI * end);
    return `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`;
  };

  return (
    <div
      className="rounded-xl p-5 sm:p-6"
      style={{
        background: 'radial-gradient(120% 100% at 0% 0%, #1a1308 0%, #0a0a0a 60%)',
        border: '1px solid #1f1f1f',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] font-semibold" style={{ color: '#888' }}>
            Intent Match
          </div>
          <div className="text-[12px] mt-1" style={{ color: '#666' }}>
            How well your code delivers what you described
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 mt-4 flex-wrap">
        <div style={{ width: W, height: H, position: 'relative', flexShrink: 0 }}>
          <svg width={W} height={H}>
            <path d={polarArc(0, 1)} stroke="#1a1a1a" strokeWidth={stroke} fill="none" strokeLinecap="round" />
            {has && (
              <path
                d={polarArc(0, 1)}
                stroke={color}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${arcLen - dash}`}
                style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
              />
            )}
          </svg>
          <div
            style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
              paddingBottom: 6,
            }}
          >
            <span style={{ fontSize: 44, fontWeight: 700, color, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {has ? Math.round(v) : '—'}
            </span>
            <span style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{has ? 'out of 100' : 'no score yet'}</span>
          </div>
        </div>
        <div className="flex-1 min-w-[180px]">
          <div
            className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 mb-2"
            style={{ background: '#11140d', border: `1px solid ${color}40`, color }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
              {has ? (v >= 90 ? 'EXCELLENT' : v >= 75 ? 'STRONG' : v >= 60 ? 'GOOD' : v >= 40 ? 'NEEDS WORK' : 'CRITICAL') : 'PENDING'}
            </span>
          </div>
          <div className="text-[14px] leading-snug" style={{ color: '#e5e5e5' }}>
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- SEO Score card -----
function SeoScoreCard({
  liveUrl, signals, onConnect, onViewSeo,
}: { liveUrl: string | null; signals: any; onConnect: () => void; onViewSeo: () => void }) {
  if (!liveUrl) {
    return (
      <div
        className="rounded-xl p-5 sm:p-6 flex flex-col"
        style={{ background: PANEL_BG, border: '1px dashed #2a2a2a' }}
      >
        <div className="flex items-center gap-2">
          <Search size={14} style={{ color: '#888' }} />
          <div className="text-[11px] uppercase tracking-[0.1em] font-semibold" style={{ color: '#888' }}>
            SEO Score
          </div>
        </div>
        <div className="text-[14px] mt-3" style={{ color: '#e5e5e5' }}>
          No homepage URL was added.
        </div>
        <div className="text-[12px] mt-1.5" style={{ color: '#666', lineHeight: 1.5 }}>
          Add your live site URL so we can scan its SEO basics — title, meta description, privacy &amp; terms.
        </div>
        <button
          onClick={onConnect}
          className="self-start mt-4"
          style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Add homepage URL
        </button>
      </div>
    );
  }

  const checks = [
    { key: 'live', label: 'Live homepage reachable', ok: !!signals?.has_live_url || !!liveUrl },
    { key: 'readme', label: 'README in repo', ok: !!signals?.readme_found },
    { key: 'privacy', label: 'Privacy page', ok: !!signals?.privacy_page_found },
    { key: 'terms', label: 'Terms page', ok: !!signals?.terms_page_found },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const score = Math.round((passed / checks.length) * 100);
  const color = score >= 85 ? '#22c55e' : score >= 60 ? '#84cc16' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-xl p-5 sm:p-6" style={{ background: PANEL_BG, border: '1px solid #1f1f1f' }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] font-semibold" style={{ color: '#888' }}>
            SEO Score
          </div>
          <div className="text-[12px] mt-1" style={{ color: '#666' }}>
            How discoverable &amp; trustworthy your site looks
          </div>
        </div>
        <button
          onClick={onViewSeo}
          style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#fff', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
        >
          View →
        </button>
      </div>

      <div className="flex items-baseline gap-2 mt-4">
        <span style={{ fontSize: 44, fontWeight: 700, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 12, color: '#555' }}>/ 100</span>
        <span className="ml-auto text-[12px]" style={{ color: '#888' }}>{passed} of {checks.length} checks pass</span>
      </div>

      <div className="mt-4 space-y-2">
        {checks.map((c) => (
          <div key={c.key} className="flex items-center gap-3">
            <div style={{ width: 16 }}>
              {c.ok ? <Check size={14} style={{ color: '#22c55e' }} /> : <XIcon size={14} style={{ color: '#71717a' }} />}
            </div>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#161616' }}>
              <div
                style={{
                  width: c.ok ? '100%' : '8%',
                  height: '100%',
                  background: c.ok ? '#22c55e' : '#2a2a2a',
                  transition: 'width 400ms ease',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: c.ok ? '#cbd5e1' : '#666', minWidth: 160, textAlign: 'right' }}>
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
          { t: 'SEO & homepage', d: 'What your public site signals' },
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
  const [searchParams] = useSearchParams();
  const githubConflict = searchParams.get('github_conflict') === 'true';
  const urlAnalysisId = searchParams.get('analysis');
  const urlAppId = searchParams.get('app');
  const navigate = useNavigate();

  const isPro = (profile?.plan || 'free').toLowerCase() === 'pro' ||
    (profile?.plan || '').toLowerCase().startsWith('try_pro');

  // ---- load apps + analyses ----
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: appsData } = await supabase
        .from('apps')
        .select('id,user_id,app_name,platform,status,live_url,app_description,github_repo_url,github_repo_name,github_owner,created_at')
        .eq('user_id', user.id);
      const { data: analysesData } = await supabase.from('analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

      const appsList: App[] = (appsData || []).map((app) => {
        const appAnalyses = (analysesData || []).filter((a) => a.app_id === app.id);
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
        .eq('user_id', user.id)
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
  }, [user, urlAnalysisId, urlAppId]);

  // ---- load analysis for selected app ----
  useEffect(() => {
    if (!selectedAppId) { setAnalysis(null); return; }
    const selected = apps.find((a) => a.id === selectedAppId);
    if (!selected || !selected.latest_analysis_id) { setAnalysis(null); return; }
    const aid = selected.latest_analysis_id;
    setAnalysisLoading(true);
    (async () => {
      const { data } = await supabase.from('analyses').select('*').eq('id', aid).maybeSingle();
      if (!data) { setAnalysis(null); setAnalysisLoading(false); return; }
      if (!data.fix_prompts || data.status === 'generating_prompts') {
        if (!generateStarted.current[aid]) {
          generateStarted.current[aid] = true;
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

  const handleAnalyzeNow = async (app: App) => {
    let token = await getGithubToken();
    if (!token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.provider_token ?? null;
    }
    if (token) navigate(`/analyze/${app.id}`);
    else setReconnectModal(app);
  };

  const handleReconnectGithub = async () => {
    if (!reconnectModal) return;
    await reauthenticateGithub({ redirectTo: `${window.location.origin}/analyze/${reconnectModal.id}`, notify: false });
  };

  const selectedApp = apps.find((a) => a.id === selectedAppId) || null;
  const hasApp = apps.length > 0;

  // ---------------- Loading skeleton ----------------
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="flex pt-16">
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
    const gapCount = Array.isArray(analysis.gaps) ? analysis.gaps.length : 0;
    const legalCount = Array.isArray(analysis.legal_findings) ? analysis.legal_findings.length : 0;
    const secIssues: any[] = Array.isArray(analysis.security_issues) ? analysis.security_issues : [];
    const sevBuckets = [
      { key: 'critical', label: 'Critical', color: '#ef4444' },
      { key: 'high', label: 'High', color: '#f97316' },
      { key: 'medium', label: 'Medium', color: '#f59e0b' },
      { key: 'low', label: 'Low', color: '#3b82f6' },
    ].map((b) => ({
      ...b,
      count: secIssues.filter((s) => (s?.severity || '').toLowerCase() === b.key).length,
    }));
    const sevMax = Math.max(1, ...sevBuckets.map((b) => b.count));

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <IntentGaugeCard score={intentScore} />
              <SeoScoreCard
                liveUrl={selectedApp?.live_url ?? null}
                signals={analysis.homepage_signals}
                onConnect={() => navigate('/connect')}
                onViewSeo={() => setSection('seo')}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { v: secCount, l: 'Security issues', c: secCount > 0 ? '#ef4444' : '#22c55e' },
                { v: gapCount, l: 'Intent gaps', c: gapCount > 0 ? '#f59e0b' : '#22c55e' },
                { v: legalCount, l: 'Legal gaps', c: legalCount > 0 ? '#f59e0b' : '#22c55e' },
                { v: promises.length, l: 'Promises checked', c: '#888' },
              ].map((s) => (
                <div key={s.l} className="rounded-xl p-4" style={{ background: PANEL_BG, border: '1px solid ' + PANEL_BORDER }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: s.c, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{s.l}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-5 sm:p-6" style={{ background: PANEL_BG, border: '1px solid ' + PANEL_BORDER }}>
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Security issues by severity</div>
                  <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                    {secCount === 0 ? 'No security issues found in this scan.' : `${secCount} ${secCount === 1 ? 'issue' : 'issues'} found across the code we scanned.`}
                  </div>
                </div>
                <button
                  onClick={() => setSection('security')}
                  style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#fff', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
                >
                  View all →
                </button>
              </div>
              {secCount === 0 ? (
                <div className="rounded-md p-4 text-sm" style={{ background: '#08130a', border: '1px solid #16401f', color: '#86efac' }}>
                  All clear — nothing to fix here.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sevBuckets.map((b) => (
                    <div key={b.key} className="flex items-center gap-3">
                      <div style={{ width: 70, fontSize: 12, color: '#aaa' }}>{b.label}</div>
                      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: '#161616' }}>
                        <div
                          style={{
                            width: `${(b.count / sevMax) * 100}%`,
                            height: '100%',
                            background: b.color,
                            transition: 'width 400ms ease',
                          }}
                        />
                      </div>
                      <div style={{ width: 28, textAlign: 'right', fontSize: 13, color: '#fff', fontWeight: 600 }}>{b.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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

      <div className="flex pt-16">
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
                  <button
                    onClick={() => navigate(`/analyze/${activeScan.appId}`)}
                    style={{ background: '#1f223e', border: '1px solid #444b94', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    View live →
                  </button>
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
