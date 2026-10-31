import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, FileText, RefreshCw } from 'lucide-react';
import api, { getApiErrorMessage } from '../services/api';
import { Disclaimer, formatEngine, formatRul, formatTimestamp, PageHeading, Panel, PanelHeading, RiskBadge, StateBlock } from '../components/UI/Shared';
import { usePreferences } from '../i18n/Preferences';

const alertStatuses = ['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'];

function suggestedReview(level) {
  return level === 'CRITICAL'
    ? 'Qualified engineering review and applicable manual review'
    : 'Review sensor evidence with qualified engineering personnel';
}

export default function Maintenance() {
  const { t } = usePreferences();
  const [alerts, setAlerts] = useState([]);
  const [counts, setCounts] = useState({ total_count: 0, open_count: 0, acknowledged_count: 0, resolved_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getAlerts();
      const nextAlerts = response.alerts || [];
      setAlerts(nextAlerts);
      setCounts({
        total_count: response.total_count || 0,
        open_count: response.open_count || 0,
        acknowledged_count: response.acknowledged_count || 0,
        resolved_count: response.resolved_count || 0,
      });
      const visibleAlerts = statusFilter === 'ALL'
        ? nextAlerts
        : nextAlerts.filter((alert) => alert.status === statusFilter);
      setSelectedId((current) => visibleAlerts.some((alert) => alert.id === current)
        ? current
        : visibleAlerts[0]?.id ?? null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const visibleAlerts = useMemo(() => statusFilter === 'ALL'
    ? alerts
    : alerts.filter((alert) => alert.status === statusFilter), [alerts, statusFilter]);
  const selectedAlert = useMemo(() => visibleAlerts.find((alert) => alert.id === selectedId) || null, [visibleAlerts, selectedId]);

  const updateAlert = async (alertId, nextStatus) => {
    setUpdatingId(alertId);
    setError('');
    try {
      await api.updateAlertStatus(alertId, nextStatus);
      await loadAlerts();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t('Could not update alert status.')));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="HUMAN-LED REVIEW"
        title="Maintenance planning"
        description="Review persistent backend alerts, track workflow status, and prepare a review-oriented work order."
        actions={<button className="button button-outline" type="button" onClick={loadAlerts} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} /> {t('Refresh alerts')}</button>}
      />
      <Disclaimer />

      <div className="metric-strip">
        <div className="metric-item"><span className="metric-label">{t('Total flagged alerts')}</span><strong>{loading ? '—' : counts.total_count}</strong><span className="metric-caption">{t('Persistent backend review queue')}</span></div>
        <div className="metric-item"><span className="metric-label">{t('Pending review')}</span><strong>{loading ? '—' : counts.open_count}</strong><span className="metric-caption">{t('Awaiting acknowledgment')}</span></div>
        <div className="metric-item"><span className="metric-label">{t('Under investigation')}</span><strong>{loading ? '—' : counts.acknowledged_count}</strong><span className="metric-caption">{t('Acknowledged alerts')}</span></div>
        <div className="metric-item"><span className="metric-label">{t('Resolved')}</span><strong>{loading ? '—' : counts.resolved_count}</strong><span className="metric-caption">{t('Marked resolved by a reviewer')}</span></div>
      </div>

      {error && <p className="inline-error" role="alert">{error}</p>}

      <div className="alert-status-tabs" role="group" aria-label={t('Filter alerts by status')}>
        {alertStatuses.map((status) => {
          const count = status === 'ALL' ? counts.total_count
            : status === 'OPEN' ? counts.open_count
              : status === 'ACKNOWLEDGED' ? counts.acknowledged_count : counts.resolved_count;
          return (
            <button
              key={status}
              type="button"
              className={`button ${statusFilter === status ? 'button-dark' : 'button-outline'}`}
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {t(status === 'ALL' ? 'All statuses' : status)} <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="maintenance-alert-layout">
        <Panel>
          <PanelHeading title="Persistent maintenance alerts" description="Alert state and status counts are returned by the backend’s SQLite workflow." />
          {loading || error || visibleAlerts.length === 0 ? (
            <StateBlock loading={loading} error={error} empty={!loading && !error ? 'No alerts match this status filter.' : ''} onRetry={loadAlerts} />
          ) : (
            <div className="table-scroll">
              <table className="data-table maintenance-alert-table">
                <thead><tr><th>{t('Alert')}</th><th>{t('Engine')}</th><th>{t('Risk')}</th><th>{t('Estimated RUL')}</th><th>{t('Status')}</th><th>{t('Actions')}</th></tr></thead>
                <tbody>
                  {visibleAlerts.map((alert) => (
                    <tr key={alert.id} className={selectedId === alert.id ? 'selected-alert-row' : ''}>
                      <td><button className="table-primary-link alert-select-button" type="button" onClick={() => setSelectedId(alert.id)}>ALT-{String(alert.id).padStart(4, '0')}</button><span className="table-subtext">{t('Cycle')} {alert.cycle}</span></td>
                      <td><Link className="table-primary-link" to={`/engines/${alert.engine_id}`}>{formatEngine(alert.engine_id)}</Link></td>
                      <td><RiskBadge tier={alert.risk_level} /></td>
                      <td className="numeric rul-value">{formatRul(alert.predicted_rul)}</td>
                      <td><span className={`alert-status alert-status-${String(alert.status).toLowerCase()}`}>{t(alert.status)}</span></td>
                      <td>
                        <div className="alert-actions">
                          {alert.status === 'OPEN' && <button className="text-button" type="button" disabled={updatingId === alert.id} onClick={() => updateAlert(alert.id, 'ACKNOWLEDGED')}>{t('Acknowledge')}</button>}
                          {alert.status !== 'RESOLVED' && <button className="text-button" type="button" disabled={updatingId === alert.id} onClick={() => updateAlert(alert.id, 'RESOLVED')}>{t('Resolve')}</button>}
                          {alert.status === 'RESOLVED' && <button className="text-button" type="button" disabled={updatingId === alert.id} onClick={() => updateAlert(alert.id, 'OPEN')}>{t('Reopen')}</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel className="work-order-panel">
          <PanelHeading title="Work order review" description="Draft for qualified personnel to review; not an approved maintenance instruction." />
          {selectedAlert ? (
            <div className="work-order-content">
              <div className="work-order-reference"><FileText size={16} /><span>{t('Work order reference')}</span><strong>WO-NEX-ALT-{String(selectedAlert.id).padStart(4, '0')}</strong></div>
              <dl className="work-order-facts">
                <div><dt>{t('Engine')}</dt><dd><Link to={`/engines/${selectedAlert.engine_id}`}>{formatEngine(selectedAlert.engine_id)}</Link></dd></div>
                <div><dt>{t('Observed cycle')}</dt><dd>{selectedAlert.cycle}</dd></div>
                <div><dt>{t('Estimated RUL')}</dt><dd>{formatRul(selectedAlert.predicted_rul)}</dd></div>
                <div><dt>{t('Risk')}</dt><dd><RiskBadge tier={selectedAlert.risk_level} /></dd></div>
                <div><dt>{t('Alert created')}</dt><dd>{formatTimestamp(selectedAlert.created_at)}</dd></div>
              </dl>
              <div className="work-order-note"><strong>{t('Trigger reason')}</strong><p>{selectedAlert.trigger_reason}</p></div>
              <div className="work-order-note"><strong>{t('Suggested review')}</strong><p>{t(suggestedReview(selectedAlert.risk_level))}</p></div>
              <Link className="button button-outline" to={`/engines/${selectedAlert.engine_id}`}>{t('Review engine telemetry')} <ArrowRight size={14} /></Link>
              <p className="chart-note">{t('Any inspection or maintenance action requires independent review against approved procedures and applicable technical manuals.')}</p>
            </div>
          ) : (
            <div className="work-order-empty"><Clock3 size={18} /><span>{t('Select an alert to view its review draft.')}</span></div>
          )}
        </Panel>
      </div>
      <div className="panel-footnote">{t('Queue status changes are stored by the backend. Risk levels are demonstration heuristics and are not approved aircraft maintenance limits.')}</div>
    </div>
  );
}
