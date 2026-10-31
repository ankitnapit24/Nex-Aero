import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import api, { getApiErrorMessage } from '../services/api';
import { Disclaimer, formatEngine, formatRul, PageHeading, Panel, PanelHeading, RiskBadge, StateBlock } from '../components/UI/Shared';
import { usePreferences } from '../i18n/Preferences';

function assessmentReason(tier) {
  if (tier === 'CRITICAL') return 'Estimate falls within the backend’s highest illustrative tier (≤25 cycles).';
  if (tier === 'WARNING') return 'Estimate falls within the backend’s elevated illustrative tier (26–50 cycles).';
  if (tier === 'MODERATE') return 'Estimate falls within the backend’s moderate illustrative tier (51–80 cycles).';
  if (tier === 'NOMINAL') return 'Estimate is above the backend’s illustrative 80-cycle threshold.';
  return 'The backend did not return an assessment tier.';
}

function nextStep(tier) {
  if (tier === 'CRITICAL' || tier === 'WARNING') return 'Qualified engineering review';
  if (tier === 'MODERATE') return 'Review available engine data';
  if (tier === 'NOMINAL') return 'Continue demonstration monitoring';
  return 'Review data availability';
}

export default function Maintenance() {
  const { t } = usePreferences();
  const [engines, setEngines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  const loadFleet = async () => {
    setLoading(true);
    setError('');
    try {
      setEngines(await api.getEngines());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFleet(); }, []);

  const tiers = useMemo(() => ['ALL', ...new Set(engines.map((engine) => engine.urgency_tier).filter(Boolean))], [engines]);
  const rows = filter === 'ALL' ? engines : engines.filter((engine) => engine.urgency_tier === filter);

  return (
    <div className="page-stack">
      <PageHeading eyebrow="HUMAN-LED REVIEW" title="Maintenance planning" description="Organize engine assessments using experimental RUL estimates." />
      <Disclaimer />
      <Panel>
        <PanelHeading
          title="Assessment queue"
          description="Ordered by the backend’s estimated RUL. Categories use its configured demo thresholds."
          action={<label className="select-control"><span className="sr-only">{t('Filter by assessment tier')}</span><select value={filter} onChange={(event) => setFilter(event.target.value)}>{tiers.map((tier) => <option key={tier} value={tier}>{tier === 'ALL' ? t('All tiers') : t(tier)}</option>)}</select></label>}
        />
        {loading || error || rows.length === 0 ? (
          <StateBlock loading={loading} error={error} empty={!loading && !error ? 'No engines match this assessment tier.' : ''} onRetry={loadFleet} />
        ) : (
          <div className="table-scroll"><table className="data-table maintenance-table"><thead><tr><th>{t('Engine')}</th><th>{t('Estimated RUL')}</th><th>{t('Illustrative tier')}</th><th>{t('Reason for prioritization')}</th><th>{t('Suggested review')}</th><th /></tr></thead><tbody>
            {rows.map((engine) => <tr key={engine.engine_id}>
              <td><Link className="table-primary-link" to={`/engines/${engine.engine_id}`}>{formatEngine(engine.engine_id)}</Link><span className="table-subtext">Cycle {engine.last_cycle}</span></td>
              <td className="numeric rul-value">{formatRul(engine.predicted_rul)}</td>
              <td><RiskBadge tier={engine.urgency_tier} /></td>
              <td className="reason-cell">{t(assessmentReason(engine.urgency_tier))}</td>
              <td>{t(nextStep(engine.urgency_tier))}</td>
              <td><Link className="text-link" to={`/engines/${engine.engine_id}`} aria-label={`${t('Review')} ${formatEngine(engine.engine_id)}`}>{t('Review')} <ArrowRight size={14} /></Link></td>
            </tr>)}
          </tbody></table></div>
        )}
        <div className="panel-footnote">{t('Queue positions are based only on the current estimates returned by the backend. They are not approved aircraft maintenance limits.')}</div>
      </Panel>
    </div>
  );
}
