import React from 'react';

const BLOOD_COLORS = {
  'O-': 'bg-rose-50 text-rose-700 border-rose-200',
  'O+': 'bg-red-50 text-red-700 border-red-200',
  'A-': 'bg-amber-50 text-amber-800 border-amber-200',
  'A+': 'bg-orange-50 text-orange-800 border-orange-200',
  'B-': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'B+': 'bg-blue-50 text-blue-700 border-blue-200',
  'AB-': 'bg-purple-50 text-purple-700 border-purple-200',
  'AB+': 'bg-violet-50 text-violet-700 border-violet-200'
};

export function BloodGroupBadge({ bloodGroup, size = 'md', className = '' }) {
  const group = (bloodGroup || 'O+').toUpperCase();
  const colorStyle = BLOOD_COLORS[group] || 'bg-slate-100 text-slate-700 border-slate-200';

  const sizeStyle =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs font-bold'
      : size === 'lg'
      ? 'px-3 py-1 text-base font-extrabold'
      : 'px-2.5 py-0.5 text-sm font-bold';

  return (
    <span
      className={`inline-flex items-center justify-center font-mono border rounded-md shadow-2xs shrink-0 whitespace-nowrap ${colorStyle} ${sizeStyle} ${className}`}
    >
      {group}
    </span>
  );
}

export function UrgencyBadge({ urgency, size = 'md' }) {
  const level = (urgency || 'HIGH').toUpperCase();

  const styles = {
    CRITICAL: 'bg-red-50 text-red-700 border-red-300 font-bold',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-300 font-bold',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-300 font-semibold',
    LOW: 'bg-slate-100 text-slate-600 border-slate-200 font-medium'
  };

  const sizeStyle =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : size === 'lg'
      ? 'px-3 py-1 text-xs'
      : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-md whitespace-nowrap shrink-0 ${styles[level] || styles.HIGH} ${sizeStyle}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          level === 'CRITICAL'
            ? 'bg-red-600 animate-ping'
            : level === 'HIGH'
            ? 'bg-orange-500'
            : level === 'MEDIUM'
            ? 'bg-amber-500'
            : 'bg-slate-400'
        }`}
      />
      <span>URGENCY: {level}</span>
    </span>
  );
}

export function StatusBadge({ status, type = 'request' }) {
  const stat = (status || 'ACTIVE').toUpperCase();

  let style = 'bg-slate-100 text-slate-600 border-slate-200';

  if (type === 'request') {
    if (stat === 'ACTIVE') style = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
    if (stat === 'PARTIALLY_FILLED') style = 'bg-cyan-50 text-cyan-700 border-cyan-200 font-bold';
    if (stat === 'COMPLETED') style = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
    if (stat === 'CANCELLED') style = 'bg-slate-100 text-slate-500 border-slate-200';
  } else if (type === 'match' || type === 'response') {
    if (stat === 'ACCEPTED') style = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
    if (stat === 'NOTIFIED') style = 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
    if (stat === 'PENDING') style = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
    if (stat === 'DECLINED') style = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (type === 'notification') {
    if (stat === 'UNREAD') style = 'bg-red-50 text-red-700 border-red-200 font-bold';
    if (stat === 'READ') style = 'bg-slate-100 text-slate-500 border-slate-200';
    if (stat === 'ACCEPTED') style = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
    if (stat === 'DECLINED') style = 'bg-slate-100 text-slate-400 border-slate-200';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded border whitespace-nowrap shrink-0 ${style}`}>
      {stat.replace('_', ' ')}
    </span>
  );
}
