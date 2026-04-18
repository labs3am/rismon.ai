import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props { isOpen: boolean; onClose: () => void; }

export default function WaitlistModal({ isOpen, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.from('waitlist').insert({ email });
    if (error) {
      toast.error(error.code === '23505' ? 'Already on the waitlist' : 'Something went wrong');
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="relative" style={{ background: '#0a0a0a', border: '1px solid #ffffff14', borderRadius: 12, padding: 40, maxWidth: 440, width: '100%' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: '#888888', background: 'transparent', border: 'none' }}><X size={20} /></button>
        {submitted ? (
          <div className="text-center py-4">
            <CheckCircle style={{ color: '#22c55e', margin: '0 auto' }} size={48} />
            <p style={{ color: '#ffffff', fontSize: 18, fontWeight: 600, marginTop: 16 }}>You are on the waitlist.</p>
            <p style={{ color: '#888888', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
              We will email you at <span style={{ color: '#ffffff' }}>{email}</span> before Rismon.ai Pro launches. You will be among the first to know.
            </p>
            <p style={{ color: '#555555', fontSize: 12, marginTop: 12 }}>No spam. One email when we launch.</p>
            <button onClick={onClose} className="mt-5" style={{ fontSize: 14, color: '#888888', background: 'transparent', border: 'none', cursor: 'pointer' }}>Close</button>
          </div>
        ) : (
          <>
            <h3 style={{ color: '#ffffff', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Join founding member waitlist</h3>
            <p style={{ color: '#888888', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
              Rismon.ai Pro is launching soon. The first 50 founders get $12/month locked in forever. Regular price will be $18/month. Join now to secure your founding price.
            </p>
            <form onSubmit={handleSubmit} className="mt-6">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required className="auth-input" />
              <button type="submit" disabled={loading} className="btn-cyber-primary w-full mt-3 disabled:opacity-50">
                {loading ? 'Joining...' : 'Secure my founding price'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
