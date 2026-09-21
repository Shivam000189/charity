import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type {
  Charity,
  CreateCharityInput,
  UpdateCharityInput,
  CharityApiResponse,
} from '../types/charity';

export function useAdminCharities() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCharities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<CharityApiResponse>('/api/admin/charities');
      if (res.charities) {
        setCharities(res.charities);
      }
    } catch (err: any) {
      console.error('Failed to load admin charities:', err);
      setError(err?.message || 'Failed to load charities.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCharities();
  }, [fetchCharities]);

  const create = async (data: CreateCharityInput): Promise<{ success: boolean; charity?: Charity; error?: string }> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<CharityApiResponse>('/api/admin/charities', data);
      await fetchCharities();
      return { success: true, charity: res.charity };
    } catch (err: any) {
      const msg = err?.message || 'Failed to create charity.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  const update = async (
    id: string,
    data: UpdateCharityInput
  ): Promise<{ success: boolean; charity?: Charity; error?: string }> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.patch<CharityApiResponse>(`/api/admin/charities/${id}`, data);
      await fetchCharities();
      return { success: true, charity: res.charity };
    } catch (err: any) {
      const msg = err?.message || 'Failed to update charity.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  const deactivate = async (id: string): Promise<{ success: boolean; error?: string }> => {
    setSubmitting(true);
    setError(null);
    try {
      await api.delete<CharityApiResponse>(`/api/admin/charities/${id}`);
      await fetchCharities();
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Failed to deactivate charity.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  const uploadImage = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: 'Image size must be less than 5MB.' };
      }

      // Convert File to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await api.post<CharityApiResponse>('/api/admin/charities/upload', {
        base64Data,
        filename: file.name,
        mimetype: file.type,
      });

      if (res.url) {
        return { success: true, url: res.url };
      }
      return { success: false, error: 'Upload did not return an image URL.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Image upload failed.' };
    }
  };

  return {
    charities,
    loading,
    submitting,
    error,
    fetchCharities,
    create,
    update,
    deactivate,
    uploadImage,
  };
}
