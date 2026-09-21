import React, { useEffect, useState } from 'react';
import { useDraws } from '../../hooks/useDraws';
import type { DrawEntry } from '../../types/draw';

export const MyEntriesPage: React.FC = () => {
  const { activeDraw, loading, getMyEntry } = useDraws();
  const [entry, setEntry] = useState<DrawEntry | null>(null);
  const [loadingEntry, setLoadingEntry] = useState<boolean>(true);

  useEffect(() => {
    async function loadEntry() {
      if (activeDraw) {
        setLoadingEntry(true);
        const res = await getMyEntry(activeDraw.id);
        if (res.entry) {
          setEntry(res.entry);
        } else {
          setEntry(null);
        }
        setLoadingEntry(false);
      } else {
        setLoadingEntry(false);
      }
    }
    loadEntry();
  }, [activeDraw, getMyEntry]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">My Draw Entries</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your automated monthly lottery ticket allocation based on your active subscription and golf scores.
        </p>
      </div>

      {loading || loadingEntry ? (
        <div className="p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm">
          Loading your ticket entries...
        </div>
      ) : activeDraw && entry ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                Active Subscriber Ticket Confirmed
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{activeDraw.title}</h2>
              <p className="text-xs text-slate-500 mt-1">
                Draw Date: {new Date(activeDraw.draw_date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500">Current 5-Match Jackpot</span>
              <div className="text-2xl font-black text-amber-500">
                ₹{((activeDraw.five_match_pool || 0) + (activeDraw.jackpot_rollover_amount || 0)).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* User's Draw Numbers */}
          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center space-y-3">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Your 5 Assigned Draw Numbers
            </div>
            <div className="flex items-center justify-center gap-3">
              {(entry.numbers || []).map((num) => (
                <div
                  key={num}
                  className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-lg flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-300/40"
                >
                  {num}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              Generated automatically {activeDraw.draw_type === 'SCORE_WEIGHTED' ? 'with Stableford score weighting' : 'randomly'}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
              <strong className="block text-slate-800 dark:text-slate-200">5-Match Winner:</strong>
              Wins full jackpot (or equal share if multiple winners)
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
              <strong className="block text-slate-800 dark:text-slate-200">4-Match Winner:</strong>
              Wins 35% pool share divided equally
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
              <strong className="block text-slate-800 dark:text-slate-200">3-Match Winner:</strong>
              Wins 25% pool share divided equally
            </div>
          </div>
        </div>
      ) : activeDraw && !entry ? (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Draw Entry Pending Enrollment</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            The {activeDraw.title} draw is currently being prepared. Your ticket will be automatically generated as soon as the entry window opens.
          </p>
        </div>
      ) : (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">No Active Draw In Progress</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Our admin team is scheduling the upcoming monthly draw. As an active subscriber, you will be enrolled automatically.
          </p>
        </div>
      )}
    </div>
  );
};
