import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Heart, Plus, Search, X, User } from 'lucide-react';
import { useMarketplaceStore } from '../hooks/useMarketplaceStore';
import { useAuth } from '../context/AuthContext';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

interface MarketplaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInject: (widget: any) => void;
}

// ── Generic sample data (no months, pure abstract labels) ────────────
const SAMPLE_CAT  = ['A','B','C','D','E','F'];
const SAMPLE_VALS = [42, 78, 31, 95, 57, 83];

function buildMockData(visualType: string) {
  if (visualType === 'pie' || visualType === 'donut') {
    return SAMPLE_CAT.slice(0,4).map((n, i) => ({ name: n, value: SAMPLE_VALS[i] }));
  }
  if (visualType === 'scatter') {
    return SAMPLE_CAT.map((n, i) => ({ name: n, x: SAMPLE_VALS[i], y: SAMPLE_VALS[(i+2)%6] }));
  }
  // bar, line, area, combo, etc.
  return SAMPLE_CAT.map((n, i) => ({ name: n, S1: SAMPLE_VALS[i], S2: SAMPLE_VALS[(i+3)%6] }));
}

// Icon badge per visual type
const TYPE_ICON_MAP: Record<string, string> = {
  bar: '▊', 'bar-stacked': '▊', 'bar-h': '▬', line: '╱', area: '◸',
  pie: '◉', donut: '◎', combo: '▊╱', scatter: '⬡', card: '🃏',
  kpi: '📈', matrix: '⊞', table: '⊟', treemap: '⊠', slicer: '⊛'
};

const CHART_COLORS = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b'];

