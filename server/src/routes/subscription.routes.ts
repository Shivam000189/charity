import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import {
  createCheckoutSessionHandler,
  processPaymentHandler,
  getMySubscriptionHandler,
  cancelSubscriptionHandler,
  reactivateSubscriptionHandler,
  renewSubscriptionHandler,
  markLapsedHandler,
} from '../controllers/subscription.controller';

const router = Router();

/**
 * GET /api/subscriptions/me
 * Retrieves active subscription details and authorization status for current user.
 */
router.get('/me', requireAuth, getMySubscriptionHandler);

/**
 * POST /api/subscriptions/checkout
 * Creates a mock checkout session for the authenticated user.
 * Returns session ID + pricing info — does NOT redirect to Stripe.
 *
 * Provider: MockPaymentProvider (Phase 1 Step 3)
 */
router.post('/checkout', requireAuth, createCheckoutSessionHandler);

/**
 * POST /api/subscriptions/pay
 * Processes a mock payment and synchronizes the subscription into public.subscriptions.
 * Requires: { sessionId, plan, cardNumber, expiryMonth, expiryYear, cvv, cardholderName }
 *
 * Provider: MockPaymentProvider (Phase 1 Step 3)
 * Card data: validated by provider only — never stored or logged.
 */
router.post('/pay', requireAuth, processPaymentHandler);

/**
 * POST /api/subscriptions/cancel
 * Cancels active subscription at billing period end.
 */
router.post('/cancel', requireAuth, cancelSubscriptionHandler);

/**
 * POST /api/subscriptions/reactivate
 * Reactivates a cancelled subscription before expiration.
 */
router.post('/reactivate', requireAuth, reactivateSubscriptionHandler);

/**
 * POST /api/subscriptions/renew
 * Renews subscription, extending expiration.
 */
router.post('/renew', requireAuth, renewSubscriptionHandler);

/**
 * POST /api/subscriptions/admin/mark-lapsed
 * Admin-only operation to sweep and mark expired subscriptions as lapsed.
 */
router.post('/admin/mark-lapsed', requireAuth, requireAdmin, markLapsedHandler);

export default router;
