import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LoaderCircle, Play, Sparkles } from 'lucide-react';
import {
  CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ResponsiveContainer,
} from 'recharts';
import api, { getApiErrorMessage } from '../services/api';
import { Disclaimer, formatEngine, formatRul, formatTimestamp, PageHeading, Panel, PanelHeading, RiskBadge, StateBlock } from '../components/UI/Shared';
import { usePreferences } from '../i18n/Preferences';

const requiredTelemetry = [
  'cycle', 'setting_1', 'setting_2', 'setting_3', 'sensor_2', 'sensor_3', 'sensor_4',
  'sensor_6', 'sensor_7', 'sensor_8', 'sensor_9', 'sensor_11', 'sensor_12',
  'sensor_13', 'sensor_14', 'sensor_15', 'sensor_17', 'sensor_20', 'sensor_21',
];

export default function Predictions() {
  const { t } = usePreferences();
  const location = useLocation();
  const [engines, setEngines] = useState([]);
  const [engineId, setEngineId] = useState('');
  const [detail, setDetail] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [metadataError, setMetadataError] = useState('');
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explanationError, setExplanationError] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.getEngines(), api.getModelMetadata(), api.getPredictions(100)])
      .then(([fleetResult, modelResult, historyResult]) => {
        if (!active) return;
        if (fleetResult.status === 'rejected') setError(getApiErrorMessage(fleetResult.reason));
        else {
          setEngines(fleetResult.value);
          const preferred = Number(location.state?.engineId);
          const initial = fleetResult.value.some((engine) => engine.engine_id === preferred)
            ? preferred
            : fleetResult.value[0]?.engine_id;
          if (initial !== undefined) setEngineId(String(initial));
        }
        if (modelResult.status === 'fulfilled') {
          setMetadata(modelResult.value);
          setMetadataError('');
        } else {
          setMetadataError(getApiErrorMessage(modelResult.reason));
        }
        if (historyResult.status === 'fulfilled') setHistory(historyResult.value);
        else setHistoryError(getApiErrorMessage(historyResult.reason));
        setLoading(false);
      });
    return () => { active = false; };
  }, [location.state, loadVersion]);

  useEffect(() => {
    if (!engineId) {
      setDetail(null);
      return;
    }
    let active = true;
    setLoading(true);
    setDetail(null);
    setResult(null);
    setExplanation(null);
    setExplanationError('');
    api.getEngine(Number(engineId))
      .then((data) => { if (active) { setDetail(data); setError(''); } })
      .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [engineId]);

  const latest = detail?.telemetry_history?.at(-1);
  const evaluationPoints = useMemo(() => engines
    .filter((engine) => Number.isFinite(Number(engine.true_rul)) && Number.isFinite(Number(engine.predicted_rul)))
    .map((engine) => ({ actual: Number(engine.true_rul), predicted: Number(engine.predicted_rul), engine_id: engine.engine_id })), [engines]);
  const evaluation = metadata?.nasa_test_metrics;
  const validation = metadata?.cv_validation_metrics;

  const runPrediction = async () => {
    if (!detail || !latest || !Number.isInteger(Number(engineId))) {
      setError('Select an engine with available telemetry before requesting a prediction.');
      return;
    }
    const missing = requiredTelemetry.filter((key) => !Number.isFinite(Number(latest[key])));
    if (missing.length) {
      setError(`The selected engine telemetry is missing required fields: ${missing.join(', ')}.`);
      return;
    }
    setSubmitting(true);
    setError('');
    let predictionSucceeded = false;
    try {
      const response = await api.predictRul({
        engine_id: Number(engineId),
        ...Object.fromEntries(requiredTelemetry.map((key) => [key, Number(latest[key])])),
      });
      setResult(response);
      predictionSucceeded = true;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Inference request failed.'));
    } finally {
      setSubmitting(false);
    }
    if (!predictionSucceeded) return;
    try {
      setHistory(await api.getPredictions(100));
      setHistoryError('');
    } catch (historyRequestError) {
      setHistoryError(getApiErrorMessage(historyRequestError));
    }
  };

  const explainCurrentTelemetry = async () => {
    if (!detail?.engine_id || !latest?.cycle) {
      setExplanationError(t('Select an engine with available telemetry before requesting an explanation.'));
      return;
    }
    setExplaining(true);
    setExplanationError('');
    try {
      const response = await api.getExplain(detail.engine_id, latest.cycle);
      setExplanation(response.explanation);
    } catch (requestError) {
      setExplanation(null);
      setExplanationError(getApiErrorMessage(requestError, t('Feature explanation could not be calculated.')));
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeading eyebrow="MODEL INFERENCE" title="RUL predictions" description="Review model estimates, prediction history, and evaluation results." />
      <Disclaimer />
      {loading && engines.length === 0 ? <StateBlock loading /> : error && engines.length === 0 ? <StateBlock error={error} onRetry={() => { setError(''); setLoading(true); setLoadVersion((version) => version + 1); }} /> : (
        <>
          <div className="content-grid prediction-grid">
            <Panel>
              <PanelHeading title="Request an estimate" description="Inference uses the selected engine’s latest observed dataset row." />
              <div className="prediction-form">
                <label className="field-label" htmlFor="prediction-engine">{t('Engine')}</label>
                <select id="prediction-engine" className="form-select" value={engineId} onChange={(event) => setEngineId(event.target.value)}>
                  {engines.map((engine) => <option key={engine.engine_id} value={engine.engine_id}>{formatEngine(engine.engine_id)} · {t('cycle')} {engine.last_cycle}</option>)}
                </select>
                <div className="telemetry-preview">
                  <span>{t('Telemetry source')}</span>
                  <strong>{latest ? `NASA C-MAPSS · ${t('Cycle')} ${latest.cycle}` : t('Loading selected engine…')}</strong>
                  <small>{latest ? `${requiredTelemetry.length} ${t('required model inputs from the latest observed row')}` : t('No fabricated input values are used.')}</small>
                </div>
                <button className="button button-dark prediction-submit" type="button" onClick={runPrediction} disabled={!detail || !latest || submitting}>
                  {submitting ? <LoaderCircle size={16} className="spin" /> : <Play size={15} fill="currentColor" />}
                  {submitting ? t('Running model…') : t('Run prediction')}
                </button>
                {error && <p className="field-error" role="alert">{error}</p>}
              </div>
              {detail && <div className="prediction-current"><span>{t('Existing fleet estimate')}</span><strong>{formatRul(detail.predicted_rul)}</strong><small>{t('Displayed separately from any new inference request.')}</small></div>}
            </Panel>
            <Panel className="prediction-result-panel">
              <PanelHeading title="Prediction result" description="Returned directly by the backend model." />
              {!result ? <StateBlock empty="Run a prediction to see a new model response here." /> : (
                <div className="result-content">
                  <div className="result-topline"><span>{formatEngine(result.engine_id)} · {t('Cycle')} {result.cycle}</span><RiskBadge tier={result.urgency_tier} /></div>
                  <strong className="result-rul">{formatRul(result.predicted_rul_cycles)}</strong>
                  <span className="result-label">{t('Estimated remaining useful life')}</span>
                  <div className="result-facts">
                    <span>{t('Model version')} <b>{result.model_version || '—'}</b></span>
                    <span>{t('Evaluated at')} <b>{formatTimestamp(result.evaluated_at)}</b></span>
                    <span>{t('Anomaly status')} <b>{metadata?.anomaly_detector_loaded === true ? t(result.is_anomalous ? 'Flagged' : 'Not flagged') : t('Detector unavailable')}</b></span>
                    <span>{t('Decision score')} <b>{metadata?.anomaly_detector_loaded === true && Number.isFinite(Number(result.anomaly_score)) ? Number(result.anomaly_score).toFixed(3) : '—'}</b></span>
                  </div>
                  {metadata?.anomaly_detector_loaded !== true && <p className="chart-note">{t('The Isolation Forest artifact is not loaded by the backend. No anomaly classification is inferred from its fallback response.')}</p>}
                  {Array.isArray(result.top_sensor_drifts) && result.top_sensor_drifts.length > 0 && (
                    <div className="prediction-drifts">
                      <strong>{t('Largest baseline sensor drifts')}</strong>
                      <div className="table-scroll"><table className="data-table"><thead><tr><th>{t('Sensor')}</th><th>{t('Current')}</th><th>{t('Baseline')}</th><th>{t('Delta')}</th><th>{t('Z-score')}</th></tr></thead><tbody>
                        {result.top_sensor_drifts.map((drift) => <tr key={drift.feature}><td>{drift.description || drift.feature}<span className="table-subtext">{drift.feature} · {drift.trend}</span></td><td className="numeric">{drift.current_value}</td><td className="numeric">{drift.baseline_mean}</td><td className="numeric">{drift.delta}</td><td className="numeric rul-value">{Number(drift.z_score).toFixed(2)}σ</td></tr>)}
                      </tbody></table></div>
                    </div>
                  )}
                  {result.recommendation && <div className="advisory-copy"><strong>{t('Model advisory')}</strong><p>{result.recommendation}</p><small>{t('Experimental model output only; it is not an approved maintenance instruction.')}</small></div>}
                  {result.disclaimer && <p className="chart-note">{result.disclaimer}</p>}
                </div>
              )}
            </Panel>
          </div>

          <Panel>
            <PanelHeading
              title="Prediction explanation"
              description="Inspect local TreeSHAP feature contributions for the selected engine’s latest observed telemetry."
              action={(
                <button className="button button-outline" type="button" onClick={explainCurrentTelemetry} disabled={!detail || !latest || explaining}>
                  {explaining ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}
                  {explaining ? t('Calculating explanation…') : t('Explain current prediction')}
                </button>
              )}
            />
            {explanationError ? <StateBlock error={explanationError} /> : !explanation ? (
              <StateBlock empty="Request an explanation to inspect which model features influenced the estimate." />
            ) : (
              <div className="explanation-content">
                <div className="explanation-summary">
                  <span>{t('Explanation method')} <strong>{explanation.method}</strong></span>
                  <span>{t('Baseline estimate')} <strong>{formatRul(explanation.base_expected_value)}</strong></span>
                  <span>{t('Explained estimate')} <strong>{formatRul(explanation.predicted_rul)}</strong></span>
                </div>
                <div className="explanation-list">
                  {explanation.contributions.slice(0, 5).map((contribution) => {
                    const impact = Number(contribution.shap_value);
                    return (
                      <div className="explanation-row" key={contribution.feature}>
                        <div className="explanation-feature">
                          <strong>{contribution.description || contribution.feature}</strong>
                          <small>{contribution.feature} · {t('Observed value')} {contribution.value}</small>
                        </div>
                        <span className={`explanation-impact ${impact < 0 ? 'impact-negative' : 'impact-positive'}`}>
                          {impact > 0 ? '+' : ''}{impact.toFixed(2)} {t('cycles')}
                        </span>
                        <span className="explanation-direction">{t(contribution.direction)}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="chart-note">{t('SHAP values explain model behavior for this observation; they are not causal findings or maintenance instructions.')}</p>
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeading title="Model evaluation" description="Reported dataset metrics · separate from individual inference results." />
            {!evaluation && !validation ? <StateBlock error={metadataError} empty={!metadataError ? 'Evaluation not available from the backend.' : ''} /> : (
              <div className="evaluation-layout">
                <div className="evaluation-groups">
                  {validation && <div className="evaluation-group"><span className="eyebrow">{t('5-FOLD GROUP VALIDATION')}</span><div className="benchmark-stats"><div><span>{t('Mean MAE')}</span><strong>{validation.mean_mae_cycles ?? '—'} <small>{t('cycles')}</small></strong></div><div><span>{t('Mean RMSE')}</span><strong>{validation.mean_rmse_cycles ?? '—'} <small>{t('cycles')}</small></strong></div><div><span>{t('Mean R²')}</span><strong>{validation.mean_r2 ?? '—'}</strong></div></div></div>}
                  {evaluation && <div className="evaluation-group"><span className="eyebrow">{t('NASA TEST SET')}</span><div className="benchmark-stats"><div><span>{t('Test engines')}</span><strong>{evaluation.test_engines ?? '—'}</strong></div><div><span>{t('Test MAE')}</span><strong>{evaluation.test_mae_cycles ?? '—'} <small>{t('cycles')}</small></strong></div><div><span>{t('Test RMSE')}</span><strong>{evaluation.test_rmse_cycles ?? '—'} <small>{t('cycles')}</small></strong></div></div></div>}
                </div>
                <div className="evaluation-chart">
                  <span className="field-label">{t('Test-set actual vs predicted RUL')}</span>
                  {evaluationPoints.length === 0 ? <StateBlock empty="Engine-level reference values are not available for this chart." /> : (
                    <div className="chart-wrap chart-scatter">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
                          <CartesianGrid stroke="#e8e4dc" strokeDasharray="3 5" />
                          <XAxis type="number" dataKey="actual" name={t('Actual RUL')} tickLine={false} axisLine={false} tick={{ fill: '#77746d', fontSize: 10 }} label={{ value: t('Reference RUL (cycles)'), position: 'insideBottom', offset: -2, fill: '#77746d', fontSize: 10 }} />
                          <YAxis type="number" dataKey="predicted" name={t('Predicted RUL')} tickLine={false} axisLine={false} tick={{ fill: '#77746d', fontSize: 10 }} width={45} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#fbfaf7', border: '1px solid #d4d1ca', borderRadius: 8, fontSize: 12 }} formatter={(value) => [`${Number(value).toFixed(1)} ${t('cycles')}`]} labelFormatter={(_, payload) => payload?.[0]?.payload ? formatEngine(payload[0].payload.engine_id) : ''} />
                          <Scatter data={evaluationPoints} fill="#c66f5e" fillOpacity={0.72} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <p className="chart-note">{t('Dots use per-engine values returned by the test-fleet endpoint. Aggregate metrics are reported separately.')}</p>
                </div>
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeading title="Recent inference records" description="Persisted audit records returned by the backend." />
            {historyError ? <StateBlock error={historyError} /> : history.length === 0 ? <StateBlock empty="No predictions are stored yet. Run an inference to create the first record." /> : (
              <div className="table-scroll"><table className="data-table">              <thead><tr><th>{t('Recorded at')}</th><th>{t('Engine')}</th><th>{t('Cycle')}</th><th>{t('Estimate')}</th><th>{t('Tier')}</th><th>{t('Model')}</th></tr></thead><tbody>
                {history.slice(0, 6).map((record) => <tr key={record.id}><td>{formatTimestamp(record.created_at)}</td><td>{formatEngine(record.engine_id)}</td><td className="numeric">{record.cycle}</td><td className="numeric rul-value">{formatRul(record.predicted_rul)}</td><td><RiskBadge tier={record.urgency_tier} /></td><td>{record.model_version}</td></tr>)}
              </tbody></table></div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
