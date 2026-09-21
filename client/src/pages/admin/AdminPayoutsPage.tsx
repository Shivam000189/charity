import React from 'react';

export const AdminPayoutsPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payout Processing</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Review, approve, and execute prize transfers and charity disbursement batches.
        </p>
      </div>

      <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Payout Operations Placeholder</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3">
          Payout queue (pending &rarr; processing &rarr; completed / failed), banking rails, and tax receipts.
        </p>
        <code className="text-xs font-mono text-slate-400">
          TODO: Connect to admin payouts processing endpoints
        </code>
      </div>
    </div>
  );
};
