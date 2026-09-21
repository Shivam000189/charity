import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-10 mt-auto">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand */}
          <div className="text-center md:text-left">
            <Link to={ROUTES.HOME} className="text-lg font-bold text-slate-900 dark:text-white">
              Digital Hero
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Transparent, charity-driven lottery platform powered by Supabase PostgreSQL.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
            <Link to={ROUTES.HOME} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Home
            </Link>
            <Link to={ROUTES.ABOUT} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              About
            </Link>
            <Link to={ROUTES.CHARITIES} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Charities
            </Link>
            <Link to={ROUTES.DRAWS} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Draws
            </Link>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="cursor-not-allowed text-slate-400" title="Placeholder">
              Privacy Policy
            </span>
            <span className="cursor-not-allowed text-slate-400" title="Placeholder">
              Terms of Service
            </span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/60 text-center text-xs text-slate-400 dark:text-slate-500">
          &copy; {new Date().getFullYear()} Digital Hero. All rights reserved. (Scaffold Step 7)
        </div>
      </div>
    </footer>
  );
};
