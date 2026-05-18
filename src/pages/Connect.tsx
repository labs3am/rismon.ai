import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle, AlertTriangle, Github, Loader2, Lock, KeyRound, Check } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import BackButton from '@/components/BackButton';
import WaitlistModal from '@/components/WaitlistModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RisGuide from '@/components/RisGuide';
import { Skeleton } from '@/components/ui/skeleton';
import { githubFetch, GithubAuthRequiredError, clearReauthFlag } from '@/lib/github-auth';

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
  const [liveUrl, setLiveUrl] = useState('');
  const [appDescription, setAppDescription] = useState('');
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
  const [usePatMode, setUsePatMode] = useState(false);
  const [patInput, setPatInput] = useState('');
  const [appLimitReached, setAppLimitReached] = useState(false);
  const [existingAppName, setExistingAppName] = useState('');
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [backendChoice, setBackendChoice] = useState('Supabase');

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
    // Backwards-compat: old OAuth redirects pointed at ?step=2 (GitHub was
    // step 2). GitHub is now step 1, so always send returning users there.
    const stepParam = searchParams.get('step');
    if (stepParam === '1' || stepParam === '2') setStep(1);
    const checkGithub = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.provider_token) {
        setGithubToken(s.provider_token);
        setGithubConnected(true);
        // Silent on initial load: if the cached provider_token is stale
        // we don't want to greet the user with a red error toast before
        // they've done anything. Just fall back to the "Connect GitHub"
        // state instead.
        fetchRepos(s.provider_token, { silent: true });
      } else {
        const ghId = s?.user?.identities?.find(i => i.provider === 'github');
        if (ghId) setGithubConnected(true);
      }
    };
    checkGithub();
  }, [searchParams, navigate]);

  const fetchRepos = async (token: string, opts: { silent?: boolean } = {}) => {
    setLoadingRepos(true);
    try {
      // githubFetch handles token refresh + re-auth automatically. If silent
      // mode is on we suppress the redirect/toast so the page can quietly
      // fall back to the "Connect GitHub" CTA.
      const res = await githubFetch(
        'https://api.github.com/user/repos?sort=updated&per_page=100&type=owner',
        { autoReauth: !opts.silent, notifyOnReauth: !opts.silent, reauthRedirectTo: `${window.location.origin}/connect?step=1` }
      );
      if (!res.ok) {
        if (!opts.silent) toast.error('Failed to load your GitHub repos.');
        setLoadingRepos(false);
        return;
      }
      setRepos(await res.json());
      clearReauthFlag();
    } catch (err) {
      if (err instanceof GithubAuthRequiredError) {
        // Stale/missing token. Reset UI to the "Connect GitHub" state. When
        // not silent, githubFetch has already kicked off the OAuth redirect.
        setGithubToken('');
        setGithubConnected(false);
      } else if (!opts.silent) {
        toast.error('Failed to fetch repos');
      }
    }
    setLoadingRepos(false);
  };

  const connectGithub = async () => {
    // Use linkIdentity so GitHub attaches to the CURRENT Rismon account
    // instead of replacing the session. This lets users connect any GitHub
    // account regardless of which email they used to sign up.
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error('Please log in before connecting GitHub.');
      navigate('/login');
      return;
    }

    const alreadyLinked = currentUser.identities?.some(i => i.provider === 'github');

    // If a GitHub identity is already linked, fall back to signInWithOAuth
    // to refresh the provider_token (needed to list repos). This stays on
    // the same account because the GitHub identity is already attached.
    if (alreadyLinked) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'repo read:user user:email',
          redirectTo: `${window.location.origin}/connect?step=1`,
          skipBrowserRedirect: false,
        },
      });
      if (error) toast.error('Failed to refresh GitHub access. Please try again.');
      return;
    }

    // First-time link: attach GitHub to the current account.
    const { error } = await (supabase.auth as any).linkIdentity({
      provider: 'github',
      options: {
        scopes: 'repo read:user user:email',
        redirectTo: `${window.location.origin}/connect?step=1`,
      },
    });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('linked') || msg.includes('exists')) {
        toast.error('This GitHub account is already linked to a different Rismon account. Please use a different GitHub account or contact support.');
      } else if (msg.includes('manual linking')) {
        toast.error('GitHub linking is not enabled on the Supabase project. Please enable Manual Linking in Supabase → Authentication → Settings.');
      } else {
        toast.error(error.message || 'Failed to connect GitHub');
      }
    }
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
      platform: platform === 'Other AI' ? otherPlatform : platform, status: 'active',
      live_url: liveUrl.trim() || null,
      app_description: appDescription.trim() || null,
    }).select().single();
    if (error) { toast.error('Failed to connect app'); setSaving(false); return; }
    // Save Supabase credentials encrypted, via SECURITY DEFINER RPC. The
    // plaintext never lands in a regular column the client could read back.
    if (supabaseUrl || supabaseKey) {
      const { error: credErr } = await supabase.rpc('set_app_supabase_credentials', {
        _app_id: data.id,
        _supabase_url: supabaseUrl || null,
        _supabase_anon_key: supabaseKey || null,
      });
      if (credErr) {
        toast.error(credErr.message || 'App connected, but credentials could not be saved.');
        setSaving(false);
        navigate(`/analyze/${data.id}`);
        return;
      }
    }
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
      live_url: liveUrl.trim() || null,
      app_description: appDescription.trim() || null,
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
        <div className="max-w-[640px] mx-auto px-4 sm:px-5 pt-20 sm:pt-24 pb-16">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-48 mt-4" />
          <Skeleton className="h-16 w-full rounded-lg mt-6" />
          <Skeleton className="h-[420px] w-full rounded-2xl mt-8" />
        </div>
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
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-10 max-w-[480px] w-full text-center">
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
      <div className="max-w-[640px] mx-auto px-4 sm:px-5 pt-20 sm:pt-24 pb-16">
        <BackButton to="/dashboard" label="Dashboard" />
        <h1 className="text-foreground text-[24px] sm:text-[28px] font-semibold">Connect an app</h1>

        <div className="mt-4">
          <RisGuide pageKey="connect" message={"Built with Lovable or Bolt?\nYou already have a GitHub repo — you just need to find it.\nOpen Lovable → click the GitHub icon top right → your repo is there.\nCome back and connect it here."} />
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mt-6 flex-wrap">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${step > s ? 'bg-primary text-primary-foreground' : step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {step > s ? <Check size={14} strokeWidth={3} /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-px ${step > s ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
          <div className="hidden sm:flex gap-4 ml-4 text-xs text-muted-foreground">
            <span className={step >= 1 ? 'text-foreground' : ''}>GitHub</span>
            <span className={step >= 2 ? 'text-foreground' : ''}>Details</span>
            <span className={step >= 3 ? 'text-foreground' : ''}>Database</span>
          </div>
          <span className="sm:hidden ml-2 text-xs text-foreground">
            Step {step} of 3 · {step === 1 ? 'GitHub' : step === 2 ? 'Details' : 'Database'}
          </span>
        </div>

        {/* Step 1 — GitHub */}
        {step === 1 && (
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-8 mt-6 sm:mt-8">
            <h2 className="text-foreground text-lg font-semibold">Connect your GitHub</h2>
            <p className="text-muted-foreground text-sm mt-2">Pick the repo you want analyzed. We'll ask about the app on the next step.</p>

            {/* Single, consolidated trust panel (replaces the previous 3 stacked blocks). */}
            <div className="rounded-xl p-4 mt-5" style={{ background: '#160d05', border: '1px solid #3a1d0c' }}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} style={{ color: '#f97316' }} />
                <span className="text-foreground text-sm font-semibold">Read-only. Your code is never stored.</span>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {['Read your code only', 'Cannot edit, push, or delete', 'Analyzed then discarded', 'Revoke anytime in GitHub'].map((t) => (
                  <div key={t} className="flex items-center gap-2"><CheckCircle size={13} className="text-success shrink-0" /><span className="text-muted-foreground text-[13px]">{t}</span></div>
                ))}
              </div>
              <p className="text-subtle text-[11px] mt-3">
                Not used for login. Rismon.ai is <a href="https://github.com/labs3am/rismon.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">open source</a> — verify yourself.
              </p>
            </div>

            {!githubConnected || !githubToken ? (
              <div className="mt-6">
                {!usePatMode ? (
                  <div className="text-center">
                    <Github size={40} className="text-muted-foreground mx-auto" />
                    <button onClick={connectGithub} className="mt-4 border border-hover-border text-foreground px-6 py-3 rounded-lg text-sm font-medium flex items-center gap-2 mx-auto hover:border-muted-foreground/30 transition-colors">
                      <Github size={16} /> Connect GitHub
                    </button>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#444444',
                        textAlign: 'center',
                        marginTop: 12,
                        maxWidth: 400,
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        lineHeight: 1.5,
                      }}
                    >
                      GitHub will show an authorization screen. You don't need to grant org access — just click Authorize labs3am.
                    </p>
                    <button onClick={() => setUsePatMode(true)} className="mt-3 text-muted-foreground text-xs hover:text-foreground transition-colors flex items-center gap-1.5 mx-auto">
                      <KeyRound size={12} /> Don't want to grant org access? Use a personal token
                    </button>
                  </div>
                ) : (
                  <div>
                    <button onClick={() => setUsePatMode(false)} className="text-muted-foreground text-xs hover:text-foreground transition-colors mb-4">← Back to OAuth</button>
                    <label className="text-foreground text-sm font-medium block mb-1.5">GitHub Personal Access Token</label>
                    <input
                      type="password"
                      value={patInput}
                      onChange={e => setPatInput(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxx"
                      className={inputClass}
                    />
                    <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
                      Create a token at{' '}
                      <a href="https://github.com/settings/tokens/new?scopes=repo&description=Rismon.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        github.com/settings/tokens
                      </a>
                      {' '}with <strong className="text-foreground">repo</strong> scope. No org access needed.
                    </p>
                    <button
                      onClick={() => {
                        if (!patInput.trim()) return;
                        setGithubToken(patInput.trim());
                        setGithubConnected(true);
                        fetchRepos(patInput.trim());
                      }}
                      disabled={!patInput.trim()}
                      className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium mt-4 hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <KeyRound size={16} /> Connect with token
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4"><CheckCircle size={18} className="text-success" /><span className="text-success text-[15px]">GitHub connected</span></div>
                <label className="text-foreground text-[15px] font-medium block mb-2">Select the repository to analyze</label>
                <input value={repoSearch} onChange={e => setRepoSearch(e.target.value)} placeholder="Search your repositories..." className={`${inputClass} mb-3`} />
                {loadingRepos ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="px-4 py-3 border-b border-border last:border-0 flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-muted animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-muted rounded animate-pulse" style={{ width: `${60 + (i * 7) % 30}%` }} />
                          <div className="h-2 bg-muted/60 rounded animate-pulse" style={{ width: '30%' }} />
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-center gap-2 py-3 bg-muted/20 text-muted-foreground text-xs">
                      <Loader2 size={12} className="animate-spin" />
                      Loading your repositories from GitHub…
                    </div>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                    {filteredRepos.map(r => (
                      <button key={r.full_name} onClick={() => { setSelectedRepo(r); if (!appName) setAppName(r.name); }}
                        className={`w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors ${selectedRepo?.full_name === r.full_name ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                        <p className="text-foreground text-sm font-medium">{r.name}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">Updated {relDate(r.updated_at)}</p>
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setStep(2)} disabled={!selectedRepo}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium mt-6 hover:bg-primary/90 transition-colors disabled:opacity-50">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — App details (asked AFTER GitHub so the repo name can pre-fill) */}
        {step === 2 && (
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-8 mt-6 sm:mt-8">
            <h2 className="text-foreground text-lg font-semibold">About your app</h2>
            <p className="text-muted-foreground text-sm mt-2">A few quick details so the scan is tailored to what your app actually does.</p>

            <div className="mt-6">
              <label className="text-foreground text-sm font-medium block mb-1.5">What is this app called?</label>
              <input value={appName} onChange={e => setAppName(e.target.value)} placeholder="My tutoring app" className={inputClass} />
              {selectedRepo && <p className="text-subtle text-xs mt-1.5">Connected repo: <span className="text-foreground">{selectedRepo.full_name}</span></p>}
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

            <div className="mt-7">
              <label className="text-foreground text-sm font-medium block mb-1.5">Your live homepage URL <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                value={liveUrl}
                onChange={e => setLiveUrl(e.target.value)}
                placeholder="https://yourapp.com"
                className={inputClass}
                inputMode="url"
              />
              <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
                We'll read your homepage and check if the promises on it actually exist in your code. Skip if your app isn't live yet.
              </p>
            </div>

            <div className="mt-6">
              <label className="text-foreground text-sm font-medium block mb-1.5">In one or two lines, what does your app do? <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea
                value={appDescription}
                onChange={e => setAppDescription(e.target.value.slice(0, 240))}
                placeholder="Example: A booking app for small yoga studios. Students book classes, teachers manage schedules, studio owners get paid."
                className={`${inputClass} resize-y min-h-[88px]`}
                rows={3}
                maxLength={240}
              />
              <p className="text-muted-foreground text-xs mt-2">{appDescription.length}/240 characters. We'll start the scan with this in mind.</p>
            </div>

            <div className="flex items-center gap-3 mt-7">
              <button onClick={() => setStep(1)} className="text-muted-foreground text-sm hover:text-foreground transition-colors">← Back</button>
              <button onClick={() => setStep(3)} disabled={!appName || !platform || (platform === 'Other AI' && !otherPlatform)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">Next →</button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-8 mt-6 sm:mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-foreground text-lg font-semibold">Connect your backend</h2>
              <span className="text-foreground text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-full">STRONGLY RECOMMENDED</span>
            </div>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
              Without your backend connected, Rismon can only read your frontend code. Any finding about access rules, data privacy, or admin protection will be marked <strong className="text-foreground">unverified</strong> because we cannot check your database directly.
            </p>

            <div className="mt-5 rounded-lg p-4" style={{ background: '#150f05', border: '1px solid #473012' }}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground text-[13px] font-medium">Skip this and your scan will guess instead of verify</p>
                  <p className="text-muted-foreground text-[12px] mt-1 leading-relaxed">
                    The AI may flag issues that don't actually exist (false positives), or miss real ones, because it can't see what's configured on your server. We'll ask you a few plain-English questions to fill the gap, but verified data is always more accurate.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="text-foreground text-sm font-medium block mb-2">Which backend does your app use?</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Supabase', 'Firebase', 'Custom API', 'No backend'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      if (b !== 'Supabase') {
                        setSupabaseUrl('');
                        setSupabaseKey('');
                      }
                      setBackendChoice(b);
                      setServiceRoleWarning(false);
                    }}
                    className={`px-4 py-2.5 rounded-lg text-sm border transition-colors ${
                      backendChoice === b
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-input text-foreground hover:border-hover-border'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {backendChoice === 'Supabase' && (
              <>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-foreground text-sm font-medium block mb-1.5">Supabase Project URL</label>
                    <input value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} placeholder="https://xxxx.supabase.co" className={inputClass} />
                    <details className="mt-1.5 group">
                      <summary className="text-primary text-xs cursor-pointer hover:underline list-none flex items-center gap-1">
                        <span className="group-open:rotate-90 inline-block transition-transform">▸</span>
                        Where do I find this?
                      </summary>
                      <div className="mt-2 p-3 rounded-md bg-muted/30 border border-border text-[12px] text-muted-foreground leading-relaxed">
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Open your project at <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com/dashboard</a></li>
                          <li>Click <strong className="text-foreground">Project Settings</strong> (gear icon) in the left sidebar</li>
                          <li>Click <strong className="text-foreground">API</strong></li>
                          <li>Copy the <strong className="text-foreground">Project URL</strong> at the top</li>
                        </ol>
                      </div>
                    </details>
                  </div>
                  <div>
                    <label className="text-foreground text-sm font-medium block mb-1.5">Anon public key</label>
                    <input value={supabaseKey} onChange={e => handleSupabaseKeyChange(e.target.value)} placeholder="eyJhbG..." className={inputClass} />
                    <p className="text-subtle text-xs mt-1">Use your <strong className="text-foreground">anon public</strong> key only. Never your service role key.</p>
                    <details className="mt-1.5 group">
                      <summary className="text-primary text-xs cursor-pointer hover:underline list-none flex items-center gap-1">
                        <span className="group-open:rotate-90 inline-block transition-transform">▸</span>
                        Where do I find this?
                      </summary>
                      <div className="mt-2 p-3 rounded-md bg-muted/30 border border-border text-[12px] text-muted-foreground leading-relaxed">
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Same page as the Project URL: <strong className="text-foreground">Project Settings → API</strong></li>
                          <li>Scroll to <strong className="text-foreground">Project API keys</strong></li>
                          <li>Copy the key labeled <strong className="text-foreground">anon · public</strong> (NOT service_role)</li>
                        </ol>
                        <p className="mt-2 text-[11px]">The anon key is safe to share — it respects your access rules. We reject service_role keys for safety.</p>
                      </div>
                    </details>
                  </div>
                </div>

                {supabaseUrl && supabaseKey && !serviceRoleWarning && (
                  <div className="mt-5 rounded-lg p-4" style={{ background: '#08130a', border: '1px solid #184823' }}>
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck size={16} className="text-success shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-foreground text-[13px] font-medium">
                          Optional: install our verification helper for fully verified findings
                        </p>
                        <p className="text-muted-foreground text-[12px] mt-1.5 leading-relaxed">
                          Your anon key alone lets us check connectivity. To <strong className="text-foreground">verify which tables have access rules enabled</strong> (so findings don't get marked "unverified"), paste this small SQL helper into your Supabase SQL Editor.
                        </p>
                        <details className="mt-3 group">
                          <summary className="text-primary text-[12px] font-medium cursor-pointer hover:underline list-none flex items-center gap-1">
                            <span className="group-open:rotate-90 inline-block transition-transform">▸</span>
                            What does this SQL actually do?
                          </summary>
                          <div className="mt-2 p-3 rounded-md bg-black/30 border border-border text-[12px] text-muted-foreground leading-relaxed space-y-2">
                            <p>It creates a <strong className="text-foreground">read-only function</strong> that returns a list of your table names and which ones have access rules turned on.</p>
                            <p>It <strong className="text-foreground">never reads any user data</strong> — only the table structure (metadata).</p>
                            <p>It cannot edit, delete, or insert anything. The word <code className="text-foreground">security definer</code> just means "use this function's permissions, not the caller's" — standard Supabase pattern.</p>
                            <p>You can delete the function anytime by running <code className="text-foreground">drop function public.rismon_security_metadata();</code></p>
                          </div>
                        </details>

                        <details className="mt-2 group">
                          <summary className="text-primary text-[12px] font-medium cursor-pointer hover:underline list-none flex items-center gap-1">
                            <span className="group-open:rotate-90 inline-block transition-transform">▸</span>
                            Show the SQL to copy
                          </summary>
                          <pre className="mt-2 text-[11px] bg-black/40 border border-border rounded-md p-3 overflow-x-auto text-foreground">
{`create or replace function public.rismon_security_metadata()
returns json language sql security definer set search_path=public,pg_catalog as $$
  select json_build_object('tables', coalesce(json_agg(t),'[]'::json))
  from (
    select c.relname as table, c.relrowsecurity as rls_enabled,
      coalesce((select json_agg(json_build_object(
        'name', p.policyname, 'cmd', p.cmd,
        'qual', p.qual::text, 'with_check', p.with_check::text))
        from pg_policies p where p.schemaname='public' and p.tablename=c.relname),'[]'::json) as policies
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'
  ) t;
$$;
grant execute on function public.rismon_security_metadata() to anon, authenticated;`}
                          </pre>
                          <p className="text-muted-foreground text-[11px] mt-2">
                            Open Supabase → <strong className="text-foreground">SQL Editor</strong> → New query → paste → <strong className="text-foreground">Run</strong>. Then come back and click Connect.
                          </p>
                        </details>
                        <p className="text-muted-foreground text-[11px] mt-3">
                          Don't want to run SQL? That's fine — click Connect anyway. We'll just mark database findings as "unverified" and ask you about them during the scan.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {backendChoice !== 'Supabase' && backendChoice !== 'No backend' && (
              <div className="mt-5 rounded-lg p-4" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
                <p className="text-foreground text-[13px] font-medium">We can't directly verify {backendChoice} yet</p>
                <p className="text-muted-foreground text-[12px] mt-1 leading-relaxed">
                  We'll ask you plain-English questions during the scan instead. Your answers become ground truth — the AI will not guess.
                </p>
              </div>
            )}

            {serviceRoleWarning && (
              <div className="flex items-start gap-2 mt-4 p-3 rounded-lg" style={{ background: '#1a0a0a', border: '1px solid #421616' }}>
                <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
                <p className="text-destructive text-sm">This is your admin key. Never share this. Use your anon public key instead. Find it: Supabase → Settings → API → anon public</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={handleComplete}
                disabled={saving || serviceRoleWarning || !supabaseUrl || !supabaseKey}
                className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Connect & continue (recommended)
              </button>
              <button
                onClick={handleSkipSupabase}
                disabled={saving}
                className="flex-1 sm:flex-none border border-input text-foreground px-6 py-3 rounded-lg text-sm font-medium hover:border-hover-border transition-colors disabled:opacity-50"
              >
                Skip — code-only scan
              </button>
            </div>
            <p className="text-subtle text-[11px] mt-2 text-center sm:text-left">
              Skipping means database findings will be marked "unverified". You can always reconnect later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
