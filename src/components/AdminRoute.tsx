import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Gate /admin/* routes. Verifies admin status server-side via the
 * `is_blog_admin()` RPC (the same check enforced by RLS on admin tables),
 * so a tampered client cannot bypass it.
 *
 * - Not logged in  → redirect to /login (with `from` so we can bounce back)
 * - Logged in, not admin → redirect to /dashboard
 * - Logged in, admin → render children
 */
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;
    if (!user) {
      setChecking(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase.rpc('is_blog_admin');
      if (cancelled) return;
      setIsAdmin(!error && data === true);
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || (user && checking)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}