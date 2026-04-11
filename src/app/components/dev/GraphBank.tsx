import React from 'react';
import { LayoutPanelTop, Plus, X, BarChart3 } from 'lucide-react';
import { useDev } from '../../context/DevContext';
import { useDataStore } from '../../hooks/useDataStore';
import MiniChartPreview from '../MiniChartPreview';

export default function GraphBank() {
  const { dark, theme, savedComponents, dashItems } = useDev();
  const { saveDevCanvas, deleteDevMeasure } = useDataStore() as any;

  const addToDashboard = (comp: any) => {
    const itemToAdd = {
      ...comp,
      instanceId: `inst-${Date.now()}`,
      x: 20 + (dashItems.length % 5) * 50,
      y: 20 + (dashItems.length % 5) * 50,
      w: 480,
      h: 360,
      executionJSON: JSON.stringify({
        dataSourceId: comp.connectionId,
        rawQuery: comp.query
      })
    };
    saveDevCanvas([...dashItems, itemToAdd]);
  };

  const deleteComp = (id: string) => {
    if (window.confirm("¿Estás seguro de eliminar este componente del Banco?")) {
      deleteDevMeasure(id);
    }
  };

  // Hide entirely on "New Projects" if empty as per user requirement v6
  if (savedComponents.length === 0 && dashItems.length === 0) {
    return null;
  }

  return (
    <div className={`w-80 border-l ${theme.border} ${theme.surface} flex flex-col overflow-hidden`}>
      <div className="px-4 py-4 flex items-center justify-between border-b ${theme.border}">
        <div className="flex items-center gap-2">
            <LayoutPanelTop className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Banco de Gráficos</span>
        </div>
        <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full border border-indigo-500/20">
            {savedComponents.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {savedComponents.length === 0 && (
          <div className="text-center py-10 opacity-20">
             <BarChart3 className="w-12 h-12 mx-auto mb-2" />
             <p className="text-[10px] uppercase font-bold tracking-widest">Sin componentes guardados</p>
          </div>
        )}

        {savedComponents.map((sc: any) => (
          <div key={sc.id} className="relative group animate-in fade-in slide-in-from-right-4 duration-500">
            <div className={`rounded-xl border ${theme.border} overflow-hidden shadow-sm hover:shadow-xl transition-all bg-black/5 dark:bg-black/40 ${sc.code?.includes("function Chart") ? 'border-orange-500/30' : 'hover:border-indigo-500/40'}`}>
                {sc.code?.includes("function Chart") && (
                   <div className="absolute top-2 left-2 z-10 bg-orange-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                      JSX
                   </div>
                )}
                <MiniChartPreview 
                  name={sc.name}
                  code={sc.code}
                  rows={sc.rows || []}
                  columns={sc.columns || []}
                  dark={dark}
                />
            </div>
            
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button 
                onClick={() => addToDashboard(sc)} 
                title="Agregar al lienzo"
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-lg shadow-lg shadow-indigo-900/40 transition-transform active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => deleteComp(sc.id)}
                title="Eliminar"
                className="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-lg shadow-lg shadow-red-900/40 transition-transform active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
