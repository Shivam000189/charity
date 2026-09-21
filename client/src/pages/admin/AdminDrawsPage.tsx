import React, { useState } from 'react';
import { useAdminDraws } from '../../hooks/useAdminDraws';
import type { DrawRecord, CreateDrawInput, SimulationResult } from '../../types/draw';

export const AdminDrawsPage: React.FC = () => {
  const {
    draws,
    loading,
    submitting,
    error,
    createDraw,
    openDraw,
    closeDraw,
    simulateDraw,
    publishDraw,
    deleteDraw,
  } = useAdminDraws();

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const defaultMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
  const defaultDateStr = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const [formData, setFormData] = useState<CreateDrawInput>({
    title: `Monthly Draw - ${defaultMonthStr}`,
    scheduled_month: defaultMonthStr,
    draw_date: defaultDateStr,
    draw_type: 'SCORE_WEIGHTED',
    three_match_percentage: 25,
    four_match_percentage: 35,
    five_match_percentage: 40,
    jackpot_rollover_amount: 0,
  });

  // Simulation Review Modal State
  const [simulationModalDraw, setSimulationModalDraw] = useState<DrawRecord | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<SimulationResult | null>(null);

  // View Completed Modal State
  const [viewCompletedDraw, setViewCompletedDraw] = useState<DrawRecord | null>(null);

  // Form percentage sum calculation
  const totalPercentage =
    (Number(formData.three_match_percentage) || 0) +
    (Number(formData.four_match_percentage) || 0) +
    (Number(formData.five_match_percentage) || 0);

  // Quick stats
  const activeDrawsCount = draws.filter(
    (d) => d.status === 'open' || d.status === 'scheduled' || d.status === 'simulated'
  ).length;
  const completedDrawsCount = draws.filter((d) => d.status === 'completed').length;
  const latestRollover = draws.find((d) => (d.rolled_over_to_next || 0) > 0)?.rolled_over_to_next || 0;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPercentage !== 100) {
      alert('Pool percentages must sum to exactly 100%.');
      return;
    }
    const res = await createDraw(formData);
    if (res.success) {
      setShowCreateModal(false);
    } else {
      alert(res.error || 'Failed to create draw.');
    }
  };

  const handleOpenDraw = async (draw: DrawRecord) => {
    if (!window.confirm(`Open draw for ${draw.scheduled_month}? This will automatically enroll all active subscribers and generate their draw numbers.`)) {
      return;
    }
    const res = await openDraw(draw.id);
    if (res.success) {
      alert(`Draw opened! Enrolled ${res.entriesEnrolled || 0} active subscribers.`);
    } else {
      alert(res.error || 'Failed to open draw.');
    }
  };

  const handleCloseDraw = async (draw: DrawRecord) => {
    if (!window.confirm(`Close entries for ${draw.scheduled_month}? No further subscribers will be enrolled.`)) {
      return;
    }
    const res = await closeDraw(draw.id);
    if (!res.success) {
      alert(res.error || 'Failed to close draw.');
    }
  };

  const handleRunSimulation = async (draw: DrawRecord) => {
    const res = await simulateDraw(draw.id);
    if (res.success && res.simulation) {
      setSimulationModalDraw(draw);
      setActiveSimulation(res.simulation);
    } else {
      alert(res.error || 'Failed to simulate draw.');
    }
  };

  const handlePublish = async (drawId: string) => {
    if (!window.confirm('Are you sure you want to PUBLISH this draw? This will permanently record winners in the database and mark the draw as completed. This action is irreversible.')) {
      return;
    }
    const res = await publishDraw(drawId);
    if (res.success) {
      alert(`Draw published successfully! Declared ${res.winnersCount || 0} winner(s).`);
      setSimulationModalDraw(null);
      setActiveSimulation(null);
    } else {
      alert(res.error || 'Failed to publish draw.');
    }
  };

  const handleDelete = async (draw: DrawRecord) => {
    if (!window.confirm(`Delete draw for ${draw.scheduled_month}? This action cannot be undone.`)) {
      return;
    }
    const res = await deleteDraw(draw.id);
    if (!res.success) {
      alert(res.error || 'Failed to delete draw.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Draw Management & Prize Engine</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure monthly draws, manage subscriber entry pools, execute simulations, and publish winners.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-sm"
        >
          + Schedule New Draw
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active / Scheduled
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{activeDrawsCount}</div>
          <div className="mt-1 text-xs text-slate-500">Upcoming or open draws</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Completed Draws
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedDrawsCount}</div>
          <div className="mt-1 text-xs text-slate-500">Finalized and published</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Latest Rollover Jackpot
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-500">
            ₹{latestRollover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-500">Unclaimed 5-match jackpot rollover</div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Draws Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">All Scheduled & Past Draws</h3>
          <span className="text-xs text-slate-500">Showing {draws.length} draw(s)</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">Loading draws...</div>
        ) : draws.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            No draws configured yet. Click "+ Schedule New Draw" to create your first draw.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Month / Title</th>
                  <th className="px-4 py-3">Draw Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Pool Split (3/4/5)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Entries</th>
                  <th className="px-4 py-3">Total Pool</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {draws.map((draw) => {
                  const statusColors: Record<string, string> = {
                    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                    scheduled: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
                    open: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500/30',
                    closed: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                    simulated: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-semibold',
                    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
                    cancelled: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
                  };

                  return (
                    <tr key={draw.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{draw.title}</div>
                        <div className="text-xs text-slate-400 font-mono">{draw.scheduled_month}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {new Date(draw.draw_date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                            draw.draw_type === 'SCORE_WEIGHTED'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {draw.draw_type === 'SCORE_WEIGHTED' ? 'Score-Weighted' : 'Random'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">
                        {draw.three_match_percentage}% / {draw.four_match_percentage}% / {draw.five_match_percentage}%
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                            statusColors[draw.status] || 'bg-slate-100'
                          }`}
                        >
                          {draw.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">
                        {draw.entries_count !== undefined ? draw.entries_count : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-white">
                        {draw.total_pool !== undefined ? `₹${draw.total_pool.toLocaleString('en-IN')}` : '—'}
                        {draw.jackpot_rollover_amount > 0 && (
                          <span className="block text-[10px] text-amber-500 font-normal">
                            +₹{draw.jackpot_rollover_amount.toLocaleString('en-IN')} rollover
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        {/* Status = scheduled or draft -> Open Draw */}
                        {(draw.status === 'scheduled' || draw.status === 'draft') && (
                          <button
                            onClick={() => handleOpenDraw(draw)}
                            disabled={submitting}
                            className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition"
                          >
                            Open Draw
                          </button>
                        )}

                        {/* Status = open -> Close Draw */}
                        {draw.status === 'open' && (
                          <button
                            onClick={() => handleCloseDraw(draw)}
                            disabled={submitting}
                            className="text-xs px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition"
                          >
                            Close Entries
                          </button>
                        )}

                        {/* Status = closed or simulated -> Simulate Draw */}
                        {(draw.status === 'closed' || draw.status === 'simulated') && (
                          <button
                            onClick={() => handleRunSimulation(draw)}
                            disabled={submitting}
                            className="text-xs px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition"
                          >
                            {draw.status === 'simulated' ? 'Re-Simulate' : 'Simulate Draw'}
                          </button>
                        )}

                        {/* Status = simulated -> Review & Publish */}
                        {draw.status === 'simulated' && (
                          <button
                            onClick={() => {
                              setSimulationModalDraw(draw);
                              setActiveSimulation(draw.simulation_data || null);
                            }}
                            className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition"
                          >
                            Review & Publish
                          </button>
                        )}

                        {/* Status = completed -> View Results */}
                        {draw.status === 'completed' && (
                          <button
                            onClick={() => setViewCompletedDraw(draw)}
                            className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-medium transition"
                          >
                            View Results
                          </button>
                        )}

                        {/* Deletable if draft or scheduled */}
                        {(draw.status === 'draft' || draw.status === 'scheduled') && (
                          <button
                            onClick={() => handleDelete(draw)}
                            disabled={submitting}
                            className="text-xs px-2 py-1 text-red-600 hover:text-red-700 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE DRAW MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Schedule New Monthly Draw</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Scheduled Month (YYYY-MM)
                </label>
                <input
                  type="text"
                  value={formData.scheduled_month}
                  onChange={(e) => {
                    const month = e.target.value;
                    setFormData({
                      ...formData,
                      scheduled_month: month,
                      title: `Monthly Draw - ${month}`,
                    });
                  }}
                  pattern="\d{4}-\d{2}"
                  placeholder="2026-10"
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">One draw allowed per month. Format: YYYY-MM</p>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Draw Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Draw Execution Date</label>
                <input
                  type="date"
                  value={formData.draw_date}
                  onChange={(e) => setFormData({ ...formData, draw_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Number Generation Method
                </label>
                <select
                  value={formData.draw_type}
                  onChange={(e) => setFormData({ ...formData, draw_type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="SCORE_WEIGHTED">Score-Weighted (Recent Stableford Frequency)</option>
                  <option value="RANDOM">Uniform Random (1 to 45)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Score-weighted weighs number selection by recent player game performances.
                </p>
              </div>

              {/* Pool Split Percentages */}
              <div className="border border-slate-200 dark:border-slate-800 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-white">Prize Pool Split</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      totalPercentage === 100
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    Sum: {totalPercentage}% (Must be 100%)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500">3-Match %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.three_match_percentage}
                      onChange={(e) =>
                        setFormData({ ...formData, three_match_percentage: Number(e.target.value) })
                      }
                      className="w-full mt-1 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">4-Match %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.four_match_percentage}
                      onChange={(e) =>
                        setFormData({ ...formData, four_match_percentage: Number(e.target.value) })
                      }
                      className="w-full mt-1 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">5-Match (Jackpot) %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.five_match_percentage}
                      onChange={(e) =>
                        setFormData({ ...formData, five_match_percentage: Number(e.target.value) })
                      }
                      className="w-full mt-1 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-center font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Initial Rollover Jackpot (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.jackpot_rollover_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, jackpot_rollover_amount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Leave at 0 to automatically inherit from previous month's unclaimed jackpot.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || totalPercentage !== 100}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Schedule Draw'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SIMULATION & PUBLISH REVIEW MODAL */}
      {simulationModalDraw && activeSimulation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono uppercase bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded">
                  Simulation Preview
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {simulationModalDraw.title}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSimulationModalDraw(null);
                  setActiveSimulation(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Drawn Lottery Balls Display */}
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center space-y-3">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Simulated Winning Numbers
              </div>
              <div className="flex items-center justify-center gap-3">
                {activeSimulation.candidateNumbers.map((num) => (
                  <div
                    key={num}
                    className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-extrabold text-lg flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-yellow-200/50"
                  >
                    {num}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">5 numbers drawn in range 1 to 45</p>
            </div>

            {/* Simulation Metrics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 uppercase">Subscribers</div>
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {activeSimulation.totalSubscribers}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 uppercase">5-Match Winners</div>
                <div className="text-base font-bold text-amber-500">
                  {activeSimulation.match5Winners.length}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 uppercase">4-Match Winners</div>
                <div className="text-base font-bold text-indigo-500">
                  {activeSimulation.match4Winners.length}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 uppercase">3-Match Winners</div>
                <div className="text-base font-bold text-emerald-500">
                  {activeSimulation.match3Winners.length}
                </div>
              </div>
            </div>

            {/* Prize Pools Breakdown */}
            <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Prize Allocations
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">
                    5-Match Jackpot (Pool: ₹{activeSimulation.match5Pool.toLocaleString('en-IN')})
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeSimulation.match5Winners.length > 0
                      ? `₹${activeSimulation.match5Winners[0].prizeAmount.toLocaleString('en-IN')} each (${activeSimulation.match5Winners.length} winner)`
                      : 'Unclaimed (Rolls over to next draw)'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">
                    4-Match Tier (Pool: ₹{activeSimulation.match4Pool.toLocaleString('en-IN')})
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeSimulation.match4Winners.length > 0
                      ? `₹${activeSimulation.match4Winners[0].prizeAmount.toLocaleString('en-IN')} each (${activeSimulation.match4Winners.length} winner)`
                      : '0 Winners'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 dark:text-slate-400">
                    3-Match Tier (Pool: ₹{activeSimulation.match3Pool.toLocaleString('en-IN')})
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeSimulation.match3Winners.length > 0
                      ? `₹${activeSimulation.match3Winners[0].prizeAmount.toLocaleString('en-IN')} each (${activeSimulation.match3Winners.length} winner)`
                      : '0 Winners'}
                  </span>
                </div>
              </div>

              {/* Rollover Alert */}
              {activeSimulation.jackpotRollover > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                  <strong>Jackpot Rollover:</strong> Since there were no 5-match winners, the full 5-match pool of{' '}
                  <span className="font-bold">
                    ₹{activeSimulation.jackpotRollover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>{' '}
                  will roll over into the subsequent draw's 5-match jackpot!
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => handleRunSimulation(simulationModalDraw)}
                disabled={submitting}
                className="px-4 py-2 border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/50 text-xs font-semibold"
              >
                Re-Generate Simulation
              </button>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setSimulationModalDraw(null);
                    setActiveSimulation(null);
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => handlePublish(simulationModalDraw.id)}
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish & Finalize Draw'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED DRAW DETAILS MODAL */}
      {viewCompletedDraw && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Completed & Finalized
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {viewCompletedDraw.title}
                </h3>
              </div>
              <button
                onClick={() => setViewCompletedDraw(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Official Drawn Numbers */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-center space-y-2">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Official Winning Numbers
              </div>
              <div className="flex items-center justify-center gap-2">
                {(viewCompletedDraw.drawn_numbers || []).map((num) => (
                  <div
                    key={num}
                    className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-extrabold text-base flex items-center justify-center shadow"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                <span className="text-xs text-slate-500">Total Prize Pool</span>
                <div className="font-bold text-slate-900 dark:text-white">
                  ₹{(viewCompletedDraw.total_pool || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                <span className="text-xs text-slate-500">Rolled Over To Next</span>
                <div className="font-bold text-amber-500">
                  ₹{(viewCompletedDraw.rolled_over_to_next || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setViewCompletedDraw(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
