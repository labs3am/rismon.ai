import { Link, useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardNavbar() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 64, background: '#000000', borderBottom: '1px solid #1a1a1a' }}>
      <div className="flex h-full items-center justify-between max-w-[1400px] mx-auto" style={{ padding: '0 24px' }}>
        <Link to="/dashboard" style={{ fontSize: 16, fontWeight: 600, color: '#ffffff' }}>Rismon.ai</Link>
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(!open)} style={{ width: 36, height: 36, borderRadius: '50%', background: '#f97316', color: '#ffffff', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
            {initial}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-56 py-2" style={{ background: '#0a0a0a', border: '1px solid #ffffff14', borderRadius: 8 }}>
              <div className="px-4 py-2">
                <p style={{ color: '#ffffff', fontSize: 14, fontWeight: 500 }}>{profile?.full_name}</p>
                <p style={{ color: '#888888', fontSize: 12, marginTop: 2 }}>{profile?.email}</p>
              </div>
              <div style={{ borderTop: '1px solid #ffffff14', margin: '4px 0' }} />
              <Link to="/settings" className="flex items-center gap-2 px-4 py-2 transition-colors" style={{ fontSize: 14, color: '#888888' }} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')} onClick={() => setOpen(false)}>
                <Settings size={14} /> Settings
              </Link>
              <button onClick={async () => { await signOut(); navigate('/'); }} className="flex items-center gap-2 px-4 py-2 w-full text-left transition-colors" style={{ fontSize: 14, color: '#888888', background: 'transparent', border: 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
