import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { BarChart2, ShieldCheck, Database, CheckCircle2, FileText, Info } from 'lucide-react';
import api from '../services/api';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function ModelAnalytics() {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getModelMetadata()
      .then((data) => setMetadata(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const featureData = metadata?.feature_importances
    ? Object.entries(metadata.feature_importances).map(([name, val]) => ({
        name,
        importance: parseFloat((val * 100).toFixed(2)),
      }))
    : [];

  return (
    <div className="space-y-5">
      <DisclaimerBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D1D9E0] dark:border-[#30363D] pb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#1F2328] dark:text-[#E6EDF3] tracking-tight">
            Model Transparency & NASA Benchmark Performance
          </h1>
          <p className="text-xs text-[#656D76] dark:text-[#9198A1] mt-0.5">
            Architectural specifications, zero-leakage cross-validation, and official NASA C-MAPSS FD001 test metrics
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-[#656D76]">Loading model registry metadata...</div>
      ) : metadata ? (
        <>
          {/* Key Metric Highlights (Enterprise Stat Panels) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
              <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
                Model Architecture
              </span>
              <div className="mt-1 text-base font-mono font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                {metadata.model_name}
              </div>
              <span className="text-[10px] text-[#848D97]">120 trees &bull; max_depth=16</span>
            </div>

            <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
              <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
                5-Fold GroupKFold MAE
              </span>
              <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#0969DA] dark:text-[#4493F8]">
                {metadata.cv_validation_metrics?.mean_mae_cycles}{' '}
                <span className="text-xs font-normal text-[#848D97]">cycles</span>
              </div>
              <span className="text-[10px] text-[#848D97]">Engine-wise zero-leakage CV</span>
            </div>

            <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
              <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
                NASA Test Set MAE
              </span>
              <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#1A7F37] dark:text-[#3FB950]">
                {metadata.nasa_test_metrics?.test_mae_cycles}{' '}
                <span className="text-xs font-normal text-[#848D97]">cycles</span>
              </div>
              <span className="text-[10px] text-[#848D97]">100 test engines (RUL_FD001)</span>
            </div>

            <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
              <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
                NASA Test RMSE / R²
              </span>
              <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                {metadata.nasa_test_metrics?.test_rmse_cycles}c{' '}
                <span className="text-xs font-normal text-[#848D97]">
                  (R² {metadata.nasa_test_metrics?.test_r2})
                </span>
              </div>
              <span className="text-[10px] text-[#848D97]">Asymmetric Penalty: {metadata.nasa_test_metrics?.nasa_score}</span>
            </div>
          </div>

          {/* Feature Importance Bar Chart */}
          <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                Random Forest Feature Importance Weights (%)
              </h3>
              <p className="text-[11px] text-[#656D76] dark:text-[#848D97]">
                Normalized Gini impurity reduction across 120 decision trees. Reflects relative prognostic influence of each sensor channel.
              </p>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#EAEEF2" className="dark:stroke-[#21262D]" />
                  <XAxis
                    dataKey="name"
                    stroke="#848D97"
                    fontSize={10}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis stroke="#848D97" fontSize={11} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Relative Importance']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D1D9E0',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#1F2328',
                    }}
                  />
                  <Bar dataKey="importance" fill="#0969DA" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Model Configuration & Zero Leakage Protocol */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-2.5">
              <h4 className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#0969DA]" />
                Dataset & Operating Profile
              </h4>
              <ul className="text-xs text-[#656D76] dark:text-[#9198A1] space-y-1.5 leading-relaxed font-sans">
                <li>&bull; <strong className="text-[#1F2328] dark:text-[#E6EDF3]">Benchmark:</strong> NASA C-MAPSS FD001 (Commercial Modular Aero-Propulsion System Simulation).</li>
                <li>&bull; <strong className="text-[#1F2328] dark:text-[#E6EDF3]">Training Fleet:</strong> 100 run-to-failure engines (20,631 records).</li>
                <li>&bull; <strong className="text-[#1F2328] dark:text-[#E6EDF3]">Test Fleet:</strong> 100 truncated trajectory engines (13,096 records).</li>
                <li>&bull; <strong className="text-[#1F2328] dark:text-[#E6EDF3]">Fault Mode:</strong> High-Pressure Compressor (HPC) stage degradation.</li>
                <li>&bull; <strong className="text-[#1F2328] dark:text-[#E6EDF3]">Constant Sensor Exclusion:</strong> 6 flat sensors (`sensor_1, 5, 10, 16, 18, 19`) dropped due to zero operational variance.</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-2.5">
              <h4 className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1A7F37]" />
                Zero Data Leakage Protocol
              </h4>
              <ul className="text-xs text-[#656D76] dark:text-[#9198A1] space-y-1.5 leading-relaxed font-sans">
                <li>&bull; <strong className="text-[#1F2328] dark:text-[#E6EDF3]">Engine-Wise Grouping:</strong> Cross-validation splits strictly by `engine_id` using `GroupKFold`. An engine's cycles never span train and test folds.</li>
                <li>&bull; <strong className="text-[#1F2328] dark:text-[#E6EDF3]">Identity Feature Omission:</strong> Raw unit ID is an identifier, not a physical sensor feature, and is excluded from training.</li>
                <li>&bull; <strong className="text-[#1F2328] dark:text-[#E6EDF3]">Blind Test Isolation:</strong> Ground truth `RUL_FD001.txt` is quarantined exclusively for terminal evaluation.</li>
                <li>&bull; <strong className="text-[#1F2328] dark:text-[#E6EDF3]">Explainability:</strong> Global Gini feature weights shown above. Local SHAP tree attribution is scheduled for future extension.</li>
              </ul>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
