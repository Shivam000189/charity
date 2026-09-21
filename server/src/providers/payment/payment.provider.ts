/**
 * PaymentProvider — abstract interface for all payment provider implementations.
 *
 * Current active provider:  MockPaymentProvider   (Phase 1 Step 3)
 * Future provider:          StripePaymentProvider (Phase 1 Step 5+)
 *
 * Swapping providers requires only changing the export in ./index.ts.
 * Subscription business logic in SubscriptionService is provider-independent.
 */

export type SubscriptionPlan = 'monthly' | 'yearly';

// ─── Checkout ────────────────────────────────────────────────────────────────

export interface CreateCheckoutParams {
  userId: string;
  plan: SubscriptionPlan;
  userEmail?: string;
  userName?: string;
}

export interface CheckoutSession {
  sessionId: string;
  plan: SubscriptionPlan;
  amountInPaise: number;
  currency: string;
  displayAmount: string;
  provider: string;
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export interface ProcessPaymentParams {
  sessionId: string;
  userId: string;
  plan: SubscriptionPlan;
  /**
   * Mock card fields.
   * IMPORTANT: These values must NEVER be logged, stored, or persisted.
   * The provider validates format only; no real card processing occurs.
   */
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
}

export type PaymentStatus = 'completed' | 'failed';

export interface PaymentResult {
  status: PaymentStatus;
  provider: string;
  /** Only present on success */
  transactionId?: string;
  /** Only present on failure */
  failureReason?: string;
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface PaymentProvider {
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession>;
  processPayment(params: ProcessPaymentParams): Promise<PaymentResult>;
}
