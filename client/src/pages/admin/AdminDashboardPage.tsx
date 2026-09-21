import React from 'react';
import { Link } from 'react-router-dom';
import { useAdminReports } from '../../hooks/useAdminReports';
import { useAdminWinners } from '../../hooks/useAdminWinners';
import { ROUTES } from '../../constants/routes';

export const AdminDashboardPage: React.FC = () => {
  const { metrics, loading: reportsLoading } = useAdminReports();
  const { pendingWinners, loading: winnersLoading } = useAdminWinners();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Admin Overview</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time executive KPIs, verification queues, and operational action items.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={ROUTES.ADMIN_REPORTS}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100"
          >
            View PRD Reports &rarr;
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Users
          </span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {reportsLoading ? '--' : metrics?.totalUsers ?? 0}
          </div>
          <span className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 block font-semibold">
            {metrics?.activeSubscribers ?? 0} Active Subscribers
          </span>
        </div>

        {/* Upcoming Draw */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Upcoming Draw
          </span>
          <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1 truncate">
            {reportsLoading
              ? '--'
              : metrics?.upcomingDraw
              ? metrics.upcomingDraw.title
              : 'None Scheduled'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {metrics?.upcomingDraw
              ? `Draw Date: ${new Date(metrics.upcomingDraw.drawDate).toLocaleDateString()}`
              : 'Create in Draws tab'}
          </span>
        </div>

        {/* Pending Winner Reviews */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pending Proof Reviews
          </span>
          <div
            className={`text-2xl font-extrabold mt-1 ${
              (metrics?.pendingWinnerReviews ?? 0) > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {reportsLoading ? '--' : metrics?.pendingWinnerReviews ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {(metrics?.pendingWinnerReviews ?? 0) > 0 ? 'Action required in queue' : 'Queue clear'}
          </span>
        </div>

        {/* Pending Payouts */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Approved Awaiting Payout
          </span>
          <div
            className={`text-2xl font-extrabold mt-1 ${
              (metrics?.pendingPayments ?? 0) > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {reportsLoading ? '--' : metrics?.pendingPayments ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Ready for manual bank transfer
          </span>
        </div>
      </div>

      {/* Action Queue: Pending Winner Proof Reviews */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Pending Scorecard Verification Queue ({pendingWinners.length})
            </h3>
            <p className="text-xs text-slate-500">
              Submitted golf scorecards awaiting admin verification before prize payouts.
            </p>
          </div>
          <Link
            to={ROUTES.ADMIN_WINNERS}
            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
          >
            Go to Winners Audit &rarr;
          </Link>
        </div>

        {winnersLoading ? (
          <div className="p-6 text-center text-xs text-slate-400">Loading pending reviews...</div>
        ) : pendingWinners.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-950 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
            No score proof reviews are currently pending.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2.5">Winner</th>
                  <th className="p-2.5">Draw</th>
                  <th className="p-2.5">Match Tier</th>
                  <th className="p-2.5">Prize</th>
                  <th className="p-2.5">Uploaded</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {pendingWinners.slice(0, 5).map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                      {w.userName || w.userEmail}
                    </td>
                    <td className="p-2.5">{w.drawTitle || 'Monthly Draw'}</td>
                    <td className="p-2.5 font-bold">Tier #{w.rank} ({w.matchCount}/5)</td>
                    <td className="p-2.5 font-extrabold text-emerald-600 dark:text-emerald-400">
                      ${Number(w.prizeAmount).toFixed(2)}
                    </td>
                    <td className="p-2.5 text-slate-400 text-[11px]">
                      {w.proofUploadedAt ? new Date(w.proofUploadedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-2.5 text-right">
                      <Link
                        to={ROUTES.ADMIN_WINNERS}
                        className="px-2.5 py-1 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Navigation Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to={ROUTES.ADMIN_USERS}
          className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors group"
        >
          <div className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 text-sm">
            Users Directory &rarr;
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage subscriber roles, audit golf scores, and inspect user profiles.
          </p>
        </Link>
        <Link
          to={ROUTES.ADMIN_DRAWS}
          className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors group"
        >
          <div className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 text-sm">
            Lottery Draws Engine &rarr;
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure monthly draws, simulate outcomes, and publish results.
          </p>
        </Link>
        <Link
          to={ROUTES.ADMIN_CHARITIES}
          className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors group"
        >
          <div className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 text-sm">
            Charity Partners &rarr;
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain partner organizations, feature spotlight charities, and inspect totals.
          </p>
        </Link>
      </div>
    </div>
  );
};
