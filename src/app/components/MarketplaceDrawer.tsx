import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Filter, Box, User, Clock, 
  Database, Zap, ArrowUpRight, Plus, 
  BarChart3, Layers, Layout, Info,
  Heart, Edit3, Trash2, ChevronRight,
  TrendingUp, Sparkles, Star, Users, Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { useMarketplaceStore } from '../hooks/useMarketplaceStore';
import { useAuth } from '../context/AuthContext';

const getEnv = (key: string, fallback: string) => {
  try {
    return (import.meta as any).env[key] || fallback;
  } catch {
    return fallback;
  }
};

const API = getEnv("VITE_API_URL", "http://localhost:3001");

interface MarketplaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInject: (widget: any) => void;
  onEdit?: (widget: any) => void;
}

export default function MarketplaceDrawer({ isOpen, onClose, onInject, onEdit }: MarketplaceDrawerProps) {
  const { user } = useAuth();
  const { 
    widgets, 
    loading, 
    fetchWidgets, 
    searchQuery, 
    setSearch, 
    selectedCategory, 
    setCategory,
    toggleFavorite,
    deleteWidget
  } = useMarketplaceStore();

  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'devs' | 'favorites'>('all');
  const [selectedDev, setSelectedDev] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) fetchWidgets();
  }, [isOpen]);

  // Filtering & Grouping
  const filtered = useMemo(() => {
    return widgets.filter(w => {
      // Hide rule: Normal users don't see hidden items. Owners see them.
      const isOwner = user?.id === w.ownerId;
      if (w.isHidden && !isOwner) return false;

      const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (w.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || w.category === selectedCategory;
      
      // Filter by status: normal users only see approved. Owners see everything.
      if (w.status === 'pending' && !isOwner) return false;
      
      if (activeTab === 'mine') {
         return matchesSearch && matchesCategory && isOwner;
      }
      if (activeTab === 'favorites') {
         return matchesSearch && matchesCategory && w.isFavorite;
      }
      if (activeTab === 'devs' && selectedDev) {
         return matchesSearch && matchesCategory && w.ownerEmail === selectedDev;
      }
      
      return matchesSearch && matchesCategory;
    });
  }, [widgets, searchQuery, selectedCategory, activeTab, user, selectedDev]);

  const developers = useMemo(() => {
    const devs = new Map();
    widgets.forEach(w => {
      if (w.ownerId && w.ownerEmail) {
        devs.set(w.ownerEmail, { name: w.ownerName || 'Dev', email: w.ownerEmail, count: (devs.get(w.ownerEmail)?.count || 0) + 1 });
      }
    });
    return Array.from(devs.values());
  }, [widgets]);

  const handleFavoriteClick = async (e: React.MouseEvent, widgetId: string) => {
    e.stopPropagation();
    await toggleFavorite(widgetId);
  };

  const handleToggleVisibility = async (widget: any) => {
    const token = localStorage.getItem("atr_token");
    try {
      await fetch(`${API}/api/marketplace/widgets/${widget.id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isHidden: !widget.isHidden })
      });
      fetchWidgets(); // Refresh
    } catch (e) { console.error(e); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[500px] bg-[#0d1117] border-l border-white/5 shadow-2xl z-[101] flex flex-col overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#161b22]">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Box className="w-5 h-5 text-indigo-400" />
                  </div>
                  Marketplace
                </h2>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Librería de Componentes Atómicos</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-white/5 bg-[#0d1117]">
              {[
                { id: 'all', label: 'Todos', icon: Layers },
                { id: 'favorites', label: 'Favoritos', icon: Star },
                { id: 'mine', label: 'Míos', icon: User },
                { id: 'devs', label: 'Developers', icon: Users }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-4 text-xs font-bold flex flex-col items-center gap-1 transition-all border-b-2 ${
                    activeTab === tab.id ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* toolbar & Filters */}
            <div className="p-4 bg-[#0d1117] border-b border-white/5 space-y-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500 transition" />
                <input 
                  type="text"
                  placeholder="Busca por nombre o autor..."
                  value={searchQuery}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                />
              </div>

              {activeTab === 'devs' && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar animate-in slide-in-from-left duration-300">
                  {developers.map(dev => (
                    <button
                      key={dev.email}
                      onClick={() => setSelectedDev(dev.email === selectedDev ? null : dev.email)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                        selectedDev === dev.email ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-indigo-500/30 flex items-center justify-center text-[8px]"> {dev.name[0]} </div>
                      {dev.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0d1117]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-30">
                  <RefreshCw className="w-10 h-10 animate-spin text-indigo-500" />
                  <p className="text-xs font-black uppercase tracking-widest animate-pulse">Sincronizando Marketplace...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-32 opacity-20">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-indigo-500" />
                  <p className="text-sm font-black uppercase tracking-widest">Sin resultados</p>
                </div>
              ) : (
                filtered.map((widget) => (
                  <motion.div
                    key={widget.id}
                    layout
                    className={`p-5 bg-white/5 border rounded-2xl group transition-all duration-300 relative overflow-hidden ${
                      widget.isFavorite ? 'border-indigo-500/30' : 'border-white/5 hover:border-white/10'
                    } ${widget.isHidden ? 'opacity-50 grayscale' : ''} ${widget.isJSX ? 'border-orange-500/30' : ''}`}
                    style={widget.isJSX ? { borderColor: 'rgba(249,115,22,0.4)' } : {}}
                  >
                    {widget.isFavorite && (
                      <div className="absolute top-0 right-0 p-1 px-3 bg-indigo-500 text-[8px] font-black text-white rounded-bl-xl uppercase tracking-tighter"> Favorito </div>
                    )}
                    {widget.isJSX && (
                      <div className="absolute top-3 left-3 z-10 bg-orange-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg shadow-orange-500/40 animate-pulse">
                        JSX Engine
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"> {widget.category || 'Métrica'} </span>
                           {widget.isHidden && <span className="text-[8px] font-bold bg-slate-500/20 text-slate-400 px-1.5 py-0.5 rounded">OCULTO</span>}
                           {widget.status === 'pending' && <span className="text-[8px] font-bold bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/30">PENDIENTE</span>}
                        </div>
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition leading-tight">{widget.name}</h3>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                           <User className="w-3 h-3" />
                           <span className={user?.id === widget.ownerId ? "text-indigo-400" : ""}>
                             {user?.id === widget.ownerId ? "Mío" : (widget.ownerName || "Desconocido")}
                           </span>
                           <span className="opacity-30">•</span>
                           <Clock className="w-3 h-3" />
                           <span>v{widget.versionTag || '1.0'}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => handleFavoriteClick(e, widget.id)}
                          className={`p-2.5 rounded-xl border transition-all ${
                            widget.isFavorite ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:text-red-400'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${widget.isFavorite ? 'fill-white' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-5 line-clamp-2 leading-relaxed font-medium italic opacity-80">
                      {widget.description || 'Componente analítico Direct Engine.'}
                    </p>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { onInject(widget); onClose(); }}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Inyectar
                      </button>

                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {user?.id === widget.ownerId && (
                           <>
                             <button onClick={() => handleToggleVisibility(widget)} className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl transition" title={widget.isHidden ? "Mostrar" : "Ocultar"}>
                               {widget.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                             </button>
                             <button onClick={() => onEdit?.(widget)} className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl transition" title="Modificar">
                               <Edit3 className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={() => { if (window.confirm('¿Seguro?')) deleteWidget(widget.id); }}
                               className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition"
                               title="Eliminar"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </>
                         )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
