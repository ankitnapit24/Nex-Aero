import React, { useState, useEffect, useMemo } from 'react';
import { History, Search, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import api from '../services/api';
import EngineStatusBadge from '../components/EngineCards/EngineStatusBadge';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function PredictionHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getPredictions(100);
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) =>
      r.engine_id.toString().includes(searchTerm.trim()) ||
      r.urgency_tier.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  }, [records, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);

  return (
    <div className="space-y-5">
      <DisclaimerBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D1D9E0] dark:border-[#30363D] pb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#1F2328] dark:text-[#E6EDF3] tracking-tight">
            Prediction Audit History
          </h1>
          <p className="text-xs text-[#656D76] dark:text-[#9198A1] mt-0.5">
            Chronological audit trail of all machine-learning inferences persisted in the backend SQLite registry
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border border-[#D1D9E0] dark:border-[#30363D] rounded-md bg-white dark:bg-[#161B22] text-[#1F2328] dark:text-[#E6EDF3] hover:bg-[#F6F8FA]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Audit Trail
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg overflow-hidden">
        {/* Search */}
        <div className="p-3 border-b border-[#D1D9E0] dark:border-[#30363D] bg-[#F6F8FA] dark:bg-[#161B22]">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#848D97] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by Engine ID or Tier..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md pl-8 pr-2.5 py-1 text-xs text-[#1F2328] dark:text-[#E6EDF3] focus:outline-none focus:border-[#0969DA]"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs text-[#656D76]">Loading audit history...</div>
        ) : paginated.length === 0 ? (
          <div className="p-16 text-center text-xs text-[#848D97]">
            No prediction logs found matching query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F6F8FA] dark:bg-[#161B22] border-b border-[#D1D9E0] dark:border-[#30363D] text-[#656D76] dark:text-[#848D97] font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Audit ID</th>
                  <th className="py-2.5 px-3">Engine ID</th>
                  <th className="py-2.5 px-3">Cycle</th>
                  <th className="py-2.5 px-3">Urgency Classification</th>
                  <th className="py-2.5 px-3 text-right">Predicted RUL</th>
                  <th className="py-2.5 px-3 text-right">Raw (Unclamped)</th>
                  <th className="py-2.5 px-3">Model Version</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1D9E0] dark:divide-[#30363D] font-mono">
                {paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F6F8FA] dark:hover:bg-[#21262D]/60 transition-colors">
                    <td className="py-2.5 px-3 text-[#848D97]">#{r.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#0969DA] dark:text-[#4493F8]">
                      ENG-{String(r.engine_id).padStart(3, '0')}
                    </td>
                    <td className="py-2.5 px-3 text-[#1F2328] dark:text-[#E6EDF3]">{r.cycle}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <EngineStatusBadge tier={r.urgency_tier} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#1F2328] dark:text-[#E6EDF3]">
                      {r.predicted_rul}c
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#848D97]">{r.raw_rul}c</td>
                    <td className="py-2.5 px-3 text-[#656D76] dark:text-[#9198A1]">{r.model_version}</td>
                    <td className="py-2.5 px-3 text-right text-[11px] text-[#848D97]">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-3 border-t border-[#D1D9E0] dark:border-[#30363D] bg-[#F6F8FA] dark:bg-[#161B22] flex items-center justify-between text-xs text-[#656D76] dark:text-[#9198A1]">
          <span>Total Recorded Inferences: <strong className="text-[#1F2328] dark:text-[#E6EDF3]">{filteredRecords.length}</strong></span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-[#D1D9E0] dark:border-[#30363D] disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px]">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-[#D1D9E0] dark:border-[#30363D] disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
