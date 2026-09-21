import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { ROUTES } from '../../constants/routes';
import { LoadingState } from '../common/LoadingState';

interface SubscriptionRouteProps {
  children?: React.ReactNode;
}

/**
 * Route guard that requires an active, verified subscription.
 *
 * Checks database subscription state via SubscriptionContext:
 *   - Allows access if hasAccess === true (or if user is admin)
 *   - Redirects non-authenticated visitors to login
 *   - Redirects authenticated users without active subscription to /subscription (paywall)
 */
export const SubscriptionRoute: React.FC<SubscriptionRouteProps> = ({ children }) => {
  const { user, loading: authLoading, profile } = useAuth();
  const { hasAccess, loading: subLoading } = useSubscription();
  const location = useLocation();

  if (authLoading || subLoading) {
    return <LoadingState message="Verifying subscription access..." />;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />;
  }

  // Admins bypass subscriber requirements
  if (profile?.role === 'admin') {
    return children ? <>{children}</> : <Outlet />;
  }

  if (!hasAccess) {
    return <Navigate to={ROUTES.SUBSCRIPTION} replace state={{ paywall: true, from: location.pathname }} />;
  }

  return children ? <>{children}</> : <Outlet />;
};
