import React from 'react';

export const CharitiesPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Partner Charities</h1>
        <p className="text-base text-slate-600 dark:text-slate-300">
          Explore participating charitable organizations supported by our community draws.
        </p>
      </div>

      <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-xl font-bold">
          &hearts;
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Charity Directory Coming Soon</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Public charity profiles, impact metrics, and donation transparency reports will be integrated
          in a subsequent step.
        </p>
        <div className="text-xs font-mono text-slate-400 pt-2">
          TODO: Fetch from public.charities endpoint
        </div>
      </div>
    </div>
  );
};
