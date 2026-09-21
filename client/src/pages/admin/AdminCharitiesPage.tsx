import React from 'react';

export const AdminCharitiesPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Charities Management</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Create, edit, verify, and monitor participating nonprofit organizations.
        </p>
      </div>

      <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Charity Management Placeholder</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3">
          CRUD controls for charities, payout allocation percentages, and verification badges.
        </p>
        <code className="text-xs font-mono text-slate-400">
          TODO: Connect to admin charity management endpoints
        </code>
      </div>
    </div>
  );
};
