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
import { BarChart2, ShieldCheck, Database, CheckCircle2, FileText, Info, HelpCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '../services/api';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function ModelAnalytics() {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  // TreeSHAP local explanation inspector state
  const [shapEngineId, setShapEngineId] = useState(1);
  const [shapData, setShapData] = useState(null);
  const [shapLoading, setShapLoading] = useState(false);
  const [shapError, setShapError] = useState(null);

  useEffect(() => {
    api.getModelMetadata()
      .then((data) => setMetadata(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    loadShapExplanation(1);
  }, []);

  const loadShapExplanation = async (eid) => {
    try {
      setShapLoading(true);
      setShapError(null);
      const res = await api.getExplain(eid);
      setShapData(res);
    } catch (err) {
      console.error('Failed to load SHAP explanation:', err);
      setShapError('TreeSHAP computation unavailable for this unit.');
    } finally {
      setShapLoading(false);
    }
  };

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
            Model Transparency & Explainability Analytics
          </h1>
          <p className="text-xs text-[#656D76] dark:text-[#9198A1] mt-0.5">
            Architectural specifications, zero-leakage cross-validation, official NASA C-MAPSS FD001 benchmark metrics, and TreeSHAP attributions
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
                Global Random Forest Feature Importance Weights (%)
              </h3>
              <p className="text-[11px] text-[#656D76] dark:text-[#848D97]">
                Normalized Gini impurity reduction across 120 decision trees. Reflects overall prognostic influence of each sensor channel across the training fleet.
              </p>
            </div>

            <div className="h-64 w-full pt-2">
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

          {/* TreeSHAP Local Explainability Card */}
          <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D1D9E0] dark:border-[#30363D]">
              <div>
                <h3 className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#0969DA]" />
                  Local TreeSHAP Feature Attributions
                </h3>
                <p className="text-[11px] text-[#656D76] dark:text-[#848D97]">
                  Exact game-theoretic Shapley values calculated by TreeSHAP for individual engine telemetry points
                </p>
              </div>

              {/* Engine Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#656D76] dark:text-[#9198A1]">Unit:</label>
                <select
                  value={shapEngineId}
                  onChange={(e) => {
                    const id = parseInt(e.target.value, 10);
                    setShapEngineId(id);
                    loadShapExplanation(id);
                  }}
                  className="bg-white dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] text-[#1F2328] dark:text-[#E6EDF3] text-xs rounded-md px-2.5 py-1 font-mono focus:outline-none focus:border-[#0969DA]"
                >
                  {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      ENG-{String(n).padStart(3, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {shapLoading ? (
              <div className="p-8 text-center text-xs text-[#848D97]">
                Evaluating TreeSHAP coalition values across 120 decision trees...
              </div>
            ) : shapError ? (
              <div className="p-4 text-xs text-[#CF222E] dark:text-[#F85149]">{shapError}</div>
            ) : shapData && shapData.explanation ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D]">
                    <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block">Base Expected RUL (E[f(x)])</span>
                    <span className="text-base font-mono font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                      {shapData.explanation.base_expected_value} cycles
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D]">
                    <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block">Predicted RUL (f(x))</span>
                    <span className="text-base font-mono font-semibold text-[#0969DA] dark:text-[#4493F8]">
                      {shapData.explanation.predicted_rul} cycles
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D]">
                    <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block">Attribution Engine</span>
                    <span className="text-base font-mono font-semibold text-[#1A7F37] dark:text-[#3FB950]">
                      {shapData.explanation.method}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-[#1F2328] dark:text-[#E6EDF3] block">
                    Top Feature SHAP Drivers (Ranked by Magnitude of Impact)
                  </span>
                  <div className="space-y-1.5">
                    {shapData.explanation.contributions.slice(0, 8).map((c, idx) => {
                      const isNegative = c.shap_value < 0;
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-md border border-[#EAEEF2] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#0D1117] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {isNegative ? (
                              <ArrowDownRight className="w-3.5 h-3.5 text-[#CF222E]" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5 text-[#1A7F37]" />
                            )}
                            <div>
                              <span className="font-mono font-medium text-[#1F2328] dark:text-[#E6EDF3]">
                                {c.feature}
                              </span>{' '}
                              <span className="text-[11px] text-[#656D76] dark:text-[#848D97]">
                                ({c.description}) = {c.value}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`font-mono text-xs font-semibold ${
                                isNegative
                                  ? 'text-[#CF222E] dark:text-[#F85149]'
                                  : 'text-[#1A7F37] dark:text-[#3FB950]'
                              }`}
                            >
                              {c.shap_value > 0 ? `+${c.shap_value}` : c.shap_value} cycles
                            </span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#EAEEF2] dark:bg-[#21262D] text-[#656D76] dark:text-[#848D97]">
                              {c.direction === 'DECREASES_RUL' ? 'Degradation Driver' : 'Life Extender'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
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
                <li>&bull; <strong className="text-[#1F2328] dark:text-[#E6EDF3]">Explainability:</strong> Global Gini feature weights and exact local TreeSHAP attributions powered by scikit-learn and shap.</li>
              </ul>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
