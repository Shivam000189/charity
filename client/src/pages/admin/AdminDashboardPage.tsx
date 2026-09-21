import React from 'react';

export const AdminDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Overview</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          System performance, lottery draws status, and user metrics summary.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Users</span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">--</div>
          <span className="text-xs text-slate-400 mt-1 block">Live metric in Step 8</span>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase">Active Charities</span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">--</div>
          <span className="text-xs text-slate-400 mt-1 block">Live metric in Step 8</span>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase">Pending Payouts</span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">--</div>
          <span className="text-xs text-slate-400 mt-1 block">Live metric in Step 8</span>
        </div>
      </div>

      <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Admin Operational Dashboard
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Administrative controls for user roles, charities management, draws trigger, and winner
          distribution will be integrated into this workspace.
        </p>
        <code className="text-xs font-mono text-slate-400 block mt-3">
          TODO: Admin analytics &amp; operational metrics
        </code>
      </div>
    </div>
  );
};
