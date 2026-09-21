import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const UserProfileCard: React.FC = () => {
  const { user, profile, session, signOut, refreshProfile } = useAuth();
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [testingApi, setTestingApi] = useState(false);

  const testBackendAuth = async () => {
    if (!session?.access_token) return;
    setTestingApi(true);
    setApiResponse(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      setApiResponse(`[Status ${res.status}]\n` + JSON.stringify(data, null, 2));
      await refreshProfile();
    } catch (err: unknown) {
      setApiResponse(`Error calling /api/auth/me: ${(err as Error).message}`);
    } finally {
      setTestingApi(false);
    }
  };

  const testRbacEndpoint = async (endpoint: 'authenticated' | 'subscriber' | 'admin') => {
    if (!session?.access_token) return;
    setTestingApi(true);
    setApiResponse(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    try {
      const res = await fetch(`${API_URL}/auth/test/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      setApiResponse(`[GET /api/auth/test/${endpoint} -> Status ${res.status}]\n` + JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      setApiResponse(`Error calling /api/auth/test/${endpoint}: ${(err as Error).message}`);
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <div className="w-full max-w-lg p-6 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 space-y-6 text-left">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">User Profile</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Authenticated via Supabase Auth</p>
        </div>
        <button
          onClick={signOut}
          className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>

      <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
        <div>
          <span className="font-semibold text-slate-600 dark:text-slate-400">Name:</span>{' '}
          <span className="text-slate-900 dark:text-white font-medium">{profile?.name || user?.user_metadata?.name || 'N/A'}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-600 dark:text-slate-400">Email:</span>{' '}
          <span className="text-slate-900 dark:text-white font-medium">{user?.email}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-600 dark:text-slate-400">Role:</span>{' '}
          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 uppercase">
            {profile?.role || 'visitor'}
          </span>
        </div>
        <div>
          <span className="font-semibold text-slate-600 dark:text-slate-400">Supabase UUID:</span>{' '}
          <code className="text-xs font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded break-all text-slate-800 dark:text-slate-200">
            {user?.id}
          </code>
        </div>
      </div>

      {/* RBAC Verification Controls */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
          RBAC Authorization Test Endpoints
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            onClick={testBackendAuth}
            disabled={testingApi}
            className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-medium rounded transition-colors"
          >
            GET /me
          </button>
          <button
            onClick={() => testRbacEndpoint('authenticated')}
            disabled={testingApi}
            className="py-1.5 px-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded transition-colors"
          >
            /test/auth
          </button>
          <button
            onClick={() => testRbacEndpoint('subscriber')}
            disabled={testingApi}
            className="py-1.5 px-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-medium rounded transition-colors"
          >
            /test/sub
          </button>
          <button
            onClick={() => testRbacEndpoint('admin')}
            disabled={testingApi}
            className="py-1.5 px-2 bg-purple-700 hover:bg-purple-600 text-white text-xs font-medium rounded transition-colors"
          >
            /test/admin
          </button>
        </div>

        {apiResponse && (
          <pre className="p-3 bg-slate-100 dark:bg-slate-950 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 overflow-x-auto border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
            {apiResponse}
          </pre>
        )}
      </div>
    </div>
  );
};

