import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings, LogOut, LayoutDashboard, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardNavbar() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || 'U';
  const isDashboard = location.pathname === '/dashboard';

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 64,
        background: scrolled ? 'rgba(0,0,0,0.72)' : '#000000',
        backdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid #ffffff14' : '1px solid #ffffff08',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div className="flex h-full items-center justify-between max-w-[1400px] mx-auto" style={{ padding: '0 24px' }}>
        <Link to="/dashboard" className="flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.01em' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f97316', boxShadow: '0 0 12px rgba(249,115,22,0.6)' }} />
          Rismon.ai
        </Link>

        <div className="flex items-center gap-3">
          {!isDashboard && (
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex items-center gap-2"
              style={{
                fontSize: 13,
                color: '#a1a1aa',
                padding: '7px 12px',
                borderRadius: 6,
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = '#ffffff08'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.background = 'transparent'; }}
            >
              <LayoutDashboard size={14} /> Dashboard
            </Link>
          )}

          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen(!open)}
              aria-label="Account menu"
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid #ffffff14',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: open ? '0 0 0 3px rgba(249,115,22,0.25)' : 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {initial}
            </button>

            {open && (
              <div
                className="absolute right-0 mt-2"
                style={{
                  width: 244,
                  background: 'rgba(10,10,10,0.95)',
                  backdropFilter: 'saturate(180%) blur(14px)',
                  WebkitBackdropFilter: 'saturate(180%) blur(14px)',
                  border: '1px solid #ffffff14',
                  borderRadius: 10,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '14px 16px' }}>
                  <p style={{ color: '#ffffff', fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{profile?.full_name || 'Account'}</p>
                  <p style={{ color: '#888888', fontSize: 12, marginTop: 2, wordBreak: 'break-all' }}>{profile?.email}</p>
                </div>

                {profile?.plan && (
                  <div style={{ padding: '0 16px 12px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: profile.plan === 'pro' ? '#f97316' : '#888888',
                        border: `1px solid ${profile.plan === 'pro' ? '#f9731640' : '#333'}`,
                        background: profile.plan === 'pro' ? 'rgba(249,115,22,0.08)' : 'transparent',
                        padding: '3px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {profile.plan === 'try_pro' ? 'Try Pro' : profile.plan} plan
                    </span>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #ffffff10' }} />

                <Link
                  to="/connect"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5"
                  style={{ fontSize: 13, color: '#a1a1aa', padding: '10px 16px', transition: 'background 0.15s, color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ffffff08'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a1a1aa'; }}
                >
                  <Plus size={14} /> Connect new app
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5"
                  style={{ fontSize: 13, color: '#a1a1aa', padding: '10px 16px', transition: 'background 0.15s, color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ffffff08'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a1a1aa'; }}
                >
                  <Settings size={14} /> Settings
                </Link>

                <div style={{ borderTop: '1px solid #ffffff10' }} />

                <button
                  onClick={async () => { await signOut(); navigate('/'); }}
                  className="flex items-center gap-2.5 w-full text-left"
                  style={{ fontSize: 13, color: '#a1a1aa', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ffffff08'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a1a1aa'; }}
                >
                  <LogOut size={14} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
