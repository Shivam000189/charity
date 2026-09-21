import React from 'react';
import type { ScoreRecord } from '../../types/score';

interface ScoreTrendChartProps {
  scores: ScoreRecord[];
}

export const ScoreTrendChart: React.FC<ScoreTrendChartProps> = ({ scores }) => {
  if (!scores || scores.length === 0) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No scores to display on chart. Add your first score to view your performance trend!
        </p>
      </div>
    );
  }

  // Sort chronological for left-to-right trend: oldest first, newest last
  const sorted = [...scores].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt.localeCompare(b.createdAt);
  });

  const scoresList = sorted.map((s) => s.score);
  const avgScore = (scoresList.reduce((acc, v) => acc + v, 0) / scoresList.length).toFixed(1);
  const maxScore = Math.max(...scoresList);
  const latestScore = sorted[sorted.length - 1].score;

  // Chart dimensions
  const width = 540;
  const height = 200;
  const paddingX = 45;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingTop - paddingBottom;

  // Fixed Stableford Y range 0 to 45 (or 50 for headroom)
  const minY = 0;
  const maxY = 45;

  const getX = (index: number) => {
    if (sorted.length === 1) return width / 2;
    return paddingX + (index / (sorted.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return paddingTop + chartH - ((clamped - minY) / (maxY - minY)) * chartH;
  };

  const points = sorted.map((item, idx) => ({
    x: getX(idx),
    y: getY(item.score),
    score: item.score,
    date: item.date,
  }));

  const pathD = points.length === 1
    ? ''
    : points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');

  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x},${paddingTop + chartH} L ${points[0].x},${paddingTop + chartH} Z`
    : '';

  // Format date helper: "2026-09-21" -> "Sep 21"
  const formatDateLabel = (dStr: string) => {
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }
      return dStr;
    } catch {
      return dStr;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Header & Quick stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Score Trend (Rolling {scores.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chronological progress across your retained 5 rounds
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-slate-400 block">Average</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{avgScore} pts</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block">Best</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{maxScore} pts</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block">Latest</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{latestScore} pts</span>
          </div>
        </div>
      </div>

      {/* SVG Line / Area chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[320px] overflow-visible"
          aria-label="Score Trend Line Chart"
        >
          <defs>
            <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Y Grid lines: 0, 15, 30, 45 */}
          {[0, 15, 30, 45].map((gridVal) => {
            const y = getY(gridVal);
            return (
              <g key={gridVal}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="4,4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {gridVal}
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          {areaD && <path d={areaD} fill="url(#scoreAreaGrad)" />}

          {/* Line connecting points */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Individual Points with score badges */}
          {points.map((pt, i) => (
            <g key={i} className="cursor-pointer group">
              {/* Outer halo */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="7"
                className="fill-blue-500/20 group-hover:fill-blue-500/40 transition-all"
              />
              {/* Point core */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                className="fill-white dark:fill-slate-900 stroke-blue-600 stroke-[2.5]"
              />
              {/* Score label above point */}
              <text
                x={pt.x}
                y={pt.y - 10}
                textAnchor="middle"
                className="text-[11px] font-bold fill-slate-800 dark:fill-slate-100"
              >
                {pt.score}
              </text>
              {/* Date label on X axis */}
              <text
                x={pt.x}
                y={height - 12}
                textAnchor="middle"
                className="text-[11px] fill-slate-500 dark:fill-slate-400"
              >
                {formatDateLabel(pt.date)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
