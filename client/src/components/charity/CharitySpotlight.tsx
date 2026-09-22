import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import type { Charity, CharityApiResponse } from '../../types/charity';
import { ROUTES } from '../../constants/routes';

export const CharitySpotlight: React.FC = () => {
  const [featuredCharity, setFeaturedCharity] = useState<Charity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadFeatured = async () => {
      try {
        const res = await api.get<CharityApiResponse>('/api/charities/featured');
        if (isMounted && res.charities && res.charities.length > 0) {
          setFeaturedCharity(res.charities[0]);
        }
      } catch (err) {
        console.error('Failed to load featured charity:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFeatured();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3 mx-auto mb-4" />
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  // Fallback if no charity is marked as featured
  if (!featuredCharity) {
    return (
      <div className="w-full bg-[#25153f] rounded-2xl sm:rounded-3xl p-8 sm:p-12 border border-purple-900/40 text-center space-y-3.5 shadow-xl">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
          Discover Verified Non-Profit Partners
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          Every monthly subscriber contribution funds grassroots charities across environmental preservation, healthcare access, animal welfare, and youth education.
        </p>
        <div className="pt-2">
          <Link
            to={ROUTES.CHARITIES}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Explore Charity Directory &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const heroImage = featuredCharity.logoUrl || (featuredCharity.images && featuredCharity.images[0]) || null;

  return (
    <div className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl overflow-hidden relative group">
      {/* Decorative backdrop glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-left">
        {/* Spotlight Image */}
        <div className="w-full md:w-5/12 h-64 sm:h-72 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-center shrink-0">
          {heroImage ? (
            <img
              src={heroImage}
              alt={featuredCharity.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center">
              <span className="text-5xl font-black text-purple-400 mb-2">{featuredCharity.name.charAt(0)}</span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Featured Partner</span>
            </div>
          )}
        </div>

        {/* Spotlight Content */}
        <div className="w-full md:w-7/12 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-extrabold rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <span>&#9733;</span> Featured Impact Partner
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[11px] font-semibold rounded-full capitalize">
              {featuredCharity.category}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {featuredCharity.name}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed">
            {featuredCharity.description || 'Dedicated to creating measurable real-world change through transparent community partnerships.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to={ROUTES.CHARITY_DETAILS.replace(':id', featuredCharity.id)}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              View Impact Story &rarr;
            </Link>
            <Link
              to={ROUTES.CHARITY_DONATE.replace(':id', featuredCharity.id)}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors"
            >
              Make Direct Donation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
