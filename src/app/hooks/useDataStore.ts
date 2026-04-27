import { useState, useEffect } from "react";

// ─── Mock data definitions ────────────────────────────────────────────────────
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
    permissions: { areas: [], dashboards: [] },
  },
  {
    id: "2",
    firstName: "Dev",
    lastName: "User",
    email: "dev@atr.com",
    role: "dev",
    agencies: ["ATR Matriz"],
    password: mockHash("dev123"),
    permissions: { areas: [], dashboards: [] },
  },
];

// ─── Shared State Manager ─────────────────────────────────────────────────────
let listeners: Array<() => void> = [];
const notify = () => listeners.forEach((l) => l());

let internal_users: User[] =
  JSON.parse(localStorage.getItem("atr_users") || "null") || INITIAL_USERS;
let internal_smtp: any = JSON.parse(localStorage.getItem("atr_smtp") || "{}");
let internal_templates: any = JSON.parse(
  localStorage.getItem("atr_mail_templates") || "null"
) || {
  welcome: "Bienvenido a DataCanvas O.S.",
  area: "Se te ha asignado una nueva área.",
  dash: "Nuevo dashboard disponible.",
  pass: "Tu contraseña ha sido restablecida.",
};

let internal_sources: any[] = JSON.parse(
  localStorage.getItem("atr_dev_sources") || "[]"
);
let internal_measures: any[] = JSON.parse(
  localStorage.getItem("atr_dev_measures") || "[]"
);
let internal_canvas: any[] = JSON.parse(
  localStorage.getItem("atr_dev_canvas") || "[]"
);
let internal_published: any[] = JSON.parse(
  localStorage.getItem("atr_published_dashboards") || "[]"
);
let internal_system: Record<string, any[]> = 
  JSON.parse(localStorage.getItem("atr_system_dashboards") || "null") || INITIAL_DASHBOARDS_MAP;
let internal_drafts: any[] = [];
let internal_tables_map: Record<string, any[]> = {};

const getEnv = (key: string, fallback: string) => {
  try {
    return (import.meta as any).env[key] || fallback;
  } catch {
    return fallback;
  }
};

const API = getEnv("VITE_API_URL", "http://localhost:3001");

