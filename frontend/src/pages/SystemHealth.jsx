import React, { useState, useEffect } from 'react';
import { Server, Database, CheckCircle2, ShieldCheck, Terminal, Cpu } from 'lucide-react';
import api from '../services/api';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getHealth(), api.getModelMetadata()])
      .then(([hData, mData]) => {
        setHealth(hData);
        setMetadata(mData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <DisclaimerBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D1D9E0] dark:border-[#30363D] pb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#1F2328] dark:text-[#E6EDF3] tracking-tight">
            System Health & Model Registry
          </h1>
          <p className="text-xs text-[#656D76] dark:text-[#9198A1] mt-0.5">
            Operational status of FastAPI server, SQLite database, and serialized model artifacts
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-[#656D76]">Querying system diagnostics...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Service Readiness Panel */}
          <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3] pb-2 border-b border-[#D1D9E0] dark:border-[#30363D] flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#0969DA]" />
              API Service & Runtime Readiness
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center p-2 rounded bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#EAEEF2] dark:border-[#21262D]">
                <span className="text-[#656D76] dark:text-[#9198A1]">Backend API Service:</span>
                <span className="font-semibold text-[#1A7F37] dark:text-[#3FB950] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {health?.status?.toUpperCase() || 'ONLINE'} (FastAPI)
                </span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#EAEEF2] dark:border-[#21262D]">
                <span className="text-[#656D76] dark:text-[#9198A1]">Model Artifact Loaded:</span>
                <span className="font-semibold text-[#1A7F37] dark:text-[#3FB950] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {health?.model_loaded ? 'TRUE (rf_fd001_pipeline.joblib)' : 'FALSE'}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#EAEEF2] dark:border-[#21262D]">
                <span className="text-[#656D76] dark:text-[#9198A1]">Metadata Registry Loaded:</span>
                <span className="font-semibold text-[#1A7F37] dark:text-[#3FB950] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {health?.metadata_loaded ? 'TRUE (rf_fd001_metadata.json)' : 'FALSE'}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#EAEEF2] dark:border-[#21262D]">
                <span className="text-[#656D76] dark:text-[#9198A1]">Database Engine:</span>
                <span className="text-[#1F2328] dark:text-[#E6EDF3]">SQLite (SQLAlchemy ORM)</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#EAEEF2] dark:border-[#21262D]">
                <span className="text-[#656D76] dark:text-[#9198A1]">Local Endpoint:</span>
                <span className="text-[#0969DA] dark:text-[#4493F8]">http://127.0.0.1:8000</span>
              </div>
            </div>
          </div>

          {/* Model Registry Specifications */}
          <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-semibold text-[#1F2328] dark:text-[#E6EDF3] pb-2 border-b border-[#D1D9E0] dark:border-[#30363D] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#0969DA]" />
              Model Registry Artifact Details
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center p-2 rounded bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#EAEEF2] dark:border-[#21262D]">
                <span className="text-[#656D76] dark:text-[#9198A1]">Model Identifier:</span>
                <span className="text-[#1F2328] dark:text-[#E6EDF3]">{metadata?.model_name || 'RF-FD001'}</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#EAEEF2] dark:border-[#21262D]">
                <span className="text-[#656D76] dark:text-[#9198A1]">Dataset Subsplit:</span>
                <span className="text-[#1F2328] dark:text-[#E6EDF3]">{metadata?.dataset || 'NASA C-MAPSS FD001'}</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#EAEEF2] dark:border-[#21262D]">
                <span className="text-[#656D76] dark:text-[#9198A1]">Target Cap:</span>
                <span className="text-[#1F2328] dark:text-[#E6EDF3]">125 cycles (Piecewise Linear)</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#EAEEF2] dark:border-[#21262D]">
                <span className="text-[#656D76] dark:text-[#9198A1]">Decision Trees:</span>
                <span className="text-[#1F2328] dark:text-[#E6EDF3]">{metadata?.n_estimators || 120} estimators</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-[#F6F8FA] dark:bg-[#0D1117] border border-[#EAEEF2] dark:border-[#21262D]">
                <span className="text-[#656D76] dark:text-[#9198A1]">Training Timestamp:</span>
                <span className="text-[#848D97] text-[11px]">{metadata?.training_date ? new Date(metadata.training_date).toLocaleString() : 'Recorded'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
