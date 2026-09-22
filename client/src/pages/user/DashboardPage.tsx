import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { useDraws } from '../../hooks/useDraws';
import { useWinners } from '../../hooks/useWinners';
import { useCharities } from '../../hooks/useCharities';
import { useScores } from '../../hooks/useScores';
import { ROUTES } from '../../constants/routes';
import { ScoreSection } from '../../components/score/ScoreSection';
import { WinnerProofUploadModal } from '../../components/winner/WinnerProofUploadModal';
import type { Winner } from '../../types/winner';
import type { SubscriptionCharityPreference } from '../../types/charity';

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { subscription, loading: subLoading, hasAccess } = useSubscription();
  const { activeDraw, getMyEntry } = useDraws();
  const { winners, loading: winnersLoading, uploadProof, totalWon, pendingPayment, paidAmount } = useWinners();
  const { getPreference } = useCharities();
  const { scores, loading: scoresLoading } = useScores(hasAccess);

  const [charityPref, setCharityPref] = useState<SubscriptionCharityPreference | null>(null);
  const [activeEntryNumbers, setActiveEntryNumbers] = useState<number[] | null>(null);
  const [hasLoadedEntry, setHasLoadedEntry] = useState<boolean>(false);
  const [selectedWinnerForProof, setSelectedWinnerForProof] = useState<Winner | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'scores' | 'winnings'>('overview');

  useEffect(() => {
    async function loadCharity() {
      const pref = await getPreference();
      if (pref) setCharityPref(pref);
    }
    loadCharity();
  }, [getPreference]);

  useEffect(() => {
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

  const pendingProofWinners = winners.filter(
    (w) => w.verificationStatus === 'PENDING_PROOF' || w.verificationStatus === 'REJECTED'
  );

  const isSubActive = subscription?.status === 'active';
  const latestScore = scores.length > 0 ? scores[0] : null;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Header Row with Greeting and View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1a1b24] border border-slate-800/80 rounded-2xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center font-black text-sm shrink-0">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Welcome back, {profile?.name || user?.email?.split('@')[0]}!
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-950/60 border border-purple-700/50 text-purple-300">
                {profile?.role || 'visitor'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Subscriber Portal &bull; <span className="font-mono text-slate-500">{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Tab Switcher */}
          <div className="flex items-center bg-[#12131a] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('scores')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'scores'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Golf Scores
            </button>
            <button
              onClick={() => setActiveTab('winnings')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'winnings'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Winnings
            </button>
          </div>

          <Link
            to={ROUTES.PROFILE}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#242634] hover:bg-[#2c2e3f] rounded-xl border border-slate-700/60 transition-colors"
          >
            Profile
          </Link>
        </div>
      </div>

      {/* Urgent Winner Verification Alert if any */}
      {pendingProofWinners.length > 0 && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-300 font-semibold">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
              ★
            </span>
            <span>You won a draw prize! Please upload your golf scorecard proof to claim your payout.</span>
          </div>
          <button
            onClick={() => setSelectedWinnerForProof(pendingProofWinners[0])}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer shrink-0"
          >
            Upload Proof &rarr;
          </button>
        </div>
      )}

      {/* KPI Overview Strip (Single Frame Glance) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* KPI 1: Subscription */}
        <div className="p-3.5 bg-[#1a1b24] rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>Membership</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                isSubActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {subLoading ? '...' : isSubActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="text-base font-bold text-white mt-1 capitalize truncate">
            {subscription?.plan ? `${subscription.plan} Plan` : 'No Plan'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {subscription?.expiresAt
              ? `Renews ${new Date(subscription.expiresAt).toLocaleDateString()}`
              : 'Auto-draw entry'}
          </div>
        </div>

        {/* KPI 2: Charity */}
        <div className="p-3.5 bg-[#1a1b24] rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>Beneficiary</span>
            <span className="text-purple-400 font-bold">
              {charityPref ? `${charityPref.contributionPercentage || 10}%` : '10%'}
            </span>
          </div>
          <div className="text-base font-bold text-white mt-1 truncate">
            {charityPref?.charity?.name || 'Community Fund'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 capitalize truncate">
            {charityPref?.charity?.category || 'Grassroots Charity'}
          </div>
        </div>

        {/* KPI 3: Active Jackpot */}
        <div className="p-3.5 bg-[#1a1b24] rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>5-Match Jackpot</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-base font-black text-amber-400 mt-1">
            {activeDraw
              ? `₹${((activeDraw.five_match_pool || 0) + (activeDraw.jackpot_rollover_amount || 0)).toLocaleString('en-IN')}`
              : '₹1,50,000'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {activeDraw?.draw_date
              ? `Draw: ${new Date(activeDraw.draw_date).toLocaleDateString()}`
              : 'Monthly audited draw'}
          </div>
        </div>

        {/* KPI 4: Winnings */}
        <div className="p-3.5 bg-[#1a1b24] rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>Total Won</span>
            <span className="text-emerald-400 font-mono text-[10px]">Verified</span>
          </div>
          <div className="text-base font-bold text-white mt-1">
            ₹{totalWon.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {pendingPayment > 0
              ? `₹${pendingPayment.toLocaleString('en-IN')} pending`
              : 'All prizes cleared'}
          </div>
        </div>
      </div>

      {/* VIEW 1: SINGLE FRAME OVERVIEW (All 4 Core Components Grid) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* COMPONENT 1: Draw Participation & Confirmed Tickets */}
          <div className="bg-[#1a1b24] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    🎟️
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Draw Participation</h3>
                    <p className="text-[11px] text-slate-400">Your automated entry into monthly draws</p>
                  </div>
                </div>
                <Link
                  to={ROUTES.DRAWS}
                  className="text-xs font-semibold text-purple-400 hover:text-purple-300"
                >
                  All Draws &rarr;
                </Link>
              </div>

              <div className="pt-3 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Scheduled Draw:</span>
                  <span className="font-semibold text-white">
                    {activeDraw?.title || 'Monthly Community Draw'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Draw Date:</span>
                  <span className="font-semibold text-white">
                    {activeDraw?.draw_date
                      ? new Date(activeDraw.draw_date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Upcoming Schedule'}
                  </span>
                </div>

                {/* Confirmed Ball Numbers */}
                <div className="pt-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                    Your Assigned Draw Numbers
                  </span>
                  {activeEntryNumbers && activeEntryNumbers.length === 5 ? (
                    <div className="flex items-center justify-center gap-2.5 p-3 bg-[#12131a] rounded-xl border border-slate-800">
                      {activeEntryNumbers.map((num) => (
                        <div
                          key={num}
                          className="w-9 h-9 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm"
                        >
                          {num}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-[#12131a] rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                      {isSubActive
                        ? 'Your ticket balls are being allocated for the upcoming draw window.'
                        : 'Active subscription required for automatic draw entry.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">Integer-precise RNG audited</span>
              <Link
                to={ROUTES.MY_ENTRIES}
                className="font-bold text-purple-400 hover:underline text-[11px]"
              >
                View Ticket History &rarr;
              </Link>
            </div>
          </div>

          {/* COMPONENT 2: Supported Charity Cause */}
          <div className="bg-[#1a1b24] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    🤝
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Supported Charity Cause</h3>
                    <p className="text-[11px] text-slate-400">Direct non-profit funding allocation</p>
                  </div>
                </div>
                <Link
                  to={ROUTES.SUBSCRIPTION_CHARITY}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Change &rarr;
                </Link>
              </div>

              <div className="pt-3">
                {charityPref?.charity ? (
                  <div className="p-3.5 bg-[#12131a] rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        Dedicated Beneficiary
                      </span>
                      <h4 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                        {charityPref.charity.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 capitalize">
                        Category: {charityPref.charity.category}
                      </p>
                    </div>
                    <div className="text-center px-3 py-1.5 bg-[#1c1d27] rounded-lg border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 block">Routing</span>
                      <span className="text-base font-black text-emerald-400">
                        {charityPref.contributionPercentage || 10}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#12131a] rounded-xl border border-slate-800 text-center space-y-2">
                    <p className="text-xs text-slate-400">
                      You haven't designated a specific beneficiary charity yet.
                    </p>
                    <Link
                      to={ROUTES.CHARITIES}
                      className="inline-block px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg"
                    >
                      Choose Charity Partner &rarr;
                    </Link>
                  </div>
                )}

                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Transfer Model:</span>
                    <span className="text-slate-300 font-medium">100% Zero Leakage</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Audit Status:</span>
                    <span className="text-emerald-400 font-mono text-[11px]">Vetted &amp; Verified</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">Every monthly fee supports this cause</span>
              <Link
                to={ROUTES.CHARITIES}
                className="font-bold text-purple-400 hover:underline text-[11px]"
              >
                Browse All Charities &rarr;
              </Link>
            </div>
          </div>

          {/* COMPONENT 3: Golf Scorecard Performance & Rolling-5 */}
          <div className="bg-[#1a1b24] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    ⛳
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Golf Performance (Rolling 5)</h3>
                    <p className="text-[11px] text-slate-400">Stableford scorecard round tracking</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('scores')}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  Full History &rarr;
                </button>
              </div>

              <div className="pt-3 space-y-3">
                {scoresLoading ? (
                  <div className="text-xs text-slate-400 text-center py-4">Loading scores...</div>
                ) : scores.length > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-[#12131a] rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Latest Round
                        </span>
                        <span className="text-sm font-bold text-white">
                          {latestScore ? `${latestScore.score} Stableford Points` : '--'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {latestScore?.date
                          ? new Date(latestScore.date).toLocaleDateString()
                          : ''}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                        Recent 5 Rounds:
                      </span>
                      <div className="flex items-center gap-2">
                        {scores.slice(0, 5).map((s) => (
                          <div
                            key={s.id}
                            className="flex-1 py-1.5 text-center bg-[#12131a] border border-slate-800 rounded-lg text-xs font-bold text-slate-200"
                          >
                            {s.score}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#12131a] rounded-xl border border-slate-800 text-center space-y-2">
                    <p className="text-xs text-slate-400">
                      No golf scores recorded yet. Log your rounds to track performance!
                    </p>
                    <button
                      onClick={() => setActiveTab('scores')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Log Golf Round &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">18-hole Stableford rule verification</span>
              <button
                onClick={() => setActiveTab('scores')}
                className="font-bold text-purple-400 hover:underline text-[11px] cursor-pointer"
              >
                Open Scorecard Logger &rarr;
              </button>
            </div>
          </div>

          {/* COMPONENT 4: Prize Winnings & Verification Status */}
          <div className="bg-[#1a1b24] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    🏆
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Prize Winnings &amp; Claims</h3>
                    <p className="text-[11px] text-slate-400">Confirmed prizes and payout audits</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('winnings')}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  All Claims &rarr;
                </button>
              </div>

              <div className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-[#12131a] rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Paid Payouts
                    </span>
                    <span className="text-sm font-bold text-emerald-400">
                      ₹{paidAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#12131a] rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Pending Audit
                    </span>
                    <span className="text-sm font-bold text-amber-400">
                      ₹{pendingPayment.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {winnersLoading ? (
                  <div className="text-xs text-slate-400 text-center py-2">Loading winnings...</div>
                ) : winners.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {winners.slice(0, 2).map((w) => (
                      <div
                        key={w.id}
                        className="p-2 bg-[#12131a] rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white">{w.drawTitle || 'Monthly Draw'}</span>
                          <span className="text-[11px] text-slate-400 block">
                            Prize: ₹{w.prizeAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            w.verificationStatus === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {w.verificationStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-[#12131a] rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                    No prize claims recorded yet. Winning results will appear automatically post-draw.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">Official scorecard verification applied</span>
              <Link
                to={ROUTES.MY_WINNINGS}
                className="font-bold text-purple-400 hover:underline text-[11px]"
              >
                Disbursement Policy &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: GOLF SCORES TAB */}
      {activeTab === 'scores' && (
        <div className="bg-[#1a1b24] rounded-2xl border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-base font-bold text-white">Full Golf Scorecard Manager</h2>
            <button
              onClick={() => setActiveTab('overview')}
              className="text-xs text-purple-400 hover:underline cursor-pointer"
            >
              &larr; Back to Single Frame Overview
            </button>
          </div>
          <ScoreSection />
        </div>
      )}

      {/* VIEW 3: WINNINGS TAB */}
      {activeTab === 'winnings' && (
        <div className="bg-[#1a1b24] rounded-2xl border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-base font-bold text-white">Draw Winnings &amp; Proof Verification</h2>
            <button
              onClick={() => setActiveTab('overview')}
              className="text-xs text-purple-400 hover:underline cursor-pointer"
            >
              &larr; Back to Single Frame Overview
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-[#12131a] rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium uppercase">Total Prize Won</span>
              <div className="text-2xl font-bold text-white mt-1">
                ₹{totalWon.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-4 bg-[#12131a] rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium uppercase">Pending Payment</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                ₹{pendingPayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-4 bg-[#12131a] rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium uppercase">Total Paid Out</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {winnersLoading ? (
            <div className="text-xs text-slate-400 py-6 text-center">Loading winnings...</div>
          ) : winners.length === 0 ? (
            <div className="p-6 bg-[#12131a] rounded-xl text-center text-xs text-slate-400 border border-slate-800">
              No confirmed winnings yet. As draws take place, awards and audits appear here.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {winners.map((w) => (
                <div
                  key={w.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-white text-sm">
                      {w.drawTitle || 'Monthly Draw'} &bull; {w.matchCount} Matches
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      Prize Award: <strong className="text-emerald-400">₹{w.prizeAmount.toLocaleString('en-IN')}</strong> &bull; Rank #{w.rank}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                        w.verificationStatus === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : w.verificationStatus === 'PENDING_REVIEW'
                          ? 'bg-purple-500/20 text-purple-300'
                          : w.verificationStatus === 'REJECTED'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {w.verificationStatus}
                    </span>

                    {(w.verificationStatus === 'PENDING_PROOF' || w.verificationStatus === 'REJECTED') && (
                      <button
                        onClick={() => setSelectedWinnerForProof(w)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
                      >
                        Upload Proof
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
