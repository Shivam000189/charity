/**
 * Subscription Controller — Phase 1 Step 3
 *
 * Routes:
 *   POST /api/subscriptions/checkout  → createCheckoutSessionHandler  (creates mock session)
 *   POST /api/subscriptions/pay       → processPaymentHandler          (processes mock payment)
 *
 * Payment provider: MockPaymentProvider (Stripe is NOT called)
 * User identity:    always derived from req.user (set by requireAuth middleware)
 *
 * SECURITY:
 *   - Backend determines the price — never trusted from the client
 *   - Card details are passed to the provider but NEVER logged or stored
 *   - User ID comes from req.user, never from the request body
 */

import { Request, Response } from 'express';
import '../types/auth'; // loads Express Request augmentation (req.user)
import { paymentProvider } from '../providers/payment';
import { mapPlanToDb, calculateExpiresAt } from '../providers/payment/plan-pricing';
import {
  createOrUpdateSubscription,
  getUserSubscription,
  hasActiveSubscription,
  cancelSubscription,
  reactivateSubscription,
  renewSubscription,
  markLapsedSubscriptions,
  applyPendingRenewalStatus,
} from '../services/subscription.service';
import type { SubscriptionPlan } from '../providers/payment/payment.provider';

// ─── Validation ───────────────────────────────────────────────────────────────

const ALLOWED_PLANS: SubscriptionPlan[] = ['monthly', 'yearly'];

function isValidPlan(plan: unknown): plan is SubscriptionPlan {
  return typeof plan === 'string' && ALLOWED_PLANS.includes(plan.trim().toLowerCase() as SubscriptionPlan);
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/subscriptions/checkout
 *
 * Creates a mock checkout session for the authenticated user.
 * Returns session ID + pricing info for the mock checkout UI.
 * Does NOT redirect to Stripe.
 */
export const createCheckoutSessionHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Authentication guard
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        error: 'Authentication required to create a checkout session.',
      });
      return;
    }

    // 2. Plan validation
    const rawPlan = (req.body as Record<string, unknown>)?.plan;
    if (!rawPlan || typeof rawPlan !== 'string') {
      res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Subscription plan is required.',
      });
      return;
    }

    const plan = rawPlan.trim().toLowerCase();
    if (!isValidPlan(plan)) {
      res.status(400).json({
        success: false,
        code: 'INVALID_PLAN',
        error: "Invalid plan. Allowed plans are 'monthly' or 'yearly'.",
      });
      return;
    }

    // 3. Create checkout session via active payment provider (MockPaymentProvider)
    const session = await paymentProvider.createCheckout({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      plan,
    });

    res.status(200).json({
      success: true,
      sessionId: session.sessionId,
      plan: session.plan,
      displayAmount: session.displayAmount,
      currency: session.currency,
      provider: session.provider,
    });
  } catch (err: unknown) {
    console.error('[Subscription] createCheckout error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'CHECKOUT_CREATION_FAILED',
      error: 'An error occurred while creating your checkout session. Please try again.',
    });
  }
};

/**
 * POST /api/subscriptions/pay
 *
 * Processes a mock payment and synchronizes the subscription into public.subscriptions.
 *
 * Expected body:
 *   { sessionId, plan, cardNumber, expiryMonth, expiryYear, cvv, cardholderName }
 *
 * SECURITY:
 *   - Card values are passed to the provider only; NEVER logged here
 *   - The backend determines plan price; client-supplied amounts are ignored
 *   - User ID comes from req.user (requireAuth), not from the request body
 */
export const processPaymentHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Authentication guard
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        error: 'Authentication required to process payment.',
      });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;

    // 2. Required field validation
    const { sessionId, plan: rawPlan, cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = body;

    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'sessionId is required.',
      });
      return;
    }

    if (!rawPlan || typeof rawPlan !== 'string') {
      res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'plan is required.',
      });
      return;
    }

    const plan = (rawPlan as string).trim().toLowerCase();
    if (!isValidPlan(plan)) {
      res.status(400).json({
        success: false,
        code: 'INVALID_PLAN',
        error: "Invalid plan. Allowed plans are 'monthly' or 'yearly'.",
      });
      return;
    }

    // Validate card fields are present (format is validated inside the provider)
    if (!cardNumber || typeof cardNumber !== 'string') {
      res.status(400).json({ success: false, code: 'VALIDATION_ERROR', error: 'cardNumber is required.' });
      return;
    }
    if (!expiryMonth || typeof expiryMonth !== 'string') {
      res.status(400).json({ success: false, code: 'VALIDATION_ERROR', error: 'expiryMonth is required.' });
      return;
    }
    if (!expiryYear || typeof expiryYear !== 'string') {
      res.status(400).json({ success: false, code: 'VALIDATION_ERROR', error: 'expiryYear is required.' });
      return;
    }
    if (!cvv || typeof cvv !== 'string') {
      res.status(400).json({ success: false, code: 'VALIDATION_ERROR', error: 'cvv is required.' });
      return;
    }
    if (!cardholderName || typeof cardholderName !== 'string' || (cardholderName as string).trim() === '') {
      res.status(400).json({ success: false, code: 'VALIDATION_ERROR', error: 'cardholderName is required.' });
      return;
    }

    // 3. Process payment via active provider (MockPaymentProvider)
    //    IMPORTANT: Card details are passed through but NEVER logged
    const paymentResult = await paymentProvider.processPayment({
      sessionId: sessionId.trim(),
      userId: user.id,
      plan,
      cardNumber: cardNumber as string,
      expiryMonth: expiryMonth as string,
      expiryYear: expiryYear as string,
      cvv: cvv as string,
      cardholderName: (cardholderName as string).trim(),
    });

    // 4. Handle payment failure
    if (paymentResult.status === 'failed') {
      res.status(402).json({
        success: false,
        code: 'PAYMENT_FAILED',
        message: paymentResult.failureReason || 'Payment failed. Please try again.',
        payment: {
          status: 'failed',
          provider: paymentResult.provider,
        },
      });
      return;
    }

    // 5. Payment succeeded — create/update subscription in Supabase
    const startedAt = new Date();
    const expiresAt = calculateExpiresAt(startedAt, plan);
    const dbPlan = mapPlanToDb(plan);

    const subscription = await createOrUpdateSubscription({
      userId: user.id,
      dbPlan,
      status: 'active',
      startedAt,
      expiresAt,
    });

    // 6. Return success — safe fields only (no card data, no internal IDs from payment)
    res.status(200).json({
      success: true,
      payment: {
        status: 'completed',
        provider: paymentResult.provider,
        transactionId: paymentResult.transactionId,
      },
      subscription: {
        id: subscription.id,
        plan: plan,              // Return API plan name (e.g. 'yearly', not 'annual')
        dbPlan: subscription.plan,
        status: subscription.status,
        startedAt: subscription.startedAt,
        expiresAt: subscription.expiresAt,
      },
    });
  } catch (err: unknown) {
    console.error('[Subscription] processPayment error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'PAYMENT_PROCESSING_FAILED',
      error: 'An error occurred while processing your payment. Please try again.',
    });
  }
};

