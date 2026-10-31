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
  ArrowLeft,
  Cpu,
  Activity,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  AlertOctagon,
  Clock,
  Layers,
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
  const [activeSensorGroup, setActiveSensorGroup] = useState('temp');

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
    <div className="space-y-5">
      <DisclaimerBanner />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D1D9E0] dark:border-[#30363D] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-md border border-[#D1D9E0] dark:border-[#30363D] bg-white dark:bg-[#161B22] text-[#656D76] dark:text-[#9198A1] hover:text-[#1F2328] dark:hover:text-[#E6EDF3] transition-colors"
            title="Return to fleet overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#1F2328] dark:text-[#E6EDF3] tracking-tight">
                Engine ENG-{String(engineId).padStart(3, '0')} Telemetry
              </h1>
              {engineDetail && <EngineStatusBadge tier={engineDetail.urgency_tier} size="sm" />}
            </div>
            <p className="text-xs text-[#656D76] dark:text-[#9198A1] mt-0.5">
              NASA C-MAPSS FD001 &bull; Historical Sensor Degradation & Playback
            </p>
          </div>
        </div>

        {/* Engine switcher dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#656D76] dark:text-[#9198A1]">Switch Engine:</label>
          <select
            value={engineId}
            onChange={(e) => {
              setEngineId(e.target.value);
              navigate(`/engines/${e.target.value}`);
            }}
            className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] text-[#1F2328] dark:text-[#E6EDF3] text-xs rounded-md px-2.5 py-1.5 font-mono focus:outline-none focus:border-[#0969DA]"
          >
            {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                ENG-{String(n).padStart(3, '0')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-[#656D76] dark:text-[#9198A1]">
          Loading engine sensor stream...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-[#CF222E]">
          {error}
        </div>
      ) : engineDetail ? (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
              <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
                Observed Cycles
              </span>
              <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                {engineDetail.last_cycle}{' '}
                <span className="text-xs font-normal text-[#848D97]">cycles</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
              <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
                Estimated RUL
              </span>
              <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#0969DA] dark:text-[#4493F8]">
                {engineDetail.predicted_rul}{' '}
                <span className="text-xs font-normal text-[#848D97]">cycles</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
              <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
                Benchmark Ground Truth
              </span>
              <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#1A7F37] dark:text-[#3FB950]">
                {engineDetail.true_rul !== null ? `${engineDetail.true_rul} cycles` : '—'}
              </div>
            </div>

            <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-3.5">
              <span className="text-[11px] text-[#656D76] dark:text-[#848D97] block font-medium">
                Model Residual Error
              </span>
              <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                {engineDetail.true_rul !== null
                  ? `${(engineDetail.predicted_rul - engineDetail.true_rul).toFixed(1)} cycles`
                  : '—'}
              </div>
            </div>
          </div>

          {/* SIMULATED HISTORICAL REPLAY PLAYER (Neutral, disciplined enterprise design) */}
          {replayData?.timeline_steps && (
            <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D1D9E0] dark:border-[#30363D]">
                <div>
                  <h3 className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                    Historical Degradation Replay
                  </h3>
                  <p className="text-[11px] text-[#656D76] dark:text-[#848D97]">
                    Simulate chronological sensor degradation and RUL decline across historical flight cycles.
                  </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (replayIndex >= replayData.timeline_steps.length - 1) {
                        setReplayIndex(0);
                      }
                      setIsPlaying(!isPlaying);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                      isPlaying
                        ? 'bg-[#EFF2F5] dark:bg-[#21262D] text-[#1F2328] dark:text-[#E6EDF3] border-[#D1D9E0] dark:border-[#30363D]'
                        : 'bg-[#0969DA] text-white border-[#0969DA] hover:bg-[#0856b3]'
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
                    className="p-1 rounded-md border border-[#D1D9E0] dark:border-[#30363D] bg-white dark:bg-[#161B22] text-[#656D76] dark:text-[#9198A1] hover:bg-[#F6F8FA]"
                    title="Reset to initial cycle"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                    className="px-2 py-1 rounded-md border border-[#D1D9E0] dark:border-[#30363D] text-[11px] font-mono text-[#656D76] dark:text-[#9198A1] hover:bg-[#F6F8FA]"
                  >
                    {playbackSpeed}x
                  </button>
                </div>
              </div>

              {/* Scrubber slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#656D76] dark:text-[#9198A1]">
                    Cycle: <strong className="font-mono text-[#1F2328] dark:text-[#E6EDF3]">{currentReplayStep?.cycle || 1}</strong> of {engineDetail.last_cycle}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#656D76] dark:text-[#9198A1]">
                      Predicted RUL: <strong className="font-mono text-[#1F2328] dark:text-[#E6EDF3]">{currentReplayStep?.predicted_rul}c</strong>
                    </span>
                    {currentReplayStep && <EngineStatusBadge tier={currentReplayStep.urgency_tier} />}
                    {currentReplayStep?.is_anomalous && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#CF222E]/40 text-[#CF222E] bg-[#FFEBE9] dark:bg-[#490202]/30">
                        Anomaly (Score: {currentReplayStep.anomaly_score})
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
                  className="w-full accent-[#0969DA] cursor-pointer"
                />
              </div>

              {/* Telemetry Snapshot Tiles */}
              {currentReplayStep && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 text-center font-mono text-xs">
                  <div className="bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] p-2 rounded">
                    <span className="text-[10px] text-[#848D97] block font-sans">LPC Temp (s2)</span>
                    <span className="font-semibold text-[#1F2328] dark:text-[#E6EDF3]">{currentReplayStep.key_telemetry?.sensor_2_lpc_temp}°R</span>
                  </div>
                  <div className="bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] p-2 rounded">
                    <span className="text-[10px] text-[#848D97] block font-sans">HPC Temp (s3)</span>
                    <span className="font-semibold text-[#1F2328] dark:text-[#E6EDF3]">{currentReplayStep.key_telemetry?.sensor_3_hpc_temp}°R</span>
                  </div>
                  <div className="bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] p-2 rounded">
                    <span className="text-[10px] text-[#848D97] block font-sans">LPT Temp (s4)</span>
                    <span className="font-semibold text-[#1F2328] dark:text-[#E6EDF3]">{currentReplayStep.key_telemetry?.sensor_4_lpt_temp}°R</span>
                  </div>
                  <div className="bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] p-2 rounded">
                    <span className="text-[10px] text-[#848D97] block font-sans">Total HPC Pres (s7)</span>
                    <span className="font-semibold text-[#1F2328] dark:text-[#E6EDF3]">{currentReplayStep.key_telemetry?.sensor_7_hpc_pres} psia</span>
                  </div>
                  <div className="bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] p-2 rounded">
                    <span className="text-[10px] text-[#848D97] block font-sans">Static HPC Pres (s11)</span>
                    <span className="font-semibold text-[#1F2328] dark:text-[#E6EDF3]">{currentReplayStep.key_telemetry?.sensor_11_static_pres} psia</span>
                  </div>
                  <div className="bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] p-2 rounded">
                    <span className="text-[10px] text-[#848D97] block font-sans">Fuel Flow (s12)</span>
                    <span className="font-semibold text-[#1F2328] dark:text-[#E6EDF3]">{currentReplayStep.key_telemetry?.sensor_12_fuel_flow}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Maintenance Advisory Notice */}
          <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                Decision-Support Maintenance Advisory ({engineDetail.urgency_tier})
              </span>
            </div>
            <p className="text-xs text-[#656D76] dark:text-[#9198A1] leading-relaxed">
              {engineDetail.recommendation}
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => navigate('/predictions', { state: { engineId, lastCycle: engineDetail.last_cycle } })}
                className="px-3 py-1.5 rounded-md bg-[#0969DA] text-white text-xs font-medium hover:bg-[#0856b3] transition-colors"
              >
                Simulate Parameters in Predictor
              </button>
              <button
                onClick={() => navigate('/maintenance')}
                className="px-3 py-1.5 rounded-md border border-[#D1D9E0] dark:border-[#30363D] bg-white dark:bg-[#161B22] text-[#1F2328] dark:text-[#E6EDF3] text-xs font-medium hover:bg-[#F6F8FA] dark:hover:bg-[#21262D] transition-colors"
              >
                View Maintenance Queue
              </button>
            </div>
          </div>

          {/* Time Series Degradation Chart */}
          <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D1D9E0] dark:border-[#30363D]">
              <div>
                <h3 className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                  Sensor Degradation Telemetry
                </h3>
                <p className="text-[11px] text-[#656D76] dark:text-[#848D97]">
                  Telemetry progression from Cycle 1 to Cycle {engineDetail.last_cycle}.
                </p>
              </div>

              {/* Group tabs */}
              <div className="inline-flex rounded-md border border-[#D1D9E0] dark:border-[#30363D] bg-[#F6F8FA] dark:bg-[#0D1117] p-0.5 text-xs">
                <button
                  onClick={() => setActiveSensorGroup('temp')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors ${
                    activeSensorGroup === 'temp'
                      ? 'bg-white dark:bg-[#21262D] text-[#1F2328] dark:text-[#E6EDF3] font-semibold shadow-xs'
                      : 'text-[#656D76] dark:text-[#9198A1]'
                  }`}
                >
                  Temperatures
                </button>
                <button
                  onClick={() => setActiveSensorGroup('pressure')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors ${
                    activeSensorGroup === 'pressure'
                      ? 'bg-white dark:bg-[#21262D] text-[#1F2328] dark:text-[#E6EDF3] font-semibold shadow-xs'
                      : 'text-[#656D76] dark:text-[#9198A1]'
                  }`}
                >
                  Pressures
                </button>
                <button
                  onClick={() => setActiveSensorGroup('dynamics')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors ${
                    activeSensorGroup === 'dynamics'
                      ? 'bg-white dark:bg-[#21262D] text-[#1F2328] dark:text-[#E6EDF3] font-semibold shadow-xs'
                      : 'text-[#656D76] dark:text-[#9198A1]'
                  }`}
                >
                  Speed & Flow
                </button>
              </div>
            </div>

            {/* Recharts with disciplined neutral styling */}
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engineDetail.telemetry_history}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#EAEEF2" className="dark:stroke-[#21262D]" />
                  <XAxis
                    dataKey="cycle"
                    stroke="#848D97"
                    fontSize={11}
                    tickLine={false}
                    label={{ value: 'Flight Cycle', position: 'insideBottom', offset: -4, fill: '#848D97', fontSize: 11 }}
                  />
                  <YAxis stroke="#848D97" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D1D9E0',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#1F2328',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  {activeSensorGroup === 'temp' && (
                    <>
                      <Line type="monotone" dataKey="sensor_2" name="LPC Outlet Temp (s2, °R)" stroke="#CF222E" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sensor_3" name="HPC Outlet Temp (s3, °R)" stroke="#9A6700" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sensor_4" name="LPT Outlet Temp (s4, °R)" stroke="#0969DA" dot={false} strokeWidth={1.5} />
                    </>
                  )}

                  {activeSensorGroup === 'pressure' && (
                    <>
                      <Line type="monotone" dataKey="sensor_7" name="Total HPC Pressure (s7, psia)" stroke="#0969DA" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sensor_11" name="Static HPC Pressure (s11, psia)" stroke="#8250DF" dot={false} strokeWidth={1.5} />
                    </>
                  )}

                  {activeSensorGroup === 'dynamics' && (
                    <>
                      <Line type="monotone" dataKey="sensor_8" name="Fan Speed (s8, rpm)" stroke="#1A7F37" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sensor_12" name="Fuel Flow Ratio (s12)" stroke="#9A6700" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="sensor_15" name="Bypass Ratio (s15)" stroke="#656D76" dot={false} strokeWidth={1.5} />
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
