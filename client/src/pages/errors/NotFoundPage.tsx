import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 max-w-md mx-auto">
      <div className="text-6xl font-black text-slate-300 dark:text-slate-700 mb-2">404</div>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        The requested page does not exist or may have been moved.
      </p>
      <Link
        to={ROUTES.HOME}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
      >
        Return to Safety
      </Link>
    </div>
  );
};
