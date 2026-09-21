import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import type { SubscriptionData, SubscriptionPlanType } from '../types/subscription';
import { SubscriptionContext } from './subscription-context-base';

interface SubscriptionApiResponse {
  success: boolean;
  subscription: SubscriptionData | null;
  hasAccess: boolean;
  message?: string;
  error?: string;
}

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setHasAccess(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.get<SubscriptionApiResponse>('/subscriptions/me');
      if (res.success) {
        const subData = (res.subscription as SubscriptionData | null) ?? null;
        setSubscription(subData);
        // Admin always has access; otherwise rely on DB hasAccess flag
        setHasAccess(profile?.role === 'admin' || Boolean(res.hasAccess));
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string; error?: string };
      console.warn('Could not fetch subscription details:', errObj.message || errObj.error);
      // Admin fallback
      if (profile?.role === 'admin') {
        setHasAccess(true);
      }
    } finally {
      setLoading(false);
    }
  }, [user, profile?.role]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const cancelSubscription = async (): Promise<void> => {
    setError(null);
    try {
      const res = await api.post<{ success: boolean; message?: string; error?: string }>('/subscriptions/cancel');
      if (!res.success) {
        throw new Error(typeof res.error === 'string' ? res.error : 'Failed to cancel subscription.');
      }
      await fetchSubscription();
    } catch (err: unknown) {
      const errRecord = err as Record<string, unknown>;
      const msg =
        typeof errRecord?.error === 'string'
          ? errRecord.error
          : typeof errRecord?.message === 'string'
          ? errRecord.message
          : (err as Error)?.message || 'Cancellation failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const reactivateSubscription = async (): Promise<void> => {
    setError(null);
    try {
      const res = await api.post<{ success: boolean; message?: string; error?: string }>('/subscriptions/reactivate');
      if (!res.success) {
        throw new Error(typeof res.error === 'string' ? res.error : 'Failed to reactivate subscription.');
      }
      await fetchSubscription();
    } catch (err: unknown) {
      const errRecord = err as Record<string, unknown>;
      const msg =
        typeof errRecord?.error === 'string'
          ? errRecord.error
          : typeof errRecord?.message === 'string'
          ? errRecord.message
          : (err as Error)?.message || 'Reactivation failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const renewSubscription = async (plan?: SubscriptionPlanType): Promise<void> => {
    setError(null);
    try {
      const res = await api.post<{ success: boolean; message?: string; error?: string }>('/subscriptions/renew', {
        plan,
      });
      if (!res.success) {
        throw new Error(typeof res.error === 'string' ? res.error : 'Failed to renew subscription.');
      }
      await fetchSubscription();
    } catch (err: unknown) {
      const errRecord = err as Record<string, unknown>;
      const msg =
        typeof errRecord?.error === 'string'
          ? errRecord.error
          : typeof errRecord?.message === 'string'
          ? errRecord.message
          : (err as Error)?.message || 'Renewal failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        hasAccess,
        loading,
        error,
        refreshSubscription: fetchSubscription,
        cancelSubscription,
        reactivateSubscription,
        renewSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
