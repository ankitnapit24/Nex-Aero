import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertCircle, Clock, Zap, ArrowUpDown, ChevronRight, Activity } from 'lucide-react';
import api from '../services/api';
import MetricCard from '../components/Dashboard/MetricCard';
import EngineStatusBadge from '../components/EngineCards/EngineStatusBadge';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function Dashboard() {
  const navigate = useNavigate();
  const [engines, setEngines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');

  useEffect(() => {
    fetchEngines();
  }, []);

  const fetchEngines = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEngines();
      setEngines(data);
    } catch (err) {
      setError('Unable to connect to AeroGuard AI backend. Ensure FastAPI server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  // Metrics computation
  const counts = {
    TOTAL: engines.length,
    CRITICAL: engines.filter((e) => e.urgency_tier === 'CRITICAL').length,
    WARNING: engines.filter((e) => e.urgency_tier === 'WARNING').length,
    MODERATE: engines.filter((e) => e.urgency_tier === 'MODERATE').length,
    NOMINAL: engines.filter((e) => e.urgency_tier === 'NOMINAL').length,
  };

  // Filtering
  const filteredEngines = engines.filter((eng) => {
    const matchesSearch = eng.engine_id.toString().includes(searchTerm.trim());
    const matchesTier = selectedTier === 'ALL' || eng.urgency_tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <DisclaimerBanner />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Turbofan Fleet Health Overview
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              NASA C-MAPSS FD001
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time Remaining Useful Life (RUL) inference across 100 test engines based on multi-sensor degradation telemetry.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <MetricCard
          title="Monitored Fleet"
          value={loading ? '...' : counts.TOTAL}
          subtitle="Test fleet units"
          icon={Activity}
          color="indigo"
        />
        <MetricCard
          title="Critical Assessment"
          value={loading ? '...' : counts.CRITICAL}
          subtitle="RUL ≤ 25 operating cycles"
          icon={AlertCircle}
          color="rose"
        />
        <MetricCard
          title="Elevated Attention"
          value={loading ? '...' : counts.WARNING}
          subtitle="25 < RUL ≤ 50 cycles"
          icon={Clock}
          color="amber"
        />
        <MetricCard
          title="Moderate Wear"
          value={loading ? '...' : counts.MODERATE}
          subtitle="50 < RUL ≤ 80 cycles"
          icon={Zap}
          color="cyan"
        />
        <MetricCard
          title="Nominal Condition"
          value={loading ? '...' : counts.NOMINAL}
          subtitle="RUL > 80 cycles"
          icon={Activity}
          color="emerald"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Engine ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'CRITICAL', 'WARNING', 'MODERATE', 'NOMINAL'].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedTier === tier
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tier} {tier !== 'ALL' && `(${counts[tier] || 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Engine Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span>Fleet Prioritization Triage</span>
            <span className="text-xs text-slate-400 font-normal">
              (Ranked by Urgency: Lowest Remaining Useful Life First)
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Showing {filteredEngines.length} of {engines.length} engines
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            Loading engine telemetry and executing model inference...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs">
            <p>{error}</p>
            <button
              onClick={fetchEngines}
              className="mt-3 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredEngines.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No engines matching search or filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-medium border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Engine ID</th>
                  <th className="py-3 px-4">Operating Cycles</th>
                  <th className="py-3 px-4">Urgency Assessment</th>
                  <th className="py-3 px-4 text-right">Predicted RUL</th>
                  <th className="py-3 px-4 text-right">NASA Ground Truth</th>
                  <th className="py-3 px-4 text-right">Error (Δ cycles)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredEngines.map((eng) => {
                  const errorDelta = eng.true_rul !== null && eng.predicted_rul !== null
                    ? (eng.predicted_rul - eng.true_rul).toFixed(1)
                    : 'N/A';
                  
                  return (
                    <tr
                      key={eng.engine_id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/engines/${eng.engine_id}`)}
                    >
                      <td className="py-3 px-4 font-semibold text-cyan-300">
                        ENG-{String(eng.engine_id).padStart(3, '0')}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {eng.total_cycles} cycles recorded
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <EngineStatusBadge tier={eng.urgency_tier} />
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        {eng.predicted_rul} <span className="text-[10px] text-slate-400 font-normal">cycles</span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {eng.true_rul !== null ? `${eng.true_rul} cycles` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            Math.abs(parseFloat(errorDelta)) <= 15
                              ? 'text-emerald-400 bg-emerald-950/40'
                              : 'text-amber-400 bg-amber-950/40'
                          }`}
                        >
                          {parseFloat(errorDelta) > 0 ? `+${errorDelta}` : errorDelta}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/engines/${eng.engine_id}`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-cyan-600 hover:text-white transition-all text-[11px]"
                        >
                          Inspect
                          <ChevronRight className="w-3 h-3" />
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
    </div>
  );
}
