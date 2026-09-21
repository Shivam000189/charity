import React, { useState, useEffect } from 'react';
import { useCharities } from '../../hooks/useCharities';
import { CharityCard } from '../../components/charity/CharityCard';

const CATEGORIES = ['All', 'Education', 'Healthcare', 'Environment', 'Community', 'Sports', 'Animal Welfare', 'Arts & Culture', 'Other'];

export const CharitiesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { charities, loading, error, fetchCharities } = useCharities();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCharities({ search, category: selectedCategory });
    }, 250);

    return () => clearTimeout(timer);
  }, [search, selectedCategory, fetchCharities]);

  const handleReset = () => {
    setSearch('');
    setSelectedCategory('All');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full uppercase tracking-wider">
          Partner Nonprofits
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Community Charity Directory
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Every lottery draw and subscription allocation supports vetted organizations transforming lives.
          Explore causes, discover upcoming events, and support directly.
        </p>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        {/* Search bar */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search charities by name or mission..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900 text-center space-y-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => fetchCharities({ search, category: selectedCategory })}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-80 animate-pulse flex flex-col justify-between p-5"
            >
              <div className="space-y-3">
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-full"></div>
              </div>
              <div className="h-8 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
            </div>
          ))}
        </div>
      ) : charities.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-2xl text-slate-400">
            &#128269;
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No charities found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            We couldn't find any partner charities matching "{search || selectedCategory}".
          </p>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Clear Search &amp; Filters
          </button>
        </div>
      ) : (
        /* Charity Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {charities.map((c) => (
            <CharityCard key={c.id} charity={c} />
          ))}
        </div>
      )}
    </div>
  );
};
