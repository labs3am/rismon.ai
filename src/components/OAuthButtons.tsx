import { useState } from 'react';
import { Github, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.12s2.69-6.12 6-6.12c1.88 0 3.14.8 3.86 1.49l2.63-2.53C16.83 3.42 14.66 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.54 0 9.21-3.89 9.21-9.37 0-.63-.07-1.11-.16-1.59H12z"/>
      <path fill="#34A853" d="M3.88 7.36l3.16 2.32C7.9 7.74 9.79 6.36 12 6.36c1.88 0 3.14.8 3.86 1.49l2.63-2.53C16.83 3.42 14.66 2.4 12 2.4 8.24 2.4 4.99 4.42 3.88 7.36z" opacity="0"/>
      <path fill="#4285F4" d="M21.21 12.23c0-.63-.07-1.11-.16-1.59H12v3.9h5.5c-.11.65-.7 2-2 2.92l3.13 2.43c1.86-1.72 2.94-4.25 2.94-7.66z"/>
      <path fill="#FBBC05" d="M6 14.05a5.86 5.86 0 0 1 0-4.1L2.84 7.61A9.59 9.59 0 0 0 2.4 12c0 1.55.37 3.02 1.04 4.32L6 14.05z"/>
      <path fill="#34A853" d="M12 21.6c2.66 0 4.89-.88 6.52-2.39l-3.13-2.43c-.84.58-1.97.99-3.39.99-2.6 0-4.81-1.71-5.6-4.07L3.21 16.1C4.83 19.34 8.16 21.6 12 21.6z"/>
      <path fill="none" d="M2.4 2.4h19.2v19.2H2.4z"/>
    </svg>
  );
}

interface Props {
  redirectTo?: string;
}

export default function OAuthButtons({ redirectTo }: Props) {
  const [loading, setLoading] = useState<'google' | 'github' | null>(null);
  const finalRedirect = redirectTo || `${window.location.origin}/dashboard`;

  const signInWith = async (provider: 'google' | 'github') => {
    setLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: finalRedirect,
        ...(provider === 'github' ? { scopes: 'repo read:user user:email' } : {}),
      },
    });
    if (error) {
      toast.error(error.message || `Failed to sign in with ${provider}`);
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => signInWith('google')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-2.5 rounded-md font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: '#ffffff',
          color: '#1f1f1f',
          height: 44,
          fontSize: 14,
          border: '1px solid #e5e7eb',
        }}
      >
        {loading === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => signInWith('github')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-2.5 rounded-md font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: '#1a1a1a',
          color: '#ffffff',
          height: 44,
          fontSize: 14,
          border: '1px solid #2a2a2a',
        }}
      >
        {loading === 'github' ? <Loader2 size={16} className="animate-spin" /> : <Github size={18} />}
        Continue with GitHub
      </button>

      <div className="flex items-center gap-3 pt-1">
        <div style={{ flex: 1, height: 1, background: '#222222' }} />
        <span style={{ color: '#666666', fontSize: 12 }}>or continue with email</span>
        <div style={{ flex: 1, height: 1, background: '#222222' }} />
      </div>
    </div>
  );
}