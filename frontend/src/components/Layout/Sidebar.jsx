import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  Activity,
  Wrench,
  BarChart2,
  AlertOctagon,
  History,
  Server,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const navSections = [
    {
      heading: 'WORKSPACE',
      items: [
        { name: 'Fleet Overview', to: '/', icon: LayoutDashboard },
        { name: 'Engine Telemetry', to: '/engines', icon: Activity },
        { name: 'RUL Predictions', to: '/predictions', icon: Cpu },
        { name: 'Maintenance Triage', to: '/maintenance', icon: Wrench },
      ],
    },
    {
      heading: 'INTELLIGENCE',
      items: [
        { name: 'Model Transparency', to: '/analytics', icon: BarChart2 },
        { name: 'Anomaly Detection', to: '/anomalies', icon: AlertOctagon },
        { name: 'Prediction History', to: '/history', icon: History },
      ],
    },
    {
      heading: 'SYSTEM',
      items: [
        { name: 'Model Registry & Health', to: '/system', icon: Server },
      ],
    },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 bg-[#F6F8FA] dark:bg-[#161B22] border-r border-[#D1D9E0] dark:border-[#30363D] flex flex-col transition-all duration-200 select-none ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 border-b border-[#D1D9E0] dark:border-[#30363D] px-3.5 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-6 h-6 rounded bg-[#1F2328] dark:bg-[#E6EDF3] text-white dark:text-[#0D1117] flex items-center justify-center font-mono font-bold text-xs shrink-0">
              AG
            </div>
            <div className="truncate">
              <span className="font-semibold text-sm tracking-tight text-[#1F2328] dark:text-[#E6EDF3] block leading-none">
                AeroGuard AI
              </span>
              <span className="text-[10px] text-[#656D76] dark:text-[#848D97] tracking-wider uppercase font-mono mt-1 block leading-none">
                Turbofan Prognostics
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-7 h-7 rounded bg-[#1F2328] dark:bg-[#E6EDF3] text-white dark:text-[#0D1117] flex items-center justify-center font-mono font-bold text-xs">
            AG
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-[#656D76] dark:text-[#9198A1] hover:text-[#1F2328] dark:hover:text-[#E6EDF3] hover:bg-[#EAEEF2] dark:hover:bg-[#21262D] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {navSections.map((section) => (
          <div key={section.heading}>
            {!collapsed && (
              <div className="px-2.5 mb-1.5 text-[11px] font-semibold text-[#848D97] dark:text-[#7D8590] tracking-wider uppercase font-mono">
                {section.heading}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[#EFF2F5] dark:bg-[#21262D] text-[#0969DA] dark:text-[#4493F8] font-semibold'
                          : 'text-[#656D76] dark:text-[#9198A1] hover:text-[#1F2328] dark:hover:text-[#E6EDF3] hover:bg-[#EAEEF2] dark:hover:bg-[#21262D]/60'
                      } ${collapsed ? 'justify-center px-0' : ''}`
                    }
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#D1D9E0] dark:border-[#30363D] text-[11px] text-[#656D76] dark:text-[#848D97]">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1A7F37] shrink-0" />
            <span className="truncate font-mono text-[10px]">NASA C-MAPSS FD001</span>
          </div>
        ) : (
          <div className="flex justify-center" title="NASA C-MAPSS FD001 Active">
            <span className="w-2 h-2 rounded-full bg-[#1A7F37]" />
          </div>
        )}
      </div>
    </aside>
  );
}
