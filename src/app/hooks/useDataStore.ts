import { useState, useEffect } from "react";

// Mock data definitions based on existing ones
export const INITIAL_AREAS = [
  "posventa",
  "comercial",
  "administracion",
  "financiamiento",
  "marketing",
  "rh",
  "comisiones",
  "bi",
  "gerencia",
];

export const AREA_NAMES: Record<string, string> = {
  posventa: "Posventa",
  comercial: "Comercial",
  administracion: "Administración",
  financiamiento: "Financiamiento",
  marketing: "Marketing",
  rh: "Recursos Humanos",
  comisiones: "Cálculo de Comisiones",
  bi: "Intelligence (BI)",
  gerencia: "Gerencia General",
};

export const INITIAL_DASHBOARDS_MAP: Record<string, any[]> = {
  posventa: [
    { id: 1, title: "INTERESES DAS", description: "Se actualiza una vez al día", category: "Posventa" },
    { id: 2, title: "INTERESES DAS", description: "Se actualiza una vez al día", category: "Posventa" },
    { id: 3, title: "INTERESES DAS", description: "Se actualiza una vez al día", category: "Posventa" },
  ],
  comercial: [
    { id: 1, title: "INTERESES DAS", description: "Se actualiza una vez al día", category: "Comercial" },
  ],
  administracion: [
    { id: 1, title: "INTERESES DAS", description: "Se actualiza una vez al día", category: "Administración" },
  ],
  financiamiento: [
    { id: 1, title: "INTERESES DAS", description: "Se actualiza una vez al día", category: "Financiamiento" },
  ],
  marketing: [
    { id: 1, title: "INTERESES DAS", description: "Se actualiza una vez al día", category: "Marketing" },
  ],
  rh: [
    { id: 1, title: "INTERESES DAS", description: "Se actualiza una vez al día", category: "RH" },
  ],
  comisiones: [
    { id: 1, title: "INTERESES DAS", description: "Se actualiza una vez al día", category: "Comisiones" },
  ],
};

export const mockHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
};

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "user" | "dev";
  agencies: string[];
  agency?: string; // Legacy support
  mustChangePassword?: boolean;
  password?: string;
  previousLoginAt?: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
  lastDashboardViewed?: string;
  permissions: {
    areas: string[];
    dashboards: string[];
  };
}

const INITIAL_USERS: User[] = [
  {
    id: "1",
    firstName: "Admin",
    lastName: "User",
    email: "admin@atr.com",
    role: "admin",
    agencies: ["ATR Matriz", "ATR Sucursal"],
    password: mockHash("admin123"),
    permissions: { areas: [], dashboards: [] }
  },
  {
    id: "2",
    firstName: "Dev",
    lastName: "User",
    email: "dev@atr.com",
    role: "dev",
    agencies: ["ATR Matriz"],
    password: mockHash("dev123"),
    permissions: { areas: [], dashboards: [] }
  }
];

// ─── Shared State Manager ───────────────────────────────────────────────────
// This ensures that all components share the same state and persist it.
let listeners: Array<() => void> = [];
const notify = () => listeners.forEach(l => l());

let internal_users: User[] = JSON.parse(localStorage.getItem("atr_users") || "null") || INITIAL_USERS;
let internal_smtp: any = JSON.parse(localStorage.getItem("atr_smtp") || "{}");

const API = "http://localhost:3001";

