import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Plane, Activity, Cpu, Wrench, BarChart2, ShieldAlert } from 'lucide-react';
import api from '../../services/api';

export default function Navbar() {
  const [backendStatus, setBackendStatus] = useState({ online: false, modelLoaded: false });

  useEffect(() => {
    api.getHealth()
      .then((data) => setBackendStatus({ online: data.status === 'online', modelLoaded: data.model_loaded }))
      .catch(() => setBackendStatus({ online: false, modelLoaded: false }));
  }, []);

  const navItems = [
    { name: 'Fleet Overview', to: '/', icon: Activity },
    { name: 'Engine Telemetry', to: '/engines', icon: Plane },
    { name: 'RUL Predictor', to: '/predictions', icon: Cpu },
    { name: 'Maintenance Triage', to: '/maintenance', icon: Wrench },
    { name: 'Model Transparency', to: '/analytics', icon: BarChart2 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                AeroGuard AI
              </span>
              <span className="block text-[10px] uppercase font-mono tracking-widest text-slate-400">
                Turbofan Prognostics
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Backend Status Pill */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-slate-900 border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${backendStatus.online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-500'}`} />
              <span className="text-slate-300">
                {backendStatus.online ? (backendStatus.modelLoaded ? 'RF-FD001 Active' : 'Model Missing') : 'Backend Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
