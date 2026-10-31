import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Cpu, Send, RefreshCw, CheckCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
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
          sensor_6: 21.61, // standard constant bypass
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
    <div className="space-y-6">
      <DisclaimerBanner />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-cyan-400" />
            Live Machine-Learning RUL Predictor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulate turbofan operational cycles and trigger trained RandomForest inference on demand.
          </p>
        </div>

        {/* Engine Loader */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl">
          <span className="text-xs text-slate-400">Load Engine State:</span>
          <select
            value={engineId}
            onChange={(e) => setEngineId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-cyan-500"
          >
            {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                ENG-{String(n).padStart(3, '0')}
              </option>
            ))}
          </select>
          <button
            onClick={() => loadEngineTelemetry(engineId)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Reload engine telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDefaults ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column (2 spans) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
          <form onSubmit={handleRunInference} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Telemetry Inputs (Engine ENG-{String(engineId).padStart(3, '0')})
              </span>
              <span className="text-[11px] text-slate-400">
                19 Features verified against training schema
              </span>
            </div>

            {/* Operating Condition Settings */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                Operating Settings & Cycle
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">Cycle Count</label>
                  <input
                    type="number"
                    value={formData.cycle}
                    onChange={(e) => handleInputChange('cycle', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Setting 1 (Altitude)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.setting_1}
                    onChange={(e) => handleInputChange('setting_1', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Setting 2 (Mach)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.setting_2}
                    onChange={(e) => handleInputChange('setting_2', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Setting 3 (TRA)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.setting_3}
                    onChange={(e) => handleInputChange('setting_3', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Temperature Sensors */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                Thermal Telemetry (°R)
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">s2 (LPC Outlet Temp)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_2}
                    onChange={(e) => handleInputChange('sensor_2', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">s3 (HPC Outlet Temp)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_3}
                    onChange={(e) => handleInputChange('sensor_3', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">s4 (LPT Outlet Temp)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_4}
                    onChange={(e) => handleInputChange('sensor_4', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Pressure Sensors */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                Pressure Telemetry (psia)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">s7 (Total HPC Outlet Pressure)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_7}
                    onChange={(e) => handleInputChange('sensor_7', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">s11 (Static HPC Pressure)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_11}
                    onChange={(e) => handleInputChange('sensor_11', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Speeds & Fluid Ratios */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                Rotor Speeds & Fluid Dynamics
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">s8 (Fan Speed, rpm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_8}
                    onChange={(e) => handleInputChange('sensor_8', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">s9 (Core Speed, rpm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_9}
                    onChange={(e) => handleInputChange('sensor_9', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">s12 (Fuel Flow Ratio)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sensor_12}
                    onChange={(e) => handleInputChange('sensor_12', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">s15 (Bypass Ratio)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.sensor_15}
                    onChange={(e) => handleInputChange('sensor_15', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium text-xs shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Executing RandomForest Pipeline...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Run Real-Time ML Inference
                </>
              )}
            </button>
          </form>
        </div>

        {/* Prediction Output Result Card */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider pb-3 border-b border-slate-800">
              Live Model Output
            </h3>

            {predictionResult ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Target Engine:</span>
                  <span className="font-mono font-bold text-cyan-300">
                    ENG-{String(predictionResult.engine_id).padStart(3, '0')} (Cycle {predictionResult.cycle})
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 font-medium">Estimated Remaining Useful Life</span>
                  <div className="mt-2 text-4xl font-extrabold font-mono text-white tracking-tight">
                    {predictionResult.predicted_rul_cycles}{' '}
                    <span className="text-sm font-normal text-slate-400">cycles</span>
                  </div>
                  <div className="mt-3">
                    <EngineStatusBadge tier={predictionResult.urgency_tier} size="lg" />
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="font-semibold text-slate-200">Recommended Action:</div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {predictionResult.recommendation}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1 font-mono">
                  <div>Model Version: {predictionResult.model_version}</div>
                  <div>Raw Unclamped RUL: {predictionResult.raw_rul_cycles} cycles</div>
                  <div>Inference Timestamp: {predictionResult.evaluated_at}</div>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center text-slate-400 text-xs">
                Fill the telemetry parameters or choose an engine, then click "Run Real-Time ML Inference" to compute RUL.
              </div>
            )}
          </div>

          {/* Audit History Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-md">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Recent Inferences (SQLite Audit Trail)
            </h4>
            <div className="space-y-2">
              {predictionHistory.slice(0, 4).map((rec) => (
                <div
                  key={rec.id}
                  className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-medium text-cyan-300">
                      ENG-{String(rec.engine_id).padStart(3, '0')}
                    </span>{' '}
                    <span className="text-slate-400">(c{rec.cycle})</span>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {rec.created_at ? new Date(rec.created_at).toLocaleTimeString() : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white">{rec.predicted_rul}c</span>
                    <div>
                      <EngineStatusBadge tier={rec.urgency_tier} />
                    </div>
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
