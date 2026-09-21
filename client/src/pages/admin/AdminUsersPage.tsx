import React, { useState } from 'react';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import type { AdminUserDetail } from '../../types/report';

export const AdminUsersPage: React.FC = () => {
  const { users, loading, error, refresh, getUserDetail, updateRole } = useAdminUsers();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [roleUpdateLoading, setRoleUpdateLoading] = useState(false);

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      return matchName || matchEmail;
    }
    return true;
  });

  const handleInspectUser = async (userId: string) => {
    const res = await getUserDetail(userId);
    if (res.user) {
      setSelectedUser(res.user);
    } else {
      alert(res.error || 'Failed to fetch user details');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!window.confirm(`Are you sure you want to change this user's role to "${newRole}"?`)) {
      return;
    }
    setRoleUpdateLoading(true);
    const res = await updateRole(userId, newRole);
    setRoleUpdateLoading(false);
    if (res.success && selectedUser && selectedUser.id === userId) {
      setSelectedUser({ ...selectedUser, role: newRole });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Platform Users Management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Inspect user profiles, manage roles, audit subscriptions, and view golf scores & winnings.
          </p>
        </div>
        <button
          onClick={() => refresh()}
          disabled={loading}
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

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['ALL', 'subscriber', 'visitor', 'admin'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
                roleFilter === role
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {role} ({role === 'ALL' ? users.length : users.filter((u) => u.role === role).length})
            </button>
          ))}
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Subscription</th>
              <th className="p-3">Golf Scores</th>
              <th className="p-3">Winnings</th>
              <th className="p-3">Registered</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                  Loading users directory...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                  No users match the search criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-slate-900 dark:text-white">{u.name || 'Anonymous User'}</div>
                    <div className="text-[11px] text-slate-400">{u.email}</div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                        u.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                          : u.role === 'subscriber'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.subscriptionStatus ? (
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                          {u.subscriptionPlan || 'Active'}
                        </span>
                        <span
                          className={`ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            u.subscriptionStatus === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {u.subscriptionStatus}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">None</span>
                    )}
                  </td>
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                    {u.scoresCount} recorded
                  </td>
                  <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">
                    {u.winningsCount > 0 ? `${u.winningsCount} won` : '0'}
                  </td>
                  <td className="p-3 text-[11px] text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleInspectUser(u.id)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  User Details: {selectedUser.name || selectedUser.email}
                </h3>
                <p className="text-xs text-slate-500 font-mono">ID: {selectedUser.id}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Role Manager */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Manage Platform Role
              </span>
              <div className="flex items-center gap-3">
                <select
                  value={selectedUser.role}
                  onChange={(e) => handleRoleChange(selectedUser.id, e.target.value)}
                  disabled={roleUpdateLoading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                >
                  <option value="visitor">Visitor</option>
                  <option value="subscriber">Subscriber</option>
                  <option value="admin">Admin</option>
                </select>
                <span className="text-[11px] text-slate-400">
                  Changing role updates Supabase user metadata and permissions.
                </span>
              </div>
            </div>

            {/* Subscription Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Subscription Status
                </span>
                {selectedUser.subscription ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                    {selectedUser.subscription.plan} ({selectedUser.subscription.status})
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">No active subscription</span>
                )}
              </div>
              {selectedUser.subscription && (
                <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 space-y-0.5">
                  <div>
                    Charity Partner:{' '}
                    <strong>{selectedUser.subscription.charityName || 'Platform Default'}</strong> (
                    {selectedUser.subscription.contributionPercentage}% contribution)
                  </div>
                  <div>
                    Valid from {new Date(selectedUser.subscription.startsAt).toLocaleDateString()} to{' '}
                    {new Date(selectedUser.subscription.expiresAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {/* Golf Scores */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Recent Scores ({selectedUser.recentScores.length})
              </h4>
              {selectedUser.recentScores.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No score submissions on record.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {selectedUser.recentScores.map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-center"
                    >
                      <div className="text-base font-extrabold text-purple-600 dark:text-purple-400">
                        {s.score} pts
                      </div>
                      <div className="text-[10px] text-slate-400">{s.scoreDate}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Winnings */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Draw Winnings ({selectedUser.winnings.length})
              </h4>
              {selectedUser.winnings.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No prizes awarded to this user yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedUser.winnings.map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{w.drawTitle}</span>
                        <span className="ml-2 text-slate-500 font-medium">Rank #{w.rank}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          ${Number(w.prizeAmount).toFixed(2)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-200 dark:bg-slate-800">
                          {w.verificationStatus}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {w.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
