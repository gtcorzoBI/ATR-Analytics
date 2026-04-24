import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import { 
  Maximize2, Trash2, Settings2, 
  LayoutDashboard, Plus, Save
} from 'lucide-react';
import { useDev } from '../../../context/DevContext';
import ChartPreview from '../../ChartPreview';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardCanvas() {
  const { theme, tabs, activeTabId, patchTab } = useDev() as any;
  const activeTab = tabs.find((t: any) => t.id === activeTabId);
  
  const [layout, setLayout] = useState<any[]>(activeTab?.layout || []);
  const [widgets, setWidgets] = useState<any[]>(activeTab?.widgets || []);
  const [availableWidgets, setAvailableWidgets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const API = (import.meta as any).env.VITE_API_URL || "http://localhost:3001";
  const token = localStorage.getItem("atr_token");

  useEffect(() => {
    fetchAvailableWidgets();
  }, []);

  const fetchAvailableWidgets = async () => {
    try {
      const res = await fetch(`${API}/api/dev/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAvailableWidgets(data.widgets);
      }
    } catch (e) {
      console.error("Failed to fetch widgets", e);
    }
  };

  const addWidget = (w: any) => {
    const newWidgetId = `w-${Date.now()}`;
    const newWidgets = [...widgets, { ...w, instanceId: newWidgetId }];
    const newLayout = [...layout, { i: newWidgetId, x: 0, y: Infinity, w: 4, h: 4 }];
    
    setWidgets(newWidgets);
    setLayout(newLayout);
    patchTab(activeTabId, { widgets: newWidgets, layout: newLayout });
  };

  const removeWidget = (id: string) => {
    const newWidgets = widgets.filter(w => w.instanceId !== id);
    const newLayout = layout.filter(l => l.i !== id);
    setWidgets(newWidgets);
    setLayout(newLayout);
    patchTab(activeTabId, { widgets: newWidgets, layout: newLayout });
  };

  const onLayoutChange = (newLayout: any) => {
    setLayout(newLayout);
    patchTab(activeTabId, { layout: newLayout });
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* SIDEBAR: Widget Library */}
      <aside className={`w-72 shrink-0 h-full border-r ${theme.border} ${theme.surface} flex flex-col overflow-hidden`}>
         <div className="p-5 border-b ${theme.border} bg-black/5 flex flex-col gap-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Librería de Componentes</h4>
            <p className={`text-[10px] ${theme.muted} font-medium`}>Dashboards ensamblados por ti y el equipo.</p>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {availableWidgets.map(w => (
              <div 
                key={w.id} 
                className={`p-4 rounded-[24px] border ${theme.border} bg-white dark:bg-slate-800 hover:border-indigo-500 transition-all group`}
              >
                 <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{w.type}</span>
                    <button 
                      onClick={() => addWidget(w)}
                      className="p-1.5 rounded-lg bg-indigo-500 text-white opacity-0 group-hover:opacity-100 transition shadow-lg shadow-indigo-500/20"
                    >
                       <Plus className="w-3.5 h-3.5" />
                    </button>
                 </div>
                 <h5 className="text-[11px] font-bold mb-1">{w.name}</h5>
                 <p className={`text-[9px] ${theme.muted} line-clamp-2 leading-relaxed`}>
                   Analítico avanzado con auto-agregación y filtros cruzados.
                 </p>
              </div>
            ))}
         </div>
      </aside>

      {/* CENTER: Grid Layout Canvas */}
      <main className={`flex-1 overflow-auto p-12 bg-slate-100/30 dark:bg-[#090b10]`}>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 ring-4 ring-indigo-500/5">
                   <LayoutDashboard className="w-6 h-6" />
                </div>
                <div>
                   <h2 className="text-2xl font-black tracking-tight">Lienzo de Dashboard</h2>
                   <p className={`text-[10px] font-black uppercase tracking-widest ${theme.muted}`}>DataCanvas O.S. / Ensamblaje</p>
                </div>
             </div>
             <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-xl shadow-indigo-600/20 active:scale-95">
                <Save className="w-4 h-4" /> Guardar y Publicar
             </button>
          </div>

          <div className={`min-h-[800px] border-2 border-dashed ${theme.border} rounded-[48px] p-8`}>
             <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: layout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={100}
                draggableHandle=".drag-handle"
                onLayoutChange={onLayoutChange}
             >
                {widgets.map(w => (
                  <div key={w.instanceId} className={`bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden group flex flex-col`}>
                     <div className="h-10 shrink-0 border-b dark:border-slate-800 flex items-center justify-between px-5 bg-slate-50 dark:bg-black/20">
                        <div className="flex items-center gap-2 drag-handle cursor-move">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{w.name}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => removeWidget(w.instanceId)} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                               <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                     </div>
                     <div className="flex-1 overflow-hidden pointer-events-none p-4">
                        <ChartPreview 
                           code={w.codeJSX}
                           rows={[]} // Real dashboards will fetch fresh data
                           columns={[]}
                           dark={true}
                           autoRender={true}
                        />
                     </div>
                  </div>
                ))}
             </ResponsiveGridLayout>
          </div>
        </div>
      </main>
    </div>
  );
}
