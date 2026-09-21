import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

export const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate(ROUTES.HOME);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  const isSubscriber = profile?.role === 'subscriber' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link
              to={ROUTES.HOME}
              className="text-xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400 flex items-center gap-2"
            >
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-lg">
                D
              </span>
              <span>Digital Hero</span>
            </Link>

            {/* Desktop Public Nav */}
            <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
              <NavLink to={ROUTES.HOME} className={navLinkClass}>
                Home
              </NavLink>
              <NavLink to={ROUTES.ABOUT} className={navLinkClass}>
                About
              </NavLink>
              <NavLink to={ROUTES.CHARITIES} className={navLinkClass}>
                Charities
              </NavLink>
              <NavLink to={ROUTES.DRAWS} className={navLinkClass}>
                Draws
              </NavLink>

              {user && (
                <>
                  <NavLink to={ROUTES.DASHBOARD} className={navLinkClass}>
                    Dashboard
                  </NavLink>
                  <NavLink to={ROUTES.PROFILE} className={navLinkClass}>
                    Profile
                  </NavLink>
                </>
              )}

              {isSubscriber && (
                <>
                  <NavLink to={ROUTES.SUBSCRIPTION} className={navLinkClass}>
                    Subscription
                  </NavLink>
                  <NavLink to={ROUTES.MY_ENTRIES} className={navLinkClass}>
                    Entries
                  </NavLink>
                  <NavLink to={ROUTES.MY_WINNINGS} className={navLinkClass}>
                    Winnings
                  </NavLink>
                </>
              )}

              {isAdmin && (
                <NavLink
                  to={ROUTES.ADMIN}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-purple-600 text-white'
                        : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50'
                    }`
                  }
                >
                  Admin
                </NavLink>
              )}
            </nav>
          </div>

          {/* Desktop Right Auth Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium">
                  {profile?.role || 'visitor'}
                </span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                  {profile?.name || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900/50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to={ROUTES.LOGIN}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Log In
                </Link>
                <Link
                  to={ROUTES.SIGNUP}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1">
          <NavLink
            to={ROUTES.HOME}
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Home
          </NavLink>
          <NavLink
            to={ROUTES.ABOUT}
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            About
          </NavLink>
          <NavLink
            to={ROUTES.CHARITIES}
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Charities
          </NavLink>
          <NavLink
            to={ROUTES.DRAWS}
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Draws
          </NavLink>

          {user && (
            <>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 my-1">
                <span className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Account</span>
              </div>
              <NavLink
                to={ROUTES.DASHBOARD}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Dashboard
              </NavLink>
              <NavLink
                to={ROUTES.PROFILE}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Profile
              </NavLink>
            </>
          )}

          {isSubscriber && (
            <>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 my-1">
                <span className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Subscriber</span>
              </div>
              <NavLink
                to={ROUTES.SUBSCRIPTION}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Subscription
              </NavLink>
              <NavLink
                to={ROUTES.MY_ENTRIES}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                My Entries
              </NavLink>
              <NavLink
                to={ROUTES.MY_WINNINGS}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                My Winnings
              </NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 my-1">
                <span className="px-3 text-xs font-semibold uppercase tracking-wider text-purple-400">Administration</span>
              </div>
              <NavLink
                to={ROUTES.ADMIN}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              >
                Admin Dashboard
              </NavLink>
            </>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-2">
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="w-full text-left px-3 py-2 text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md"
              >
                Sign Out ({profile?.role})
              </button>
            ) : (
              <div className="space-y-2 px-1">
                <Link
                  to={ROUTES.LOGIN}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center w-full px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  Log In
                </Link>
                <Link
                  to={ROUTES.SIGNUP}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
