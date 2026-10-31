import React from 'react';

export default function MetricCard({ title, value, subtitle, icon: Icon, color = 'cyan' }) {
  const colorMap = {
    rose: 'border-rose-500/30 bg-rose-950/20 text-rose-400',
    amber: 'border-amber-500/30 bg-amber-950/20 text-amber-400',
    cyan: 'border-cyan-500/30 bg-cyan-950/20 text-cyan-400',
    emerald: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400',
    indigo: 'border-indigo-500/30 bg-indigo-950/20 text-indigo-400',
  };

  const badgeClass = colorMap[color] || colorMap.cyan;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${badgeClass}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
