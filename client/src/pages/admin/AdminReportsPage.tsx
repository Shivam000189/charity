import React from 'react';
import { useAdminReports } from '../../hooks/useAdminReports';

export const AdminReportsPage: React.FC = () => {
  const { reports, loading, error, refresh } = useAdminReports();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Operational & PRD Reports
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time aggregate reporting across Users, Prize Pools, Charity Contributions, and Draw Statistics.
          </p>
        </div>
        <button
          onClick={() => refresh()}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh Reports'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-sm text-rose-700 dark:rose-300">
          {error}
        </div>
      )}

      {loading && !reports ? (
        <div className="p-12 text-center text-slate-400 font-medium">
          Loading platform analytics & aggregate metrics...
        </div>
      ) : !reports ? (
        <div className="p-8 text-center text-slate-400">No report data available.</div>
      ) : (
        <div className="space-y-8">
          {/* Report 1: Total Users */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  1. Platform Users Summary
                </h3>
                <p className="text-xs text-slate-500">Breakdown of registered user tiers</p>
              </div>
              <span className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full">
                PRD Spec: Users
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 uppercase">Total Users</span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {reports.totalUsers.totalUsers}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">All registered accounts</span>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase">
                  Active Subscribers
                </span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {reports.totalUsers.activeSubscribers}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Paying subscriber accounts</span>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 uppercase">Visitors / Standard</span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {reports.totalUsers.visitorsCount}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Non-paying accounts</span>
              </div>
            </div>
          </div>

          {/* Report 2: Total Prize Pool */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  2. Total Prize Pool & Distributions
                </h3>
                <p className="text-xs text-slate-500">Historical pool allocations and winner prizes</p>
              </div>
              <span className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full">
                PRD Spec: Prize Pools
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 uppercase">Total Published Pools</span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  ${reports.totalPrizePool.totalPrizePoolPublished.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Across published draws</span>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 uppercase">Completed Draws</span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {reports.totalPrizePool.completedDrawsCount}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Executed and completed</span>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 uppercase">Total Winners Awarded</span>
                <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                  {reports.totalPrizePool.totalWinnersAwarded}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Winning tickets identified</span>
              </div>
            </div>
          </div>

          {/* Report 3: Charity Totals */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  3. Charity Partner Impact
                </h3>
                <p className="text-xs text-slate-500">
                  Total independent donations: ${reports.charityTotals.totalIndependentDonations.toFixed(2)}
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full">
                PRD Spec: Charities
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Charity Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Subscriber Backers</th>
                    <th className="p-3">Donations Count</th>
                    <th className="p-3 text-right">Total Donated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {reports.charityTotals.charities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        No active charity partners found.
                      </td>
                    </tr>
                  ) : (
                    reports.charityTotals.charities.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{c.name}</td>
                        <td className="p-3 capitalize">{c.category}</td>
                        <td className="p-3 font-semibold text-purple-600 dark:text-purple-400">
                          {c.subscriptionContributorsCount} subscribers
                        </td>
                        <td className="p-3">{c.donationsCount} gifts</td>
                        <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                          ${Number(c.totalDonationsAmount).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report 4: Draw Statistics */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  4. Draw Operational Statistics
                </h3>
                <p className="text-xs text-slate-500">Lottery performance and ticket entry volume</p>
              </div>
              <span className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full">
                PRD Spec: Draw Stats
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[11px] font-medium text-slate-500 uppercase block">Total Draws</span>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {reports.drawStatistics.totalDraws}
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[11px] font-medium text-slate-500 uppercase block">Published</span>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {reports.drawStatistics.publishedDraws}
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[11px] font-medium text-slate-500 uppercase block">Open / Upcoming</span>
                <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                  {reports.drawStatistics.scheduledOrOpenDraws}
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[11px] font-medium text-slate-500 uppercase block">Total Entries</span>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {reports.drawStatistics.totalEntries}
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-center col-span-2 sm:col-span-1">
                <span className="text-[11px] font-medium text-slate-500 uppercase block">Total Winners</span>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {reports.drawStatistics.totalWinners}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
