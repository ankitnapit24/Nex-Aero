import React from 'react';
import { AlertCircle, ArrowRight, LoaderCircle } from 'lucide-react';
import { usePreferences } from '../../i18n/Preferences';

export function PageHeading({ eyebrow, title, description, actions }) {
  const { t } = usePreferences();
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{t(eyebrow)}</p>}
        <h1>{t(title)}</h1>
        {description && <p className="page-description">{t(description)}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}

export function Panel({ className = '', children }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function PanelHeading({ title, description, action }) {
  const { t } = usePreferences();
  return (
    <div className="panel-heading">
      <div>
        <h2>{t(title)}</h2>
        {description && <p>{t(description)}</p>}
      </div>
      {action}
    </div>
  );
}

export function RiskBadge({ tier }) {
  const { t } = usePreferences();
  const key = String(tier || 'UNKNOWN').toLowerCase();
  return <span className={`risk-badge risk-${key}`}>{t(tier || 'Unknown')}</span>;
}

export function Notice({ children, tone = 'info' }) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}

export function StateBlock({ loading, error, empty, onRetry }) {
  const { t } = usePreferences();
  if (loading) {
    return (
      <div className="state-block" role="status">
        <LoaderCircle className="state-icon spin" aria-hidden="true" />
        <span>{t('Loading data…')}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="state-block state-error" role="alert">
        <AlertCircle className="state-icon" aria-hidden="true" />
        <div>
          <strong>{t('Unable to load this data')}</strong>
          <p>{error}</p>
          {onRetry && <button className="text-button" onClick={onRetry}>{t('Try again')} <ArrowRight size={14} /></button>}
        </div>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="state-block">
        <span className="state-mark" aria-hidden="true">—</span>
        <span>{t(empty)}</span>
      </div>
    );
  }
  return null;
}

export function formatEngine(engineId) {
  return `ENG-${String(engineId).padStart(3, '0')}`;
}

export function formatRul(value) {
  return value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `${Number(value).toFixed(1)} cycles`;
}

export function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export function Disclaimer() {
  const { t } = usePreferences();
  return (
    <Notice>
      {t('Nex Aero is an experimental research prototype. Estimates and assessment priorities require qualified human review; this system does not certify airworthiness or authorize maintenance.')}
    </Notice>
  );
}
