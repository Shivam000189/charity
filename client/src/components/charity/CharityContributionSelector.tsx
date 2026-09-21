import React, { useState, useEffect } from 'react';
import { useCharities } from '../../hooks/useCharities';
import type { SubscriptionCharityPreference } from '../../types/charity';

interface CharityContributionSelectorProps {
  onSaved?: (pref: SubscriptionCharityPreference) => void;
}

export const CharityContributionSelector: React.FC<CharityContributionSelectorProps> = ({ onSaved }) => {
  const { charities, getPreference, updatePreference, loading: charitiesLoading } = useCharities();

  const [preference, setPreference] = useState<SubscriptionCharityPreference | null>(null);
  const [selectedCharityId, setSelectedCharityId] = useState<string>('');
  const [percentage, setPercentage] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isChangingCharity, setIsChangingCharity] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const pref = await getPreference();
        if (isMounted && pref) {
          setPreference(pref);
          if (pref.charityId) {
            setSelectedCharityId(pref.charityId);
          }
          if (pref.contributionPercentage) {
            setPercentage(pref.contributionPercentage);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedCharityId) {
      setFeedback({ type: 'error', message: 'Please select a charity to support.' });
      return;
    }

    if (percentage < 10 || percentage > 100) {
      setFeedback({ type: 'error', message: 'Contribution percentage must be between 10% and 100%.' });
      return;
    }

    setSaving(true);
    try {
      const result = await updatePreference(selectedCharityId, percentage);
      if (result.success && result.preference) {
        setPreference(result.preference);
        setIsChangingCharity(false);
        setFeedback({
          type: 'success',
          message: 'Charity and contribution percentage updated successfully!',
        });
        if (onSaved) onSaved(result.preference);
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to update preferences.',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || charitiesLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 animate-pulse space-y-4">
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
        <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
      </div>
    );
  }

  const currentSelectedCharity = charities.find((c) => c.id === selectedCharityId) || preference?.charity;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Charity Allocation &amp; Contribution
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A portion of your monthly subscription is directly routed to your chosen nonprofit partner.
          </p>
        </div>
        <span className="self-start sm:self-auto px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-full">
          Min. 10% Required
        </span>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-lg text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Current Selection Card */}
      {!isChangingCharity && currentSelectedCharity ? (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center font-bold text-blue-600 text-lg overflow-hidden shrink-0">
              {currentSelectedCharity.logoUrl ? (
                <img
                  src={currentSelectedCharity.logoUrl}
                  alt={currentSelectedCharity.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                currentSelectedCharity.name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentSelectedCharity.name}
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                  {currentSelectedCharity.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Current Contribution: <strong className="text-blue-600 dark:text-blue-400">{percentage}%</strong> of subscription
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsChangingCharity(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors"
          >
            Change Charity &rarr;
          </button>
        </div>
      ) : (
        /* Charity Selector Dropdown / Picker */
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            Choose a Partner Charity:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
            {charities.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCharityId(c.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  selectedCharityId === c.id
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-600 shrink-0">
                    {c.logoUrl ? (
                      <img src={c.logoUrl} alt={c.name} className="w-full h-full object-cover rounded" />
                    ) : (
                      c.name.charAt(0)
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{c.category}</p>
                  </div>
                </div>
                {selectedCharityId === c.id && (
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contribution Percentage Slider */}
      <form onSubmit={handleSave} className="space-y-4 pt-2">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="contribution-slider" className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Contribution Percentage
            </label>
            <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              {percentage}%
            </span>
          </div>

          <input
            id="contribution-slider"
            type="range"
            min="10"
            max="100"
            step="1"
            value={percentage}
            onChange={(e) => setPercentage(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
            <span>10% (Min)</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100% (Max)</span>
          </div>
        </div>

        {/* Quick Percent Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[10, 20, 30, 50, 100].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setPercentage(val)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                percentage === val
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {val}%
            </button>
          ))}
        </div>

        {/* Save Button */}
        <div className="pt-2 flex justify-end gap-2">
          {isChangingCharity && (
            <button
              type="button"
              onClick={() => setIsChangingCharity(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={saving || !selectedCharityId}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            {saving ? 'Saving...' : 'Save Allocation Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};
