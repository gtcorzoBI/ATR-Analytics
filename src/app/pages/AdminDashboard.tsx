import { useState, useEffect } from "react";
import Header from "../components/Header";
import { AdminUserCreation, AGENCIES } from "../components/AdminUserCreation";
import { useDataStore, INITIAL_AREAS, INITIAL_DASHBOARDS_MAP, AREA_NAMES } from "../hooks/useDataStore";
import { ChevronDown, ChevronRight, MoreVertical, ShieldCheck, Shield, Trash2, KeyRound, Building2, Save, Mail, Eye, EyeOff, Archive, Trash } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3001`;

export default function AdminDashboard() {
  const { 
    createUser, 
    assignUserToArea, 
    removeUserFromArea,
    removeUserFromDashboard,
    assignUserToDashboard, 
    getRegularUsers,
    deleteUser,
    adminResetPassword,
    updateUserAgencies,
    smtpSettings,
    saveSmtpSettings,
    publishedDashboards,
    approveDashboard,
    deletePublishedDashboard,
    systemDashboards,
    hideDashboard,
    archiveDashboard,
    deleteSystemDashboard
  } = useDataStore();
  
  const [expandedAreas, setExpandedAreas] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [localSmtp, setLocalSmtp] = useState(smtpSettings);
  
  useEffect(() => {
    setLocalSmtp(smtpSettings);
  }, [smtpSettings]);

  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    saveSmtpSettings(localSmtp);
    alert("Configuración SMTP guardada correctamente.");
  };

  const sendEmail = async (recipient: string, subject: string, body: string) => {
    if (!smtpSettings.host || !smtpSettings.user || !smtpSettings.password) {
      console.warn("SMTP settings not configured correctly. Skipping email.");
      return;
    }
    try {
      const mailApi = import.meta.env.VITE_MAIL_API_URL || `${window.location.protocol}//${window.location.hostname}:3002`;
      const response = await fetch(`${mailApi}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpSettings,
          emailDetails: { recipient, subject, body }
        })
      });
      const data = await response.json();
      if (!data.success) {
        console.error("Error sending email:", data.error);
        alert(`Error al enviar correo: ${data.error}`);
      } else {
        console.log("Email sent successfully!");
      }
    } catch (err) {
      console.error("Failed to connect to email engine:", err);
      alert("No se pudo conectar con el motor de correos.");
    }
  };

  const [assignmentModal, setAssignmentModal] = useState<{
    isOpen: boolean;
    type: 'area' | 'dashboard';
    areaId: string;
    dashboardId?: string;
    title: string;
  }>({
    isOpen: false,
    type: 'area',
    areaId: '',
    title: ''
  });

  const [editAgenciesModal, setEditAgenciesModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    selected: string[];
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    selected: []
  });

  const toggleArea = (area: string) => {
    setExpandedAreas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    pubId: string;
    dashName: string;
    areaId: string;
  }>({
    isOpen: false,
    pubId: '',
    dashName: '',
    areaId: ''
  });

  const handleApprove = (pubId: string, areaId: string) => {
    approveDashboard(pubId, areaId);
    setApprovalModal({...approvalModal, isOpen: false});
    alert("Dashboard aprobado y asignado al área correctamente.");
  };

  const handleAssignClick = (type: 'area'|'dashboard', areaId: string, dashboardId?: string, title?: string) => {
    setSearchQuery("");
    setAssignmentModal({
      isOpen: true,
      type,
      areaId,
      dashboardId,
      title: title || ''
    });
  };

  const handleCreateUserWrapper = async (userData: any) => {
    const createdUser = await createUser(userData); // Adjust hook if necessary to return user or just use optimistic logic and fetch token

    // Instead of directly calling, we first request a magic token
    let magicTokenUrl = "";
    try {
      const token = localStorage.getItem("atr_token");
      // Use createdUser id if returned, else use logic inside hook
      const res = await fetch(`${API_BASE}/api/auth/magic-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ userId: createdUser?.id || userData.email }) // Assuming backend uses id
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
          magicTokenUrl = `${baseUrl}/login?token=${d.token}`;
        }
      }
    } catch (e) { console.error("Error generating magic token", e); }

    if(smtpSettings.tplWelcome) {
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const loginUrl = magicTokenUrl || `${baseUrl}/login`;
      const body = smtpSettings.tplWelcome
        .replace(/{{name}}/g, userData.firstName)
        .replace(/{{email}}/g, userData.email)
        .replace(/{{password}}/g, userData.password)
        .replace(/{{url}}/g, loginUrl);
      sendEmail(userData.email, "Bienvenido a ATR Analytics", body);
    }
  };

  const submitAssignment = (userId: string) => {
    if(!userId) return;
    const user = getRegularUsers().find(u => u.id === userId);
    
    if (assignmentModal.type === 'area') {
      assignUserToArea(userId, assignmentModal.areaId);
      if(smtpSettings.tplArea && user) {
        const body = smtpSettings.tplArea
          .replace('{{name}}', user.firstName)
          .replace('{{area}}', AREA_NAMES[assignmentModal.areaId]);
        sendEmail(user.email, "Nueva área asignada", body);
      }
    } else if (assignmentModal.type === 'dashboard' && assignmentModal.dashboardId) {
      assignUserToDashboard(userId, assignmentModal.areaId, assignmentModal.dashboardId);
      if(smtpSettings.tplDashboard && user) {
        const tpl = smtpSettings.tplDashboard || "";
        const body = tpl
          .replace('{{name}}', user.firstName)
          .replace('{{area}}', AREA_NAMES[assignmentModal.areaId])
          .replace('{{dashboard}}', assignmentModal.title);
        sendEmail(user.email, "Nuevo dashboard asignado", body);
      }
    }
    setAssignmentModal({...assignmentModal, isOpen: false});
    alert("Usuario asignado correctamente");
  };

  const handleDeleteUser = (userId: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${name}?`)) {
      deleteUser(userId);
    }
  };

  const handleResetPassword = async (userId: string, name: string) => {
    const newPass = window.prompt(`Ingresa una nueva contraseña temporal para ${name}\nEl usuario deberá cambiarla en su siguiente inicio de sesión:`);
    if (newPass) {
      if (newPass.length < 6) return alert("La contraseña debe tener mínimo 6 caracteres.");
      adminResetPassword(userId, newPass);
      
      let magicTokenUrl = "";
      try {
        const token = localStorage.getItem("atr_token");
        const res = await fetch(`${API_BASE}/api/auth/magic-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ userId: userId })
        });
        if (res.ok) {
          const d = await res.json();
          if (d.success) {
            const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
            magicTokenUrl = `${baseUrl}/login?token=${d.token}`;
          }
        }
      } catch (e) { console.error("Error generating magic token", e); }

      const user = getRegularUsers().find(u => u.id === userId);
      if(smtpSettings.tplPassword && user) {
        const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const loginUrl = magicTokenUrl || `${baseUrl}/login`;
        const body = smtpSettings.tplPassword
          .replace(/{{name}}/g, user.firstName)
          .replace(/{{password}}/g, newPass)
          .replace(/{{url}}/g, loginUrl);
        sendEmail(user.email, "Restablecimiento de contraseña", body);
      }
      alert("Contraseña restablecida exitosamente.");
    }
  };

  const openEditAgencies = (userId: string, userName: string, currentAgencies: string[]) => {
    setEditAgenciesModal({
      isOpen: true,
      userId,
      userName,
      selected: [...currentAgencies]
    });
  };

  const toggleModalAgency = (agency: string) => {
    setEditAgenciesModal(prev => ({
      ...prev,
      selected: prev.selected.includes(agency) 
        ? prev.selected.filter(a => a !== agency)
        : [...prev.selected, agency]
    }));
  };

  const submitEditAgencies = () => {
    if (editAgenciesModal.selected.length === 0) {
      return alert("Debe seleccionar al menos una agencia.");
    }
    updateUserAgencies(editAgenciesModal.userId, editAgenciesModal.selected);
    setEditAgenciesModal(prev => ({ ...prev, isOpen: false }));
  };

  const renderAssignmentModal = () => {
    if (!assignmentModal.isOpen) return null;

    const filteredUsers = getRegularUsers().filter(u => {
      const query = searchQuery.toLowerCase();
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      const agencyMatch = u.agencies && u.agencies.some((ag: string) => ag.toLowerCase().includes(query));
      return fullName.includes(query) || u.email.toLowerCase().includes(query) || (u.agency && u.agency.toLowerCase().includes(query)) || agencyMatch;
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-2 text-gray-900">Asignar Acceso</h3>
          <p className="text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
            Selecciona a qué usuario se le otorgará acceso a <br/>
            <strong>{assignmentModal.title}</strong>
          </p>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar por nombre, correo o agencia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
            />
          </div>

          <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
            {getRegularUsers().length === 0 ? (
              <p className="text-sm text-gray-500 italic">No hay cuentas de usuario normales creadas. Crea una en el panel derecho.</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-sm text-gray-500 italic py-2 text-center">No se encontraron usuarios que coincidan con la búsqueda.</p>
            ) : (
              filteredUsers.map(user => {
                let hasAccess = false;
                if (assignmentModal.type === 'area') {
                  hasAccess = user.permissions?.areas?.includes(assignmentModal.areaId) || false;
                } else {
                  hasAccess = user.permissions?.dashboards?.includes(`${assignmentModal.areaId}/${assignmentModal.dashboardId}`) ||
                              user.permissions?.areas?.includes(assignmentModal.areaId) || false;
                }
                
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{user.firstName} {user.lastName}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                    {hasAccess ? (
                      <button
                        onClick={() => {
                          if (assignmentModal.type === 'area') {
                            removeUserFromArea(user.id, assignmentModal.areaId);
                          } else if (assignmentModal.dashboardId) {
                            removeUserFromDashboard(user.id, assignmentModal.areaId, assignmentModal.dashboardId);
                          }
                          setAssignmentModal({...assignmentModal, isOpen: false});
                        }}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded transition"
                      >
                        Quitar Acceso
                      </button>
                    ) : (
                      <button 
                        onClick={() => submitAssignment(user.id)}
                        className="text-xs bg-[#E85D5D] hover:bg-[#DC2626] text-white px-3 py-1.5 rounded transition"
                      >
                        Otorgar Acceso
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button 
              onClick={() => setAssignmentModal({...assignmentModal, isOpen: false})}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditAgenciesModal = () => {
    if (!editAgenciesModal.isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-2 text-gray-900">Editar Agencias</h3>
          <p className="text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
            Modifica las agencias asignadas a <strong>{editAgenciesModal.userName}</strong>
          </p>

          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-gray-50 mb-6">
            {AGENCIES.map(ag => (
              <label key={ag} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-[#E85D5D] focus:ring-[#E85D5D]"
                  checked={editAgenciesModal.selected.includes(ag)}
                  onChange={() => toggleModalAgency(ag)}
                />
                <span className="text-sm text-gray-700 font-medium">{ag}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button 
              onClick={() => setEditAgenciesModal({...editAgenciesModal, isOpen: false})}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition"
            >
              Cancelar
            </button>
            <button 
              onClick={submitEditAgencies}
              className="px-4 py-2 bg-[#E85D5D] hover:bg-[#DC2626] text-white rounded-lg text-sm transition"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    );
  };

  const isUserActive = (lastActiveAt?: string) => {
    if (!lastActiveAt) return false;
    const activeTime = new Date(lastActiveAt).getTime();
    const now = new Date().getTime();
    return (now - activeTime) < 120000;
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short'});
  };

  return (
    <div className="flex h-screen bg-gray-50 flex-col">
      <Header />
      
      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        
        {/* Fila principal: Zonas/Dashboards y Creación */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Lado izquierdo: Zonas y Dashboards */}
          <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Acceso y Visibilidad</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Asigna permisos a usuarios para acceder a áreas completas o a dashboards específicos.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 text-sm text-gray-500">
                <ShieldCheck className="w-5 h-5 text-gray-400" /> Vista Administrador Total
              </div>
            </div>
            
            <div className="space-y-4">
              {INITIAL_AREAS.map(area => {
                const isExpanded = expandedAreas.includes(area);
                const dashboards = systemDashboards[area] || [];
                
                return (
                  <div key={area} className="border border-gray-200 rounded-lg overflow-hidden">
                    
                    {/* Fila del Área */}
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition">
                      <button 
                        onClick={() => toggleArea(area)} 
                        className="flex items-center gap-2 font-semibold text-gray-800 flex-1 text-left"
                      >
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500"/>}
                        {AREA_NAMES[area]}
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-2">
                          {dashboards.length} dashboards
                        </span>
                      </button>
                      
                      <button 
                        onClick={() => handleAssignClick('area', area, undefined, `Área: ${AREA_NAMES[area]}`)}
                        className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 text-gray-600 transition"
                        title="Asignar permisos al área"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Fila de los Dashboards */}
                    {isExpanded && (
                      <div className="bg-white border-t border-gray-200 divide-y divide-gray-100">
                        {dashboards.length === 0 ? (
                          <div className="p-4 text-sm text-gray-500 pl-11">No hay dashboards.</div>
                        ) : (
                          dashboards.map(dashboard => (
                            <div key={dashboard.id} className="px-4 py-3 flex items-center justify-between pl-11 hover:bg-red-50/30 transition">
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Shield className="w-4 h-4 text-indigo-400" />
                                <span className={dashboard.hidden ? 'opacity-40 italic' : ''}>
                                  {dashboard.title} {dashboard.hidden && "(Oculto)"} {dashboard.archived && "(Archivado)"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => hideDashboard(area, dashboard.id)}
                                  className={`p-1.5 rounded-lg transition ${dashboard.hidden ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-50'}`}
                                  title={dashboard.hidden ? "Mostrar Dashboard" : "Ocultar Dashboard"}
                                >
                                  {dashboard.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => { if(window.confirm("¿Archivar este dashboard?")) archiveDashboard(area, dashboard.id); }}
                                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                  title="Archivar"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { if(window.confirm("¿Eliminar este dashboard permanentemente?")) deleteSystemDashboard(area, dashboard.id); }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Eliminar"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleAssignClick('dashboard', area, dashboard.id.toString(), `Dashboard: ${dashboard.title}`)}
                                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition"
                                  title="Asignar permisos al dashboard"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Published Queue */}
            {publishedDashboards.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                  <h3 className="text-lg font-bold text-gray-900">Nuevos Dashboards (Publicados por DEV)</h3>
                </div>
                <div className="space-y-3">
                  {publishedDashboards.map(pub => (
                    <div key={pub.id} className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-900">{pub.name}</span>
                          <span className="text-[10px] bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">PENDIENTE</span>
                        </div>
                        <p className="text-xs text-indigo-700 mt-0.5">
                          Enviado por: <strong>{pub.publishedBy}</strong> — <span className="italic">Pendiente de asignar área</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => deletePublishedDashboard(pub.id)}
                          className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-100 rounded-lg font-medium transition"
                        >
                          Rechazar
                        </button>
                        <button 
                          onClick={() => setApprovalModal({ isOpen: true, pubId: pub.id, dashName: pub.name, areaId: pub.area })}
                          className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition"
                        >
                          Aprobar y Asignar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lado derecho: Creación de Usuarios */}
          <div className="w-full lg:w-96 flex-shrink-0">
            <AdminUserCreation onCreate={handleCreateUserWrapper} />
          </div>
        </div>

        {/* Fila secundaria: Lista de Usuarios del Sistema */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Usuarios del Sistema</h2>
              <p className="text-gray-500 text-sm mt-1">Directorio de todos los usuarios creados, sus agencias y rastreo de conexión.</p>
            </div>
            <div className="w-full md:w-64">
              <input
                type="text"
                placeholder="Buscar usuario, correo o agencia..."
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Nombre</th>
                  <th className="px-4 py-3">Áreas Asignadas</th>
                  <th className="px-4 py-3">Agencias</th>
                  <th className="px-4 py-3">Último Tablero Visto</th>
                  <th className="px-4 py-3">Estado y Conexiones</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  const query = tableSearchQuery.toLowerCase();
                  const filtered = getRegularUsers().filter(u => {
                    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
                    const agencyMatch = u.agencies && u.agencies.some((ag: string) => ag.toLowerCase().includes(query));
                    return fullName.includes(query) || u.email.toLowerCase().includes(query) || (u.agency && u.agency.toLowerCase().includes(query)) || agencyMatch;
                  });

                  if (getRegularUsers().length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">No hay usuarios registrados aún.</td>
                      </tr>
                    );
                  }

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">No se encontraron usuarios que coincidan con la búsqueda.</td>
                      </tr>
                    );
                  }

                  return filtered.map(u => {
                    const fullName = `${u.firstName} ${u.lastName}`;
                    const active = isUserActive(u.lastActiveAt);
                    const agenciesList = u.agencies && u.agencies.length > 0 ? u.agencies : (u.agency ? [u.agency] : []);
                    const limitAgencies = agenciesList.slice(0, 2);
                    const extraAgencies = agenciesList.length - 2;

                    return (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{fullName}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {u.permissions && u.permissions.areas && u.permissions.areas.length > 0 ? (
                              u.permissions.areas.map((areaId: string) => (
                                <span key={areaId} className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                                  {AREA_NAMES[areaId]}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">Sin áreas</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {limitAgencies.map((ag:string) => (
                              <span key={ag} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded border border-gray-200">
                                {ag.replace("INFINITI", "INF.")}
                              </span>
                            ))}
                            {extraAgencies > 0 && (
                              <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded border border-gray-200" title={agenciesList.join(", ")}>
                                +{extraAgencies}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-medium text-gray-700">
                           {u.lastDashboardViewed ? u.lastDashboardViewed : <span className="text-gray-400 font-normal italic">Ninguno</span>}
                        </td>

                        <td className="px-4 py-3">
                           {active ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full mb-1">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                              Activo Ahora
                            </span>
                           ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full mb-1">
                              Sesión
                              <span className="text-gray-500 font-normal ml-1">
                                {formatDateShort(u.lastLoginAt) || 'Nunca'}
                              </span>
                            </span>
                           )}
                           <div className="text-[10px] text-gray-400 mt-0.5">
                             Previa: {formatDateShort(u.previousLoginAt) || 'Sin historial'}
                           </div>
                        </td>

                        <td className="px-4 py-3 flex justify-end gap-1">
                          <button 
                            onClick={() => openEditAgencies(u.id, fullName, agenciesList)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Modificar Agencias"
                          >
                            <Building2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleResetPassword(u.id, fullName)}
                            className="p-1.5 text-gray-400 hover:text-[#E85D5D] hover:bg-red-50 rounded-lg transition"
                            title="Modificar Contraseña"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id, fullName)}
                            className="p-1.5 text-gray-400 hover:text-[#E85D5D] hover:bg-red-50 rounded-lg transition"
                            title="Eliminar Cuenta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fila Terca: Ajustes SMTP */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configuración de Correo (SMTP)</h2>
              <p className="text-gray-500 text-sm mt-1">Define el servidor y las credenciales desde donde el sistema enviará correos.</p>
            </div>
          </div>

          <form onSubmit={handleSaveSmtp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Servidor SMTP (Host)</label>
              <input
                type="text"
                placeholder="ej: smtp.gmail.com"
                value={localSmtp?.host || ""}
                onChange={(e) => setLocalSmtp({...localSmtp, host: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puerto Server</label>
              <input
                type="number"
                placeholder="587 o 465"
                value={localSmtp?.port || ""}
                onChange={(e) => setLocalSmtp({...localSmtp, port: Number(e.target.value)})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Remitente</label>
              <input
                type="text"
                placeholder="ATR Analytics"
                value={localSmtp?.fromName || ""}
                onChange={(e) => setLocalSmtp({...localSmtp, fromName: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Remitente (Usuario)</label>
              <input
                type="email"
                placeholder="Reportes@..."
                value={localSmtp?.user || ""}
                onChange={(e) => setLocalSmtp({...localSmtp, user: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de Aplicación</label>
              <input
                type="password"
                placeholder="********"
                value={localSmtp?.password || ""}
                onChange={(e) => setLocalSmtp({...localSmtp, password: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
                required
              />
            </div>
            
            <div className="lg:col-span-3 mt-4 border-t border-gray-100 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Plantillas de Correo Electrónico</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bienvenida (Nuevo Usuario)</label>
                  <textarea
                    rows={4}
                    value={localSmtp?.tplWelcome || ""}
                    onChange={(e) => setLocalSmtp({...localSmtp, tplWelcome: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
                    placeholder="Escribe el mensaje..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Variables: <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{email}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{password}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{url}}'}</code></p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asignación de Área</label>
                  <textarea
                    rows={4}
                    value={localSmtp?.tplArea || ""}
                    onChange={(e) => setLocalSmtp({...localSmtp, tplArea: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
                  />
                  <p className="text-xs text-gray-500 mt-1">Variables: <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{area}}'}</code></p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asignación de Dashboard</label>
                  <textarea
                    rows={4}
                    value={localSmtp?.tplDashboard || ""}
                    onChange={(e) => setLocalSmtp({...localSmtp, tplDashboard: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
                  />
                  <p className="text-xs text-gray-500 mt-1">Variables: <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{area}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{dashboard}}'}</code></p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cambio de Contraseña (Admin Reset)</label>
                  <textarea
                    rows={4}
                    value={localSmtp?.tplPassword || ""}
                    onChange={(e) => setLocalSmtp({...localSmtp, tplPassword: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#E85D5D] focus:border-[#E85D5D]"
                  />
                  <p className="text-xs text-gray-500 mt-1">Variables: <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{password}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{url}}'}</code></p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 flex justify-end">
              <button 
                type="submit"
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
              >
                <Save className="w-4 h-4" />
                Guardar Configuración
              </button>
            </div>
          </form>

          <div className="mt-6 bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
            <strong>Tip para Gmail:</strong> Recuerda que si usas Gmail directamente (smtp.gmail.com) necesitas usar una <strong>Contraseña de Aplicación</strong>, no la contraseña normal de la cuenta de Google.
          </div>
        </div>

      </main>

      {/* Modals */}
      {renderAssignmentModal()}
      {renderEditAgenciesModal()}

      {/* Approval Modal */}
      {approvalModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-2">Aprobar Dashboard</h3>
            <p className="text-sm text-gray-600 mb-6">
              ¿En qué área deseas publicar <strong>{approvalModal.dashName}</strong>?
            </p>
            
            <div className="space-y-2 mb-6">
              {INITIAL_AREAS.map(areaId => (
                <button
                  key={areaId}
                  onClick={() => setApprovalModal({...approvalModal, areaId})}
                  className={`w-full text-left px-4 py-2 rounded-lg border transition ${
                    approvalModal.areaId === areaId ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {AREA_NAMES[areaId]}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button 
                onClick={() => setApprovalModal({...approvalModal, isOpen: false})}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button 
                disabled={!approvalModal.areaId}
                onClick={() => handleApprove(approvalModal.pubId, approvalModal.areaId)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold disabled:opacity-50"
              >
                Confirmar y Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
