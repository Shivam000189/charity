import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCharities } from '../../hooks/useCharities';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import type { Charity } from '../../types/charity';
import { ROUTES } from '../../constants/routes';

export const CharityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess } = useSubscription();
  const { getCharityById, updatePreference } = useCharities();

  const [charity, setCharity] = useState<Charity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<boolean>(false);
  const [selectedSuccess, setSelectedSuccess] = useState<boolean>(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const loadCharity = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCharityById(id);
        if (isMounted) {
          if (data) {
            setCharity(data);
            const mainImg = data.logoUrl || (data.images && data.images[0]) || null;
            setActiveImage(mainImg);
          } else {
            setError('Charity not found or is currently inactive.');
          }
        }
      } catch {
        if (isMounted) setError('Failed to load charity profile.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCharity();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSelectCharity = async () => {
    if (!charity) return;
    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }
    if (!hasAccess) {
      navigate(ROUTES.SUBSCRIPTION, { state: { paywall: true } });
      return;
    }

    setSelecting(true);
    try {
      const res = await updatePreference(charity.id, 10);
      if (res.success) {
        setSelectedSuccess(true);
      }
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
        <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
      </div>
    );
  }

  if (error || !charity) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Charity Profile Unavailable</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {error || 'The requested charity profile could not be found.'}
        </p>
        <Link
          to={ROUTES.CHARITIES}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
        >
          &larr; Back to Charities
        </Link>
      </div>
    );
  }

  const allImages = [
    ...(charity.logoUrl ? [charity.logoUrl] : []),
    ...(charity.images || []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Back Navigation */}
      <div>
        <Link
          to={ROUTES.CHARITIES}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          &larr; Back to all charities
        </Link>
      </div>

      {/* Hero Banner Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {/* Main Image Display */}
        <div className="h-72 sm:h-96 w-full bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center overflow-hidden">
          {activeImage ? (
            <img
              src={activeImage}
              alt={charity.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
          ) : (
            <div className="flex flex-col items-center text-slate-400">
              <span className="text-6xl font-black text-blue-500">{charity.name.charAt(0)}</span>
              <span className="text-xs uppercase font-bold tracking-wider mt-2">Verified Partner</span>
            </div>
          )}

          {/* Tags */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200/60 dark:border-slate-700/60">
              {charity.category}
            </span>
            {charity.featured && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-500 text-white shadow-sm flex items-center gap-1">
                <span>&#9733;</span> Featured Partner
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail Strip if multiple images */}
        {allImages.length > 1 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 overflow-x-auto">
            {allImages.map((img, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveImage(img)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                  activeImage === img ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Thumb ${index}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Hero Details & Actions */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {charity.name}
              </h1>
              {charity.websiteUrl && (
                <a
                  href={charity.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1"
                >
                  Visit Official Website &rarr;
                </a>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={`/charities/${charity.id}/donate`}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <span>&hearts;</span> Make a Direct Donation
              </Link>

              {hasAccess && (
                <button
                  type="button"
                  onClick={handleSelectCharity}
                  disabled={selecting || selectedSuccess}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-colors ${
                    selectedSuccess
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {selectedSuccess ? '✓ Selected as Subscription Partner' : selecting ? 'Selecting...' : 'Select for Monthly Subscription'}
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              About the Mission
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {charity.description || 'No detailed mission statement provided.'}
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming Events Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Upcoming Events &amp; Initiatives
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Community charity opens, golf days, and fundraising gatherings.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
            {charity.upcomingEvents?.length || 0} Event{charity.upcomingEvents?.length === 1 ? '' : 's'}
          </span>
        </div>

        {!charity.upcomingEvents || charity.upcomingEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            No upcoming events currently scheduled for this organization.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {charity.upcomingEvents.map((ev, i) => (
              <div
                key={ev.id || i}
                className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {ev.title}
                  </h4>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 whitespace-nowrap">
                    {ev.date}
                  </span>
                </div>
                {ev.location && (
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <span>&#128205;</span> {ev.location}
                  </p>
                )}
                {ev.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {ev.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
