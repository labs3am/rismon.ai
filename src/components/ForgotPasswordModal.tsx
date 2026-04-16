import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ open, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleClose = () => {
    setEmail('');
    setSent(false);
    setLoading(false);
    onClose();
  };

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Failed to send reset email');
    } else {
      setSent(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="auth-glass-card relative max-w-md w-full">
        <button onClick={handleClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>
        {sent ? (
          <div className="text-center py-4">
            <h2 className="text-foreground text-xl font-semibold mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm">We sent a password reset link to <span className="text-foreground">{email}</span>. Click the link to set a new password.</p>
            <button onClick={handleClose} className="btn-cyber-primary mt-6 px-6">Got it</button>
          </div>
        ) : (
          <>
            <h2 className="text-foreground text-xl font-semibold">Reset your password</h2>
            <p className="text-muted-foreground text-sm mt-1 mb-6">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-foreground text-sm font-medium block mb-1.5">Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="auth-input" required />
              </div>
              <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                {loading && <Loader2 size={16} className="animate-spin" />} Send reset link
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
