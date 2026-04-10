export interface DataSource {
  id: string;
  name: string; // Ej. "Ventas Nacionales BBDD"
  type: 'sql' | 'api' | 'static';
  endpointOrQuery: string;
  // Para propósitos de este mockup, mantendremos datos estáticos locales al crearlas
  mockDataObj?: any[];
}

export type VisualType = 'donut' | 'bar' | 'line' | 'table' | 'kpi';

export interface Measure {
  id: string;
  title: string;
  sourceId: string;
  visualType: VisualType;
  query: string; // "SELECT * FROM ventas"
  config: {
    dimensionColumn: string;    // Ej. "agencia" o "mes"
    metricColumn: string;       // Ej. "totalVentas" u "objetivo"
    agencyFilterColumn: string; // Dónde inyectamos dinámicamente el filtro "WHERE agencia = LOMAS"
  };
}

export interface CanvasDashboard {
  id: string;
  title: string;
  assignedArea: string; // Ej. "posventa"
  grid: {
    measureId: string;
    w: number;
    h: number;
    x: number;
    y: number;
  }[];
}
export interface MarketplaceWidget {
  id: string;
  name: string;
  category: string;
  ownerId: string;
  originId: string;
  description: string;
  versionId: string;
  versionTag: string;
  configJSON: string;
  contractJSON: string;
  executionJSON: string;
}

export interface DataContract {
  inputs: string[];
  schema: Record<string, string>;
  source: string;
  version: string;
}

export interface ExecutionLayer {
  engine: 'SQL_SERVER_DIRECT' | 'REST_API' | 'MOCK';
  connectionId: string;
  rawQuery?: string;
  parameters?: { name: string; type: string; required: boolean }[];
}

export interface DashboardWidgetInstance {
  instanceId: string;
  widgetId: string;
  versionId: string;
  customProps: any;
  position: { x: number; y: number; w: number; h: number };
}
