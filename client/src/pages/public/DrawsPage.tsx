import React, { useState } from 'react';
import { useDraws } from '../../hooks/useDraws';
import type { DrawRecord, DrawWinner } from '../../types/draw';

export const DrawsPage: React.FC = () => {
  const { activeDraw, history, loading, error, getDrawDetails } = useDraws();
  const [selectedHistoryDraw, setSelectedHistoryDraw] = useState<DrawRecord | null>(null);
  const [historyWinners, setHistoryWinners] = useState<DrawWinner[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  const handleInspectHistory = async (draw: DrawRecord) => {
    setSelectedHistoryDraw(draw);
    setLoadingDetails(true);
    const res = await getDrawDetails(draw.id);
    if (res.winners) {
      setHistoryWinners(res.winners);
    } else {
      setHistoryWinners([]);
    }
    setLoadingDetails(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 sm:p-12 text-white shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <span>&#9733;</span>
            <span>Monthly Subscriber Prize Engine</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Play Golf. Support Charity. <span className="text-amber-400">Win Big.</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Every active monthly and annual subscriber is automatically entered into our monthly prize draw.
            Your golf Stableford performance sharpens your odds with score-weighted number allocation!
          </p>
        </div>

        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ACTIVE DRAW SECTION */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Current Active Draw</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Entry is 100% automated for all verified subscribers in good standing.
            </p>
          </div>
          {activeDraw && (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-xs font-semibold animate-pulse">
              ● Live Enrollment Open
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
            Loading active draw details...
          </div>
        ) : activeDraw ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/30 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold uppercase">
                  {activeDraw.scheduled_month} Cycle
                </span>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{activeDraw.title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Scheduled draw execution:{' '}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {new Date(activeDraw.draw_date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </strong>
                </p>
              </div>

              {/* Current Jackpot Badge */}
              <div className="text-left md:text-right bg-amber-500/10 border border-amber-500/30 px-5 py-3 rounded-xl">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Estimated 5-Match Jackpot
                </span>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  ₹{((activeDraw.five_match_pool || 0) + (activeDraw.jackpot_rollover_amount || 0)).toLocaleString('en-IN', {
                    minimumFractionDigits: 0,
                  })}
                </div>
                {activeDraw.jackpot_rollover_amount > 0 && (
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                    Includes ₹{activeDraw.jackpot_rollover_amount.toLocaleString('en-IN')} Rollover!
                  </span>
                )}
              </div>
            </div>

            {/* Prize Tier Breakdown */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Match 5 (Jackpot)</span>
                  <span className="font-semibold text-amber-500">{activeDraw.five_match_percentage}% of pool</span>
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  ₹{((activeDraw.five_match_pool || 0) + (activeDraw.jackpot_rollover_amount || 0)).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Rolls over if unclaimed</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Match 4</span>
                  <span className="font-semibold text-indigo-500">{activeDraw.four_match_percentage}% of pool</span>
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  ₹{(activeDraw.four_match_pool || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Split equally among winners</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Match 3</span>
                  <span className="font-semibold text-emerald-500">{activeDraw.three_match_percentage}% of pool</span>
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  ₹{(activeDraw.three_match_pool || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Split equally among winners</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Next Draw Scheduling in Progress</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Our admins are configuring the upcoming monthly prize draw. Check back shortly!
            </p>
          </div>
        )}
      </div>

      {/* HOW IT WORKS / RULES EXPLAINER */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">How the Draw Engine Operates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <div className="space-y-1">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">
                1
              </span>
              Automatic Enrollment
            </h4>
            <p>
              Subscribers do not need to purchase separate lottery tickets. Every active subscriber receives 5 unique numbers in range 1–45 every month.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[10px]">
                2
              </span>
              Score-Weighted Numbers
            </h4>
            <p>
              Your recent golf Stableford scores weight which numbers are drawn for your ticket, rewarding consistent gameplay and active handicap tracking.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">
                3
              </span>
              Jackpot Rollover
            </h4>
            <p>
              If no subscriber scores a 5-number match, the entire 5-match prize pool carries forward to subsequent draws, growing the jackpot!
            </p>
          </div>
        </div>
      </div>

      {/* PAST DRAWS & WINNERS ARCHIVE */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Past Draws & Winners Archive</h2>

        {history.length === 0 ? (
          <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-400 text-xs">
            No completed draws recorded yet. Past finalized lottery results will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((draw) => (
              <div
                key={draw.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-slate-400">{draw.scheduled_month}</span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{draw.title}</h4>
                  </div>
                  <button
                    onClick={() => handleInspectHistory(draw)}
                    className="text-xs px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-lg font-semibold transition"
                  >
                    Inspect Winners
                  </button>
                </div>

                {/* Winning Numbers */}
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-slate-400 mr-1">Numbers:</span>
                  {(draw.drawn_numbers || []).map((num) => (
                    <div
                      key={num}
                      className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-bold text-xs flex items-center justify-center shadow-sm"
                    >
                      {num}
                    </div>
                  ))}
                </div>

                {/* Prize Summary */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500">
                  <span>Total Prize Distributed</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ₹{(draw.total_pool || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WINNERS DETAILS MODAL */}
      {selectedHistoryDraw && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-emerald-600 font-semibold">Official Results</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedHistoryDraw.title}</h3>
              </div>
              <button
                onClick={() => setSelectedHistoryDraw(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Winning Numbers */}
            <div className="text-center py-2 bg-slate-950 rounded-xl">
              <div className="text-xs text-slate-400 mb-2 font-medium">Winning Balls</div>
              <div className="flex items-center justify-center gap-2">
                {(selectedHistoryDraw.drawn_numbers || []).map((num) => (
                  <div
                    key={num}
                    className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black text-sm flex items-center justify-center"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            {/* Winners List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Declared Winners</h4>
              {loadingDetails ? (
                <div className="text-center py-4 text-xs text-slate-400">Loading winners...</div>
              ) : historyWinners.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center text-xs text-slate-500">
                  No registered subscribers matched 3 or more numbers in this draw. The 5-match jackpot of ₹
                  {(selectedHistoryDraw.rolled_over_to_next || 0).toLocaleString('en-IN')} rolled over into the next cycle.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto text-xs">
                  {historyWinners.map((w, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            w.matchCount === 5
                              ? 'bg-amber-100 text-amber-800'
                              : w.matchCount === 4
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {w.matchCount} Matches
                        </span>
                        <span className="text-slate-500 font-mono">Rank #{w.rank}</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{w.prizeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedHistoryDraw(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
