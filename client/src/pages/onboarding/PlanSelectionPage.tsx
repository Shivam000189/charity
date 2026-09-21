import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../hooks/useOnboarding';
import type { SubscriptionPlanId } from '../../types/subscription';
import { SUBSCRIPTION_PLANS } from '../../types/subscription';
import { ROUTES } from '../../constants/routes';

export const PlanSelectionPage: React.FC = () => {
  const { selectedPlanId, selectPlan } = useOnboarding();
  const navigate = useNavigate();

  const handleSelect = (planId: SubscriptionPlanId) => {
    selectPlan(planId);
  };

  const handleContinue = () => {
    if (selectedPlanId) {
      navigate(ROUTES.ONBOARDING_CHECKOUT);
    }
  };

  const planKeys: SubscriptionPlanId[] = ['monthly', 'yearly'];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full uppercase tracking-wider">
          Step 1 of 2: Plan Selection
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
          Choose your plan
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          Select the subscription plan that works for you. Gain access to daily score challenges, charitable community draws, and verified member rewards.
        </p>
      </div>

      {/* Plan Cards Grid */}
      <div
        className="grid sm:grid-cols-2 gap-6"
        role="radiogroup"
        aria-label="Subscription Plans"
      >
        {planKeys.map((key) => {
          const plan = SUBSCRIPTION_PLANS[key];
          const isSelected = selectedPlanId === key;

          return (
            <div
              key={plan.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => handleSelect(plan.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  handleSelect(plan.id);
                }
              }}
              className={`relative rounded-2xl p-6 sm:p-8 cursor-pointer transition-all duration-200 flex flex-col justify-between border-2 ${
                isSelected
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              {key === 'yearly' && (
                <div className="absolute -top-3 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow">
                  Most Popular
                </div>
              )}

              <div>
                {/* Header & Radio indicator */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {plan.name}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {plan.billingInterval}
                    </p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-transparent'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Price Display */}
                <div className="my-5 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                    {plan.displayPrice}
                  </p>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                  {plan.description}
                </p>

                {/* Features List */}
                <ul className="space-y-2.5 mb-6 text-sm text-slate-600 dark:text-slate-300">
                  {plan.features.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <svg
                        className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(plan.id);
                }}
                className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                {isSelected ? '✓ Selected' : 'Select Plan'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
          No charge will be made today. Pricing and payment integration will be configured in Step 2.
        </p>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedPlanId}
          className="w-full sm:w-auto py-3 px-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-sm transition-colors text-center"
        >
          Continue &rarr;
        </button>
      </div>
    </div>
  );
};
