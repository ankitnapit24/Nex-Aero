import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import api, { getApiErrorMessage } from '../services/api';
import { formatEngine, formatRul, formatTimestamp, PageHeading, Panel, PanelHeading, RiskBadge, StateBlock } from '../components/UI/Shared';
import { usePreferences } from '../i18n/Preferences';
import EngineHealthDiagnosis from '../components/Dashboard/EngineHealthDiagnosis';

export default function Dashboard() {
  const { t } = usePreferences();
  const [engines, setEngines] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [engineError, setEngineError] = useState('');
  const [supportError, setSupportError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setEngineError('');
    setSupportError('');
    const [fleet, history] = await Promise.allSettled([
      api.getEngines(),
      api.getPredictions(100),
    ]);
    if (fleet.status === 'fulfilled') setEngines(fleet.value);
    else setEngineError(getApiErrorMessage(fleet.reason));
    if (history.status === 'fulfilled') setRecords(history.value);
    else setSupportError(getApiErrorMessage(history.reason));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const recentEvents = records.slice(0, 5);

  return (
    <div className="page-stack">
      <section className="dashboard-intro">
        <p className="eyebrow">{t('ENGINE HEALTH INTELLIGENCE')} <span>/</span> {t('RESEARCH PROTOTYPE')}</p>
        <h1 className="dashboard-intro-title">{t('Know your engines.')}<br /><span>{t('Before they fail.')}</span></h1>
        <p className="dashboard-intro-description">{t('Predictive intelligence for turbofan engine health, remaining useful life, and maintenance planning.')}</p>
      </section>

      <PageHeading
        eyebrow="FLEET MONITORING"
        title="Fleet overview"
        description="Review engine estimates and recent prediction activity."
        actions={(
          <>
            <Link className="button button-outline" to="/engines">{t('Explore engines')} <ArrowRight size={15} /></Link>
            <Link className="button button-dark" to="/predictions">{t('View predictions')} <ChevronRight size={15} /></Link>
          </>
        )}
      />

      {/* NEW: Comprehensive Engine Health Diagnosis Section */}
      <EngineHealthDiagnosis engines={engines} />

      {/* Fleet Monitoring & Recent Predictions Grid */}
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
                  {engines.slice(0, 5).map((engine) => (
                    <tr key={engine.engine_id} className="clickable-row">
                      <td><Link className="table-primary-link" to={`/engines/${engine.engine_id}`}>{formatEngine(engine.engine_id)}</Link></td>
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

        <Panel className="dashboard-recent-panel">
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
      </div>
    </div>
  );
}
