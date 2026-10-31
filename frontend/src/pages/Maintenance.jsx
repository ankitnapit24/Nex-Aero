import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Sliders, FileText, CheckCircle2, AlertOctagon, Filter, Search } from 'lucide-react';
import api from '../services/api';
import EngineStatusBadge from '../components/EngineCards/EngineStatusBadge';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function Maintenance() {
  const navigate = useNavigate();
  const [engines, setEngines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTierTab, setActiveTierTab] = useState('CRITICAL');
  const [criticalThreshold, setCriticalThreshold] = useState(25);
  const [warningThreshold, setWarningThreshold] = useState(50);
  const [selectedEngineForWorkOrder, setSelectedEngineForWorkOrder] = useState(null);

  // Review status simulation (in-memory state)
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState({});

  useEffect(() => {
    fetchEngines();
  }, []);

  const fetchEngines = async () => {
    try {
      setLoading(true);
      const data = await api.getEngines();
      setEngines(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Re-classify dynamically based on interactive threshold sliders
  const classifiedEngines = engines.map((e) => {
    let tier = 'NOMINAL';
    if (e.predicted_rul <= criticalThreshold) {
      tier = 'CRITICAL';
    } else if (e.predicted_rul <= warningThreshold) {
      tier = 'WARNING';
    } else if (e.predicted_rul <= 80) {
      tier = 'MODERATE';
    }
    return { ...e, dynamicTier: tier };
  });

  const criticalEngines = classifiedEngines.filter((e) => e.dynamicTier === 'CRITICAL');
  const warningEngines = classifiedEngines.filter((e) => e.dynamicTier === 'WARNING');
  const moderateEngines = classifiedEngines.filter((e) => e.dynamicTier === 'MODERATE');
  const nominalEngines = classifiedEngines.filter((e) => e.dynamicTier === 'NOMINAL');

  const displayedList =
    activeTierTab === 'CRITICAL'
      ? criticalEngines
      : activeTierTab === 'WARNING'
      ? warningEngines
      : activeTierTab === 'MODERATE'
      ? moderateEngines
      : nominalEngines;

  const toggleAcknowledge = (engineId) => {
    setAcknowledgedAlerts((prev) => ({
      ...prev,
      [engineId]: !prev[engineId],
    }));
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
            Operational maintenance assessment queue & draft engineering work order review
          </p>
        </div>
      </div>

      {/* Threshold Configurator (Restrained enterprise box) */}
      <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#D1D9E0] dark:border-[#30363D] text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
          <Sliders className="w-3.5 h-3.5 text-[#0969DA] dark:text-[#4493F8]" />
          Configurable Urgency Decision Thresholds (Operating Cycles)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs text-[#656D76] dark:text-[#9198A1] mb-1">
              <span>Critical Urgency Cap:</span>
              <span className="font-mono font-semibold text-[#CF222E]">≤ {criticalThreshold} cycles</span>
            </div>
            <input
              type="range"
              min="10"
              max="40"
              value={criticalThreshold}
              onChange={(e) => setCriticalThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-[#0969DA] cursor-pointer"
            />
            <p className="text-[11px] text-[#848D97] mt-1">
              Threshold below which engines require immediate borescope stator inspection.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs text-[#656D76] dark:text-[#9198A1] mb-1">
              <span>Warning Urgency Cap:</span>
              <span className="font-mono font-semibold text-[#9A6700]">≤ {warningThreshold} cycles</span>
            </div>
            <input
              type="range"
              min="30"
              max="70"
              value={warningThreshold}
              onChange={(e) => setWarningThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-[#0969DA] cursor-pointer"
            />
            <p className="text-[11px] text-[#848D97] mt-1">
              Threshold for planned hangar maintenance induction within 10 flight cycles.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-md border border-[#D1D9E0] dark:border-[#30363D] bg-white dark:bg-[#161B22] p-0.5 text-xs">
        <button
          onClick={() => setActiveTierTab('CRITICAL')}
          className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
            activeTierTab === 'CRITICAL'
              ? 'bg-[#EFF2F5] dark:bg-[#21262D] text-[#CF222E] font-semibold'
              : 'text-[#656D76] dark:text-[#9198A1]'
          }`}
        >
          Critical ({criticalEngines.length})
        </button>
        <button
          onClick={() => setActiveTierTab('WARNING')}
          className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
            activeTierTab === 'WARNING'
              ? 'bg-[#EFF2F5] dark:bg-[#21262D] text-[#9A6700] font-semibold'
              : 'text-[#656D76] dark:text-[#9198A1]'
          }`}
        >
          Warning ({warningEngines.length})
        </button>
        <button
          onClick={() => setActiveTierTab('MODERATE')}
          className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
            activeTierTab === 'MODERATE'
              ? 'bg-[#EFF2F5] dark:bg-[#21262D] text-[#8250DF] font-semibold'
              : 'text-[#656D76] dark:text-[#9198A1]'
          }`}
        >
          Moderate ({moderateEngines.length})
        </button>
        <button
          onClick={() => setActiveTierTab('NOMINAL')}
          className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
            activeTierTab === 'NOMINAL'
              ? 'bg-[#EFF2F5] dark:bg-[#21262D] text-[#1A7F37] font-semibold'
              : 'text-[#656D76] dark:text-[#9198A1]'
          }`}
        >
          Nominal ({nominalEngines.length})
        </button>
      </div>

      {/* Queue Table and Work Order Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Table (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-xs text-[#656D76]">Loading queue...</div>
          ) : displayedList.length === 0 ? (
            <div className="p-16 text-center text-xs text-[#848D97]">
              No units currently in {activeTierTab} tier with current threshold settings.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F6F8FA] dark:bg-[#161B22] border-b border-[#D1D9E0] dark:border-[#30363D] text-[#656D76] dark:text-[#848D97] font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Alert / Engine ID</th>
                    <th className="py-2.5 px-3">Lifespan</th>
                    <th className="py-2.5 px-3">Risk Assessment</th>
                    <th className="py-2.5 px-3 text-right">Predicted RUL</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D1D9E0] dark:divide-[#30363D]">
                  {displayedList.map((eng) => {
                    const isAck = acknowledgedAlerts[eng.engine_id];
                    return (
                      <tr
                        key={eng.engine_id}
                        className={`hover:bg-[#F6F8FA] dark:hover:bg-[#21262D]/60 transition-colors cursor-pointer ${
                          selectedEngineForWorkOrder?.engine_id === eng.engine_id
                            ? 'bg-[#EFF2F5]/60 dark:bg-[#21262D]/40'
                            : ''
                        }`}
                        onClick={() => setSelectedEngineForWorkOrder(eng)}
                      >
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#0969DA] dark:text-[#4493F8]">
                          ENG-{String(eng.engine_id).padStart(3, '0')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#656D76] dark:text-[#9198A1]">
                          {eng.total_cycles}c
                        </td>
                        <td className="py-2.5 px-3">
                          <EngineStatusBadge tier={eng.dynamicTier} />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                          {eng.predicted_rul}c
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAcknowledge(eng.engine_id);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                              isAck
                                ? 'bg-[#DAFBE1] text-[#1A7F37] border-[#3FB950]/40'
                                : 'bg-[#F6F8FA] text-[#656D76] border-[#D1D9E0]'
                            }`}
                          >
                            {isAck ? 'Acknowledged' : 'Open'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEngineForWorkOrder(eng);
                            }}
                            className="px-2 py-0.5 rounded border border-[#D1D9E0] dark:border-[#30363D] text-[11px] text-[#1F2328] dark:text-[#E6EDF3] hover:bg-[#EAEEF2]"
                          >
                            Work Order
                          </button>
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
            Maintenance Work Order Draft
          </h3>

          {selectedEngineForWorkOrder ? (
            <div className="space-y-3 text-xs font-mono">
              <div className="p-2.5 bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded space-y-1">
                <div className="text-[10px] text-[#848D97]">ORDER REF:</div>
                <div className="font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                  WO-AGY-FD001-{String(selectedEngineForWorkOrder.engine_id).padStart(3, '0')}
                </div>
                <div className="text-[10px] text-[#848D97] pt-1">TARGET UNIT:</div>
                <div className="text-[#1F2328] dark:text-[#E6EDF3]">Turbofan Turbomachine #{selectedEngineForWorkOrder.engine_id}</div>
                <div className="text-[10px] text-[#848D97] pt-1">ESTIMATED RUL:</div>
                <div className="text-[#CF222E] font-bold">{selectedEngineForWorkOrder.predicted_rul} CYCLES</div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-[#848D97] font-sans uppercase">
                  Suggested Action Protocol:
                </span>
                <p className="text-[11px] text-[#656D76] dark:text-[#9198A1] font-sans leading-relaxed p-2 bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded">
                  {selectedEngineForWorkOrder.dynamicTier === 'CRITICAL'
                    ? 'Immediate borescope optical inspection of High-Pressure Compressor stator stages. Conduct acoustic blade vibration audit.'
                    : selectedEngineForWorkOrder.dynamicTier === 'WARNING'
                    ? 'Schedule lubrication oil spectrometer sample. Verify differential pressure sensors within 10 flight cycles.'
                    : 'Log routine operational telemetry during upcoming scheduled line maintenance.'}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate(`/engines/${selectedEngineForWorkOrder.engine_id}`)}
                  className="w-full py-1.5 rounded-md bg-[#0969DA] text-white text-xs font-sans font-medium hover:bg-[#0856b3] transition-colors"
                >
                  Inspect Telemetry Curves
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#848D97]">
              Select any unit from the queue to review draft maintenance protocol.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