/**
 * GET /api/subscriptions/me
 *
 * Retrieves the current authenticated user's subscription details and access status.
 */
export const getMySubscriptionHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        error: 'Authentication required.',
      });
      return;
    }

    // Refresh pending renewal window status lazily if applicable
    await applyPendingRenewalStatus(user.id);

    const subscription = await getUserSubscription(user.id);
    const hasAccess = await hasActiveSubscription(user.id);

    if (!subscription) {
      res.status(200).json({
        success: true,
        subscription: null,
        hasAccess: user.role === 'admin',
      });
      return;
    }

    res.status(200).json({
      success: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan === 'annual' ? 'yearly' : 'monthly',
        dbPlan: subscription.plan,
        status: subscription.status,
        startedAt: subscription.startedAt,
        expiresAt: subscription.expiresAt,
        cancelledAt: subscription.cancelledAt,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      },
      hasAccess: hasAccess || user.role === 'admin',
    });
  } catch (err: unknown) {
    console.error('[Subscription] getMySubscription error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'FETCH_FAILED',
      error: 'Failed to retrieve subscription information.',
    });
  }
};

/**
 * POST /api/subscriptions/cancel
 *
 * Cancels user's subscription at period end (sets status='cancelled', preserves expires_at).
 */
export const cancelSubscriptionHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        error: 'Authentication required.',
      });
      return;
    }

    const cancelledSub = await cancelSubscription(user.id);

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully. Access remains active until the end of your billing period.',
      subscription: {
        id: cancelledSub.id,
        plan: cancelledSub.plan === 'annual' ? 'yearly' : 'monthly',
        status: cancelledSub.status,
        expiresAt: cancelledSub.expiresAt,
        cancelledAt: cancelledSub.cancelledAt,
      },
      hasAccess: true,
    });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    console.error('[Subscription] cancelSubscription error:', msg);
    res.status(400).json({
      success: false,
      code: 'CANCEL_FAILED',
      error: msg || 'Failed to cancel subscription.',
    });
  }
};

/**
 * POST /api/subscriptions/reactivate
 *
 * Reactivates a cancelled subscription before expires_at has passed.
 */
export const reactivateSubscriptionHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        error: 'Authentication required.',
      });
      return;
    }

    const reactivatedSub = await reactivateSubscription(user.id);

    res.status(200).json({
      success: true,
      message: 'Subscription reactivated successfully.',
      subscription: {
        id: reactivatedSub.id,
        plan: reactivatedSub.plan === 'annual' ? 'yearly' : 'monthly',
        status: reactivatedSub.status,
        expiresAt: reactivatedSub.expiresAt,
      },
      hasAccess: true,
    });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    console.error('[Subscription] reactivateSubscription error:', msg);
    res.status(400).json({
      success: false,
      code: 'REACTIVATION_FAILED',
      error: msg || 'Failed to reactivate subscription.',
    });
  }
};

/**
 * POST /api/subscriptions/renew
 *
 * Renews an existing subscription, extending expires_at.
 */
export const renewSubscriptionHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        error: 'Authentication required.',
      });
      return;
    }

    const body = (req.body || {}) as { plan?: string };
    const plan = body.plan && isValidPlan(body.plan) ? body.plan : undefined;

    const renewedSub = await renewSubscription(user.id, plan);

    res.status(200).json({
      success: true,
      message: 'Subscription renewed successfully.',
      subscription: {
        id: renewedSub.id,
        plan: renewedSub.plan === 'annual' ? 'yearly' : 'monthly',
        status: renewedSub.status,
        expiresAt: renewedSub.expiresAt,
      },
      hasAccess: true,
    });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    console.error('[Subscription] renewSubscription error:', msg);
    res.status(400).json({
      success: false,
      code: 'RENEWAL_FAILED',
      error: msg || 'Failed to renew subscription.',
    });
  }
};

/**
 * POST /api/subscriptions/admin/mark-lapsed
 *
 * Admin trigger to scan and mark expired subscriptions as lapsed.
 */
export const markLapsedHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const lapsedCount = await markLapsedSubscriptions();
    res.status(200).json({
      success: true,
      message: `Marked ${lapsedCount} subscriptions as lapsed.`,
      lapsedCount,
    });
  } catch (err: unknown) {
    console.error('[Subscription] markLapsed error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'MARK_LAPSED_FAILED',
      error: 'Failed to mark lapsed subscriptions.',
    });
  }
};