function ChartPreviewMini({ visualType, widgetId }: { visualType: string; widgetId: string }) {
  const d = buildMockData(visualType);
  const id = `mp-${widgetId}`;
  const cs = { borderRadius: 8, border: 'none', fontSize: 10 };

  if (visualType === 'pie' || visualType === 'donut') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={d} cx="50%" cy="50%"
            innerRadius={visualType === 'donut' ? 38 : 0} outerRadius={62}
            dataKey="value" nameKey="name" stroke="none" id={id}>
            {d.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={cs} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (visualType === 'line' || visualType === 'area') {
    const Comp = visualType === 'area' ? AreaChart : LineChart;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <Comp data={d}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={24} />
          <Tooltip contentStyle={cs} />
          <Line type="monotone" dataKey="S1" stroke="#6366f1" strokeWidth={2} dot={false} id={id} />
          <Line type="monotone" dataKey="S2" stroke="#ec4899" strokeWidth={2} dot={false} />
        </Comp>
      </ResponsiveContainer>
    );
  }
  if (visualType === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="x" type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis dataKey="y" type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={24} />
          <Tooltip contentStyle={cs} />
          <Scatter data={d} fill="#6366f1" id={id} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }
  if (visualType === 'matrix' || visualType === 'table') {
    const rows = [['A1','B1','C1'],['A2','B2','C2'],['A3','B3','C3']];
    const hdrs = ['Cat','Col 1','Col 2'];
    return (
      <div style={{ width:'100%', height:'100%', overflow:'hidden', padding:'6px', boxSizing:'border-box' }}>
        <table style={{ width:'100%', fontSize:9, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#1e293b', color:'#e2e8f0' }}>
              {hdrs.map(h => <th key={h} style={{ padding:'4px 6px', textAlign:'center' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={i} style={{ background: i%2 ? '#f8fafc' : '#fff', borderBottom:'1px solid #f1f5f9' }}>
                <td style={{ padding:'4px 6px', fontWeight:700, color:'#312e81' }}>{r[0]}</td>
                {r.slice(1).map((v,j) => <td key={j} style={{ padding:'4px 6px', textAlign:'right', color:'#0f172a' }}>{SAMPLE_VALS[i*2+j]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (visualType === 'kpi' || visualType === 'card') {
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, padding:8, boxSizing:'border-box' }}>
        <div style={{ fontSize:28, fontWeight:900, color:'#6366f1', letterSpacing:-1 }}>42,891</div>
        <div style={{ fontSize:10, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Valor total</div>
        <div style={{ fontSize:10, color:'#10b981', fontWeight:700 }}>↑ 12.4%</div>
      </div>
    );
  }

  if (visualType === 'slicer') {
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', gap:4, padding:'8px 6px', boxSizing:'border-box' }}>
        {['Opción A','Opción B','Opción C'].map((opt, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px', borderRadius:6,
            background: i === 0 ? '#eff6ff' : 'transparent', border:`1px solid ${i===0?'#6366f1':'#e2e8f0'}`, fontSize:10 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background: i===0 ? '#6366f1' : '#e2e8f0', flexShrink:0 }} />
            <span style={{ color: i===0 ? '#4338ca' : '#64748b', fontWeight: i===0 ? 700 : 400 }}>{opt}</span>
          </div>
        ))}
      </div>
    );
  }

  // default: bar (grouped)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={d} id={id} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={24} />
        <Tooltip contentStyle={cs} />
        <Bar dataKey="S1" fill="#6366f1" radius={[3,3,0,0]} />
        <Bar dataKey="S2" fill="#8b5cf6" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartCard({ widget, isFavorite, onToggleFavorite, onAdd, isOwner }: any) {
  // Backend sends: w.*, v.configJSON, v.executionJSON, v.versionTag, v.versionId
  // visualType is stored inside configJSON as { visualType, code, mapping, ... }
  let visualType = 'bar';

  // 1) Try configJSON first (most reliable — set by VisualGenerator at save time)
  try {
    const cfg = typeof widget.configJSON === 'string'
      ? JSON.parse(widget.configJSON)
      : (widget.configJSON || {});
    if (cfg.visualType) visualType = cfg.visualType.toLowerCase();
  } catch(e) {}

  // 2) Try executionJSON
  if (visualType === 'bar') {
    try {
      const exec = typeof widget.executionJSON === 'string'
        ? JSON.parse(widget.executionJSON)
        : (widget.executionJSON || {});
      if (exec.visualType) visualType = exec.visualType.toLowerCase();
    } catch(e) {}
  }

  // 3) Try top-level widget.visualType field
  if (visualType === 'bar' && widget.visualType) {
    visualType = String(widget.visualType).toLowerCase();
  }

  // 4) widget.name heuristic (last resort)
  if (visualType === 'bar') {
    const nm = (widget.name || '').toLowerCase();
    if (nm.includes('dona') || nm.includes('donut')) visualType = 'donut';
    else if (nm.includes('pie') || nm.includes('circulo')) visualType = 'pie';
    else if (nm.includes('matriz') || nm.includes('matrix')) visualType = 'matrix';
    else if (nm.includes('linea') || nm.includes('line')) visualType = 'line';
    else if (nm.includes('area')) visualType = 'area';
    else if (nm.includes('tabla') || nm.includes('table')) visualType = 'table';
    else if (nm.includes('kpi') || nm.includes('tarjeta')) visualType = 'kpi';
    else if (nm.includes('dispersion') || nm.includes('scatter')) visualType = 'scatter';
  }

  // 5) Last resort: scan the actual JSX/code for recharts component names
  if (visualType === 'bar') {
    try {
      const cfg = typeof widget.configJSON === 'string' ? JSON.parse(widget.configJSON) : (widget.configJSON || {});
      const exec = typeof widget.executionJSON === 'string' ? JSON.parse(widget.executionJSON) : (widget.executionJSON || {});
      const code = cfg.code || exec.code || '';
      if (code.includes('PieChart') && code.includes('innerRadius')) visualType = 'donut';
      else if (code.includes('PieChart')) visualType = 'pie';
      else if (code.includes('ScatterChart')) visualType = 'scatter';
      else if (code.includes('AreaChart')) visualType = 'area';
      else if (code.includes('LineChart')) visualType = 'line';
      else if (code.includes('layout="vertical"') || code.includes("layout='vertical'")) visualType = 'bar-h';
      else if (code.includes('stackId')) visualType = 'bar-stacked';
      else if (code.includes('ComposedChart')) visualType = 'combo';
      else if (code.includes('thead') || code.includes('<table') || code.includes('<tr')) visualType = 'table';
    } catch(e) {}
  }

  const typeIcon = TYPE_ICON_MAP[visualType] || '📊';
  const authorLabel = widget.authorName || widget.ownerName ||
    (isOwner ? 'Tú' : (widget.ownerId ? `Dev ${String(widget.ownerId).slice(0,6)}` : 'Desarrollador'));

  return (
    <div className="bg-white rounded-[24px] shadow-sm hover:shadow-xl p-5 border border-slate-200 transition-all duration-300 relative group flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base" title={visualType}>{typeIcon}</span>
            <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">{widget.name}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <p className="text-[11px] text-slate-500 font-medium truncate">{authorLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {/* Visual type badge */}
          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-wider rounded-md border border-indigo-100">
            {visualType.replace('-', ' ')}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(widget.id); }}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-300'}`} />
          </button>
        </div>
      </div>

      {/* Chart preview — type-specific, generic data */}
      <div className="h-36 w-full mb-3 opacity-80 group-hover:opacity-100 transition-opacity bg-slate-50 rounded-xl overflow-hidden">
        <ChartPreviewMini visualType={visualType} widgetId={widget.id} />
      </div>

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
        {isOwner ? (
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-md border border-indigo-100">
            Propio
          </span>
        ) : <div />}
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(widget); }}
          className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all text-xs font-bold active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Añadir
        </button>
      </div>
    </div>
  );
}


export default function MarketplaceDrawer({ isOpen, onClose, onInject }: MarketplaceDrawerProps) {
  const { widgets, fetchWidgets, loading } = useMarketplaceStore();
  const { user } = useAuth() as any;
  
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'own'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('GLOBAL');

  const CATEGORIES = [
    'GLOBAL', 'COMERCIAL', 'FINANCIERO', 'ADMINISTRATIVO', 'POSVENTA', 
    'MARKETING', 'RECURSOS HUMANOS', 'COMISIONES', 'CALIDAD'
  ];


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
    
    // GLOBAL = show everything; otherwise filter by exact area
    if (selectedCategory !== 'GLOBAL') {
      const wCat = (w.category || 'GLOBAL').toUpperCase().trim();
      if (wCat !== selectedCategory.toUpperCase().trim()) return false;
    }

    // Filter by Tab (favorites / own)
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

          <div className="flex-1 overflow-hidden flex">
            {/* Sidebar de Áreas */}
            <aside className="w-64 bg-white border-r border-slate-200 shrink-0 overflow-y-auto flex flex-col z-20">
              <div className="p-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Áreas de Negocio</h3>
                <div className="space-y-1">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                        selectedCategory === cat 
                          ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
              <div className="max-w-7xl mx-auto w-full">
                {/* Controles: Búsqueda y Tabs */}
                <div className="sticky top-0 bg-slate-50 z-10 pt-8 pb-4 px-6 lg:px-12 space-y-6">
                  <div className="relative max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder={`Buscar en ${selectedCategory}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[20px] shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 placeholder-slate-400"
                    />
                  </div>

                  <div className="flex gap-8 border-b border-slate-200">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`pb-4 flex items-center gap-2 border-b-2 transition-all font-bold text-sm ${
                        activeTab === 'all' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Store className="w-4 h-4" /> Todos
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
