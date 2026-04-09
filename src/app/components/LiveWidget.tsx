import React from "react";
import { Loader2 } from "lucide-react";
import { evalChartCode } from "./ChartPreview";

interface LiveWidgetProps {
  code: string;
  rows: any[];
  columns: string[];
  dark?: boolean;
  padding?: number;
}

export default React.memo(function LiveWidget({ code, rows, columns, dark, padding = 8 }: LiveWidgetProps) {
  const [filterTick, setFilterTick] = React.useState(0);
  React.useEffect(() => {
    const handleFilter = () => setFilterTick(t => t + 1);
    window.addEventListener('dashboard-filter', handleFilter);
    return () => window.removeEventListener('dashboard-filter', handleFilter);
  }, []);

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
    <div style={{ background: bg, color: fg, height: "100%", width: "100%", overflow: "hidden", padding }}>
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
