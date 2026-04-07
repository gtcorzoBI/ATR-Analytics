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
