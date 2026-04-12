import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ParticleBackground from '@/components/ParticleBackground';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    if (error) {
      toast.error(error.message || 'Signup failed');
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <ParticleBackground />
      <div className="relative z-10 auth-glass-card">
        <p className="text-primary font-bold text-[22px] text-center mb-8">Rismon.ai</p>
        <h1 className="text-foreground text-2xl font-semibold">Create your account</h1>
        <p className="text-muted-foreground text-sm mt-1 mb-8">Free to start. No credit card.</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-foreground text-sm font-medium block mb-1.5">Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className="auth-input" required />
          </div>
          <div>
            <label className="text-foreground text-sm font-medium block mb-1.5">Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="auth-input" required />
          </div>
          <div>
            <label className="text-foreground text-sm font-medium block mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" className="auth-input" required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />} Create account
          </button>
        </form>
        <p className="text-muted-foreground text-sm text-center mt-5">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Log in →</Link>
        </p>
      </div>
    </div>
  );
}
