import React, { useState, useEffect } from 'react';
import { X, Play, Columns3, Database, LayoutDashboard, Code2, Loader2, AlertCircle, RefreshCw, BarChart3, Save } from 'lucide-react';
import { useDev } from '../../context/DevContext';
import { useDataStore } from '../../hooks/useDataStore';
import SyntaxHighlighter from '../SyntaxHighlighter';
import ChartPreview from '../ChartPreview';
import { VISUAL_DEFINITIONS, getEmptyMapping } from '../VisualDefinitions';
import RelationCanvas from '../RelationCanvas';

export default function DevWorkspace() {
  const { 
    dark, tabs, setTabs, activeTabId, setActiveTabId, patchTab,
    workspaceMode, setWorkspaceMode, savedComponents
  } = useDev();
  const { saveDevMeasure } = useDataStore() as any;

  const activeTab = tabs.find(t => t.id === activeTabId);
  const theme = {
    bg: dark ? "bg-[#0d1117]" : "bg-slate-100",
    surface: dark ? "bg-[#161b22]" : "bg-white",
    border: dark ? "border-slate-800" : "border-slate-200",
    text: dark ? "text-slate-200" : "text-slate-900",
    muted: dark ? "text-slate-400" : "text-slate-500",
    input: dark ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400",
    hover: dark ? "hover:bg-slate-800/60" : "hover:bg-slate-100",
    code: dark ? "bg-[#0d1117]" : "bg-slate-50",
  };

  const API = "http://localhost:3001";

  const runQuery = async (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;
    patchTab(id, { loading: true, error: "" });
    try {
      const token = localStorage.getItem("atr_token");
      const res = await fetch(`${API}/api/dev/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ connectionId: tab.connectionId, query: tab.query })
      });
      const data = await res.json();
      if (data.rows) patchTab(id, { rows: data.rows, columns: data.columns, queryRan: true });
      else patchTab(id, { error: data.error || "Query failed" });
    } catch (e: any) { patchTab(id, { error: e.message }); }
    finally { patchTab(id, { loading: false }); }
  };

  if (!activeTab) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${theme.bg}`}>
        <div className="text-center opacity-20">
          <LayoutDashboard className="w-20 h-20 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase tracking-widest">Workspace Vacío</h2>
          <p className="text-xs mt-2">Explora tablas o abre un borrador para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${theme.bg}`}>
      {/* Tabs Header */}
      <div className={`h-10 flex items-center bg-black/5 dark:bg-black/20 border-b ${theme.border} space-x-1 px-2 shrink-0`}>
        {tabs.map(t => (
          <div 
            key={t.id} 
            onClick={() => setActiveTabId(t.id)}
            className={`h-full flex items-center px-4 gap-3 cursor-pointer border-x ${theme.border} transition-all ${activeTabId === t.id ? `${theme.surface} border-t-2 border-t-indigo-500` : `opacity-60 hover:opacity-100`}`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[120px]">{t.title}</span>
            <button onClick={(e) => { e.stopPropagation(); setTabs(tabs.filter(tab => tab.id !== t.id)); if (activeTabId === t.id) setActiveTabId(tabs[0]?.id || null); }} className="hover:text-red-500">
               <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Workspace Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
          {workspaceMode === 'relations' ? (
              <RelationCanvas />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Query & Editor Controls */}
                <div className={`h-11 ${theme.surface} border-b ${theme.border} flex items-center justify-between px-4 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${theme.muted}`}>Query SQL</span>
                            <div className="h-4 w-px bg-slate-500/20 mx-1" />
                        </div>
                        <button 
                            onClick={() => runQuery(activeTab.id)}
                            disabled={activeTab.loading}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-emerald-900/20"
                        >
                            {activeTab.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                            {activeTab.loading ? 'Ejecutando...' : 'Ejecutar SQL'}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${theme.border} ${theme.hover} transition text-[10px] font-bold uppercase tracking-wider`}>
                            <Save className="w-3.5 h-3.5" /> Guardar Borrador
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: SQL Editor & Data Grid */}
                    <div className="flex-1 flex flex-col border-r ${theme.border} overflow-hidden">
                        <div className="h-1/3 border-b ${theme.border} bg-black/10">
                            <div className="px-4 py-1 flex items-center justify-between border-b ${theme.border}">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Editor SQL</span>
                                <span className="text-[9px] font-bold text-indigo-500 opacity-50">Consulta Directa</span>
                            </div>
                            <textarea 
                                className={`w-full h-[calc(100%-24px)] p-4 font-mono text-[11px] outline-none bg-transparent resize-none ${theme.text}`}
                                value={activeTab.query}
                                onChange={e => patchTab(activeTab.id, { query: e.target.value })}
                                placeholder="SELECT * FROM ..."
                            />
                        </div>
                        
                        {/* JSX / HTML Hybrid Editor */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                             <div className="px-4 py-1 flex items-center justify-between border-b ${theme.border} bg-black/20">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Editor de Componente</span>
                                    {activeTab.code.includes("function Chart") ? (
                                        <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">JSX Dynamic</span>
                                    ) : (
                                        <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">HTML Static</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-bold text-orange-500 opacity-60 flex items-center gap-1">
                                        <Code2 className="w-3 h-3" /> // @export: Nombre
                                    </span>
                                </div>
                            </div>
                            <textarea 
                                className={`flex-1 w-full p-4 font-mono text-[11px] outline-none bg-transparent resize-none ${theme.text} ${theme.code}`}
                                value={activeTab.code}
                                onChange={e => patchTab(activeTab.id, { code: e.target.value })}
                                placeholder="// @export: KPI Total\nfunction Chart() { ... }"
                            />
                        </div>

                        {/* Data Results Grid (Optional Toggle) */}
                        <div className="h-40 overflow-auto bg-black/40 border-t ${theme.border}">
                             {!activeTab.queryRan ? (
                                 <div className="h-full flex flex-col items-center justify-center opacity-10">
                                     <Database className="w-8 h-8 mb-1" />
                                     <span className="text-[8px] font-black uppercase tracking-widest">Esperando Datos</span>
                                 </div>
                             ) : (
                                 <table className="w-full text-[10px] text-left border-collapse">
                                     <thead className={`sticky top-0 ${theme.surface} border-b ${theme.border} z-10`}>
                                         <tr>
                                             {activeTab.columns.map(c => (
                                                 <th key={c} className={`px-3 py-1.5 border-r ${theme.border} font-bold text-indigo-400/70 uppercase tracking-tighter`}>{c}</th>
                                             ))}
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {activeTab.rows.slice(0, 50).map((row, i) => (
                                             <tr key={i} className={`border-b ${theme.border} hover:bg-white/5`}>
                                                 {activeTab.columns.map(c => (
                                                     <td key={c} className={`px-3 py-1 border-r ${theme.border} whitespace-nowrap opacity-60 font-mono`}>{String(row[c])}</td>
                                                 ))}
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             )}
                        </div>
                    </div>

                    {/* Right: JSX Preview */}
                     <div className="w-[40%] flex flex-col overflow-hidden bg-black/5">
                         <div className="px-4 py-2 border-b ${theme.border} flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Vista Previa Real-Time</span>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-bold text-emerald-500 uppercase">Live</span>
                            </div>
                         </div>
                         <div className="flex-1 p-6 flex items-center justify-center overflow-auto">
                            <div className="w-full max-w-sm aspect-square bg-slate-900 rounded-3xl p-6 shadow-2xl relative">
                                <ChartPreview 
                                    code={activeTab.code}
                                    rows={activeTab.rows}
                                    columns={activeTab.columns}
                                    dark={true}
                                    autoRender={activeTab.queryRan}
                                />
                            </div>
                         </div>
                     </div>
                </div>
            </div>
          )}
      </div>
    </div>
  );
}
