import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Sun, Moon, Database, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../services/api';

export default function Header({ collapsed }) {
  const location = useLocation();
  const [backendStatus, setBackendStatus] = useState({ online: false, modelLoaded: false });
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('aeroguard-theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aeroguard-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aeroguard-theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    api.getHealth()
      .then((data) => setBackendStatus({ online: data.status === 'online', modelLoaded: data.model_loaded }))
      .catch(() => setBackendStatus({ online: false, modelLoaded: false }));
  }, []);

  // Determine breadcrumb
  const pathParts = location.pathname.split('/').filter(Boolean);
  const routeNames = {
    '': 'Fleet Overview',
    'engines': 'Engine Telemetry',
    'predictions': 'RUL Predictions',
    'maintenance': 'Maintenance Triage',
    'analytics': 'Model Transparency',
    'anomalies': 'Anomaly Detection',
    'history': 'Prediction History',
    'system': 'Model Registry & Health',
  };

  const currentPage = pathParts.length === 0 ? 'Fleet Overview' : routeNames[pathParts[0]] || pathParts[0];

  return (
    <header className="h-14 border-b border-[#D1D9E0] dark:border-[#30363D] bg-white dark:bg-[#161B22] px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs">
        <Link
          to="/"
          className="text-[#656D76] dark:text-[#9198A1] hover:text-[#1F2328] dark:hover:text-[#E6EDF3] font-medium"
        >
          AeroGuard
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#848D97] dark:text-[#7D8590]" />
        <span className="font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
          {currentPage}
        </span>
        {pathParts[1] && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-[#848D97] dark:text-[#7D8590]" />
            <span className="font-mono text-[#0969DA] dark:text-[#4493F8] font-semibold">
              ENG-{String(pathParts[1]).padStart(3, '0')}
            </span>
          </>
        )}
      </div>

      {/* Right Tools: Status indicators & Theme Switcher */}
      <div className="flex items-center gap-3">
        {/* Backend & Model Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#D1D9E0] dark:border-[#30363D] bg-[#F6F8FA] dark:bg-[#0D1117] text-[11px] font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              backendStatus.online ? 'bg-[#1A7F37]' : 'bg-[#CF222E]'
            }`}
          />
          <span className="text-[#656D76] dark:text-[#9198A1]">
            {backendStatus.online
              ? backendStatus.modelLoaded
                ? 'RF-FD001 · Active'
                : 'Artifact Missing'
              : 'Backend Offline'}
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-1.5 rounded-md border border-[#D1D9E0] dark:border-[#30363D] text-[#656D76] dark:text-[#9198A1] hover:text-[#1F2328] dark:hover:text-[#E6EDF3] hover:bg-[#F6F8FA] dark:hover:bg-[#21262D] transition-colors"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
}
