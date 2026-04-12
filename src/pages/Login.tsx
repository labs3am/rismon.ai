import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ParticleBackground from '@/components/ParticleBackground';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message || 'Login failed');
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
        <h1 className="text-foreground text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground text-sm mt-1 mb-8">Good to see you again</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-foreground text-sm font-medium block mb-1.5">Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="auth-input" required />
          </div>
          <div>
            <label className="text-foreground text-sm font-medium block mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" className="auth-input" required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-muted-foreground text-[13px] text-right mt-1.5 cursor-pointer hover:text-foreground transition-colors">Forgot password?</p>
          </div>
          <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />} Log in
          </button>
        </form>
        <p className="text-muted-foreground text-sm text-center mt-5">
          Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up →</Link>
        </p>
      </div>
    </div>
  );
}
