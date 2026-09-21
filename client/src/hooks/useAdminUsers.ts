import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { AdminUserListItem, AdminUserDetail } from '../types/report';

interface UsersApiResponse {
  success: boolean;
  users?: AdminUserListItem[];
  user?: AdminUserDetail;
  message?: string;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<UsersApiResponse>('/api/admin/users');
      if (res.users) setUsers(res.users);
    } catch (err: any) {
      console.error('Failed to load admin users:', err);
      setError(err?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getUserDetail = async (userId: string): Promise<{ user?: AdminUserDetail; error?: string }> => {
    try {
      const res = await api.get<UsersApiResponse>(`/api/admin/users/${userId}`);
      return { user: res.user };
    } catch (err: any) {
      return { error: err?.message || 'Failed to load user detail.' };
    }
  };

  const updateRole = async (
    userId: string,
    role: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.patch<UsersApiResponse>(`/api/admin/users/${userId}/role`, { role });
      await fetchUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update role.' };
    }
  };

  return {
    users,
    loading,
    error,
    refresh: fetchUsers,
    getUserDetail,
    updateRole,
  };
}
