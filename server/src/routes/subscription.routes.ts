import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  createCheckoutSessionHandler,
  processPaymentHandler,
} from '../controllers/subscription.controller';

const router = Router();

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

export default router;
