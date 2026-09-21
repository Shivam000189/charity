import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { DrawRecord, DrawEntry, DrawWinner } from '../types/draw';

interface PublicDrawsResponse {
  draw?: DrawRecord;
  draws?: DrawRecord[];
  entry?: DrawEntry;
  winners?: DrawWinner[];
  error?: string;
}

export function useDraws() {
  const [activeDraw, setActiveDraw] = useState<DrawRecord | null>(null);
  const [history, setHistory] = useState<DrawRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveAndHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [activeRes, historyRes] = await Promise.all([
        api.get<PublicDrawsResponse>('/api/draws/active').catch(() => ({ draw: undefined })),
        api.get<PublicDrawsResponse>('/api/draws/history').catch(() => ({ draws: [] })),
      ]);

      if (activeRes.draw) {
        setActiveDraw(activeRes.draw);
      } else {
        setActiveDraw(null);
      }

      if (historyRes.draws) {
        setHistory(historyRes.draws);
      }
    } catch (err: any) {
      console.error('Failed to load draws:', err);
      setError(err?.message || 'Failed to load draws.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveAndHistory();
  }, [fetchActiveAndHistory]);

  const getDrawDetails = async (
    id: string
  ): Promise<{ draw?: DrawRecord; winners?: DrawWinner[]; error?: string }> => {
    try {
      const res = await api.get<PublicDrawsResponse>(`/api/draws/${id}`);
      return { draw: res.draw, winners: res.winners };
    } catch (err: any) {
      return { error: err?.message || 'Failed to fetch draw details.' };
    }
  };

  const getMyEntry = async (
    drawId: string
  ): Promise<{ entry?: DrawEntry; error?: string }> => {
    try {
      const res = await api.get<PublicDrawsResponse>(`/api/draws/${drawId}/my-entry`);
      return { entry: res.entry };
    } catch (err: any) {
      return { error: err?.message || 'Failed to fetch user entry.' };
    }
  };

  return {
    activeDraw,
    history,
    loading,
    error,
    refresh: fetchActiveAndHistory,
    getDrawDetails,
    getMyEntry,
  };
}
