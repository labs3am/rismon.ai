import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Settings, LogOut, LayoutDashboard, Plug, ChevronDown, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from './Logo';

export default function DashboardNavbar() {
  const { profile, signOut, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc('is_blog_admin').then(({ data }) => setIsAdmin(data === true));
  }, [user]);

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

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || 'U';
  const isActive = (p: string) => location.pathname === p;

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      style={{
        color: isActive(to) ? '#ffffff' : '#a3a3a3',
        fontSize: 13.5,
        fontWeight: 450,
        transition: 'color 0.15s ease',
        position: 'relative',
        padding: '4px 0',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
      onMouseLeave={e => (e.currentTarget.style.color = isActive(to) ? '#ffffff' : '#a3a3a3')}
    >
      {label}
      {isActive(to) && (
        <span
          style={{
            position: 'absolute',
            bottom: -22,
            left: 0,
            right: 0,
            height: 2,
            background: '#f97316',
            borderRadius: 2,
          }}
        />
      )}
    </Link>
  );

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 64,
        background: scrolled ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.4)',
        backdropFilter: 'saturate(180%) blur(16px)',
        WebkitBackdropFilter: 'saturate(180%) blur(16px)',
        borderBottom: scrolled ? '1px solid #ffffff14' : '1px solid transparent',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      <div className="flex h-full items-center justify-between max-w-[1400px] mx-auto" style={{ padding: '0 24px' }}>
        <div className="flex items-center gap-8">
          <Logo to="/dashboard" />
          <div className="hidden md:flex items-center gap-7">
            {navLink('/dashboard', 'Dashboard')}
            {navLink('/connect', 'Connect')}
            {navLink('/settings', 'Settings')}
          </div>
        </div>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: open ? '#ffffff10' : 'transparent',
              border: '1px solid ' + (open ? '#ffffff20' : 'transparent'),
              borderRadius: 999,
              padding: '4px 10px 4px 4px',
              cursor: 'pointer',
              transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#ffffff08'; }}
            onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
            aria-label="Account menu"
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                letterSpacing: 0,
              }}
            >
              {initial}
            </span>
            <ChevronDown size={14} style={{ color: '#a3a3a3', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
          </button>

          {open && (
            <div
              className="absolute right-0 mt-2 w-64"
              style={{
                background: 'rgba(10,10,10,0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid #ffffff14',
                borderRadius: 12,
                boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px #ffffff05',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #ffffff10' }}>
                <p style={{ color: '#ffffff', fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{profile?.full_name || 'Account'}</p>
                <p style={{ color: '#888888', fontSize: 12, marginTop: 3, wordBreak: 'break-all' }}>{profile?.email}</p>
              </div>
              <div style={{ padding: 6 }}>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors"
                  style={{ fontSize: 13.5, color: '#d4d4d4' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ffffff08'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d4d4d4'; }}
                  onClick={() => setOpen(false)}
                >
                  <LayoutDashboard size={14} /> Dashboard
                </Link>
                <Link
                  to="/connect"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors"
                  style={{ fontSize: 13.5, color: '#d4d4d4' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ffffff08'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d4d4d4'; }}
                  onClick={() => setOpen(false)}
                >
                  <Plug size={14} /> Connect app
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors"
                  style={{ fontSize: 13.5, color: '#d4d4d4' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ffffff08'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d4d4d4'; }}
                  onClick={() => setOpen(false)}
                >
                  <Settings size={14} /> Settings
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors"
                    style={{ fontSize: 13.5, color: '#f97316' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f9731614'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    onClick={() => setOpen(false)}
                  >
                    <Shield size={14} /> Admin
                  </Link>
                )}
              </div>
              <div style={{ borderTop: '1px solid #ffffff10', padding: 6 }}>
                <button
                  onClick={async () => { setOpen(false); await signOut(); navigate('/'); }}
                  className="flex items-center gap-2.5 px-3 py-2 w-full text-left rounded-md transition-colors"
                  style={{ fontSize: 13.5, color: '#d4d4d4', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ffffff08'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d4d4d4'; }}
                >
                  <LogOut size={14} /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
