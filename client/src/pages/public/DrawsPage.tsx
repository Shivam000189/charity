import React from 'react';

export const DrawsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Lottery Draws</h1>
        <p className="text-base text-slate-600 dark:text-slate-300">
          View upcoming daily lottery draws, jackpot totals, and past winner archives.
        </p>
      </div>

      <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">
          &#9733;
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Active Draws Schedule Coming Soon</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Draw timers, entry counts, verified random selection seeds, and public winner leaderboards will
          be rendered here.
        </p>
        <div className="text-xs font-mono text-slate-400 pt-2">
          TODO: Connect to public.draws endpoint
        </div>
      </div>
    </div>
  );
};
