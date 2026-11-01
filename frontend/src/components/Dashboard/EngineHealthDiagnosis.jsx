import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Info,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wrench,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import api, { getApiErrorMessage } from '../../services/api';
import { formatEngine, formatRul, RiskBadge, Panel, PanelHeading, StateBlock } from '../UI/Shared';
import { usePreferences } from '../../i18n/Preferences';

// Required telemetry feature keys for prediction inference
const REQUIRED_TELEMETRY = [
  'cycle', 'setting_1', 'setting_2', 'setting_3', 'sensor_2', 'sensor_3', 'sensor_4',
  'sensor_6', 'sensor_7', 'sensor_8', 'sensor_9', 'sensor_11', 'sensor_12',
  'sensor_13', 'sensor_14', 'sensor_15', 'sensor_17', 'sensor_20', 'sensor_21',
];

// Physical engine component definitions per NASA turbofan architecture
const ENGINE_COMPONENTS = [
  {
    id: 'fan',
    name: 'Fan',
    shortName: 'Fan',
    station: 'Station 1 · Inlet & Bypass',
    description: 'Front bypass fan stage driven by low-pressure spool; generates primary propulsive bypass thrust.',
    sensors: [
      { key: 'sensor_8', name: 'Physical Fan Speed', unit: 'rpm' },
      { key: 'sensor_13', name: 'Corrected Fan Speed', unit: 'rpm' },
    ],
    x: 40,
    width: 135,
  },
  {
    id: 'lpc',
    name: 'Low-Pressure Compressor',
    shortName: 'LPC (Booster)',
    station: 'Station 2 · Core Booster',
    description: 'Initial axial compression booster stage driven by LP shaft; increases core air intake pressure.',
    sensors: [
      { key: 'sensor_2', name: 'LPC Outlet Temperature', unit: '°R' },
    ],
    x: 185,
    width: 125,
  },
  {
    id: 'hpc',
    name: 'High-Pressure Compressor',
    shortName: 'HPC',
    station: 'Station 3 · Core Compression',
    description: 'Multi-stage high-pressure axial compressor driven by HP shaft; delivers peak cycle compression ratio.',
    sensors: [
      { key: 'sensor_3', name: 'HPC Outlet Temperature', unit: '°R' },
      { key: 'sensor_7', name: 'Total HPC Pressure', unit: 'psia' },
      { key: 'sensor_11', name: 'Static HPC Pressure', unit: 'psia' },
      { key: 'sensor_9', name: 'Physical Core Speed', unit: 'rpm' },
      { key: 'sensor_14', name: 'Corrected Core Speed', unit: 'rpm' },
    ],
    x: 320,
    width: 145,
  },
  {
    id: 'combustor',
    name: 'Combustion Chamber',
    shortName: 'Combustor',
    station: 'Station 4 · Burner',
    description: 'Annular combustion chamber where pressurized core air mixes with atomized jet fuel for continuous ignition.',
    sensors: [
      { key: 'sensor_12', name: 'Fuel Flow Ratio', unit: 'pps/psia' },
      { key: 'sensor_17', name: 'Bleed Enthalpy', unit: '—' },
    ],
    x: 475,
    width: 125,
  },
  {
    id: 'hpt',
    name: 'High-Pressure Turbine',
    shortName: 'HPT',
    station: 'Station 5 · Expansion Stage',
    description: 'High-temperature turbine extracting energy from combustion gases to drive the High-Pressure Compressor.',
    sensors: [
      { key: 'sensor_20', name: 'HPT Coolant Bleed', unit: 'lbm/s' },
    ],
    x: 610,
    width: 125,
  },
  {
    id: 'lpt',
    name: 'Low-Pressure Turbine',
    shortName: 'LPT',
    station: 'Station 6 · Power Turbine',
    description: 'Multi-stage low-pressure turbine extracting remaining thermal energy to drive the Fan and LPC spools.',
    sensors: [
      { key: 'sensor_4', name: 'LPT Outlet Temperature', unit: '°R' },
      { key: 'sensor_21', name: 'LPT Coolant Bleed', unit: 'lbm/s' },
      { key: 'sensor_15', name: 'Bypass Ratio', unit: '—' },
      { key: 'sensor_6', name: 'Bypass-Duct Pressure', unit: 'psia' },
    ],
    x: 745,
    width: 145,
  },
];

