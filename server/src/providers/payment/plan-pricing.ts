/**
 * Plan Pricing Configuration — Digital Hero
 *
 * DEMO PRICING: These prices are for development/testing purposes only.
 * Replace with actual business pricing before production launch.
 *
 * Current provider: MockPaymentProvider
 * Pricing is backend-authoritative — the frontend NEVER determines price.
 */

import type { SubscriptionPlan } from './payment.provider';

/** Database column value for plan (NOT the same as SubscriptionPlan) */
export type DbPlan = 'monthly' | 'annual';

export interface PlanPrice {
  plan: SubscriptionPlan;
  /** Value stored in public.subscriptions.plan column */
  dbPlan: DbPlan;
  /** Amount in the smallest currency unit (paise for INR) */
  amountInPaise: number;
  currency: 'INR';
  displayPrice: string;
  displayInterval: string;
}

/**
 * Centralized plan pricing.
 * Backend is the single source of truth — frontend derives display from here via the /checkout response.
 *
 * DEMO PRICING — update before go-live.
 */
export const PLAN_PRICING: Record<SubscriptionPlan, PlanPrice> = {
  monthly: {
    plan: 'monthly',
    dbPlan: 'monthly',
    amountInPaise: 49900,       // ₹499
    currency: 'INR',
    displayPrice: '₹499 / month',
    displayInterval: 'Billed monthly',
  },
  yearly: {
    plan: 'yearly',
    dbPlan: 'annual',           // maps 'yearly' → 'annual' (DB column constraint)
    amountInPaise: 499900,      // ₹4,999
    currency: 'INR',
    displayPrice: '₹4,999 / year',
    displayInterval: 'Billed yearly (save ~17%)',
  },
};

/**
 * Returns the pricing configuration for a given plan.
 * Throws for any unrecognized plan — rejects arbitrary values from clients.
 */
export function getPlanPricing(plan: SubscriptionPlan): PlanPrice {
  const pricing = PLAN_PRICING[plan];
  if (!pricing) {
    throw new Error(
      `Invalid plan: "${plan}". Allowed plans are "monthly" or "yearly".`
    );
  }
  return pricing;
}

/**
 * Maps the API-facing plan identifier to the database column value.
 * 'monthly' → 'monthly'
 * 'yearly'  → 'annual'
 */
export function mapPlanToDb(plan: SubscriptionPlan): DbPlan {
  return getPlanPricing(plan).dbPlan;
}

/**
 * Calculates expires_at using proper calendar date arithmetic.
 *
 * monthly → startedAt + 1 calendar month  (via Date.setMonth)
 * yearly  → startedAt + 1 calendar year   (via Date.setFullYear)
 *
 * Does NOT approximate months as fixed day counts.
 */
export function calculateExpiresAt(startedAt: Date, plan: SubscriptionPlan): Date {
  const expires = new Date(startedAt);
  if (plan === 'monthly') {
    expires.setMonth(expires.getMonth() + 1);
  } else {
    // yearly
    expires.setFullYear(expires.getFullYear() + 1);
  }
  return expires;
}

/**
 * Calculates expires_at from a DbPlan value (for use by webhook.service after Stripe sync).
 * 'monthly' → +1 month, 'annual' → +1 year
 */
export function calculateExpiresAtFromDbPlan(startedAt: Date, dbPlan: DbPlan): Date {
  const expires = new Date(startedAt);
  if (dbPlan === 'monthly') {
    expires.setMonth(expires.getMonth() + 1);
  } else {
    expires.setFullYear(expires.getFullYear() + 1);
  }
  return expires;
}
