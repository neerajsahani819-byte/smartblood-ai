import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function DisclaimerBanner({ compact = false }) {
  if (compact) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 shadow-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="leading-snug">
          <span className="font-bold text-amber-800">Healthcare Prototype:</span> Final blood compatibility and donor eligibility must always be confirmed by qualified healthcare professionals or an authorized blood bank.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50/90 border-b border-amber-200/80 py-2 px-4 text-xs text-amber-950">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200/80 text-amber-900 shrink-0 uppercase tracking-wider">
            <AlertTriangle className="w-3 h-3 text-amber-700" />
            Notice
          </span>
          <span className="truncate text-amber-900 text-[11px] sm:text-xs">
            SmartBlood AI is a prototype matching & coordination platform. Final donor eligibility and cross-matching decisions must be confirmed by qualified medical professionals.
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-amber-800 shrink-0 text-[11px] font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Deterministic Matching Engine</span>
        </div>
      </div>
    </div>
  );
}
