import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <div className="space-y-2 text-center sm:text-left">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
          Our Mission &amp; Values
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Reinventing Charity Through Transparent Play
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Digital Hero bridges the gap between active recreation, provably fair prize draws, and reliable grassroots fundraising.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            1. Why Digital Hero Exists
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Traditional fundraising is often episodic and opaque. We built Digital Hero to turn everyday athletic rounds into sustainable funding pipelines. Subscribers choose the exact non-profit that receives their monthly allocation, with 10% to 100% of proceeds routed directly to their designated cause.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            2. The Monthly Draw Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Subscribers in good standing automatically receive 5 unique draw ticket numbers each month. Using zero-leakage mathematical models, tier prize pools (3-match, 4-match, 5-match) are strictly calculated after charity donations. If no player matches all 5 numbers, the top jackpot automatically rolls over to the next month.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            3. Verification &amp; Trust
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Fairness is our paramount standard. Before any prize disbursement is settled, winners submit official scorecards which are independently reviewed by administrators via private, time-limited cryptographic storage links.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600 dark:text-slate-400 text-center sm:text-left">
            Explore our vetted non-profit partners or start your membership today.
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={ROUTES.CHARITIES}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors"
            >
              Browse Charities
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
