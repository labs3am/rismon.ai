import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import SEO from '@/components/SEO';
import Logo from '@/components/Logo';

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
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <SEO
        title="Sign up free — Rismon.ai"
        description="Create your free Rismon.ai account. Scan your AI-built app in 60 seconds. No credit card. Founder-friendly findings backed by file, line, and code snippet — plus copy-paste fix prompts."
        canonicalPath="/signup"
      />
      <Navbar />
      <div className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 64px)', padding: '80px 16px' }}>
        <div className="auth-glass-card">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Logo to={undefined as any} size="lg" />
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center' }}>Create your account</h1>
          <p style={{ color: '#888888', fontSize: 14, marginTop: 8, marginBottom: 32, textAlign: 'center' }}>Free to start. No credit card.</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label style={{ color: '#ffffff', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className="auth-input" required />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="auth-input" required />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" className="auth-input" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#888888', background: 'transparent', border: 'none' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
              {loading && <Loader2 size={16} className="animate-spin" />} Create account
            </button>
          </form>
          <p style={{ color: '#888888', fontSize: 14, textAlign: 'center', marginTop: 20 }}>
            Already have an account? <Link to="/login" style={{ color: '#f97316' }} className="hover:underline">Log in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
