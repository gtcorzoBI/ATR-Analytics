import React, { useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { 
  GripVertical, Trash2, LayoutDashboard, 
  Settings2, BarChart3, PieChart, LineChart as LineIcon,
  Table2, MousePointer2, Settings, Layers, Box, ChevronRight,
  Loader2, Play, Save, Info, X
} from 'lucide-react';
import { useDev } from '../../../context/DevContext';
import { VISUAL_DEFINITIONS, VisualSlotDef, VISUAL_AGGREGATIONS, AggregationType } from '../../VisualDefinitions';
import { generateJSX } from '../../../utils/jsxGenerator';
import { QueryEngine, QueryDefinition } from '../../../utils/queryEngine';
import ChartPreview from '../../ChartPreview';

const ITEM_TYPE = 'COLUMN';

// --- Sub-components ---

function DraggableColumn({ name, type }: { name: string, type: string }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { name, type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [name, type]);

  return (
    <div 
      ref={drag as any}
      className={`flex items-center gap-2 p-2.5 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-grab hover:border-indigo-500 hover:shadow-md transition-all ${isDragging ? 'opacity-40 grayscale' : ''}`}
    >
      <GripVertical className="w-3.5 h-3.5 text-slate-400" />
      <span className="text-[11px] font-bold truncate">{name}</span>
      <span className="ml-auto text-[8px] font-black uppercase tracking-tighter opacity-30 px-1">{type}</span>
    </div>
  );
}

function DropSlot({ 
  slot, 
  items, 
  onDrop, 
  onRemove,
  onUpdateAgg,
  onRename,
  theme 
}: { 
  slot: VisualSlotDef, 
  items: any[], 
  onDrop: (item: any) => void,
  onRemove: (idx: number) => void,
  onUpdateAgg: (idx: number, agg: AggregationType) => void,
  onRename: (idx: number, name: string) => void,
  theme: any
}) {
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
    <div 
      ref={drop as any}
      className={`p-4 rounded-2xl border-2 border-dashed transition-all space-y-3 ${isOver ? 'bg-indigo-500/10 border-indigo-500 border-solid' : canDrop ? 'border-indigo-500/30' : `border-slate-200 dark:border-slate-800`}`}
    >
      <div className="flex items-center justify-between">
         <h5 className={`text-[10px] font-black uppercase tracking-widest ${isOver ? 'text-indigo-500' : theme.muted}`}>{slot.label}</h5>
         <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${slot.type === 'value' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
            {slot.type}
         </span>
      </div>

      <div className="space-y-2 min-h-[40px]">
        {items.map((item, idx) => (
          <div key={idx} className="relative group">
            <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
               <div className="flex flex-col truncate pr-2">
                 <span className="text-[10px] font-bold truncate">{item.displayName || item.name}</span>
                 {item.agg !== 'none' && (
                   <span className="text-[7px] font-black uppercase opacity-60 tracking-widest">{item.agg} de {item.name}</span>
                 )}
               </div>
               <div className="flex items-center gap-1">
                 <button 
                  onClick={() => setActiveMenu(activeMenu === idx ? null : idx)}
                  className={`p-1 rounded hover:bg-indigo-500/20 transition ${activeMenu === idx ? 'bg-indigo-500/20' : ''}`}
                 >
                   <Settings className="w-3 h-3" />
                 </button>
                 <button onClick={() => onRemove(idx)} className="p-1 rounded hover:bg-red-500/20 hover:text-red-500 transition">
                    <Trash2 className="w-3 h-3" />
                 </button>
               </div>
            </div>

            {activeMenu === idx && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-2 py-1">
                   <input 
                    type="text" 
                    placeholder="Renombrar..."
                    defaultValue={item.displayName || item.name}
                    onBlur={(e) => { onRename(idx, e.target.value); setActiveMenu(null); }}
                    className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-lg p-1.5 text-[9px] font-bold outline-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-indigo-500"
                   />
                </div>
                <div className="h-px bg-slate-100 dark:bg-slate-700 mx-1" />
                <div className="max-h-40 overflow-y-auto">
                   {VISUAL_AGGREGATIONS.map(agg => (
                     <button 
                      key={agg.id}
                      onClick={() => { onUpdateAgg(idx, agg.id); setActiveMenu(null); }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-bold transition ${item.agg === agg.id ? 'bg-indigo-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700 opacity-60 hover:opacity-100'}`}
                     >
                       {agg.label}
                     </button>
                   ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && !isOver && (
          <div className="text-[9px] opacity-20 italic text-center py-2">Soltar aquí</div>
        )}
      </div>
    </div>
  );
}

// --- Main Container ---

export default function VisualBuilder() {
  const { theme, tabs, activeTabId, patchTab } = useDev() as any;
  const activeTab = tabs.find((t: any) => t.id === activeTabId);
  
  const [selectedVisual, setSelectedVisual] = useState('bar');
  const [mapping, setMapping] = useState<any>(activeTab?.mapping || {});

  const visualDef = VISUAL_DEFINITIONS[selectedVisual];

  const handleDrop = (slotId: string, item: any) => {
    const current = mapping[slotId] || [];
    const updated = { ...mapping, [slotId]: [...current, { ...item, agg: 'none', displayName: item.name }] };
    setMapping(updated);
    updateJSX(selectedVisual, updated);
  };

  const handleRemove = (slotId: string, idx: number) => {
    const current = mapping[slotId] || [];
    const filtered = current.filter((_: any, i: number) => i !== idx);
    const updated = { ...mapping, [slotId]: filtered };
    setMapping(updated);
    updateJSX(selectedVisual, updated);
  };

  const handleUpdateAgg = (slotId: string, idx: number, agg: AggregationType) => {
    const current = [...(mapping[slotId] || [])];
    current[idx] = { ...current[idx], agg };
    const updated = { ...mapping, [slotId]: current };
    setMapping(updated);
    updateJSX(selectedVisual, updated);
  };

  const handleRename = (slotId: string, idx: number, displayName: string) => {
    const current = [...(mapping[slotId] || [])];
    current[idx] = { ...current[idx], displayName };
    const updated = { ...mapping, [slotId]: current };
    setMapping(updated);
    updateJSX(selectedVisual, updated);
  };

  const updateJSX = (vId: string, m: any) => {
    const code = generateJSX(vId, m, activeTab?.columns || []);
    patchTab(activeTabId, { mapping: m, code, visualType: vId });
  };

  const handleVisualSelect = (id: string) => {
    setSelectedVisual(id);
    updateJSX(id, mapping);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean, msg: string } | null>(null);

  const API = (import.meta as any).env.VITE_API_URL || "http://localhost:3001";
  const token = localStorage.getItem("atr_token");
  const connectionId = activeTab?.connectionId;

  const handleRunQuery = async () => {
    if (!activeTab || !connectionId) return;
    
    // Build Agnostic Query Definition
    const queryDef: QueryDefinition = {
      sourceId: connectionId,
      table: activeTab.title, 
      fields: (mapping.xAxis || []).concat(mapping.yAxis || []).map((m: any) => ({
        name: m.name,
        type: m.type === 'NUM' ? 'number' : 'string'
      })),
      limit: 50000
    };

    const sql = QueryEngine.toSQL(queryDef);
    patchTab(activeTabId, { loading: true, error: "" });

    try {
      const res = await fetch(`${API}/api/dev/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ connectionId, query: sql })
      });
      const data = await res.json();
      if (data.success) {
        patchTab(activeTabId, { 
          rows: data.rows, 
          columns: data.columns, 
          query: sql,
          queryRan: true 
        });
      }
    } catch (e: any) {
      patchTab(activeTabId, { error: e.message });
    } finally {
      patchTab(activeTabId, { loading: false });
    }
  };

  const handleSaveToMarketplace = async () => {
    if (!saveName.trim()) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      // 1. Check if name exists
      const checkRes = await fetch(`${API}/api/dev/visualizations/check-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: saveName })
      });
      const checkData = await checkRes.json();
      if (checkData.exists) {
        setSaveStatus({ ok: false, msg: "Este nombre ya existe. Por favor usa uno diferente." });
        setIsSaving(false);
        return;
      }

      // 2. Save
      const saveRes = await fetch(`${API}/api/dev/visualizations/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: saveName,
          type: selectedVisual,
          query: activeTab.query,
          mapping,
          code: activeTab.code,
          datasourceId: activeTab.connectionId
        })
      });
      const saveData = await saveRes.json();
      if (saveData.success) {
        setSaveStatus({ ok: true, msg: "¡Publicado exitosamente en el Marketplace!" });
        setTimeout(() => setShowSaveModal(false), 2000);
      }
    } catch (e: any) {
      setSaveStatus({ ok: false, msg: e.message || "Error al guardar." });
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeTab) return null;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar Left: Columns */}
      <aside className={`w-72 shrink-0 h-full border-r ${theme.border} ${theme.surface} flex flex-col overflow-hidden`}>
         <div className="p-5 border-b ${theme.border} bg-black/5 flex flex-col gap-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Campos Disponibles</h4>
            <p className={`text-[10px] ${theme.muted} font-medium`}>Arrastra los campos a las zonas de configuración para modelar.</p>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {(activeTab.columns || []).map((c: string) => (
                <DraggableColumn key={c} name={c} type={typeof activeTab.rows?.[0]?.[c] === 'number' ? 'NUM' : 'TXT'} />
            ))}
         </div>
      </aside>

      {/* CENTER: Visual Canvas */}
      <main className={`flex-1 overflow-hidden flex flex-col bg-white dark:bg-[#0d1117] relative`}>
         <div className="absolute top-6 left-6 z-20 flex gap-1 p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl border border-white/10 backdrop-blur-md">
            {[
              { id: 'bar', icon: BarChart3 },
              { id: 'line', icon: LineIcon },
              { id: 'donut', icon: PieChart },
              { id: 'card', icon: Box }
            ].map(v => (
              <button 
                key={v.id}
                onClick={() => handleVisualSelect(v.id)}
                className={`p-2 rounded-lg transition-all ${selectedVisual === v.id ? 'bg-white dark:bg-slate-700 text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <v.icon className="w-4 h-4" />
              </button>
            ))}
         </div>

         <div className="flex-1 p-12 flex items-center justify-center overflow-auto">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[120px] rounded-full -mr-32 -mt-32" />
                <div className="relative z-10 w-full aspect-video flex flex-col">
                    <ChartPreview 
                        code={activeTab.code}
                        rows={activeTab.rows}
                        columns={activeTab.columns}
                        dark={true}
                        autoRender={true}
                    />
                </div>
            </div>
         </div>
         
         <div className="h-10 border-t ${theme.border} px-6 flex items-center justify-between text-[9px] font-black uppercase tracking-widest opacity-40">
            <span>DataCanvas O.S. Engine </span>
            <span className="flex items-center gap-1"><MousePointer2 className="w-3 h-3" /> Designer Mode active</span>
         </div>
      </main>

      {/* Sidebar Right: Mapper Slots */}
      <aside className={`w-80 shrink-0 h-full border-l ${theme.border} ${theme.surface} flex flex-col overflow-hidden`}>
         <div className="p-5 border-b ${theme.border} bg-black/5 flex items-center justify-between shrink-0">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Configuración Visual</h4>
            <div className={`p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500`}>
                <Settings2 className="w-4 h-4" />
            </div>
         </div>
         
         <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="space-y-4">
                {visualDef.slots.map(slot => (
                    <DropSlot 
                        key={slot.id} 
                        slot={slot} 
                        items={mapping[slot.id] || []}
                        onDrop={(item) => handleDrop(slot.id, item)}
                        onRemove={(idx) => handleRemove(slot.id, idx)}
                        onUpdateAgg={(idx, agg) => handleUpdateAgg(slot.id, idx, agg)}
                        onRename={(idx, name) => handleRename(slot.id, idx, name)}
                        theme={theme}
                    />
                ))}
            </div>

            <div className={`mt-8 p-6 rounded-[32px] bg-indigo-500 flex flex-col gap-4 text-white shadow-xl shadow-indigo-500/20`}>
                <button 
                    onClick={handleRunQuery}
                    disabled={activeTab.loading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                    {activeTab.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Ejecutar Consulta
                </button>

                <div className="flex flex-col gap-1 opacity-50">
                   <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter">
                      <span>Modo Ejecución</span>
                      <span className="text-emerald-500">{activeTab.rows?.length > 50000 ? 'SERVER' : 'CLIENT'}</span>
                   </div>
                   <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter">
                      <span>Sampling</span>
                      <span>{activeTab.rows?.length >= 50000 ? 'TOP 50,000' : 'OFF'}</span>
                   </div>
                </div>

                <div className="h-px bg-white/10 my-2" />

                <h6 className="text-xs font-black uppercase tracking-widest">Publicar Atómico</h6>
                <p className="text-[10px] font-medium leading-relaxed opacity-80">
                   Este componente será exportado con su query y JSX al marketplace.
                </p>
                <button 
                  onClick={() => setShowSaveModal(true)}
                  className="w-full py-3 bg-white text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                >
                    Publicar en Marketplace
                </button>
            </div>
         </div>
      </aside>

      {/* SAVE MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className={`w-full max-w-md ${theme.surface} ${theme.border} border rounded-[40px] p-10 shadow-2xl space-y-6`}>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Save className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold uppercase tracking-tight">Guardar Visualización</h3>
                    <p className={`text-[10px] ${theme.muted} font-black uppercase tracking-widest`}>Marketplace ATR</p>
                 </div>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Nombre Único</label>
                 <input 
                  type="text" 
                  autoFocus
                  placeholder="Ej: Análisis de Ventas Global"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  className={`w-full px-5 py-4 rounded-2xl border ${theme.border} ${theme.input} text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all`}
                 />
              </div>

              {saveStatus && (
                <div className={`p-4 rounded-xl text-[10px] font-bold ${saveStatus.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'} flex items-center gap-2`}>
                   <Info className="w-4 h-4" />
                   {saveStatus.msg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                 <button 
                  onClick={() => setShowSaveModal(false)}
                  className={`flex-1 py-4 rounded-2xl border ${theme.border} ${theme.hover} text-[10px] font-black uppercase tracking-widest transition`}
                 >
                    Cancelar
                 </button>
                 <button 
                  onClick={handleSaveToMarketplace}
                  disabled={isSaving || !saveName.trim()}
                  className="flex-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-xl shadow-indigo-600/20"
                 >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Publicación'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
