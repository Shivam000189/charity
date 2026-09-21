import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/auth';

interface RoleGateProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * UI Component for conditionally rendering content based on the authenticated user's role.
 *
 * NOTE: Frontend checks are strictly for UI personalization.
 * Real security and authorization are strictly enforced by the backend Express middleware.
 */
export const RoleGate: React.FC<RoleGateProps> = ({
  allowedRoles,
  children,
  fallback = null,
}) => {
  const { profile } = useAuth();
  const currentRole: UserRole = profile?.role || 'visitor';

  if (!allowedRoles.includes(currentRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
