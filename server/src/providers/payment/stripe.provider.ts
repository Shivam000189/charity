/**
 * StripePaymentProvider — Future Integration Shell
 *
 * @future PHASE 1 STEP 5+ — Activate when switching from MockPaymentProvider to real Stripe.
 *
 * To enable Stripe:
 *   1. Set PAYMENT_PROVIDER=stripe in server/.env
 *   2. Configure STRIPE_SECRET_KEY (sk_test_* in development, sk_live_* in production)
 *   3. Configure STRIPE_MONTHLY_PRICE_ID, STRIPE_YEARLY_PRICE_ID
 *   4. Replace MockPaymentProvider export in ./index.ts with StripePaymentProvider
 *   5. Implement createCheckout() and processPayment() below using stripe.service.ts
 *   6. See docs/subscription.md for full Stripe migration guide
 *
 * Current active provider: MockPaymentProvider
 * Stripe configuration in server/.env.example is preserved for future use.
 */

import type {
  PaymentProvider,
  CreateCheckoutParams,
  CheckoutSession,
  ProcessPaymentParams,
  PaymentResult,
} from './payment.provider';

export class StripePaymentProvider implements PaymentProvider {
  async createCheckout(_params: CreateCheckoutParams): Promise<CheckoutSession> {
    throw new Error(
      'StripePaymentProvider is not yet active. ' +
      'Current provider: MockPaymentProvider. ' +
      'See docs/subscription.md for Stripe migration instructions.'
    );
  }

  async processPayment(_params: ProcessPaymentParams): Promise<PaymentResult> {
    throw new Error(
      'StripePaymentProvider is not yet active. ' +
      'Current provider: MockPaymentProvider. ' +
      'See docs/subscription.md for Stripe migration instructions.'
    );
  }
}
