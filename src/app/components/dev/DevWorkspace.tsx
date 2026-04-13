import React, { useState, useEffect } from 'react';
import { 
  X, Database, LayoutDashboard, Code2, 
  BarChart3, Network, Moon, LogOut, ChevronDown, Plus,
  Play, Save
} from 'lucide-react';
import { useDev } from '../../context/DevContext';
import { useDataStore } from '../../hooks/useDataStore';
import RelationCanvas from '../RelationCanvas';
import VisualBuilder from './canvas/VisualBuilder';
import DashboardCanvas from './canvas/DashboardCanvas';
import DataExplorer from './canvas/DataExplorer';
import SyntaxHighlighter from '../SyntaxHighlighter';
import ChartPreview from '../ChartPreview';

export default function DevWorkspace() {
  const { 
    dark, theme, tabs, setTabs, activeTabId, setActiveTabId, patchTab,
    workspaceMode, setWorkspaceMode, setDark, setViewMode
  } = useDev() as any;

  const { devMeasures, saveDevMeasure } = useDataStore() as any;

  const activeTab = tabs.find((t: any) => t.id === activeTabId);

  return (
    <div className={`flex flex-col h-screen w-full ${theme.bg} text-slate-800 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-500`}>
      
      {/* OS HEADER - UNIFIED (Always Visible) */}
      <header className={`flex items-center justify-between px-6 py-2 bg-white dark:bg-[#0d1117] border-b ${theme.border} shadow-sm z-30 shrink-0`}>
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => setViewMode('landing')}>
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition-transform">
              <Database size={18} />
            </div>
            <span className="font-black text-lg tracking-tighter">DataCanvas <span className="text-indigo-600">O.S.</span></span>
          </div>
          
          <nav className="flex items-center bg-slate-100 dark:bg-black/20 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            {[
              { id: 'graphic', label: 'GRÁFICA', icon: BarChart3 },
              { id: 'code', label: 'CÓDIGO JSX', icon: Code2 },
              { id: 'relations', label: 'RELACIONES', icon: Network }
            ].map((mode) => (
              <button 
                key={mode.id}
                onClick={() => setWorkspaceMode(mode.id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black transition-all ${
                  workspaceMode === mode.id 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xl shadow-indigo-500/10' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <mode.icon size={12} />
                {mode.label}
              </button>
            ))}
          </nav>

          <button 
            onClick={() => setViewMode('landing')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Plus size={14} />
            NUEVO
          </button>
        </div>

        {/* TABS Navigation Mini */}
        <div className="hidden lg:flex items-center gap-1 flex-1 px-10 overflow-hidden">
           {tabs.map((t: any) => (
              <div 
                key={t.id}
                onClick={() => setActiveTabId(t.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all border ${
                  activeTabId === t.id 
                    ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-500' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                 <span className="text-[10px] font-bold truncate max-w-[100px]">{t.title}</span>
                 <button onClick={(e) => { e.stopPropagation(); setTabs(tabs.filter((tab: any) => tab.id !== t.id)); if (activeTabId === t.id) setActiveTabId(tabs[0]?.id || null); }} className="hover:text-red-500 opacity-40 hover:opacity-100">
                   <X size={10} />
                 </button>
              </div>
           ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 dark:bg-black/20 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-indigo-600/30">DU</div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Dev User</span>
            <ChevronDown size={12} className="opacity-30" />
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
          <button 
            onClick={() => setDark(!dark)}
            className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <Moon size={18} />
          </button>
          <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 overflow-hidden flex relative">
          {!activeTab ? (
            <DataExplorer />
          ) : workspaceMode === 'relations' ? (
              <RelationCanvas 
                nodes={[]} 
                edges={[]} 
                onNodesChange={() => {}} 
                onEdgesChange={() => {}} 
                dark={dark} 
              />
          ) : workspaceMode === 'graphic' ? (
              <VisualBuilder />
          ) : workspaceMode === 'code' ? (
              <div className="flex-1 flex flex-col bg-[#0f172a] overflow-hidden animate-in fade-in duration-500">
                  {/* Top Bar for Code Management */}
                  <div className="px-6 py-3 bg-[#111827] border-b border-white/5 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-4">
                         <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <Code2 className="w-5 h-5 text-indigo-400" />
                         </div>
                         <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-100 leading-none">Editor de Prototipos JSX</h3>
                            <p className="text-[8px] font-bold text-indigo-400/50 uppercase mt-1 tracking-tighter italic">Laboratorio DEV Autónomo</p>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                         <button 
                            onClick={() => {
                              // Triggering re-render by pulsing the code state
                              const currentCode = activeTab?.code;
                              patchTab(activeTabId, { code: currentCode + ' ' });
                              setTimeout(() => patchTab(activeTabId, { code: currentCode }), 10);
                            }}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 group border border-emerald-400/20"
                         >
                            <Play size={12} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                            Renderizar
                         </button>
                         <button 
                            onClick={() => {
                               const name = window.prompt("Nombre del nuevo componente visual (para el Banco):");
                               if (!name) return;
                               
                               const exists = devMeasures.some((m: any) => m.name.toLowerCase() === name.toLowerCase());
                               
                               if (exists) {
                                  alert(`ERROR: El nombre "${name}" ya existe en el Banco de Gráficos.\n\nPor favor, usa un nombre diferente para guardar esta nueva versión.`);
                                  return;
                               }

                               saveDevMeasure({
                                  name,
                                  code: activeTab.code,
                                  connectionId: activeTab.connectionId,
                                  query: activeTab.query,
                                  columns: activeTab.columns,
                                  rows: activeTab.rows || [],
                                  type: 'jsx'
                               });
                               alert(`¡"${name}" guardado exitosamente!\nLo encontrarás listo para usar en tu Banco de Gráficos.`);
                            }}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 group border border-indigo-400/20"
                         >
                            <Save size={12} className="group-hover:scale-110 transition-transform" />
                            Guardar
                         </button>
                         <div className="h-6 w-px bg-white/10 mx-1" />
                         <button 
                            onClick={() => navigator.clipboard.writeText(activeTab?.code || "")}
                            className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5 flex items-center gap-2"
                            title="Copiar Código"
                         >
                            <Plus size={14} className="rotate-45" />
                         </button>
                      </div>
                  </div>

                  <div className="flex-1 flex overflow-hidden">
                      {/* Left Column: The Editor */}
                      <div className="w-1/2 border-r border-white/5 overflow-hidden flex flex-col bg-[#0d1117]">
                         <SyntaxHighlighter 
                          code={activeTab?.code || "// No hay código generado aún."} 
                          onChange={(newCode: string) => patchTab(activeTabId, { code: newCode })}
                          dark={true}
                         />
                      </div>

                      {/* Right Column: High Fidelity Preview */}
                      <div className="w-1/2 flex flex-col bg-[#0c0f16] relative overflow-hidden group">
                         {/* Aesthetic background mesh */}
                         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.1),transparent_50%)] pointer-events-none" />
                         <div className="absolute top-4 left-6 flex items-center gap-2 z-10 opacity-60 group-hover:opacity-100 transition-opacity">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Live Preview Engine</span>
                         </div>
                         
                         {/* Expanded Chart Container */}
                         <div className="flex-1 p-6 lg:p-10 flex items-center justify-center relative z-10">
                            <div className="w-full h-full animate-in zoom-in-95 duration-500 bg-black/20 rounded-[32px] border border-white/5 p-8 flex items-center justify-center">
                               <ChartPreview 
                                code={activeTab?.code}
                                rows={activeTab?.rows}
                                columns={(activeTab?.columns || []).map((c: any) => typeof c === 'string' ? c : (c.COLUMN_NAME || c.name || ""))}
                                dark={true}
                                autoRender={true}
                               />
                            </div>
                         </div>
                      </div>
                  </div>
              </div>
          ) : workspaceMode === 'dashboard' ? (
              <DashboardCanvas />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10 animate-pulse">
                <Database size={100} />
                <span className="mt-4 font-black uppercase tracking-[1em]">vQuantum</span>
            </div>
          )}
      </div>
    </div>
  );
}
