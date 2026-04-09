import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Settings() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [company, setCompany] = useState(profile?.company_name || '');
  const [saving, setSaving] = useState(false);
  const [apps, setApps] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmApp, setConfirmApp] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setCompany(profile?.company_name || '');
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from('apps').select('*').eq('user_id', user.id).then(({ data }) => setApps(data || []));
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
    await supabase.from('analyses').delete().eq('app_id', id);
    await supabase.from('apps').delete().eq('id', id);
    setApps(apps.filter(a => a.id !== id));
    setConfirmApp(null);
    toast.success('App removed');
  };

  const deleteAccount = async () => {
    if (!user) return;
    await supabase.from('analyses').delete().eq('user_id', user.id);
    await supabase.from('apps').delete().eq('user_id', user.id);
    await supabase.from('profiles').delete().eq('id', user.id);
    await signOut();
    navigate('/');
  };

  const inputClass = "w-full bg-input-bg border border-input rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors";

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="max-w-[640px] mx-auto px-5 pt-24 pb-16">
        <BackButton to="/dashboard" label="Dashboard" />
        <h1 className="text-foreground text-[28px] font-semibold">Settings</h1>

        {/* Profile */}
        <div className="bg-card border border-border rounded-2xl p-8 mt-8">
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
        <div className="bg-card border border-border rounded-2xl p-8 mt-6">
          <h2 className="text-foreground text-lg font-semibold">Connected apps</h2>
          {apps.length === 0 ? <p className="text-muted-foreground text-sm mt-4">No apps connected yet.</p> : (
            <div className="mt-4 space-y-3">
              {apps.map(app => (
                <div key={app.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-foreground text-[15px]">{app.app_name}</p>
                    <p className="text-muted-foreground text-[13px]">{app.github_repo_name}</p>
                  </div>
                  {confirmApp === app.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => removeApp(app.id)} className="text-destructive text-xs font-medium">Confirm</button>
                      <button onClick={() => setConfirmApp(null)} className="text-muted-foreground text-xs">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmApp(app.id)} className="text-destructive text-sm hover:underline">Remove</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account */}
        <div className="bg-card border border-border rounded-2xl p-8 mt-6">
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
