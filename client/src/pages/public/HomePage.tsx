import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-12 py-8 text-center max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="space-y-4">
        <div className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold tracking-wide uppercase">
          Full-Stack Supabase Platform
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Transparent, Charity-Driven Lottery Platform
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Welcome to Digital Hero. Support trusted charities, enter transparent daily draws, and track
          your positive community impact.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          {user ? (
            <Link
              to={ROUTES.DASHBOARD}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to={ROUTES.SIGNUP}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
              >
                Get Started
              </Link>
              <Link
                to={ROUTES.LOGIN}
                className="px-6 py-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold rounded-lg transition-colors"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Feature Pillars */}
      <div className="grid sm:grid-cols-3 gap-6 pt-6 text-left">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold mb-4">
            1
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Charitable Giving</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            A percentage of all subscriber contributions is directed to verified, vetted nonprofit partners.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-4">
            2
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Daily Draws</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Verifiable, auditable lottery selections scheduled automatically through our backend services.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold mb-4">
            3
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Secure &amp; Governed</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Backed by Supabase Auth and PostgreSQL role-based authorization controls.
          </p>
        </div>
      </div>
    </div>
  );
};
