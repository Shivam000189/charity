import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

interface SuccessState {
  plan?: string;
  planName?: string;
  subscriptionStatus?: string;
  expiresAt?: string;
  transactionId?: string;
}

/**
 * SubscriptionSuccessPage — shown after a successful mock payment.
 *
 * Subscription data is passed via React Router location.state from MockCheckoutPage.
 * Falls back to generic copy if navigated to directly.
 */
export const SubscriptionSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as SuccessState) || {};

  const planName = state.planName || (state.plan === 'yearly' ? 'Yearly Plan' : 'Monthly Plan');
  const status = state.subscriptionStatus || 'active';
  const isActive = status === 'active';

  const expiresFormatted = state.expiresAt
    ? new Date(state.expiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 text-center space-y-6">
      {/* Success Icon */}
      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full uppercase tracking-wider">
          Payment Successful
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Your subscription is active!
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Welcome to Digital Hero. Your {planName} is now active and ready to use.
        </p>
      </div>

      {/* Subscription Details */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-left space-y-4">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Subscription Summary
        </h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Plan</span>
            <span className="font-semibold text-slate-900 dark:text-white">{planName}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Status</span>
            <span className={`font-semibold px-2 py-0.5 rounded text-xs uppercase ${
              isActive
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {status}
            </span>
          </div>

          {expiresFormatted && (
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Renews On</span>
              <span className="font-semibold text-slate-900 dark:text-white">{expiresFormatted}</span>
            </div>
          )}

          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-500 dark:text-slate-400">Payment Provider</span>
            <span className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              Mock (Demo)
            </span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="pt-2 space-y-3">
        <button
          type="button"
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-center text-sm"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};
