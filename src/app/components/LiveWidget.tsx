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

export default function LiveWidget({ code, rows, columns, dark, padding = 8 }: LiveWidgetProps) {
  const { Component, error } = React.useMemo(() => {
    return evalChartCode(code, rows, columns);
  }, [code, rows, columns]);

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
}
