import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Sliders, FileText, CheckCircle2, AlertOctagon, Filter, Search, Check, Clock } from 'lucide-react';
import api from '../services/api';
import EngineStatusBadge from '../components/EngineCards/EngineStatusBadge';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function Maintenance() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [counts, setCounts] = useState({ total_count: 0, open_count: 0, acknowledged_count: 0, resolved_count: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAlertForWorkOrder, setSelectedAlertForWorkOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = statusFilter === 'ALL' ? {} : { status: statusFilter };
      const data = await api.getAlerts(params);
      setAlerts(data.alerts || []);
      setCounts({
        total_count: data.total_count || 0,
        open_count: data.open_count || 0,
        acknowledged_count: data.acknowledged_count || 0,
        resolved_count: data.resolved_count || 0,
      });
      if (data.alerts && data.alerts.length > 0 && !selectedAlertForWorkOrder) {
        setSelectedAlertForWorkOrder(data.alerts[0]);
      }
    } catch (e) {
      console.error('Failed to load alerts from backend:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (alertId, newStatus, e) => {
    if (e) e.stopPropagation();
    try {
      setUpdatingId(alertId);
      const updated = await api.updateAlertStatus(alertId, newStatus);
      // Update local alert in list
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: updated.status, acknowledged_at: updated.acknowledged_at, resolved_at: updated.resolved_at } : a))
      );
      if (selectedAlertForWorkOrder?.id === alertId) {
        setSelectedAlertForWorkOrder((prev) => ({ ...prev, status: updated.status }));
      }
      // Refresh status counts
      const fresh = await api.getAlerts(statusFilter === 'ALL' ? {} : { status: statusFilter });
      setCounts({
        total_count: fresh.total_count || 0,
        open_count: fresh.open_count || 0,
        acknowledged_count: fresh.acknowledged_count || 0,
        resolved_count: fresh.resolved_count || 0,
      });
    } catch (err) {
      console.error('Failed to update alert status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <DisclaimerBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D1D9E0] dark:border-[#30363D] pb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#1F2328] dark:text-[#E6EDF3] tracking-tight">
            Maintenance Triage & Review Queue
          </h1>
          <p className="text-xs text-[#656D76] dark:text-[#9198A1] mt-0.5">
            Persistent SQLite review queue & engineering work order drafting for critical fleet alerts
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
          <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
            Total Flagged Alerts
          </span>
          <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
            {counts.total_count}
          </div>
          <span className="text-[10px] text-[#848D97]">Fleet scan baseline</span>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
          <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
            Pending Review (Open)
          </span>
          <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#CF222E] dark:text-[#F85149]">
            {counts.open_count}
          </div>
          <span className="text-[10px] text-[#848D97]">Awaiting engineer acknowledgment</span>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
          <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
            Under Investigation
          </span>
          <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#9A6700] dark:text-[#D29922]">
            {counts.acknowledged_count}
          </div>
          <span className="text-[10px] text-[#848D97]">Acknowledged by reliability team</span>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
          <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
            Resolved / Cleared
          </span>
          <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#1A7F37] dark:text-[#3FB950]">
            {counts.resolved_count}
          </div>
          <span className="text-[10px] text-[#848D97]">Maintenance work completed</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-[#D1D9E0] dark:border-[#30363D] bg-white dark:bg-[#161B22] p-0.5 text-xs">
          {['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                statusFilter === tab
                  ? 'bg-[#EFF2F5] dark:bg-[#21262D] text-[#0969DA] dark:text-[#4493F8] font-semibold'
                  : 'text-[#656D76] dark:text-[#9198A1]'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()} ({tab === 'ALL' ? counts.total_count : tab === 'OPEN' ? counts.open_count : tab === 'ACKNOWLEDGED' ? counts.acknowledged_count : counts.resolved_count})
            </button>
          ))}
        </div>
      </div>

      {/* Queue Table and Work Order Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Table (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-xs text-[#656D76]">Loading persistent maintenance alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="p-16 text-center text-xs text-[#848D97]">
              No alerts currently match status filter: {statusFilter}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F6F8FA] dark:bg-[#161B22] border-b border-[#D1D9E0] dark:border-[#30363D] text-[#656D76] dark:text-[#848D97] font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Alert Ref</th>
                    <th className="py-2.5 px-3">Engine Unit</th>
                    <th className="py-2.5 px-3">Urgency Tier</th>
                    <th className="py-2.5 px-3 text-right">Predicted RUL</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Workflow Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D1D9E0] dark:divide-[#30363D]">
                  {alerts.map((al) => {
                    const isSelected = selectedAlertForWorkOrder?.id === al.id;
                    return (
                      <tr
                        key={al.id}
                        className={`hover:bg-[#F6F8FA] dark:hover:bg-[#21262D]/60 transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#EFF2F5]/60 dark:bg-[#21262D]/40' : ''
                        }`}
                        onClick={() => setSelectedAlertForWorkOrder(al)}
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#656D76] dark:text-[#848D97]">
                          ALT-{String(al.id).padStart(4, '0')}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#0969DA] dark:text-[#4493F8]">
                          ENG-{String(al.engine_id).padStart(3, '0')}
                        </td>
                        <td className="py-2.5 px-3">
                          <EngineStatusBadge tier={al.risk_level} />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                          {al.predicted_rul.toFixed(1)}c
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              al.status === 'RESOLVED'
                                ? 'bg-[#1A7F37]/10 text-[#1A7F37] dark:text-[#3FB950] border-[#1A7F37]/30'
                                : al.status === 'ACKNOWLEDGED'
                                ? 'bg-[#9A6700]/10 text-[#9A6700] dark:text-[#D29922] border-[#9A6700]/30'
                                : 'bg-[#CF222E]/10 text-[#CF222E] dark:text-[#F85149] border-[#CF222E]/30'
                            }`}
                          >
                            {al.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {al.status === 'OPEN' && (
                              <button
                                disabled={updatingId === al.id}
                                onClick={(e) => handleUpdateStatus(al.id, 'ACKNOWLEDGED', e)}
                                className="px-2 py-0.5 rounded border border-[#D1D9E0] dark:border-[#30363D] hover:bg-[#EAEEF2] dark:hover:bg-[#30363D] text-[10px] text-[#1F2328] dark:text-[#E6EDF3] transition-colors"
                              >
                                Acknowledge
                              </button>
                            )}
                            {al.status !== 'RESOLVED' && (
                              <button
                                disabled={updatingId === al.id}
                                onClick={(e) => handleUpdateStatus(al.id, 'RESOLVED', e)}
                                className="px-2 py-0.5 rounded bg-[#1A7F37]/10 hover:bg-[#1A7F37]/20 border border-[#1A7F37]/30 text-[10px] text-[#1A7F37] dark:text-[#3FB950] transition-colors"
                              >
                                Resolve
                              </button>
                            )}
                            {al.status === 'RESOLVED' && (
                              <button
                                disabled={updatingId === al.id}
                                onClick={(e) => handleUpdateStatus(al.id, 'OPEN', e)}
                                className="px-2 py-0.5 rounded border border-[#D1D9E0] dark:border-[#30363D] hover:bg-[#EAEEF2] dark:hover:bg-[#30363D] text-[10px] text-[#656D76] dark:text-[#848D97] transition-colors"
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Work Order Draft Preview (1 col) */}
        <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3] pb-2 border-b border-[#D1D9E0] dark:border-[#30363D] flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#0969DA]" />
            Maintenance Work Order Review
          </h3>

          {selectedAlertForWorkOrder ? (
            <div className="space-y-3 text-xs font-mono">
              <div className="p-2.5 bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded space-y-1">
                <div className="text-[10px] text-[#848D97]">WORK ORDER ID:</div>
                <div className="font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                  WO-AGY-ALT-{String(selectedAlertForWorkOrder.id).padStart(4, '0')}
                </div>
                <div className="text-[10px] text-[#848D97] pt-1">TARGET TURBOMACHINE:</div>
                <div className="text-[#1F2328] dark:text-[#E6EDF3]">Engine #{selectedAlertForWorkOrder.engine_id} (Cycle {selectedAlertForWorkOrder.cycle})</div>
                <div className="text-[10px] text-[#848D97] pt-1">ESTIMATED REMAINING USEFUL LIFE:</div>
                <div className="text-[#CF222E] font-bold">{selectedAlertForWorkOrder.predicted_rul.toFixed(1)} CYCLES</div>
                <div className="text-[10px] text-[#848D97] pt-1">TRIGGER REASON:</div>
                <div className="text-[11px] font-sans text-[#656D76] dark:text-[#9198A1]">{selectedAlertForWorkOrder.trigger_reason}</div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-[#848D97] font-sans uppercase">
                  Advisory Action Protocol (Review-Oriented):
                </span>
                <p className="text-[11px] text-[#656D76] dark:text-[#9198A1] font-sans leading-relaxed p-2 bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded">
                  {selectedAlertForWorkOrder.risk_level === 'CRITICAL'
                    ? 'Flag for engineering review and borescope inspection by authorized aviation maintenance personnel according to applicable technical manual.'
                    : selectedAlertForWorkOrder.risk_level === 'WARNING'
                    ? 'Schedule engineering evaluation and sensor verification during next scheduled maintenance window.'
                    : 'Operating parameters within permissible range. Continue standard fleet monitoring per maintenance schedule.'}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => navigate(`/engines/${selectedAlertForWorkOrder.engine_id}`)}
                  className="w-full py-1.5 rounded-md bg-[#0969DA] text-white text-xs font-sans font-medium hover:bg-[#0856b3] transition-colors"
                >
                  Inspect Engine Telemetry Curves
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#848D97]">
              Select any alert from the queue to inspect draft maintenance protocol.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
