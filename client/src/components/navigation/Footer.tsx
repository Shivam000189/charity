import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12 mt-auto">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Brand */}
          <div className="text-center md:text-left space-y-1.5">
            <Link to={ROUTES.HOME} className="text-xl font-extrabold text-white flex items-center justify-center md:justify-start gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
                D
              </span>
              <span>Digital Hero</span>
            </Link>
            <p className="text-xs text-slate-400 max-w-md">
              Empowering community charities through transparent monthly lottery draws, sustainable funding models, and verified score validation.
            </p>
          </div>

          {/* Quick Links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-semibold" aria-label="Footer Navigation">
            <Link to={ROUTES.HOME} className="hover:text-purple-400 transition-colors">
              Home
            </Link>
            <Link to={ROUTES.ABOUT} className="hover:text-purple-400 transition-colors">
              About Mission
            </Link>
            <Link to={ROUTES.CHARITIES} className="hover:text-purple-400 transition-colors">
              Charity Partners
            </Link>
            <Link to={ROUTES.DRAWS} className="hover:text-purple-400 transition-colors">
              Lottery Draws
            </Link>
            <span className="text-slate-700 hidden sm:inline">&bull;</span>
            <span className="text-slate-500">
              Community Impact Driven
            </span>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} Digital Hero. All rights reserved.
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Operational &amp; Verified</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
