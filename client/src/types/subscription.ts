export type SubscriptionPlanId = 'monthly' | 'yearly';
export type SubscriptionPlanType = SubscriptionPlanId;

export type SubscriptionStatusType =
  | 'pending'
  | 'active'
  | 'pending_renewal'
  | 'cancelled'
  | 'lapsed'
  | 'expired';

export interface PlanDetails {
  id: SubscriptionPlanId;
  name: string;
  price: string;
  interval: string;
  displayPrice: string;
  billingInterval: string;
  description: string;
  features: string[];
  recommended?: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, PlanDetails> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly Hero',
    price: '₹499',
    interval: '/ month',
    displayPrice: '₹499 / month',
    billingInterval: 'Billed monthly',
    description: 'Flexible monthly subscription with complete lottery access and community contributions.',
    features: [
      'Unlimited entry to all daily community draws',
      'Daily puzzle and leaderboard score multiplier',
      'Direct revenue allocation to verified charity partners',
      'Instant payout eligibility for verified winnings',
      'Cancel anytime with access active until month end',
    ],
  },
  yearly: {
    id: 'yearly',
    name: 'Annual Champion',
    price: '₹4,999',
    interval: '/ year',
    displayPrice: '₹4,999 / year',
    billingInterval: 'Billed yearly (save ~17%)',
    description: 'Year-round access at a 17% discounted annual rate with maximum community impact.',
    recommended: true,
    features: [
      'Everything included in the Monthly Hero plan',
      'Save ₹989 compared to monthly billing (~17% discount)',
      'Guaranteed bonus entries into milestone mega-draws',
      'VIP recognition badge on community leaderboards',
      'Dedicated priority payout and donor support channel',
    ],
  },
};

export interface SubscriptionData {
  id: string;
  plan: SubscriptionPlanType;
  dbPlan: 'monthly' | 'annual';
  status: SubscriptionStatusType;
  startedAt: string;
  expiresAt: string;
  cancelledAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  hasAccess: boolean;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  renewSubscription: (plan?: SubscriptionPlanType) => Promise<void>;
}
