import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type {
  DrawRecord,
  CreateDrawInput,
  SimulationResult,
} from '../types/draw';

interface AdminDrawsResponse {
  draws?: DrawRecord[];
  draw?: DrawRecord;
  simulation?: SimulationResult;
  entriesEnrolled?: number;
  winnersCount?: number;
  error?: string;
  message?: string;
}

export function useAdminDraws() {
  const [draws, setDraws] = useState<DrawRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDraws = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<AdminDrawsResponse>('/api/admin/draws');
      if (res.draws) {
        setDraws(res.draws);
      }
    } catch (err: any) {
      console.error('Failed to load admin draws:', err);
      setError(err?.message || 'Failed to load draws.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDraws();
  }, [fetchDraws]);

  const createDraw = async (
    data: CreateDrawInput
  ): Promise<{ success: boolean; draw?: DrawRecord; error?: string }> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<AdminDrawsResponse>('/api/admin/draws', data);
      await fetchDraws();
      return { success: true, draw: res.draw };
    } catch (err: any) {
      const msg = err?.message || 'Failed to create draw.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  const openDraw = async (
    id: string
  ): Promise<{ success: boolean; entriesEnrolled?: number; error?: string }> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<AdminDrawsResponse>(`/api/admin/draws/${id}/open`, {});
      await fetchDraws();
      return { success: true, entriesEnrolled: res.entriesEnrolled };
    } catch (err: any) {
      const msg = err?.message || 'Failed to open draw.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  const closeDraw = async (
    id: string
  ): Promise<{ success: boolean; draw?: DrawRecord; error?: string }> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<AdminDrawsResponse>(`/api/admin/draws/${id}/close`, {});
      await fetchDraws();
      return { success: true, draw: res.draw };
    } catch (err: any) {
      const msg = err?.message || 'Failed to close draw.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  const simulateDraw = async (
    id: string,
    candidateNumbers?: number[]
  ): Promise<{ success: boolean; simulation?: SimulationResult; error?: string }> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<AdminDrawsResponse>(`/api/admin/draws/${id}/simulate`, {
        candidateNumbers,
      });
      await fetchDraws();
      return { success: true, simulation: res.simulation };
    } catch (err: any) {
      const msg = err?.message || 'Failed to simulate draw.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  const publishDraw = async (
    id: string
  ): Promise<{ success: boolean; draw?: DrawRecord; winnersCount?: number; error?: string }> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<AdminDrawsResponse>(`/api/admin/draws/${id}/publish`, {});
      await fetchDraws();
      return { success: true, draw: res.draw, winnersCount: res.winnersCount };
    } catch (err: any) {
      const msg = err?.message || 'Failed to publish draw.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  const deleteDraw = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    setSubmitting(true);
    setError(null);
    try {
      await api.delete<AdminDrawsResponse>(`/api/admin/draws/${id}`);
      await fetchDraws();
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Failed to delete draw.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    draws,
    loading,
    submitting,
    error,
    fetchDraws,
    createDraw,
    openDraw,
    closeDraw,
    simulateDraw,
    publishDraw,
    deleteDraw,
  };
}
