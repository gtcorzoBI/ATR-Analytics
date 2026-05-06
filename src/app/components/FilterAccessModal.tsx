import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Search, UserPlus, Trash2, ChevronRight, ChevronLeft, Shield, Filter, Check, AlertCircle, Loader2 } from 'lucide-react';

const API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
const DATE_KEYWORDS = ['fecha', 'date', 'año', 'mes', 'periodo', 'year', 'month', 'day', 'calendario', 'time'];

function isDateFilter(name: string) {
  return DATE_KEYWORDS.some(k => name.toLowerCase().includes(k));
}

interface Props {
  dashboardId: string;
  dashboardTitle: string;
  /** raw dashboard components — needed to find connection/query for each slicer */
  dashboardComponents?: any[];
  /** slicer field names auto-detected from the dashboard components */
  detectedFilters: string[];
  allUsers: { id: string; firstName: string; lastName: string; email: string }[];
  token: string;
  onClose: () => void;
}

type Step = 'users' | 'filters';

interface UserFilterEntry {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  filters: Record<string, string[]>; // filterName → ['val1','val2'] | ['__ALL__']
}

export default function FilterAccessModal({
  dashboardId, dashboardTitle, dashboardComponents = [],
  detectedFilters, allUsers, token, onClose
}: Props) {
  const [step, setStep] = useState<Step>('users');
  const [searchUser, setSearchUser] = useState('');
  const [assignedUsers, setAssignedUsers] = useState<UserFilterEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<UserFilterEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Per-filter: available values loaded from the DB, loading state, and search
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({});
  const [filterValuesLoading, setFilterValuesLoading] = useState<Record<string, boolean>>({});
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({});

  // Organisational filters only (exclude date-type)
  const orgFilters = useMemo(() => detectedFilters.filter(f => !isDateFilter(f)), [detectedFilters]);

  // Build a map: fieldName → { connectionId, query } from dashboard components
  const slicerMeta = useMemo(() => {
    const map: Record<string, { connectionId: string; query: string }> = {};
    dashboardComponents.forEach((comp: any) => {
      let vt = comp.visualType || '';
      let code = comp.code || '';
      let connId = comp.connectionId || comp.connection?.connectionId || '';
      let query = comp.query || '';

      // Marketplace widgets might store these in executionJSON / configJSON
      if (comp.executionJSON) {
        try {
          const exec = typeof comp.executionJSON === 'string' ? JSON.parse(comp.executionJSON) : comp.executionJSON;
          if (!code) code = exec.code || '';
          if (!connId) connId = exec.dataSourceId || exec.connectionId || '';
          if (!query) query = exec.rawQuery || exec.query || '';
        } catch (e) {}
      }
      if (comp.configJSON) {
        try {
          const cfg = typeof comp.configJSON === 'string' ? JSON.parse(comp.configJSON) : comp.configJSON;
          if (!code) code = cfg.code || '';
        } catch (e) {}
      }

      if (vt === 'slicer' || code.includes('__dashboardFilters')) {
        const match = code.match(/const FF = (["'`])([^"'`]+)\1/);
        const fieldName = match ? match[2] : comp.name?.replace(/_/g, ' ');
        if (fieldName && connId) {
          map[fieldName] = { connectionId: connId, query: query };
        }
      }
    });
    return map;
  }, [dashboardComponents]);

  // Fetch distinct values for a single filter field
  const fetchFilterValues = useCallback(async (filterName: string) => {
    const meta = slicerMeta[filterName];
    console.log('[FilterAccessModal] fetchFilterValues called for:', filterName, 'with meta:', meta);
    if (!meta?.connectionId || !meta?.query) {
      console.log('[FilterAccessModal] Aborting fetchFilterValues because connectionId or query is missing!');
      return;
    }
    console.log('[FilterAccessModal] Fetching from API...');
    setFilterValuesLoading(prev => ({ ...prev, [filterName]: true }));
    try {
      const res = await fetch(`${API}/api/filter-values`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: meta.connectionId, fieldName: filterName, baseQuery: meta.query })
      });
      const data = await res.json();
      if (data.success) {
        setFilterValues(prev => ({ ...prev, [filterName]: data.values }));
      }
    } catch { /* ignore */ }
    setFilterValuesLoading(prev => ({ ...prev, [filterName]: false }));
  }, [slicerMeta, token]);

  // Load existing access on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/dashboard-access/${encodeURIComponent(dashboardId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setAssignedUsers(data.access.map((a: any) => ({
          userId: a.userId, firstName: a.firstName || '', lastName: a.lastName || '', email: a.email || '',
          filters: a.filters || {}
        })));
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [dashboardId, token]);

  // When entering filter step, prefetch all values
  useEffect(() => {
    if (step === 'filters') {
      orgFilters.forEach(f => {
        if (!filterValues[f] && !filterValuesLoading[f]) fetchFilterValues(f);
      });
    }
  }, [step]);

  const filteredUsers = useMemo(() => {
    const q = searchUser.toLowerCase();
    return allUsers.filter(u => {
      if (assignedUsers.some(a => a.userId === u.id)) return false;
      return !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
    });
  }, [allUsers, assignedUsers, searchUser]);

  const addUser = (u: typeof allUsers[0]) => {
    setAssignedUsers(prev => [...prev, {
      userId: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email,
      filters: Object.fromEntries(orgFilters.map(f => [f, ['__ALL__']]))
    }]);
    setSearchUser('');
  };

  const removeUser = async (userId: string) => {
    setAssignedUsers(prev => prev.filter(a => a.userId !== userId));
    if (selectedEntry?.userId === userId) setSelectedEntry(null);
    try {
      await fetch(`${API}/api/dashboard-access/${encodeURIComponent(dashboardId)}/user/${userId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
    } catch { /* ignore */ }
  };

  const openFilters = (entry: UserFilterEntry) => {
    setSelectedEntry({ ...entry });
    setStep('filters');
  };

  const toggleValue = (filterName: string, value: string) => {
    if (!selectedEntry) return;
    const cur = selectedEntry.filters[filterName] || ['__ALL__'];
    if (value === '__ALL__') {
      setSelectedEntry({ ...selectedEntry, filters: { ...selectedEntry.filters, [filterName]: ['__ALL__'] } });
      return;
    }
    const withoutAll = cur.filter(v => v !== '__ALL__');
    const next = withoutAll.includes(value) ? withoutAll.filter(v => v !== value) : [...withoutAll, value];
    setSelectedEntry({ ...selectedEntry, filters: { ...selectedEntry.filters, [filterName]: next.length ? next : ['__ALL__'] } });
  };

  const saveEntry = async () => {
    if (!selectedEntry) return;
    setSaving(true);
    try {
      await fetch(`${API}/api/dashboard-access`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboardId, userId: selectedEntry.userId, filters: selectedEntry.filters })
      });
      setAssignedUsers(prev => prev.map(a => a.userId === selectedEntry.userId ? { ...selectedEntry } : a));
      setStep('users');
      setSelectedEntry(null);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const saveAll = async () => {
    setSaving(true);
    for (const entry of assignedUsers) {
      try {
        await fetch(`${API}/api/dashboard-access`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ dashboardId, userId: entry.userId, filters: entry.filters })
        });
      } catch { /* ignore */ }
    }
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-indigo-700">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-white/80" />
            <div>
              <h2 className="text-white font-bold text-sm">Asignar Acceso por Filtros</h2>
              <p className="text-indigo-200 text-xs truncate max-w-xs">{dashboardTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-gray-100">
          {([['users', '1', 'Seleccionar Usuarios'], ['filters', '2', 'Configurar Filtros']] as const).map(([id, num, label]) => (
            <button key={id} onClick={() => id === 'users' && setStep('users')}
              className={`flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold transition ${step === id ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step === id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{num}</span>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando asignaciones...
          </div>
        ) : step === 'users' ? (
          /* ── STEP 1: Users ─────────────────────────────────────────────── */
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchUser} onChange={e => setSearchUser(e.target.value)}
                  placeholder="Buscar usuario por nombre o correo..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 transition" />
              </div>
              {searchUser && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-50">
                  {filteredUsers.length === 0
                    ? <p className="px-4 py-3 text-xs text-gray-400">No se encontraron usuarios disponibles.</p>
                    : filteredUsers.map(u => (
                      <button key={u.id} onClick={() => addUser(u)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition text-left">
                        <UserPlus className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {assignedUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Filter className="w-10 h-10 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400 font-medium">Aún no hay usuarios asignados</p>
                  <p className="text-xs text-gray-300 mt-1">Usa el buscador para agregar personas a este dashboard.</p>
                </div>
              ) : assignedUsers.map(entry => {
                const restrictedCount = Object.values(entry.filters).filter(v => !v.includes('__ALL__')).length;
                return (
                  <div key={entry.userId} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                      {entry.firstName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-800">{entry.firstName} {entry.lastName}</div>
                      <div className="text-xs text-gray-400">{entry.email}</div>
                      {orgFilters.length > 0 && (
                        <div className="text-[10px] mt-0.5 text-indigo-500 font-semibold">
                          {restrictedCount === 0 ? '✓ Acceso completo' : `${restrictedCount} filtro(s) restringido(s)`}
                        </div>
                      )}
                    </div>
                    {orgFilters.length > 0 && (
                      <button onClick={() => openFilters(entry)}
                        className="text-xs font-bold px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shrink-0 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Filtros <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={() => removeUser(entry.userId)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 px-4 py-4 border-t border-gray-100">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-500 hover:bg-gray-100 rounded-xl font-bold transition">Cancelar</button>
              <button onClick={saveAll} disabled={saving || assignedUsers.length === 0}
                className="flex-[2] py-2.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Check className="w-4 h-4" /> Guardar Accesos ({assignedUsers.length})</>}
              </button>
            </div>
          </div>

        ) : (
          /* ── STEP 2: Configure filters for a user ───────────────────────── */
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <button onClick={() => { setStep('users'); setSelectedEntry(null); }}
                className="p-1 hover:bg-gray-200 rounded transition">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-sm font-bold text-gray-700">
                Filtros para <span className="text-indigo-600">{selectedEntry?.firstName} {selectedEntry?.lastName}</span>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {orgFilters.map(filterName => {
                const cur = selectedEntry?.filters[filterName] || ['__ALL__'];
                const isAll = cur.includes('__ALL__');
                const available = filterValues[filterName] || [];
                const isLoadingValues = filterValuesLoading[filterName];
                const searchQ = (filterSearch[filterName] || '').toLowerCase();
                const visibleOptions = searchQ ? available.filter(v => v.toLowerCase().includes(searchQ)) : available;
                const hasMeta = !!slicerMeta[filterName]?.connectionId;

                return (
                  <div key={filterName} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Filter header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-indigo-500" /> {filterName}
                        {isLoadingValues && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
                      </span>
                      <div className="flex items-center gap-2">
                        {!hasMeta && (
                          <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">Sin conexión</span>
                        )}
                        <button onClick={() => toggleValue(filterName, '__ALL__')}
                          className={`text-[10px] font-black px-2 py-1 rounded-lg transition ${isAll ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500 hover:bg-indigo-100'}`}>
                          TODOS
                        </button>
                      </div>
                    </div>

                    <div className="p-3">
                      {/* Real values from DB — shown as checkboxes if available */}
                      {isLoadingValues && (
                        <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando valores desde la base de datos...
                        </div>
                      )}

                      {hasMeta && available.length === 0 && !isLoadingValues && (
                        <button onClick={() => fetchFilterValues(filterName)}
                          className="text-xs text-indigo-600 font-semibold hover:underline mb-3 block">
                          ↺ Extraer opciones de la base de datos
                        </button>
                      )}

                      {available.length > 0 && (
                        <div className="mb-4">
                          {/* Search within filter values */}
                          <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <input
                              value={filterSearch[filterName] || ''}
                              onChange={e => setFilterSearch(prev => ({ ...prev, [filterName]: e.target.value }))}
                              placeholder={`Buscar en ${filterName}...`}
                              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                            />
                          </div>
                          <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1">
                            {visibleOptions.map(val => {
                              const checked = !isAll && cur.includes(val);
                              return (
                                <label key={val}
                                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition ${checked ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}
                                    onClick={() => toggleValue(filterName, val)}>
                                    {checked && <Check className="w-2.5 h-2.5 text-white" />}
                                  </div>
                                  <span className={`text-xs ${checked ? 'font-semibold text-indigo-700' : 'text-gray-600'}`}>{val}</span>
                                </label>
                              );
                            })}
                            {visibleOptions.length === 0 && (
                              <p className="text-xs text-gray-400 italic px-2 py-2">Sin resultados para "{filterSearch[filterName]}"</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ALWAYS show manual input fallback */}
                      <div className={available.length > 0 ? "pt-3 border-t border-gray-100" : ""}>
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1.5">
                          {available.length > 0 ? "O añadir valor manualmente" : "Ingresar valor manualmente"}
                        </p>
                        <input
                          placeholder={`Escribir valor y presionar Enter...`}
                          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 mb-2"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              toggleValue(filterName, e.currentTarget.value.trim());
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        {!isAll && cur.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {cur.map(v => (
                              <span key={v} className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">
                                {v} <button onClick={() => toggleValue(filterName, v)} className="hover:text-red-500">×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {isAll && available.length === 0 && !isLoadingValues && (
                        <p className="text-xs text-gray-400 italic mt-1">Sin restricción — el usuario verá todos los valores.</p>
                      )}
                      {isAll && available.length > 0 && (
                        <p className="text-xs text-gray-400 italic mt-2">Sin restricción activa — haz clic en un valor para restringir.</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {detectedFilters.some(isDateFilter) && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Filtros de fecha ({detectedFilters.filter(isDateFilter).join(', ')}) están abiertos por defecto — no requieren restricción de acceso.
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => { setStep('users'); setSelectedEntry(null); }}
                className="flex-1 py-2.5 text-sm text-gray-500 hover:bg-gray-100 rounded-xl font-bold transition">
                Cancelar
              </button>
              <button onClick={saveEntry} disabled={saving}
                className="flex-[2] py-2.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Check className="w-4 h-4" /> Guardar Filtros</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
