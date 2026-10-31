import React from 'react';

export default function EngineStatusBadge({ tier, size = 'sm' }) {
  const configs = {
    CRITICAL: {
      bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
      dot: 'bg-rose-400 animate-pulse',
      label: 'CRITICAL (<25c)',
    },
    WARNING: {
      bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
      dot: 'bg-amber-400',
      label: 'WARNING (25-50c)',
    },
    MODERATE: {
      bg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
      dot: 'bg-cyan-400',
      label: 'MODERATE (50-80c)',
    },
    NOMINAL: {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      dot: 'bg-emerald-400',
      label: 'NOMINAL (>80c)',
    },
  };

  const config = configs[tier] || configs.NOMINAL;
  const sizeClasses = size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      {config.label}
    </span>
  );
}
