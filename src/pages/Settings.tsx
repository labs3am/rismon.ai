import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Github } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SEO from '@/components/SEO';

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <SEO title="Settings — Rismon" description="Manage your Rismon account, profile, and connected providers." noindex />
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.12s2.69-6.12 6-6.12c1.88 0 3.14.8 3.86 1.49l2.63-2.53C16.83 3.42 14.66 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.54 0 9.21-3.89 9.21-9.37 0-.63-.07-1.11-.16-1.59H12z"/>
      <path fill="#4285F4" d="M21.21 12.23c0-.63-.07-1.11-.16-1.59H12v3.9h5.5c-.11.65-.7 2-2 2.92l3.13 2.43c1.86-1.72 2.94-4.25 2.94-7.66z"/>
      <path fill="#FBBC05" d="M6 14.05a5.86 5.86 0 0 1 0-4.1L2.84 7.61A9.59 9.59 0 0 0 2.4 12c0 1.55.37 3.02 1.04 4.32L6 14.05z"/>
      <path fill="#34A853" d="M12 21.6c2.66 0 4.89-.88 6.52-2.39l-3.13-2.43c-.84.58-1.97.99-3.39.99-2.6 0-4.81-1.71-5.6-4.07L3.21 16.1C4.83 19.34 8.16 21.6 12 21.6z"/>
    </svg>
  );
}

