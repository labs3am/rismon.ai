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
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background">
      <div className="flex h-full items-center justify-between px-6 md:px-10 max-w-[1400px] mx-auto">
        <Link to="/dashboard" className="text-[20px] font-bold text-foreground">Rismon.ai</Link>
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(!open)} className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
            {initial}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-56 bg-secondary border border-input rounded-xl py-2">
              <div className="px-4 py-2">
                <p className="text-foreground text-sm font-medium">{profile?.full_name}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{profile?.email}</p>
              </div>
              <div className="border-t border-border my-1" />
              <Link to="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setOpen(false)}>
                <Settings size={14} /> Settings
              </Link>
              <button onClick={async () => { await signOut(); navigate('/'); }} className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left">
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
