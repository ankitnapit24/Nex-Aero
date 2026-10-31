import React, { useState, useEffect, useRef } from 'react';
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
import {
  Plane,
  AlertTriangle,
  ArrowLeft,
  Cpu,
  Activity,
  Gauge,
  Thermometer,
  Wind,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ShieldAlert,
} from 'lucide-react';
import api from '../services/api';
import EngineStatusBadge from '../components/EngineCards/EngineStatusBadge';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function EngineDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [engineId, setEngineId] = useState(id || '34');
  const [engineDetail, setEngineDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChartGroup, setActiveChartGroup] = useState('temp');

  // Replay State
  const [replayData, setReplayData] = useState(null);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timerRef = useRef(null);

  useEffect(() => {
    if (id) {
      setEngineId(id);
    }
  }, [id]);

  useEffect(() => {
    fetchEngineDetail(engineId);
    loadReplayData(engineId);
    setIsPlaying(false);
    setReplayIndex(0);
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

  const loadReplayData = async (eid) => {
    try {
      const data = await api.replayEngine(eid, 4);
      setReplayData(data);
      if (data?.timeline_steps?.length > 0) {
        setReplayIndex(data.timeline_steps.length - 1);
      }
    } catch (err) {
      console.error('Failed to load replay data', err);
    }
  };

  // Playback timer
  useEffect(() => {
    if (isPlaying && replayData?.timeline_steps?.length > 0) {
      timerRef.current = setInterval(() => {
        setReplayIndex((prev) => {
          if (prev >= replayData.timeline_steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700 / playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, replayData, playbackSpeed]);

  const currentReplayStep = replayData?.timeline_steps?.[replayIndex] || null;

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
              Historical multi-sensor degradation telemetry & interactive cycle playback simulation.
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
              <span className="text-[11px] text-slate-400">Historical flight cycles observed</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium uppercase">Predicted RUL</span>
              <div className="mt-2 text-2xl font-bold font-mono text-white">
                {engineDetail.predicted_rul} <span className="text-xs text-slate-400 font-normal">cycles</span>
              </div>
              <span className="text-[11px] text-slate-400">RandomForest model inference</span>
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

          {/* HISTORICAL REPLAY PLAYER COMPONENT */}
          {replayData?.timeline_steps && (
            <div className="bg-slate-900/80 border border-cyan-800/40 rounded-xl p-5 backdrop-blur-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-700/60 text-cyan-400">
                    <FastForward className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      Simulated Historical Degradation Replay
                      <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                        Historical Simulation &bull; Never Live Aircraft Telemetry
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Scrub across historical operational cycles to observe progressive HPC degradation, sensor drift, and RUL decline.
                    </p>
                  </div>
                </div>

                {/* Player Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (replayIndex >= replayData.timeline_steps.length - 1) {
                        setReplayIndex(0);
                      }
                      setIsPlaying(!isPlaying);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all ${
                      isPlaying
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-cyan-600 hover:bg-cyan-500'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isPlaying ? 'Pause' : 'Play Timeline'}
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setReplayIndex(0);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Reset to Cycle 1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                    className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono"
                    title="Toggle Playback Speed"
                  >
                    {playbackSpeed}x
                  </button>
                </div>
              </div>

              {/* Dynamic Live Scrubber Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">
                    Cycle Position: <strong className="text-cyan-400 font-mono">Cycle {currentReplayStep?.cycle || 1}</strong> of {engineDetail.last_cycle}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs">
                      Replay Predicted RUL: <strong className="text-white font-mono">{currentReplayStep?.predicted_rul}c</strong>
                    </span>
                    {currentReplayStep && <EngineStatusBadge tier={currentReplayStep.urgency_tier} />}
                    {currentReplayStep?.is_anomalous && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/80 border border-rose-700 text-rose-300">
                        ANOMALY DETECTED (IForest: {currentReplayStep.anomaly_score})
                      </span>
                    )}
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max={replayData.timeline_steps.length - 1}
                  value={replayIndex}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setReplayIndex(parseInt(e.target.value, 10));
                  }}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Dynamic Telemetry Snapshot at this cycle */}
              {currentReplayStep && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 text-center text-xs font-mono">
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">LPC Temp (s2)</div>
                    <div className="text-rose-400 font-bold">{currentReplayStep.key_telemetry?.sensor_2_lpc_temp}°R</div>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">HPC Temp (s3)</div>
                    <div className="text-amber-400 font-bold">{currentReplayStep.key_telemetry?.sensor_3_hpc_temp}°R</div>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">LPT Temp (s4)</div>
                    <div className="text-cyan-400 font-bold">{currentReplayStep.key_telemetry?.sensor_4_lpt_temp}°R</div>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">Total HPC Pres (s7)</div>
                    <div className="text-blue-400 font-bold">{currentReplayStep.key_telemetry?.sensor_7_hpc_pres} psia</div>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">Static HPC Pres (s11)</div>
                    <div className="text-indigo-400 font-bold">{currentReplayStep.key_telemetry?.sensor_11_static_pres} psia</div>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">Fuel Flow (s12)</div>
                    <div className="text-emerald-400 font-bold">{currentReplayStep.key_telemetry?.sensor_12_fuel_flow}</div>
                  </div>
                </div>
              )}
            </div>
          )}

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
