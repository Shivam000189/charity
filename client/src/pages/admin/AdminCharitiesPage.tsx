import React, { useState } from 'react';
import { useAdminCharities } from '../../hooks/useAdminCharities';
import { CharityForm } from '../../components/charity/CharityForm';
import type { Charity, CreateCharityInput, UpdateCharityInput } from '../../types/charity';

export const AdminCharitiesPage: React.FC = () => {
  const { charities, loading, submitting, error, create, update, deactivate } = useAdminCharities();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCharity, setEditingCharity] = useState<Charity | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleStartCreate = () => {
    setEditingCharity(null);
    setShowForm(true);
    setFeedback(null);
  };

  const handleStartEdit = (charity: Charity) => {
    setEditingCharity(charity);
    setShowForm(true);
    setFeedback(null);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCharity(null);
  };

  const handleFormSubmit = async (data: CreateCharityInput | UpdateCharityInput) => {
    setFeedback(null);
    if (editingCharity) {
      const res = await update(editingCharity.id, data as UpdateCharityInput);
      if (res.success) {
        setShowForm(false);
        setEditingCharity(null);
        setFeedback({ type: 'success', message: 'Charity updated successfully!' });
      }
      return res;
    } else {
      const res = await create(data as CreateCharityInput);
      if (res.success) {
        setShowForm(false);
        setFeedback({ type: 'success', message: 'Charity created successfully!' });
      }
      return res;
    }
  };

  const handleToggleDeactivate = async (charity: Charity) => {
    setFeedback(null);
    if (charity.isActive) {
      if (!window.confirm(`Are you sure you want to deactivate "${charity.name}"? It will no longer be visible publicly.`)) {
        return;
      }
      const res = await deactivate(charity.id);
      if (res.success) {
        setFeedback({ type: 'success', message: `"${charity.name}" deactivated successfully.` });
      }
    } else {
      const res = await update(charity.id, { isActive: true });
      if (res.success) {
        setFeedback({ type: 'success', message: `"${charity.name}" reactivated successfully.` });
      }
    }
  };

  const filtered = charities.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Charity Operations &amp; Partner Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create, update, spotlight, and manage nonprofit partner organizations.
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>+</span> Add New Charity
          </button>
        )}
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Form Drawer / Panel */}
      {showForm ? (
        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingCharity ? `Edit Charity: ${editingCharity.name}` : 'Create New Partner Charity'}
            </h3>
            <button
              type="button"
              onClick={handleCancelForm}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <CharityForm
            initialData={editingCharity}
            onSubmit={handleFormSubmit}
            onCancel={handleCancelForm}
            submitting={submitting}
          />
        </div>
      ) : (
        /* Charity Management Table & List */
        <div className="space-y-4">
          {/* Quick Filter Bar */}
          <div className="flex items-center justify-between gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter charities by name or category..."
              className="max-w-xs w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <span className="text-xs text-slate-400 font-mono">
              Total: {charities.length} | Active: {charities.filter((c) => c.isActive).length}
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading admin charities...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
              No charities found. Click "+ Add New Charity" to register the first partner organization.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Events</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Spotlight</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-purple-600 shrink-0 overflow-hidden">
                            {c.logoUrl ? (
                              <img src={c.logoUrl} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              c.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{c.name}</span>
                            <span className="text-[10px] text-slate-400">
                              ID: {c.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                          {c.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        {c.upcomingEvents?.length || 0} scheduled
                      </td>

                      <td className="py-3 px-4">
                        {c.isActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] uppercase">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold text-[10px] uppercase">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {c.featured ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1 w-max">
                            ★ Featured
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Standard</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(c)}
                          className="px-2.5 py-1 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-950/40 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleDeactivate(c)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                            c.isActive
                              ? 'text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40'
                              : 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                          }`}
                        >
                          {c.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
