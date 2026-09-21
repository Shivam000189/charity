import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../hooks/useOnboarding';
import { ROUTES } from '../../constants/routes';
import { api } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentState = 'idle' | 'processing' | 'failure';

interface CheckoutSessionResponse {
  success: boolean;
  sessionId: string;
  plan: string;
  displayAmount: string;
  currency: string;
  provider: string;
}

interface PaymentResponse {
  success: boolean;
  payment?: { status: string; provider: string; transactionId?: string };
  subscription?: { plan: string; dbPlan: string; status: string; startedAt: string; expiresAt: string };
  message?: string;
}

interface FormState {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats a raw digit string into groups of 4: "4242424242424242" → "4242 4242 4242 4242" */
function formatCardNumber(raw: string): string {
  return raw
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

/** Formats expiry input as MM/YY */
function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isValidExpiryFormat(value: string): boolean {
  return /^\d{2}\/\d{2}$/.test(value);
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * MockCheckoutPage — Phase 1 Step 3 demo payment form.
 *
 * Simulates a real checkout experience using MockPaymentProvider.
 * No real Stripe calls. No real card processing. No card data stored.
 *
 * Test cards:
 *   4242 4242 4242 4242  →  SUCCESS
 *   4000 0000 0000 0002  →  FAILURE (declined)
 *
 * SECURITY:
 *   Card values are sent to the backend once per payment attempt.
 *   They are never logged, stored in state between attempts, or cached.
 */
export const MockCheckoutPage: React.FC = () => {
  const { selectedPlan, clearSelection } = useOnboarding();
  const navigate = useNavigate();

  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Prevent double-submit
  const isSubmitting = useRef(false);

  // ─── Guards ─────────────────────────────────────────────────────────────────

  if (!selectedPlan) {
    navigate(ROUTES.ONBOARDING_PLAN, { replace: true });
    return null;
  }

  // ─── Form handlers ───────────────────────────────────────────────────────────

  const handleCardNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setForm(prev => ({ ...prev, cardNumber: formatted }));
    if (formErrors.cardNumber) setFormErrors(prev => ({ ...prev, cardNumber: undefined }));
  };

  const handleExpiry = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value);
    // Split into month/year for the API
    const digits = formatted.replace(/\D/g, '');
    setForm(prev => ({
      ...prev,
      expiryMonth: digits.slice(0, 2),
      expiryYear: digits.slice(2) ? `20${digits.slice(2)}` : '',
    }));
    if (formErrors.expiryMonth) setFormErrors(prev => ({ ...prev, expiryMonth: undefined }));
  };

