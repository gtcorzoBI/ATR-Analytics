import { create } from 'zustand';

const getEnv = (key: string, fallback: string) => {
  try {
    return (import.meta as any).env[key] || fallback;
  } catch {
    return fallback;
  }
};

const API = getEnv("VITE_API_URL", "http://localhost:3001");

interface QueryResult {
  columns: string[];
  rows: any[];
  executionTime: number;
  partial: boolean;
}

interface RuntimeState {
  dataCache: Record<string, QueryResult>; // instanceId -> data
  loadingStates: Record<string, boolean>; // instanceId -> loading
  errors: Record<string, string | null>; // instanceId -> error
  
  // Actions
  executeQuery: (instanceId: string, payload: {
    dataSourceId: string,
    queryTemplate: string,
    parameters?: any[],
    versionId?: string
  }) => Promise<void>;
  
  clearCache: (instanceId?: string) => void;
}

export const useDataRuntime = create<RuntimeState>((set, get) => ({
  dataCache: {},
  loadingStates: {},
  errors: {},

  executeQuery: async (instanceId, payload) => {
    set(state => ({
      loadingStates: { ...state.loadingStates, [instanceId]: true },
      errors: { ...state.errors, [instanceId]: null }
    }));

    const token = localStorage.getItem("atr_token");
    try {
      const res = await fetch(`${API}/api/marketplace/query`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          dataSourceId: payload.dataSourceId,
          queryTemplate: payload.queryTemplate,
          parameters: payload.parameters || [],
          versionId: payload.versionId
        })
      });
      
      const data = await res.json();
      if (data.success) {
        set(state => ({
          dataCache: { ...state.dataCache, [instanceId]: {
            columns: data.columns,
            rows: data.rows,
            executionTime: data.executionTime,
            partial: data.partial
          }},
          loadingStates: { ...state.loadingStates, [instanceId]: false }
        }));
      } else {
        set(state => ({
          errors: { ...state.errors, [instanceId]: data.error },
          loadingStates: { ...state.loadingStates, [instanceId]: false }
        }));
      }
    } catch (err: any) {
      set(state => ({
        errors: { ...state.errors, [instanceId]: err.message },
        loadingStates: { ...state.loadingStates, [instanceId]: false }
      }));
    }
  },

  clearCache: (instanceId) => {
    if (instanceId) {
      const { [instanceId]: _, ...rest } = get().dataCache;
      set({ dataCache: rest });
    } else {
      set({ dataCache: {} });
    }
  }
}));
