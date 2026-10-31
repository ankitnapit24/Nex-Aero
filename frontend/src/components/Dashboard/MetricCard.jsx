import React from 'react';

export default function MetricCard({ title, value, subtitle, badge }) {
  return (
    <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#656D76] dark:text-[#9198A1]">{title}</span>
        {badge}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-[#1F2328] dark:text-[#E6EDF3] tracking-tight">
        {value}
      </div>
      {subtitle && (
        <p className="mt-1 text-[11px] text-[#656D76] dark:text-[#848D97]">{subtitle}</p>
      )}
    </div>
  );
}
