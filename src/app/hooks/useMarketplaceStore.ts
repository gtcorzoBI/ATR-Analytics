import { create } from 'zustand';
import { MarketplaceWidget, DashboardWidgetInstance } from '../types/measure';

const API = "http://localhost:3001";

interface MarketplaceState {
  widgets: MarketplaceWidget[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: string | null;
  
  // Instance management for the current canvas
  instances: DashboardWidgetInstance[];
  
  // Actions
  fetchWidgets: () => Promise<void>;
  setSearch: (q: string) => void;
  setCategory: (cat: string | null) => void;
  injectWidget: (widget: MarketplaceWidget) => void;
  removeInstance: (instanceId: string) => void;
  updateInstanceProps: (instanceId: string, props: any) => void;
  
  // NEW: Favorites & CRUD
  toggleFavorite: (widgetId: string) => Promise<void>;
  deleteWidget: (widgetId: string) => Promise<void>;
  updateWidget: (widgetId: string, data: { name: string, description: string }) => Promise<void>;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  widgets: [],
  loading: false,
  error: null,
  searchQuery: "",
  selectedCategory: null,
  instances: [],

  fetchWidgets: async () => {
    set({ loading: true, error: null });
    const token = localStorage.getItem("atr_token");
    try {
      const res = await fetch(`${API}/api/marketplace/widgets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        set({ widgets: data.widgets, loading: false });
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  setSearch: (q) => set({ searchQuery: q }),
  setCategory: (cat) => set({ selectedCategory: cat }),

  // NEW: Favorites Logic
  toggleFavorite: async (widgetId) => {
    const token = localStorage.getItem("atr_token");
    try {
      const res = await fetch(`${API}/api/marketplace/favorites/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ widgetId })
      });
      const data = await res.json();
      if (data.success) {
        set(state => ({
          widgets: state.widgets.map(w => w.id === widgetId ? { ...w, isFavorite: data.isFavorite } : w)
        }));
      }
    } catch (e) { console.error("Toggle Favorite failed", e); }
  },

  deleteWidget: async (widgetId) => {
    const token = localStorage.getItem("atr_token");
    try {
      const res = await fetch(`${API}/api/marketplace/widgets/${widgetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        set(state => ({ widgets: state.widgets.filter(w => w.id !== widgetId) }));
      }
    } catch (e) { console.error("Delete failed", e); }
  },

  updateWidget: async (widgetId, payload) => {
    const token = localStorage.getItem("atr_token");
    try {
      const res = await fetch(`${API}/api/marketplace/widgets/${widgetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        set(state => ({
          widgets: state.widgets.map(w => w.id === widgetId ? { ...w, ...payload } : w)
        }));
      }
    } catch (e) { console.error("Update failed", e); }
  },

  injectWidget: (widget) => {
    const newInstance: DashboardWidgetInstance = {
      instanceId: `inst-${crypto.randomUUID()}`,
      widgetId: widget.id,
      versionId: widget.versionId,
      customProps: {},
      position: { x: 0, y: 0, w: 4, h: 4 }
    };
    set(state => ({
      instances: [...state.instances, newInstance]
    }));
  },

  removeInstance: (instanceId) => set(state => ({
    instances: state.instances.filter(i => i.instanceId !== instanceId)
  })),

  updateInstanceProps: (instanceId, props) => set(state => ({
    instances: state.instances.map(i => 
      i.instanceId === instanceId ? { ...i, customProps: { ...i.customProps, ...props } } : i
    )
  })),
}));
