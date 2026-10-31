import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#0D1117] text-[#1F2328] dark:text-[#E6EDF3] flex transition-colors">
      {/* Persistent Left Sidebar */}
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      {/* Main Body Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          collapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <Header collapsed={collapsed} />

        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto space-y-6">
          {children}
        </main>

        <footer className="border-t border-[#D1D9E0] dark:border-[#30363D] py-4 px-6 text-[11px] text-[#848D97] dark:text-[#7D8590] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AeroGuard AI &bull; NASA C-MAPSS Turbofan Prognostics Research Prototype</span>
          <span className="font-mono text-[10px]">Decision-support heuristic &bull; Not for airworthiness certification</span>
        </footer>
      </div>
    </div>
  );
}
