import React from 'react';

export const MyWinningsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">My Prize Winnings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track and claim prizes awarded to your account across past lottery draws.
        </p>
      </div>

      <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
        <h2 className="text-base font-bold text-slate-800 dark:text-white">No Confirmed Winnings Yet</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          When your entries are selected in a daily draw, prize amounts, ranks, and payout statuses will be listed here.
        </p>
        <div className="text-xs font-mono text-slate-400 pt-2">
          TODO: Connect to public.winners and public.payouts API
        </div>
      </div>
    </div>
  );
};
