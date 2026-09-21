/**
 * Subscription Plan Types & Definitions for Digital Hero
 *
 * DEMO PRICING: Prices below are for development/testing only.
 * Update displayPrice values to match actual business pricing before production.
 */

export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionPlanId = SubscriptionPlan;

export interface PlanDetails {
  id: SubscriptionPlanId;
  name: string;
  billingInterval: string;
  displayPrice: string;
  description: string;
  features: string[];
}

/** Demo pricing — matches backend PLAN_PRICING in plan-pricing.ts */
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, PlanDetails> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly Plan',
    billingInterval: 'Billed monthly',
    displayPrice: '₹499 / month',          // DEMO — update before production
    description: 'Flexible month-to-month access to all subscriber draws, challenges, and charity impact.',
    features: [
      'Full access to all subscriber draws',
      'Daily challenge participation & score recording',
      'Direct charity contribution tracking',
      'Cancel anytime',
    ],
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly Plan',
    billingInterval: 'Billed yearly',
    displayPrice: '₹4,999 / year',         // DEMO — update before production
    description: 'Annual subscriber membership with uninterrupted draw entries and maximum community support.',
    features: [
      'All Monthly Plan benefits included',
      'Uninterrupted year-round draw entries',
      'Continuous daily challenge streak tracking',
      'Priority support and community hero badge',
    ],
  },
};
