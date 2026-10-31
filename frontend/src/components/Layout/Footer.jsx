import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-900 bg-slate-950/90 py-6 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span>AeroGuard AI &copy; 2026. NASA C-MAPSS FD001 Prognostic Benchmark Prototype.</span>
        </div>
        <div className="text-slate-400 text-center sm:text-right">
          For hackathon & academic demonstration purposes only. Non-certified advisory heuristics.
        </div>
      </div>
    </footer>
  );
}
