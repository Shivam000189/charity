import React, { useState } from 'react';
import type { ScoreRecord } from '../../types/score';

interface ScoreListProps {
  scores: ScoreRecord[];
  onEdit: (score: ScoreRecord) => void;
  onDelete: (scoreId: string) => Promise<void>;
  deletingId?: string | null;
}

export const ScoreList: React.FC<ScoreListProps> = ({
  scores,
  onEdit,
  onDelete,
  deletingId,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (scores.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
          No scores logged yet
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Log your Stableford scores above. Your best 5 active rounds are retained and automatically calculated.
        </p>
      </div>
    );
  }

  // Identify the oldest score that will be evicted if 5 scores exist
  // Oldest score in database is sorted by score_date ASC, created_at ASC
  let oldestScoreId: string | null = null;
  if (scores.length >= 5) {
    const sortedOldest = [...scores].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.createdAt.localeCompare(b.createdAt);
    });
    oldestScoreId = sortedOldest[0].id;
  }

  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleDeleteConfirmed = async (id: string) => {
    setConfirmDeleteId(null);
    await onDelete(id);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Logged Scores ({scores.length} / 5)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {scores.length >= 5
              ? 'Maximum 5 scores reached. Submitting a new score will roll off your oldest score.'
              : `You can log ${5 - scores.length} more score${5 - scores.length > 1 ? 's' : ''} before rolling eviction begins.`}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {scores.map((item, index) => {
          const isOldest = item.id === oldestScoreId;
          const isDeleting = deletingId === item.id;
          const isConfirming = confirmDeleteId === item.id;

          return (
            <div
              key={item.id}
              className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
            >
              {/* Score value + Date details */}
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold shadow-sm ${
                    item.score >= 36
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <span className="text-lg leading-tight">{item.score}</span>
                  <span className="text-[9px] uppercase tracking-wider font-semibold opacity-75">pts</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatDate(item.date)}
                    </span>
                    {isOldest && (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                        Oldest (Evicted Next)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Logged {new Date(item.createdAt).toLocaleDateString()} &bull; Round #{scores.length - index}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {isConfirming ? (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/50 p-1.5 rounded-lg border border-red-200 dark:border-red-900">
                    <span className="text-xs text-red-700 dark:text-red-300 font-medium px-1">
                      Delete round?
                    </span>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDeleteConfirmed(item.id)}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(item.id)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
