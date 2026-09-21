import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const role = profile?.role || 'visitor';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Welcome back, {profile?.name || user?.email?.split('@')[0]}!
            </h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
              {role}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Account ID: <code className="font-mono text-xs">{user?.id}</code>
          </p>
        </div>

        <Link
          to={ROUTES.PROFILE}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
        >
          View Profile &amp; Tests
        </Link>
      </div>

      {/* Feature Navigation Cards */}
      <div className="grid sm:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">My Subscription</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Manage your active monthly subscription plan and entry allocation.
            </p>
          </div>
          <Link
            to={ROUTES.SUBSCRIPTION}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Manage Subscription &rarr;
          </Link>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Draw Entries</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Inspect your verified entries for upcoming daily draws.
            </p>
          </div>
          <Link
            to={ROUTES.MY_ENTRIES}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            View Entries &rarr;
          </Link>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">My Winnings</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Review confirmed prize awards, payout receipts, and status.
            </p>
          </div>
          <Link
            to={ROUTES.MY_WINNINGS}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Check Winnings &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
