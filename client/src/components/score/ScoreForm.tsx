import React, { useState, useEffect } from 'react';
import type { ScoreRecord } from '../../types/score';
import type { ScoreError } from '../../hooks/useScores';

interface ScoreFormProps {
  initialData?: ScoreRecord | null;
  onSubmit: (data: { score: number; date: string }) => Promise<{ success: boolean; error?: ScoreError }>;
  onCancel?: () => void;
  submitting?: boolean;
  onEditExisting?: (existingId: string) => void;
}

export const ScoreForm: React.FC<ScoreFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitting = false,
  onEditExisting,
}) => {
  const isEditing = Boolean(initialData);

  // Today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);

  const [score, setScore] = useState<string>(initialData ? String(initialData.score) : '36');
  const [date, setDate] = useState<string>(initialData ? initialData.date : todayStr);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<ScoreError | null>(null);

  useEffect(() => {
    if (initialData) {
      setScore(String(initialData.score));
      setDate(initialData.date);
    } else {
      setScore('36');
      setDate(todayStr);
    }
    setFormError(null);
    setServerError(null);
  }, [initialData, todayStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setServerError(null);

    const parsedScore = parseInt(score, 10);
    if (isNaN(parsedScore) || parsedScore < 1 || parsedScore > 45) {
      setFormError('Stableford score must be an integer between 1 and 45.');
      return;
    }

    if (!date) {
      setFormError('Date is required.');
      return;
    }

    if (date > todayStr) {
      setFormError('Score date cannot be in the future.');
      return;
    }

    const result = await onSubmit({ score: parsedScore, date });
    if (!result.success && result.error) {
      setServerError(result.error);
    } else if (!isEditing) {
      // Reset form on new score submission
      setScore('36');
      setDate(todayStr);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {isEditing ? 'Edit Score' : 'Log New Score'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isEditing
              ? `Updating score for ${initialData?.date}`
              : 'Enter your 18-hole Stableford score (1–45) and play date'}
          </p>
        </div>
        {isEditing && (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
            Editing Mode
          </span>
        )}
      </div>

      {/* Form Error Banner */}
      {formError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {formError}
        </div>
      )}

      {/* Server Error Banner */}
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200">
          <p className="font-medium">{serverError.message}</p>
          {serverError.code === 'SCORE_ALREADY_EXISTS' && serverError.existingScoreId && onEditExisting && (
            <button
              type="button"
              onClick={() => onEditExisting(serverError.existingScoreId!)}
              className="mt-2 inline-flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Edit existing score for this date &rarr;
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Stableford Score Field */}
          <div>
            <label
              htmlFor="score-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Stableford Score (1 – 45)
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                id="score-input"
                type="number"
                min="1"
                max="45"
                step="1"
                required
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. 36"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-xs text-slate-400">pts</span>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Standard 36 is par. Max valid Stableford is 45.
            </p>
          </div>

          {/* Date Field */}
          <div>
            <label
              htmlFor="date-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Score Date
            </label>
            <input
              id="date-input"
              type="date"
              max={todayStr}
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Future dates not permitted. Max 1 score per date.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {isEditing && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            {submitting && (
              <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {isEditing ? (submitting ? 'Updating...' : 'Save Changes') : (submitting ? 'Saving...' : 'Submit Score')}
          </button>
        </div>
      </form>
    </div>
  );
};
