import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCharities } from '../../hooks/useCharities';
import { useAuth } from '../../hooks/useAuth';
import type { Charity, Donation } from '../../types/charity';
import { ROUTES } from '../../constants/routes';

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500];

export const CharityDonatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getCharityById, donate, confirmDonationPayment } = useCharities();

  const [charity, setCharity] = useState<Charity | null>(null);
  const [loadingCharity, setLoadingCharity] = useState(true);

  // Form State
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [donorName, setDonorName] = useState<string>(user?.email?.split('@')[0] || '');
  const [message, setMessage] = useState<string>('');

  // Payment Simulation State
  const [step, setStep] = useState<'form' | 'checkout' | 'success'>('form');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [pendingDonation, setPendingDonation] = useState<Donation | null>(null);
  const [completedDonation, setCompletedDonation] = useState<Donation | null>(null);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    getCharityById(id).then((c) => {
      if (isMounted) {
        setCharity(c);
        setLoadingCharity(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [id]);

  const activeAmount = isCustom ? parseFloat(customAmount) || 0 : selectedAmount;

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!charity) return;

    if (!activeAmount || activeAmount <= 0) {
      setErrorMessage('Please enter a valid donation amount greater than ₹0.');
      return;
    }

    setProcessing(true);
    try {
      const res = await donate(charity.id, activeAmount, donorName.trim() || undefined, message.trim() || undefined);
      if (res.success && res.donation) {
        setPendingDonation(res.donation);
        setStep('checkout');
      } else {
        setErrorMessage(res.error || 'Failed to initiate donation.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmMockPayment = async () => {
    if (!pendingDonation) return;

    setProcessing(true);
    setErrorMessage(null);
    try {
      const res = await confirmDonationPayment(pendingDonation.id, cardNumber);
      if (res.success && res.donation) {
        setCompletedDonation(res.donation);
        setStep('success');
      } else {
        setErrorMessage(res.error || 'Payment was declined. Please try a different card.');
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loadingCharity) {
    return (
      <div className="max-w-xl mx-auto p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mx-auto"></div>
        <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
      </div>
    );
  }

  if (!charity) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Charity not found</h3>
        <Link to={ROUTES.CHARITIES} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          &larr; Return to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <Link
          to={`/charities/${charity.id}`}
          className="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 mb-3"
        >
          &larr; Back to {charity.name}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center font-bold text-blue-600 text-lg overflow-hidden shrink-0">
            {charity.logoUrl ? (
              <img src={charity.logoUrl} alt={charity.name} className="w-full h-full object-cover" />
            ) : (
              charity.name.charAt(0)
            )}
          </div>
          <div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider">
              {charity.category}
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              Support {charity.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* STEP 1: Form */}
      {step === 'form' && (
        <form
          onSubmit={handleProceedToPayment}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6"
        >
          {/* Amount Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Select Donation Amount (INR)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt);
                    setIsCustom(false);
                  }}
                  className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                    !isCustom && selectedAmount === amt
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  ₹{amt.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`text-xs font-semibold hover:underline ${
                  isCustom ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500'
                }`}
              >
                + Enter custom amount
              </button>

              {isCustom && (
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-sm text-slate-500">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount (e.g. 1500)"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {/* Donor Info (Optional) */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Your Name (Optional)
              </label>
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="Anonymous or your display name"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Message for Organization (Optional)
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Keep up the great work!"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={processing || activeAmount <= 0}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            {processing ? 'Preparing...' : `Donate ₹${activeAmount.toLocaleString()} &rarr;`}
          </button>
        </form>
      )}

      {/* STEP 2: Mock Payment Checkout */}
      {step === 'checkout' && pendingDonation && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                Simulated Payment Gateway
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Mock Checkout
              </h2>
            </div>
            <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              ₹{pendingDonation.amount.toFixed(2)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 space-y-1">
            <p className="font-bold">Test Mode Active</p>
            <p>Use card ending in <code className="font-mono font-bold">4242</code> for instant success.</p>
            <p>Use card ending in <code className="font-mono font-bold">0002</code> to simulate a decline.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Card Number
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Expiry
                </label>
                <input
                  type="text"
                  defaultValue="12/28"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  CVC
                </label>
                <input
                  type="text"
                  defaultValue="123"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('form')}
              disabled={processing}
              className="w-1/3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmMockPayment}
              disabled={processing}
              className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              {processing ? 'Processing...' : `Pay ₹${pendingDonation.amount.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Donation Success Confirmation Receipt */}
      {step === 'success' && completedDonation && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto text-emerald-600 text-3xl font-bold">
            ✓
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Donation Successful!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Thank you for generously supporting {charity.name}.
            </p>
          </div>

          {/* Receipt Card */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-left space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Amount Paid:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                ₹{completedDonation.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Organization:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{charity.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Transaction Ref:</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                {completedDonation.transactionReference}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Date:</span>
              <span className="text-slate-600 dark:text-slate-300">
                {new Date(completedDonation.createdAt).toLocaleString()}
              </span>
            </div>
            {completedDonation.donorName && (
              <div className="flex justify-between">
                <span className="text-slate-400">Donor Name:</span>
                <span className="text-slate-800 dark:text-slate-200">{completedDonation.donorName}</span>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <Link
              to={`/charities/${charity.id}`}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              Back to Profile
            </Link>
            <Link
              to={ROUTES.CHARITIES}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              Explore More Charities &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
