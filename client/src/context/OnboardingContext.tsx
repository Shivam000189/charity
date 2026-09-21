import React, { useState, useMemo } from 'react';
import type { SubscriptionPlanId } from '../types/subscription';
import { SUBSCRIPTION_PLANS } from '../types/subscription';
import { OnboardingContext } from './onboarding-context-base';

const STORAGE_KEY = 'digital_hero_onboarding_plan';

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === 'monthly' || stored === 'yearly') {
        return stored;
      }
    } catch {
      // Ignore storage errors (e.g. cookies disabled)
    }
    return null;
  });

  const selectPlan = (planId: SubscriptionPlanId) => {
    setSelectedPlanId(planId);
    try {
      sessionStorage.setItem(STORAGE_KEY, planId);
    } catch {
      // Ignore storage errors
    }
  };

  const clearSelection = () => {
    setSelectedPlanId(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const selectedPlan = useMemo(() => {
    return selectedPlanId ? SUBSCRIPTION_PLANS[selectedPlanId] : null;
  }, [selectedPlanId]);

  return (
    <OnboardingContext.Provider value={{ selectedPlanId, selectedPlan, selectPlan, clearSelection }}>
      {children}
    </OnboardingContext.Provider>
  );
};
