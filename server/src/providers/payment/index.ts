/**
 * Active Payment Provider — Phase 1 Step 3
 *
 * Current:  MockPaymentProvider  (no real Stripe API calls)
 * Future:   StripePaymentProvider (see docs/subscription.md)
 *
 * To switch providers:
 *   1. Import StripePaymentProvider instead of MockPaymentProvider
 *   2. Replace `new MockPaymentProvider()` with `new StripePaymentProvider()`
 *   3. Ensure all Stripe env vars are configured
 *
 * IMPORTANT: Stripe is NOT called during any part of the current payment flow.
 */

import type { PaymentProvider } from './payment.provider';
import { MockPaymentProvider } from './mock.provider';
// import { StripePaymentProvider } from './stripe.provider'; // @future

/**
 * Singleton payment provider instance.
 * The MockPaymentProvider session map persists across requests in the same process.
 */
export const paymentProvider: PaymentProvider = new MockPaymentProvider();

// Re-export types for convenience
export type { PaymentProvider, CheckoutSession, PaymentResult } from './payment.provider';
export type { SubscriptionPlan } from './payment.provider';
export type { DbPlan } from './plan-pricing';
export { PLAN_PRICING, getPlanPricing, mapPlanToDb, calculateExpiresAt } from './plan-pricing';
