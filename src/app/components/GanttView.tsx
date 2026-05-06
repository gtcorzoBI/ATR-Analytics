import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Filter, Calendar, X, MessageSquare, Send, AtSign, User } from 'lucide-react';

const SUCURSALES = [
  "INSUR","SENDERO","RIOVERDE","NAVA","MATEHUALA","INFINITI FORUM",
  "CENTRO MAX","LOMAS","LA JOYA","FORUM","CARRANZA","MG POLIFORUM",
  "MG LOMAS","INFINITI QUERÉTARO","BMW","TLALPAN","FLOTAS CDMX","INFINITI SLP"
];
const AREAS_LIST = ["FINANCIAMIENTO","ADMINISTRACION","CONTABILIDAD"];
const AREAS_CATS: Record<string,string[]> = {
  "FINANCIAMIENTO": ["Bancos","Flujos de Efectivo","Créditos","Tesorería","Proyecciones","Conciliaciones"],
  "ADMINISTRACION": ["Eros","Vales de Compra","Deuda Días","Compras","Órdenes de Compra","Inventarios","Nómina","Gastos Operativos"],
  "CONTABILIDAD": ["Facturas Realizadas","Costo de Ingreso","Costo Egresos","Cuentas por Cobrar","Cuentas por Pagar","Presupuestos","Auditoría","Fiscal / Impuestos"]
};

type Card = {
  id: number; area: string; category: string; title: string;
  description: string; status: string; sucursal: string;
  created_by: string; start_date: string; end_date: string; created_at: string;
};
type Comment = { id: number; card_id: number; user_name: string; comment_text: string; mentions: string; created_at: string; };

type Props = { cards: Card[]; isDark: boolean; onStatusChange: (id: number, status: string) => void; superUsers?: string[]; currentUser?: string; };

const STATUS_BADGE: Record<string,string> = {
  "Pendiente":  "bg-slate-500/20 text-slate-400 border-slate-500/30",
  "En Proceso": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Revisión":   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Completado": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};
const STATUS_BADGE_L: Record<string,string> = {
  "Pendiente": "bg-gray-100 text-gray-600 border-gray-300",
  "En Proceso": "bg-amber-50 text-amber-700 border-amber-300",
  "Revisión": "bg-blue-50 text-blue-700 border-blue-300",
  "Completado": "bg-emerald-50 text-emerald-700 border-emerald-300",
};
const STATUS_BAR: Record<string,string> = {
  "Pendiente":"bg-slate-500","En Proceso":"bg-amber-500","Revisión":"bg-blue-500","Completado":"bg-emerald-500"
};

