import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api, { getApiErrorMessage } from '../services/api';
import HistoricalReplay from '../components/Charts/HistoricalReplay';
import { Disclaimer, formatEngine, PageHeading, Panel, PanelHeading, StateBlock } from '../components/UI/Shared';
import { usePreferences } from '../i18n/Preferences';

export default function AnomalyDetection() {
  const { t } = usePreferences();
  const [engines, setEngines] = useState([]);
  const [engineId, setEngineId] = useState('');
  const [sampleStride, setSampleStride] = useState(10);
  const [replay, setReplay] = useState(null);
  const [loadingFleet, setLoadingFleet] = useState(true);
  const [loadingReplay, setLoadingReplay] = useState(false);
  const [fleetError, setFleetError] = useState('');
  const [replayError, setReplayError] = useState('');
  const [detectorLoaded, setDetectorLoaded] = useState(false);
  const [metadataError, setMetadataError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const loadFleet = async () => {
    setLoadingFleet(true);
    setFleetError('');
    const [fleetResult, metadataResult] = await Promise.allSettled([
      api.getEngines(),
      api.getModelMetadata(),
    ]);
    if (fleetResult.status === 'fulfilled') {
      setEngines(fleetResult.value);
      setEngineId((current) => fleetResult.value.some((engine) => String(engine.engine_id) === current)
        ? current
        : fleetResult.value[0] ? String(fleetResult.value[0].engine_id) : '');
    } else {
      setFleetError(getApiErrorMessage(fleetResult.reason));
    }
    if (metadataResult.status === 'fulfilled') {
      setDetectorLoaded(metadataResult.value.anomaly_detector_loaded === true);
      setMetadataError('');
    } else {
      setDetectorLoaded(false);
      setMetadataError(getApiErrorMessage(metadataResult.reason));
    }
    setLoadingFleet(false);
  };

  useEffect(() => { loadFleet(); }, []);

  const loadReplay = async () => {
    if (!engineId) return;
    setLoadingReplay(true);
    setReplayError('');
    try {
      setReplay(await api.replayEngine(Number(engineId), sampleStride));
    } catch (requestError) {
      setReplay(null);
      setReplayError(getApiErrorMessage(requestError, 'Historical replay could not be loaded.'));
    } finally {
      setLoadingReplay(false);
    }
  };

  useEffect(() => {
    if (!engineId) return;
    loadReplay();
  }, [engineId, sampleStride, reloadToken]);

  const steps = replay?.timeline_steps || [];
  const flaggedSteps = detectorLoaded ? steps.filter((step) => step.is_anomalous) : [];
  const driftPeak = useMemo(() => steps.reduce((peak, step) => (
    step.top_sensor_drifts || []
  ).reduce((max, drift) => Math.max(max, Number(drift.abs_z) || 0), peak), 0), [steps]);
  const mostAnomalous = detectorLoaded && steps.length
    ? steps.reduce((lowest, step) => Number(step.anomaly_score) < Number(lowest.anomaly_score) ? step : lowest)
    : null;

  return (
    <div className="page-stack">
      <PageHeading eyebrow="UNSUPERVISED MONITORING" title="Anomaly detection" description="Review Isolation Forest outputs and baseline sensor drift over sampled historical engine data." />
      <Disclaimer />
      <Panel>
        <PanelHeading title="Historical replay source" description="Replay is simulated from NASA C-MAPSS dataset history; it is not live aircraft telemetry." />
        <div className="anomaly-filters">
          <label className="filter-field"><span>{t('Engine')}</span><select className="form-select" value={engineId} onChange={(event) => setEngineId(event.target.value)} disabled={loadingFleet || !!fleetError}><option value="">{t('Select engine')}</option>{engines.map((engine) => <option value={engine.engine_id} key={engine.engine_id}>{formatEngine(engine.engine_id)} · {engine.last_cycle} {t('cycles')}</option>)}</select></label>
          <label className="filter-field"><span>{t('Sample every')}</span><select className="form-select" value={sampleStride} onChange={(event) => setSampleStride(Number(event.target.value))}><option value={1}>1 {t('cycle')}</option><option value={5}>5 {t('cycles')}</option><option value={10}>10 {t('cycles')}</option><option value={20}>20 {t('cycles')}</option></select></label>
          <button type="button" className="button button-outline" onClick={() => setReloadToken((token) => token + 1)} disabled={!engineId || loadingReplay}>{t('Refresh replay')}</button>
        </div>
        {fleetError ? <StateBlock error={fleetError} onRetry={loadFleet} /> : loadingFleet ? <StateBlock loading /> : null}
      </Panel>

      {metadataError && <p className="inline-error" role="status">{t('Detector readiness could not be confirmed:')} {metadataError}</p>}
      <div className="anomaly-metrics">
        <div className="anomaly-metric"><span className="metric-label">{t('Sampled observations')}</span><strong>{loadingReplay ? '—' : steps.length || '—'}</strong><span className="metric-caption">{t('From selected historical replay')}</span></div>
        <div className="anomaly-metric"><span className="metric-label">{t('Flagged observations')}</span><strong>{loadingReplay || !detectorLoaded ? '—' : flaggedSteps.length}</strong><span className="metric-caption">{detectorLoaded ? t('Isolation Forest output') : t('Detector unavailable')}</span></div>
        <div className="anomaly-metric"><span className="metric-label">{t('Lowest decision score')}</span><strong>{loadingReplay || !mostAnomalous ? '—' : Number(mostAnomalous.anomaly_score).toFixed(3)}</strong><span className="metric-caption">{t('Lower scores are more anomalous')}</span></div>
        <div className="anomaly-metric"><span className="metric-label">{t('Largest baseline drift')}</span><strong>{loadingReplay || !steps.length ? '—' : `${driftPeak.toFixed(2)}σ`}</strong><span className="metric-caption">{t('Maximum absolute sensor z-score')}</span></div>
      </div>

      {!loadingFleet && !fleetError && !detectorLoaded && (
        <div className="notice notice-warning anomaly-notice"><AlertTriangle size={15} /> {t('The backend reports that its Isolation Forest artifact is not loaded. This view will not treat fallback anomaly values as detector results; baseline sensor-drift attribution remains available.')}</div>
      )}

      <HistoricalReplay
        data={replay}
        loading={loadingReplay || loadingFleet}
        error={replayError}
        onLoad={() => setReloadToken((token) => token + 1)}
        detectorLoaded={detectorLoaded}
      />

      {detectorLoaded && (
        <div className="content-grid anomaly-grid">
          <Panel>
            <PanelHeading title="Anomaly score through replay" description="Isolation Forest decision-function values returned by the backend; lower scores indicate more anomalous observations." />
            {loadingReplay ? <StateBlock loading /> : steps.length === 0 ? <StateBlock empty="No score samples are available." /> : (
              <div className="chart-wrap chart-anomaly">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={steps} margin={{ top: 10, right: 12, bottom: 3, left: -8 }}>
                    <CartesianGrid stroke="#e8e4dc" strokeDasharray="3 5" />
                    <XAxis dataKey="cycle" type="number" domain={['dataMin', 'dataMax']} tickLine={false} axisLine={false} tick={{ fill: '#77746d', fontSize: 10 }} />
                    <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{ fill: '#77746d', fontSize: 10 }} width={48} />
                    <Tooltip contentStyle={{ background: '#fbfaf7', border: '1px solid #d4d1ca', borderRadius: 8, fontSize: 11 }} labelFormatter={(cycle) => `${t('Cycle')} ${cycle}`} formatter={(value) => [Number(value).toFixed(3), t('Decision score')]} />
                    <Line type="monotone" dataKey="anomaly_score" stroke="#75838a" strokeWidth={2} dot={(props) => <circle cx={props.cx} cy={props.cy} r={props.payload.is_anomalous ? 4 : 2} fill={props.payload.is_anomalous ? '#c66f5e' : '#75838a'} stroke="#fbfaf7" strokeWidth={1} />} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
          <Panel>
            <PanelHeading title="Flagged replay observations" description="Only backend steps marked anomalous are listed." />
            {loadingReplay ? <StateBlock loading /> : flaggedSteps.length === 0 ? (
              <StateBlock empty="No sampled observations were flagged in this replay." />
            ) : (
              <div className="flagged-list">{flaggedSteps.map((step) => (
                <div className="flagged-row" key={step.cycle}><AlertTriangle size={15} /><span><strong>{t('Cycle')} {step.cycle}</strong><small>{t('Estimated RUL')} {step.predicted_rul} {t('cycles')}</small></span><b>{Number(step.anomaly_score).toFixed(3)}</b></div>
              ))}</div>
            )}
          </Panel>
        </div>
      )}
      <div className="anomaly-method"><Activity size={17} /><p><strong>{t('Two complementary signals.')}</strong> {t('The Isolation Forest flags multivariate observations that differ from its nominal training envelope. Sensor drift attribution ranks individual readings by absolute z-score against the backend’s healthy baseline. These are exploratory signals, not diagnoses or approved maintenance thresholds.')}</p></div>
    </div>
  );
}
