import React, { useState, useCallback, useRef, useEffect } from "react";
import { Play, AlertCircle, Loader2 } from "lucide-react";
import * as Recharts from "recharts";

// All Recharts exports available in the sandbox
const RECHARTS = Recharts as Record<string, any>;

/**
 * Evaluates JSX code using window.Babel (loaded in index.html) +
 * new Function() — no iframe, no CDN, works 100% reliably.
 */
export function evalChartCode(
  jsxCode: string,
  rows: any[],
  cols: string[]
): { Component: React.ComponentType | null; error: string } {
  rows = rows || [];
  cols = cols || [];
  try {
    const w = window as any;
    if (!w.Babel) throw new Error("Babel no está listo aún — espera 2 segundos e intenta de nuevo");

    // 1. Transpile JSX → plain JS
    const transpiled: string = w.Babel.transform(jsxCode, {
      presets: ["react"],
      filename: "chart.jsx",
    }).code;

    // 2. Build the factory function that returns the Chart component
    // We inject: React, data, columns, and every Recharts component
    // Plus the 'Recharts' object itself for code using destructuring from it
    const rechartsKeys = Object.keys(RECHARTS);
    const rechartsVals = rechartsKeys.map((k) => RECHARTS[k]);

    // Ensure window.Recharts is populated to avoid "window.Recharts is undefined" errors
    w.Recharts = RECHARTS;

    const factory = new Function(
      "React",
      "data",
      "columns",
      "Recharts",
      ...rechartsKeys,
      `"use strict";
${transpiled}
if (typeof Chart === "undefined") throw new Error("No se encontró la función Chart. Asegúrate de definir: function Chart() {...}");
return Chart;`
    );

    // 3. Expose interaction handlers to the window for the sandbox
    w.onFilterChange = (filter: any) => {
      console.log("Cross-filter triggered:", filter);
      // Dispatch custom event for the dashboard to listen
      window.dispatchEvent(new CustomEvent('atr-cross-filter', { detail: filter }));
    };

    const Component: React.ComponentType = factory(
      React,
      rows,
      cols,
      RECHARTS,
      ...rechartsVals
    );

    return { Component, error: "" };
  } catch (err: any) {
    return { Component: null, error: err.message || String(err) };
  }
}

// ─── ChartPreview Component ───────────────────────────────────────────────────
interface ChartPreviewProps {
  code: string;
  rows: any[];
  columns: string[];
  dark: boolean;
  autoRender?: boolean;
  onRendered?: () => void;
}

export default function ChartPreview({
  code,
  rows,
  columns,
  dark,
  autoRender = false,
  onRendered,
}: ChartPreviewProps) {
  const [ChartComp, setChartComp] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(false);

  const bg = dark ? "#0d1117" : "#ffffff";
  const fg = dark ? "#e2e8f0" : "#1e293b";

  const render = useCallback(() => {
    setRendering(true);
    setError("");
    // Defer by one tick so React can paint the "loading" state first
    setTimeout(() => {
      const { Component, error: err } = evalChartCode(code, rows, columns);
      setChartComp(() => Component);
      setError(err);
      setRendering(false);
      if (!err && onRendered) onRendered();
    }, 50);
  }, [code, rows, columns, onRendered]);

  // Auto-render when triggered
  useEffect(() => {
    if (autoRender) render();
  }, [autoRender]); // eslint-disable-line

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: bg, color: fg }}
    >
      {/* Toolbar */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 shrink-0 border-b ${
          dark ? "border-slate-800 bg-[#161b22]" : "border-slate-200 bg-slate-50"
        }`}
      >
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${
            dark ? "text-slate-500" : "text-slate-400"
          }`}
        >
          Preview
        </span>
        <button
          onClick={render}
          disabled={rendering}
          className="text-[10px] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-2.5 py-1 rounded font-bold flex items-center gap-1 transition"
        >
          {rendering ? (
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
          ) : (
            <Play className="w-2.5 h-2.5" />
          )}
          Renderizar
        </button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-auto p-3">
        {!ChartComp && !error && !rendering && (
          <div
            className="flex flex-col items-center justify-center h-full gap-2 opacity-30"
            style={{ color: fg }}
          >
            <Play className="w-8 h-8" />
            <span className="text-xs">Presiona Renderizar para ver la gráfica</span>
          </div>
        )}

        {rendering && (
          <div className="flex items-center justify-center h-full gap-2 text-indigo-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs">Compilando JSX…</span>
          </div>
        )}

        {error && !rendering && (
          <div
            className="flex gap-2 p-3 rounded-lg text-xs font-mono"
            style={{
              background: dark ? "#1e1228" : "#fef2f2",
              color: "#f87171",
              border: "1px solid #7f1d1d44",
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {ChartComp && !rendering && !error && (
          <React.Suspense fallback={<Loader2 className="w-5 h-5 animate-spin text-indigo-400" />}>
            <ChartComp />
          </React.Suspense>
        )}
      </div>
    </div>
  );
}
