import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { ROUTES } from '../../constants/routes';

export const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { hasAccess } = useSubscription();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate(ROUTES.HOME);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
      isActive
        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
        : 'text-slate-300 hover:text-white hover:bg-white/5'
    }`;

  const isSubscriber = hasAccess || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-transparent py-2">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-14">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link
              to={ROUTES.HOME}
              className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg"
            >
              Digital Hero
            </Link>

            {/* Desktop Public & Nav */}
            <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
              <NavLink to={ROUTES.HOME} className={navLinkClass}>
                Home
              </NavLink>
              <NavLink to={ROUTES.ABOUT} className={navLinkClass}>
                Mission
              </NavLink>
              <NavLink to={ROUTES.CHARITIES} className={navLinkClass}>
                Charity Partners
              </NavLink>
              <NavLink to={ROUTES.DRAWS} className={navLinkClass}>
                Draws
              </NavLink>

              {user && (
                <>
                  <span className="text-slate-600 px-1">|</span>
                  <NavLink to={ROUTES.DASHBOARD} className={navLinkClass}>
                    Dashboard
                  </NavLink>
                  <NavLink to={ROUTES.SUBSCRIPTION} className={navLinkClass}>
                    Subscription
                  </NavLink>
                </>
              )}

              {isSubscriber && (
                <>
                  <NavLink to={ROUTES.MY_ENTRIES} className={navLinkClass}>
                    Tickets
                  </NavLink>
                  <NavLink to={ROUTES.MY_WINNINGS} className={navLinkClass}>
                    Winnings
                  </NavLink>
                </>
              )}

              {isAdmin && (
                <>
                  <span className="text-slate-600 px-1">|</span>
                  <NavLink
                    to={ROUTES.ADMIN}
                    className={({ isActive }) =>
                      `px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-purple-400 hover:bg-purple-950/50'
                      }`
                    }
                  >
                    Admin Portal
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          {/* Desktop Right Side CTA / Auth */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to={ROUTES.PROFILE}
                  className="text-xs font-semibold text-slate-300 hover:text-purple-400 transition-colors"
                >
                  {profile?.name || user.email?.split('@')[0]}
                  <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-slate-800 text-slate-400 border border-slate-700/50">
                    {profile?.role || 'visitor'}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700/60 hover:bg-white/10 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to={ROUTES.LOGIN}
                  className="text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to={ROUTES.SIGNUP}
                  className="px-4 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-sm shadow-purple-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#1c1d27]/95 backdrop-blur-md px-4 pt-2 pb-6 space-y-2 animate-fade-in shadow-2xl">
          <NavLink
            to={ROUTES.HOME}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-semibold ${
                isActive ? 'bg-purple-600 text-white' : 'text-slate-700 dark:text-slate-300'
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to={ROUTES.ABOUT}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-semibold ${
                isActive ? 'bg-purple-600 text-white' : 'text-slate-700 dark:text-slate-300'
              }`
            }
          >
            Mission
          </NavLink>
          <NavLink
            to={ROUTES.CHARITIES}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-semibold ${
                isActive ? 'bg-purple-600 text-white' : 'text-slate-700 dark:text-slate-300'
              }`
            }
          >
            Charity Partners
          </NavLink>
          <NavLink
            to={ROUTES.DRAWS}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-semibold ${
                isActive ? 'bg-purple-600 text-white' : 'text-slate-700 dark:text-slate-300'
              }`
            }
          >
            Draws
          </NavLink>

          {user && (
            <>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 my-1">
                <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Account</span>
              </div>
              <NavLink
                to={ROUTES.DASHBOARD}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-semibold ${
                    isActive ? 'bg-purple-600 text-white' : 'text-slate-700 dark:text-slate-300'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to={ROUTES.PROFILE}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-semibold ${
                    isActive ? 'bg-purple-600 text-white' : 'text-slate-700 dark:text-slate-300'
                  }`
                }
              >
                Profile Settings
              </NavLink>
              <NavLink
                to={ROUTES.SUBSCRIPTION}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-semibold ${
                    isActive ? 'bg-purple-600 text-white' : 'text-slate-700 dark:text-slate-300'
                  }`
                }
              >
                Manage Subscription
              </NavLink>
            </>
          )}

          {isSubscriber && (
            <>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 my-1">
                <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">Subscriber</span>
              </div>
              <NavLink
                to={ROUTES.MY_ENTRIES}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-semibold ${
                    isActive ? 'bg-purple-600 text-white' : 'text-slate-700 dark:text-slate-300'
                  }`
                }
              >
                My Draw Tickets
              </NavLink>
              <NavLink
                to={ROUTES.MY_WINNINGS}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-semibold ${
                    isActive ? 'bg-purple-600 text-white' : 'text-slate-700 dark:text-slate-300'
                  }`
                }
              >
                My Prize Winnings
              </NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 my-1">
                <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-purple-400">Admin</span>
              </div>
              <NavLink
                to={ROUTES.ADMIN}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-semibold ${
                    isActive ? 'bg-purple-600 text-white' : 'text-purple-600 dark:text-purple-400'
                  }`
                }
              >
                Admin Command Center
              </NavLink>
            </>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-3">
            {user ? (
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2.5 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
              >
                Sign Out ({profile?.role})
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to={ROUTES.LOGIN}
                  className="block text-center py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  Sign In
                </Link>
                <Link
                  to={ROUTES.SIGNUP}
                  className="block text-center py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
