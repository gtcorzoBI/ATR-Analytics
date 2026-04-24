import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { X, Move, BarChart3, Send, Loader2, CheckCircle2, Trash2, Box, Layers } from "lucide-react";
import { useDataStore } from "../hooks/useDataStore";
import LiveWidget from "./LiveWidget";
import { useMarketplaceStore } from "../hooks/useMarketplaceStore";
import InjectedWidget from "./InjectedWidget";
import MarketplaceDrawer from "./MarketplaceDrawer";

interface SavedComponent {
  id: string;
  name: string;
  code: string;
  rows: any[];
  columns: string[];
  query?: string;
  connectionId?: string;
}

interface DashItem extends SavedComponent {
  instanceId: string;
  x: number; y: number;
  w: number; h: number;
  isMarketplace?: boolean;
}

interface DashboardBuilderProps {
  components: SavedComponent[];
  connections: any[];
  dark: boolean;
  onClose: () => void;
}

// ─── DashboardBuilder ─────────────────────────────────────────────────────────
export default function DashboardBuilder({ components, connections, dark, onClose }: DashboardBuilderProps) {
  const { publishDashboard } = useDataStore();
  const bg = dark ? "#06090f" : "#f1f5f9";
  const surface = dark ? "#161b22" : "#fff";
  const border = dark ? "#1e293b" : "#e2e8f0";
  const text = dark ? "#f0f6fc" : "#1e293b";
  const muted = dark ? "#8b949e" : "#94a3b8";

  // ── Canvas items ────────────────────────────────────────────────────────
  const { devCanvas = [], saveDevCanvas } = useDataStore() as any;
  const items = devCanvas as DashItem[];
  const { widgets } = useMarketplaceStore();
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  // Handle Marketplace Injection
  const handleMarketplaceInject = (widget: any) => {
    const instanceId = `inst-mkt-${Date.now()}`;
    const config = widget.config || {};

    const newItem: DashItem = {
      id: widget.id,
      instanceId,
      name: widget.name,
      code: config.code || '',
      query: config.query || '',
      connectionId: config.connectionId || config.connection?.connectionId || '',
      versionId: widget.versionId,
      visualType: widget.type || 'table',
      x: 20, y: 20, w: config.w || 480, h: config.h || 360,
      isMarketplace: true,
      rows: [],
      columns: config.columns || []
    } as any;
    
    const updated = [...devCanvas, newItem];
    saveDevCanvas(updated);
    
    // Trigger Green Flash
    setFlashIds(prev => new Set(prev).add(instanceId));
    setTimeout(() => {
      setFlashIds(prev => {
        const next = new Set(prev);
        next.delete(instanceId);
        return next;
      });
    }, 3000);
  };

  const save = useCallback((updated: DashItem[]) => {
    saveDevCanvas(updated);
  }, [saveDevCanvas]);

  const addToCanvas = (comp: SavedComponent) => {
    const inst: DashItem = {
      ...comp,
      instanceId: `inst-${Date.now()}`,
      x: 20 + (items.length % 10) * 30,
      y: 20 + (items.length % 10) * 30,
      w: 480,
      h: 360,
    };
    save([...items, inst]);

    // Trigger Green Flash for standard components too
    setFlashIds(prev => new Set(prev).add(inst.instanceId));
    setTimeout(() => {
      setFlashIds(prev => {
        const next = new Set(prev);
        next.delete(inst.instanceId);
        return next;
      });
    }, 3000);
  };

  const removeItem = (iid: string) => save(items.filter(i => i.instanceId !== iid));
  
  const clearCanvas = () => {
    if (window.confirm("¿Estás seguro de que deseas limpiar todo el lienzo? Se perderán los cambios no enviados.")) {
      save([]);
    }
  };

  // ── Interaction state (Optimized) ───────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });
  const requestRef = useRef<number | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!activeId) return;
    
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    requestRef.current = requestAnimationFrame(() => {
      const dx = e.clientX - startPos.current.mx;
      const dy = e.clientY - startPos.current.my;

      const updated = items.map(it => {
        if (it.instanceId !== activeId) return it;
        if (isResizing) {
          return { ...it, w: Math.max(150, startPos.current.w + dx), h: Math.max(100, startPos.current.h + dy) };
        } else {
          return { ...it, x: Math.max(0, startPos.current.x + dx), y: Math.max(0, startPos.current.y + dy) };
        }
      });
      save(updated);
    });
  }, [activeId, isResizing, items, save]);

  const onMouseUp = useCallback(() => {
    if (activeId) {
      const activeItem = items.find(it => it.instanceId === activeId);
      setActiveId(null);
      setIsResizing(false);

      if (activeItem) {
        if (activeItem.isMarketplace) {
          // Sync back to marketplace store
          useMarketplaceStore.getState().updateInstanceProps(activeId, {
            position: { x: activeItem.x, y: activeItem.y, w: activeItem.w, h: activeItem.h }
          });
        } else {
          // Sync to standard devCanvas
          const legacyItems = items.filter(it => !it.isMarketplace);
          saveDevCanvas(legacyItems);
        }
      }
    }
  }, [activeId, items, saveDevCanvas]);

  useEffect(() => {
    if (activeId) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [activeId, onMouseMove, onMouseUp]);

  // ── Publish flow ────────────────────────────────────────────────────────
  const [showPublish, setShowPublish] = useState(false);
  const [dashName, setDashName] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  // Auto-close after successful publish
  useEffect(() => {
    if (published) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [published, onClose]);

  const handlePublish = async () => {
    if (!dashName) return;
    setPublishing(true);
    
    try {
      const dashboard = {
        name: dashName,
        components: items.map(it => {
          const original = components.find(c => c.id === it.id);
          const connDetails = connections.find(c => c.id === original?.connectionId);
          
          return { 
            name: it.name, 
            code: original?.code || it.code, 
            query: original?.query || "",
            connectionId: original?.connectionId || "",
            connection: connDetails ? {
              connectionId: connDetails.id,
              name: connDetails.name,
              host: connDetails.host,
              databaseName: connDetails.database,
              username: connDetails.username,
              password: connDetails.password
            } : null,
            rows: [], 
            columns: it.columns || [], 
            x: it.x, y: it.y, w: it.w, h: it.h 
          };
        }),
        publishedAt: new Date().toISOString(),
        publishedBy: "Desarrollador", 
      };

      publishDashboard(dashboard);
      setPublished(true);
    } catch (e) {
      console.error("Publish error:", e);
      alert("Error al publicar. Revisa la consola.");
    } finally {
      setPublishing(false);
    }
  };

  // ── Background Grid ─────────────────────────────────────────────────────
  const gridBackground = useMemo(() => (
    <div
      className="absolute inset-0 pointer-events-none opacity-20"
      style={{
        backgroundImage: dark
          ? "radial-gradient(circle, #30363d 1px, transparent 1px)"
          : "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  ), [dark]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col font-sans" style={{ background: bg, color: text }}>
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="h-14 flex items-center justify-between px-6 shrink-0 border-b shadow-sm" style={{ background: surface, borderColor: border }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm block">Dashboard Builder</span>
            <span className="text-[10px]" style={{ color: muted }}>{items.length} componentes en el lienzo</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearCanvas}
            title="Limpiar todo el lienzo"
            className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition text-slate-400"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button
            onClick={() => setShowPublish(true)}
            className="flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold transition shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Send className="w-4 h-4" /> Enviar para Aprobación
          </button>
          <button onClick={onClose} className="hover:bg-red-500/10 hover:text-red-500 p-2 rounded-xl transition-all active:scale-90" style={{ color: muted }}>
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: Library ──────────────────────────────────── */}
        <aside className="w-64 flex flex-col overflow-hidden shrink-0 border-r" style={{ background: surface, borderColor: border }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: border }}>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Banco de Gráficos</span>
            <button 
              onClick={() => setShowMarketplace(true)}
              className="p-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-500 hover:text-white rounded-lg transition group"
              title="Explorar Marketplace"
            >
              <Box className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {components.length === 0 && (
              <div className="py-10 text-center px-4">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-[10px] opacity-40 font-bold uppercase">No tienes gráficos creados aún. Ve al editor para crear medidas.</p>
              </div>
            )}
            {components.map(comp => (
              <div
                key={comp.id}
                className="rounded-xl border p-3 cursor-pointer group transition-all hover:border-indigo-500/50 hover:bg-indigo-500/5"
                style={{ background: dark ? "#0d1117" : "#f8fafc", borderColor: border }}
                onClick={() => addToCanvas(comp)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-indigo-500/10 rounded-md flex items-center justify-center text-indigo-500">
                    <BarChart3 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold truncate flex-1">{comp.name}</span>
                </div>
                <div className="text-[10px] mt-2 flex justify-between" style={{ color: muted }}>
                  <span>{comp.rows?.length || 0} registros</span>
                  <span className="text-indigo-500 font-bold opacity-0 group-hover:opacity-100">+ Agregar</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── CENTER: Canvas ─────────────────────────────────── */}
        <div className="flex-1 relative overflow-auto" style={{ background: dark ? "#010409" : "#f8fafc" }}>
          {gridBackground}

          {/* Render Old Components */}
          {items.map(item => (
            <div
              key={item.instanceId}
              className={`absolute transition-all duration-300 group ${flashIds.has(item.instanceId) ? 'z-50' : ''}`}
              style={{
                left: item.x,
                top: item.y,
                width: item.w,
                height: item.h,
                zIndex: activeId === item.instanceId ? 50 : 1,
              }}
            >
              <div 
                className={`
                  w-full h-full relative rounded-xl overflow-hidden transition-all duration-500
                  ${flashIds.has(item.instanceId) ? 'ring-4 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : ''}
                `}
                style={{ 
                  background: surface,
                  boxShadow: activeId === item.instanceId ? '0 20px 40px -10px rgba(0,0,0,0.3)' : '0 4px 12px -2px rgba(0,0,0,0.1)',
                  border: `1px solid ${flashIds.has(item.instanceId) ? '#10b981' : (activeId === item.instanceId ? '#6366f1' : border)}`
                }}>
                
                {/* Highlight Glow Effect */}
                {flashIds.has(item.instanceId) && (
                  <div className="absolute inset-0 bg-emerald-500/10 animate-pulse pointer-events-none" />
                )}
                
                {/* The Chart (Full interactivity) */}
                <div className="absolute inset-0">
                  {item.query && item.connectionId ? (
                    <InjectedWidget 
                      instanceId={item.instanceId}
                      widget={{
                        name: item.name,
                        versionId: item.versionId || 'local-dev',
                        executionJSON: item.executionJSON || JSON.stringify({
                          dataSourceId: item.connectionId,
                          rawQuery: item.query,
                          visualType: item.visualType || 'table',
                          code: item.code
                        })
                      }}
                      dark={dark} 
                    />
                  ) : (
                    <LiveWidget code={item.code} rows={item.rows} columns={item.columns} dark={dark} padding={20} />
                  )}
                </div>

                {/* Drag Handle Area */}
                <div 
                  className="absolute inset-0 cursor-grab active:cursor-grabbing group-hover:bg-indigo-500/5 transition-colors"
                  style={{ pointerEvents: activeId === item.instanceId ? 'auto' : 'none' }}
                />
                
                <div 
                  className="absolute top-2 left-2 p-1.5 bg-indigo-600 rounded-lg shadow-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onMouseDown={e => {
                    e.stopPropagation();
                    setActiveId(item.instanceId);
                    setIsResizing(false);
                    startPos.current = { mx: e.clientX, my: e.clientY, x: item.x, y: item.y, w: item.w, h: item.h };
                  }}
                >
                  {item.isMarketplace ? <Layers className="w-3.2 h-3.5 text-white" /> : <Move className="w-3.5 h-3.5 text-white" />}
                </div>

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => removeItem(item.instanceId)}
                    className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Resize Handle */}
                <div
                  className="absolute bottom-1 right-1 w-6 h-6 cursor-se-resize flex items-center justify-center opacity-0 group-hover:opacity-50 hover:opacity-100 z-10"
                  style={{ color: muted }}
                  onMouseDown={e => {
                    e.stopPropagation();
                    setActiveId(item.instanceId);
                    setIsResizing(true);
                    startPos.current = { mx: e.clientX, my: e.clientY, x: item.x, y: item.y, w: item.w, h: item.h };
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor"><path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Marketplace Drawer */}
      <MarketplaceDrawer 
        isOpen={showMarketplace} 
        onClose={() => setShowMarketplace(false)} 
        onInject={handleMarketplaceInject}
      />

      {/* ── Publish Modal ────────────────────────────────────────── */}
      {showPublish && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl p-8 shadow-2xl border" style={{ background: surface, borderColor: border, color: text }}>
            {published ? (
              <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold mb-2">¡Solicitud Enviada!</h3>
                <p className="text-sm opacity-60 mb-8 px-4">El administrador recibirá tu diseño y lo asignará al área correspondiente para su publicación final.</p>
                <button
                  onClick={() => { setShowPublish(false); setPublished(false); setDashName(""); }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl font-bold transition shadow-lg shadow-indigo-500/20"
                >
                  Continuar Trabajando
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-600">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Enviar para Aprobación</h3>
                    <p className="text-[10px] opacity-50 uppercase tracking-widest font-bold">Proceso de Publicación</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold opacity-50 block mb-2 px-1">NOMBRE DEL DASHBOARD</label>
                    <input
                      autoFocus
                      value={dashName}
                      onChange={e => setDashName(e.target.value)}
                      placeholder="Ej. Análisis Diario de Ventas"
                      className="w-full border-2 rounded-2xl px-4 py-3 text-sm focus:border-indigo-600 focus:outline-none transition-all"
                      style={{ background: dark ? "#0d1117" : "#f8fafc", borderColor: border, color: text }}
                    />
                  </div>
                  <div className="rounded-2xl p-4 text-xs leading-relaxed border border-indigo-500/20" style={{ background: dark ? "#111827" : "#eff6ff", color: dark ? "#93c5fd" : "#1e40af" }}>
                    📌 Recuerda que el administrador revisará la **calidad del diseño y la veracidad de los datos** antes de asignarlo a un área y otorgar permisos a los usuarios finales.
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setShowPublish(false)}
                    className="flex-1 py-3 rounded-2xl font-bold transition opacity-60 hover:opacity-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={!dashName || publishing}
                    className="flex-[2] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-2xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</> : "Enviar ahora"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
