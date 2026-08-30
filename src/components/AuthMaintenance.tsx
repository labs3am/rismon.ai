import Navbar from '@/components/Navbar';
import SEO from '@/components/SEO';
import Logo from '@/components/Logo';
import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';

/**
 * Master switch: while true, /login and /signup render this maintenance
 * screen instead of the auth forms. Flip to false to re-enable accounts.
 */
export const AUTH_MAINTENANCE = true;

export default function AuthMaintenance() {
  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <SEO
        title="We'll be right back | Rismon.ai"
        description="Rismon accounts are temporarily paused for scheduled maintenance. Sign-in and sign-up will be back shortly."
        canonicalPath="/login"
        noindex
      />
      <Navbar />
      <div className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 64px)', padding: '80px 16px' }}>
        <div className="auth-glass-card" style={{ textAlign: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Logo to={undefined as any} size="lg" />
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(249, 115, 22, 0.12)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              margin: '0 auto 20px auto',
            }}
          >
            <Wrench size={26} style={{ color: '#f97316' }} />
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center' }}>
            We're doing some maintenance
          </h1>
          <p style={{ color: '#888888', fontSize: 15, marginTop: 12, lineHeight: 1.6, textAlign: 'center' }}>
            Accounts are temporarily paused while we run a scheduled upgrade.
            Sign-in and sign-up will be back shortly — usually within the hour.
          </p>
          <div style={{ marginTop: 28 }}>
            <Link to="/" className="btn-cyber-primary w-full flex items-center justify-center gap-2">
              Back to homepage
            </Link>
            <Link
              to="/contact"
              style={{ display: 'block', color: '#888888', fontSize: 14, marginTop: 14, textDecoration: 'underline' }}
            >
              Questions? Contact us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}