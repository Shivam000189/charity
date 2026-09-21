import { randomUUID } from 'crypto';
import type {
  PaymentProvider,
  CreateCheckoutParams,
  CheckoutSession,
  ProcessPaymentParams,
  PaymentResult,
  SubscriptionPlan,
} from './payment.provider';
import { getPlanPricing } from './plan-pricing';

/**
 * MockPaymentProvider — Phase 1 Step 3 active payment provider.
 *
 * Simulates a real payment provider entirely within the application.
 * No external API calls. No real money. No real card processing.
 *
 * ─── Card Behavior ───────────────────────────────────────────────────────────
 *   4242 4242 4242 4242  →  SUCCESS (standard test success card)
 *   4000 0000 0000 0002  →  FAILURE (simulates card decline)
 *   Any other 16-digit   →  SUCCESS (permissive mock — all other valid formats pass)
 *
 * ─── Security ────────────────────────────────────────────────────────────────
 *   Card details are NEVER stored, logged, or persisted anywhere.
 *   Only the stripped digit-count is validated; no card data leaves this method.
 *
 * ─── Idempotency ─────────────────────────────────────────────────────────────
 *   Sessions are single-use. A successful payment deletes the session,
 *   preventing the same sessionId from being used twice.
 *
 * ─── Future ──────────────────────────────────────────────────────────────────
 *   To switch to Stripe: replace the export in ./index.ts with StripePaymentProvider.
 *   See docs/subscription.md for migration instructions.
 */
export class MockPaymentProvider implements PaymentProvider {
  private readonly PROVIDER_NAME = 'mock' as const;

  /** Decline card number (digits only) */
  private readonly DECLINE_CARD = '4000000000000002';

  /**
   * In-memory session store.
   * Maps sessionId → { userId, plan }
   * Persists for the lifetime of the Node.js process.
   */
  private readonly sessions = new Map<
    string,
    { userId: string; plan: SubscriptionPlan }
  >();

  // ─── createCheckout ────────────────────────────────────────────────────────

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession> {
    const pricing = getPlanPricing(params.plan);
    const sessionId = `mock_session_${randomUUID().replace(/-/g, '')}`;

    // Store session: used to validate ownership and plan in processPayment
    this.sessions.set(sessionId, {
      userId: params.userId,
      plan: params.plan,
    });

    return {
      sessionId,
      plan: params.plan,
      amountInPaise: pricing.amountInPaise,
      currency: pricing.currency,
      displayAmount: pricing.displayPrice,
      provider: this.PROVIDER_NAME,
    };
  }

  // ─── processPayment ────────────────────────────────────────────────────────

  async processPayment(params: ProcessPaymentParams): Promise<PaymentResult> {
    // 1. Validate session exists
    const session = this.sessions.get(params.sessionId);
    if (!session) {
      return {
        status: 'failed',
        provider: this.PROVIDER_NAME,
        failureReason: 'Invalid or expired checkout session.',
      };
    }

    // 2. Verify session belongs to the authenticated user
    if (session.userId !== params.userId) {
      return {
        status: 'failed',
        provider: this.PROVIDER_NAME,
        failureReason: 'Checkout session does not belong to the authenticated user.',
      };
    }

    // 3. Verify plan matches session
    if (session.plan !== params.plan) {
      return {
        status: 'failed',
        provider: this.PROVIDER_NAME,
        failureReason: 'Plan mismatch between checkout session and payment request.',
      };
    }

    // 4. Validate card format — strip spaces, check digit-only, 16 digits
    //    IMPORTANT: Card value is NOT logged anywhere.
    const normalizedCard = params.cardNumber.replace(/\D/g, '');
    if (normalizedCard.length !== 16) {
      return {
        status: 'failed',
        provider: this.PROVIDER_NAME,
        failureReason: 'Invalid card number. Please enter a valid 16-digit card number.',
      };
    }

    // 5. Deterministic decline simulation
    if (normalizedCard === this.DECLINE_CARD) {
      // Do NOT consume the session on decline — allow user to retry with a different card
      return {
        status: 'failed',
        provider: this.PROVIDER_NAME,
        failureReason: 'Your card was declined. Please try a different card.',
      };
    }

    // 6. Validate expiry format
    const month = parseInt(params.expiryMonth, 10);
    const year = parseInt(params.expiryYear, 10);
    if (isNaN(month) || month < 1 || month > 12) {
      return {
        status: 'failed',
        provider: this.PROVIDER_NAME,
        failureReason: 'Invalid expiry month.',
      };
    }
    if (isNaN(year) || year < new Date().getFullYear()) {
      return {
        status: 'failed',
        provider: this.PROVIDER_NAME,
        failureReason: 'Invalid expiry year.',
      };
    }

    // 7. Payment succeeds — consume session (single-use idempotency)
    this.sessions.delete(params.sessionId);

    const transactionId = `mock_txn_${randomUUID().replace(/-/g, '')}`;

    return {
      status: 'completed',
      provider: this.PROVIDER_NAME,
      transactionId,
    };
  }

  // ─── Test helpers (not part of PaymentProvider interface) ─────────────────

  /** Returns true if a session with the given ID exists (for testing). */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /** Clears all sessions (for testing isolation). */
  clearSessions(): void {
    this.sessions.clear();
  }

  /** Returns the number of active sessions (for testing). */
  sessionCount(): number {
    return this.sessions.size;
  }
}
