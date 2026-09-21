import React from 'react';
import { useAuth } from '../../hooks/useAuth';

export const SubscriptionPage: React.FC = () => {
  const { profile } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
          Subscription Management
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your subscription tier, billing preferences, and community lottery allocations.
        </p>
      </div>

      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Plan</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Current authorization tier: {profile?.role}</p>
          </div>
          <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full uppercase">
            Active
          </span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Subscription Billing Integration</p>
          <p className="text-xs">
            Payment gateway checkout, recurring billing hooks, and subscription cancellation will be
            implemented in a future step.
          </p>
          <code className="text-xs font-mono text-slate-400 block mt-2">
            TODO: Connect to public.subscriptions API
          </code>
        </div>
      </div>
    </div>
  );
};
