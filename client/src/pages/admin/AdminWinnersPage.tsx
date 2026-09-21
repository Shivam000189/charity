import React, { useState } from 'react';
import { useAdminWinners } from '../../hooks/useAdminWinners';
import type { Winner } from '../../types/winner';

export const AdminWinnersPage: React.FC = () => {
  const {
    winners,
    loading,
    actionLoading,
    error,
    refresh,
    approve,
    reject,
    markPaid,
  } = useAdminWinners();

  const [filterTab, setFilterTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedProofWinner, setSelectedProofWinner] = useState<Winner | null>(null);
  const [rejectingWinner, setRejectingWinner] = useState<Winner | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [payingWinner, setPayingWinner] = useState<Winner | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [modalFeedback, setModalFeedback] = useState<{ error?: string; success?: string } | null>(null);

  const filteredWinners = winners.filter((w) => {
    // Tab filter
    if (filterTab === 'PENDING_REVIEW' && w.verificationStatus !== 'PENDING_REVIEW') return false;
    if (filterTab === 'APPROVED' && w.verificationStatus !== 'APPROVED') return false;
    if (filterTab === 'REJECTED' && w.verificationStatus !== 'REJECTED') return false;
    if (filterTab === 'PAID' && w.paymentStatus !== 'PAID') return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (w.userName || '').toLowerCase().includes(q);
      const matchEmail = (w.userEmail || '').toLowerCase().includes(q);
      const matchDraw = (w.drawTitle || '').toLowerCase().includes(q);
      const matchRef = (w.paymentReference || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchDraw || matchRef;
    }

    return true;
  });

  const handleApprove = async (winner: Winner) => {
    if (!window.confirm(`Approve winner ${winner.userName || winner.userEmail}? This will confirm their eligibility for payout.`)) {
      return;
    }
    const res = await approve(winner.id);
    if (!res.success) {
      alert(`Approval error: ${res.error}`);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingWinner) return;
    if (!rejectReason.trim()) {
      setModalFeedback({ error: 'Please provide a clear reason for rejecting the score proof.' });
      return;
    }
    setModalFeedback(null);
    const res = await reject(rejectingWinner.id, rejectReason.trim());
    if (res.success) {
      setRejectingWinner(null);
      setRejectReason('');
    } else {
      setModalFeedback({ error: res.error || 'Failed to reject proof.' });
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingWinner) return;
    if (!paymentRef.trim()) {
      setModalFeedback({ error: 'Payment reference / bank transfer ID is required.' });
      return;
    }
    setModalFeedback(null);
    const res = await markPaid(payingWinner.id, {
      paymentReference: paymentRef.trim(),
      adminNote: paymentNote.trim() || undefined,
    });
    if (res.success) {
      setPayingWinner(null);
      setPaymentRef('');
      setPaymentNote('');
    } else {
      setModalFeedback({ error: res.error || 'Failed to record payout settlement.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Winner Proof & Payout Auditing
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Review submitted Golf scorecards, verify winning draw entries, and settle manual prize payouts.
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

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: `All (${winners.length})` },
            {
              id: 'PENDING_REVIEW',
              label: `Pending Review (${winners.filter((w) => w.verificationStatus === 'PENDING_REVIEW').length})`,
            },
            {
              id: 'APPROVED',
              label: `Approved (${winners.filter((w) => w.verificationStatus === 'APPROVED').length})`,
            },
            {
              id: 'PAID',
              label: `Paid (${winners.filter((w) => w.paymentStatus === 'PAID').length})`,
            },
            {
              id: 'REJECTED',
              label: `Rejected (${winners.filter((w) => w.verificationStatus === 'REJECTED').length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                filterTab === tab.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search by winner, draw, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Draw / Month</th>
              <th className="p-3">Winner</th>
              <th className="p-3">Rank / Match</th>
              <th className="p-3">Prize</th>
              <th className="p-3">Verification</th>
              <th className="p-3">Proof Card</th>
              <th className="p-3">Payment</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {loading && winners.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                  Loading verified winners registry...
                </td>
              </tr>
            ) : filteredWinners.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                  No winner records matching the current selection.
                </td>
              </tr>
            ) : (
              filteredWinners.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-slate-900 dark:text-white">{w.drawTitle || 'Monthly Draw'}</div>
                    <div className="text-[11px] text-slate-400">{w.drawScheduledMonth || 'N/A'}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{w.userName || 'Subscriber'}</div>
                    <div className="text-[11px] text-slate-400">{w.userEmail || w.userId.slice(0, 8)}</div>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Tier #{w.rank}</span>
                    <span className="ml-1 text-[11px] text-slate-400">({w.matchCount}/5 match)</span>
                  </td>
                  <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                    ${Number(w.prizeAmount).toFixed(2)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        w.verificationStatus === 'APPROVED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : w.verificationStatus === 'PENDING_REVIEW'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse'
                          : w.verificationStatus === 'REJECTED'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {w.verificationStatus.replace('_', ' ')}
                    </span>
                    {w.rejectionReason && (
                      <div className="text-[10px] text-rose-500 mt-1 truncate max-w-[140px]" title={w.rejectionReason}>
                        Reason: {w.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {w.proofSignedUrl ? (
                      <button
                        onClick={() => setSelectedProofWinner(w)}
                        className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                      >
                        <span>View Card</span>
                      </button>
                    ) : w.proofStoragePath ? (
                      <span className="text-slate-400">Uploaded</span>
                    ) : (
                      <span className="text-slate-400 italic">None</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        w.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {w.paymentStatus}
                    </span>
                    {w.paymentReference && (
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        Ref: {w.paymentReference}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {w.verificationStatus === 'PENDING_REVIEW' && (
                        <>
                          <button
                            onClick={() => handleApprove(w)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectingWinner(w);
                              setRejectReason('');
                              setModalFeedback(null);
                            }}
                            disabled={actionLoading}
                            className="px-2.5 py-1 text-[11px] font-bold rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {w.verificationStatus === 'APPROVED' && w.paymentStatus !== 'PAID' && (
                        <button
                          onClick={() => {
                            setPayingWinner(w);
                            setPaymentRef(`PAY-${Date.now()}`);
                            setPaymentNote('');
                            setModalFeedback(null);
                          }}
                          disabled={actionLoading}
                          className="px-2.5 py-1 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                      )}

                      {w.paymentStatus === 'PAID' && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Settled
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Proof Card Preview Modal */}
      {selectedProofWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Scorecard Proof: {selectedProofWinner.userName || selectedProofWinner.userEmail}
                </h3>
                <p className="text-xs text-slate-500">
                  Uploaded at {selectedProofWinner.proofUploadedAt ? new Date(selectedProofWinner.proofUploadedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setSelectedProofWinner(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto flex items-center justify-center bg-slate-950 rounded-xl p-2">
              <img
                src={selectedProofWinner.proofSignedUrl || ''}
                alt="Winner Proof Card"
                className="max-h-[55vh] object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Generated 1-hour secure signed URL from storage bucket
              </span>
              <button
                onClick={() => setSelectedProofWinner(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleRejectSubmit}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Reject Score Proof
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please enter the reason for rejection (e.g. illegible scorecard, date discrepancy, invalid signature). The winner will be notified to re-upload.
            </p>

            {modalFeedback?.error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-xs text-rose-700 dark:text-rose-300 rounded-lg">
                {modalFeedback.error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rejection Reason *
              </label>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Card image blurry / does not match declared Stableford score..."
                className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingWinner(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mark Paid Modal */}
      {payingWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handlePaySubmit}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Confirm Prize Payout Settlement
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record the manual payment reference for prize distribution of{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                ${Number(payingWinner.prizeAmount).toFixed(2)}
              </strong>{' '}
              to {payingWinner.userName || payingWinner.userEmail}.
            </p>

            {modalFeedback?.error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-xs text-rose-700 dark:text-rose-300 rounded-lg">
                {modalFeedback.error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment / Transaction Reference *
              </label>
              <input
                type="text"
                required
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="BANK-TX-998822 or STRIPE-XFER-11"
                className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                placeholder="Processed via wire transfer"
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
                className="px-4 py-2 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {actionLoading ? 'Recording...' : 'Confirm Payout'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