export default function EngineHealthDiagnosis({ engines = [] }) {
  const { t } = usePreferences();
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Diagnostic states from real backend APIs
  const [detail, setDetail] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [shapData, setShapData] = useState(null);
  const [shapLoading, setShapLoading] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(ENGINE_COMPONENTS[2]); // Default to HPC for rich sensor data

  // Initialize selected engine when engines list loads
  useEffect(() => {
    if (engines.length > 0 && !selectedId) {
      // Prefer an engine with interesting status (e.g., lower RUL or first engine)
      const target = engines.find((e) => e.urgency_tier === 'CRITICAL' || e.urgency_tier === 'WARNING') || engines[0];
      setSelectedId(String(target.engine_id));
    }
  }, [engines, selectedId]);

  // Load diagnostic data for selected engine
  const loadDiagnosis = async (engineId) => {
    if (!engineId) return;
    setLoading(true);
    setError('');
    setShapLoading(true);

    try {
      const eid = Number(engineId);
      const engineDetail = await api.getEngine(eid);
      setDetail(engineDetail);

      const latest = engineDetail.telemetry_history?.at(-1);
      if (latest) {
        // Run real ML prediction on latest telemetry row
        const predPayload = {
          engine_id: eid,
          ...Object.fromEntries(REQUIRED_TELEMETRY.map((key) => [key, Number(latest[key])])),
        };
        const predRes = await api.predictRul(predPayload);
        setPrediction(predRes);
      }

      // Fetch TreeSHAP local attribution explanation
      try {
        const explainRes = await api.getExplain(eid);
        setShapData(explainRes.explanation);
      } catch (shapErr) {
        setShapData(null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load engine diagnosis.'));
    } finally {
      setLoading(false);
      setShapLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) {
      loadDiagnosis(selectedId);
    }
  }, [selectedId]);

  const latestTelemetry = detail?.telemetry_history?.at(-1) || {};
  const currentRul = prediction?.predicted_rul_cycles ?? detail?.predicted_rul;
  const urgencyTier = prediction?.urgency_tier ?? detail?.urgency_tier ?? 'NOMINAL';
  const isAnomalous = prediction?.is_anomalous ?? false;
  const anomalyScore = prediction?.anomaly_score;
  const sensorDrifts = prediction?.top_sensor_drifts || [];
  const recommendation = prediction?.recommendation;

  // Filter SHAP contributions: top drivers
  const shapDrivers = useMemo(() => {
    if (!shapData?.contributions) return { negative: [], positive: [] };
    const valid = shapData.contributions.filter((c) => c.feature !== 'cycle' && c.feature !== 'engine_id');
    const negative = valid.filter((c) => c.shap_value < 0).slice(0, 4);
    const positive = valid.filter((c) => c.shap_value > 0).slice(0, 4);
    return { negative, positive };
  }, [shapData]);

  return (
    <section className="engine-diagnosis-section" aria-label="Engine Health Diagnosis">
      <div className="diagnosis-header-card">
        <div className="diagnosis-title-row">
          <div>
            <div className="diagnosis-pill">
              <Activity size={12} className="text-coral" />
              <span>{t('DIAGNOSTIC WORKBENCH')}</span>
            </div>
            <h2 className="diagnosis-title">{t('Engine Health Diagnosis')}</h2>
            <p className="diagnosis-subtitle">
              {t('Multi-sensor telemetry diagnostics, RUL prognostics, anomaly detection, and TreeSHAP attribution.')}
            </p>
          </div>

          <div className="engine-select-group">
            <label htmlFor="diagnosis-engine-select" className="engine-select-label">
              {t('Select Engine Unit')}:
            </label>
            <div className="select-control diagnosis-select-control">
              <select
                id="diagnosis-engine-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={loading}
              >
                {engines.map((e) => (
                  <option key={e.engine_id} value={e.engine_id}>
                    {formatEngine(e.engine_id)} — Cycle {e.last_cycle} ({e.urgency_tier})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="select-arrow" />
            </div>
            <button
              type="button"
              className="button button-outline diagnosis-refresh-btn"
              onClick={() => loadDiagnosis(selectedId)}
              disabled={loading || !selectedId}
              title={t('Refresh diagnosis')}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {error && (
          <div className="diagnosis-error-banner">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Diagnostic KPI Strip */}
        <div className="diagnosis-kpi-grid">
          {/* 1. Remaining Useful Life */}
          <div className="kpi-card">
            <div className="kpi-label-row">
              <span className="kpi-label">{t('Remaining Useful Life (RUL)')}</span>
              <RiskBadge tier={urgencyTier} />
            </div>
            <div className="kpi-value-row">
              <span className="kpi-value">{formatRul(currentRul)}</span>
              {detail?.true_rul !== null && detail?.true_rul !== undefined && (
                <span className="kpi-sub" title={t('Ground-truth test reference for model verification')}>
                  {t('Ref')}: {formatRul(detail.true_rul)}
                </span>
              )}
            </div>
            <span className="kpi-desc">
              {t('Random Forest regression estimate based on latest cycle')} {detail?.last_cycle ? `(${detail.last_cycle})` : ''}
            </span>
          </div>

          {/* 2. Anomaly Detection Status */}
          <div className="kpi-card">
            <div className="kpi-label-row">
              <span className="kpi-label">{t('Anomaly Detection Status')}</span>
              {isAnomalous ? (
                <span className="anomaly-badge anomaly-flagged">
                  <AlertTriangle size={12} /> {t('ANOMALOUS')}
                </span>
              ) : (
                <span className="anomaly-badge anomaly-nominal">
                  <CheckCircle2 size={12} /> {t('NOMINAL')}
                </span>
              )}
            </div>
            <div className="kpi-value-row">
              <span className="kpi-value">
                {anomalyScore !== null && anomalyScore !== undefined
                  ? `${anomalyScore > 0 ? '+' : ''}${anomalyScore}`
                  : '—'}
              </span>
              <span className="kpi-sub font-mono">{t('decision score')}</span>
            </div>
            <span className="kpi-desc">
              {isAnomalous
                ? t('Multi-sensor correlation deviation detected by Isolation Forest.')
                : t('Sensor telemetry conforms to nominal healthy cluster distribution.')}
            </span>
          </div>

          {/* 3. Anomalous Sensor Count */}
          <div className="kpi-card">
            <div className="kpi-label-row">
              <span className="kpi-label">{t('Sensor Drift Envelope')}</span>
              <span className="text-[11px] font-mono text-secondary">
                {sensorDrifts.length} {t('deviations')}
              </span>
            </div>
            <div className="kpi-value-row">
              <span className="kpi-value">
                {sensorDrifts.filter((d) => d.abs_z > 1.5).length > 0 ? (
                  <span className="text-coral flex items-center gap-1.5">
                    <TrendingUp size={20} />
                    {sensorDrifts.filter((d) => d.abs_z > 1.5).length} {t('elevated')}
                  </span>
                ) : (
                  <span className="text-olive flex items-center gap-1.5">
                    <ShieldCheck size={20} />
                    {t('Stable')}
                  </span>
                )}
              </span>
            </div>
            <span className="kpi-desc">
              {t('Compared against nominal cruise baseline distribution (μ ± 1.5σ)')}
            </span>
          </div>

          {/* 4. Explanation Method */}
          <div className="kpi-card">
            <div className="kpi-label-row">
              <span className="kpi-label">{t('Model Attribution')}</span>
              <span className="shap-pill">
                <Sparkles size={11} /> {shapData?.method || 'TreeSHAP'}
              </span>
            </div>
            <div className="kpi-value-row">
              <span className="kpi-value text-base font-medium">
                {shapLoading ? t('Computing…') : shapData ? `${shapData.contributions?.length || 19} features` : 'Available'}
              </span>
            </div>
            <span className="kpi-desc">
              {t('Exact Shapley additive feature importance on single-engine inference')}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Visual Aircraft Engine Component Map                   */}
      {/* ========================================================= */}
      <Panel className="component-map-panel">
        <PanelHeading
          title="Aircraft Engine Component Map"
          description="Interactive physical station schematic of high-bypass turbofan layout."
        />

        {/* MANDATORY DOMAIN ADVISORY BANNER */}
        <div className="mandatory-diagnosis-banner" role="alert">
          <div className="mandatory-banner-header">
            <Info size={16} className="mandatory-banner-icon" />
            <strong className="mandatory-banner-title">
              Illustrative Engine Component Map — Component-level fault diagnosis not yet validated
            </strong>
          </div>
          <p className="mandatory-banner-text">
            {t(
              'The NASA C-MAPSS FD001 dataset provides run-to-failure runtimes with fleet-wide sensor telemetry, but does not provide validated component-level ground-truth fault labels. This schematic illustrates standard physical engine stations and sensor instrument locations for architecture reference only. Model predictions evaluate multivariate fleet telemetry as a whole.'
            )}
          </p>
        </div>

        {/* SVG Engine Cross-Section Schematic */}
        <div className="engine-svg-container">
          <svg
            viewBox="0 0 940 250"
            className="engine-schematic-svg"
            role="img"
            aria-label="Turbofan engine cross-section layout"
          >
            <defs>
              {/* Linear Gradients */}
              <linearGradient id="bypassAirGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#75838a" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#75838a" stopOpacity="0.04" />
              </linearGradient>
              <linearGradient id="coreFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#858a6c" stopOpacity="0.22" />
                <stop offset="45%" stopColor="#c66f5e" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#c66f5e" stopOpacity="0.12" />
              </linearGradient>
              <linearGradient id="selectedBoxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--coral)" stopOpacity="0.16" />
                <stop offset="100%" stopColor="var(--coral)" stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {/* Nacelle Outer Cowl Profile */}
            <path
              d="M 30,30 Q 250,18 520,24 T 910,48 L 910,65 Q 520,38 250,34 T 30,42 Z"
              fill="currentColor"
              className="cowl-path"
              opacity="0.12"
            />
            <path
              d="M 30,220 Q 250,232 520,226 T 910,202 L 910,185 Q 520,212 250,216 T 30,208 Z"
              fill="currentColor"
              className="cowl-path"
              opacity="0.12"
            />

            {/* Bypass Duct Airflow Channels */}
            <rect x="180" y="32" width="710" height="28" fill="url(#bypassAirGrad)" rx="4" />
            <rect x="180" y="190" width="710" height="28" fill="url(#bypassAirGrad)" rx="4" />

            {/* Bypass Flow Arrows */}
            <g className="flow-arrows" opacity="0.45" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M 220,46 L 250,46 M 245,42 L 250,46 L 245,50" />
              <path d="M 480,46 L 510,46 M 505,42 L 510,46 L 505,50" />
              <path d="M 760,46 L 790,46 M 785,42 L 790,46 L 785,50" />
              <path d="M 220,204 L 250,204 M 245,200 L 250,204 L 245,208" />
              <path d="M 480,204 L 510,204 M 505,200 L 510,204 L 505,208" />
              <path d="M 760,204 L 790,204 M 785,200 L 790,204 L 785,208" />
            </g>

            {/* Core Centerline Shaft */}
            <line
              x1="25"
              y1="125"
              x2="925"
              y2="125"
              stroke="currentColor"
              strokeDasharray="6 4"
              strokeWidth="1.2"
              opacity="0.25"
            />

            {/* Core Casing Flow Path Contour */}
            <path
              d="M 175,70 L 315,76 L 465,86 L 585,86 L 705,78 L 840,70 L 910,80 L 910,170 L 840,180 L 705,172 L 585,164 L 465,164 L 315,174 L 175,180 Z"
              fill="url(#coreFlowGrad)"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity="0.35"
            />

            {/* 6 Interactive Component Stations */}
            {ENGINE_COMPONENTS.map((comp) => {
              const isSelected = selectedComponent.id === comp.id;
              const boxHeight = 150;
              const boxY = 50;

              return (
                <g
                  key={comp.id}
                  className={`engine-station-group ${isSelected ? 'station-selected' : ''}`}
                  onClick={() => setSelectedComponent(comp)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${comp.name} station`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedComponent(comp);
                  }}
                >
                  {/* Component bounding box */}
                  <rect
                    x={comp.x}
                    y={boxY}
                    width={comp.width}
                    height={boxHeight}
                    rx="8"
                    className="station-rect"
                    fill={isSelected ? 'url(#selectedBoxGrad)' : 'var(--panel)'}
                    stroke={isSelected ? 'var(--coral)' : 'var(--border)'}
                    strokeWidth={isSelected ? '2' : '1'}
                  />

                  {/* Station Number Badge */}
                  <rect
                    x={comp.x + 8}
                    y={boxY + 8}
                    width={comp.width - 16}
                    height={18}
                    rx="4"
                    fill="currentColor"
                    className="station-tag-bg"
                    opacity={isSelected ? '0.12' : '0.05'}
                  />
                  <text
                    x={comp.x + comp.width / 2}
                    y={boxY + 21}
                    textAnchor="middle"
                    className="station-tag-text"
                    fontSize="9"
                    fontWeight="600"
                    fill={isSelected ? 'var(--coral)' : 'var(--secondary)'}
                    fontFamily="monospace"
                  >
                    {comp.station.split('·')[0].trim()}
                  </text>

                  {/* Component Name */}
                  <text
                    x={comp.x + comp.width / 2}
                    y={boxY + 46}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="650"
                    fill="var(--ink)"
                  >
                    {comp.shortName}
                  </text>

                  {/* Station Function / Stage */}
                  <text
                    x={comp.x + comp.width / 2}
                    y={boxY + 62}
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="var(--secondary)"
                  >
                    {comp.station.split('·')[1]?.trim() || ''}
                  </text>

                  {/* Internal Blade / Component Graphic Symbolism */}
                  <g className="component-graphic" opacity={isSelected ? '0.85' : '0.45'}>
                    {comp.id === 'fan' && (
                      <g stroke="currentColor" strokeWidth="1.8">
                        <line x1={comp.x + 40} y1={boxY + 80} x2={comp.x + 95} y2={boxY + 120} />
                        <line x1={comp.x + 95} y1={boxY + 80} x2={comp.x + 40} y2={boxY + 120} />
                        <circle cx={comp.x + comp.width / 2} cy={boxY + 100} r="12" fill="var(--panel)" />
                      </g>
                    )}
                    {comp.id === 'lpc' && (
                      <g stroke="currentColor" strokeWidth="1.5">
                        <line x1={comp.x + 35} y1={boxY + 82} x2={comp.x + 35} y2={boxY + 118} />
                        <line x1={comp.x + 60} y1={boxY + 85} x2={comp.x + 60} y2={boxY + 115} />
                        <line x1={comp.x + 85} y1={boxY + 88} x2={comp.x + 85} y2={boxY + 112} />
                      </g>
                    )}
                    {comp.id === 'hpc' && (
                      <g stroke="currentColor" strokeWidth="1.4">
                        <line x1={comp.x + 30} y1={boxY + 85} x2={comp.x + 30} y2={boxY + 115} />
                        <line x1={comp.x + 52} y1={boxY + 88} x2={comp.x + 52} y2={boxY + 112} />
                        <line x1={comp.x + 74} y1={boxY + 91} x2={comp.x + 74} y2={boxY + 109} />
                        <line x1={comp.x + 96} y1={boxY + 94} x2={comp.x + 96} y2={boxY + 106} />
                        <line x1={comp.x + 118} y1={boxY + 97} x2={comp.x + 118} y2={boxY + 103} />
                      </g>
                    )}
                    {comp.id === 'combustor' && (
                      <g stroke="var(--coral)" strokeWidth="1.5" fill="none">
                        <circle cx={comp.x + 45} cy={boxY + 100} r="8" />
                        <circle cx={comp.x + 80} cy={boxY + 100} r="8" />
                        <path d={`M ${comp.x + 45},${boxY + 100} Q ${comp.x + 62},${boxY + 92} ${comp.x + 80},${boxY + 100}`} />
                      </g>
                    )}
                    {comp.id === 'hpt' && (
                      <g stroke="currentColor" strokeWidth="1.6">
                        <line x1={comp.x + 45} y1={boxY + 92} x2={comp.x + 45} y2={boxY + 108} />
                        <line x1={comp.x + 75} y1={boxY + 88} x2={comp.x + 75} y2={boxY + 112} />
                      </g>
                    )}
                    {comp.id === 'lpt' && (
                      <g stroke="currentColor" strokeWidth="1.5">
                        <line x1={comp.x + 35} y1={boxY + 86} x2={comp.x + 35} y2={boxY + 114} />
                        <line x1={comp.x + 65} y1={boxY + 82} x2={comp.x + 65} y2={boxY + 118} />
                        <line x1={comp.x + 95} y1={boxY + 78} x2={comp.x + 95} y2={boxY + 122} />
                      </g>
                    )}
                  </g>

                  {/* Sensor count pill */}
                  <text
                    x={comp.x + comp.width / 2}
                    y={boxY + 140}
                    textAnchor="middle"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fill={isSelected ? 'var(--coral)' : 'var(--muted)'}
                    fontWeight="500"
                  >
                    {comp.sensors.length} {comp.sensors.length === 1 ? 'sensor' : 'sensors'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Component Station Telemetry Drawer */}
        <div className="component-inspector-card">
          <div className="inspector-header">
            <div>
              <span className="eyebrow">{t('PHYSICAL ENGINE STATION INSPECTOR')}</span>
              <h3 className="inspector-title">
                {selectedComponent.name} — <small className="text-secondary">{selectedComponent.station}</small>
              </h3>
            </div>
            <span className="station-role-badge">{selectedComponent.shortName}</span>
          </div>

          <p className="inspector-description">{selectedComponent.description}</p>

          <div className="inspector-sensors-grid">
            {selectedComponent.sensors.map((sensor) => {
              const liveVal = latestTelemetry[sensor.key];
              const driftInfo = sensorDrifts.find((d) => d.feature === sensor.key);

              return (
                <div key={sensor.key} className="sensor-inspector-item">
                  <div className="sensor-item-top">
                    <span className="sensor-item-key">{sensor.key}</span>
                    {driftInfo ? (
                      <span className={`drift-pill ${driftInfo.trend === 'ELEVATED' ? 'drift-up' : 'drift-down'}`}>
                        {driftInfo.trend === 'ELEVATED' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {driftInfo.trend} ({driftInfo.z_score > 0 ? '+' : ''}{driftInfo.z_score}σ)
                      </span>
                    ) : (
                      <span className="drift-pill drift-nominal">{t('NOMINAL')}</span>
                    )}
                  </div>
                  <strong className="sensor-item-name">{sensor.name}</strong>
                  <div className="sensor-item-value">
                    {liveVal !== undefined && liveVal !== null ? (
                      <>
                        <span className="val-number">{Number(liveVal).toFixed(2)}</span>
                        <span className="val-unit">{sensor.unit}</span>
                      </>
                    ) : (
                      <span className="val-na">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="inspector-note">
            <Info size={13} className="inline mr-1 text-secondary" />
            {t(
              'Telemetry streams from this station are fed into the multivariate model pipeline for whole-engine health assessment.'
            )}
          </p>
        </div>
      </Panel>

      {/* ========================================================= */}
      {/* 3. Maintenance Insights Section                           */}
      {/* ========================================================= */}
      <div className="diagnosis-insights-container">
        <Panel className="insights-panel">
          <PanelHeading
            title="Maintenance Insights"
            description="Explanations of anomalous sensor deviations and TreeSHAP feature contributions."
          />

          {/* Actionable Engineering Advisory Card */}
          {recommendation && (
            <div className={`recommendation-box rec-${urgencyTier.toLowerCase()}`}>
              <div className="rec-header">
                <Wrench size={16} className="rec-icon" />
                <span className="rec-badge">{t('ENGINEERING MAINTENANCE ADVISORY')}</span>
                <span className="rec-tier-badge">{urgencyTier}</span>
              </div>
              <p className="rec-text">{recommendation}</p>
              <div className="rec-footer">
                <span>Evaluated at Cycle {detail?.last_cycle || '—'}</span>
                <span>NASA C-MAPSS FD001 Model v{prediction?.model_version || '1.0.0'}</span>
              </div>
            </div>
          )}

          <div className="insights-columns-grid">
            {/* Column A: Abnormal Sensor Readings */}
            <div className="insights-column">
              <div className="column-header">
                <div className="flex items-center gap-2">
                  <TrendingDown size={15} className="text-coral" />
                  <h4>{t('Abnormal Sensor Readings & Drift')}</h4>
                </div>
                <span className="text-[11px] font-mono text-secondary">
                  {sensorDrifts.length} {t('monitored deviations')}
                </span>
              </div>

              <p className="column-explainer">
                {t(
                  'Physical telemetry deviations ranked by z-score magnitude relative to nominal fleet baseline distributions:'
                )}
              </p>

              {sensorDrifts.length === 0 ? (
                <div className="empty-insights-state">
                  <ShieldCheck size={24} className="text-olive" />
                  <p>{t('All physical sensors are operating within nominal baseline tolerances (±1.5σ).')}</p>
                </div>
              ) : (
                <div className="drift-list">
                  {sensorDrifts.map((drift) => (
                    <div key={drift.feature} className="drift-row">
                      <div className="drift-info">
                        <div className="flex items-center gap-1.5">
                          <span className="drift-feature-key">{drift.feature}</span>
                          <span className={`drift-trend-badge ${drift.trend === 'ELEVATED' ? 'trend-up' : 'trend-down'}`}>
                            {drift.trend}
                          </span>
                        </div>
                        <strong className="drift-feature-name">{drift.description}</strong>
                        <div className="drift-metrics">
                          <span>{t('Observed')}: <strong>{drift.current_value}</strong></span>
                          <span>·</span>
                          <span>{t('Baseline')}: {drift.baseline_mean}</span>
                          <span>·</span>
                          <span>Δ: {drift.delta > 0 ? `+${drift.delta}` : drift.delta}</span>
                        </div>
                      </div>
                      <div className="drift-score-box">
                        <span className="z-score-val">{drift.z_score > 0 ? `+${drift.z_score}` : drift.z_score}σ</span>
                        <span className="z-score-label">{t('std dev')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column B: Top Sensor Contributors to Prediction (SHAP) */}
            <div className="insights-column">
              <div className="column-header">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-coral" />
                  <h4>{t('Top Prediction Contributors (TreeSHAP)')}</h4>
                </div>
                <span className="shap-method-tag">{shapData?.method || 'TreeSHAP'}</span>
              </div>

              <p className="column-explainer">
                {t(
                  'Exact TreeSHAP attributions quantifying how specific telemetry features drove the RUL prediction from fleet expected value:'
                )}
              </p>

              {shapLoading ? (
                <StateBlock loading />
              ) : !shapData ? (
                <div className="empty-insights-state">
                  <Info size={22} className="text-secondary" />
                  <p>{t('TreeSHAP explanation is calculated on demand for this engine unit.')}</p>
                </div>
              ) : (
                <div className="shap-contributions-stack">
                  {/* Features Decreasing RUL (Accelerating Wear) */}
                  <div className="shap-group">
                    <span className="shap-group-title text-coral">
                      {t('Features Decreasing RUL (Wear Signatures)')}
                    </span>
                    {shapDrivers.negative.length === 0 ? (
                      <span className="text-xs text-secondary italic">{t('No major negative drivers.')}</span>
                    ) : (
                      shapDrivers.negative.map((item) => (
                        <div key={item.feature} className="shap-bar-row">
                          <div className="shap-bar-labels">
                            <span className="shap-feature-name">{item.description}</span>
                            <span className="shap-impact-val text-coral">
                              {item.shap_value.toFixed(1)} {t('cycles')}
                            </span>
                          </div>
                          <div className="shap-progress-track">
                            <div
                              className="shap-progress-fill fill-negative"
                              style={{ width: `${Math.min(100, Math.abs(item.shap_value) * 6)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Features Supporting RUL (Healthy Operating Margin) */}
                  <div className="shap-group">
                    <span className="shap-group-title text-olive">
                      {t('Features Supporting RUL (Operating Margin)')}
                    </span>
                    {shapDrivers.positive.length === 0 ? (
                      <span className="text-xs text-secondary italic">{t('No major positive drivers.')}</span>
                    ) : (
                      shapDrivers.positive.map((item) => (
                        <div key={item.feature} className="shap-bar-row">
                          <div className="shap-bar-labels">
                            <span className="shap-feature-name">{item.description}</span>
                            <span className="shap-impact-val text-olive">
                              +{item.shap_value.toFixed(1)} {t('cycles')}
                            </span>
                          </div>
                          <div className="shap-progress-track">
                            <div
                              className="shap-progress-fill fill-positive"
                              style={{ width: `${Math.min(100, Math.abs(item.shap_value) * 6)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </section>
  );
}
