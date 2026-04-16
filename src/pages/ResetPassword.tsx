import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ParticleBackground from '@/components/ParticleBackground';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase will auto-sign in the user from the recovery link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Also check if already in recovery state
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Failed to update password');
    } else {
      toast.success('Password updated successfully');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <ParticleBackground />
      <div className="relative z-10 auth-glass-card">
        <p className="text-foreground font-bold text-[22px] text-center mb-8">Rismon.ai</p>
        <h1 className="text-foreground text-2xl font-semibold">Set new password</h1>
        <p className="text-muted-foreground text-sm mt-1 mb-8">
          {ready ? 'Choose a new password for your account.' : 'Verifying your reset link...'}
        </p>
        {ready ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-foreground text-sm font-medium block mb-1.5">New password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className="auth-input" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-foreground text-sm font-medium block mb-1.5">Confirm password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="auth-input" required />
            </div>
            <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
              {loading && <Loader2 size={16} className="animate-spin" />} Update password
            </button>
          </form>
        ) : (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
