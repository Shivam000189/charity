import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { Winner, WinnersApiResponse } from '../types/winner';

export function useAdminWinners() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [pendingWinners, setPendingWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allRes, pendingRes] = await Promise.all([
        api.get<WinnersApiResponse>('/api/admin/winners'),
        api.get<WinnersApiResponse>('/api/admin/winners/pending'),
      ]);

      if (allRes.winners) setWinners(allRes.winners);
      if (pendingRes.winners) setPendingWinners(pendingRes.winners);
    } catch (err: any) {
      console.error('Failed to load admin winners:', err);
      setError(err?.message || 'Failed to load winners.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const approve = async (
    winnerId: string
  ): Promise<{ success: boolean; winner?: Winner; error?: string }> => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post<WinnersApiResponse>(`/api/admin/winners/${winnerId}/approve`, {});
      await fetchAll();
      return { success: true, winner: res.winner };
    } catch (err: any) {
      const msg = err?.message || 'Failed to approve winner.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async (
    winnerId: string,
    reason: string
  ): Promise<{ success: boolean; winner?: Winner; error?: string }> => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post<WinnersApiResponse>(`/api/admin/winners/${winnerId}/reject`, { reason });
      await fetchAll();
      return { success: true, winner: res.winner };
    } catch (err: any) {
      const msg = err?.message || 'Failed to reject winner.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  };

  const markPaid = async (
    winnerId: string,
    data: { paymentReference: string; paidAt?: string; adminNote?: string }
  ): Promise<{ success: boolean; winner?: Winner; error?: string }> => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post<WinnersApiResponse>(`/api/admin/winners/${winnerId}/mark-paid`, data);
      await fetchAll();
      return { success: true, winner: res.winner };
    } catch (err: any) {
      const msg = err?.message || 'Failed to mark winner paid.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  };

  return {
    winners,
    pendingWinners,
    loading,
    actionLoading,
    error,
    refresh: fetchAll,
    approve,
    reject,
    markPaid,
  };
}
