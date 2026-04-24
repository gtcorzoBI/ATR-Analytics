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
      const res = await fetch(`${API}/api/marketplace/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Mapeamos los items que vienen del nuevo endpoint al formato esperado por el Drawer
        const mappedWidgets = data.items.map((item: any) => ({
          id: item.id,
          versionId: item.id, // Simplificamos version para la inyección
          name: item.name,
          category: item.category,
          versionTag: '1.0.0',
          description: `Origin: ${item.dashboard}`,
          ownerId: item.author,
          config: item.config, // El JSON desencriptado
          type: item.type
        }));
        set({ widgets: mappedWidgets, loading: false });
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  setSearch: (q) => set({ searchQuery: q }),
  setCategory: (cat) => set({ selectedCategory: cat }),

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
