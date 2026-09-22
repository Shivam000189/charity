import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { CharitySpotlight } from '../../components/charity/CharitySpotlight';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-16 py-4 sm:py-8 max-w-5xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-2 sm:pt-6 animate-fade-in">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.12] max-w-4xl mx-auto">
          Community Participation<br className="hidden sm:inline" /> Powers Real Human Change
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Digital Hero channels monthly subscriber contributions into vetted grassroots charities. 
          Compete with your golf rounds, track verifiable daily lottery draws, and celebrate community impact.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
          {user ? (
            <Link
              to={ROUTES.DASHBOARD}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Your Dashboard &rarr;
            </Link>
          ) : (
            <>
              <Link
                to={ROUTES.SIGNUP}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Join the Community
              </Link>
              <Link
                to={ROUTES.ABOUT}
                className="px-6 py-2.5 bg-[#1a1b24] hover:bg-[#22232f] text-slate-200 border border-slate-700/60 font-semibold text-xs sm:text-sm rounded-xl transition-colors"
              >
                How It Works
              </Link>
            </>
          )}
        </div>

        {/* Impact Highlights Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 max-w-3xl mx-auto">
          <div className="p-4 bg-[#1a1b24] rounded-2xl border border-slate-800/80 shadow-sm text-center">
            <div className="text-xl sm:text-2xl font-black text-[#c084fc]">10%–100%</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Charity Routing</div>
          </div>
          <div className="p-4 bg-[#1a1b24] rounded-2xl border border-slate-800/80 shadow-sm text-center">
            <div className="text-xl sm:text-2xl font-black text-[#10b981]">100%</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Zero Leakage</div>
          </div>
          <div className="p-4 bg-[#1a1b24] rounded-2xl border border-slate-800/80 shadow-sm text-center">
            <div className="text-xl sm:text-2xl font-black text-[#f59e0b]">Monthly</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Audited Draws</div>
          </div>
          <div className="p-4 bg-[#1a1b24] rounded-2xl border border-slate-800/80 shadow-sm text-center">
            <div className="text-xl sm:text-2xl font-black text-[#818cf8]">Verified</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Scorecards</div>
          </div>
        </div>
      </section>

      {/* Featured Charity Spotlight */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Charity in the Spotlight
            </h2>
            <p className="text-xs text-slate-400">Grassroots causes supported by community subscribers</p>
          </div>
          <Link
            to={ROUTES.CHARITIES}
            className="text-xs font-bold text-purple-400 hover:text-purple-300"
          >
            All Charities &rarr;
          </Link>
        </div>
        <CharitySpotlight />
      </section>

      {/* 3 Pillars */}
      <section className="grid sm:grid-cols-3 gap-5 pt-2">
        <div className="p-6 bg-[#1a1b24] rounded-2xl border border-slate-800/80 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm mb-4">
            1
          </div>
          <h3 className="text-base font-bold text-white mb-2">Sustainable Charity Funding</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every subscription dedicates 10%–100% of proceeds straight to your chosen non-profit, generating reliable recurring support.
          </p>
        </div>

        <div className="p-6 bg-[#1a1b24] rounded-2xl border border-slate-800/80 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black text-sm mb-4">
            2
          </div>
          <h3 className="text-base font-bold text-white mb-2">Transparent Monthly Draws</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Automatic subscriber entry into verifiable lottery draws with integer-precise prize allocations and rollover jackpots.
          </p>
        </div>

        <div className="p-6 bg-[#1a1b24] rounded-2xl border border-slate-800/80 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm mb-4">
            3
          </div>
          <h3 className="text-base font-bold text-white mb-2">Verified Fair Play</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Winners submit official golf scorecard proofs audited by administrators before prize disbursements are settled.
          </p>
        </div>
      </section>
    </div>
  );
};