// Helper: generic fetch and parse
const fetchFromBackend = async (endpoint: string) => {
  const token = localStorage.getItem("atr_token");
  if (!token) return null;
  try {
    const res = await fetch(`${API}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
    }
  } catch (err) {
    console.error(`Could not fetch ${endpoint}`, err);
  }
  return null;
};

// ─── Fetch all data from backend ─────────────────────────────────────────────
const fetchAllDataFromBackend = async () => {
  const usersData = await fetchFromBackend("/api/users");
  if (usersData && usersData.users) {
    internal_users = usersData.users;
    localStorage.setItem("atr_users", JSON.stringify(internal_users));
  }

  const devAssets = await fetchFromBackend("/api/dev/assets");
  if (devAssets) {
    internal_sources = devAssets.sources || [];
    internal_measures = devAssets.measures || [];
    internal_canvas = devAssets.canvas || [];
    internal_published = devAssets.published || [];

    // Merge DB system dashboards with defaults (DB takes precedence or overwrites completely if populated)
    if (Object.keys(devAssets.system || {}).length > 0) {
      internal_system = devAssets.system;
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
  const draftsData = await fetchFromBackend("/api/dev/drafts");
  if (draftsData && draftsData.drafts) {
    internal_drafts = draftsData.drafts;
  }

  notify();
};

// ─── Strip heavy data before syncing ─────────────────────────────────────────
const stripDataRows = (item: any): any => {
  if (typeof item !== "object" || item === null) return item;
  if (Array.isArray(item)) return item.map(stripDataRows);

  const { rows, ...rest } = item;

  if (rest.components && Array.isArray(rest.components)) {
    rest.components = rest.components.map(stripDataRows);
  }

  return rest;
};

const serializeLite = (val: any): string => {
  if (!val) return JSON.stringify(val);
  return JSON.stringify(stripDataRows(val));
};

const persistBackend = async (
  endpoint: string,
  method: string,
  body?: any
) => {
  const token = localStorage.getItem("atr_token");
  if (!token) return { success: false, error: "No token" };
  try {
    const res = await fetch(`${API}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch (err: any) {
    console.error(`Error syncing ${endpoint}`, err);
    return { success: false, error: err.message };
  }
};

let internal_diag_data: any = null;

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useDataStore = () => {
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick((t) => t + 1);

  useEffect(() => {
    listeners.push(forceUpdate);

    fetchAllDataFromBackend();

    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("atr_")) {
        internal_users =
          JSON.parse(localStorage.getItem("atr_users") || "null") ||
          INITIAL_USERS;
        internal_published = JSON.parse(
          localStorage.getItem("atr_published_dashboards") || "[]"
        );
        internal_system =
          JSON.parse(
            localStorage.getItem("atr_system_dashboards") || "null"
          ) || INITIAL_DASHBOARDS_MAP;
        forceUpdate();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      listeners = listeners.filter((l) => l !== forceUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const persist = (key: string, val: any) => {
    try {
      localStorage.setItem(key, serializeLite(val));
    } catch (e) {
      console.warn(
        `LocalStorage quota exceeded for key: ${key}. Data was not saved locally.`
      );
    }
    notify();
  };

  return {
    // ── Auth & Users ──────────────────────────────────────────────────────────
    users: internal_users,

    createUser: async (u: User) => {
      const tempId = Date.now().toString();
      const newUser = {
        ...u,
        id: tempId,
        password: mockHash(u.password || "123456"),
        mustChangePassword: true,
      };
      internal_users = [...internal_users, newUser];
      persist("atr_users", internal_users);

      const token = localStorage.getItem("atr_token");
      if (token) {
        try {
          const res = await fetch(`${API}/api/users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(u),
          });
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
      internal_users = internal_users.filter((u) => u.id !== id);
      persist("atr_users", internal_users);

      const token = localStorage.getItem("atr_token");
      if (token) {
        try {
          await fetch(`${API}/api/users/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (e) {
          console.error("Failed to delete user on backend", e);
        }
      }
    },

    adminResetPassword: async (id: string, pass: string) => {
      internal_users = internal_users.map((u) =>
        u.id === id
          ? { ...u, password: mockHash(pass), mustChangePassword: true }
          : u
      );
      persist("atr_users", internal_users);

      const token = localStorage.getItem("atr_token");
      if (token) {
        try {
          await fetch(`${API}/api/users/${id}/password`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ password: pass, mustChangePassword: true }),
          });
        } catch (e) {
          console.error("Failed to reset password on backend", e);
        }
      }
    },

    updateUserAgencies: async (id: string, agencies: string[]) => {
      internal_users = internal_users.map((u) =>
        u.id === id ? { ...u, agencies } : u
      );
      persist("atr_users", internal_users);

      const token = localStorage.getItem("atr_token");
      if (token) {
        try {
          await fetch(`${API}/api/users/${id}/agencies`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ agencies }),
          });
        } catch (e) {
          console.error("Failed to update agencies on backend", e);
        }
      }
    },

    getRegularUsers: () => internal_users.filter((u) => u.role !== "admin"),

    // ── SMTP ──────────────────────────────────────────────────────────────────
    smtpSettings: internal_smtp,
    saveSmtpSettings: (s: any) => {
      internal_smtp = s;
      persist("atr_smtp", internal_smtp);
    },
    mailTemplates: internal_templates,

    // ── Dev Assets ────────────────────────────────────────────────────────────
    dataSources: internal_sources,
    devMeasures: internal_measures,
    devCanvas: internal_canvas,
    tables: internal_tables_map,

    testSQLConnection: async (creds: any) => {
      try {
        const token = localStorage.getItem("atr_token");
        const res = await fetch(`${API}/api/dev/test-connection`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(creds),
        });
        return await res.json();
      } catch (e) {
        return { success: false, error: "Error de red o servidor" };
      }
    },

    fetchTables: async (connectionId: string) => {
      if (!connectionId) return [];
      try {
        const token = localStorage.getItem("atr_token");
        const res = await fetch(`${API}/api/dev/tables/${connectionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.diag) {
          internal_diag_data = data.diag;
        }
        if (data.tables) {
          internal_tables_map = { ...internal_tables_map, [connectionId]: data.tables };
          notify();
          return data.tables;
        }
      } catch (e) {
        console.error("Failed to fetch tables", e);
      }
      return [];
    },

    fetchColumns: async (connectionId: string, table: string) => {
      try {
        const token = localStorage.getItem("atr_token");
        const res = await fetch(`${API}/api/dev/columns/${connectionId}?table=${table}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        return data.columns || [];
      } catch (e) {
        console.error("Failed to fetch columns", e);
        return [];
      }
    },

    fetchPreview: async (connectionId: string, table: string) => {
      try {
        const token = localStorage.getItem("atr_token");
        const res = await fetch(`${API}/api/dev/preview/${connectionId}?table=${table}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        return data; // Returns { success, rows, columns, executionTime }
      } catch (e) {
        console.error("Failed to fetch preview", e);
        return { success: false, rows: [], columns: [] };
      }
    },

    clearAllDevState: async () => {
      const oldSources = [...(internal_sources || [])];
      const oldMeasures = [...(internal_measures || [])];
      internal_sources = [];
      internal_measures = [];
      internal_canvas = [];
      localStorage.removeItem("atr_dev_sources");
      localStorage.removeItem("atr_dev_measures");
      localStorage.removeItem("atr_dev_canvas");
      notify();

      const token = localStorage.getItem("atr_token");
      if (token) {
        oldSources.forEach((src) => {
          fetch(`${API}/api/dev/sources/${src.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => { });
        });
        oldMeasures.forEach((m) => {
          fetch(`${API}/api/dev/measures/${m.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => { });
        });
      }
    },

    saveDevSource: async (s: any) => {
      const src = { ...s, id: s.id || `src-${Date.now()}` };
      internal_sources = [...internal_sources.filter(x => x.id !== src.id), src];
      persist("atr_dev_sources", internal_sources);
      return await persistBackend("/api/dev/sources", "POST", src);
    },

    saveDevMeasure: (m: any) => {
      const measure = { ...m, id: m.id || `msr-${Date.now()}` };
      const existingIdx = internal_measures.findIndex(
        (existing) => existing.id === measure.id
      );
      if (existingIdx >= 0) {
        internal_measures[existingIdx] = measure;
      } else {
        internal_measures = [...internal_measures, measure];
      }
      persist("atr_dev_measures", internal_measures);
      persistBackend("/api/dev/measures", "POST", { ...measure, rows: [] });
    },

    deleteDevSource: (id: string) => {
      internal_sources = internal_sources.filter((s: any) => s.id !== id);
      persist("atr_dev_sources", internal_sources);
      persistBackend(`/api/dev/sources/${id}`, "DELETE");
    },

    deleteDevMeasure: (id: string) => {
      internal_measures = internal_measures.filter((m: any) => m.id !== id);
      persist("atr_dev_measures", internal_measures);
      persistBackend(`/api/dev/measures/${id}`, "DELETE");
    },

    // ── Published Dashboards ──────────────────────────────────────────────────
    publishedDashboards: internal_published,

    publishDashboard: async (d: any) => {
      try {
        // En lugar de guardar el dashboard en LocalStorage,
        // mandamos el dashboard entero y sus componentes al backend para guardarlos granularmente
        const res = await fetch(`${API}/api/marketplace/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem("atr_token")}`
          },
          // Format expected by backend: { dashboardId, title, category, components }
          body: JSON.stringify({
            dashboardId: d.id || `dash-${Date.now()}`,
            title: d.name || 'Sin Título',
            category: d.category || 'Global',
            components: d.components || []
          })
        });

        if (!res.ok) throw new Error("Fallo al publicar en el Marketplace");

        // Clear local canvas to pretend it was sent? Or keep it.
        // We just notify success here.
        notify();
      } catch (e) {
        console.error("Failed to submit to marketplace", e);
      }
    },
    // We removed deletePublishedDashboard and approveDashboard as the old /published flow is dead.
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
      
      // TRIGGER HARVESTING: Register ONLY new (non-marketplace) widgets in the marketplace
      if (dash.components && Array.isArray(dash.components)) {
        const newComponents = dash.components.filter((c: any) => !c.isMarketplace);
        if (newComponents.length > 0) {
          persistBackend('/api/marketplace/harvest', 'POST', {
            dashboardId: newDash.id,
            dashboardName: newDash.title,
            components: newComponents.map((c: any) => ({
              name: c.name,
              config: { code: c.code },
              contract: { source: 'SQL_SERVER' },
              execution: { 
                engine: 'SQL_SERVER_DIRECT', 
                rawQuery: c.query || '', 
                dataSourceId: c.connectionId 
              },
              connection: c.connection
            }))
          });
        }
      }
    },

    rejectDashboard: async (pubId: string, reason?: string) => {
      const dash = internal_published.find(d => d.id === pubId);
      if (!dash) return;
      
      // Remove from published queue
      internal_published = internal_published.filter(p => p.id !== pubId);
      persist("atr_published_dashboards", internal_published);
      
      // Delete from backend published table
      persistBackend(`/api/dev/published/${pubId}`, 'DELETE');
      
      // Send back as a draft so the dev can continue working on it
      const draftId = dash.originalDraftId || `draft-rejected-${pubId}`;
      persistBackend('/api/dev/drafts', 'POST', {
        id: draftId,
        name: `[RECHAZADO] ${dash.name || 'Dashboard'}`,
        canvas: dash.components || [],
        tabs: [],
        connections: [],
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || 'Rechazado por el administrador',
      });

      notify();
    },
    
    // Advanced Management
    hideDashboard: (areaId: string, dashId: string) => {
      const updatedList = (internal_system[areaId] || []).map((d) =>
        d.id === dashId ? { ...d, hidden: !d.hidden } : d
      );
      internal_system = { ...internal_system, [areaId]: updatedList };
      persist("atr_system_dashboards", internal_system);

      const dashboard = updatedList.find((d) => d.id === dashId);
      if (dashboard)
        persistBackend("/api/dev/system", "POST", { areaId, dashId, dashboard });
    },

    archiveDashboard: (areaId: string, dashId: string) => {
      const updatedList = (internal_system[areaId] || []).map((d) =>
        d.id === dashId ? { ...d, archived: true } : d
      );
      internal_system = { ...internal_system, [areaId]: updatedList };
      persist("atr_system_dashboards", internal_system);

      const dashboard = updatedList.find((d) => d.id === dashId);
      if (dashboard)
        persistBackend("/api/dev/system", "POST", { areaId, dashId, dashboard });
    },

    deleteSystemDashboard: (areaId: string, dashId: string) => {
      internal_system = {
        ...internal_system,
        [areaId]: (internal_system[areaId] || []).filter((d) => d.id !== dashId),
      };
      persist("atr_system_dashboards", internal_system);
      persistBackend(`/api/dev/system/${areaId}/${dashId}`, "DELETE");
    },

    // ── Permissions ───────────────────────────────────────────────────────────
    assignUserToArea: (userId: string, areaId: string) => {
      internal_users = internal_users.map((u) => {
        if (u.id !== userId) return u;
        const current = u.permissions || { areas: [], dashboards: [] };
        return {
          ...u,
          permissions: {
            ...current,
            areas: [...new Set([...(current.areas || []), areaId])],
          },
        };
      });
      persist("atr_users", internal_users);

      const u = internal_users.find((u) => u.id === userId);
      if (u) persistBackend(`/api/users/${userId}/permissions`, "PUT", u.permissions);
    },

    removeUserFromArea: async (userId: string, areaId: string) => {
      internal_users = internal_users.map((u) => {
        if (u.id !== userId) return u;
        const current = u.permissions || { areas: [], dashboards: [] };
        return {
          ...u,
          permissions: {
            ...current,
            areas: (current.areas || []).filter((id: string) => id !== areaId),
          },
        };
      });
      persist("atr_users", internal_users);

      const u = internal_users.find((u) => u.id === userId);
      if (u) persistBackend(`/api/users/${userId}/permissions`, "PUT", u.permissions);
    },

    removeUserFromDashboard: async (userId: string, areaId: string, dashId: string) => {
      const combined = `${areaId}/${dashId}`;
      internal_users = internal_users.map((u) => {
        if (u.id !== userId) return u;
        const current = u.permissions || { areas: [], dashboards: [] };
        return {
          ...u,
          permissions: {
            ...current,
            dashboards: (current.dashboards || []).filter((id: string) => id !== combined),
          },
        };
      });
      persist("atr_users", internal_users);

      const u = internal_users.find((u) => u.id === userId);
      if (u) persistBackend(`/api/users/${userId}/permissions`, "PUT", u.permissions);
    },

    assignUserToDashboard: (userId: string, areaId: string, dashId: string) => {
      const combined = `${areaId}/${dashId}`;
      internal_users = internal_users.map((u) => {
        if (u.id !== userId) return u;
        const current = u.permissions || { areas: [], dashboards: [] };
        return {
          ...u,
          permissions: {
            ...current,
            dashboards: [...new Set([...(current.dashboards || []), combined])],
          },
        };
      });
      persist("atr_users", internal_users);

      const u = internal_users.find((u) => u.id === userId);
      if (u) persistBackend(`/api/users/${userId}/permissions`, "PUT", u.permissions);
    },

    updateUserActivity: async (userId: string, dashboardTitle: string) => {
      const now = new Date().toISOString();
      internal_users = internal_users.map((u) =>
        u.id === userId ? { ...u, lastActiveAt: now, lastDashboardViewed: dashboardTitle } : u
      );
      persist("atr_users", internal_users);
      persistBackend(`/api/users/${userId}/activity`, "PUT", {
        lastActiveAt: now,
        lastDashboardViewed: dashboardTitle,
      });
    },

    // ── Drafts ────────────────────────────────────────────────────────────────
    drafts: internal_drafts,

    saveDraft: async (
      draftId: string,
      name: string | null,
      canvasItems: any[],
      tabsData: any[],
      connectionsData: any[]
    ) => {
      const token = localStorage.getItem("atr_token");
      if (!token) return null;
      try {
        const slimTabs = tabsData.map((t) => ({
          id: t.id,
          title: t.title,
          connectionId: t.connectionId,
          query: t.query,
          columns: t.columns || [],
        }));

        const slimCanvas = canvasItems.map((i) => ({
          instanceId: i.instanceId,
          id: i.id,
          name: i.name,
          type: i.type,
        }));

        const slimConns = connectionsData.map((c) => ({
          id: c.id,
          name: c.name,
          host: c.host,
          database: c.database,
          username: c.username,
        }));

        const res = await fetch(`${API}/api/dev/drafts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: draftId,
            name: name || "SIN NOMBRE",
            canvas: slimCanvas,
            tabs: slimTabs,
            connections: slimConns,
          }),
        });
        const d = await res.json();
        if (d.success) {
          const refreshed = await fetchFromBackend("/api/dev/drafts");
          if (refreshed) internal_drafts = refreshed.drafts || [];
          notify();
          return d;
        } else {
          console.error("Draft save failed:", d.error);
        }
      } catch (err) {
        console.error("Failed to save draft", err);
      }
      return null;
    },

    loadDraft: async (draftId: string) => {
      const token = localStorage.getItem("atr_token");
      if (!token) return null;
      try {
        const res = await fetch(`${API}/api/dev/drafts/${draftId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        if (d.success) return d.draft;
      } catch (err) {
        console.error("Failed to load draft", err);
      }
      return null;
    },

    deleteDraft: async (draftId: string) => {
      const token = localStorage.getItem("atr_token");
      if (!token) return;
      try {
        await fetch(`${API}/api/dev/drafts/${draftId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        internal_drafts = internal_drafts.filter((d: any) => d.id !== draftId);
        notify();
      } catch (err) {
        console.error("Failed to delete draft", err);
      }
    },

    // ── Refresh ───────────────────────────────────────────────────────────────
    refreshAssets: async () => {
      const data = await fetchFromBackend("/api/dev/assets");
      if (data) {
        internal_sources = data.sources || [];
        internal_measures = data.measures || [];
        internal_canvas = data.canvas || [];
        internal_published = data.publishedDashboards || data.published || [];
        internal_system = data.systemDashboards || data.system || INITIAL_DASHBOARDS_MAP;

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