// Helper: generic fetch and parse
const fetchFromBackend = async (endpoint: string) => {
  const token = localStorage.getItem("atr_token");
  if (!token) return null;
  try {
    const res = await fetch(`${API}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
    }
  } catch (err) { console.error(`Could not fetch ${endpoint}`, err); }
  return null;
};

let internal_templates: any = JSON.parse(localStorage.getItem("atr_mail_templates") || "null") || {
  welcome: "Bienvenido a DataCanvas O.S.",
  area: "Se te ha asignado una nueva área.",
  dash: "Nuevo dashboard disponible.",
  pass: "Tu contraseña ha sido restablecida."
};
let internal_sources: any[] = JSON.parse(localStorage.getItem("atr_dev_sources") || "[]");
let internal_measures: any[] = JSON.parse(localStorage.getItem("atr_dev_measures") || "[]");
let internal_canvas: any[] = JSON.parse(localStorage.getItem("atr_dev_canvas") || "[]");
let internal_published: any[] = JSON.parse(localStorage.getItem("atr_published_dashboards") || "[]");
let internal_system: Record<string, any[]> = JSON.parse(localStorage.getItem("atr_system_dashboards") || "null") || INITIAL_DASHBOARDS_MAP;
let internal_drafts: any[] = []; // Drafts are always loaded from backend, not localStorage

// Fetch all data from backend helper
const fetchAllDataFromBackend = async () => {
  const usersData = await fetchFromBackend('/api/users');
  if (usersData && usersData.users) {
    internal_users = usersData.users;
    localStorage.setItem("atr_users", JSON.stringify(internal_users));
  }

  const devAssets = await fetchFromBackend('/api/dev/assets');
  if (devAssets) {
    internal_sources = devAssets.sources || [];
    internal_measures = devAssets.measures || [];
    internal_canvas = devAssets.canvas || [];
    internal_published = devAssets.publishedDashboards || [];

    // Merge DB system dashboards with defaults (DB takes precedence or overwrites completely if populated)
    if (Object.keys(devAssets.systemDashboards || {}).length > 0) {
      internal_system = devAssets.systemDashboards;
    }

    // Prune rows before saving to localStorage to stay within 5MB quota
    const liteSources = internal_sources.map((s: any) => ({ ...s, rows: [] }));
    const liteMeasures = internal_measures.map((m: any) => ({ ...m, rows: [] }));
    const liteCanvas = internal_canvas.map((c: any) => ({ ...c, rows: [] }));

    try {
      localStorage.setItem("atr_dev_sources", JSON.stringify(liteSources));
      localStorage.setItem("atr_dev_measures", JSON.stringify(liteMeasures));
      localStorage.setItem("atr_dev_canvas", JSON.stringify(liteCanvas));
      localStorage.setItem("atr_published_dashboards", JSON.stringify(internal_published));
      localStorage.setItem("atr_system_dashboards", JSON.stringify(internal_system));
    } catch (e) {
      console.warn("Storage quota exceeded, could not persist all dev assets to LocalStorage.", e);
    }
  }

  // Fetch drafts separately (metadata only, no heavy data)
  const draftsData = await fetchFromBackend('/api/dev/drafts');
  if (draftsData && draftsData.drafts) {
    internal_drafts = draftsData.drafts;
  }

  notify();
};

// --- Utilities to prune heavy data before syncing ---
const stripDataRows = (item: any): any => {
  if (typeof item !== 'object' || item === null) return item;
  if (Array.isArray(item)) return item.map(stripDataRows);
  
  const { rows, ...rest } = item;
  
  // Recursively handle components within dashboards or other structures
  if (rest.components && Array.isArray(rest.components)) {
    rest.components = rest.components.map(stripDataRows);
  }
  
  return rest;
};

const serializeLite = (val: any): string => {
  if (!val) return JSON.stringify(val);
  return JSON.stringify(stripDataRows(val));
};

const persistBackend = async (endpoint: string, method: string, body?: any) => {
  const token = localStorage.getItem("atr_token");
  if (!token) return;
  try {
    await fetch(`${API}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (err) { console.error(`Error syncing ${endpoint}`, err); }
};

export const useDataStore = () => {
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);

  useEffect(() => {
    listeners.push(forceUpdate);
    
    // Fetch initial fresh data from DB on mount if possible
    fetchAllDataFromBackend();

    // Cross-tab sync: Listen for localStorage changes from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("atr_")) {
        // Reload internal state from localStorage
        internal_users = JSON.parse(localStorage.getItem("atr_users") || "null") || INITIAL_USERS;
        internal_published = JSON.parse(localStorage.getItem("atr_published_dashboards") || "[]");
        internal_system = JSON.parse(localStorage.getItem("atr_system_dashboards") || "null") || INITIAL_DASHBOARDS_MAP;
        forceUpdate();
      }
    };
    window.addEventListener("storage", handleStorage);
    
    return () => { 
      listeners = listeners.filter(l => l !== forceUpdate); 
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const persist = (key: string, val: any) => {
    try {
      // Don't save actual data rows in localStorage, it's too heavy (Limit 5MB)
      const liteString = serializeLite(val);
      localStorage.setItem(key, liteString);
    } catch (e) {
      console.warn(`LocalStorage quota exceeded for key: ${key}. Data was not saved locally.`);
    }
    notify();
  };

  return {
    // Auth & Users
    users: internal_users,
    createUser: async (u: User) => {
      // Optimistic update
      const tempId = Date.now().toString();
      const newUser = { ...u, id: tempId, password: mockHash(u.password || '123456'), mustChangePassword: true };
      internal_users = [...internal_users, newUser];
      persist("atr_users", internal_users);

      const token = localStorage.getItem("atr_token");
      if (token) {
        try {
          const res = await fetch(`${API}/api/users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(u)
          });
          // Refresh list to get actual ID and exact DB representation
          fetchAllDataFromBackend();
          if (res.ok) {
            const data = await res.json();
            return data.user || newUser;
          }
        } catch (e) {
          console.error("Failed to create user on backend", e);
        }
      }
      return newUser;
    },
    deleteUser: async (id: string) => {
      // Optimistic update
      internal_users = internal_users.filter(u => u.id !== id);
      persist("atr_users", internal_users);

      const token = localStorage.getItem("atr_token");
      if (token) {
        try {
          await fetch(`${API}/api/users/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          console.error("Failed to delete user on backend", e);
        }
      }
    },
    adminResetPassword: async (id: string, pass: string) => {
      // Optimistic update
      internal_users = internal_users.map(u => u.id === id ? { ...u, password: mockHash(pass), mustChangePassword: true } : u);
      persist("atr_users", internal_users);

      const token = localStorage.getItem("atr_token");
      if (token) {
        try {
          await fetch(`${API}/api/users/${id}/password`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ password: pass, mustChangePassword: true })
          });
        } catch (e) {
          console.error("Failed to reset password on backend", e);
        }
      }
    },
    updateUserAgencies: async (id: string, agencies: string[]) => {
      // Optimistic update
      internal_users = internal_users.map(u => u.id === id ? { ...u, agencies } : u);
      persist("atr_users", internal_users);

      const token = localStorage.getItem("atr_token");
      if (token) {
        try {
          await fetch(`${API}/api/users/${id}/agencies`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ agencies })
          });
        } catch (e) {
          console.error("Failed to update agencies on backend", e);
        }
      }
    },
    getRegularUsers: () => internal_users.filter(u => u.role !== "admin"),

    // SMTP
    smtpSettings: internal_smtp,
    saveSmtpSettings: (s: any) => {
      internal_smtp = s;
      persist("atr_smtp", internal_smtp);
    },
    mailTemplates: internal_templates,

    // Dev
    dataSources: internal_sources,
    devMeasures: internal_measures,
    devCanvas: internal_canvas,
    clearAllDevState: async () => {
      // Clear in-memory module state immediately
      const oldSources = [...internal_sources];
      internal_sources = [];
      internal_measures = [];
      internal_canvas = [];
      // Clear localStorage
      localStorage.removeItem("atr_dev_sources");
      localStorage.removeItem("atr_dev_measures");
      localStorage.removeItem("atr_dev_canvas");
      notify();
      // Also delete from backend (best-effort, no await)
      const token = localStorage.getItem("atr_token");
      if (token) {
        oldSources.forEach(src => {
          fetch(`${API}/api/dev/sources/${src.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {});
        });
      }
    },
    saveDevSource: (s: any) => {
      const src = { ...s, id: s.id || `src-${Date.now()}` };
      internal_sources = [...internal_sources, src];
      persist("atr_dev_sources", internal_sources);
      persistBackend('/api/dev/sources', 'POST', src);
    },
    saveDevMeasure: (m: any) => {
      const measure = { ...m, id: m.id || `msr-${Date.now()}` };
      internal_measures = [...internal_measures, measure];
      persist("atr_dev_measures", internal_measures);
      const liteMeasure = { ...measure, rows: [] };
      persistBackend('/api/dev/measures', 'POST', liteMeasure);
    },
    deleteDevSource: (id: string) => {
      internal_sources = internal_sources.filter((s: any) => s.id !== id);
      persist("atr_dev_sources", internal_sources);
      persistBackend(`/api/dev/sources/${id}`, 'DELETE');
    },
    deleteDevMeasure: (id: string) => {
      internal_measures = internal_measures.filter((m: any) => m.id !== id);
      persist("atr_dev_measures", internal_measures);
      persistBackend(`/api/dev/measures/${id}`, 'DELETE');
    },
    saveDevCanvas: (items: any[]) => {
      // The canvas is the entire array of items currently on the board
      internal_canvas = items;
      persist("atr_dev_canvas", internal_canvas);
      const liteItems = items.map(item => ({ ...item, rows: [] }));
      persistBackend('/api/dev/canvas', 'POST', { id: 'active_canvas', items: liteItems });
    },
    publishedDashboards: internal_published,
    publishDashboard: async (d: any) => {
      const published = { ...d, id: d.id || `pub-${Date.now()}` };
      internal_published = [...internal_published, published];
      persist("atr_published_dashboards", internal_published);
      try {
        await fetch(`${API}/api/dev/published`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem("atr_token")}` },
          body: JSON.stringify(published)
        });
        notify();
      } catch (e) {
        console.error("Failed to sync published dashboard to backend", e);
      }
    },
    deletePublishedDashboard: (id: string) => {
      internal_published = internal_published.filter(p => p.id !== id);
      persist("atr_published_dashboards", internal_published);
      persistBackend(`/api/dev/published/${id}`, 'DELETE');
    },
    systemDashboards: internal_system,
    approveDashboard: (pubId: string, areaId: string) => {
      const dash = internal_published.find(d => d.id === pubId);
      if (!dash) return;
      const newDash = { id: `dash-${Date.now()}`, title: dash.name, category: AREA_NAMES[areaId], config: dash };

      internal_system = { ...internal_system, [areaId]: [...(internal_system[areaId] || []), newDash] };
      internal_published = internal_published.filter(p => p.id !== pubId);

      persist("atr_system_dashboards", internal_system);
      persist("atr_published_dashboards", internal_published);

      persistBackend('/api/dev/system', 'POST', { areaId, dashId: newDash.id, dashboard: newDash });
      
      // Also delete from published (pending) queue in backend
      persistBackend(`/api/dev/published/${pubId}`, 'DELETE');
      
      // TRIGGER HARVESTING: Register widgets in the marketplace
      if (dash.components && Array.isArray(dash.components)) {
        persistBackend('/api/marketplace/harvest', 'POST', {
          dashboardId: newDash.id,
          dashboardName: newDash.title,
          components: dash.components.map((c: any) => ({
            name: c.name,
            config: { code: c.code }, // UI logic
            contract: { source: 'SQL_SERVER' }, // Data contract
            execution: { 
              engine: 'SQL_SERVER_DIRECT', 
              rawQuery: c.query || '', 
              dataSourceId: c.connectionId 
            },
            connection: c.connection // Includes host/db/user/pass for Marketplace registration
          }))
        });
      }

      persistBackend(`/api/dev/published/${pubId}`, 'DELETE');
    },
    
    // Advanced Management
    hideDashboard: (areaId: string, dashId: string) => {
      const updatedList = (internal_system[areaId] || []).map(d => d.id === dashId ? { ...d, hidden: !d.hidden } : d);
      internal_system = { ...internal_system, [areaId]: updatedList };
      persist("atr_system_dashboards", internal_system);

      const dashboard = updatedList.find(d => d.id === dashId);
      if (dashboard) persistBackend('/api/dev/system', 'POST', { areaId, dashId, dashboard });
    },
    archiveDashboard: (areaId: string, dashId: string) => {
      const updatedList = (internal_system[areaId] || []).map(d => d.id === dashId ? { ...d, archived: true } : d);
      internal_system = { ...internal_system, [areaId]: updatedList };
      persist("atr_system_dashboards", internal_system);

      const dashboard = updatedList.find(d => d.id === dashId);
      if (dashboard) persistBackend('/api/dev/system', 'POST', { areaId, dashId, dashboard });
    },
    deleteSystemDashboard: (areaId: string, dashId: string) => {
      internal_system = { ...internal_system, [areaId]: (internal_system[areaId] || []).filter(d => d.id !== dashId) };
      persist("atr_system_dashboards", internal_system);
      persistBackend(`/api/dev/system/${areaId}/${dashId}`, 'DELETE');
    },

    // Permissions
    assignUserToArea: (userId: string, areaId: string) => {
      internal_users = internal_users.map(u => 
        u.id === userId 
          ? { ...u, permissions: { ...u.permissions, areas: [...new Set([...u.permissions.areas, areaId])] } } 
          : u
      );
      persist("atr_users", internal_users);

      const u = internal_users.find(u => u.id === userId);
      if(u) {
         persistBackend(`/api/users/${userId}/permissions`, 'PUT', u.permissions);
      }
    },
    removeUserFromArea: async (userId: string, areaId: string) => {
      internal_users = internal_users.map(u =>
        u.id === userId
          ? { ...u, permissions: { ...u.permissions, areas: u.permissions.areas.filter((id: string) => id !== areaId) } }
          : u
      );
      persist("atr_users", internal_users);

      const u = internal_users.find(u => u.id === userId);
      if(u) {
         persistBackend(`/api/users/${userId}/permissions`, 'PUT', u.permissions);
      }
    },
    removeUserFromDashboard: async (userId: string, areaId: string, dashId: string) => {
      const combined = `${areaId}/${dashId}`;
      internal_users = internal_users.map(u =>
        u.id === userId
          ? { ...u, permissions: { ...u.permissions, dashboards: u.permissions.dashboards.filter((id: string) => id !== combined) } }
          : u
      );
      persist("atr_users", internal_users);

      const u = internal_users.find(u => u.id === userId);
      if(u) {
         persistBackend(`/api/users/${userId}/permissions`, 'PUT', u.permissions);
      }
    },
    assignUserToDashboard: (userId: string, areaId: string, dashId: string) => {
      const combined = `${areaId}/${dashId}`;
      internal_users = internal_users.map(u => 
        u.id === userId 
          ? { ...u, permissions: { ...u.permissions, dashboards: [...new Set([...u.permissions.dashboards, combined])] } } 
          : u
      );
      persist("atr_users", internal_users);

      const u = internal_users.find(u => u.id === userId);
      if(u) {
         persistBackend(`/api/users/${userId}/permissions`, 'PUT', u.permissions);
      }
    },

    // ─ Borradores (Drafts) ───────────────────
    devDrafts: internal_drafts,

    saveDraft: async (draftId: string, name: string | null, canvasItems: any[], tabsData: any[], connectionsData: any[]) => {
      const token = localStorage.getItem("atr_token");
      if (!token) return null;
      try {
        // Slim payload — only keep what's needed to restore a session
        // DO NOT send: rows (raw data), code (auto-generated JSX), passwords
        const slimTabs = tabsData.map(t => ({
          id: t.id,
          title: t.title,
          connectionId: t.connectionId,
          query: t.query,          // SQL to re-run
          columns: t.columns || [], // column names
          // code is omitted — it will be regenerated from visualMapping
        }));

        const slimCanvas = canvasItems.map(i => ({
          instanceId: i.instanceId,
          id: i.id,
          name: i.name,
          type: i.type, // visual type
          // no rows, no code
        }));

        const slimConns = connectionsData.map(c => ({
          id: c.id,
          name: c.name,
          host: c.host,
          database: c.database,
          username: c.username,
          // password intentionally stripped for security
        }));

        const res = await fetch(`${API}/api/dev/drafts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            id: draftId,
            name: name || 'SIN NOMBRE',
            canvas: slimCanvas,
            tabs: slimTabs,
            connections: slimConns
          })
        });
        const d = await res.json();
        if (d.success) {
          // Refresh drafts list
          const refreshed = await fetchFromBackend('/api/dev/drafts');
          if (refreshed) internal_drafts = refreshed.drafts || [];
          notify();
          return d;
        } else {
          console.error('Draft save failed:', d.error);
        }
      } catch (err) { console.error('Failed to save draft', err); }
      return null;
    },

    loadDraft: async (draftId: string) => {
      const token = localStorage.getItem("atr_token");
      if (!token) return null;
      try {
        const res = await fetch(`${API}/api/dev/drafts/${draftId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const d = await res.json();
        if (d.success) return d.draft;
      } catch (err) { console.error('Failed to load draft', err); }
      return null;
    },

    deleteDraft: async (draftId: string) => {
      const token = localStorage.getItem("atr_token");
      if (!token) return;
      try {
        await fetch(`${API}/api/dev/drafts/${draftId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        internal_drafts = internal_drafts.filter((d: any) => d.id !== draftId);
        notify();
      } catch (err) { console.error('Failed to delete draft', err); }
    },

    refreshAssets: async () => {
      const data = await fetchFromBackend('/api/dev/assets');
      if (data) {
        internal_sources = data.sources || [];
        internal_measures = data.measures || [];
        internal_canvas = data.canvas || [];
        internal_published = data.published || [];
        internal_system = data.system || INITIAL_DASHBOARDS_MAP;
        
        persist("atr_dev_sources", internal_sources);
        persist("atr_dev_measures", internal_measures);
        persist("atr_dev_canvas", internal_canvas);
        persist("atr_published_dashboards", internal_published);
        persist("atr_system_dashboards", internal_system);
        notify();
      }
    },
  };
};
