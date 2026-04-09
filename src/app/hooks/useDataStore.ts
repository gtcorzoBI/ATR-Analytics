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

    localStorage.setItem("atr_dev_sources", JSON.stringify(internal_sources));
    localStorage.setItem("atr_dev_measures", JSON.stringify(internal_measures));
    localStorage.setItem("atr_dev_canvas", JSON.stringify(internal_canvas));
    localStorage.setItem("atr_published_dashboards", JSON.stringify(internal_published));
    localStorage.setItem("atr_system_dashboards", JSON.stringify(internal_system));
  }
  notify();
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
    localStorage.setItem(key, JSON.stringify(val));
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
      persistBackend('/api/dev/measures', 'POST', measure);
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
      persistBackend('/api/dev/canvas', 'POST', { id: 'active_canvas', items });
    },
    publishedDashboards: internal_published,
    publishDashboard: (d: any) => {
      const published = { ...d, id: d.id || `pub-${Date.now()}` };
      internal_published = [...internal_published, published];
      persist("atr_published_dashboards", internal_published);
      persistBackend('/api/dev/published', 'POST', published);
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
    }
  };
};
