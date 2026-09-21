import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { CharitySpotlight } from '../../components/charity/CharitySpotlight';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-16 py-6 sm:py-10 max-w-5xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-4 sm:pt-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900/60 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          Transparent Community Impact &bull; Verified Giving
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
          Where Community Participation Powers{' '}
          <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">
            Real Human Change
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Digital Hero channels monthly subscriber contributions into vetted grassroots charities. 
          Compete with your golf rounds, track verifiable daily lottery draws, and celebrate community impact.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
          {user ? (
            <Link
              to={ROUTES.DASHBOARD}
              className="px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Your Dashboard &rarr;
            </Link>
          ) : (
            <>
              <Link
                to={ROUTES.SIGNUP}
                className="px-7 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Join the Community
              </Link>
              <Link
                to={ROUTES.ABOUT}
                className="px-6 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold text-xs sm:text-sm rounded-xl transition-colors"
              >
                How It Works
              </Link>
            </>
          )}
        </div>

        {/* Impact Highlights Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 max-w-3xl mx-auto">
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">10%–100%</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Charity Routing</div>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">100%</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Zero Leakage</div>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-xl sm:text-2xl font-black text-amber-500">Monthly</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Audited Draws</div>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-xl sm:text-2xl font-black text-indigo-500">Verified</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Scorecards</div>
          </div>
        </div>
      </section>

      {/* Featured Charity Spotlight */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Charity in the Spotlight
            </h2>
            <p className="text-xs text-slate-500">Grassroots causes supported by community subscribers</p>
          </div>
          <Link
            to={ROUTES.CHARITIES}
            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
          >
            All Charities &rarr;
          </Link>
        </div>
        <CharitySpotlight />
      </section>

      {/* 3 Pillars */}
      <section className="grid sm:grid-cols-3 gap-6 pt-4">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-300 dark:hover:border-purple-800 transition-colors group">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-lg mb-4 group-hover:scale-110 transition-transform">
            1
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Sustainable Charity Funding</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Every subscription dedicates 10%–100% of proceeds straight to your chosen non-profit, generating reliable recurring support.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors group">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg mb-4 group-hover:scale-110 transition-transform">
            2
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Transparent Monthly Draws</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Automatic subscriber entry into verifiable lottery draws with integer-precise prize allocations and rollover jackpots.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors group">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg mb-4 group-hover:scale-110 transition-transform">
            3
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Verified Fair Play</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Winners submit official golf scorecard proofs audited by administrators before prize disbursements are settled.
          </p>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="p-8 sm:p-12 bg-gradient-to-r from-purple-900/90 via-indigo-950 to-slate-950 rounded-3xl border border-purple-800/40 text-center text-white space-y-4 shadow-xl">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          Ready to Turn Your Passion into Real Impact?
        </h2>
        <p className="text-xs sm:text-sm text-purple-200 max-w-lg mx-auto leading-relaxed">
          Join hundreds of heroes funding vital community causes every month.
        </p>
        <div className="pt-2">
          <Link
            to={ROUTES.ONBOARDING_PLAN}
            className="inline-block px-7 py-3.5 bg-white text-slate-900 hover:bg-slate-100 text-xs sm:text-sm font-black rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Choose Your Membership Plan &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
};
