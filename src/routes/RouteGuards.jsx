import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { normalizeRole } from '../utils/roles';

const RouteLoading = () => (
  <div className="rq-route-loading" role="status" aria-live="polite">
    <span className="rq-route-loading__spinner" aria-hidden="true" />
    <span>Cargando el panel…</span>
  </div>
);

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const RoleProtectedRoute = ({ allowedRoles = ['SUPER'] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = normalizeRole(user.rol);
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
  const hasAccess = normalizedAllowedRoles.includes(userRole)
    || (userRole === 'super_admin' && normalizedAllowedRoles.includes('admin'));

  if (!hasAccess) {
    // Redirect to dashboard or access denied page
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export const PublicRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoading />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
