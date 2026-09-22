import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#181922] border-t border-slate-800/80 text-slate-400 pt-16 pb-12 mt-auto">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Main Multi-Column Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12">
          {/* Brand Col (2 spans) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to={ROUTES.HOME} className="text-xl font-black text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
                D
              </span>
              <span>Digital Hero</span>
            </Link>
            
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Empowering grassroots community causes through verifiable monthly lottery draws, direct charity allocations, and audited golf scorecard challenges.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-2.5 py-1 rounded-md bg-[#242634] text-slate-300 text-[10px] font-semibold border border-slate-700/60">
                100% Zero Leakage
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#242634] text-slate-300 text-[10px] font-semibold border border-slate-700/60">
                Integer Precision Draws
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#242634] text-slate-300 text-[10px] font-semibold border border-slate-700/60">
                Verified Non-Profits
              </span>
            </div>
          </div>

          {/* Col 1: Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Platform & Draws
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to={ROUTES.DRAWS} className="hover:text-purple-400 transition-colors">
                  Lottery Draws
                </Link>
              </li>
              <li>
                <Link to={ROUTES.DRAWS} className="hover:text-purple-400 transition-colors">
                  Daily & Monthly Draws
                </Link>
              </li>
              <li>
                <Link to={ROUTES.ABOUT} className="hover:text-purple-400 transition-colors">
                  Golf Fair Play Rules
                </Link>
              </li>
              <li>
                <Link to={ROUTES.ABOUT} className="hover:text-purple-400 transition-colors">
                  Scorecard Auditing
                </Link>
              </li>
              <li>
                <Link to={ROUTES.DRAWS} className="hover:text-purple-400 transition-colors">
                  Jackpot Roll-overs
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Charities */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Charity Partners
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to={ROUTES.CHARITIES} className="hover:text-purple-400 transition-colors">
                  Verified Charities
                </Link>
              </li>
              <li>
                <Link to={ROUTES.CHARITIES} className="hover:text-purple-400 transition-colors">
                  Charity Spotlight
                </Link>
              </li>
              <li>
                <Link to={ROUTES.ABOUT} className="hover:text-purple-400 transition-colors">
                  10%–100% Fund Routing
                </Link>
              </li>
              <li>
                <Link to={ROUTES.ABOUT} className="hover:text-purple-400 transition-colors">
                  Apply as a Partner
                </Link>
              </li>
              <li>
                <Link to={ROUTES.ABOUT} className="hover:text-purple-400 transition-colors">
                  Community Impact Reports
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Community & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Community & Trust
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to={ROUTES.ABOUT} className="hover:text-purple-400 transition-colors">
                  Our Mission & Story
                </Link>
              </li>
              <li>
                <Link to={ROUTES.SIGNUP} className="hover:text-purple-400 transition-colors">
                  Join Community
                </Link>
              </li>
              <li>
                <Link to={ROUTES.ONBOARDING_PLAN} className="hover:text-purple-400 transition-colors">
                  Subscription Plans
                </Link>
              </li>
              <li>
                <Link to={ROUTES.ABOUT} className="hover:text-purple-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to={ROUTES.ABOUT} className="hover:text-purple-400 transition-colors">
                  Privacy & Compliance
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Regulatory & Trust Disclaimer Strip */}
        <div className="py-6 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
          <p>
            <strong className="text-slate-300">Audited Integrity Guarantee:</strong> Digital Hero operates on verifiable, integer-exact allocations. Monthly subscription fees directly finance designated vetted charities and audited community draw pools. Players must be of legal age in their respective jurisdiction.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            &copy; {new Date().getFullYear()} Digital Hero. All rights reserved.
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="text-slate-300">Operational &amp; Verified</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
