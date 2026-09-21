import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants/routes';

export const AdminLayout: React.FC = () => {
  const adminNavClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
      isActive
        ? 'bg-purple-600 text-white shadow-sm'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <div className="space-y-6">
      {/* Admin Top Banner / Subnav */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              Administration Portal
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Platform administration, oversight, and operational management
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs px-2.5 py-1 rounded-full font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 uppercase tracking-wider">
            Admin Access Required
          </span>
        </div>

        {/* Sub-Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Admin Sections">
          <NavLink to={ROUTES.ADMIN} end className={adminNavClass}>
            Overview
          </NavLink>
          <NavLink to={ROUTES.ADMIN_USERS} className={adminNavClass}>
            Users
          </NavLink>
          <NavLink to={ROUTES.ADMIN_CHARITIES} className={adminNavClass}>
            Charities
          </NavLink>
          <NavLink to={ROUTES.ADMIN_DRAWS} className={adminNavClass}>
            Draws
          </NavLink>
          <NavLink to={ROUTES.ADMIN_WINNERS} className={adminNavClass}>
            Winners
          </NavLink>
          <NavLink to={ROUTES.ADMIN_PAYOUTS} className={adminNavClass}>
            Payouts
          </NavLink>
          <NavLink to={ROUTES.ADMIN_REPORTS} className={adminNavClass}>
            Reports
          </NavLink>
        </nav>
      </div>

      {/* Admin Child Route View */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px]">
        <Outlet />
      </div>
    </div>
  );
};
