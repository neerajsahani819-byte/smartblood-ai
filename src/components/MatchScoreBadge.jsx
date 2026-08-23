import React, { useState } from 'react';
import { Info } from 'lucide-react';

export default function MatchScoreBadge({ match, size = 'md' }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const score = match.total_score !== undefined ? match.total_score : 0;

  // Score color graduation
  let badgeColor = 'bg-green-100 text-green-800 border-green-200';
  if (score < 60) {
    badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
  } else if (score < 80) {
    badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1 font-mono font-bold border rounded px-2 py-0.5 text-xs transition-colors hover:opacity-90 cursor-pointer ${badgeColor}`}
        title="View deterministic score breakdown"
      >
        <span>{score}%</span>
        <Info className="w-3 h-3 opacity-60" />
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-full mt-1.5 w-64 p-3 bg-white border border-slate-200 rounded-xl shadow-xl z-30 text-xs text-slate-800">
          <div className="font-bold text-slate-900 pb-1.5 mb-2 border-b border-slate-100 flex justify-between items-center">
            <span>Deterministic Score</span>
            <span className="font-mono text-emerald-700 font-bold">{score}%</span>
          </div>

          <div className="space-y-1.5 font-sans">
            <div className="flex justify-between items-center text-slate-600">
              <span>Compatibility (50%):</span>
              <span className="font-mono font-bold text-slate-800">{match.compatibility_score || 100} pts</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Availability (20%):</span>
              <span className="font-mono font-bold text-slate-800">{match.availability_score || (match.availability ? 100 : 0)} pts</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Distance (20%):</span>
              <span className="font-mono font-bold text-slate-800">{match.distance_score || 0} pts</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Urgency Priority (10%):</span>
              <span className="font-mono font-bold text-slate-800">{match.priority_score || 0} pts</span>
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 leading-tight">
            Deterministic formula defined in backend/config/matchingConfig.js. No AI scoring override.
          </div>
        </div>
      )}
    </div>
  );
}
