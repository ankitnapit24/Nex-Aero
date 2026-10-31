import React, { useState, useEffect } from 'react';
import { AlertOctagon, CheckCircle2, ShieldAlert, Activity, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import EngineStatusBadge from '../components/EngineCards/EngineStatusBadge';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function AnomalyDetection() {
  const navigate = useNavigate();
  const [engines, setEngines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getEngines()
      .then((data) => setEngines(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

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
            Isolation Forest sensor drift detection trained on 3,000 nominal baseline operating cycles
          </p>
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
          <span className="text-[10px] text-[#848D97]">100 isolation trees</span>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
          <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
            Nominal Training Envelope
          </span>
          <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#1A7F37] dark:text-[#3FB950]">
            3,000 cycles
          </div>
          <span className="text-[10px] text-[#848D97]">First 30 cycles of 100 training engines</span>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
          <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
            Contamination Ratio
          </span>
          <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#0969DA] dark:text-[#4493F8]">
            0.05
          </div>
          <span className="text-[10px] text-[#848D97]">5% outlier decision threshold</span>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
          <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
            Prognostic Objective
          </span>
          <div className="mt-1 text-base font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
            Early Drift Warning
          </div>
          <span className="text-[10px] text-[#848D97]">Independent of supervised RUL labels</span>
        </div>
      </div>

      {/* Distinction Note */}
      <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-2">
        <h3 className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
          Engineering Methodology: Supervised RUL vs Unsupervised Anomaly Scoring
        </h3>
        <p className="text-xs text-[#656D76] dark:text-[#9198A1] leading-relaxed">
          While the primary Random Forest model predicts remaining cycles until failure ($RUL$), the Isolation Forest operates in an unsupervised capacity.
          It isolates anomalous deviations in multivariate correlations (e.g. diverging ratios between HPC Outlet Temperature and static pressure) to flag abnormal degradation onset before critical failure envelopes are reached.
        </p>
      </div>

      {/* Flagged Critical Fleet Units */}
      <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg overflow-hidden">
        <div className="p-3 border-b border-[#D1D9E0] dark:border-[#30363D] bg-[#F6F8FA] dark:bg-[#161B22] flex justify-between items-center text-xs">
          <span className="font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
            Fleet Units Ranked by Critical RUL Exhaustion
          </span>
          <span className="text-[#848D97]">Click any unit to inspect sensor drift curves</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F6F8FA] dark:bg-[#161B22] border-b border-[#D1D9E0] dark:border-[#30363D] text-[#656D76] dark:text-[#848D97] font-semibold text-[11px]">
                <th className="py-2 px-3">Engine ID</th>
                <th className="py-2 px-3">Recorded Cycles</th>
                <th className="py-2 px-3">Urgency Assessment</th>
                <th className="py-2 px-3 text-right">Estimated RUL</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1D9E0] dark:divide-[#30363D]">
              {engines.slice(0, 10).map((eng) => (
                <tr
                  key={eng.engine_id}
                  onClick={() => navigate(`/engines/${eng.engine_id}`)}
                  className="hover:bg-[#F6F8FA] dark:hover:bg-[#21262D]/60 transition-colors cursor-pointer"
                >
                  <td className="py-2 px-3 font-mono font-semibold text-[#0969DA] dark:text-[#4493F8]">
                    ENG-{String(eng.engine_id).padStart(3, '0')}
                  </td>
                  <td className="py-2 px-3 font-mono text-[#656D76] dark:text-[#9198A1]">
                    {eng.total_cycles} cycles
                  </td>
                  <td className="py-2 px-3">
                    <EngineStatusBadge tier={eng.urgency_tier} />
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                    {eng.predicted_rul}c
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/engines/${eng.engine_id}`);
                      }}
                      className="px-2 py-0.5 rounded border border-[#D1D9E0] dark:border-[#30363D] text-[11px] text-[#1F2328] dark:text-[#E6EDF3]"
                    >
                      Inspect Replay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
