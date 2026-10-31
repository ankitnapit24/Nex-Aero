import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, AlertTriangle, CheckCircle2, Sliders, FileText, ChevronRight, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import EngineStatusBadge from '../components/EngineCards/EngineStatusBadge';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function Maintenance() {
  const navigate = useNavigate();
  const [engines, setEngines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('CRITICAL');
  const [criticalThreshold, setCriticalThreshold] = useState(25);
  const [warningThreshold, setWarningThreshold] = useState(50);
  const [selectedEngineForWorkOrder, setSelectedEngineForWorkOrder] = useState(null);

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
    activeTab === 'CRITICAL'
      ? criticalEngines
      : activeTab === 'WARNING'
      ? warningEngines
      : activeTab === 'MODERATE'
      ? moderateEngines
      : nominalEngines;

  return (
    <div className="space-y-6">
      <DisclaimerBanner />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-cyan-400" />
            Maintenance Planning & Triage Queues
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Prioritize turbofan inspections and simulate shop maintenance scheduling based on RUL exhaustion risk.
          </p>
        </div>
      </div>

      {/* Threshold Configurator Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider pb-3 border-b border-slate-800">
          <Sliders className="w-4 h-4 text-cyan-400" />
          Configurable Decision-Support Urgency Thresholds (Cycles)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Critical Urgency Cap:</span>
              <span className="font-mono font-bold text-rose-400">≤ {criticalThreshold} cycles</span>
            </div>
            <input
              type="range"
              min="10"
              max="40"
              value={criticalThreshold}
              onChange={(e) => setCriticalThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Engines below this threshold require immediate borescope compressor stage verification.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Warning Urgency Cap:</span>
              <span className="font-mono font-bold text-amber-400">≤ {warningThreshold} cycles</span>
            </div>
            <input
              type="range"
              min="30"
              max="70"
              value={warningThreshold}
              onChange={(e) => setWarningThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Engines flagged for planned hangar induction within 10 flight cycles.
            </p>
          </div>
        </div>
      </div>

      {/* Queue Selection Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('CRITICAL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'CRITICAL'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Critical Triage ({criticalEngines.length})
        </button>
        <button
          onClick={() => setActiveTab('WARNING')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'WARNING'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Warning Triage ({warningEngines.length})
        </button>
        <button
          onClick={() => setActiveTab('MODERATE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'MODERATE'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Moderate Monitoring ({moderateEngines.length})
        </button>
        <button
          onClick={() => setActiveTab('NOMINAL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'NOMINAL'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Nominal Fleets ({nominalEngines.length})
        </button>
      </div>

      {/* Queue Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading queue...</div>
          ) : displayedList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
              No engines currently categorized in {activeTab} tier with current threshold settings.
            </div>
          ) : (
            displayedList.map((eng) => (
              <div
                key={eng.engine_id}
                className={`p-4 bg-slate-900/70 border rounded-xl flex items-center justify-between gap-4 transition-all hover:border-slate-700 cursor-pointer ${
                  selectedEngineForWorkOrder?.engine_id === eng.engine_id
                    ? 'border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'border-slate-800'
                }`}
                onClick={() => setSelectedEngineForWorkOrder(eng)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">
                      ENG-{String(eng.engine_id).padStart(3, '0')}
                    </span>
                    <EngineStatusBadge tier={eng.dynamicTier} />
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Observed lifespan: <span className="text-slate-300">{eng.total_cycles} cycles</span> &bull; Ground truth RUL: <span className="text-emerald-400">{eng.true_rul} cycles</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Predicted RUL</div>
                    <div className="text-xl font-mono font-bold text-white">
                      {eng.predicted_rul} <span className="text-xs font-normal text-slate-400">cycles</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEngineForWorkOrder(eng);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 transition-colors"
                    title="Generate Draft Maintenance Order"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Maintenance Work Order Draft Panel */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider pb-3 border-b border-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Decision-Support Work Order Specimen
          </h3>

          {selectedEngineForWorkOrder ? (
            <div className="mt-4 space-y-4 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px]">WORK ORDER REF:</div>
                <div className="font-bold text-cyan-400">
                  WO-AGY-FD001-{String(selectedEngineForWorkOrder.engine_id).padStart(3, '0')}
                </div>
                <div className="text-slate-400 text-[10px] pt-1">EQUIPMENT TARGET:</div>
                <div className="text-white">CFM-type Turbofan Turbomachine / Unit #{selectedEngineForWorkOrder.engine_id}</div>
                <div className="text-slate-400 text-[10px] pt-1">CURRENT CYCLE:</div>
                <div className="text-slate-300">{selectedEngineForWorkOrder.total_cycles} FLIGHT CYCLES</div>
                <div className="text-slate-400 text-[10px] pt-1">ESTIMATED RUL:</div>
                <div className="text-rose-400 font-bold">{selectedEngineForWorkOrder.predicted_rul} CYCLES REMAINING</div>
              </div>

              <div className="space-y-1 text-slate-300">
                <div className="text-slate-400 text-[10px]">RECOMMENDED TASK PROTOCOL:</div>
                <p className="bg-slate-950/80 p-2.5 rounded border border-slate-800 font-sans text-[11px] leading-relaxed">
                  {selectedEngineForWorkOrder.dynamicTier === 'CRITICAL'
                    ? '1. Stage engine for borescope optical examination of High-Pressure Compressor (HPC) stator stages. 2. Perform acoustic blade vibration diagnostic. 3. Check bypass duct seal integrity.'
                    : selectedEngineForWorkOrder.dynamicTier === 'WARNING'
                    ? '1. Schedule routine oil lubrication spectrometer sample. 2. Clean air pressure differential sensors. 3. Book inspection slot within next 10 operating cycles.'
                    : '1. Continue standard trend health monitoring. 2. Log cycle telemetry during routine line maintenance.'}
                </p>
              </div>

              <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded text-[10px] text-amber-300/80 font-sans">
                Notice: Experimental non-authoritative advisory. Must be vetted by qualified A&P / EASA Part-66 certifying staff.
              </div>

              <button
                onClick={() => navigate(`/engines/${selectedEngineForWorkOrder.engine_id}`)}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-sans font-medium transition-colors"
              >
                Inspect Telemetry Curves for this Engine
              </button>
            </div>
          ) : (
            <div className="p-10 text-center text-slate-400 text-xs">
              Select any engine from the queue on the left to preview its decision-support maintenance recommendation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
