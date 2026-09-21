import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

export const CheckoutPreviewPage: React.FC = () => {
  const { selectedPlan } = useOnboarding();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Requirement: If no plan is selected, redirect to plan selection
  useEffect(() => {
    if (!selectedPlan) {
      navigate(ROUTES.ONBOARDING_PLAN, { replace: true });
    }
  }, [selectedPlan, navigate]);

  if (!selectedPlan) {
    return null;
  }

  const handleContinueToPayment = () => {
    // Strictly informational for Step 1 — No payment processed, no role change
    setNoticeMessage(
      'Payment integration will be available in the next subscription setup step (Phase 1 — Step 2). No charge has been made and your role remains unchanged.'
    );
  };

  const handleChangePlan = () => {
    navigate(ROUTES.ONBOARDING_PLAN);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Step Indicator */}
      <div className="text-center space-y-2">
        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full uppercase tracking-wider">
          Step 2 of 2: Checkout Preview
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Order Summary &amp; Preview
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Review your selected subscription plan before entering payment details in the next step.
        </p>
      </div>

      {/* Payment Step 2 Notice */}
      {noticeMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-sm flex items-start gap-3 shadow-sm animate-fade-in"
        >
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="space-y-1">
            <p className="font-semibold">Payment Integration Preview</p>
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              {noticeMessage}
            </p>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <span className="text-xs uppercase font-semibold text-blue-600 dark:text-blue-400 tracking-wider">
              Selected Tier
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {selectedPlan.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Subscriber Member Account: {profile?.email || user?.email}
            </p>
          </div>

          <button
            type="button"
            onClick={handleChangePlan}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 transition-colors"
          >
            Change Plan
          </button>
        </div>

        {/* Breakdown */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
            <span>Billing Frequency</span>
            <span className="font-semibold text-slate-900 dark:text-white">{selectedPlan.billingInterval}</span>
          </div>

          <div className="flex justify-between items-start gap-4 text-slate-600 dark:text-slate-400">
            <span>Subscription Price</span>
            <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 text-right bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
              {selectedPlan.displayPrice}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Current Role</span>
            <span className="font-mono text-xs uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300">
              {profile?.role || 'visitor'} (Unchanged)
            </span>
          </div>
        </div>

        {/* Feature inclusions */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Included with your membership:
          </h3>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {selectedPlan.features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 space-y-3">
          <button
            type="button"
            onClick={handleContinueToPayment}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-center text-base"
          >
            Continue to Payment &rarr;
          </button>

          <button
            type="button"
            onClick={handleChangePlan}
            className="w-full py-2.5 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors text-center text-sm"
          >
            &larr; Choose Different Plan
          </button>
        </div>
      </div>

      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        <p className="font-medium text-slate-700 dark:text-slate-300">Phase 1 — Step 1 Verification Notice</p>
        <p className="mt-1">
          Selecting a plan and viewing this preview does not create an active subscription record or elevate your account to subscriber. Payment processing will be wired up in Step 2.
        </p>
      </div>
    </div>
  );
};
