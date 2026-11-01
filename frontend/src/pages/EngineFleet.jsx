import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';
import { formatEngine, formatRul, PageHeading, Panel, PanelHeading, RiskBadge, StateBlock } from '../components/UI/Shared';
import { usePreferences } from '../i18n/Preferences';

export default function EngineFleet() {
  const { t } = usePreferences();
  const [engines, setEngines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('ALL');
  const [sortKey, setSortKey] = useState('predicted_rul');
  const [sortDirection, setSortDirection] = useState('asc');

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

  const tiers = useMemo(() => [...new Set(engines.map((engine) => engine.urgency_tier).filter(Boolean))], [engines]);
  const visibleEngines = useMemo(() => engines
    .filter((engine) => String(engine.engine_id).includes(search.trim()))
    .filter((engine) => tier === 'ALL' || engine.urgency_tier === tier)
    .slice()
    .sort((left, right) => {
      const a = left[sortKey] ?? Number.POSITIVE_INFINITY;
      const b = right[sortKey] ?? Number.POSITIVE_INFINITY;
      const result = typeof a === 'string' ? a.localeCompare(b) : Number(a) - Number(b);
      return sortDirection === 'asc' ? result : -result;
    }), [engines, search, tier, sortKey, sortDirection]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortButton = (label, key) => (
    <button className="table-sort" onClick={() => toggleSort(key)} aria-label={`${t('Sort by')} ${t(label)}`}>
      {label}{sortKey === key ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null}
    </button>
  );

  return (
    <div className="page-stack">
      <PageHeading eyebrow="NASA C-MAPSS FD001 · TEST FLEET" title="Engine monitoring" description="Browse backend estimates and open an engine’s historical telemetry." />
      <Panel>
        <PanelHeading title="Fleet records" description={loading ? t('Loading fleet…') : error ? t('Unavailable') : `${engines.length} ${t('engines · sorted by estimated RUL.')}`} />
        <div className="filter-row fleet-filters">
          <label className="search-field"><Search size={15} aria-hidden="true" /><span className="sr-only">{t('Search engine number')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Find engine by number')} /></label>
          <label className="filter-field"><span>{t('Assessment tier')}</span><select className="form-select" value={tier} onChange={(event) => setTier(event.target.value)}><option value="ALL">{t('All tiers')}</option>{tiers.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
          <span className="filter-count">{loading ? t('Loading…') : `${visibleEngines.length} ${t('shown')}`}</span>
        </div>
        {loading || error || visibleEngines.length === 0 ? <StateBlock loading={loading} error={error} empty={!loading && !error ? 'No engines match the selected filters.' : ''} onRetry={loadFleet} /> : (
          <div className="table-scroll"><table className="data-table fleet-record-table"><colgroup><col className="fleet-engine-column" /><col className="fleet-cycle-column" /><col className="fleet-rul-column" /><col className="fleet-tier-column" /><col className="fleet-action-column" /></colgroup><thead><tr><th>{sortButton('Engine', 'engine_id')}</th><th>{sortButton('Last cycle', 'last_cycle')}</th><th>{sortButton('Estimated RUL', 'predicted_rul')}</th><th>{t('Assessment tier')}</th><th aria-label={t('Details')} /></tr></thead><tbody>
            {visibleEngines.map((engine) => <tr key={engine.engine_id}>
              <td><Link className="table-primary-link" to={`/engines/${engine.engine_id}`}>{formatEngine(engine.engine_id)}</Link></td>
              <td className="numeric">{engine.last_cycle}</td>
              <td className="numeric rul-value">{formatRul(engine.predicted_rul)}</td>
              <td><RiskBadge tier={engine.urgency_tier} /></td>
              <td><Link className="fleet-inspect-link" to={`/engines/${engine.engine_id}`}><span>{t('Inspect')}</span><ArrowRight size={13} /></Link></td>
            </tr>)}
          </tbody></table></div>
        )}
        <div className="panel-footnote">{t('Risk categories are configured demonstration thresholds only.')}</div>
      </Panel>
    </div>
  );
}
