import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminWinners } from '../../hooks/useAdminWinners';
import { ROUTES } from '../../constants/routes';
import type { Winner } from '../../types/winner';

export const AdminPayoutsPage: React.FC = () => {
  const { winners, loading, actionLoading, error, refresh, markPaid } = useAdminWinners();

  const [search, setSearch] = useState('');
  const [payingWinner, setPayingWinner] = useState<Winner | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Focus only on winners that are APPROVED or already PAID
  const approvedAndPaidWinners = winners.filter(
    (w) => w.verificationStatus === 'APPROVED' || w.paymentStatus === 'PAID'
  );

  const pendingPayouts = approvedAndPaidWinners.filter((w) => w.paymentStatus !== 'PAID');
  const settledPayouts = approvedAndPaidWinners.filter((w) => w.paymentStatus === 'PAID');

  const filteredWinners = approvedAndPaidWinners.filter((w) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (w.userName || '').toLowerCase().includes(q) ||
      (w.userEmail || '').toLowerCase().includes(q) ||
      (w.drawTitle || '').toLowerCase().includes(q) ||
      (w.paymentReference || '').toLowerCase().includes(q)
    );
  });

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingWinner) return;
    if (!paymentRef.trim()) {
      setModalError('Payment reference or bank transfer transaction ID is required.');
      return;
    }
    setModalError(null);
    const res = await markPaid(payingWinner.id, {
      paymentReference: paymentRef.trim(),
      adminNote: paymentNote.trim() || undefined,
    });
    if (res.success) {
      setPayingWinner(null);
      setPaymentRef('');
      setPaymentNote('');
    } else {
      setModalError(res.error || 'Failed to settle payout.');
    }
  };

  const totalPendingAmount = pendingPayouts.reduce((sum, w) => sum + Number(w.prizeAmount || 0), 0);
  const totalSettledAmount = settledPayouts.reduce((sum, w) => sum + Number(w.prizeAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Prize Payout Settlement Operations
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Execute manual bank disbursements, record transfer transaction references, and track settled payouts.
          </p>
        </div>
        <button
          onClick={() => refresh()}
          disabled={loading || actionLoading}
          className="self-start sm:self-auto px-4 py-2 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-sm text-rose-700 dark:rose-300">
          {error}
        </div>
      )}

      {/* KPI summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Approved Awaiting Payout
          </span>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {pendingPayouts.length} claims
          </div>
          <span className="text-[11px] font-semibold text-slate-400 mt-1 block">
            Total liability: ${totalPendingAmount.toFixed(2)}
          </span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Settled Prize Transfers
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {settledPayouts.length} paid
          </div>
          <span className="text-[11px] font-semibold text-slate-400 mt-1 block">
            Total disbursed: ${totalSettledAmount.toFixed(2)}
          </span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Verification Pipeline
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Need to review scorecards before they appear here?
            </p>
          </div>
          <Link
            to={ROUTES.ADMIN_WINNERS}
            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline mt-2"
          >
            Review Pending Proofs &rarr;
          </Link>
        </div>
      </div>

      {/* Search & Payout Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Payout Registry (Approved & Paid)
          </h3>
          <input
            type="text"
            placeholder="Search by winner, email, ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Winner Account</th>
                <th className="p-3">Draw / Month</th>
                <th className="p-3">Rank Tier</th>
                <th className="p-3">Prize Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Payment Ref / Date</th>
                <th className="p-3 text-right">Disbursement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {loading && approvedAndPaidWinners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    Loading payout registry...
                  </td>
                </tr>
              ) : filteredWinners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    No approved or paid prize claims currently on record.
                  </td>
                </tr>
              ) : (
                filteredWinners.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {w.userName || 'Subscriber'}
                      </div>
                      <div className="text-[11px] text-slate-400">{w.userEmail || w.userId.slice(0, 8)}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{w.drawTitle}</div>
                      <div className="text-[11px] text-slate-400">{w.drawScheduledMonth || 'N/A'}</div>
                    </td>
                    <td className="p-3 font-semibold">Tier #{w.rank} ({w.matchCount}/5)</td>
                    <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                      ${Number(w.prizeAmount).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          w.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {w.paymentStatus === 'PAID' ? 'PAID / SETTLED' : 'AWAITING PAYOUT'}
                      </span>
                    </td>
                    <td className="p-3">
                      {w.paymentReference ? (
                        <div>
                          <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                            {w.paymentReference}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {w.paidAt ? new Date(w.paidAt).toLocaleDateString() : 'Recorded'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unprocessed</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {w.paymentStatus !== 'PAID' ? (
                        <button
                          onClick={() => {
                            setPayingWinner(w);
                            setPaymentRef(`WIRE-${Date.now()}`);
                            setPaymentNote('');
                            setModalError(null);
                          }}
                          disabled={actionLoading}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                        >
                          Disburse Prize
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Complete
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disburse Modal */}
      {payingWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handlePaySubmit}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Settle Manual Prize Disbursement
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Confirm bank transfer of{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                ${Number(payingWinner.prizeAmount).toFixed(2)}
              </strong>{' '}
              to {payingWinner.userName || payingWinner.userEmail}.
            </p>

            {modalError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-xs text-rose-700 dark:text-rose-300 rounded-lg">
                {modalError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bank / Wire Reference *
              </label>
              <input
                type="text"
                required
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="TX-BANK-009988"
                className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Internal Note (Optional)
              </label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Sent via ACH / Fast payment"
                className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayingWinner(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading ? 'Recording...' : 'Confirm Disbursement'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
