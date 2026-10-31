import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
  Activity,
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import api from '../services/api';
import MetricCard from '../components/Dashboard/MetricCard';
import EngineStatusBadge from '../components/EngineCards/EngineStatusBadge';
import DisclaimerBanner from '../components/Alerts/DisclaimerBanner';

export default function Dashboard() {
  const navigate = useNavigate();
  const [engines, setEngines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [sortField, setSortField] = useState('predicted_rul'); // 'predicted_rul', 'total_cycles', 'engine_id'
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [viewMode, setViewMode] = useState('operational'); // 'operational' vs 'evaluation'

  useEffect(() => {
    fetchEngines();
  }, []);

  const fetchEngines = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEngines();
      setEngines(data);
    } catch (err) {
      setError('Unable to connect to AeroGuard AI backend on localhost:8000.');
    } finally {
      setLoading(false);
    }
  };

  // KPI Metrics computation
  const counts = useMemo(() => {
    return {
      TOTAL: engines.length,
      CRITICAL: engines.filter((e) => e.urgency_tier === 'CRITICAL').length,
      WARNING: engines.filter((e) => e.urgency_tier === 'WARNING').length,
      MODERATE: engines.filter((e) => e.urgency_tier === 'MODERATE').length,
      NOMINAL: engines.filter((e) => e.urgency_tier === 'NOMINAL').length,
    };
  }, [engines]);

  // Filtering & Sorting
  const processedEngines = useMemo(() => {
    let list = engines.filter((eng) => {
      const matchSearch = eng.engine_id.toString().includes(searchTerm.trim());
      const matchTier = selectedTier === 'ALL' || eng.urgency_tier === selectedTier;
      return matchSearch && matchTier;
    });

    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === null || valA === undefined) valA = 9999;
      if (valB === null || valB === undefined) valB = 9999;
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [engines, searchTerm, selectedTier, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedEngines.length / pageSize));
  const paginatedEngines = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedEngines.slice(start, start + pageSize);
  }, [processedEngines, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Disclaimer */}
      <DisclaimerBanner />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D1D9E0] dark:border-[#30363D] pb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#1F2328] dark:text-[#E6EDF3] tracking-tight">
            Fleet Overview
          </h1>
          <p className="text-xs text-[#656D76] dark:text-[#9198A1] mt-0.5">
            NASA C-MAPSS FD001 &bull; Turbofan Engine Degradation & RUL Triage
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#656D76] dark:text-[#9198A1]">
          <span className="font-mono bg-[#EAEEF2] dark:bg-[#21262D] px-2 py-0.5 rounded text-[11px]">
            Model: RF-FD001
          </span>
          <span className="font-mono bg-[#EAEEF2] dark:bg-[#21262D] px-2 py-0.5 rounded text-[11px]">
            Units: 100 Engines
          </span>
        </div>
      </div>

      {/* KPI Metric Summary (Clean, restrained, compact cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          title="Monitored Engines"
          value={loading ? '—' : counts.TOTAL}
          subtitle="Test fleet units"
        />
        <MetricCard
          title="Critical Assessment"
          value={loading ? '—' : counts.CRITICAL}
          subtitle="RUL ≤ 25 operating cycles"
          badge={<span className="w-2 h-2 rounded-full bg-[#CF222E]" />}
        />
        <MetricCard
          title="Elevated Attention"
          value={loading ? '—' : counts.WARNING}
          subtitle="25 < RUL ≤ 50 cycles"
          badge={<span className="w-2 h-2 rounded-full bg-[#9A6700]" />}
        />
        <MetricCard
          title="Moderate Wear"
          value={loading ? '—' : counts.MODERATE}
          subtitle="50 < RUL ≤ 80 cycles"
          badge={<span className="w-2 h-2 rounded-full bg-[#8250DF]" />}
        />
        <MetricCard
          title="Nominal Condition"
          value={loading ? '—' : counts.NOMINAL}
          subtitle="RUL > 80 cycles"
          badge={<span className="w-2 h-2 rounded-full bg-[#1A7F37]" />}
        />
      </div>

      {/* Fleet Table Card */}
      <div className="bg-white dark:bg-[#161B22] border border-[#D1D9E0] dark:border-[#30363D] rounded-lg overflow-hidden shadow-xs">
        {/* Controls Bar: Search, Category Filters, Mode Switcher */}
        <div className="p-3 border-b border-[#D1D9E0] dark:border-[#30363D] bg-[#F6F8FA] dark:bg-[#161B22] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#848D97] dark:text-[#7D8590] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by Engine ID (e.g. 34)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white dark:bg-[#0D1117] border border-[#D1D9E0] dark:border-[#30363D] rounded-md pl-8 pr-2.5 py-1.5 text-xs text-[#1F2328] dark:text-[#E6EDF3] placeholder-[#848D97] dark:placeholder-[#7D8590] focus:outline-none focus:border-[#0969DA] dark:focus:border-[#4493F8]"
              />
            </div>

            {/* Filter Pills */}
            <div className="inline-flex rounded-md border border-[#D1D9E0] dark:border-[#30363D] bg-white dark:bg-[#0D1117] p-0.5">
              {['ALL', 'CRITICAL', 'WARNING', 'MODERATE', 'NOMINAL'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => {
                    setSelectedTier(tier);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors ${
                    selectedTier === tier
                      ? 'bg-[#EFF2F5] dark:bg-[#21262D] text-[#1F2328] dark:text-[#E6EDF3] font-semibold'
                      : 'text-[#656D76] dark:text-[#9198A1] hover:text-[#1F2328] dark:hover:text-[#E6EDF3]'
                  }`}
                >
                  {tier} {tier !== 'ALL' && `(${counts[tier] || 0})`}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode Toggle: Operational vs Benchmark Evaluation */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-[11px] text-[#656D76] dark:text-[#9198A1]">View:</span>
            <div className="inline-flex rounded-md border border-[#D1D9E0] dark:border-[#30363D] bg-white dark:bg-[#0D1117] p-0.5">
              <button
                onClick={() => setViewMode('operational')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors ${
                  viewMode === 'operational'
                    ? 'bg-[#EFF2F5] dark:bg-[#21262D] text-[#1F2328] dark:text-[#E6EDF3] font-semibold'
                    : 'text-[#656D76] dark:text-[#9198A1]'
                }`}
              >
                Operational Triage
              </button>
              <button
                onClick={() => setViewMode('evaluation')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors ${
                  viewMode === 'evaluation'
                    ? 'bg-[#EFF2F5] dark:bg-[#21262D] text-[#1F2328] dark:text-[#E6EDF3] font-semibold'
                    : 'text-[#656D76] dark:text-[#9198A1]'
                }`}
                title="Shows official NASA benchmark ground-truth for offline evaluation"
              >
                Benchmark Evaluation
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="p-16 text-center text-xs text-[#656D76] dark:text-[#9198A1]">
            Loading fleet units and executing model inference...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-[#CF222E] dark:text-[#FF8182]">
            <p>{error}</p>
            <button
              onClick={fetchEngines}
              className="mt-2 px-3 py-1 bg-white dark:bg-[#21262D] border border-[#D1D9E0] dark:border-[#30363D] rounded text-xs text-[#1F2328] dark:text-[#E6EDF3]"
            >
              Retry
            </button>
          </div>
        ) : paginatedEngines.length === 0 ? (
          <div className="p-16 text-center text-xs text-[#656D76] dark:text-[#9198A1]">
            No engines matching search or filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F6F8FA] dark:bg-[#161B22] border-b border-[#D1D9E0] dark:border-[#30363D] text-[#656D76] dark:text-[#848D97] font-semibold text-[11px]">
                  <th
                    className="py-2.5 px-3.5 cursor-pointer hover:text-[#1F2328] dark:hover:text-[#E6EDF3]"
                    onClick={() => handleSort('engine_id')}
                  >
                    <div className="flex items-center gap-1">
                      Engine ID
                      <ArrowUpDown className="w-3 h-3 text-[#848D97]" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3.5 cursor-pointer hover:text-[#1F2328] dark:hover:text-[#E6EDF3]"
                    onClick={() => handleSort('total_cycles')}
                  >
                    <div className="flex items-center gap-1">
                      Observed Cycles
                      <ArrowUpDown className="w-3 h-3 text-[#848D97]" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3.5">Risk Assessment</th>
                  <th
                    className="py-2.5 px-3.5 text-right cursor-pointer hover:text-[#1F2328] dark:hover:text-[#E6EDF3]"
                    onClick={() => handleSort('predicted_rul')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Estimated RUL
                      <ArrowUpDown className="w-3 h-3 text-[#848D97]" />
                    </div>
                  </th>
                  {viewMode === 'evaluation' && (
                    <>
                      <th className="py-2.5 px-3.5 text-right">
                        NASA Ground Truth
                        <span className="block text-[9px] font-normal text-[#848D97]">
                          (RUL_FD001 benchmark)
                        </span>
                      </th>
                      <th className="py-2.5 px-3.5 text-right">Error (Δ cycles)</th>
                    </>
                  )}
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1D9E0] dark:divide-[#30363D]">
                {paginatedEngines.map((eng) => {
                  const errorDelta =
                    eng.true_rul !== null && eng.predicted_rul !== null
                      ? (eng.predicted_rul - eng.true_rul).toFixed(1)
                      : null;

                  return (
                    <tr
                      key={eng.engine_id}
                      className="hover:bg-[#F6F8FA] dark:hover:bg-[#21262D]/60 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/engines/${eng.engine_id}`)}
                    >
                      <td className="py-2.5 px-3.5 font-mono font-semibold text-[#0969DA] dark:text-[#4493F8]">
                        ENG-{String(eng.engine_id).padStart(3, '0')}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono tabular-nums text-[#656D76] dark:text-[#9198A1]">
                        {eng.total_cycles} cycles
                      </td>
                      <td className="py-2.5 px-3.5">
                        <EngineStatusBadge tier={eng.urgency_tier} />
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-semibold text-[#1F2328] dark:text-[#E6EDF3]">
                        {eng.predicted_rul}{' '}
                        <span className="text-[10px] font-normal text-[#848D97]">cycles</span>
                      </td>
                      {viewMode === 'evaluation' && (
                        <>
                          <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[#656D76] dark:text-[#9198A1]">
                            {eng.true_rul !== null ? `${eng.true_rul} cycles` : '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono tabular-nums">
                            {errorDelta !== null ? (
                              <span
                                className={`text-[11px] font-medium ${
                                  Math.abs(parseFloat(errorDelta)) <= 15
                                    ? 'text-[#1A7F37] dark:text-[#3FB950]'
                                    : 'text-[#9A6700] dark:text-[#D4A72C]'
                                }`}
                              >
                                {parseFloat(errorDelta) > 0 ? `+${errorDelta}` : errorDelta}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </>
                      )}
                      <td className="py-2.5 px-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/engines/${eng.engine_id}`);
                          }}
                          className="px-2.5 py-1 rounded border border-[#D1D9E0] dark:border-[#30363D] bg-white dark:bg-[#161B22] hover:bg-[#F6F8FA] dark:hover:bg-[#21262D] text-[#1F2328] dark:text-[#E6EDF3] text-[11px] font-medium transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3 border-t border-[#D1D9E0] dark:border-[#30363D] bg-[#F6F8FA] dark:bg-[#161B22] flex items-center justify-between text-xs text-[#656D76] dark:text-[#9198A1]">
          <span>
            Showing{' '}
            <strong className="text-[#1F2328] dark:text-[#E6EDF3]">
              {processedEngines.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong className="text-[#1F2328] dark:text-[#E6EDF3]">
              {Math.min(currentPage * pageSize, processedEngines.length)}
            </strong>{' '}
            of{' '}
            <strong className="text-[#1F2328] dark:text-[#E6EDF3]">
              {processedEngines.length}
            </strong>{' '}
            engines
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-[#D1D9E0] dark:border-[#30363D] disabled:opacity-40 hover:bg-[#EAEEF2] dark:hover:bg-[#21262D]"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-[#D1D9E0] dark:border-[#30363D] disabled:opacity-40 hover:bg-[#EAEEF2] dark:hover:bg-[#21262D]"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
