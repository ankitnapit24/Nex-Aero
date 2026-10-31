import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api, { getApiErrorMessage } from '../services/api';
import { formatEngine, formatRul, formatTimestamp, PageHeading, Panel, PanelHeading, RiskBadge, StateBlock } from '../components/UI/Shared';
import { usePreferences } from '../i18n/Preferences';

const bucketColors = ['#d87964', '#c69962', '#a8a78a', '#77786f'];

export default function Dashboard() {
  const { t } = usePreferences();
  const [engines, setEngines] = useState([]);
  const [records, setRecords] = useState([]);
  const [health, setHealth] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [engineError, setEngineError] = useState('');
  const [supportError, setSupportError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setEngineError('');
    setSupportError('');
    const [fleet, history, status, model] = await Promise.allSettled([
      api.getEngines(),
      api.getPredictions(100),
      api.getHealth(),
      api.getModelMetadata(),
    ]);
    if (fleet.status === 'fulfilled') setEngines(fleet.value);
    else setEngineError(getApiErrorMessage(fleet.reason));
    if (history.status === 'fulfilled') setRecords(history.value);
    if (status.status === 'fulfilled') setHealth(status.value);
    if (model.status === 'fulfilled') setMetadata(model.value);
    if (history.status === 'rejected' || status.status === 'rejected' || model.status === 'rejected') {
      const failures = [history, status, model].filter((item) => item.status === 'rejected');
      setSupportError(getApiErrorMessage(failures[0].reason));
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const counts = useMemo(() => ({
    critical: engines.filter((engine) => engine.urgency_tier === 'CRITICAL').length,
    warning: engines.filter((engine) => engine.urgency_tier === 'WARNING').length,
    moderate: engines.filter((engine) => engine.urgency_tier === 'MODERATE').length,
    nominal: engines.filter((engine) => engine.urgency_tier === 'NOMINAL').length,
  }), [engines]);
  const lowestRul = engines.reduce((lowest, engine) => {
    const value = Number(engine.predicted_rul);
    return Number.isFinite(value) ? Math.min(lowest, value) : lowest;
  }, Number.POSITIVE_INFINITY);
  const distribution = [
    { range: '0–25', label: 'High · ≤25', count: counts.critical },
    { range: '26–50', label: 'Elevated · 26–50', count: counts.warning },
    { range: '51–80', label: 'Moderate · 51–80', count: counts.moderate },
    { range: '80+', label: 'Lower · >80', count: counts.nominal },
  ];
  const recentEvents = records.slice(0, 5);
  const testMetrics = metadata?.nasa_test_metrics;

  return (
    <div className="page-stack">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">{t('ENGINE HEALTH INTELLIGENCE')} <span> / </span> {t('RESEARCH PROTOTYPE')}</p>
          <h1>{t('Know your engines.')}<br /><span>{t('Before they fail.')}</span></h1>
          <p className="hero-description">{t('Predictive intelligence for turbofan engine health, remaining useful life, and maintenance planning.')}</p>
          <div className="hero-actions">
            <Link className="button button-dark" to="/engines">{t('Explore engines')} <ArrowRight size={16} /></Link>
            <Link className="button button-quiet" to="/predictions">{t('View predictions')} <ChevronRight size={16} /></Link>
          </div>
        </div>
        <aside className="hero-summary" aria-label="System summary">
          <div className="summary-topline"><span>{t('System summary')}</span><span className={`summary-indicator ${health?.status === 'online' ? 'summary-ok' : ''}`} /></div>
          <dl>
            <div><dt>{t('Dataset')}</dt><dd>NASA C-MAPSS FD001</dd></div>
            <div><dt>{t('Model')}</dt><dd>{metadata?.model_name || t('Unavailable')}</dd></div>
            <div><dt>{t('Model version')}</dt><dd>{metadata?.version || '—'}</dd></div>
            <div><dt>{t('System')}</dt><dd>{health?.status === 'online' ? (health.model_loaded ? t('Ready') : t('Model unavailable')) : health ? t('Unavailable') : t('Checking')}</dd></div>
          </dl>
          {health?.disclaimer && <p className="summary-caption">{health.disclaimer}</p>}
        </aside>
      </section>

      <section className="metric-strip" aria-label="Fleet metrics">
        <div className="metric-item"><span className="metric-label">{t('Demo engines')}</span><strong>{loading ? '—' : engineError ? '—' : engines.length}</strong><span className="metric-caption">{t('Test fleet records')}</span></div>
        <div className="metric-item"><span className="metric-label">{t('Assessment queue')}</span><strong>{loading ? '—' : engineError ? '—' : counts.critical + counts.warning}</strong><span className="metric-caption">{t('Illustrative high / elevated tiers')}</span></div>
        <div className="metric-item"><span className="metric-label">{t('Lowest estimated RUL')}</span><strong>{loading || engineError || !Number.isFinite(lowestRul) ? '—' : lowestRul.toFixed(1)}<small>{Number.isFinite(lowestRul) && !engineError ? ` ${t('cycles')}` : ''}</small></strong><span className="metric-caption">{t('Lowest model estimate in this fleet')}</span></div>
        <div className="metric-item"><span className="metric-label">{t('Prediction records')}</span><strong>{supportError ? '—' : records.length}</strong><span className="metric-caption">{t('Up to the latest 100 retrieved')}</span></div>
      </section>

      {supportError && <p className="inline-error" role="status">Some summary data could not be loaded: {supportError}</p>}

      <div className="content-grid dashboard-grid">
        <Panel className="monitoring-panel">
          <PanelHeading
            title="Engine monitoring"
            description="Prioritize engines by estimated remaining useful life."
            action={<Link className="text-link" to="/engines">{t('All engines')} <ArrowRight size={14} /></Link>}
          />
          {engineError || loading || engines.length === 0 ? (
            <StateBlock loading={loading} error={engineError} empty={!loading && !engineError ? 'No engine records are available from the backend.' : ''} onRetry={loadData} />
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>{t('Engine')}</th><th>{t('Last cycle')}</th><th>{t('Estimated RUL')}</th><th>{t('Assessment tier')}</th><th aria-label={t('Details')} /></tr></thead>
                <tbody>
                  {engines.slice(0, 8).map((engine) => (
                    <tr key={engine.engine_id} className="clickable-row">
                      <td><Link className="table-primary-link" to={`/engines/${engine.engine_id}`}>{formatEngine(engine.engine_id)}</Link><span className="table-subtext">{engine.dataset_split} split</span></td>
                      <td className="numeric">{engine.last_cycle}</td>
                      <td className="numeric rul-value">{formatRul(engine.predicted_rul)}</td>
                      <td><RiskBadge tier={engine.urgency_tier} /></td>
                      <td><Link className="icon-link" to={`/engines/${engine.engine_id}`} aria-label={`${t('View')} ${formatEngine(engine.engine_id)}`}><ChevronRight size={17} /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="panel-footnote">{t('Risk tiers are illustrative demo categories, not approved maintenance limits.')}</div>
        </Panel>

        <Panel>
          <PanelHeading title="Fleet RUL distribution" description="Engine counts from current backend estimates." />
          {engineError || loading || engines.length === 0 ? (
            <StateBlock loading={loading} error={engineError} empty={!loading && !engineError ? 'No estimates are available to chart.' : ''} />
          ) : (
            <>
              <div className="chart-wrap chart-distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution} margin={{ top: 12, right: 4, bottom: 0, left: -18 }}>
                    <CartesianGrid vertical={false} stroke="#e8e4dc" />
                    <XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fill: '#77746d', fontSize: 11 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#918d85', fontSize: 10 }} />
                    <Tooltip cursor={{ fill: '#f0eee8' }} contentStyle={{ background: '#fbfaf7', border: '1px solid #d4d1ca', borderRadius: 8, fontSize: 12 }} formatter={(value) => [`${value} ${t('engines')}`, t('Fleet')]} labelFormatter={(label) => `RUL ${label} ${t('cycles')}`} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={42}>
                      {distribution.map((entry, index) => <Cell key={entry.range} fill={bucketColors[index]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-note">{t('Ranges follow the backend’s configured illustrative urgency thresholds.')}</p>
            </>
          )}
        </Panel>
      </div>

      <div className="content-grid bottom-grid">
        <Panel>
          <PanelHeading title="Latest updates" description="Recent inference records written by the backend." action={<Link className="text-link" to="/history">{t('View history')} <ArrowRight size={14} /></Link>} />
          {supportError && records.length === 0 ? <StateBlock error={supportError} onRetry={loadData} /> : recentEvents.length === 0 ? (
            <StateBlock loading={loading} empty={!loading ? 'No prediction events have been recorded yet.' : ''} />
          ) : (
            <div className="event-list">
              {recentEvents.map((record) => (
                <Link className="event-row" key={record.id} to={`/engines/${record.engine_id}`}>
                  <span className={`event-marker risk-marker-${String(record.urgency_tier || '').toLowerCase()}`} />
                  <span className="event-content"><strong>{formatEngine(record.engine_id)} {t('prediction recorded')}</strong><small>{formatTimestamp(record.created_at)} · {t('Cycle')} {record.cycle}</small></span>
                  <span className="event-rul">{formatRul(record.predicted_rul)}</span>
                  <ChevronRight size={15} className="muted-icon" />
                </Link>
              ))}
            </div>
          )}
        </Panel>
        <Panel className="benchmark-panel">
          <PanelHeading title="Model evaluation" description="Official NASA test split · aggregate metrics" />
          {testMetrics ? (
            <div className="benchmark-stats">
              <div><span>{t('Test engines')}</span><strong>{testMetrics.test_engines ?? '—'}</strong></div>
              <div><span>{t('Test MAE')}</span><strong>{testMetrics.test_mae_cycles ?? '—'} <small>{t('cycles')}</small></strong></div>
              <div><span>{t('Test RMSE')}</span><strong>{testMetrics.test_rmse_cycles ?? '—'} <small>{t('cycles')}</small></strong></div>
            </div>
          ) : <StateBlock loading={loading} error={supportError || ''} empty={!loading && !supportError ? 'Evaluation metrics are not available.' : ''} />}
          <p className="chart-note">{t('Aggregate test metrics are not a guarantee of an individual prediction’s accuracy.')}</p>
        </Panel>
      </div>
      <div className="dashboard-bottom-note"><span>NASA C-MAPSS FD001</span><span>{metadata?.target_convention || t('RUL estimates use the dataset-defined end-of-life target.')}</span><span className="note-update">{records[0]?.created_at ? <>{t('Latest record')} <ArrowDownRight size={13} /> {formatTimestamp(records[0].created_at)}</> : t('No prediction timestamp available')}</span></div>
    </div>
  );
}
