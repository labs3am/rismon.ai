import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PageSkeleton from '@/components/PageSkeleton';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSkeleton variant="dashboard" withNav />;
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
