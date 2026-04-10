import React from "react";
import { Loader2, Database, AlertCircle } from "lucide-react";
import { evalChartCode } from "./ChartPreview";
import { useDataRuntime } from "../hooks/useDataRuntime";
import PuzzleLoader from "./PuzzleLoader";

interface LiveWidgetProps {
  instanceId?: string; // NEW: Unique ID for data caching
  code: string;
  rows: any[];
  columns: string[];
  query?: string;     // NEW: Direct SQL query for auto-fetch
  connectionId?: string; // NEW: Source ID for credentials
  dark?: boolean;
  padding?: number;
}

export default React.memo(function LiveWidget({ 
  instanceId, 
  code, 
  rows: propRows, 
  columns: propColumns, 
  query, 
  connectionId, 
  dark, 
  padding = 8 
}: LiveWidgetProps) {
  const { dataCache, loadingStates, errors, executeQuery } = useDataRuntime();
  const [filterTick, setFilterTick] = React.useState(0);
  React.useEffect(() => {
    const handleFilter = () => setFilterTick(t => t + 1);
    window.addEventListener('dashboard-filter', handleFilter);
    return () => window.removeEventListener('dashboard-filter', handleFilter);
  }, []);

  // 1. Auto-Fetch logic: if propRows is empty but we have query/connection, use runtime cache
  const effectiveId = instanceId || `widget-${Math.random().toString(36).substr(2, 9)}`;
  
  React.useEffect(() => {
    // If we have rows passed from props, don't fetch (legacy support)
    if (propRows && propRows.length > 0) return;
    
    // If we have query/conn AND nothing in cache, go fetch
    if (query && connectionId && !dataCache[effectiveId] && !loadingStates[effectiveId]) {
      executeQuery(effectiveId, {
        dataSourceId: connectionId,
        queryTemplate: query
      });
    }
  }, [effectiveId, query, connectionId, propRows, dataCache, loadingStates, executeQuery]);

  const rows = dataCache[effectiveId]?.rows || propRows || [];
  const columns = dataCache[effectiveId]?.columns || propColumns || [];
  const isLoading = loadingStates[effectiveId];
  const runtimeError = errors[effectiveId];

  const filteredRows = React.useMemo(() => {
    const filters = (window as any).__dashboardFilters || {};
    let result = rows || [];
    for (const [field, allowed] of Object.entries(filters)) {
      if (!allowed) continue;
      // Date range filter
      if (typeof allowed === 'object' && !Array.isArray(allowed) && (allowed as any).__dateRange) {
        const { from, to } = allowed as any;
        result = result.filter(r => {
          const val = r[field];
          if (!val) return false;
          const d = new Date(val);
          if (isNaN(d.getTime())) return false;
          if (from && d < new Date(from)) return false;
          if (to) {
            const toEnd = new Date(to);
            toEnd.setDate(toEnd.getDate() + 1); // inclusive end
            if (d >= toEnd) return false;
          }
          return true;
        });
      } else if (Array.isArray(allowed) && allowed.length > 0) {
        // Standard multi-value filter
        // IMPORTANT: Only filter if row has this field, otherwise ignore this filter for this widget
        result = result.filter(r => {
          if (!(field in r)) return true; // Keep row if field doesn't exist in this table
          return (allowed as string[]).includes(String(r[field]));
        });
      }
    }
    return result;
  }, [rows, filterTick]);

  const { Component, error } = React.useMemo(() => {
    return evalChartCode(code, filteredRows, columns);
  }, [code, filteredRows, columns]);

  const bg = dark ? "#161b22" : "#fff";
  const fg = dark ? "#e2e8f0" : "#1e293b";

  return (
    <div style={{ background: bg, color: fg, height: "100%", width: "100%", overflow: "hidden", padding }} className="relative group">
      {(isLoading || (!rows.length && !runtimeError && (query || connectionId))) && (
        <div className="absolute inset-0 z-10 transition-all duration-500">
           <PuzzleLoader loading={isLoading} success={!isLoading && !!rows.length} />
        </div>
      )}
      {runtimeError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center bg-red-50/90 backdrop-blur-md animate-in slide-in-from-bottom duration-300">
          <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
          <p className="text-[10px] font-bold text-red-600 mb-1">Error de Datos</p>
          <p className="text-[8px] text-red-400 line-clamp-2">{runtimeError}</p>
        </div>
      )}
      {error && <div style={{ color: "#f87171", fontSize: 11, padding: 8 }}>❌ {error}</div>}
      {Component && (
        <React.Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          </div>
        }>
          <Component />
        </React.Suspense>
      )}
    </div>
  );
});