export default function GanttView({ cards, isDark, onStatusChange, superUsers = [], currentUser = 'Usuario' }: Props) {
  const d = isDark;
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [filters, setFilters] = useState({ sucursal: '', area: '', category: '', dateFrom: '', dateTo: '' });
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = async (cardId: number) => {
    try {
      const res = await fetch(`http://localhost:3001/api/rhythm-cards/${cardId}/comments`);
      const data = await res.json();
      if (data.data) setComments(data.data);
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedCard?.id) fetchComments(selectedCard.id);
  }, [selectedCard?.id]);

  const sendComment = async () => {
    if (!commentText.trim() || !selectedCard?.id) return;
    const mentions = (commentText.match(/@(\w+)/g) || []).map(m => m.slice(1));
    await fetch(`http://localhost:3001/api/rhythm-cards/${selectedCard.id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: currentUser, comment_text: commentText, mentions })
    });
    setCommentText('');
    setShowMentions(false);
    fetchComments(selectedCard.id);
  };

  const handleCommentChange = (val: string) => {
    setCommentText(val);
    const atIdx = val.lastIndexOf('@');
    if (atIdx !== -1 && atIdx === val.length - 1) { setMentionQuery(''); setShowMentions(true); }
    else if (atIdx !== -1 && !val.slice(atIdx + 1).includes(' ')) {
      setMentionQuery(val.slice(atIdx + 1).toLowerCase());
      setShowMentions(true);
    } else { setShowMentions(false); }
  };

  const insertMention = (name: string) => {
    const atIdx = commentText.lastIndexOf('@');
    setCommentText(commentText.slice(0, atIdx) + `@${name} `);
    setShowMentions(false);
    commentRef.current?.focus();
  };

  const filteredUsers = superUsers.filter(u => u.toLowerCase().includes(mentionQuery));

  const filtered = useMemo(() => cards.filter(c => {
    if (filters.sucursal && c.sucursal !== filters.sucursal) return false;
    if (filters.area && c.area !== filters.area) return false;
    if (filters.category && c.category !== filters.category) return false;
    if (filters.dateFrom && new Date(c.start_date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(c.end_date) > new Date(filters.dateTo)) return false;
    return true;
  }), [cards, filters]);

  const { minDate, totalDays } = useMemo(() => {
    const valid = filtered.filter(c => c.start_date && c.end_date);
    if (!valid.length) return { minDate: new Date(), totalDays: 30 };
    const dates = valid.flatMap(c => [new Date(c.start_date), new Date(c.end_date)]);
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    min.setDate(min.getDate() - 2); max.setDate(max.getDate() + 2);
    return { minDate: min, totalDays: Math.max(Math.ceil((max.getTime() - min.getTime()) / 86400000), 30) };
  }, [filtered]);

  const dayPct = (date: string) => Math.max(0, Math.min(100, ((new Date(date).getTime() - minDate.getTime()) / (totalDays * 86400000)) * 100));
  const widthPct = (s: string, e: string) => Math.max(1, Math.min(((new Date(e).getTime() - new Date(s).getTime()) / (totalDays * 86400000)) * 100, 100 - dayPct(s)));

  const weekLabels = useMemo(() => {
    const labels: { label: string; pct: number }[] = [];
    const cur = new Date(minDate);
    for (let i = 0; i < totalDays; i += 7) {
      labels.push({ label: cur.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }), pct: (i / totalDays) * 100 });
      cur.setDate(cur.getDate() + 7);
    }
    return labels;
  }, [minDate, totalDays]);

  const setFilter = (k: keyof typeof filters, v: string) => setFilters(p => ({ ...p, [k]: v, ...(k === 'area' ? { category: '' } : {}) }));
  const clearFilters = () => setFilters({ sucursal: '', area: '', category: '', dateFrom: '', dateTo: '' });
  const hasFilters = Object.values(filters).some(Boolean);
  const inp = (w?: string) => `border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 ${d ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-gray-300 text-gray-700'} ${w || ''}`;

  const renderCommentText = (text: string) => text.replace(/@(\w+)/g, '<span class="text-indigo-400 font-medium">@$1</span>');

  return (
    <div className={`flex flex-col h-full overflow-hidden ${d ? 'bg-slate-950' : 'bg-gray-50'}`}>
      {/* Filter Bar */}
      <div className={`px-5 py-3 border-b flex items-center gap-3 flex-wrap shrink-0 ${d ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        <div className={`flex items-center gap-1.5 text-xs font-bold shrink-0 ${d ? 'text-slate-400' : 'text-gray-500'}`}>
          <Filter size={12}/> Filtros
        </div>
        <select className={inp('w-40')} value={filters.sucursal} onChange={e => setFilter('sucursal', e.target.value)}>
          <option value="">Todas las Sucursales</option>
          {SUCURSALES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={inp('w-36')} value={filters.area} onChange={e => setFilter('area', e.target.value)}>
          <option value="">Todas las Áreas</option>
          {AREAS_LIST.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {filters.area && (
          <select className={inp('w-40')} value={filters.category} onChange={e => setFilter('category', e.target.value)}>
            <option value="">Todas las Categorías</option>
            {(AREAS_CATS[filters.area]||[]).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <span className={`text-xs shrink-0 ${d ? 'text-slate-500' : 'text-gray-400'}`}><Calendar size={11} className="inline mr-1"/>Desde:</span>
        <input type="date" className={inp('w-32')} value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)}/>
        <span className={`text-xs shrink-0 ${d ? 'text-slate-500' : 'text-gray-400'}`}>Hasta:</span>
        <input type="date" className={inp('w-32')} value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)}/>
        {hasFilters && (
          <button onClick={clearFilters} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border transition-colors shrink-0 ${d ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-300 text-red-500 hover:bg-red-50'}`}>
            <X size={11}/> Limpiar
          </button>
        )}
        <span className={`ml-auto text-xs shrink-0 ${d ? 'text-slate-500' : 'text-gray-400'}`}>{filtered.length} tarjeta{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Gantt */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-48 gap-3 ${d ? 'text-slate-600' : 'text-gray-400'}`}>
            <Calendar size={36} className="opacity-30"/>
            <p className="text-sm">No hay tarjetas para mostrar.</p>
            <p className="text-xs opacity-70">Crea tarjetas en los módulos operativos para verlas aquí.</p>
          </div>
        ) : (
          <div className="min-w-[800px]">
            {/* Header weeks */}
            <div className={`flex border-b sticky top-0 z-10 ${d ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-gray-100'}`}>
              <div className={`w-72 shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-r ${d ? 'border-slate-800 text-slate-500' : 'border-gray-200 text-gray-400'}`}>
                Iniciativa / Sucursal
              </div>
              <div className="flex-1 relative h-8">
                {weekLabels.map((wl, i) => (
                  <React.Fragment key={i}>
                    <div className={`absolute top-0 text-[10px] px-1 py-2 select-none ${d ? 'text-slate-600' : 'text-gray-400'}`} style={{left:`${wl.pct}%`}}>{wl.label}</div>
                    <div className={`absolute top-0 bottom-0 w-px ${d ? 'bg-slate-800' : 'bg-gray-200'}`} style={{left:`${wl.pct}%`}}/>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Rows */}
            {filtered.map(card => (
              <div key={card.id} className={`flex border-b transition-colors ${d ? 'border-slate-800/50 hover:bg-slate-900/60' : 'border-gray-100 hover:bg-blue-50/20'}`}>
                <div className={`w-72 shrink-0 px-3 py-2.5 border-r cursor-pointer ${d ? 'border-slate-800' : 'border-gray-200'}`} onClick={() => { setSelectedCard(card); setComments([]); }}>
                  <div className={`text-xs font-semibold truncate ${d ? 'text-slate-200' : 'text-gray-800'}`}>{card.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${d ? (STATUS_BADGE[card.status]||STATUS_BADGE.Pendiente) : (STATUS_BADGE_L[card.status]||STATUS_BADGE_L.Pendiente)}`}>{card.status}</span>
                    {card.sucursal && <span className={`text-[10px] font-medium ${d ? 'text-indigo-400' : 'text-indigo-600'}`}>{card.sucursal}</span>}
                    {card.created_by && <span className={`text-[10px] flex items-center gap-0.5 ${d ? 'text-slate-500' : 'text-gray-400'}`}><User size={9}/>{card.created_by}</span>}
                  </div>
                </div>
                <div className="flex-1 relative h-14 flex items-center">
                  {weekLabels.map((wl, i) => <div key={i} className={`absolute top-0 bottom-0 w-px ${d ? 'bg-slate-800/40' : 'bg-gray-100'}`} style={{left:`${wl.pct}%`}}/>)}
                  {card.start_date && card.end_date && (
                    <div
                      className={`absolute h-7 rounded-full cursor-pointer flex items-center px-3 text-[11px] font-semibold text-white shadow hover:brightness-110 hover:shadow-lg transition-all ${STATUS_BAR[card.status]||STATUS_BAR.Pendiente}`}
                      style={{left:`${dayPct(card.start_date)}%`, width:`${widthPct(card.start_date, card.end_date)}%`, minWidth:'32px'}}
                      title={card.title}
                      onClick={() => { setSelectedCard(card); setComments([]); }}
                    >
                      <span className="truncate">{card.title}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Detail + Comments Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelectedCard(null)}>
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] ${d ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`p-4 border-b flex items-start justify-between shrink-0 ${d ? 'border-slate-800' : 'border-gray-200'}`}>
              <div>
                <h3 className={`font-bold text-base ${d ? 'text-white' : 'text-gray-900'}`}>{selectedCard.title}</h3>
                <p className={`text-xs mt-0.5 ${d ? 'text-indigo-400' : 'text-indigo-600'}`}>{selectedCard.area} › {selectedCard.category}</p>
              </div>
              <button onClick={() => setSelectedCard(null)} className={`p-1.5 rounded-lg transition-colors ${d ? 'text-slate-500 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}><X size={15}/></button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* Details */}
              {selectedCard.description && <p className={`p-3 rounded-lg text-xs leading-relaxed ${d ? 'bg-slate-800 text-slate-300' : 'bg-gray-50 text-gray-600'}`}>{selectedCard.description}</p>}
              <div className="grid grid-cols-3 gap-3 text-xs">
                {[['Sucursal', selectedCard.sucursal||'—'],['Creado por', selectedCard.created_by||'Sistema'],['Inicio', selectedCard.start_date ? new Date(selectedCard.start_date).toLocaleDateString('es-MX') : '—'],['Fin', selectedCard.end_date ? new Date(selectedCard.end_date).toLocaleDateString('es-MX') : '—'],['Creado', selectedCard.created_at ? new Date(selectedCard.created_at).toLocaleString('es-MX') : '—']].map(([k,v]) => (
                  <div key={k}><span className={d ? 'text-slate-500' : 'text-gray-400'}>{k}</span><p className={`font-medium mt-0.5 ${d ? 'text-slate-200' : 'text-gray-800'}`}>{v}</p></div>
                ))}
              </div>

              {/* Status change */}
              <div>
                <span className={`text-xs font-medium ${d ? 'text-slate-400' : 'text-gray-500'}`}>Cambiar Estado</span>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {["Pendiente","En Proceso","Revisión","Completado"].map(s => (
                    <button key={s} onClick={() => { onStatusChange(selectedCard.id, s); setSelectedCard({...selectedCard, status: s}); }}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${selectedCard.status === s
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : d ? 'border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-white' : 'border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div>
                <div className={`flex items-center gap-2 text-xs font-semibold mb-3 ${d ? 'text-slate-300' : 'text-gray-700'}`}>
                  <MessageSquare size={13}/> Comentarios ({comments.length})
                </div>
                <div className="space-y-2 mb-3 max-h-44 overflow-y-auto pr-1">
                  {comments.length === 0 && (
                    <p className={`text-xs ${d ? 'text-slate-600' : 'text-gray-400'}`}>Sé el primero en comentar.</p>
                  )}
                  {comments.map(c => (
                    <div key={c.id} className={`p-3 rounded-xl text-xs ${d ? 'bg-slate-800 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold ${d ? 'text-indigo-400' : 'text-indigo-600'}`}>{c.user_name}</span>
                        <span className={`text-[10px] ${d ? 'text-slate-500' : 'text-gray-400'}`}>{new Date(c.created_at).toLocaleString('es-MX')}</span>
                      </div>
                      <p className={`leading-relaxed ${d ? 'text-slate-300' : 'text-gray-700'}`} dangerouslySetInnerHTML={{ __html: renderCommentText(c.comment_text) }}/>
                    </div>
                  ))}
                </div>

                {/* Comment input */}
                <div className="relative">
                  <textarea
                    ref={commentRef}
                    value={commentText}
                    onChange={e => handleCommentChange(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                    placeholder={`Escribe un comentario... usa @ para mencionar`}
                    rows={2}
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs resize-none pr-10 focus:outline-none focus:border-indigo-500 transition-colors ${d ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  />
                  <button onClick={sendComment} disabled={!commentText.trim()}
                    className="absolute right-2 bottom-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-colors">
                    <Send size={12}/>
                  </button>

                  {/* @mention dropdown */}
                  {showMentions && filteredUsers.length > 0 && (
                    <div className={`absolute bottom-full left-0 mb-1 border rounded-xl shadow-xl overflow-hidden w-52 z-50 ${d ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                      <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${d ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-400'}`}>
                        <AtSign size={9} className="inline mr-1"/>Mencionar usuario
                      </div>
                      {filteredUsers.map(u => (
                        <button key={u} onClick={() => insertMention(u)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${d ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-indigo-50 text-gray-700'}`}>
                          <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-[9px] shrink-0">{u[0]?.toUpperCase()}</div>
                          {u}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className={`text-[10px] mt-1 ${d ? 'text-slate-600' : 'text-gray-400'}`}>Enter para enviar · Shift+Enter para salto de línea · @ para mencionar</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
