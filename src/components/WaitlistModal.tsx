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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-10 max-w-[440px] w-full relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X size={20} /></button>
        {submitted ? (
          <div className="text-center py-4">
            <CheckCircle className="text-success mx-auto" size={48} />
            <p className="text-foreground text-lg font-semibold mt-4">You are on the list 🙏</p>
            <p className="text-muted-foreground text-sm mt-2">We will email you before we launch.</p>
          </div>
        ) : (
          <>
            <h3 className="text-foreground text-[22px] font-semibold">Join founding member waitlist</h3>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
              Rismon.ai Pro is launching soon. The first 50 founders get ₹999/month locked in forever. Regular price will be ₹1,499/month. Join now to secure your founding price.
            </p>
            <form onSubmit={handleSubmit} className="mt-6">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
                className="w-full bg-input-bg border border-input rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
              <button type="submit" disabled={loading}
                className="w-full mt-3 bg-primary text-primary-foreground py-3.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {loading ? 'Joining...' : 'Secure my founding price'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
