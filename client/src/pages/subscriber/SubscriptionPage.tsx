import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { CharityContributionSelector } from '../../components/charity/CharityContributionSelector';

export const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const {
    subscription,
    hasAccess,
    loading,
    cancelSubscription,
    reactivateSubscription,
    renewSubscription,
  } = useSubscription();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isPaywallRedirect = (location.state as { paywall?: boolean })?.paywall;

  const handleCancel = async () => {
    setIsProcessing(true);
    setFeedbackMessage(null);
    try {
      await cancelSubscription();
      setShowCancelModal(false);
      setFeedbackMessage({
        type: 'success',
        text: 'Subscription cancelled successfully. You will continue to have access until your current billing period ends.',
      });
    } catch (err: unknown) {
      setFeedbackMessage({
        type: 'error',
        text: (err as Error).message || 'Failed to cancel subscription.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async () => {
    setIsProcessing(true);
    setFeedbackMessage(null);
    try {
      await reactivateSubscription();
      setFeedbackMessage({
        type: 'success',
        text: 'Subscription reactivated successfully! Your auto-renewal is back on track.',
      });
    } catch (err: unknown) {
      setFeedbackMessage({
        type: 'error',
        text: (err as Error).message || 'Failed to reactivate subscription.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRenew = async () => {
    setIsProcessing(true);
    setFeedbackMessage(null);
    try {
      await renewSubscription();
      setFeedbackMessage({
        type: 'success',
        text: 'Subscription renewed successfully! Your expiration date has been extended.',
      });
    } catch (err: unknown) {
      setFeedbackMessage({
        type: 'error',
        text: (err as Error).message || 'Failed to renew subscription.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full uppercase tracking-wider">
            Active
          </span>
        );
      case 'pending_renewal':
        return (
          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-full uppercase tracking-wider">
            Renewal Due
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-full uppercase tracking-wider">
            Cancelled
          </span>
        );
      case 'lapsed':
      case 'expired':
        return (
          <span className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full uppercase tracking-wider">
            Lapsed
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Paywall Notice Alert */}
      {isPaywallRedirect && !hasAccess && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start space-x-3 text-amber-800 dark:text-amber-200">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold">Subscriber Access Required</h3>
            <p className="text-xs mt-0.5 opacity-90">
              The page you requested is reserved exclusively for active subscribers. Activate or renew your plan below to continue.
            </p>
          </div>
        </div>
      )}

      {/* Admin Notice */}
      {profile?.role === 'admin' && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-xl text-xs text-indigo-700 dark:text-indigo-300">
          <span className="font-bold">Administrator Privilege:</span> You have full unrestricted access to all subscriber features and lottery draws regardless of your subscription status.
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Subscription Management
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Monitor your subscription status, renewal periods, and subscriber access privileges.
        </p>
      </div>

      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs underline ml-4 hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Card */}
      {loading ? (
        <div className="p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-emerald-500 rounded-full mb-3" />
          <p className="text-sm font-medium">Loading subscription details...</p>
        </div>
      ) : subscription ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                  {subscription.plan} Plan
                </h2>
                {getStatusBadge(subscription.status)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Subscription ID: <code className="font-mono text-slate-500">{subscription.id}</code>
              </p>
            </div>

            <div className="text-right">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  hasAccess
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                }`}
              >
                {hasAccess ? '● Full Access Granted' : '○ Access Restricted'}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-slate-50/50 dark:bg-slate-950/30">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Billing Cycle</span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1 capitalize">
                {subscription.plan} Recurring
              </p>
            </div>

            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Started On</span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {formatDate(subscription.startedAt)}
              </p>
            </div>

            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                {subscription.status === 'cancelled' ? 'Access Valid Until' : 'Expires / Renews On'}
              </span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {formatDate(subscription.expiresAt)}
              </p>
            </div>

            {subscription.cancelledAt && (
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-rose-400">Cancelled Date</span>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-1">
                  {formatDate(subscription.cancelledAt)}
                </p>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              {subscription.status === 'active' && (
                <p>Your subscription is active. You can cancel at any time to prevent future renewals.</p>
              )}
              {subscription.status === 'pending_renewal' && (
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  Your billing period is ending soon. Renew now to maintain uninterrupted access to daily lottery draws.
                </p>
              )}
              {subscription.status === 'cancelled' && (
                <p className="text-rose-600 dark:text-rose-400">
                  Auto-renewal is cancelled. Your benefits remain active until {formatDate(subscription.expiresAt)}.
                </p>
              )}
              {(subscription.status === 'lapsed' || subscription.status === 'expired') && (
                <p className="text-slate-500">
                  Your subscription has expired. Start a new plan to resume entry into all upcoming charity lottery draws.
                </p>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {/* Active / Pending Renewal: Show Cancel & Renew */}
              {(subscription.status === 'active' || subscription.status === 'pending_renewal') && (
                <>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={isProcessing}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    Cancel Subscription
                  </button>

                  <button
                    onClick={handleRenew}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {isProcessing ? 'Renewing...' : 'Extend / Renew'}
                  </button>
                </>
              )}

              {/* Cancelled: Show Reactivate (if before expiresAt) or Re-subscribe */}
              {subscription.status === 'cancelled' && (
                <>
                  {hasAccess ? (
                    <button
                      onClick={handleReactivate}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition disabled:opacity-50"
                    >
                      {isProcessing ? 'Reactivating...' : 'Reactivate Subscription'}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(ROUTES.ONBOARDING_PLAN)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition"
                    >
                      Choose a Plan
                    </button>
                  )}
                </>
              )}

              {/* Lapsed / Expired: Choose Plan */}
              {(subscription.status === 'lapsed' || subscription.status === 'expired') && (
                <button
                  onClick={() => navigate(ROUTES.ONBOARDING_PLAN)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition"
                >
                  Renew Subscription
                </button>
              )}
            </div>
          </div>

          {/* Phase 3 Step 5: Charity Allocation & Contribution Percentage */}
          {hasAccess && (
            <CharityContributionSelector />
          )}
        </div>
      ) : (
        /* No Subscription State / Paywall Card */
        <div className="p-8 sm:p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            ★
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Unlock Full Subscriber Access
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Become a Digital Hero subscriber to participate in daily lottery draws, earn prize entries through games, and directly empower community charities.
          </p>

          <div className="pt-2">
            <button
              onClick={() => navigate(ROUTES.ONBOARDING_PLAN)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition transform hover:-translate-y-0.5"
            >
              Select Your Plan
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Cancellation */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center font-bold">
              !
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cancel Subscription?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to cancel your subscription? You will continue to have full access until{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDate(subscription?.expiresAt)}
                </span>
                , after which your account will not renew.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isProcessing}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm transition disabled:opacity-50"
              >
                {isProcessing ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
