import React from 'react';

export const AdminWinnersPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Winner Management</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Audit confirmed lottery winners, prize allocations, and winner notification statuses.
        </p>
      </div>

      <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Winners Audit Placeholder</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3">
          Verification logs for winning tickets, ranking validation, and compliance records.
        </p>
        <code className="text-xs font-mono text-slate-400">
          TODO: Connect to admin winners auditing endpoints
        </code>
      </div>
    </div>
  );
};
