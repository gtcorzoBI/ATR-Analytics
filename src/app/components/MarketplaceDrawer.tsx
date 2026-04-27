import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Heart, Plus, Search, X, User } from 'lucide-react';
import { useMarketplaceStore } from '../hooks/useMarketplaceStore';
import { useAuth } from '../context/AuthContext';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

interface MarketplaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInject: (widget: any) => void;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

const generateMockData = (type: string) => {
  if (type === 'pie' || type === 'donut') {
    return [
      { name: 'Cat A', value: 400 },
      { name: 'Cat B', value: 300 },
      { name: 'Cat C', value: 200 },
    ];
  }
  return [
    { name: 'Ene', value: 2400 },
    { name: 'Feb', value: 1398 },
    { name: 'Mar', value: 9800 },
    { name: 'Abr', value: 3908 },
    { name: 'May', value: 4800 },
  ];
};

function ChartCard({ widget, isFavorite, onToggleFavorite, onAdd, isOwner }: any) {
  const data = generateMockData(widget.category);
  const type = (widget.category || 'bar').toLowerCase();
  
  // Tratar de deducir el tipo visual desde executionJSON si es posible
  let visualType = type;
  try {
    if (widget.executionJSON) {
      const exec = JSON.parse(widget.executionJSON);
      if (exec.visualType) visualType = exec.visualType;
    }
  } catch(e) {}

  return (
    <div className="bg-white rounded-[24px] shadow-sm hover:shadow-xl p-5 border border-slate-200 transition-all duration-300 relative group flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{widget.name}</h3>
          <p className="text-xs text-slate-500 font-medium">por {isOwner ? 'Tú' : 'Desarrollador'}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(widget.id);
          }}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
        </button>
      </div>

      <div className="h-40 w-full mb-4 opacity-80 group-hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          {visualType.includes('line') || visualType.includes('area') ? (
            <LineChart data={data} id={`chart-${widget.id}`}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} width={30} />
              <Tooltip cursor={{stroke: '#e2e8f0', strokeWidth: 2}} contentStyle={{borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} id={`line-${widget.id}`} />
            </LineChart>
          ) : visualType.includes('pie') || visualType.includes('donut') ? (
            <PieChart id={`chart-${widget.id}`}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={visualType.includes('donut') ? 40 : 0}
                outerRadius={65}
                dataKey="value"
                stroke="none"
                id={`pie-${widget.id}`}
              >
                {data.map((entry, index) => (
                  <Cell key={`${widget.id}-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
            </PieChart>
          ) : (
            <BarChart data={data} id={`chart-${widget.id}`}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} width={30} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} id={`bar-${widget.id}`} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
        {isOwner ? (
          <div className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-indigo-100">
            Propio
          </div>
        ) : <div />}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd(widget);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all text-xs font-bold active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Añadir
        </button>
      </div>
    </div>
  );
}

export default function MarketplaceDrawer({ isOpen, onClose, onInject }: MarketplaceDrawerProps) {
  const { widgets, fetchWidgets, loading } = useMarketplaceStore();
  const { user } = useAuth() as any;
  
  const [activeTab, setActiveTab] = useState<'global' | 'favorites' | 'own'>('global');
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) fetchWidgets();
  }, [isOpen]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavs = new Set(prev);
      if (newFavs.has(id)) newFavs.delete(id);
      else newFavs.add(id);
      return newFavs;
    });
  };

  const filteredWidgets = widgets.filter(w => {
    const searchLow = searchQuery.toLowerCase();
    const matchesSearch = w.name.toLowerCase().includes(searchLow) || 
                          (w.category && w.category.toLowerCase().includes(searchLow));

    if (!matchesSearch) return false;

    if (activeTab === 'favorites') return favorites.has(w.id);
    if (activeTab === 'own') return user?.id && w.ownerId === user.id;
    return true;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed inset-0 z-[150] bg-slate-50 flex flex-col font-sans overflow-hidden"
        >
          {/* Header */}
          <header className="bg-white border-b border-slate-200 px-6 lg:px-12 py-5 flex items-center justify-between shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-600 rounded-xl p-2.5 shadow-lg shadow-indigo-500/20">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Marketplace Global</h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Catálogo de Visualizaciones</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-slate-100 rounded-full transition-colors group"
            >
              <X className="w-6 h-6 text-slate-400 group-hover:text-slate-600" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full">
              {/* Controles: Búsqueda y Tabs */}
              <div className="sticky top-0 bg-slate-50 z-10 pt-8 pb-4 px-6 lg:px-12 space-y-6">
                <div className="relative max-w-2xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, tipo o autor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[20px] shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 placeholder-slate-400"
                  />
                </div>

                <div className="flex gap-8 border-b border-slate-200">
                  <button
                    onClick={() => setActiveTab('global')}
                    className={`pb-4 flex items-center gap-2 border-b-2 transition-all font-bold text-sm ${
                      activeTab === 'global' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Store className="w-4 h-4" /> Global
                  </button>
                  <button
                    onClick={() => setActiveTab('favorites')}
                    className={`pb-4 flex items-center gap-2 border-b-2 transition-all font-bold text-sm ${
                      activeTab === 'favorites' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${activeTab === 'favorites' ? 'fill-indigo-600 text-indigo-600' : ''}`} /> Favoritos ({favorites.size})
                  </button>
                  <button
                    onClick={() => setActiveTab('own')}
                    className={`pb-4 flex items-center gap-2 border-b-2 transition-all font-bold text-sm ${
                      activeTab === 'own' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <User className="w-4 h-4" /> Propios
                  </button>
                </div>
              </div>

              {/* Grid de Gráficos */}
              <div className="px-6 lg:px-12 pb-24 pt-4">
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Cargando marketplace...</p>
                  </div>
                ) : filteredWidgets.length === 0 ? (
                  <div className="py-24 flex flex-col items-center justify-center text-center bg-white rounded-[32px] border border-dashed border-slate-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                      <Store className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">No se encontraron gráficos</h3>
                    <p className="text-slate-500 max-w-md font-medium">Intenta con otros términos de búsqueda o revisa en otra pestaña para encontrar el gráfico ideal.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredWidgets.map(widget => (
                      <ChartCard
                        key={widget.id}
                        widget={widget}
                        isFavorite={favorites.has(widget.id)}
                        onToggleFavorite={toggleFavorite}
                        isOwner={user?.id && widget.ownerId === user.id}
                        onAdd={() => {
                          onInject(widget);
                          onClose();
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
