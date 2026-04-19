import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import type { UserRole } from '@/shared/types';

interface Props {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function RequireAuth({ children, roles }: Props) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return (
      <Navigate
        to={`/login?next=${next}&error=role`}
        state={{ from: location }}
        replace
      />
    );
  }

  return <>{children}</>;
}
