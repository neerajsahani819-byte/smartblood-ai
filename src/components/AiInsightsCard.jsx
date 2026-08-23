import React from 'react';
import { Sparkles, Clock, Users, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AiInsightsCard({ insights, loading = false, onRefresh }) {
  if (loading) {
    return (
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-5 shadow-xs animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-indigo-200 rounded-lg" />
          <div className="h-4 bg-indigo-200 rounded w-48" />
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-indigo-100 rounded w-full" />
          <div className="h-4 bg-indigo-100 rounded w-5/6" />
          <div className="h-12 bg-white/80 rounded-lg p-3" />
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 text-center text-indigo-900/60">
        <p className="text-xs">No AI insights generated yet.</p>
      </div>
    );
  }

  const isGemini = insights.source === 'gemini';

  return (
    <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-5 shadow-xs relative overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-indigo-200/70">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-indigo-950 uppercase tracking-tight">AI Prioritization Insights</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white text-indigo-700 border border-indigo-200 shadow-2xs">
                {isGemini ? (insights.model_used || 'Gemini Flash') : 'Algorithmic Prioritization'}
              </span>
            </div>
            <p className="text-[11px] text-indigo-800/80">Non-medical operational prioritization & logistics analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-indigo-700/80 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5" />
            Age: {insights.request_age_minutes}m
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-[11px] px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-md transition-colors font-semibold cursor-pointer shadow-2xs"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-indigo-100 rounded-lg p-3 shadow-2xs">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            Operational Priority
          </div>
          <div className="text-sm font-bold text-slate-900">{insights.priority_level}</div>
        </div>

        <div className="bg-white border border-indigo-100 rounded-lg p-3 shadow-2xs">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            Active Candidates
          </div>
          <div className="text-sm font-bold text-slate-900">
            {insights.available_candidates_count} Available <span className="text-xs font-normal text-slate-500">({insights.total_candidates_count} registered)</span>
          </div>
        </div>

        <div className="bg-white border border-indigo-100 rounded-lg p-3 shadow-2xs">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Estimated Response
          </div>
          <div className="text-sm font-bold text-slate-900">{insights.estimated_response_window || '15-30 mins'}</div>
        </div>
      </div>

      {/* Rationale & Strategy */}
      <div className="space-y-3 mb-4 text-xs sm:text-sm">
        <div className="bg-white border border-indigo-100 rounded-lg p-3.5 shadow-2xs">
          <div className="text-xs font-bold text-indigo-950 mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Recommended Contact Strategy:
          </div>
          <p className="text-indigo-900 text-xs sm:text-sm leading-relaxed">{insights.contact_strategy}</p>
        </div>

        <div className="text-xs text-indigo-950 leading-relaxed bg-white/70 p-3 rounded-lg border border-indigo-100">
          <span className="font-bold text-indigo-950">Urgency Rationale: </span>
          {insights.urgency_rationale || insights.summary}
        </div>

        {insights.key_considerations && insights.key_considerations.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logistical Notes</div>
            <ul className="list-disc list-inside text-xs text-indigo-900 space-y-1 pl-1">
              {insights.key_considerations.map((note, idx) => (
                <li key={idx} className="leading-snug">{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Mandatory Disclaimer Box */}
      <div className="mt-3 pt-3 border-t border-indigo-200 text-[10px] text-indigo-800 italic leading-snug flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        <span>Information provided for operational assistance only. Final donor eligibility and cross-matching decisions must be confirmed by authorized healthcare professionals.</span>
      </div>
    </div>
  );
}
