import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { useDraws } from '../../hooks/useDraws';
import { useWinners } from '../../hooks/useWinners';
import { useCharities } from '../../hooks/useCharities';
import { ROUTES } from '../../constants/routes';
import { ScoreSection } from '../../components/score/ScoreSection';
import { WinnerProofUploadModal } from '../../components/winner/WinnerProofUploadModal';
import type { Winner } from '../../types/winner';
import type { SubscriptionCharityPreference } from '../../types/charity';

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const { activeDraw, loading: drawLoading, getMyEntry } = useDraws();
  const { winners, loading: winnersLoading, uploadProof, totalWon, pendingPayment, paidAmount } = useWinners();
  const { getPreference } = useCharities();
  const [charityPref, setCharityPref] = useState<SubscriptionCharityPreference | null>(null);

  React.useEffect(() => {
    async function loadCharity() {
      const pref = await getPreference();
      if (pref) setCharityPref(pref);
    }
    loadCharity();
  }, [getPreference]);

  // Active draw user ticket
  const [activeEntryNumbers, setActiveEntryNumbers] = useState<number[] | null>(null);
  const [hasLoadedEntry, setHasLoadedEntry] = useState<boolean>(false);

  // Winner proof modal
  const [selectedWinnerForProof, setSelectedWinnerForProof] = useState<Winner | null>(null);

  // Fetch ticket numbers for active draw
  React.useEffect(() => {
    async function checkActiveTicket() {
      if (activeDraw && !hasLoadedEntry) {
        const res = await getMyEntry(activeDraw.id);
        if (res.entry?.numbers) {
          setActiveEntryNumbers(res.entry.numbers);
        }
        setHasLoadedEntry(true);
      }
    }
    checkActiveTicket();
  }, [activeDraw, hasLoadedEntry, getMyEntry]);

  // Urgent pending proof winners
  const pendingProofWinners = winners.filter(
    (w) => w.verificationStatus === 'PENDING_PROOF' || w.verificationStatus === 'REJECTED'
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Dashboard Header Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl border border-slate-800 shadow-xl text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {profile?.name || user?.email?.split('@')[0]}!
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
              {profile?.role || 'visitor'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Account ID: <code className="font-mono text-xs">{user?.id}</code> &bull; Verified Subscriber Portal
          </p>
        </div>

        <Link
          to={ROUTES.PROFILE}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors border border-white/20 whitespace-nowrap"
        >
          View Profile &rarr;
        </Link>
      </div>

      {/* Urgent Winner Verification Alert */}
      {pendingProofWinners.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-md">
                &#9733;
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Congratulations! You Have Won a Draw Prize!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Please upload your scorecard proof so our admins can verify your win and disburse your prize payout.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedWinnerForProof(pendingProofWinners[0])}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow transition"
            >
              Upload Proof Now &rarr;
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1 — SUBSCRIPTION */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Subscription Status</h2>
            <p className="text-xs text-slate-500">Your monthly membership tier and automated draw eligibility.</p>
          </div>
          <Link
            to={ROUTES.SUBSCRIPTION}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Manage Subscription &rarr;
          </Link>
        </div>

        {subLoading ? (
          <div className="text-xs text-slate-400 py-4 text-center">Loading subscription details...</div>
        ) : subscription && subscription.status === 'active' ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-medium">Plan</span>
              <div className="font-bold text-slate-900 dark:text-white capitalize mt-0.5">
                {subscription.plan} Plan
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-medium">Status</span>
              <div className="mt-0.5">
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {subscription.status}
                </span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-medium">Started Date</span>
              <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 text-xs">
                {subscription.startedAt
                  ? new Date(subscription.startedAt).toLocaleDateString()
                  : 'Active'}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-medium">Next Renewal</span>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 text-xs">
                {subscription.expiresAt
                  ? new Date(subscription.expiresAt).toLocaleDateString()
                  : 'Active'}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-center space-y-2">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Your subscription is inactive or lapsed.
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-400 max-w-md mx-auto">
              Activate your subscription to automatically receive monthly lottery tickets, support verified charities, and compete for jackpots!
            </p>
            <Link
              to={ROUTES.ONBOARDING_PLAN}
              className="inline-block mt-2 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              Choose a Plan &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* SECTION 2 — SCORES */}
      <ScoreSection />

      {/* SECTION 3 — CHARITY */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Supported Charity Cause</h2>
            <p className="text-xs text-slate-500">
              Your chosen non-profit organization receiving dedicated subscription proceeds.
            </p>
          </div>
          <Link
            to={ROUTES.SUBSCRIPTION_CHARITY}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Change Cause &rarr;
          </Link>
        </div>

        {charityPref?.charity ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Current Beneficiary
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {charityPref.charity.name}
              </h3>
              <p className="text-xs text-slate-500">
                Category: <span className="capitalize">{charityPref.charity.category}</span> &bull; Supported by your monthly fee.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-center">
              <span className="text-xs text-slate-400">Contribution</span>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {charityPref.contributionPercentage || 10}%
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-center space-y-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">No Charity Cause Selected Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Select a verified charity partner from our directory to receive 10%–100% of your subscription!
            </p>
            <Link
              to={ROUTES.CHARITIES}
              className="inline-block mt-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              Browse Charities Directory &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* SECTION 4 — DRAW PARTICIPATION */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Draw Participation</h2>
            <p className="text-xs text-slate-500">Upcoming lottery draw details and your assigned ticket numbers.</p>
          </div>
          <Link
            to={ROUTES.MY_ENTRIES}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            My Entries &rarr;
          </Link>
        </div>

        {drawLoading ? (
          <div className="text-xs text-slate-400 py-4 text-center">Loading draw details...</div>
        ) : activeDraw ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                  {activeDraw.scheduled_month} Draw
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {activeDraw.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Draw Date: {new Date(activeDraw.draw_date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Current 5-Match Jackpot</span>
                <div className="text-xl font-black text-amber-500">
                  ₹{((activeDraw.five_match_pool || 0) + (activeDraw.jackpot_rollover_amount || 0)).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Assigned Ticket Numbers */}
            {activeEntryNumbers && activeEntryNumbers.length === 5 ? (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Your Confirmed Ticket Numbers
                </span>
                <div className="flex items-center justify-center gap-2.5">
                  {activeEntryNumbers.map((num) => (
                    <div
                      key={num}
                      className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center shadow"
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-100 dark:bg-slate-800/40 rounded-lg text-center text-xs text-slate-500">
                Enrollment is automatic for active subscribers. Ticket numbers will appear as soon as the draw window opens.
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-center text-xs text-slate-500">
            No upcoming draw currently scheduled. Check back shortly.
          </div>
        )}
      </div>

      {/* SECTION 5 — WINNINGS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Your Prize Winnings</h2>
            <p className="text-xs text-slate-500">Confirmed draw prizes, verification status, and payout records.</p>
          </div>
          <Link
            to={ROUTES.MY_WINNINGS}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            All Winnings &rarr;
          </Link>
        </div>

        {/* Winnings KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium uppercase">Total Prize Won</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              ₹{totalWon.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium uppercase">Pending Payment</span>
            <div className="text-2xl font-bold text-amber-500 mt-1">
              ₹{pendingPayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium uppercase">Total Paid Out</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Recent Winner Records List */}
        {winnersLoading ? (
          <div className="text-xs text-slate-400 py-4 text-center">Loading winnings...</div>
        ) : winners.length === 0 ? (
          <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-center text-xs text-slate-500">
            No confirmed winnings yet. As monthly draws complete, your matching results and awarded prizes will appear here.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {winners.slice(0, 3).map((w) => (
              <div key={w.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {w.drawTitle || 'Monthly Draw'} &bull; {w.matchCount} Matches
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Prize Award: <strong className="text-emerald-600">₹{w.prizeAmount.toLocaleString('en-IN')}</strong> &bull; Rank #{w.rank}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                      w.verificationStatus === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : w.verificationStatus === 'PENDING_REVIEW'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : w.verificationStatus === 'REJECTED'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {w.verificationStatus === 'PENDING_PROOF' ? 'Proof Required' : w.verificationStatus}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                      w.paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Payment: {w.paymentStatus}
                  </span>

                  {(w.verificationStatus === 'PENDING_PROOF' || w.verificationStatus === 'REJECTED') && (
                    <button
                      onClick={() => setSelectedWinnerForProof(w)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-sm"
                    >
                      {w.verificationStatus === 'REJECTED' ? 'Re-Upload Proof' : 'Upload Proof'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proof Upload Modal */}
      {selectedWinnerForProof && (
        <WinnerProofUploadModal
          winner={selectedWinnerForProof}
          isOpen={!!selectedWinnerForProof}
          onClose={() => setSelectedWinnerForProof(null)}
          onUpload={uploadProof}
        />
      )}
    </div>
  );
};
