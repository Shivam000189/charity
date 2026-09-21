import Stripe from 'stripe';
import { env } from '../config/env';
import { getStripeClient, isStripeConfigured } from '../config/stripe';

export type SubscriptionPlan = 'monthly' | 'yearly';

export interface CreateCheckoutSessionParams {
  userId: string;
  userEmail?: string;
  userName?: string;
  plan: SubscriptionPlan;
}

export interface CheckoutSessionResult {
  url: string;
  sessionId: string;
}

/**
 * Maps allowed subscription plan names to backend environment-configured Stripe Price IDs.
 * Rejects arbitrary price IDs.
 */
export const getPriceIdForPlan = (plan: SubscriptionPlan): string => {
  if (plan === 'monthly') {
    const priceId = env.STRIPE_MONTHLY_PRICE_ID;
    if (!priceId || priceId.trim() === '') {
      throw new Error('STRIPE_MONTHLY_PRICE_ID is not configured in server environment');
    }
    return priceId;
  }

  if (plan === 'yearly') {
    const priceId = env.STRIPE_YEARLY_PRICE_ID;
    if (!priceId || priceId.trim() === '') {
      throw new Error('STRIPE_YEARLY_PRICE_ID is not configured in server environment');
    }
    return priceId;
  }

  throw new Error(`Invalid plan: "${plan}". Allowed plans are "monthly" or "yearly"`);
};

/**
 * Creates a Stripe Checkout Session configured for subscription mode in TEST MODE.
 * Associates the session and subscription with the authenticated application user.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
  customStripe?: Stripe
): Promise<CheckoutSessionResult> {
  // Validate plan & obtain price ID
  const priceId = getPriceIdForPlan(params.plan);

  // Obtain Stripe client
  const client = customStripe || getStripeClient();
  if (!client) {
    throw new Error('Stripe client is uninitialized. Verify STRIPE_SECRET_KEY in server environment.');
  }

  // Stripe Customer Association Strategy:
  // Lookup existing customer by trusted email, or create a new customer with userId metadata.
  let customerId: string | undefined;
  if (params.userEmail) {
    try {
      const existingCustomers = await client.customers.list({
        email: params.userEmail,
        limit: 1,
      });

      if (existingCustomers.data && existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const newCustomer = await client.customers.create({
          email: params.userEmail,
          name: params.userName || undefined,
          metadata: {
            userId: params.userId,
          },
        });
        customerId = newCustomer.id;
      }
    } catch (err: unknown) {
      // Non-fatal fallback: proceed without pre-created customer ID and let Stripe Checkout handle email
      console.warn('Customer lookup/creation fallback:', (err as Error).message);
    }
  }

  // Create Checkout Session
  const session = await client.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: customerId,
    customer_email: customerId ? undefined : params.userEmail,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      userId: params.userId,
      plan: params.plan,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
        plan: params.plan,
      },
    },
    success_url: `${env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: env.STRIPE_CANCEL_URL,
  });

  if (!session.url) {
    throw new Error('Stripe failed to return a checkout URL for the session');
  }

  return {
    url: session.url,
    sessionId: session.id,
  };
}
