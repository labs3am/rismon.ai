import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
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
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />
      <div className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 64px)', padding: '80px 16px' }}>
        <div className="auth-glass-card">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ color: '#ffffff', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Rismon.ai</span>
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}>Welcome back</h1>
          <p style={{ color: '#888888', fontSize: 15, marginTop: 6, marginBottom: 32 }}>Good to see you again</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label style={{ color: '#ffffff', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="auth-input" required />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" className="auth-input" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#888888', background: 'transparent', border: 'none' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p onClick={() => setForgotOpen(true)} style={{ color: '#888888', fontSize: 13, textAlign: 'right', marginTop: 8, cursor: 'pointer' }}>Forgot password?</p>
            </div>
            <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
              {loading && <Loader2 size={16} className="animate-spin" />} Log in
            </button>
          </form>
          <p style={{ color: '#888888', fontSize: 14, textAlign: 'center', marginTop: 20 }}>
            Don't have an account? <Link to="/signup" style={{ color: '#f97316' }} className="hover:underline">Sign up →</Link>
          </p>
        </div>
      </div>
      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
}
