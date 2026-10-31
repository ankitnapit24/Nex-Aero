import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api, { getApiErrorMessage } from '../services/api';
import HistoricalReplay from '../components/Charts/HistoricalReplay';
import { Disclaimer, formatEngine, formatRul, formatTimestamp, PageHeading, Panel, PanelHeading, RiskBadge, StateBlock } from '../components/UI/Shared';
import { usePreferences } from '../i18n/Preferences';

const sensorLabel = (sensor) => sensor.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function EngineDetails() {
  const { t } = usePreferences();
  const { id } = useParams();
  const navigate = useNavigate();
  const [engines, setEngines] = useState([]);
  const [detail, setDetail] = useState(null);
  const [records, setRecords] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [metadataError, setMetadataError] = useState('');
  const [sensor, setSensor] = useState('sensor_2');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [replay, setReplay] = useState(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayError, setReplayError] = useState('');

  const loadEngine = async () => {
    setLoading(true);
    setError('');
    setHistoryError('');
    setMetadataError('');
    setReplay(null);
    setReplayError('');
    try {
      const fleet = await api.getEngines();
      setEngines(fleet);
      if (!fleet.length) {
        setDetail(null);
        setError('The backend returned no engines for the selected dataset.');
        return;
      }
      const engineId = id ? Number(id) : fleet[0].engine_id;
      if (!Number.isInteger(engineId) || engineId < 1) {
        setDetail(null);
        setError('Engine identifier must be a positive whole number.');
        return;
      }
      if (!id) navigate(`/engines/${engineId}`, { replace: true });
      const [engineResult, historyResult, modelResult] = await Promise.allSettled([
        api.getEngine(engineId),
        api.getPredictions(1000),
        api.getModelMetadata(),
      ]);
      if (engineResult.status === 'rejected') throw engineResult.reason;
      setDetail(engineResult.value);
      setSensor((current) => current === 'sensor_2' || engineResult.value.telemetry_history?.[0]?.[current] !== undefined
        ? current
        : Object.keys(engineResult.value.telemetry_history?.[0] || {}).find((key) => key.startsWith('sensor_')) || 'sensor_2');
      if (historyResult.status === 'fulfilled') setRecords(historyResult.value.filter((record) => record.engine_id === engineId));
      else setHistoryError(getApiErrorMessage(historyResult.reason));
      if (modelResult.status === 'fulfilled') setMetadata(modelResult.value);
      else setMetadataError(getApiErrorMessage(modelResult.reason));
    } catch (loadError) {
      setDetail(null);
      setError(getApiErrorMessage(loadError, 'Could not load this engine.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEngine(); }, [id]);

  const loadReplay = async () => {
    if (!detail?.engine_id) return;
    setReplayLoading(true);
    setReplayError('');
    try {
      setReplay(await api.replayEngine(detail.engine_id, 10));
    } catch (requestError) {
      setReplay(null);
      setReplayError(getApiErrorMessage(requestError, 'Historical replay could not be loaded.'));
    } finally {
      setReplayLoading(false);
    }
  };

  const history = detail?.telemetry_history || [];
  const sensors = useMemo(() => Object.keys(history[0] || {}).filter((key) => key.startsWith('sensor_')), [history]);
  const selectedEngine = engines.find((engine) => engine.engine_id === detail?.engine_id);
  const latest = history[history.length - 1];

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="FLEET / ENGINE RECORD"
        title={detail ? `Engine ${formatEngine(detail.engine_id)}` : 'Engine details'}
        description="Historical NASA C-MAPSS telemetry and the backend’s current RUL estimate."
        actions={<Link className="button button-quiet" to="/engines"><ArrowLeft size={15} /> {t('Back to engines')}</Link>}
      />
      {loading || error ? <StateBlock loading={loading} error={error} onRetry={loadEngine} /> : detail && (
        <>
          <div className="engine-overview">
            <div className="engine-rul">
              <span className="metric-label">{t('Estimated remaining life')}</span>
              <strong>{detail.predicted_rul === null ? '—' : Number(detail.predicted_rul).toFixed(1)}<small>{detail.predicted_rul === null ? '' : ' cycles'}</small></strong>
              <p>{t('Model estimate based on the latest observed telemetry row.')}</p>
            </div>
            <div className="engine-facts">
              <div><span>{t('Last observed cycle')}</span><strong className="numeric">{detail.last_cycle}</strong></div>
              <div><span>{t('Assessment tier')}</span><RiskBadge tier={detail.urgency_tier} /></div>
              <div><span>{t('Dataset split')}</span><strong>{detail.dataset_split || '—'}</strong></div>
              <div><span>{t('Test-set reference RUL')}</span><strong>{detail.true_rul === null ? t('Not available') : formatRul(detail.true_rul)}</strong></div>
              <div><span>{t('Model version')}</span><strong>{metadata?.version || '—'}</strong></div>
            </div>
          </div>
          <Disclaimer />
          <p className="quiet-explainer">{t('RUL estimates cycles to the dataset-defined end-of-life endpoint. The test-set reference value is supplied for dataset evaluation and is not operational telemetry.')}</p>

          <div className="content-grid detail-grid">
            <Panel className="sensor-panel">
              <PanelHeading
                title="Sensor history"
                description={`Historical dataset observations · ${history.length} cycles`}
                action={<label className="select-control"><span className="sr-only">{t('Select sensor')}</span><select aria-label={t('Select sensor')} value={sensor} onChange={(event) => setSensor(event.target.value)}>{sensors.map((key) => <option value={key} key={key}>{sensorLabel(key)}</option>)}</select><ChevronDown size={14} /></label>}
              />
              {history.length === 0 ? <StateBlock empty="No telemetry history is available for this engine." /> : (
                <>
                  <div className="chart-wrap chart-sensor">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history} margin={{ top: 12, right: 12, bottom: 2, left: -10 }}>
                        <CartesianGrid stroke="#e8e4dc" strokeDasharray="3 5" />
                        <XAxis dataKey="cycle" type="number" domain={['dataMin', 'dataMax']} tickLine={false} axisLine={false} tick={{ fill: '#77746d', fontSize: 11 }} label={{ value: t('Operating cycle'), position: 'insideBottom', offset: -2, fill: '#77746d', fontSize: 11 }} />
                        <YAxis type="number" domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{ fill: '#918d85', fontSize: 10 }} width={52} />
                        <Tooltip contentStyle={{ background: '#fbfaf7', border: '1px solid #d4d1ca', borderRadius: 8, fontSize: 12 }} labelFormatter={(cycle) => `${t('Cycle')} ${cycle}`} formatter={(value) => [Number(value).toFixed(4), sensorLabel(sensor)]} />
                        <Line type="monotone" dataKey={sensor} stroke="#c66f5e" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#c66f5e' }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="chart-note">{t('Historical dataset values; sensor identifiers are shown without assumed physical units.')}</p>
                </>
              )}
            </Panel>
            <Panel>
              <PanelHeading title="Latest observed values" description={latest ? `${t('Values at cycle')} ${latest.cycle}` : 'No observation available'} />
              {latest && <div className="reading-list">
                {Object.entries(latest).filter(([key]) => key !== 'cycle').map(([key, value]) => (
                  <div className="reading-row" key={key}><span>{sensorLabel(key)}</span><strong className="numeric">{Number(value).toFixed(4)}</strong></div>
                ))}
              </div>}
            </Panel>
          </div>

          <HistoricalReplay
            data={replay}
            loading={replayLoading}
            error={replayError}
            onLoad={loadReplay}
            detectorLoaded={metadata?.anomaly_detector_loaded === true}
          />

          <Panel>
            <PanelHeading title="Prediction history" description="Stored inferences for this engine from the backend audit log." action={<Link to="/history" className="text-link">{t('Full history')} <ChevronDown size={14} /></Link>} />
            {historyError ? <StateBlock error={historyError} /> : records.length === 0 ? <StateBlock empty="No inference records have been stored for this engine." /> : (
              <div className="table-scroll"><table className="data-table"><thead><tr><th>{t('Recorded at')}</th><th>{t('Cycle')}</th><th>{t('Estimated RUL')}</th><th>{t('Tier')}</th><th>{t('Model')}</th></tr></thead><tbody>
                {records.slice(0, 8).map((record) => <tr key={record.id}><td>{formatTimestamp(record.created_at)}</td><td className="numeric">{record.cycle}</td><td className="numeric rul-value">{formatRul(record.predicted_rul)}</td><td><RiskBadge tier={record.urgency_tier} /></td><td>{record.model_version}</td></tr>)}
              </tbody></table></div>
            )}
          </Panel>
          <div className="detail-meta"><span>Source: {metadata?.dataset || 'NASA C-MAPSS FD001'}</span><span>{selectedEngine ? `${selectedEngine.total_cycles} records in this engine’s test series` : ''}</span><span>{metadataError || 'Prediction timestamp is not provided by the engine-detail endpoint.'}</span></div>
        </>
      )}
    </div>
  );
}
