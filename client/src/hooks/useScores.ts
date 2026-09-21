import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { ScoreRecord, CreateScoreInput, UpdateScoreInput, ScoreApiResponse } from '../types/score';

export interface ScoreError {
  code?: string;
  message: string;
  existingScoreId?: string;
}

export function useScores(isSubscriber: boolean = true) {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<ScoreError | null>(null);

  const fetchScores = useCallback(async () => {
    if (!isSubscriber) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ScoreApiResponse>('/api/scores');
      if (res.scores && Array.isArray(res.scores)) {
        setScores(res.scores);
      } else if (res.data && Array.isArray(res.data)) {
        setScores(res.data as ScoreRecord[]);
      }
    } catch (err: any) {
      console.error('Failed to fetch scores:', err);
      setError({
        code: err?.code || 'FETCH_FAILED',
        message: err?.message || 'Failed to load scores.',
      });
    } finally {
      setLoading(false);
    }
  }, [isSubscriber]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const addScore = async (input: CreateScoreInput): Promise<{ success: boolean; error?: ScoreError }> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<ScoreApiResponse>('/api/scores', input);
      if (res.scores && Array.isArray(res.scores)) {
        setScores(res.scores);
      } else {
        await fetchScores();
      }
      return { success: true };
    } catch (err: any) {
      const scoreError: ScoreError = {
        code: err?.code || 'SUBMISSION_FAILED',
        message: err?.message || 'Failed to submit score.',
        existingScoreId: err?.existingScoreId,
      };
      setError(scoreError);
      return { success: false, error: scoreError };
    } finally {
      setSubmitting(false);
    }
  };

  const editScore = async (
    id: string,
    input: UpdateScoreInput
  ): Promise<{ success: boolean; error?: ScoreError }> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.patch<ScoreApiResponse>(`/api/scores/${id}`, input);
      if (res.scores && Array.isArray(res.scores)) {
        setScores(res.scores);
      } else {
        await fetchScores();
      }
      return { success: true };
    } catch (err: any) {
      const scoreError: ScoreError = {
        code: err?.code || 'UPDATE_FAILED',
        message: err?.message || 'Failed to update score.',
        existingScoreId: err?.existingScoreId,
      };
      setError(scoreError);
      return { success: false, error: scoreError };
    } finally {
      setSubmitting(false);
    }
  };

  const removeScore = async (id: string): Promise<{ success: boolean; error?: ScoreError }> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.delete<ScoreApiResponse>(`/api/scores/${id}`);
      if (res.scores && Array.isArray(res.scores)) {
        setScores(res.scores);
      } else {
        await fetchScores();
      }
      return { success: true };
    } catch (err: any) {
      const scoreError: ScoreError = {
        code: err?.code || 'DELETE_FAILED',
        message: err?.message || 'Failed to delete score.',
      };
      setError(scoreError);
      return { success: false, error: scoreError };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    scores,
    loading,
    submitting,
    error,
    clearError: () => setError(null),
    fetchScores,
    addScore,
    editScore,
    removeScore,
  };
}
