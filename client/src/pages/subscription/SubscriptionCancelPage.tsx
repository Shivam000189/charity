import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export const SubscriptionCancelPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 text-center space-y-6">
      {/* Cancel Icon */}
      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-full uppercase tracking-wider">
          Cancelled
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Checkout Cancelled
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          No charges were made and no subscription was activated.
        </p>
      </div>

      {/* Reassurance Notice */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-left space-y-3">
        <h2 className="font-semibold text-slate-900 dark:text-white text-sm">
          What happens now?
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
          Your account remains in good standing with the <strong>visitor</strong> role. You can return to checkout whenever you are ready or select a different subscription plan.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(ROUTES.ONBOARDING_MOCK_CHECKOUT)}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-center text-sm"
        >
          Try Again
        </button>

        <button
          type="button"
          onClick={() => navigate(ROUTES.ONBOARDING_PLAN)}
          className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors text-center text-sm"
        >
          Change Plan
        </button>
      </div>
    </div>
  );
};
