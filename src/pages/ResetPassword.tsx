import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Surface errors Supabase returns in the URL hash (expired/invalid link).
    const rawHash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(rawHash);
    const errDesc = hashParams.get('error_description') || hashParams.get('error');
    if (errDesc) {
      setErrorMsg(decodeURIComponent(errDesc.replace(/\+/g, ' ')));
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      toast.error('Reset link expired or invalid. Please request a new one.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Failed to update password');
    } else {
      // Sign out so the user must log in with the new password (clearer UX).
      await supabase.auth.signOut();
      toast.success('Password updated. Please log in with your new password.');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />
      <div className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 64px)', padding: '80px 16px' }}>
        <div className="auth-glass-card">
          <h1 style={{ color: '#ffffff', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Set new password</h1>
          <p style={{ color: '#888888', fontSize: 14, marginTop: 6, marginBottom: 32 }}>
            {ready ? 'Choose a new password for your account.' : 'Verifying your reset link...'}
          </p>
          {ready ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label style={{ color: '#ffffff', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>New password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className="auth-input" required />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#888888', background: 'transparent', border: 'none' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Confirm password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="auth-input" required />
              </div>
              <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                {loading && <Loader2 size={16} className="animate-spin" />} Update password
              </button>
            </form>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin" style={{ color: '#f97316' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
