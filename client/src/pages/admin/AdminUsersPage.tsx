import React from 'react';

export const AdminUsersPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Inspect registered platform users, assign roles, and review account standing.
        </p>
      </div>

      <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">User Directory Placeholder</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3">
          User search, role assignment (visitor / subscriber / admin), and account details table.
        </p>
        <code className="text-xs font-mono text-slate-400">
          TODO: Connect to backend admin user management service
        </code>
      </div>
    </div>
  );
};
