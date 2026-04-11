import React, { useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useDataRuntime } from '../hooks/useDataRuntime';
import { MarketplaceWidget } from '../types/measure';
import LiveWidget from './LiveWidget';

interface InjectedWidgetProps {
  instanceId: string;
  widget: Partial<MarketplaceWidget> & { executionJSON?: string };
  dark: boolean;
}

export default function InjectedWidget({ instanceId, widget, dark }: InjectedWidgetProps) {
  const { dataCache, loadingStates, errors, executeQuery } = useDataRuntime();
  
  const execution = useMemo(() => {
    if (typeof widget.executionJSON === 'object' && widget.executionJSON !== null) {
      return widget.executionJSON;
    }
    try {
      const parsed = JSON.parse(widget.executionJSON || '{}');
      console.log(`[InjectedWidget] ${widget.name || 'Component'} execution recipe:`, parsed);
      return parsed;
    } catch (e) {
      console.error("[InjectedWidget] Failed to parse executionJSON", e);
      return {};
    }
  }, [widget.executionJSON]);

  const config = useMemo(() => {
    try {
      if (typeof widget.configJSON === 'object' && widget.configJSON !== null) return widget.configJSON;
      return JSON.parse(widget.configJSON || '{}');
    } catch { return {}; }
  }, [widget.configJSON]);

  const { dataSourceId, rawQuery } = execution || {};

  // Initial data fetch
  useEffect(() => {
    if (!dataSourceId || !rawQuery) {
      console.warn(`[InjectedWidget] ${widget.name || 'Auto-Widget'} - Missing execution metadata:`, {
        ds: !!dataSourceId,
        query: !!rawQuery,
        executionRaw: widget.executionJSON
      });
      return;
    }

    if (!dataCache[instanceId] && !loadingStates[instanceId]) {
      executeQuery(instanceId, {
        dataSourceId: dataSourceId,
        queryTemplate: rawQuery,
        versionId: widget.versionId
      });
    }
  }, [instanceId, dataSourceId, rawQuery, widget.versionId, executeQuery, dataCache, loadingStates, widget.name, widget.executionJSON]);

  const result = dataCache[instanceId];
  const isLoading = loadingStates[instanceId];
  const error = errors[instanceId];

  if (isLoading && !result) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-[#161b22]/5">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Recuperando Datos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-red-500/5 group">
        <AlertCircle className="w-8 h-8 text-red-500 mb-2 opacity-50 group-hover:opacity-100 transition" />
        <p className="text-xs font-bold text-red-400 mb-1">Error de Ejecución</p>
        <p className="text-[9px] text-slate-500 max-w-full truncate px-2">
          {!execution.dataSourceId ? "Falta ID de Conexión" : (!execution.rawQuery ? "Falta consulta SQL" : error)}
        </p>
        <button 
          onClick={() => executeQuery(instanceId, {
            dataSourceId: execution.dataSourceId,
            queryTemplate: execution.rawQuery,
            versionId: widget.versionId
          })}
          className="mt-3 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Use the JSX code from the widget config if available, otherwise use a default layout
  // Note: widget.configJSON or widget.executionJSON should contain the "code" for LiveWidget
  const code = execution.code || config.code || `
    function Chart() {
      return (
        <div className="p-4 text-center">
          <h3 className="text-sm font-bold">${widget.name}</h3>
          <p className="text-[10px] opacity-50">Configura el visual para ver los datos.</p>
        </div>
      );
    }
  `;

  return (
    <div className={`relative w-full h-full rounded-2xl transition-all duration-300 ${widget.isJSX ? 'border-2 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.15)]' : ''}`}>
      {widget.isJSX && (
        <div className="absolute -top-2 -right-2 bg-orange-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse z-20 shadow-lg shadow-orange-500/40">
          JSX Custom
        </div>
      )}
      <LiveWidget 
        instanceId={instanceId}
        code={code}
        rows={result?.rows || []}
        columns={result?.columns || []}
        query={execution.rawQuery}
        connectionId={execution.dataSourceId}
        dark={dark}
        padding={20}
      />
    </div>
  );
}
