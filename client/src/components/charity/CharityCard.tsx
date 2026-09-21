import React from 'react';
import { Link } from 'react-router-dom';
import type { Charity } from '../../types/charity';

interface CharityCardProps {
  charity: Charity;
  onSelect?: (charity: Charity) => void;
  isSelected?: boolean;
  actionType?: 'view' | 'select';
}

export const CharityCard: React.FC<CharityCardProps> = ({
  charity,
  onSelect,
  isSelected,
  actionType = 'view',
}) => {
  const heroImage = charity.logoUrl || (charity.images && charity.images[0]) || null;

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
          : 'border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
      } flex flex-col justify-between overflow-hidden transition-all duration-200`}
    >
      <div>
        {/* Card Header Image / Banner */}
        <div className="relative h-40 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
          {heroImage ? (
            <img
              src={heroImage}
              alt={charity.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <span className="text-3xl font-black">{charity.name.charAt(0)}</span>
              <span className="text-xs uppercase tracking-wider mt-1 font-semibold opacity-70">Charity Partner</span>
            </div>
          )}

          {/* Category Tag */}
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 backdrop-blur-sm shadow-sm border border-slate-200/50 dark:border-slate-700/50">
              {charity.category}
            </span>
          </div>

          {/* Featured Badge */}
          {charity.featured && (
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500 text-white shadow-sm flex items-center gap-1">
                <span>&#9733;</span> Featured
              </span>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">
            {charity.name}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4">
            {charity.description || 'Dedicated to creating positive, lasting community impact through transparent giving.'}
          </p>

          {/* Events Count Preview if any */}
          {charity.upcomingEvents && charity.upcomingEvents.length > 0 && (
            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mb-2 flex items-center gap-1">
              <span>&#128197;</span> {charity.upcomingEvents.length} upcoming event{charity.upcomingEvents.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/60 mt-auto flex items-center justify-between gap-2">
        {actionType === 'select' && onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(charity)}
            className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            {isSelected ? '✓ Selected' : 'Select Charity'}
          </button>
        ) : (
          <>
            <Link
              to={`/charities/${charity.id}`}
              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              View Details &rarr;
            </Link>
            <Link
              to={`/charities/${charity.id}/donate`}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              Donate
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