export default function Settings() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [company, setCompany] = useState(profile?.company_name || '');
  const [saving, setSaving] = useState(false);
  const [apps, setApps] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmApp, setConfirmApp] = useState<string | null>(null);
  const [identities, setIdentities] = useState<any[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [providerLoading, setProviderLoading] = useState<string | null>(null);

  const refreshIdentities = async () => {
    const { data } = await supabase.auth.getUser();
    const ids = data.user?.identities || [];
    setIdentities(ids);
    // If the user has an "email" identity (with a password set), they can safely unlink OAuth providers.
    setHasPassword(ids.some((i: any) => i.provider === 'email'));
  };

  useEffect(() => {
    if (user) refreshIdentities();
  }, [user]);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setCompany(profile?.company_name || '');
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('apps')
      .select('id,app_name,github_repo_name,github_owner,platform,created_at')
      .eq('user_id', user.id)
      .then(({ data }) => setApps(data || []));
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName, company_name: company }).eq('id', user.id);
    await refreshProfile();
    toast.success('Profile updated');
    setSaving(false);
  };

  const removeApp = async (id: string) => {
    const app = apps.find(a => a.id === id);
    // Cancel any in-flight scan sessions tied to this app's repo so the
    // dashboard doesn't surface a stale "scan in progress" banner pointing
    // at an app that no longer exists.
    if (app?.github_owner && app?.github_repo_name && user) {
      await supabase
        .from('scan_sessions')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('repo_name', `${app.github_owner}/${app.github_repo_name}`)
        .in('status', ['pending', 'analyzing']);
    }
    const { error: analysesError } = await supabase.from('analyses').delete().eq('app_id', id);
    if (analysesError) { toast.error('Failed to remove app. Please try again.'); return; }
    const { error: appError } = await supabase.from('apps').delete().eq('id', id);
    if (appError) { toast.error('Failed to remove app. Please try again.'); return; }
    setApps(apps.filter(a => a.id !== id));
    setConfirmApp(null);
    toast.success('App removed');
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) {
        toast.error('Failed to delete account. Please try again.');
        return;
      }
      await signOut();
      toast.success('Account deleted successfully');
      navigate('/');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const inputClass = "w-full bg-input-bg border border-input rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors";

  const isConnected = (provider: string) => identities.some(i => i.provider === provider);
  const canUnlink = (provider: string) => {
    // Only one identity total → unlinking would lock them out.
    if (identities.length <= 1) return false;
    // If they have no email/password identity AND this is their only OAuth, block.
    if (!hasPassword) {
      const oauthCount = identities.filter(i => i.provider !== 'email').length;
      if (oauthCount <= 1) return false;
    }
    return true;
  };

  const connectProvider = async (provider: 'google' | 'github') => {
    setProviderLoading(provider);
    const { error } = await (supabase.auth as any).linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/settings`,
        ...(provider === 'github' ? { scopes: 'repo read:user user:email' } : {}),
      },
    });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('manual linking')) {
        toast.error('Account linking is not enabled in Supabase. Enable Manual Linking in Authentication → Settings.');
      } else if (msg.includes('already') || msg.includes('exists')) {
        toast.error(`This ${provider === 'google' ? 'Google' : 'GitHub'} account is already linked to another Rismon account.`);
      } else {
        toast.error(error.message || `Failed to connect ${provider}`);
      }
      setProviderLoading(null);
    }
  };

  const unlinkProvider = async (provider: 'google' | 'github') => {
    const identity = identities.find(i => i.provider === provider);
    if (!identity) return;
    setProviderLoading(provider);
    const { error } = await (supabase.auth as any).unlinkIdentity(identity);
    if (error) {
      toast.error(error.message || `Failed to disconnect ${provider}`);
    } else {
      toast.success(`${provider === 'google' ? 'Google' : 'GitHub'} account disconnected`);
      await refreshIdentities();
    }
    setProviderLoading(null);
  };

  const ProviderRow = ({ provider, label, icon }: { provider: 'google' | 'github'; label: string; icon: React.ReactNode }) => {
    const connected = isConnected(provider);
    const allowUnlink = canUnlink(provider);
    const loading = providerLoading === provider;
    return (
      <div
        className="flex items-center justify-between gap-3"
        style={{ padding: '16px 0', borderBottom: '1px solid #1a1a1a' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center" style={{ width: 32, height: 32 }}>{icon}</div>
          <span className="text-foreground text-[15px] font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {connected ? (
            <>
              <div className="flex items-center gap-1.5">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                <span style={{ color: '#888888', fontSize: 13 }}>Connected</span>
              </div>
              {allowUnlink ? (
                <button
                  onClick={() => unlinkProvider(provider)}
                  disabled={loading}
                  className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                  style={{ background: '#1a1a1a', color: '#aaaaaa', border: '1px solid #2a2a2a' }}
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : 'Unlink'}
                </button>
              ) : (
                <span style={{ color: '#666666', fontSize: 12, fontStyle: 'italic' }}>
                  Set a password first before unlinking
                </span>
              )}
            </>
          ) : (
            <button
              onClick={() => connectProvider(provider)}
              disabled={loading}
              className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: '#ffffff', color: '#1f1f1f', border: '1px solid #e5e7eb' }}
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              Connect {label}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="max-w-[640px] mx-auto px-4 sm:px-5 pt-20 sm:pt-24 pb-16">
        <BackButton to="/dashboard" label="Dashboard" />
        <h1 className="text-foreground text-[24px] sm:text-[28px] font-semibold">Settings</h1>

        {/* Profile */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-8 mt-6 sm:mt-8">
          <h2 className="text-foreground text-lg font-semibold">Profile</h2>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-foreground text-sm font-medium block mb-1.5">Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-foreground text-sm font-medium block mb-1.5">Email</label>
              <input value={profile?.email || ''} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
            </div>
            <div>
              <label className="text-foreground text-sm font-medium block mb-1.5">Company name</label>
              <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Your company or project name" className={inputClass} />
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium mt-5 hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />} Save changes
          </button>
        </div>

        {/* Apps */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-8 mt-6">
          <h2 className="text-foreground text-lg font-semibold">Connected apps</h2>
          {apps.length === 0 ? <p className="text-muted-foreground text-sm mt-4">No apps connected yet.</p> : (
            <div className="mt-4 space-y-3">
              {apps.map(app => (
                <div key={app.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-[15px]">{app.app_name}</p>
                    <p className="text-muted-foreground text-[13px] truncate">{app.github_repo_name}</p>
                  </div>
                  {confirmApp === app.id ? (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => removeApp(app.id)} className="text-destructive text-xs font-medium px-2 py-1">Confirm</button>
                      <button onClick={() => setConfirmApp(null)} className="text-muted-foreground text-xs px-2 py-1">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmApp(app.id)} className="text-destructive text-sm hover:underline shrink-0">Remove</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connected Accounts */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-8 mt-6">
          <h2 className="text-foreground text-lg font-semibold" style={{ color: '#ffffff' }}>Connected Accounts</h2>
          <p style={{ color: '#888888', fontSize: 14, marginTop: 8 }}>
            Link your accounts to sign in faster next time. Your email and password will still work.
          </p>
          <div className="mt-4">
            <ProviderRow provider="google" label="Google" icon={<GoogleIcon size={20} />} />
            <ProviderRow provider="github" label="GitHub" icon={<Github size={20} color="#ffffff" />} />
          </div>
        </div>

        {/* Account */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-8 mt-6">
          <h2 className="text-foreground text-lg font-semibold">Account</h2>
          {confirmDelete ? (
            <div className="mt-4">
              <p className="text-foreground text-sm">Delete your account? This will permanently delete your account and all your analyses. This cannot be undone.</p>
              <div className="flex gap-3 mt-4">
                <button onClick={deleteAccount} className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm">Delete permanently</button>
                <button onClick={() => setConfirmDelete(false)} className="text-muted-foreground text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-destructive text-sm mt-4 hover:underline">Delete account</button>
          )}
        </div>
      </div>
    </div>
  );
}
