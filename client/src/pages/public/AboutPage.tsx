import React from 'react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">About Digital Hero</h1>
        <p className="text-base text-slate-600 dark:text-slate-300">
          Our mission is to empower communities through transparent digital charity lotteries.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">How It Works</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Digital Hero combines daily fitness/gaming engagement and subscription contributions into direct
          support for global charities. Participants earn lottery draw entries, compete fairly on
          scoreboards, and directly witness where charity contributions are disbursed.
        </p>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono">
          [Architecture Note]: Full platform documentation, charity registry, and partner agreements
          will be linked here in future steps.
        </div>
      </div>
    </div>
  );
};
