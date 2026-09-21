import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/auth';
import { ROUTES } from '../../constants/routes';
import { LoadingState } from '../common/LoadingState';

interface RoleRouteProps {
  allowedRoles: UserRole[];
  children?: React.ReactNode;
}

/**
 * Route guard restricting access to authenticated users with specified roles.
 *
 * NOTE: Frontend route guards provide UX redirection.
 * Authoritative security is enforced at the backend API via RBAC middleware.
 */
export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState message="Verifying authorization permissions..." />;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />;
  }

  const currentRole: UserRole = profile?.role || 'visitor';

  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
