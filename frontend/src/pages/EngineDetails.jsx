import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Plane, AlertTriangle, ArrowLeft, Cpu, Activity, Gauge, Thermometer, Wind } from 'lucide-react';
import api from '../services/api';
import EngineStatusBadge from '../components/EngineCards/EngineStatusBadge';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function EngineDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [engineId, setEngineId] = useState(id || '34'); // Engine 34 is critical example
  const [engineDetail, setEngineDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChartGroup, setActiveChartGroup] = useState('temp'); // 'temp', 'pressure', 'speed'

  useEffect(() => {
    if (id) {
      setEngineId(id);
    }
  }, [id]);

  useEffect(() => {
    fetchEngineDetail(engineId);
  }, [engineId]);

  const fetchEngineDetail = async (eid) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEngine(eid);
      setEngineDetail(data);
    } catch (err) {
      setError(`Unable to load telemetry for Engine ENG-${eid}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <DisclaimerBanner />

      {/* Navigation & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Engine ENG-{String(engineId).padStart(3, '0')} Telemetry
              {engineDetail && <EngineStatusBadge tier={engineDetail.urgency_tier} size="lg" />}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-cycle degradation trends and Remaining Useful Life diagnostic trajectory.
            </p>
          </div>
        </div>

        {/* Engine switcher */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Select Engine:</label>
          <select
            value={engineId}
            onChange={(e) => {
              setEngineId(e.target.value);
              navigate(`/engines/${e.target.value}`);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-mono"
          >
            {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                ENG-{String(num).padStart(3, '0')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-16 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-slate-400 text-sm flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          Streaming multi-channel sensor telemetry...
        </div>
      ) : error ? (
        <div className="p-8 bg-slate-900/60 border border-rose-800/40 rounded-xl text-center text-rose-400 text-xs">
          <p>{error}</p>
        </div>
      ) : engineDetail ? (
        <>
          {/* Key Indicators Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium uppercase">Last Recorded Cycle</span>
              <div className="mt-2 text-2xl font-bold font-mono text-cyan-400">
                Cycle {engineDetail.last_cycle}
              </div>
              <span className="text-[11px] text-slate-400">Flight cycles observed</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium uppercase">Predicted RUL</span>
              <div className="mt-2 text-2xl font-bold font-mono text-white">
                {engineDetail.predicted_rul} <span className="text-xs text-slate-400 font-normal">cycles</span>
              </div>
              <span className="text-[11px] text-slate-400">RandomForest inference</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium uppercase">NASA Ground Truth</span>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
                {engineDetail.true_rul !== null ? `${engineDetail.true_rul} cycles` : 'N/A'}
              </div>
              <span className="text-[11px] text-slate-400">RUL_FD001 official test target</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium uppercase">Prediction Variance</span>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-200">
                {engineDetail.true_rul !== null
                  ? `${(engineDetail.predicted_rul - engineDetail.true_rul).toFixed(1)} cycles`
                  : 'N/A'}
              </div>
              <span className="text-[11px] text-slate-400">Model estimation delta</span>
            </div>
          </div>

          {/* Maintenance Advisory Notice */}
          <div className="bg-slate-900/70 border border-cyan-800/40 rounded-xl p-4 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-700/50 text-cyan-400 shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  Engineering Decision-Support Advisory ({engineDetail.urgency_tier})
                </h3>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  {engineDetail.recommendation}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => navigate('/predictions', { state: { engineId, lastCycle: engineDetail.last_cycle } })}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Simulate Live Sensor Param Tuning
                  </button>
                  <button
                    onClick={() => navigate('/maintenance')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    View Fleet Maintenance Queue
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Degradation Sensor Charts */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-white">Historical Sensor Degradation Curves</h3>
                <p className="text-xs text-slate-400">
                  Telemetry progression from Cycle 1 to Cycle {engineDetail.last_cycle}. Notice non-linear drift as HPC wear advances.
                </p>
              </div>

              {/* Chart Tabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveChartGroup('temp')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeChartGroup === 'temp'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Thermometer className="w-3 h-3" /> Temperatures
                </button>
                <button
                  onClick={() => setActiveChartGroup('pressure')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeChartGroup === 'pressure'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Gauge className="w-3 h-3" /> Pressures
                </button>
                <button
                  onClick={() => setActiveChartGroup('dynamics')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeChartGroup === 'dynamics'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Wind className="w-3 h-3" /> Speed & Flow
                </button>
              </div>
            </div>

            {/* Recharts Container */}
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engineDetail.telemetry_history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="cycle"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    label={{ value: 'Flight Cycle', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  {activeChartGroup === 'temp' && (
                    <>
                      <Line type="monotone" dataKey="sensor_2" name="LPC Outlet Temp (s2, °R)" stroke="#f43f5e" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sensor_3" name="HPC Outlet Temp (s3, °R)" stroke="#f59e0b" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sensor_4" name="LPT Outlet Temp (s4, °R)" stroke="#06b6d4" dot={false} strokeWidth={1.5} />
                    </>
                  )}

                  {activeChartGroup === 'pressure' && (
                    <>
                      <Line type="monotone" dataKey="sensor_7" name="Total HPC Pressure (s7, psia)" stroke="#38bdf8" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sensor_11" name="Static HPC Pressure (s11, psia)" stroke="#818cf8" dot={false} strokeWidth={1.5} />
                    </>
                  )}

                  {activeChartGroup === 'dynamics' && (
                    <>
                      <Line type="monotone" dataKey="sensor_8" name="Fan Speed (s8, rpm)" stroke="#34d399" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sensor_12" name="Fuel Flow Ratio (s12)" stroke="#e879f9" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sensor_15" name="Bypass Ratio (s15)" stroke="#fbbf24" dot={false} strokeWidth={1.5} />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
