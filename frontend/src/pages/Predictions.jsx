import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Cpu, Send, RefreshCw, CheckCircle, Clock, AlertTriangle, ArrowRight, ShieldCheck, BarChart } from 'lucide-react';
import api from '../services/api';
import EngineStatusBadge from '../components/EngineCards/EngineStatusBadge';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function Predictions() {
  const location = useLocation();
  const initialEngineId = location.state?.engineId || 34;

  const [engineId, setEngineId] = useState(initialEngineId);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    cycle: 150,
    setting_1: -0.0007,
    setting_2: -0.0004,
    setting_3: 100.0,
    sensor_2: 642.5,
    sensor_3: 1585.0,
    sensor_4: 1400.0,
    sensor_6: 21.61,
    sensor_7: 554.0,
    sensor_8: 2388.05,
    sensor_9: 9050.0,
    sensor_11: 47.3,
    sensor_12: 521.8,
    sensor_13: 2388.08,
    sensor_14: 8130.0,
    sensor_15: 8.42,
    sensor_17: 392.0,
    sensor_20: 39.0,
    sensor_21: 23.4,
  });

  useEffect(() => {
    loadEngineTelemetry(engineId);
    fetchHistory();
  }, [engineId]);

  const fetchHistory = async () => {
    try {
      const data = await api.getPredictions(10);
      setPredictionHistory(data);
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const loadEngineTelemetry = async (eid) => {
    try {
      setLoadingDefaults(true);
      setError(null);
      const detail = await api.getEngine(eid);
      if (detail && detail.telemetry_history.length > 0) {
        const last = detail.telemetry_history[detail.telemetry_history.length - 1];
        setFormData({
          cycle: last.cycle,
          setting_1: last.setting_1,
          setting_2: last.setting_2,
          setting_3: last.setting_3,
          sensor_2: last.sensor_2,
          sensor_3: last.sensor_3,
          sensor_4: last.sensor_4,
          sensor_6: 21.61,
          sensor_7: last.sensor_7,
          sensor_8: last.sensor_8,
          sensor_9: last.sensor_9,
          sensor_11: last.sensor_11,
          sensor_12: last.sensor_12,
          sensor_13: last.sensor_13,
          sensor_14: last.sensor_14,
          sensor_15: last.sensor_15,
          sensor_17: last.sensor_17,
          sensor_20: last.sensor_20,
          sensor_21: last.sensor_21,
        });
      }
    } catch (err) {
      setError(`Could not pull telemetry for ENG-${eid}`);
    } finally {
      setLoadingDefaults(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  const handleRunInference = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        engine_id: parseInt(engineId, 10),
        ...formData,
      };
      const res = await api.predictRul(payload);
      setPredictionResult(res);
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.detail || 'Inference execution failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <DisclaimerBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D1D9E0] dark:border-[#30363D] pb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#1F2328] dark:text-[#E6EDF3] tracking-tight">
            Remaining Useful Life Prediction
          </h1>
          <p className="text-xs text-[#656D76] dark:text-[#9198A1] mt-0.5">
            Technical inference workspace &bull; Random Forest model with Isolation Forest anomaly verification
          </p>
        </div>

        {/* Engine Loader */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#656D76] dark:text-[#9198A1]">Load Engine State:</label>
          <select
            value={engineId}
            onChange={(e) => setEngineId(e.target.value)}
            className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] text-[#1F2328] dark:text-[#E6EDF3] text-xs rounded-md px-2.5 py-1.5 font-mono focus:outline-none focus:border-[#0969DA]"
          >
            {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                ENG-{String(n).padStart(3, '0')}
              </option>
            ))}
          </select>
          <button
            onClick={() => loadEngineTelemetry(engineId)}
            className="p-1.5 rounded-md border border-[#D1D9E0] dark:border-[#30363D] bg-white dark:bg-[#161B22] text-[#656D76] dark:text-[#9198A1] hover:bg-[#F6F8FA]"
            title="Reload engine state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDefaults ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Telemetry Input Form (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-4">
          <form onSubmit={handleRunInference} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#D1D9E0] dark:border-[#30363D]">
              <span className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                Telemetry Inputs (ENG-{String(engineId).padStart(3, '0')})
              </span>
              <span className="text-[11px] font-mono text-[#848D97]">19 schema features</span>
            </div>

            {/* Operating Condition Settings */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-[#656D76] dark:text-[#9198A1]">
                Operational Flight Settings
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[10px] text-[#848D97] block">Flight Cycle</label>
                  <input
                    type="number"
                    value={formData.cycle}
                    onChange={(e) => handleInputChange('cycle', e.target.value)}
                    className="w-full bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-2.5 py-1 text-xs font-mono text-[#1F2328] dark:text-[#E6EDF3] focus:border-[#0969DA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#848D97] block">Setting 1 (Altitude)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.setting_1}
                    onChange={(e) => handleInputChange('setting_1', e.target.value)}
                    className="w-full bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-2.5 py-1 text-xs font-mono text-[#1F2328] dark:text-[#E6EDF3] focus:border-[#0969DA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#848D97] block">Setting 2 (Mach)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.setting_2}
                    onChange={(e) => handleInputChange('setting_2', e.target.value)}
                    className="w-full bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-2.5 py-1 text-xs font-mono text-[#1F2328] dark:text-[#E6EDF3] focus:border-[#0969DA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#848D97] block">Setting 3 (TRA)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.setting_3}
                    onChange={(e) => handleInputChange('setting_3', e.target.value)}
                    className="w-full bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-2.5 py-1 text-xs font-mono text-[#1F2328] dark:text-[#E6EDF3] focus:border-[#0969DA] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Temperatures */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-[#656D76] dark:text-[#9198A1]">
                Gas Path Temperatures (°R)
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] text-[#848D97] block">s2 (LPC Outlet Temp)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_2}
                    onChange={(e) => handleInputChange('sensor_2', e.target.value)}
                    className="w-full bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-2.5 py-1 text-xs font-mono text-[#1F2328] dark:text-[#E6EDF3] focus:border-[#0969DA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#848D97] block">s3 (HPC Outlet Temp)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_3}
                    onChange={(e) => handleInputChange('sensor_3', e.target.value)}
                    className="w-full bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-2.5 py-1 text-xs font-mono text-[#1F2328] dark:text-[#E6EDF3] focus:border-[#0969DA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#848D97] block">s4 (LPT Outlet Temp)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_4}
                    onChange={(e) => handleInputChange('sensor_4', e.target.value)}
                    className="w-full bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-2.5 py-1 text-xs font-mono text-[#1F2328] dark:text-[#E6EDF3] focus:border-[#0969DA] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Pressures */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-[#656D76] dark:text-[#9198A1]">
                Compressor Pressures (psia)
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-[#848D97] block">s7 (Total HPC Pressure)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_7}
                    onChange={(e) => handleInputChange('sensor_7', e.target.value)}
                    className="w-full bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-2.5 py-1 text-xs font-mono text-[#1F2328] dark:text-[#E6EDF3] focus:border-[#0969DA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#848D97] block">s11 (Static HPC Pressure)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_11}
                    onChange={(e) => handleInputChange('sensor_11', e.target.value)}
                    className="w-full bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-2.5 py-1 text-xs font-mono text-[#1F2328] dark:text-[#E6EDF3] focus:border-[#0969DA] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Speeds & Dynamics */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-[#656D76] dark:text-[#9198A1]">
                Rotor Speeds & Fluid Ratios
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[10px] text-[#848D97] block">s8 (Fan Speed, rpm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_8}
                    onChange={(e) => handleInputChange('sensor_8', e.target.value)}
                    className="w-full bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-2.5 py-1 text-xs font-mono text-[#1F2328] dark:text-[#E6EDF3] focus:border-[#0969DA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#848D97] block">s9 (Core Speed, rpm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_9}
                    onChange={(e) => handleInputChange('sensor_9', e.target.value)}
                    className="w-full bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-2.5 py-1 text-xs font-mono text-[#1F2328] dark:text-[#E6EDF3] focus:border-[#0969DA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#848D97] block">s12 (Fuel Flow Ratio)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_12}
                    onChange={(e) => handleInputChange('sensor_12', e.target.value)}
                    className="w-full bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-2.5 py-1 text-xs font-mono text-[#1F2328] dark:text-[#E6EDF3] focus:border-[#0969DA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#848D97] block">s15 (Bypass Ratio)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.sensor_15}
                    onChange={(e) => handleInputChange('sensor_15', e.target.value)}
                    className="w-full bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md px-2.5 py-1 text-xs font-mono text-[#1F2328] dark:text-[#E6EDF3] focus:border-[#0969DA] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-2.5 border border-[#CF222E]/40 text-[#CF222E] bg-[#FFEBE9] dark:bg-[#490202]/30 rounded text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 px-3 rounded-md bg-[#0969DA] text-white text-xs font-medium hover:bg-[#0856b3] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Executing Inference Pipeline...' : 'Run Real-Time ML Inference'}
            </button>
          </form>
        </div>

        {/* Prediction Results Panel (1 col) */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-4">
            <h3 className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3] pb-2 border-b border-[#D1D9E0] dark:border-[#30363D]">
              Model Output Result
            </h3>

            {predictionResult ? (
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#656D76] dark:text-[#9198A1]">Engine / Cycle:</span>
                  <span className="font-mono font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                    ENG-{String(predictionResult.engine_id).padStart(3, '0')} (c{predictionResult.cycle})
                  </span>
                </div>

                {/* Main RUL Display */}
                <div className="p-3.5 bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md text-center">
                  <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
                    Estimated Remaining Useful Life
                  </span>
                  <div className="mt-1 text-3xl font-bold font-mono tabular-nums text-[#1F2328] dark:text-[#E6EDF3]">
                    {predictionResult.predicted_rul_cycles}{' '}
                    <span className="text-xs font-normal text-[#848D97]">cycles</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-center gap-2">
                    <EngineStatusBadge tier={predictionResult.urgency_tier} size="md" />
                    {predictionResult.is_anomalous ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-[#CF222E]/40 text-[#CF222E] bg-[#FFEBE9] dark:bg-[#490202]/30">
                        Anomaly ({predictionResult.anomaly_score})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-[#1A7F37]/40 text-[#1A7F37] bg-[#DAFBE1] dark:bg-[#043310]/30">
                        Nominal ({predictionResult.anomaly_score})
                      </span>
                    )}
                  </div>
                </div>

                {/* Sensor Drift Attribution */}
                {predictionResult.top_sensor_drifts?.length > 0 && (
                  <div className="border border-[#D1D9E0] dark:border-[#30363D] rounded-md p-2.5 space-y-1.5 bg-[#F6F8FA] dark:bg-[#0D1117]">
                    <span className="text-[10px] font-semibold text-[#656D76] dark:text-[#9198A1] uppercase font-mono block">
                      Sensor Drift Drivers (vs Baseline)
                    </span>
                    <div className="space-y-1 font-mono text-[11px]">
                      {predictionResult.top_sensor_drifts.map((d) => (
                        <div key={d.feature} className="flex justify-between items-center text-xs">
                          <span className="text-[#1F2328] dark:text-[#E6EDF3] font-sans text-[11px]">
                            {d.description}
                          </span>
                          <span className={d.z_score > 1.5 ? 'text-[#CF222E]' : d.z_score < -1.5 ? 'text-[#0969DA]' : 'text-[#656D76]'}>
                            {d.z_score > 0 ? `+${d.z_score}` : d.z_score}σ
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Protocol */}
                <div className="text-xs text-[#656D76] dark:text-[#9198A1] border-t border-[#D1D9E0] dark:border-[#30363D] pt-2.5 space-y-1">
                  <span className="font-semibold text-[#1F2328] dark:text-[#E6EDF3] block">
                    Maintenance Recommendation:
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    {predictionResult.recommendation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#848D97]">
                Submit telemetry parameters to run live model inference.
              </div>
            )}
          </div>

          {/* SQLite Audit Trail */}
          <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5 space-y-2.5">
            <h4 className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
              Audit Log (Recent Predictions)
            </h4>
            <div className="space-y-1.5 font-mono text-xs">
              {predictionHistory.slice(0, 4).map((rec) => (
                <div
                  key={rec.id}
                  className="p-2 rounded border border-[#EAEEF2] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#0D1117] flex justify-between items-center"
                >
                  <div>
                    <span className="font-semibold text-[#0969DA] dark:text-[#4493F8]">
                      ENG-{String(rec.engine_id).padStart(3, '0')}
                    </span>{' '}
                    <span className="text-[#848D97]">(c{rec.cycle})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#1F2328] dark:text-[#E6EDF3]">{rec.predicted_rul}c</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
