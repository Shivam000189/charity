import { createContext } from 'react';
import type { SubscriptionPlanId, PlanDetails } from '../types/subscription';

export interface OnboardingContextType {
  selectedPlanId: SubscriptionPlanId | null;
  selectedPlan: PlanDetails | null;
  selectPlan: (planId: SubscriptionPlanId) => void;
  clearSelection: () => void;
}

export const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);
