import React, { useState, useEffect } from 'react';
import { AlertOctagon, CheckCircle2, ShieldAlert, Activity, ArrowRight, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import EngineStatusBadge from '../components/EngineCards/EngineStatusBadge';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function AnomalyDetection() {
  const navigate = useNavigate();
  const [anomaliesData, setAnomaliesData] = useState({ items: [], total_evaluated: 0, anomalies_detected: 0 });
  const [loading, setLoading] = useState(true);
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnomalies();
  }, [anomalyOnly]);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAnomalies({ anomaly_only: anomalyOnly, limit: 100 });
      setAnomaliesData(data);
    } catch (err) {
      console.error('Failed to load anomaly detection results:', err);
      setError('Failed to communicate with Anomaly Detection service.');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = (anomaliesData.items || []).filter((item) => {
    if (!searchTerm) return true;
    return (
      String(item.engine_id).includes(searchTerm) ||
      `ENG-${String(item.engine_id).padStart(3, '0')}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-5">
      <DisclaimerBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D1D9E0] dark:border-[#30363D] pb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#1F2328] dark:text-[#E6EDF3] tracking-tight">
            Unsupervised Anomaly Detection
          </h1>
          <p className="text-xs text-[#656D76] dark:text-[#9198A1] mt-0.5">
            Isolation Forest sensor drift detection trained on 3,000 nominal baseline operating cycles (physical sensors only)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnomalyOnly(!anomalyOnly)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              anomalyOnly
                ? 'bg-[#CF222E]/10 border-[#CF222E] text-[#CF222E] dark:text-[#F85149]'
                : 'bg-white dark:bg-[#21262D] border-[#D1D9E0] dark:border-[#30363D] text-[#1F2328] dark:text-[#E6EDF3]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {anomalyOnly ? 'Showing Anomalies Only' : 'Filter Anomalies Only'}
          </button>
        </div>
      </div>

      {/* Key Specifications Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
          <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
            Detector Algorithm
          </span>
          <div className="mt-1 text-base font-mono font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
            Isolation Forest
          </div>
          <span className="text-[10px] text-[#848D97]">18 physical features (no cycle/RUL)</span>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
          <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
            Fleet Evaluated
          </span>
          <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
            {anomaliesData.total_evaluated || 100} units
          </div>
          <span className="text-[10px] text-[#848D97]">Terminal operational cycles</span>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
          <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
            Flagged Anomalies
          </span>
          <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#CF222E] dark:text-[#F85149]">
            {anomaliesData.anomalies_detected}
          </div>
          <span className="text-[10px] text-[#848D97]">Exceeds 5% baseline density contour</span>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
          <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
            Contamination Threshold
          </span>
          <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#0969DA] dark:text-[#4493F8]">
            0.05
          </div>
          <span className="text-[10px] text-[#848D97]">Unsupervised decision boundary</span>
        </div>
      </div>

      {/* Engineering Note */}
      <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-1.5">
        <h3 className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
          Aviation Engineering Insight: Isolation Forest vs Supervised RUL
        </h3>
        <p className="text-xs text-[#656D76] dark:text-[#9198A1] leading-relaxed">
          The Isolation Forest model isolates multivariate anomaly patterns across high-pressure compressor temperatures, burner pressures, and fuel flow rates without using operating cycle count or engine identifiers. A negative anomaly score indicates that the turbine observation falls outside the 95% nominal envelope established during early operating cycles.
        </p>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg overflow-hidden">
        <div className="p-3 border-b border-[#D1D9E0] dark:border-[#30363D] bg-[#F6F8FA] dark:bg-[#161B22] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
              Fleet Anomaly Surveillance
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EAEEF2] dark:bg-[#21262D] text-[#656D76] dark:text-[#848D97]">
              {filteredItems.length} records
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#848D97]" />
            <input
              type="text"
              placeholder="Search engine ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-white dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md text-[#1F2328] dark:text-[#E6EDF3] focus:outline-none focus:border-[#0969DA]"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#848D97]">
            Running fleet-wide Isolation Forest inference...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-[#CF222E] dark:text-[#F85149]">
            {error}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#848D97]">
            No engines matching current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F6F8FA] dark:bg-[#161B22] border-b border-[#D1D9E0] dark:border-[#30363D] text-[#656D76] dark:text-[#848D97] font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Engine Unit</th>
                  <th className="py-2.5 px-3">Observed Cycle</th>
                  <th className="py-2.5 px-3">Anomaly Classification</th>
                  <th className="py-2.5 px-3">Isolation Score</th>
                  <th className="py-2.5 px-3">Primary Sensor Deviations</th>
                  <th className="py-2.5 px-3 text-right">Estimated RUL</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1D9E0] dark:divide-[#30363D]">
                {filteredItems.map((item) => (
                  <tr
                    key={item.engine_id}
                    onClick={() => navigate(`/engines/${item.engine_id}`)}
                    className="hover:bg-[#F6F8FA] dark:hover:bg-[#21262D]/60 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#0969DA] dark:text-[#4493F8]">
                      ENG-{String(item.engine_id).padStart(3, '0')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#656D76] dark:text-[#9198A1]">
                      {item.cycle}
                    </td>
                    <td className="py-2.5 px-3">
                      {item.is_anomalous ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#CF222E]/10 text-[#CF222E] dark:text-[#F85149] border border-[#CF222E]/20">
                          <AlertOctagon className="w-3 h-3" />
                          ANOMALY FLAGGED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#1A7F37]/10 text-[#1A7F37] dark:text-[#3FB950] border border-[#1A7F37]/20">
                          <CheckCircle2 className="w-3 h-3" />
                          NOMINAL ENVELOPE
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs">
                      <span className={item.anomaly_score < 0 ? 'text-[#CF222E] dark:text-[#F85149] font-semibold' : 'text-[#656D76] dark:text-[#9198A1]'}>
                        {item.anomaly_score !== null ? item.anomaly_score.toFixed(3) : 'N/A'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      {item.top_sensor_drifts && item.top_sensor_drifts.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.top_sensor_drifts.slice(0, 2).map((drift, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-[#EAEEF2] dark:bg-[#21262D] text-[#1F2328] dark:text-[#E6EDF3] text-[10px] font-mono"
                            >
                              {drift.feature}: {drift.delta > 0 ? '+' : ''}{drift.delta} ({drift.abs_z}σ)
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#848D97]">Baseline nominal</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                      {item.predicted_rul}c
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/engines/${item.engine_id}`);
                        }}
                        className="px-2.5 py-1 rounded border border-[#D1D9E0] dark:border-[#30363D] hover:bg-[#EAEEF2] dark:hover:bg-[#30363D] text-[11px] text-[#1F2328] dark:text-[#E6EDF3] inline-flex items-center gap-1 font-medium transition-colors"
                      >
                        Inspect
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
