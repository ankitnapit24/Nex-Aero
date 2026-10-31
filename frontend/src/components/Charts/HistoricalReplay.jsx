import React, { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatRul, Panel, PanelHeading, RiskBadge, StateBlock } from '../UI/Shared';
import { usePreferences } from '../../i18n/Preferences';

function ReplayDot({ cx, cy, payload, detectorLoaded }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={payload.is_anomalous && detectorLoaded ? 4 : 2}
      fill={payload.is_anomalous && detectorLoaded ? '#c66f5e' : '#858a6c'}
      stroke="#fbfaf7"
      strokeWidth={1}
    />
  );
}

export default function HistoricalReplay({ data, loading, error, onLoad, detectorLoaded }) {
  const { t } = usePreferences();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const steps = data?.timeline_steps || [];
  const activeStep = steps[index];

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [data?.engine_id]);

  useEffect(() => {
    if (!playing || steps.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= steps.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 850 / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, steps.length]);

  return (
    <Panel>
      <PanelHeading
        title="Historical degradation replay"
        description="Sampled NASA C-MAPSS history with per-cycle RUL and sensor-drift estimates; not live telemetry."
        action={<button className="button button-outline" onClick={onLoad} disabled={loading}>{loading ? t('Loading replay…') : data ? t('Refresh replay') : t('Load replay')}</button>}
      />
      {loading ? <StateBlock loading /> : error ? <StateBlock error={error} onRetry={onLoad} /> : !data ? (
        <StateBlock empty="Load the simulated historical replay to inspect cycle-by-cycle model output." />
      ) : steps.length === 0 ? (
        <StateBlock empty="The backend returned no replay steps for this engine." />
      ) : (
        <>
          <div className="replay-notice">{t(data.notice || 'Simulated historical dataset replay. Never represents live flight telemetry.')}</div>
          <div className="replay-facts">
            <div><span>{t('Replay mode')}</span><strong>{String(data.mode || 'HISTORICAL').replaceAll('_', ' ')}</strong></div>
            <div><span>{t('Sampled steps')}</span><strong>{steps.length}</strong></div>
            <div><span>{t('Observed cycles')}</span><strong>{data.total_historical_cycles ?? '—'}</strong></div>
            <div><span>{t('Isolation Forest')}</span><strong>{detectorLoaded ? t('Loaded') : t('Unavailable')}</strong></div>
          </div>
          {!detectorLoaded && <p className="chart-note">{t('The anomaly detector artifact is not loaded by the backend. Anomaly flags and scores are omitted; baseline sensor-drift attribution is still available.')}</p>}
          <div className="replay-layout">
            <div className="replay-chart">
              <div className="replay-chart-heading"><span>{t('Estimated RUL across sampled history')}</span>{activeStep && <RiskBadge tier={activeStep.urgency_tier} />}</div>
              <div className="chart-wrap chart-replay">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={steps} margin={{ top: 10, right: 12, bottom: 3, left: -9 }}>
                    <CartesianGrid stroke="#e8e4dc" strokeDasharray="3 5" />
                    <XAxis dataKey="cycle" type="number" domain={['dataMin', 'dataMax']} tickLine={false} axisLine={false} tick={{ fill: '#77746d', fontSize: 10 }} label={{ value: t('Historical operating cycle'), position: 'insideBottom', offset: -2, fill: '#77746d', fontSize: 10 }} />
                    <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{ fill: '#918d85', fontSize: 10 }} width={48} />
                    <Tooltip contentStyle={{ background: '#fbfaf7', border: '1px solid #d4d1ca', borderRadius: 8, fontSize: 11 }} labelFormatter={(cycle) => `${t('Cycle')} ${cycle}`} formatter={(value, name) => [name === 'predicted_rul' ? formatRul(value) : value, name === 'predicted_rul' ? t('Estimated RUL') : name]} />
                    {activeStep && <ReferenceLine x={activeStep.cycle} stroke="#c66f5e" strokeDasharray="3 4" />}
                    <Line type="monotone" dataKey="predicted_rul" stroke="#242321" strokeWidth={2} dot={({ key, ...props }) => <ReplayDot key={key} {...props} detectorLoaded={detectorLoaded} />} activeDot={{ r: 5, fill: '#c66f5e' }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="replay-controls">
                <button className="replay-icon-button" type="button" onClick={() => setIndex(0)} aria-label={t('Restart replay')}><RotateCcw size={15} /></button>
                <button className="replay-icon-button" type="button" onClick={() => setPlaying((current) => !current)} aria-label={t(playing ? 'Pause replay' : 'Play replay')} disabled={steps.length < 2}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
                <input aria-label={t('Replay position')} type="range" min="0" max={steps.length - 1} value={index} onChange={(event) => { setPlaying(false); setIndex(Number(event.target.value)); }} />
                <span className="replay-position">{index + 1}/{steps.length} · {t('Cycle')} {activeStep?.cycle}</span>
                <label className="replay-speed"><span className="sr-only">{t('Replay speed')}</span><select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label>
              </div>
            </div>
            <aside className="replay-step">
              <h3>{t('Selected cycle')}</h3>
              {activeStep ? (
                <>
                  <div className="selected-cycle">{t('Cycle')} {activeStep.cycle}<strong>{formatRul(activeStep.predicted_rul)}</strong><span>{t('Estimated RUL')}</span></div>
                  {detectorLoaded ? (
                    <div className="anomaly-score"><span>{t('Anomaly detection')}</span><strong className={activeStep.is_anomalous ? 'anomaly-flagged' : ''}>{t(activeStep.is_anomalous ? 'Flagged' : 'Not flagged')}</strong><small>{t('Decision score:')} {Number(activeStep.anomaly_score).toFixed(3)} · {t('lower scores indicate more anomalous observations.')}</small></div>
                  ) : <div className="anomaly-score"><span>{t('Anomaly detection')}</span><strong>{t('Unavailable')}</strong><small>{t('Isolation Forest model is not loaded.')}</small></div>}
                  <h4>{t('Largest baseline sensor drifts')}</h4>
                  {activeStep.top_sensor_drifts?.length ? (
                    <div className="drift-list">{activeStep.top_sensor_drifts.slice(0, 5).map((drift) => (
                      <div className="drift-row" key={drift.feature}>
                        <span className="drift-symbol">{drift.trend === 'ELEVATED' ? '↑' : '↓'}</span>
                        <span className="drift-main"><strong>{drift.description || drift.feature}</strong><small>{drift.feature} · current {drift.current_value} · baseline {drift.baseline_mean}</small></span>
                        <span className="drift-z">{Number(drift.z_score).toFixed(2)}σ</span>
                      </div>
                    ))}</div>
                  ) : <p className="chart-note">{t('No sensor drift explanations were returned for this step.')}</p>}
                </>
              ) : null}
            </aside>
          </div>
        </>
      )}
    </Panel>
  );
}
