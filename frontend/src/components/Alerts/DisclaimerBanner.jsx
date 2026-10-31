import React from 'react';
import { Info } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="bg-[#F6F8FA] dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-3.5 py-2 text-xs text-[#656D76] dark:text-[#9198A1] flex items-center gap-2.5 mb-5">
      <Info className="w-4 h-4 text-[#0969DA] dark:text-[#4493F8] shrink-0" />
      <span className="leading-relaxed">
        <strong className="font-semibold text-[#1F2328] dark:text-[#E6EDF3]">Research prototype</strong> using NASA C-MAPSS FD001 benchmark data.
        RUL estimates and risk classifications are experimental decision-support outputs and do not certify airworthiness or authorize maintenance.
      </span>
    </div>
  );
}
