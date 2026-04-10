import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Loader2, Lock, Eye, EyeOff, ExternalLink } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import BackButton from '@/components/BackButton';
import WaitlistModal from '@/components/WaitlistModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const platforms = ['Lovable', 'Bolt', 'Cursor', 'Emergent', 'Replit', 'v0', 'Windsurf', 'Copilot', 'Gemini Code', 'Claude Code', 'Other AI'];

interface Repo { name: string; full_name: string; html_url: string; owner: { login: string }; updated_at: string; }

export default function Connect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [appName, setAppName] = useState('');
  const [platform, setPlatform] = useState('');
  const [otherPlatform, setOtherPlatform] = useState('');

  // GitHub PAT state
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenConnected, setTokenConnected] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [repoSearch, setRepoSearch] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [tokenError, setTokenError] = useState('');

  // Supabase optional
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [serviceRoleWarning, setServiceRoleWarning] = useState(false);

  const [saving, setSaving] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [appLimitReached, setAppLimitReached] = useState(false);
  const [existingAppName, setExistingAppName] = useState('');
  const [checkingLimit, setCheckingLimit] = useState(true);

  // Check app limit
  useEffect(() => {
    if (!user) return;
    const checkLimit = async () => {
      const { data, count } = await supabase.from('apps').select('app_name', { count: 'exact' }).eq('user_id', user.id);
      if ((count || 0) >= 1) {
        setAppLimitReached(true);
        setExistingAppName(data?.[0]?.app_name || 'your app');
      }
      setCheckingLimit(false);
    };
    checkLimit();
  }, [user]);

  const isTokenValid = (t: string) => t.startsWith('ghp_') || t.startsWith('github_pat_');

  const handleTokenChange = (val: string) => {
    setGithubToken(val);
    setTokenError('');
    setTokenConnected(false);
    setRepos([]);
    setSelectedRepo(null);
  };

  const connectWithToken = async () => {
    if (!isTokenValid(githubToken)) {
      setTokenError('This does not look like a valid GitHub token');
      return;
    }
    setLoadingRepos(true);
    setTokenError('');
    try {
      const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' }
      });
      if (!res.ok) throw new Error('Failed');
      setRepos(await res.json());
      setTokenConnected(true);
    } catch {
      setTokenError('Could not connect to GitHub. Check your token has repo access.');
    }
    setLoadingRepos(false);
  };

  const handleSupabaseKeyChange = (val: string) => {
    setSupabaseKey(val);
    setServiceRoleWarning(val.includes('service_role'));
  };

  const saveApp = async (withSupabase: boolean) => {
    if (!user || !selectedRepo) return;
    setSaving(true);
    const payload: any = {
      user_id: user.id, app_name: appName, github_repo_url: selectedRepo.html_url,
      github_repo_name: selectedRepo.name, github_owner: selectedRepo.owner.login,
      platform: platform === 'Other AI' ? otherPlatform : platform, status: 'active',
    };
    if (withSupabase) {
      payload.supabase_url = supabaseUrl || null;
      payload.supabase_anon_key = supabaseKey || null;
    }
    const { data, error } = await supabase.from('apps').insert(payload).select().single();
    if (error) { toast.error('Failed to connect app'); setSaving(false); return; }
    toast.success('App connected');
    navigate(`/analyze/${data.id}`);
  };

  const relDate = (d: string) => { const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return days === 0 ? 'today' : `${days}d ago`; };
  const filteredRepos = repos.filter(r => r.name.toLowerCase().includes(repoSearch.toLowerCase()));
  const inputClass = "w-full bg-input-bg border border-input rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors";

  if (checkingLimit) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="pt-24 flex justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      </div>
    );
  }

  if (appLimitReached) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
        <div className="flex items-center justify-center pt-32 px-4">
          <div className="bg-card border border-border rounded-2xl p-10 max-w-[480px] w-full text-center">
            <Lock size={48} className="text-primary mx-auto" />
            <h2 className="text-foreground text-[22px] font-semibold mt-5">You have used your free app</h2>
            <p className="text-muted-foreground text-[15px] mt-3 leading-relaxed">
              The free plan includes 1 app. You are already protecting <strong className="text-foreground">{existingAppName}</strong>. Upgrade to Pro to connect and analyze unlimited apps.
            </p>
            <button onClick={() => setWaitlistOpen(true)} className="w-full bg-primary text-primary-foreground py-3 rounded-lg text-sm font-medium mt-7 hover:bg-primary/90 transition-colors">
              Join Pro waitlist
            </button>
            <Link to="/dashboard" className="block w-full text-center text-muted-foreground py-3 rounded-lg text-sm mt-2 hover:text-foreground transition-colors">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="max-w-[640px] mx-auto px-5 pt-24 pb-16">
        <BackButton to="/dashboard" label="Dashboard" />
        <h1 className="text-foreground text-[28px] font-semibold">Connect an app</h1>

        {/* Progress */}
        <div className="flex items-center gap-2 mt-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${step > s ? 'bg-primary text-primary-foreground' : step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={`w-8 h-px ${step > s ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
          <div className="flex gap-4 ml-4 text-xs text-muted-foreground">
            <span className={step >= 1 ? 'text-foreground' : ''}>Details</span>
            <span className={step >= 2 ? 'text-foreground' : ''}>GitHub</span>
            <span className={step >= 3 ? 'text-foreground' : ''}>Database</span>
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="bg-card border border-border rounded-2xl p-8 mt-8">
            <h2 className="text-foreground text-lg font-semibold">About your app</h2>
            <div className="mt-6">
              <label className="text-foreground text-sm font-medium block mb-1.5">What is this app called?</label>
              <input value={appName} onChange={e => setAppName(e.target.value)} placeholder="My tutoring app" className={inputClass} />
            </div>
            <p className="text-foreground text-[15px] font-semibold mt-7">Which platform did you build on?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              {platforms.map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`px-4 py-2.5 rounded-lg text-sm text-center border transition-colors ${platform === p ? 'border-primary bg-primary/10 text-foreground' : 'border-input text-foreground hover:border-hover-border'}`}>
                  {p}
                </button>
              ))}
            </div>
            {platform === 'Other AI' && (
              <input value={otherPlatform} onChange={e => setOtherPlatform(e.target.value)} placeholder="Example: Firebase Studio" className={`${inputClass} mt-3`} />
            )}
            <button onClick={() => setStep(2)} disabled={!appName || !platform || (platform === 'Other AI' && !otherPlatform)}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium mt-7 hover:bg-primary/90 transition-colors disabled:opacity-50">Next →</button>
          </div>
        )}

        {/* Step 2 — GitHub PAT */}
        {step === 2 && (
          <div className="bg-card border border-border rounded-2xl p-8 mt-8">
            <h2 className="text-foreground text-[18px] font-semibold">Connect your GitHub</h2>
            <p className="text-muted-foreground text-[14px] mt-2">
              Create a read-only token so Rismon.ai can read your repository.
            </p>

            {/* Instructions card */}
            <div className="rounded-xl p-5 mt-5" style={{ background: '#0d0d0d', border: '1px solid #1e1e1e' }}>
              <div className="space-y-3 text-[13px]">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground font-medium shrink-0">1.</span>
                  <span className="text-muted-foreground">
                    Open{' '}
                    <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      github.com/settings/tokens <ExternalLink size={12} />
                    </a>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground font-medium shrink-0">2.</span>
                  <span className="text-muted-foreground">Click <strong className="text-foreground">Generate new token (classic)</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground font-medium shrink-0">3.</span>
                  <span className="text-muted-foreground">Check only the <strong className="text-foreground">repo</strong> checkbox</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground font-medium shrink-0">4.</span>
                  <span className="text-muted-foreground">Copy the token and paste below</span>
                </div>
              </div>
            </div>

            {/* Token input */}
            <div className="mt-6">
              <label className="text-foreground text-sm font-medium block mb-1.5">Your GitHub token</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={githubToken}
                  onChange={e => handleTokenChange(e.target.value)}
                  placeholder="ghp_..."
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Validation feedback */}
              {githubToken && !isTokenValid(githubToken) && !tokenError && (
                <p className="text-destructive text-xs mt-1.5">This does not look like a valid GitHub token</p>
              )}
              {tokenError && (
                <p className="text-destructive text-xs mt-1.5">{tokenError}</p>
              )}
              {githubToken && isTokenValid(githubToken) && !tokenConnected && !tokenError && (
                <div className="flex items-center gap-1 mt-1.5">
                  <CheckCircle size={13} className="text-success" />
                  <span className="text-success text-xs">Token format valid</span>
                </div>
              )}
            </div>

            {/* Connect button */}
            {!tokenConnected && (
              <button
                onClick={connectWithToken}
                disabled={!githubToken || !isTokenValid(githubToken) || loadingRepos}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium mt-4 hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loadingRepos && <Loader2 size={16} className="animate-spin" />}
                Connect
              </button>
            )}

            {/* Repo selection */}
            {tokenConnected && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={18} className="text-success" />
                  <span className="text-success text-[15px]">GitHub connected</span>
                </div>
                <label className="text-foreground text-[15px] font-medium block mb-2">Select the repository to analyze</label>
                <input value={repoSearch} onChange={e => setRepoSearch(e.target.value)} placeholder="Search your repositories..." className={`${inputClass} mb-3`} />
                <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                  {filteredRepos.map(r => (
                    <button key={r.full_name} onClick={() => setSelectedRepo(r)}
                      className={`w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors ${selectedRepo?.full_name === r.full_name ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                      <p className="text-foreground text-sm font-medium">{r.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">Updated {relDate(r.updated_at)}</p>
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep(3)} disabled={!selectedRepo}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium mt-6 hover:bg-primary/90 transition-colors disabled:opacity-50">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="bg-card border border-border rounded-2xl p-8 mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-foreground text-lg font-semibold">Connect Supabase</h2>
              <span className="text-muted-foreground text-[11px] bg-muted px-2.5 py-1 rounded-full">OPTIONAL</span>
            </div>
            <p className="text-muted-foreground text-sm mt-3">Connecting Supabase lets Rismon.ai check your database structure and find more gaps. Use your anon key only.</p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-foreground text-sm font-medium block mb-1.5">Supabase Project URL</label>
                <input value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} placeholder="https://xxxx.supabase.co" className={inputClass} />
              </div>
              <div>
                <label className="text-foreground text-sm font-medium block mb-1.5">Anon public key</label>
                <input value={supabaseKey} onChange={e => handleSupabaseKeyChange(e.target.value)} placeholder="eyJhbG..." className={inputClass} />
                <p className="text-muted-foreground text-xs mt-1">Use your anon key only. Never your service role key.</p>
              </div>
            </div>
            {serviceRoleWarning && (
              <div className="flex items-start gap-2 mt-4 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
                <p className="text-destructive text-sm">This is your admin key. Never share this. Use your anon public key instead. Find it: Supabase → Settings → API → anon public</p>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => saveApp(false)} disabled={saving} className="text-muted-foreground text-sm hover:text-foreground transition-colors">Skip for now →</button>
              <button onClick={() => saveApp(true)} disabled={saving || serviceRoleWarning}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />} Connect Supabase
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
