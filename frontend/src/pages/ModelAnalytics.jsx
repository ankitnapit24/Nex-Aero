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
import { BarChart2, ShieldCheck, Database, Award, Info, GitBranch } from 'lucide-react';
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

  // Format feature importances for Recharts
  const featureData = metadata?.feature_importances
    ? Object.entries(metadata.feature_importances).map(([name, val]) => ({
        name,
        importance: parseFloat((val * 100).toFixed(2)),
      }))
    : [];

  return (
    <div className="space-y-6">
      <DisclaimerBanner />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-cyan-400" />
            Model Transparency & NASA Benchmark Performance
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Methodology, feature importance weights, engine-wise validation metrics, and official test split evaluations.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 text-xs">Loading metadata...</div>
      ) : metadata ? (
        <>
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 uppercase font-medium">Model Architecture</span>
              <div className="mt-2 text-lg font-bold text-white font-mono">
                {metadata.model_name}
              </div>
              <span className="text-[11px] text-slate-400">120 Estimators, max_depth=16</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 uppercase font-medium">5-Fold GroupKFold MAE</span>
              <div className="mt-2 text-2xl font-bold text-cyan-400 font-mono">
                {metadata.cv_validation_metrics?.mean_mae_cycles} <span className="text-xs text-slate-400 font-normal">cycles</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Engine-wise zero-leakage cross-validation
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 uppercase font-medium">NASA Official Test MAE</span>
              <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
                {metadata.nasa_test_metrics?.test_mae_cycles} <span className="text-xs text-slate-400 font-normal">cycles</span>
              </div>
              <span className="text-[11px] text-slate-400">100 Test engines (RUL_FD001 target)</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 uppercase font-medium">NASA Test RMSE / R²</span>
              <div className="mt-2 text-2xl font-bold text-white font-mono">
                {metadata.nasa_test_metrics?.test_rmse_cycles}c{' '}
                <span className="text-xs font-normal text-slate-400">
                  (R² {metadata.nasa_test_metrics?.test_r2})
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Asymmetric penalty: {metadata.nasa_test_metrics?.nasa_score}</span>
            </div>
          </div>

          {/* Feature Importance Chart */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Feature Importance Weights (%)</h3>
              <p className="text-xs text-slate-400">
                Gini impurity reduction across 120 decision trees. Shows which thermodynamic measurements drive RUL degradation estimation.
              </p>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `${val}%`} />
                  <Tooltip
                    formatter={(val) => [`${val}%`, 'Relative Importance']}
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }}
                  />
                  <Bar dataKey="importance" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                    {featureData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index < 3 ? '#38bdf8' : index < 7 ? '#0284c7' : '#0369a1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Methodology & Reproducibility Documentation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
                <Database className="w-4 h-4 text-cyan-400" />
                NASA C-MAPSS FD001 Dataset Profile
              </div>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li>&bull; <strong className="text-white">Fleet Size:</strong> 100 training engines (run to failure) and 100 test engines (truncated).</li>
                <li>&bull; <strong className="text-white">Operating Regime:</strong> Sea-level ambient condition (1 flight regime).</li>
                <li>&bull; <strong className="text-white">Fault Mode:</strong> High-Pressure Compressor (HPC) stage blade wear and thermal degradation.</li>
                <li>&bull; <strong className="text-white">Constant Sensor Exclusion:</strong> 6 flat sensors (1, 5, 10, 16, 18, 19) dropped due to zero operational variance.</li>
              </ul>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Zero Data Leakage Protocol
              </div>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li>&bull; <strong className="text-white">Engine-Wise Grouping:</strong> Cross-validation splits by engine unit ID. Telemetry from the same engine never spans train and validation splits.</li>
                <li>&bull; <strong className="text-white">Identity Exclusion:</strong> Raw engine ID is an identifier, not a sensor feature, and is excluded from model inputs.</li>
                <li>&bull; <strong className="text-white">Blind Test Evaluation:</strong> Ground truth `RUL_FD001.txt` is strictly quarantined for post-hoc testing, never used during training or hyperparameter tuning.</li>
                <li>&bull; <strong className="text-white">Capped RUL Target:</strong> Piecewise linear upper bound of 125 cycles adheres to standard prognostics literature.</li>
              </ul>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
