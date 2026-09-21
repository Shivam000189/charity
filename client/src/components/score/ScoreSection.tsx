import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import { useScores } from '../../hooks/useScores';
import type { ScoreRecord } from '../../types/score';
import { ScoreTrendChart } from './ScoreTrendChart';
import { ScoreForm } from './ScoreForm';
import { ScoreList } from './ScoreList';
import { ROUTES } from '../../constants/routes';

export const ScoreSection: React.FC = () => {
  const { hasAccess, loading: subLoading } = useSubscription();
  const {
    scores,
    loading: scoresLoading,
    submitting,
    error,
    addScore,
    editScore,
    removeScore,
    fetchScores,
  } = useScores(hasAccess);

  const [editingScore, setEditingScore] = useState<ScoreRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Paywall / Non-subscriber state
  if (!subLoading && !hasAccess) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl border border-blue-900/40 p-8 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Subscriber Exclusive
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mb-2">
            Score Tracking &amp; Rolling-5 Performance
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Active subscribers can log daily 18-hole Stableford scores (1–45 pts), visualize chronological progress trends, and maintain an automatic rolling 5-round record for prize draw allocations.
          </p>
          <Link
            to={ROUTES.SUBSCRIPTION}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
          >
            Activate Subscription to Unlock &rarr;
          </Link>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
          <svg className="w-80 h-80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
          </svg>
        </div>
      </div>
    );
  }

  const handleStartEdit = (score: ScoreRecord) => {
    setEditingScore(score);
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingScore(null);
  };

  const handleEditExisting = (existingId: string) => {
    const existing = scores.find((s) => s.id === existingId);
    if (existing) {
      setEditingScore(existing);
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSubmitScore = async (data: { score: number; date: string }) => {
    if (editingScore) {
      const result = await editScore(editingScore.id, data);
      if (result.success) {
        setEditingScore(null);
      }
      return result;
    } else {
      return await addScore(data);
    }
  };

  const handleDeleteScore = async (scoreId: string) => {
    setDeletingId(scoreId);
    try {
      await removeScore(scoreId);
      if (editingScore?.id === scoreId) {
        setEditingScore(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Score Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log your daily Stableford rounds. Your application maintains your latest 5 scores on a rolling basis.
          </p>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && !editingScore && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between text-xs text-red-700 dark:text-red-300">
          <span>{error.message}</span>
          <button
            type="button"
            onClick={fetchScores}
            className="font-bold underline hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state skeleton */}
      {scoresLoading ? (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
          <div className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
        </div>
      ) : (
        <>
          {/* Performance Trend Chart */}
          <ScoreTrendChart scores={scores} />

          {/* Score Input Form */}
          <div ref={formRef}>
            <ScoreForm
              initialData={editingScore}
              onSubmit={handleSubmitScore}
              onCancel={handleCancelEdit}
              submitting={submitting}
              onEditExisting={handleEditExisting}
            />
          </div>

          {/* Reverse Chronological Score List */}
          <ScoreList
            scores={scores}
            onEdit={handleStartEdit}
            onDelete={handleDeleteScore}
            deletingId={deletingId}
          />
        </>
      )}
    </div>
  );
};
