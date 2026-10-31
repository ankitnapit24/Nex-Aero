import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="bg-amber-950/40 border border-amber-600/30 rounded-lg p-3 text-xs text-amber-200/90 flex items-start gap-2.5 backdrop-blur-sm mb-6">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold text-amber-300">DEMO & RESEARCH PROTOTYPE ONLY:</span>
        <span className="ml-1 text-slate-300">
          This system uses the NASA C-MAPSS FD001 synthetic turbofan degradation dataset. RUL values and priority tiers are experimental decision-support estimates.
          They do <strong className="text-amber-200 underline decoration-amber-500/50">not</strong> certify aircraft airworthiness, diagnose real flight systems, or authorize maintenance without qualified human engineering review.
        </span>
      </div>
    </div>
  );
}
