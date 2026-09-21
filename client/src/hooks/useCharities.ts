import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type {
  Charity,
  SubscriptionCharityPreference,
  Donation,
  CharityApiResponse,
} from '../types/charity';

export function useCharities(initialCategory?: string) {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCharities = useCallback(
    async (filters: { search?: string; category?: string } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (filters.search && filters.search.trim()) {
          params.search = filters.search.trim();
        }
        if (filters.category && filters.category !== 'All') {
          params.category = filters.category;
        }

        const res = await api.get<CharityApiResponse>('/api/charities', { params });
        if (res.charities) {
          setCharities(res.charities);
        }
      } catch (err: any) {
        console.error('Failed to fetch charities:', err);
        setError(err?.message || 'Failed to load charities. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCharities({ category: initialCategory });
  }, [fetchCharities, initialCategory]);

  const getCharityById = async (id: string): Promise<Charity | null> => {
    try {
      const res = await api.get<CharityApiResponse>(`/api/charities/${id}`);
      return res.charity || null;
    } catch (err) {
      console.error(`Failed to fetch charity ${id}:`, err);
      return null;
    }
  };

  const getFeatured = async (): Promise<Charity[]> => {
    try {
      const res = await api.get<CharityApiResponse>('/api/charities/featured');
      return res.charities || [];
    } catch (err) {
      console.error('Failed to fetch featured charities:', err);
      return [];
    }
  };

  const donate = async (
    charityId: string,
    amount: number,
    donorName?: string,
    message?: string
  ): Promise<{ success: boolean; donation?: Donation; error?: string }> => {
    try {
      const res = await api.post<CharityApiResponse>('/api/donations', {
        charityId,
        amount,
        donorName,
        message,
      });
      return { success: true, donation: res.donation };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to initiate donation.' };
    }
  };

  const confirmDonationPayment = async (
    donationId: string,
    cardNumber?: string
  ): Promise<{ success: boolean; donation?: Donation; error?: string }> => {
    try {
      const res = await api.post<CharityApiResponse>(`/api/donations/${donationId}/confirm`, {
        cardNumber,
      });
      return { success: true, donation: res.donation };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Payment confirmation failed.' };
    }
  };

  const getPreference = async (): Promise<SubscriptionCharityPreference | null> => {
    try {
      const res = await api.get<CharityApiResponse>('/api/subscriptions/charity');
      return res.preference || null;
    } catch (err) {
      console.error('Failed to get charity preference:', err);
      return null;
    }
  };

  const updatePreference = async (
    charityId: string,
    contributionPercentage: number
  ): Promise<{ success: boolean; preference?: SubscriptionCharityPreference; error?: string }> => {
    try {
      const res = await api.put<CharityApiResponse>('/api/subscriptions/charity', {
        charityId,
        contributionPercentage,
      });
      return { success: true, preference: res.preference };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update charity preference.' };
    }
  };

  return {
    charities,
    loading,
    error,
    fetchCharities,
    getCharityById,
    getFeatured,
    donate,
    confirmDonationPayment,
    getPreference,
    updatePreference,
  };
}
