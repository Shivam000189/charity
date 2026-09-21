import { useContext } from 'react';
import { SubscriptionContext } from '../context/subscription-context-base';
import type { SubscriptionContextType } from '../types/subscription';

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
