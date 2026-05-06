import React, { useState, useEffect } from 'react';
import { Plus, Kanban, BarChart2, MessageCircle, Paperclip, Send, AtSign } from 'lucide-react';
import GanttView from './GanttView';

const SUCURSALES = [
  "INSUR","SENDERO","RIOVERDE","NAVA","MATEHUALA","INFINITI FORUM",
  "CENTRO MAX","LOMAS","LA JOYA","FORUM","CARRANZA","MG POLIFORUM",
  "MG LOMAS","INFINITI QUERÉTARO","BMW","TLALPAN","FLOTAS CDMX","INFINITI SLP"
];

const STATUS_COLS = ["Pendiente","En Proceso","Revisión","Completado"];

const STATUS_BADGE: Record<string,string> = {
  "Pendiente":  "text-slate-400 bg-slate-500/10 border-slate-500/20",
  "En Proceso": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Revisión":   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Completado": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};
const STATUS_BADGE_LIGHT: Record<string,string> = {
  "Pendiente":  "text-gray-600 bg-gray-100 border-gray-300",
  "En Proceso": "text-amber-700 bg-amber-50 border-amber-300",
  "Revisión":   "text-blue-700 bg-blue-50 border-blue-300",
  "Completado": "text-emerald-700 bg-emerald-50 border-emerald-300",
};
const COL_BG: Record<string,{dark:string,light:string}> = {
  "Pendiente":  {dark:"border-slate-700 bg-slate-800/40",  light:"border-gray-300 bg-gray-50"},
  "En Proceso": {dark:"border-amber-700 bg-amber-900/20",  light:"border-amber-400 bg-amber-50"},
  "Revisión":   {dark:"border-blue-700 bg-blue-900/20",    light:"border-blue-400 bg-blue-50"},
  "Completado": {dark:"border-emerald-700 bg-emerald-900/20",light:"border-emerald-400 bg-emerald-50"},
};

export type RhythmCard = {
  id?: number;
  area: string;
  category: string;
  title: string;
  description: string;
  status: string;
  sucursal: string;
  created_by: string;
  start_date: string;
  end_date: string;
  created_at?: string;
};

type Props = { 
  selectedArea: string | null; 
  selectedCategory: string | null; 
  isDark: boolean; 
  allCards?: any[];
  onStatusChange?: (id: number, status: string) => void;
  superUsers?: string[];
  currentUser?: string; 
  currentUserRole?: string;
};

