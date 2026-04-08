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

// Fetch users from backend helper
const fetchUsersFromBackend = async () => {
  const token = localStorage.getItem("atr_token");
  if (!token) return;
  try {
    const res = await fetch(`${API}/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.users) {
        internal_users = data.users;
        localStorage.setItem("atr_users", JSON.stringify(internal_users));
        notify();
      }
    }
  } catch (err) {
    console.error("Could not fetch users from backend", err);
  }
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

export const useDataStore = () => {
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);

  useEffect(() => {
    listeners.push(forceUpdate);
    
    // Fetch initial fresh data from DB on mount if possible
    fetchUsersFromBackend();

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
          await fetch(`${API}/api/users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(u)
          });
          // Refresh list to get actual ID and exact DB representation
          fetchUsersFromBackend();
        } catch (e) {
          console.error("Failed to create user on backend", e);
        }
      }
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
    saveDevSource: (s: any) => {
      internal_sources = [...internal_sources, s];
      persist("atr_dev_sources", internal_sources);
    },
    publishedDashboards: internal_published,
    publishDashboard: (d: any) => {
      internal_published = [...internal_published, { ...d, id: `pub-${Date.now()}` }];
      persist("atr_published_dashboards", internal_published);
    },
    deletePublishedDashboard: (id: string) => {
      internal_published = internal_published.filter(p => p.id !== id);
      persist("atr_published_dashboards", internal_published);
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
    },
    
    // Advanced Management
    hideDashboard: (areaId: string, dashId: string) => {
      internal_system = { ...internal_system, [areaId]: (internal_system[areaId] || []).map(d => d.id === dashId ? { ...d, hidden: !d.hidden } : d) };
      persist("atr_system_dashboards", internal_system);
    },
    archiveDashboard: (areaId: string, dashId: string) => {
      internal_system = { ...internal_system, [areaId]: (internal_system[areaId] || []).map(d => d.id === dashId ? { ...d, archived: true } : d) };
      persist("atr_system_dashboards", internal_system);
    },
    deleteSystemDashboard: (areaId: string, dashId: string) => {
      internal_system = { ...internal_system, [areaId]: (internal_system[areaId] || []).filter(d => d.id !== dashId) };
      persist("atr_system_dashboards", internal_system);
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
