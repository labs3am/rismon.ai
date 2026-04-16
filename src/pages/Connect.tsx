import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle, AlertTriangle, Github, Loader2, Lock } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import BackButton from '@/components/BackButton';
import WaitlistModal from '@/components/WaitlistModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RisGuide from '@/components/RisGuide';

const platforms = ['Lovable', 'Bolt', 'Cursor', 'Emergent', 'Replit', 'v0', 'Windsurf', 'Copilot', 'Gemini Code', 'Claude Code', 'Other AI'];

interface Repo { name: string; full_name: string; html_url: string; owner: { login: string }; updated_at: string; }

export default function Connect() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [appName, setAppName] = useState('');
  const [platform, setPlatform] = useState('');
  const [otherPlatform, setOtherPlatform] = useState('');
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [repoSearch, setRepoSearch] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);
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

  useEffect(() => {
    if (searchParams.get('step') === '2') setStep(2);
    const checkGithub = async () => {
      // Check for session conflict after OAuth redirect
      const preId = sessionStorage.getItem('rismon_pre_oauth_id');
      const preEmail = sessionStorage.getItem('rismon_pre_oauth_email');

      if (preId) {
        sessionStorage.removeItem('rismon_pre_oauth_id');
        sessionStorage.removeItem('rismon_pre_oauth_email');

        const { data: { user: current } } = await supabase.auth.getUser();
        if (current && current.id !== preId) {
          // Session switched to a different account — sign out and redirect
          await supabase.auth.signOut();
          navigate('/dashboard?github_conflict=true');
          return;
        }
      }

      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.provider_token) {
        setGithubToken(s.provider_token);
        setGithubConnected(true);
        fetchRepos(s.provider_token);
      } else {
        const ghId = s?.user?.identities?.find(i => i.provider === 'github');
        if (ghId) setGithubConnected(true);
      }
    };
    checkGithub();
  }, [searchParams, navigate]);

  const fetchRepos = async (token: string) => {
    setLoadingRepos(true);
    try {
      const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
      });
      if (res.ok) setRepos(await res.json());
    } catch { toast.error('Failed to fetch repos'); }
    setLoadingRepos(false);
  };

  const connectGithub = async () => {
    // Store current user identity before OAuth redirect
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      sessionStorage.setItem('rismon_pre_oauth_id', currentUser.id);
      sessionStorage.setItem('rismon_pre_oauth_email', currentUser.email || '');
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'repo read:user user:email',
        redirectTo: `${window.location.origin}/connect?step=2`,
        skipBrowserRedirect: false
      }
    });
    if (error) toast.error('Failed to connect GitHub');
  };

  const handleSupabaseKeyChange = (val: string) => {
    setSupabaseKey(val);
    setServiceRoleWarning(val.includes('service_role'));
  };

  const handleComplete = async () => {
    if (!user || !selectedRepo) return;
    setSaving(true);
    const { data, error } = await supabase.from('apps').insert({
      user_id: user.id, app_name: appName, github_repo_url: selectedRepo.html_url,
      github_repo_name: selectedRepo.name, github_owner: selectedRepo.owner.login,
      supabase_url: supabaseUrl || null, supabase_anon_key: supabaseKey || null,
      platform: platform === 'Other AI' ? otherPlatform : platform, status: 'active',
    }).select().single();
    if (error) { toast.error('Failed to connect app'); setSaving(false); return; }
    toast.success('App connected');
    navigate(`/analyze/${data.id}`);
  };

  const handleSkipSupabase = async () => {
    if (!user || !selectedRepo) return;
    setSaving(true);
    const { data, error } = await supabase.from('apps').insert({
      user_id: user.id, app_name: appName, github_repo_url: selectedRepo.html_url,
      github_repo_name: selectedRepo.name, github_owner: selectedRepo.owner.login,
      platform: platform === 'Other AI' ? otherPlatform : platform, status: 'active',
    }).select().single();
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

  // App limit reached screen
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

        <div className="mt-4">
          <RisGuide pageKey="connect" message={"Built with Lovable or Bolt?\nYou already have a GitHub repo — you just need to find it.\nOpen Lovable → click the GitHub icon top right → your repo is there.\nCome back and connect it here."} />
        </div>

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

        {/* Step 2 */}
        {step === 2 && (
          <div className="bg-card border border-border rounded-2xl p-8 mt-8">
            <h2 className="text-foreground text-lg font-semibold">Connect your GitHub</h2>
            <div className="rounded-xl p-4 mt-4" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="flex items-center gap-2"><ShieldCheck size={20} className="text-primary" /><span className="text-foreground text-sm font-semibold">Read only. Always.</span></div>
              <div className="mt-3 space-y-1.5">
                {['We connect to read your code only', 'We can never edit, delete, or change anything', 'Your code is analyzed and immediately discarded', 'Nothing is stored on our servers'].map((t, i) => (
                  <div key={i} className="flex items-center gap-2"><CheckCircle size={13} className="text-success shrink-0" /><span className="text-muted-foreground text-[13px]">{t}</span></div>
                ))}
              </div>
            </div>
            <p className="text-subtle text-xs mt-2">GitHub is for connecting your app only. It is not used for login.</p>

            <div className="flex items-start gap-2.5 mt-4 p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
              <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                Read-only access. Your code is never stored. Rismon.ai is <a href="https://github.com/labs3am/rismon.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">fully open source</a> — verify our claims yourself.
              </p>
            </div>

            {!githubConnected || !githubToken ? (
              <div className="text-center mt-6">
                <Github size={40} className="text-muted-foreground mx-auto" />
                <button onClick={connectGithub} className="mt-4 border border-hover-border text-foreground px-6 py-3 rounded-lg text-sm font-medium flex items-center gap-2 mx-auto hover:border-muted-foreground/30 transition-colors">
                  <Github size={16} /> Connect GitHub
                </button>
              </div>
            ) : (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4"><CheckCircle size={18} className="text-success" /><span className="text-success text-[15px]">GitHub connected</span></div>
                <label className="text-foreground text-[15px] font-medium block mb-2">Select the repository to analyze</label>
                <input value={repoSearch} onChange={e => setRepoSearch(e.target.value)} placeholder="Search your repositories..." className={`${inputClass} mb-3`} />
                {loadingRepos ? (
                  <div className="flex justify-center py-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                    {filteredRepos.map(r => (
                      <button key={r.full_name} onClick={() => setSelectedRepo(r)}
                        className={`w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors ${selectedRepo?.full_name === r.full_name ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                        <p className="text-foreground text-sm font-medium">{r.name}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">Updated {relDate(r.updated_at)}</p>
                      </button>
                    ))}
                  </div>
                )}
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
                <p className="text-subtle text-xs mt-1">Use your anon key only. Never your service role key.</p>
              </div>
            </div>
            {serviceRoleWarning && (
              <div className="flex items-start gap-2 mt-4 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
                <p className="text-destructive text-sm">This is your admin key. Never share this. Use your anon public key instead. Find it: Supabase → Settings → API → anon public</p>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={handleSkipSupabase} disabled={saving} className="text-muted-foreground text-sm hover:text-foreground transition-colors">Skip for now →</button>
              <button onClick={handleComplete} disabled={saving || serviceRoleWarning}
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
