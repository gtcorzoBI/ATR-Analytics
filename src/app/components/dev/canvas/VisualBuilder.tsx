import React, { useState, useEffect, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { 
  Database, Table, LayoutGrid, BarChart3, LineChart, PieChart, 
  ScatterChart, Filter, CreditCard, Gauge, Network, Search, 
  ChevronRight, ChevronDown, Play, Save, Settings, User, 
  Moon, LogOut, Code2, Share2, Layers, Columns, MousePointer2,
  GripVertical, Trash2, LayoutDashboard, Info, X, Zap, Globe2, 
  MoreHorizontal, Settings2, Loader2, TrendingUp, Grid, List, 
  Box, FileText, LayoutPanelTop, MousePointer, Terminal, Sparkles
} from 'lucide-react';
import { useDev } from '../../../context/DevContext';
import { useDataStore } from '../../../hooks/useDataStore';
import { VISUAL_DEFINITIONS, VisualSlotDef, VISUAL_AGGREGATIONS, AggregationType } from '../../VisualDefinitions';
import { generateJSX } from '../../../utils/jsxGenerator';
import ChartPreview from '../../ChartPreview';

const ITEM_TYPE = 'COLUMN';

function DraggableColumn({ name, type }: { name: string, type: string }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { name, type: type === 'NUM' ? 'NUM' : 'STR' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [name, type]);

  return (
    <div 
      ref={drag as any}
      className={`group flex items-center justify-between p-2.5 border border-slate-50 dark:border-slate-800 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-200 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all bg-slate-50/50 dark:bg-black/5 ${isDragging ? 'opacity-40 grayscale' : ''}`}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <div className={`w-1.5 h-1.5 rounded-full ${type === 'NUM' ? 'bg-indigo-400' : 'bg-emerald-400'}`}></div>
        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">{name}</span>
      </div>
      <span className="text-[8px] text-slate-300 group-hover:text-indigo-300 font-black uppercase tracking-tighter">{type}</span>
    </div>
  );
}

function DropSlot({ slot, items, onDrop, onRemove, onUpdateAgg, onRename, theme }: any) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (item) => onDrop(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [onDrop]);

  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  return (
    <div key={slot.id} className="flex flex-col gap-1.5">
      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
        {slot.label}
        {items.length > 0 && <span className="text-[8px] px-1 bg-indigo-500/10 text-indigo-500 rounded">{items.length}</span>}
      </label>
      <div 
        ref={drop as any}
        className={`min-h-[56px] border-2 border-dashed rounded-2xl transition-all flex flex-col gap-2 p-2 relative
          ${isOver ? 'bg-indigo-500/10 border-indigo-500 border-solid' : canDrop ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-black/5'}
        `}
      >
        {items.map((item: any, idx: number) => (
          <div key={idx} className="relative group">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm animate-in zoom-in-95 duration-200">
               <div className="flex flex-col gap-0.5 overflow-hidden">
                 <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">{item.displayName || item.name}</span>
                 {item.agg !== 'none' && (
                   <span className="text-[7px] font-black uppercase tracking-widest text-indigo-500/60">{item.agg} de {item.name}</span>
                 )}
               </div>
               <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setActiveMenu(activeMenu === idx ? null : idx)}
                    className="p-1 px-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-indigo-500 transition-all hover:scale-105"
                  >
                    <Settings2 size={10} />
                  </button>
                  <button onClick={() => onRemove(idx)} className="p-1 px-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-400 hover:text-red-500 transition-all hover:scale-105">
                    <Trash2 size={10} />
                  </button>
               </div>
            </div>

            {activeMenu === idx && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl z-50 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-1">
                   <label className="text-[8px] font-black uppercase text-slate-400">Alias del Campo</label>
                   <input 
                    type="text" 
                    placeholder="Renombrar..."
                    defaultValue={item.displayName || item.name}
                    onBlur={(e) => { onRename(idx, e.target.value); setActiveMenu(null); }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-2 text-[10px] font-bold outline-none ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-indigo-500 transition-all"
                   />
                </div>
                {slot.type === 'value' && (
                   <div className="space-y-1">
                     <label className="text-[8px] font-black uppercase text-slate-400">Agregación</label>
                     <div className="grid grid-cols-2 gap-1.5">
                        {VISUAL_AGGREGATIONS.map(agg => (
                          <button 
                           key={agg.id}
                           onClick={() => { onUpdateAgg(idx, agg.id); setActiveMenu(null); }}
                           className={`px-2 py-1.5 rounded-lg text-[8px] font-black transition-all ${item.agg === agg.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                          >
                            {agg.label}
                          </button>
                        ))}
                     </div>
                   </div>
                )}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400 italic py-2">
            <MousePointer2 size={12} className="mr-1.5 opacity-40" /> Soltar campo
          </div>
        )}
      </div>
    </div>
  );
}

const VisualIcon = ({ type, className }: { type: string, className?: string }) => {
  const icons: Record<string, any> = {
    'bar-stacked': LayoutPanelTop,
    'bar-grouped': BarChart3,
    'bar-horizontal': Layers,
    'line': LineChart,
    'combo': BarChart3,
    'donut': PieChart,
    'scatter': ScatterChart,
    'table': Table,
    'matrix': Grid,
    'slicer': Filter,
    'card': LayoutDashboard,
    'kpi': TrendingUp,
    'treemap': Box,
    'area': Layers,
    'waterfall': Box,
    'funnel': Filter
  };
  const Icon = icons[type] || Box;
  return <Icon className={className || "w-4 h-4"} />;
};

export default function VisualBuilder() {
  const { theme, tabs, activeTabId, patchTab, setWorkspaceMode } = useDev() as any;
  const { 
    tables, dataSources, fetchTables, fetchColumns, fetchPreview 
  } = useDataStore() as any;
  
  const activeTab = tabs.find((t: any) => t.id === activeTabId);
  const connectionId = activeTab?.connectionId;

  const API = (import.meta as any).env.VITE_API_URL || "http://localhost:3001";
  const token = localStorage.getItem("atr_token");

  // UI STATE
  const [selectedVisual, setSelectedVisual] = useState(activeTab?.visualType || 'bar-stacked');
  const [mapping, setMapping] = useState<any>(activeTab?.mapping || {});
  const [tableSearch, setTableSearch] = useState("");
  const [columnSearch, setColumnSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(activeTab?.title || null);
  
  const visualDef = VISUAL_DEFINITIONS[selectedVisual] || VISUAL_DEFINITIONS['bar-stacked'];

  const [sqlQuery, setSqlQuery] = useState(activeTab?.query || `SELECT * FROM "${selectedTable || 'tabla_ejemplo'}"`);

  useEffect(() => {
    if (selectedTable && !activeTab?.queryRan) {
      const newSql = `SELECT * FROM "${selectedTable}"`;
      setSqlQuery(newSql);
    }
  }, [selectedTable]);

  const handleTableSelect = async (tableName: string) => {
    if (!connectionId) return;
    setSelectedTable(tableName);
    const newSql = `SELECT TOP 50000 * FROM [${tableName}]`;
    setSqlQuery(newSql);
    patchTab(activeTabId, { loading: true, title: tableName, query: newSql });
    
    try {
      const cols = await fetchColumns(connectionId, tableName);
      const res = await fetchPreview(connectionId, tableName);
      if (res.success) {
        patchTab(activeTabId, { 
          title: tableName, 
          rows: res.rows, 
          columns: cols,
          queryRan: true,
          loading: false
        });
      }
    } catch (e) {
      patchTab(activeTabId, { loading: false, error: "Fallo al cargar tabla" });
    }
  };

  const handleRunCustomQuery = async () => {
    if (!connectionId) return;
    patchTab(activeTabId, { loading: true });
    try {
      const res = await fetch(`${API}/api/dev/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ connectionId, query: sqlQuery })
      });
      const data = await res.json();
      if (data.success) {
        patchTab(activeTabId, { 
          rows: data.rows, 
          columns: data.columns, 
          query: sqlQuery,
          queryRan: true 
        });
      }
    } catch (e: any) {
      patchTab(activeTabId, { error: e.message });
    } finally {
      patchTab(activeTabId, { loading: false });
    }
  };

  const handleDrop = (slotId: string, item: any) => {
    const current = mapping[slotId] || [];
    const updated = { ...mapping, [slotId]: [...current, { ...item, agg: 'none', displayName: item.name }] };
    setMapping(updated);
    const colNames = (activeTab?.columns || []).map((c: any) => typeof c === 'string' ? c : (c.COLUMN_NAME || c.name || ""));
    const code = generateJSX(selectedVisual, updated, colNames);
    patchTab(activeTabId, { mapping: updated, code });
  };

  const handleRemove = (slotId: string, idx: number) => {
    const current = mapping[slotId] || [];
    const filtered = current.filter((_: any, i: number) => i !== idx);
    const updated = { ...mapping, [slotId]: filtered };
    setMapping(updated);
    const colNames = (activeTab?.columns || []).map((c: any) => typeof c === 'string' ? c : (c.COLUMN_NAME || c.name || ""));
    const code = generateJSX(selectedVisual, updated, colNames);
    patchTab(activeTabId, { mapping: updated, code });
  };

  const handleUpdateAgg = (slotId: string, idx: number, agg: AggregationType) => {
    const current = [...(mapping[slotId] || [])];
    current[idx] = { ...current[idx], agg };
    const updated = { ...mapping, [slotId]: current };
    setMapping(updated);
    const colNames = (activeTab?.columns || []).map((c: any) => typeof c === 'string' ? c : (c.COLUMN_NAME || c.name || ""));
    const code = generateJSX(selectedVisual, updated, colNames);
    patchTab(activeTabId, { mapping: updated, code });
  };

  const handleRename = (slotId: string, idx: number, displayName: string) => {
    const current = [...(mapping[slotId] || [])];
    current[idx] = { ...current[idx], displayName };
    const updated = { ...mapping, [slotId]: current };
    setMapping(updated);
    const colNames = (activeTab?.columns || []).map((c: any) => typeof c === 'string' ? c : (c.COLUMN_NAME || c.name || ""));
    const code = generateJSX(selectedVisual, updated, colNames);
    patchTab(activeTabId, { mapping: updated, code });
  };

  const handleVisualSelect = (vId: string) => {
    setSelectedVisual(vId);
    const colNames = (activeTab?.columns || []).map((c: any) => typeof c === 'string' ? c : (c.COLUMN_NAME || c.name || ""));
    const code = generateJSX(vId, mapping, colNames);
    patchTab(activeTabId, { visualType: vId, code });
  };

  const filteredTree = useMemo(() => {
    if (!tables || !connectionId) return [];
    const list = (tables[connectionId] || []) as any[];
    return list.filter((t: any) => {
      const name = typeof t === 'string' ? t : (t.name || t.TABLE_NAME || "");
      return name.toLowerCase().includes(tableSearch.toLowerCase());
    });
  }, [tables, connectionId, tableSearch]);

  const filteredColumns = useMemo(() => {
    if (!activeTab?.columns) return [];
    return activeTab.columns
      .map((c: any) => {
        if (typeof c === 'string') return { name: c, type: typeof activeTab.rows?.[0]?.[c] === 'number' ? 'NUM' : 'STR' };
        const name = c.COLUMN_NAME || c.name || "";
        const type = c.DATA_TYPE === 'number' || c.DATA_TYPE === 'NUM' ? 'NUM' : 'STR';
        return { name, type };
      })
      .filter((col: any) => col.name.toLowerCase().includes(columnSearch.toLowerCase()));
  }, [activeTab?.columns, activeTab?.rows, columnSearch]);

  if (!activeTab) return null;

  return (
    <div className="flex flex-1 overflow-hidden bg-[#f1f5f9] dark:bg-[#0c0f16]">
      {/* Sidebar: SQL & Tree */}
      <aside className="w-64 bg-white dark:bg-[#0d1117] border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20">
          <div className="flex items-center justify-between mb-3 px-1">
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Terminal size={14} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Inquisidor SQL</span>
             </div>
             <button 
              onClick={handleRunCustomQuery}
              disabled={activeTab?.loading}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:scale-110 active:scale-95 transition-all disabled:opacity-30"
             >
               {activeTab?.loading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
             </button>
          </div>
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            className="w-full h-24 bg-[#0f172a] rounded-2xl p-4 text-[10px] font-mono text-indigo-300 outline-none resize-none custom-scrollbar border border-white/5"
            spellCheck={false}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="relative mb-6">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar tabla..." 
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" 
            />
          </div>

          <div className="space-y-1">
             <div className="flex items-center gap-2 px-1 mb-2">
                <Database className="w-4 h-4 text-indigo-500" />
                <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 truncate">
                  {activeTab?.title || 'CONECTADO'}
                </span>
             </div>
             {filteredTree.map((t: any) => {
                const name = typeof t === 'string' ? t : (t.name || t.TABLE_NAME);
                return (
                  <button 
                    key={name}
                    onClick={() => handleTableSelect(name)}
                    className={`flex items-center gap-2.5 text-[10px] py-1.5 px-3 rounded-lg w-full text-left transition-all ${
                      selectedTable === name ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Table size={12} />
                    <span className="truncate">{name}</span>
                  </button>
                );
             })}
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Expanded Chart Ribbon */}
        <div className="bg-white dark:bg-[#0d1117] border-b border-slate-200 dark:border-slate-800 p-3 overflow-x-auto custom-scrollbar-hide shrink-0 z-10 shadow-sm">
           <div className="flex gap-2 max-w-full">
             {Object.keys(VISUAL_DEFINITIONS).map(vId => {
               const def = VISUAL_DEFINITIONS[vId];
               const isActive = selectedVisual === vId;
               return (
                 <button
                   key={vId}
                   onClick={() => handleVisualSelect(vId)}
                   className={`flex flex-col items-center justify-center min-w-[64px] h-16 rounded-2xl transition-all border shrink-0 ${
                     isActive 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-600/20' 
                      : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-indigo-500/5 bg-transparent border-transparent'
                   }`}
                 >
                   <VisualIcon type={vId} className={`${isActive ? 'scale-110' : 'opacity-60'} w-5 h-5 mb-1.5`} />
                   <span className="text-[8px] font-black uppercase tracking-tighter text-center px-1 truncate w-full">{def.label}</span>
                 </button>
               );
             })}
           </div>
        </div>

        <div className="flex-1 p-4 gap-4 overflow-y-auto custom-scrollbar flex flex-col">
           {/* Data Preview */}
           <section className="h-[260px] bg-white dark:bg-[#0d1117] rounded-[32px] border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm overflow-hidden shrink-0">
              <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 flex items-center justify-between">
                <span className="font-black text-[9px] uppercase opacity-50 tracking-widest leading-none">VISTA PREVIA: {selectedTable}</span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase">{activeTab?.rows?.length || 0} FILAS</span>
              </div>
              <div className="flex-1 overflow-auto bg-white/50 dark:bg-black/5">
                {activeTab?.rows?.length > 0 ? (
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead className="sticky top-0 bg-white/95 dark:bg-slate-900/95 z-20 shadow-sm">
                      <tr>
                        {(activeTab?.columns || []).map((col: any) => {
                          const name = typeof col === 'string' ? col : (col.COLUMN_NAME || col.name || "");
                          return <th key={name} className="px-6 py-3 font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100 dark:border-slate-800">{name}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {activeTab?.rows?.slice(0, 50).map((row: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20">
                           {(activeTab?.columns || []).map((col: any) => {
                             const name = typeof col === 'string' ? col : (col.COLUMN_NAME || col.name || "");
                             return <td key={name} className="px-6 py-2.5 text-slate-600 dark:text-slate-400">{row[name]}</td>;
                           })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 italic space-y-2">
                     <Layers size={32} />
                     <span className="text-xs font-bold uppercase tracking-widest">Sin datos seleccionados</span>
                  </div>
                )}
              </div>
           </section>

           {/* Mapper & Preview */}
           <div className="flex gap-4 min-h-[480px]">
              <section className="flex-1 bg-white dark:bg-[#0d1117] rounded-[32px] border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid size={16} className="text-indigo-500" />
                    <span className="font-black text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-200">Mapeo de Campos</span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded tracking-tighter">{selectedVisual}</span>
                </div>
                <div className="flex-1 p-6 grid grid-cols-2 gap-5 overflow-y-auto custom-scrollbar">
                   {visualDef.slots.map(slot => (
                     <DropSlot 
                      key={slot.id} 
                      slot={slot} 
                      items={mapping[slot.id] || []} 
                      onDrop={(item: any) => handleDrop(slot.id, item)}
                      onRemove={(idx: number) => handleRemove(slot.id, idx)}
                      onUpdateAgg={(idx: number, agg: any) => handleUpdateAgg(slot.id, idx, agg)}
                      onRename={(idx: number, name: string) => handleRename(slot.id, idx, name)}
                      theme={theme}
                     />
                   ))}
                </div>
              </section>

              <section className="flex-[1.6] bg-[#0c0f16] rounded-[40px] border border-white/5 flex flex-col shadow-2xl overflow-hidden relative group min-w-0">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.1),transparent_50%)]" />
                 
                 <div className="p-5 border-b border-white/5 flex items-center justify-between relative z-10 bg-black/20 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                          <Sparkles size={16} />
                       </div>
                       <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/90">Visualización de Salida</h4>
                          <p className="text-[8px] font-black text-indigo-400/60 uppercase tracking-tighter italic">Motor de Renderizado de Alta Fidelidad</p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => setWorkspaceMode('code')}
                        className="px-4 py-2 rounded-xl bg-indigo-600 border border-indigo-500/30 text-[9px] font-black uppercase tracking-widest text-white hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                       >
                          <Terminal size={12} /> Proyecto de Código
                       </button>
                    </div>
                 </div>

                 <div className="p-4 lg:p-12 flex-1 flex items-center justify-center relative z-10">
                    <div className="w-full h-full max-w-5xl animate-in zoom-in-95 duration-700 flex items-center justify-center">
                       <ChartPreview 
                         code={activeTab?.code}
                         rows={activeTab?.rows}
                         columns={(activeTab?.columns || []).map((c: any) => typeof c === 'string' ? c : (c.COLUMN_NAME || c.name || ""))}
                         dark={true}
                         autoRender={true}
                       />
                    </div>
                 </div>
              </section>
           </div>
        </div>
      </main>

      {/* Right Sidebar: Column Browser */}
      <aside className="w-68 bg-white dark:bg-[#0d1117] border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
         <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-black/20">
            <Columns size={16} className="text-indigo-500" />
            <span className="font-black text-[10px] uppercase tracking-widest text-slate-700 dark:text-slate-200">Explorador de Columnas</span>
         </div>
         <div className="p-4 border-b border-slate-100 dark:border-slate-800">
           <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
              type="text" 
              placeholder="Filtar columnas..." 
              value={columnSearch}
              onChange={e => setColumnSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" 
             />
           </div>
         </div>
         <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar">
            {filteredColumns.map((col: any) => (
              <DraggableColumn 
                key={col.name} 
                name={col.name} 
                type={col.type} 
              />
            ))}
         </div>
      </aside>
    </div>
  );
}
