import Stripe from 'stripe';
import { env } from './env';

/**
 * Checks whether Stripe test-mode configuration is populated.
 */
export const isStripeConfigured = (): boolean => {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.trim() !== '');
};

/**
 * Instantiates or retrieves the centralized Stripe client in TEST MODE.
 * Strictly prohibits live keys (sk_live_).
 */
export const getStripeClient = (): Stripe => {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured in the server environment');
  }

  if (env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
    throw new Error('Live Stripe credentials are strictly prohibited in Phase 1 Step 2 test mode');
  }

  return new Stripe(env.STRIPE_SECRET_KEY);
};

// Centralized Stripe client instance (null-safe placeholder if unconfigured)
export const stripe: Stripe = isStripeConfigured() && !env.STRIPE_SECRET_KEY.startsWith('sk_live_')
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : (null as unknown as Stripe);
