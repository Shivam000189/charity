import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/auth';

/**
 * Middleware that restricts route access to users possessing one of the allowed roles.
 * Must be executed AFTER requireAuth so that req.user is guaranteed to be populated.
 *
 * @param allowedRoles List of UserRole permitted to access the route
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

/**
 * Convenience authorization helper for admin-only routes.
 */
export const requireAdmin = requireRole('admin');

/**
 * Convenience authorization helper for subscriber-accessible routes (accessible to subscriber and admin).
 */
export const requireSubscriber = requireRole('subscriber', 'admin');