  const handleCvv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setForm(prev => ({ ...prev, cvv: val }));
    if (formErrors.cvv) setFormErrors(prev => ({ ...prev, cvv: undefined }));
  };

  const handleCardholderName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, cardholderName: e.target.value }));
    if (formErrors.cardholderName) setFormErrors(prev => ({ ...prev, cardholderName: undefined }));
  };

  // ─── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    const rawCard = form.cardNumber.replace(/\D/g, '');
    if (rawCard.length !== 16) {
      errors.cardNumber = 'Enter a valid 16-digit card number.';
    }
    const expiryDisplay = `${form.expiryMonth}/${form.expiryYear.slice(-2)}`;
    if (!isValidExpiryFormat(expiryDisplay) || form.expiryMonth === '' || form.expiryYear === '') {
      errors.expiryMonth = 'Enter a valid expiry (MM/YY).';
    }
    if (!form.cvv || form.cvv.length < 3) {
      errors.cvv = 'Enter a valid CVV (3–4 digits).';
    }
    if (!form.cardholderName.trim()) {
      errors.cardholderName = 'Cardholder name is required.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double-click / duplicate submit
    if (isSubmitting.current || paymentState === 'processing') return;
    if (!validate()) return;

    isSubmitting.current = true;
    setPaymentState('processing');
    setFailureMessage(null);

    try {
      // Step 1: Create checkout session (get sessionId from backend)
      const checkoutRes = await api.post<CheckoutSessionResponse>('/subscriptions/checkout', {
        plan: selectedPlan.id,
      });

      const sessionId = checkoutRes.sessionId as string | undefined;
      if (!checkoutRes.success || !sessionId) {
        throw new Error('Failed to create checkout session. Please try again.');
      }

      // Step 2: Process mock payment
      // Card details are sent once; never cached, logged, or stored here
      const paymentRes = await api.post<PaymentResponse>('/subscriptions/pay', {
        sessionId,
        plan: selectedPlan.id,
        cardNumber: form.cardNumber.replace(/\D/g, ''),
        expiryMonth: form.expiryMonth,
        expiryYear: form.expiryYear,
        cvv: form.cvv,
        cardholderName: form.cardholderName.trim(),
      });

      if (!paymentRes.success || !paymentRes.subscription) {
        const errorMsg =
          (paymentRes as unknown as { message?: string }).message ||
          'Payment failed. Please try again.';
        setFailureMessage(errorMsg);
        setPaymentState('failure');
        return;
      }

      // Clear onboarding state — payment complete
      clearSelection();

      const subData = paymentRes.subscription as Record<string, unknown> | undefined;
      const payData = paymentRes.payment as Record<string, unknown> | undefined;

      // Navigate to success page with subscription data in state
      navigate(ROUTES.SUBSCRIPTION_SUCCESS, {
        state: {
          plan: selectedPlan.id,
          planName: selectedPlan.name,
          subscriptionStatus: subData?.status as string | undefined,
          expiresAt: subData?.expiresAt as string | undefined,
          transactionId: payData?.transactionId as string | undefined,
        },
        replace: true,
      });
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        'An unexpected error occurred. Please try again.';
      setFailureMessage(msg);
      setPaymentState('failure');
    } finally {
      isSubmitting.current = false;
    }
  }, [form, selectedPlan, paymentState, navigate, clearSelection]);

  const handleTryAgain = () => {
    setPaymentState('idle');
    setFailureMessage(null);
    // Clear card number so user re-enters — do NOT pre-fill from state
    setForm(prev => ({ ...prev, cardNumber: '', cvv: '' }));
    setFormErrors({});
  };

  const handleChangePlan = () => {
    navigate(ROUTES.ONBOARDING_PLAN);
  };

  // ─── Expiry display value ────────────────────────────────────────────────────

  const expiryDisplay =
    form.expiryMonth && form.expiryYear
      ? `${form.expiryMonth}/${form.expiryYear.slice(-2)}`
      : form.expiryMonth || '';

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto py-8 px-4 sm:px-6 space-y-6">

      {/* Demo Banner */}
      <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-semibold">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        🧪 DEMO CHECKOUT — Test Mode · No real money charged
      </div>

      {/* Step Indicator */}
      <div className="text-center space-y-1">
        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full uppercase tracking-wider">
          Step 3 of 3: Payment
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Secure Checkout
        </h1>
      </div>

      {/* Failure State */}
      {paymentState === 'failure' && (
        <div className="p-5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 space-y-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">Payment Failed</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1 leading-relaxed">
                {failureMessage || 'Your payment could not be processed. Please try again.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTryAgain}
              className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={handleChangePlan}
              className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Change Plan
            </button>
          </div>
        </div>
      )}

      {/* Checkout Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Plan Summary */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Selected Plan
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {selectedPlan.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
              {selectedPlan.displayPrice}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedPlan.billingInterval}
            </p>
          </div>
        </div>

        {/* Card Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {/* Card Number */}
          <div>
            <label htmlFor="mock-card-number" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Card Number
            </label>
            <input
              id="mock-card-number"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4242 4242 4242 4242"
              value={form.cardNumber}
              onChange={handleCardNumber}
              disabled={paymentState === 'processing'}
              maxLength={19}
              className={`w-full px-4 py-3 rounded-xl border text-sm font-mono tracking-widest bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 ${
                formErrors.cardNumber
                  ? 'border-red-400 dark:border-red-600'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {formErrors.cardNumber && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.cardNumber}</p>
            )}
          </div>

          {/* Expiry + CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="mock-expiry" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Expiry Date
              </label>
              <input
                id="mock-expiry"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={expiryDisplay}
                onChange={handleExpiry}
                disabled={paymentState === 'processing'}
                maxLength={5}
                className={`w-full px-4 py-3 rounded-xl border text-sm font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 ${
                  formErrors.expiryMonth
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {formErrors.expiryMonth && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.expiryMonth}</p>
              )}
            </div>

            <div>
              <label htmlFor="mock-cvv" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                CVV
              </label>
              <input
                id="mock-cvv"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="•••"
                value={form.cvv}
                onChange={handleCvv}
                disabled={paymentState === 'processing'}
                maxLength={4}
                className={`w-full px-4 py-3 rounded-xl border text-sm font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 ${
                  formErrors.cvv
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {formErrors.cvv && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.cvv}</p>
              )}
            </div>
          </div>

          {/* Cardholder Name */}
          <div>
            <label htmlFor="mock-cardholder-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Cardholder Name
            </label>
            <input
              id="mock-cardholder-name"
              type="text"
              autoComplete="cc-name"
              placeholder="Full name as on card"
              value={form.cardholderName}
              onChange={handleCardholderName}
              disabled={paymentState === 'processing'}
              className={`w-full px-4 py-3 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 ${
                formErrors.cardholderName
                  ? 'border-red-400 dark:border-red-600'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {formErrors.cardholderName && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.cardholderName}</p>
            )}
          </div>

          {/* Order Total */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Due Today</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">{selectedPlan.displayPrice}</span>
          </div>

          {/* Submit Button */}
          <button
            id="mock-pay-btn"
            type="submit"
            disabled={paymentState === 'processing'}
            className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-sm transition-colors text-base flex items-center justify-center gap-2"
          >
            {paymentState === 'processing' ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Processing payment…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Pay &amp; Subscribe
              </>
            )}
          </button>

          {/* Back button */}
          <button
            type="button"
            onClick={() => navigate(ROUTES.ONBOARDING_CHECKOUT)}
            disabled={paymentState === 'processing'}
            className="w-full py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-40"
          >
            &larr; Back to Order Summary
          </button>
        </form>
      </div>

      {/* Demo Card Hint */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <p className="font-semibold text-slate-600 dark:text-slate-300">Demo Test Cards</p>
        <p><span className="font-mono tracking-wider">4242 4242 4242 4242</span> — Payment succeeds</p>
        <p><span className="font-mono tracking-wider">4000 0000 0000 0002</span> — Payment declined</p>
        <p className="mt-1 text-slate-400 dark:text-slate-500">Use any expiry (MM/YY) and any 3-digit CVV.</p>
      </div>
    </div>
  );
};
