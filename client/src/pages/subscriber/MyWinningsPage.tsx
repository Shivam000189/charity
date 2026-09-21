import React, { useState } from 'react';
import { useWinners } from '../../hooks/useWinners';
import { WinnerProofUploadModal } from '../../components/winner/WinnerProofUploadModal';
import type { Winner } from '../../types/winner';

export const MyWinningsPage: React.FC = () => {
  const { winners, loading, error, refresh, uploadProof } = useWinners();
  const [selectedWinner, setSelectedWinner] = useState<Winner | null>(null);

  const totalWon = winners.reduce((sum, w) => sum + Number(w.prizeAmount || 0), 0);
  const pendingClaims = winners.filter(
    (w) => w.verificationStatus === 'PENDING_PROOF' || w.verificationStatus === 'REJECTED'
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">My Prize Winnings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Audit your winning draw results, upload scorecard proofs, and track manual prize payouts.
          </p>
        </div>
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800 text-right">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Won</span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            ${totalWon.toFixed(2)}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-sm text-rose-700 dark:rose-300">
          {error}
        </div>
      )}

      {/* Action Banner for Pending Proofs */}
      {pendingClaims.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
              Action Required
            </span>
            <p className="text-xs text-amber-900 dark:text-amber-200">
              You have {pendingClaims.length} prize claim(s) requiring scorecard proof verification before payout.
            </p>
          </div>
          <button
            onClick={() => setSelectedWinner(pendingClaims[0])}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors whitespace-nowrap"
          >
            Upload Now &rarr;
          </button>
        </div>
      )}

      {/* Winnings List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Prize History</h2>
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loading && winners.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading prize winnings...</div>
        ) : winners.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">No Confirmed Winnings Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              When your numbers match 3, 4, or 5 numbers in a published monthly draw, your cash prizes and claiming instructions will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {winners.map((w) => (
              <div key={w.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900 dark:text-white">
                      {w.drawTitle || 'Monthly Draw'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      Tier #{w.rank} ({w.matchCount} Match)
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>Draw Date: {w.drawDate ? new Date(w.drawDate).toLocaleDateString() : (w.drawScheduledMonth || 'N/A')}</span>
                    {w.paymentReference && (
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        Payout Ref: {w.paymentReference}
                      </span>
                    )}
                  </div>

                  {w.rejectionReason && (
                    <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      Verification note: {w.rejectionReason}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                      ${Number(w.prizeAmount).toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                      {/* Verification Status */}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          w.verificationStatus === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : w.verificationStatus === 'PENDING_REVIEW'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : w.verificationStatus === 'REJECTED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {w.verificationStatus.replace('_', ' ')}
                      </span>

                      {/* Payment Status */}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          w.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {w.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Proof upload trigger */}
                  {(w.verificationStatus === 'PENDING_PROOF' || w.verificationStatus === 'REJECTED') && (
                    <button
                      onClick={() => setSelectedWinner(w)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                    >
                      {w.verificationStatus === 'REJECTED' ? 'Re-upload' : 'Upload Proof'}
                    </button>
                  )}

                  {w.verificationStatus === 'PENDING_REVIEW' && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 italic">
                      Under Review
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Proof Modal */}
      {selectedWinner && (
        <WinnerProofUploadModal
          winner={selectedWinner}
          isOpen={!!selectedWinner}
          onClose={() => setSelectedWinner(null)}
          onUpload={async (winnerId, file) => {
            const res = await uploadProof(winnerId, file);
            if (res.success) {
              refresh();
            }
            return res;
          }}
        />
      )}
    </div>
  );
};
