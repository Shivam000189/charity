import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl font-black mb-4">
        !
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
        403 — Unauthorized
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        You do not have permission to access this page. Please contact an administrator or upgrade your
        account tier if you believe this is an error.
      </p>
      <div className="flex gap-3">
        <Link
          to={ROUTES.DASHBOARD}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          Go to Dashboard
        </Link>
        <Link
          to={ROUTES.HOME}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
};
