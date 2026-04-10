import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Filter, Box, User, Clock, 
  Database, Zap, ArrowUpRight, Plus, 
  BarChart3, Layers, Layout, Info
} from 'lucide-react';
import { useMarketplaceStore } from '../hooks/useMarketplaceStore';

interface MarketplaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInject: (widget: any) => void;
}

export default function MarketplaceDrawer({ isOpen, onClose, onInject }: MarketplaceDrawerProps) {
  const { 
    widgets, 
    loading, 
    fetchWidgets, 
    searchQuery, 
    setSearch, 
    selectedCategory, 
    setCategory,
    injectWidget
  } = useMarketplaceStore();

  useEffect(() => {
    if (isOpen) fetchWidgets();
  }, [isOpen]);

  const filtered = widgets.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         w.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || w.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(widgets.map(w => w.category).filter(Boolean)));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[450px] bg-[#0d1117] border-l border-slate-800 shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-[#161b22]">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Box className="w-5 h-5 text-indigo-500" />
                  Marketplace de Widgets
                </h2>
                <p className="text-xs text-slate-400 mt-1">Explora componentes atómicos reutilizables</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* toolbar */}
            <div className="p-4 border-b border-slate-800 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Buscar por nombre o SQL..."
                  value={searchQuery}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setCategory(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    !selectedCategory ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Todos
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                      selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  >
                    <Zap className="w-8 h-8 text-indigo-500" />
                  </motion.div>
                  <p className="text-sm">Harvesting original works...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <Layers className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm font-bold">No se encontraron componentes</p>
                </div>
              ) : (
                filtered.map((widget) => (
                  <motion.div
                    key={widget.id}
                    layout
                    whileHover={{ scale: 1.01 }}
                    className="p-5 bg-[#161b22] border border-slate-800 rounded-2xl group hover:border-indigo-500/50 transition-all shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {widget.category || 'GENERAL'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">v{widget.versionTag}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-400 transition">{widget.name}</h3>
                      </div>
                      <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-500/10 transition">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                      {widget.description || 'Este componente analítico encapsula lógica de visualización y contrato de datos inmutable.'}
                    </p>

                    <div className="flex items-center gap-4 mb-4 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>{widget.ownerId === '1' ? 'Admin' : 'Dev'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5" />
                        <span>SQL Server</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>{Math.floor(Math.random() * 50) + 1} usos</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          onInject(widget);
                          onClose();
                        }}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Inyectar en Lienzo
                      </button>
                      <button className="p-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 transition" title="Ver Detalles">
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#161b22] border-t border-slate-800 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full bg-slate-700 border-2 border-[#161b22] flex items-center justify-center">
                    <User className="w-3 h-3 text-slate-400" />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 font-medium">+15 desarrolladores colaborando</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
