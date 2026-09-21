import { Request, Response, NextFunction } from 'express';
import { hasActiveSubscription } from '../services/subscription.service';
import '../types/auth';

/**
 * Middleware that restricts route access to verified active subscribers (or admins).
 *
 * Checks database state in public.subscriptions (NOT user.role):
 *   - Allows access if hasActiveSubscription(user.id) is true
 *   - Allows admin users (user.role === 'admin') without requiring a subscription
 *   - Blocks visitors, lapsed, expired, or non-subscribers with HTTP 403 SUBSCRIPTION_REQUIRED
 *
 * Must be mounted AFTER requireAuth so that req.user is guaranteed to exist.
 */
export const requireSubscriber = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    });
    return;
  }

  // Admins bypass subscription requirements
  if (req.user.role === 'admin') {
    return next();
  }

  try {
    const isSubscribed = await hasActiveSubscription(req.user.id);
    if (!isSubscribed) {
      res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Active subscription required to access this resource.',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Subscription access check error:', (error as Error).message);
    res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Failed to verify subscription status.',
    });
  }
};