export default function RhythmBoard({ 
  selectedArea, 
  selectedCategory, 
  isDark, 
  allCards = [],
  onStatusChange,
  superUsers = [],
  currentUser = 'Usuario',
  currentUserRole
}: Props) {
  const [localCards, setLocalCards] = useState<RhythmCard[]>([]);
  const cards = allCards.length > 0 ? allCards : localCards;
  const [view, setView] = useState<'kanban'|'gantt'>('kanban');
  const [showModal, setShowModal] = useState(false);
  
  // DRAG & DROP STATE
  const [draggedCardId, setDraggedCardId] = useState<number | null>(null);

  // COMMENTS SOCIAL STATE
  const [activeCommentsCardId, setActiveCommentsCardId] = useState<number | null>(null);
  const [commentsData, setCommentsData] = useState<Record<number, any[]>>({});
  const [newComment, setNewComment] = useState("");

  const [newCard, setNewCard] = useState<Partial<RhythmCard>>({
    area: selectedArea || 'FINANCIAMIENTO',
    category: selectedCategory || 'Bancos',
    title: '', description: '', status: 'Pendiente', sucursal: ''
  });
  const d = isDark;

  const fetchCards = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/rhythm-cards');
      const data = await res.json();
      if (data.data) setLocalCards(data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchCards(); }, []);

  const saveCard = async () => {
    if (!newCard.title || !newCard.sucursal) return;
    await fetch('http://localhost:3001/api/rhythm-cards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newCard,
        area: selectedArea || newCard.area,
        category: selectedCategory || newCard.category,
        created_by: currentUser,
        start_date: newCard.start_date || new Date().toISOString().split('T')[0],
        end_date: newCard.end_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
      })
    });
    
    // Simulate Notification to ExtraUser
    alert("Notificación enviada: El rol ExtraUser ha sido notificado para la gestión de esta nueva tarjeta.");

    setShowModal(false);
    setNewCard({ area: selectedArea || 'FINANCIAMIENTO', category: selectedCategory || 'Bancos', title: '', description: '', status: 'Pendiente', sucursal: '' });
    fetchCards();
  };

  const updateStatus = async (id: number, status: string) => {
    if (onStatusChange) {
      onStatusChange(id, status);
    } else {
      await fetch(`http://localhost:3001/api/rhythm-cards/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setLocalCards(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    }
  };

  const filtered = cards.filter(c =>
    (!selectedArea || c.area === selectedArea) &&
    (!selectedCategory || c.category === selectedCategory)
  );

  const canMoveCards = currentUserRole === 'ExtraUser' || currentUserRole === 'admin' || superUsers.includes(currentUser);

  // DRAG & DROP HANDLERS
  const handleDragStart = (e: React.DragEvent, cardId: number) => {
    if (!canMoveCards) {
      e.preventDefault();
      return;
    }
    setDraggedCardId(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (draggedCardId !== null && canMoveCards) {
      updateStatus(draggedCardId, targetStatus);
    }
    setDraggedCardId(null);
  };

  const inp = `w-full border rounded-lg px-3 py-2.5 text-sm ${d ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'}`;

  // COMMENTS HANDLER
  const addComment = () => {
    if (!newComment.trim() || !activeCommentsCardId) return;
    
    // Simulate email if '@' is used
    if (newComment.includes('@')) {
      alert("Simulación de Email: Se ha enviado un correo de notificación al usuario etiquetado.");
    }

    setCommentsData(prev => ({
      ...prev,
      [activeCommentsCardId]: [
        ...(prev[activeCommentsCardId] || []),
        { id: Date.now(), text: newComment, author: currentUser, date: new Date().toISOString() }
      ]
    }));
    setNewComment("");
  };

  const handleFileUpload = () => {
    alert("Simulación: Subiendo archivo... Límite 50MB. (Archivo adjuntado con éxito).");
    if (!activeCommentsCardId) return;
    setCommentsData(prev => ({
      ...prev,
      [activeCommentsCardId]: [
        ...(prev[activeCommentsCardId] || []),
        { id: Date.now(), text: "📎 Ha adjuntado un archivo.", author: currentUser, date: new Date().toISOString(), isFile: true }
      ]
    }));
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${d ? 'bg-slate-950' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-3 border-b shrink-0 ${d ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center gap-4">
          <div>
            <h2 className={`font-bold flex items-center gap-2 ${d ? 'text-white' : 'text-gray-900'}`}>
              {view === 'kanban' ? <Kanban size={18} className="text-indigo-500"/> : <BarChart2 size={18} className="text-indigo-500"/>}
              {selectedCategory || selectedArea || 'Control Operativo'}
            </h2>
            <p className={`text-xs mt-0.5 ${d ? 'text-slate-400' : 'text-gray-500'}`}>
              {filtered.length} tarjeta{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* View tabs */}
          <div className={`flex items-center p-0.5 rounded-lg border ${d ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'}`}>
            <button onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'kanban'
                ? 'bg-indigo-600 text-white shadow-sm'
                : d ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
              <Kanban size={12}/> Kanban
            </button>
            <button onClick={() => setView('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'gantt'
                ? 'bg-indigo-600 text-white shadow-sm'
                : d ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
              <BarChart2 size={12}/> Gantt
            </button>
          </div>
        </div>

        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          <Plus size={14}/> Nueva Tarjeta
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'kanban' ? (
          <div className="h-full overflow-x-auto overflow-y-hidden p-5">
            <div className="flex gap-4 h-full min-w-max">
              {STATUS_COLS.map(status => (
                <div 
                  key={status} 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                  className={`w-72 flex flex-col rounded-xl border-2 p-3 transition-colors ${d ? COL_BG[status].dark : COL_BG[status].light} ${draggedCardId ? (d ? 'border-indigo-500/50' : 'border-indigo-300') : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${d ? STATUS_BADGE[status] : STATUS_BADGE_LIGHT[status]}`}>{status}</span>
                    <span className={`text-xs ${d ? 'text-slate-500' : 'text-gray-400'}`}>{filtered.filter(c => c.status === status).length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {filtered.filter(c => c.status === status).map(card => (
                      <div 
                        key={card.id} 
                        draggable={canMoveCards}
                        onDragStart={(e) => card.id && handleDragStart(e, card.id)}
                        className={`border rounded-lg p-3 transition-all ${canMoveCards ? 'cursor-grab active:cursor-grabbing' : ''} ${d ? 'bg-slate-800 border-slate-700 hover:border-slate-500' : 'bg-white border-gray-200 hover:border-indigo-300 shadow-sm hover:shadow'}`}
                      >
                        <p className={`text-sm font-medium mb-1 ${d ? 'text-white' : 'text-gray-900'}`}>{card.title}</p>
                        {card.description && <p className={`text-xs line-clamp-2 mb-2 ${d ? 'text-slate-400' : 'text-gray-500'}`}>{card.description}</p>}
                        <div className={`text-[10px] mb-2 font-medium ${d ? 'text-indigo-400' : 'text-indigo-600'}`}>{card.sucursal}</div>
                        <div className="flex items-center justify-between">
                          <select
                            value={card.status}
                            onChange={e => card.id && updateStatus(card.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            disabled={!canMoveCards}
                            className={`text-[10px] border rounded-md px-1.5 py-1 transition-colors ${!canMoveCards ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${d ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                          >
                            {STATUS_COLS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] ${d ? 'text-slate-500' : 'text-gray-400'}`}>
                              {card.created_by || 'Sistema'}
                            </span>
                            <button 
                              onClick={() => card.id && setActiveCommentsCardId(card.id)}
                              className={`p-1.5 rounded-full transition-colors ${d ? 'bg-slate-700 text-slate-300 hover:bg-indigo-500 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600'}`}
                              title="Comentarios / Red Social Interna"
                            >
                              <MessageCircle size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filtered.filter(c => c.status === status).length === 0 && (
                      <div className={`h-20 border-2 border-dashed rounded-lg flex items-center justify-center text-xs ${d ? 'border-slate-700 text-slate-600' : 'border-gray-200 text-gray-400'}`}>
                        Sin tarjetas
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <GanttView cards={filtered as any} isDark={isDark} onStatusChange={updateStatus} />
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl ${d ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-5 border-b ${d ? 'border-slate-800' : 'border-gray-200'}`}>
              <h3 className={`font-bold text-lg ${d ? 'text-white' : 'text-gray-900'}`}>Nueva Tarjeta — {selectedCategory || selectedArea}</h3>
            </div>
            <div className="p-5 space-y-4">
              <input type="text" placeholder="Título de la iniciativa *" className={inp}
                value={newCard.title || ''} onChange={e => setNewCard({...newCard, title: e.target.value})}/>

              <div>
                <label className={`text-xs font-medium mb-1 block ${d ? 'text-slate-400' : 'text-gray-600'}`}>
                  Sucursal <span className="text-red-500">*</span>
                </label>
                <select className={inp} value={newCard.sucursal} onChange={e => setNewCard({...newCard, sucursal: e.target.value})}>
                  <option value="">— Selecciona una sucursal —</option>
                  {SUCURSALES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <textarea placeholder="Descripción / Objetivos..." className={`${inp} h-20 resize-none`}
                value={newCard.description || ''} onChange={e => setNewCard({...newCard, description: e.target.value})}/>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`text-xs mb-1 block ${d ? 'text-slate-400' : 'text-gray-500'}`}>Estado</label>
                  <select className={inp} value={newCard.status} onChange={e => setNewCard({...newCard, status: e.target.value})}>
                    {STATUS_COLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${d ? 'text-slate-400' : 'text-gray-500'}`}>Fecha Inicio</label>
                  <input type="date" className={inp} onChange={e => setNewCard({...newCard, start_date: e.target.value})}/>
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${d ? 'text-slate-400' : 'text-gray-500'}`}>Fecha Fin</label>
                  <input type="date" className={inp} onChange={e => setNewCard({...newCard, end_date: e.target.value})}/>
                </div>
              </div>
            </div>
            <div className={`p-5 border-t flex justify-end gap-3 ${d ? 'border-slate-800' : 'border-gray-200'}`}>
              <button onClick={() => setShowModal(false)} className={`text-sm ${d ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}>Cancelar</button>
              <button onClick={saveCard} disabled={!newCard.title || !newCard.sucursal}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                Guardar Tarjeta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Social Comments Modal */}
      {activeCommentsCardId !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md h-[32rem] shadow-2xl flex flex-col ${d ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            
            {/* Header */}
            <div className={`p-4 border-b flex justify-between items-center ${d ? 'border-slate-800' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <MessageCircle className={`w-5 h-5 ${d ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <h3 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`}>
                  Comentarios
                </h3>
              </div>
              <button 
                onClick={() => setActiveCommentsCardId(null)} 
                className={`text-sm px-2 py-1 rounded-md transition-colors ${d ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                Cerrar
              </button>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(commentsData[activeCommentsCardId] || []).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <MessageCircle className="w-12 h-12 mb-2" />
                  <p className="text-sm">Sin comentarios aún.<br/>Usa @ para mencionar a alguien.</p>
                </div>
              ) : (
                (commentsData[activeCommentsCardId] || []).map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.author === currentUser ? 'items-end' : 'items-start'}`}>
                    <span className={`text-[9px] mb-1 px-1 ${d ? 'text-slate-500' : 'text-gray-400'}`}>
                      {msg.author} • {new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <div className={`text-xs p-3 rounded-2xl max-w-[85%] ${
                      msg.isFile 
                        ? (d ? 'bg-slate-800 border border-slate-700 text-indigo-300' : 'bg-gray-50 border border-gray-200 text-indigo-600 font-medium')
                        : msg.author === currentUser 
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : (d ? 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700' : 'bg-white text-gray-800 rounded-bl-none border border-gray-200 shadow-sm')
                    }`}>
                      {/* Highlight tags */}
                      {msg.text.split(/(@\w+)/g).map((part: string, idx: number) => 
                        part.startsWith('@') ? <span key={idx} className="font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded">{part}</span> : part
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className={`p-3 border-t flex items-end gap-2 ${d ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-gray-50'} rounded-b-2xl`}>
              <button 
                onClick={handleFileUpload}
                className={`p-2 shrink-0 rounded-full transition-colors ${d ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}
                title="Adjuntar Archivo (Max 50MB)"
              >
                <Paperclip size={18} />
              </button>
              
              <div className="flex-1 relative">
                <textarea 
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                  placeholder="Escribe un comentario... Usa @ para notificar"
                  className={`w-full max-h-32 min-h-[40px] resize-none rounded-xl pl-3 pr-8 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${d ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900 shadow-sm'}`}
                />
              </div>

              <button 
                onClick={addComment}
                disabled={!newComment.trim()}
                className="p-2 shrink-0 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
