import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { Winner, WinnersApiResponse } from '../types/winner';

export function useWinners() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWinners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<WinnersApiResponse>('/api/winners/me');
      if (res.winners) {
        setWinners(res.winners);
      }
    } catch (err: any) {
      console.error('Failed to load user winners:', err);
      setError(err?.message || 'Failed to load winnings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWinners();
  }, [fetchWinners]);

  const uploadProof = async (
    winnerId: string,
    file: File
  ): Promise<{ success: boolean; winner?: Winner; error?: string }> => {
    setUploading(true);
    setError(null);
    try {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: 'File size must be less than 5MB.' };
      }

      // Read as base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await api.post<WinnersApiResponse>(`/api/winners/${winnerId}/proof`, {
        base64Data,
        filename: file.name,
        mimetype: file.type,
      });

      await fetchWinners();
      return { success: true, winner: res.winner };
    } catch (err: any) {
      const msg = err?.message || 'Failed to upload proof.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setUploading(false);
    }
  };

  // Financial aggregates
  const totalWon = winners.reduce((acc, w) => acc + w.prizeAmount, 0);
  const pendingPayment = winners
    .filter((w) => w.paymentStatus === 'PENDING')
    .reduce((acc, w) => acc + w.prizeAmount, 0);
  const paidAmount = winners
    .filter((w) => w.paymentStatus === 'PAID')
    .reduce((acc, w) => acc + w.prizeAmount, 0);

  return {
    winners,
    loading,
    uploading,
    error,
    refresh: fetchWinners,
    uploadProof,
    totalWon,
    pendingPayment,
    paidAmount,
  };
}
