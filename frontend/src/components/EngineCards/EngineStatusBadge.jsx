import React from 'react';

export default function EngineStatusBadge({ tier, size = 'sm', showDot = true }) {
  const configs = {
    CRITICAL: {
      bg: 'bg-[#FFEBE9] dark:bg-[#490202]/30 text-[#CF222E] dark:text-[#FF8182] border-[#FF8182]/40 dark:border-[#CF222E]/50',
      dot: 'bg-[#CF222E]',
      label: 'Critical (<25c)',
    },
    WARNING: {
      bg: 'bg-[#FFF8C5] dark:bg-[#4D3800]/30 text-[#9A6700] dark:text-[#D4A72C] border-[#D4A72C]/40 dark:border-[#9A6700]/50',
      dot: 'bg-[#9A6700]',
      label: 'Warning (25-50c)',
    },
    MODERATE: {
      bg: 'bg-[#FBEFFF] dark:bg-[#3D1A54]/30 text-[#8250DF] dark:text-[#D2A8FF] border-[#D2A8FF]/40 dark:border-[#8250DF]/50',
      dot: 'bg-[#8250DF]',
      label: 'Moderate (50-80c)',
    },
    NOMINAL: {
      bg: 'bg-[#DAFBE1] dark:bg-[#043310]/30 text-[#1A7F37] dark:text-[#3FB950] border-[#3FB950]/40 dark:border-[#1A7F37]/50',
      dot: 'bg-[#1A7F37]',
      label: 'Nominal (>80c)',
    },
  };

  const config = configs[tier] || configs.NOMINAL;
  const sizeClasses = size === 'lg' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${config.bg} ${sizeClasses}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />}
      <span className="leading-none">{config.label}</span>
    </span>
  );
}
