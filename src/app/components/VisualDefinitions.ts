export type AggregationType = 'none' | 'sum' | 'avg' | 'min' | 'max' | 'distinct' | 'count' | 'stdev' | 'var' | 'median';

export interface VisualSlotDef {
  id: string;
  label: string;
  type: 'category' | 'value' | 'series' | 'detail' | 'size' | 'trend' | 'target';
  allowAggregation?: boolean;
}

export interface VisualDef {
  id: string;
  label: string;
  iconType: string;
  slots: VisualSlotDef[];
  description?: string;
}

export const VISUAL_AGGREGATIONS: { id: AggregationType; label: string }[] = [
  { id: 'none', label: 'No resumir' },
  { id: 'sum', label: 'Suma' },
  { id: 'avg', label: 'Promedio' },
  { id: 'min', label: 'Mínimo' },
  { id: 'max', label: 'Máximo' },
  { id: 'distinct', label: 'Recuento (distintivo)' },
  { id: 'count', label: 'Recuento' },
  { id: 'stdev', label: 'Desviación estándar' },
  { id: 'var', label: 'Varianza' },
  { id: 'median', label: 'Mediana' }
];

export const VISUAL_DEFINITIONS: Record<string, VisualDef> = {
  'bar-stacked': { 
    id: 'bar-stacked', label: 'Barras Apiladas', iconType: 'LayoutPanelTop',
    slots: [
      { id: 'xAxis', label: 'Eje X', type: 'category' },
      { id: 'yAxis', label: 'Eje Y', type: 'value', allowAggregation: true },
      { id: 'legend', label: 'Leyenda', type: 'series' },
      { id: 'smallMultiples', label: 'Múltiplos pequeños', type: 'category' },
      { id: 'tooltips', label: 'Información sobre herramienta', type: 'value', allowAggregation: true }
    ]
  },
  'bar-grouped': { 
    id: 'bar-grouped', label: 'Barras Agrupadas', iconType: 'BarChart3',
    slots: [
      { id: 'xAxis', label: 'Eje X', type: 'category' },
      { id: 'yAxis', label: 'Eje Y', type: 'value', allowAggregation: true },
      { id: 'legend', label: 'Leyenda', type: 'series' },
      { id: 'smallMultiples', label: 'Múltiplos pequeños', type: 'category' },
      { id: 'tooltips', label: 'Información sobre herramienta', type: 'value', allowAggregation: true }
    ]
  },
  'bar-horizontal': { 
    id: 'bar-horizontal', label: 'Barras Horizontales', iconType: 'Layers',
    slots: [
      { id: 'xAxis', label: 'Eje Y (Categoría)', type: 'category' },
      { id: 'yAxis', label: 'Eje X (Valor)', type: 'value', allowAggregation: true },
      { id: 'legend', label: 'Leyenda', type: 'series' },
      { id: 'smallMultiples', label: 'Múltiplos pequeños', type: 'category' },
      { id: 'tooltips', label: 'Información sobre herramienta', type: 'value', allowAggregation: true }
    ]
  },
  'line': { 
    id: 'line', label: 'Líneas', iconType: 'LineChart',
    slots: [
      { id: 'xAxis', label: 'Eje X', type: 'category' },
      { id: 'yAxis', label: 'Eje Y', type: 'value', allowAggregation: true },
      { id: 'yAxisSec', label: 'Eje Y Secundario', type: 'value', allowAggregation: true },
      { id: 'legend', label: 'Leyenda', type: 'series' },
      { id: 'smallMultiples', label: 'Múltiplos pequeños', type: 'category' },
      { id: 'tooltips', label: 'Información sobre herramienta', type: 'value', allowAggregation: true }
    ]
  },
  'combo': { 
    id: 'combo', label: 'Columnas Apiladas y Líneas', iconType: 'BarChart3',
    slots: [
      { id: 'xAxis', label: 'Eje X', type: 'category' },
      { id: 'yAxisColumn', label: 'Eje Y Columna', type: 'value', allowAggregation: true },
      { id: 'yAxisLine', label: 'Eje Y Línea', type: 'value', allowAggregation: true },
      { id: 'legend', label: 'Leyenda Columna', type: 'series' },
      { id: 'smallMultiples', label: 'Múltiplos pequeños', type: 'category' },
      { id: 'tooltips', label: 'Información sobre herramienta', type: 'value', allowAggregation: true }
    ]
  },
  'donut': { 
    id: 'donut', label: 'Dona', iconType: 'CircleDot',
    slots: [
      { id: 'legend', label: 'Leyenda', type: 'category' },
      { id: 'yAxis', label: 'Valores', type: 'value', allowAggregation: true },
      { id: 'details', label: 'Detalles', type: 'category' },
      { id: 'tooltips', label: 'Información sobre herramienta', type: 'value', allowAggregation: true }
    ]
  },
  'scatter': { 
    id: 'scatter', label: 'Dispersión', iconType: 'ScatterChart',
    slots: [
      { id: 'details', label: 'Valores (Puntos)', type: 'category' },
      { id: 'xAxis', label: 'Eje X', type: 'value', allowAggregation: true },
      { id: 'yAxis', label: 'Eje Y', type: 'value', allowAggregation: true },
      { id: 'legend', label: 'Leyenda', type: 'series' },
      { id: 'size', label: 'Tamaño', type: 'size', allowAggregation: true },
      { id: 'playAxis', label: 'Eje de Reproducción', type: 'trend' },
      { id: 'tooltips', label: 'Información sobre herramienta', type: 'value', allowAggregation: true }
    ]
  },
  'table': { 
    id: 'table', label: 'Tabla', iconType: 'Table2',
    slots: [
      { id: 'columns', label: 'Columnas', type: 'category' }
    ]
  },
  'matrix': { 
    id: 'matrix', label: 'Matriz', iconType: 'Grid',
    slots: [
      { id: 'rows', label: 'Filas', type: 'category' },
      { id: 'columns', label: 'Columnas', type: 'category' },
      { id: 'values', label: 'Valores', type: 'value', allowAggregation: true }
    ]
  },
  'slicer': { 
    id: 'slicer', label: 'Segmentador', iconType: 'Filter',
    slots: [
      { id: 'field', label: 'Campo para filtrar', type: 'category' }
    ]
  },
  'card': { 
    id: 'card', label: 'Tarjeta', iconType: 'Layout',
    slots: [
      { id: 'yAxis', label: 'Valores', type: 'value', allowAggregation: true },
      { id: 'category', label: 'Categoría', type: 'category' },
      { id: 'tooltips', label: 'Información sobre herramienta', type: 'value', allowAggregation: true }
    ]
  },
  'kpi': { 
    id: 'kpi', label: 'KPI', iconType: 'TrendingUp',
    slots: [
      { id: 'yAxis', label: 'Indicador', type: 'value', allowAggregation: true },
      { id: 'trend', label: 'Eje de tendencia', type: 'category' },
      { id: 'target', label: 'Destino (Meta)', type: 'value', allowAggregation: true }
    ]
  },
  'treemap': { 
    id: 'treemap', label: 'Treemap', iconType: 'Grid',
    slots: [
      { id: 'category', label: 'Categoría', type: 'category' },
      { id: 'details', label: 'Detalles', type: 'category' },
      { id: 'yAxis', label: 'Valores', type: 'value', allowAggregation: true }
    ]
  },
  'area': { 
    id: 'area', label: 'Área', iconType: 'Layers',
    slots: [
      { id: 'xAxis', label: 'Eje X', type: 'category' },
      { id: 'yAxis', label: 'Eje Y', type: 'value', allowAggregation: true },
      { id: 'legend', label: 'Leyenda', type: 'series' }
    ]
  },
  'waterfall': { 
    id: 'waterfall', label: 'Cascada', iconType: 'Box',
    slots: [
      { id: 'category', label: 'Categoría', type: 'category' },
      { id: 'yAxis', label: 'Valores', type: 'value', allowAggregation: true },
      { id: 'breakdown', label: 'Desglose', type: 'category' }
    ]
  },
  'funnel': { 
    id: 'funnel', label: 'Embudo', iconType: 'Filter',
    slots: [
      { id: 'category', label: 'Categoría', type: 'category' },
      { id: 'yAxis', label: 'Valores', type: 'value', allowAggregation: true }
    ]
  }
};

export type VisualSlotItem = { 
  name: string; 
  type: string;
  agg: AggregationType; 
};

export type VisualMappingState = Record<string, VisualSlotItem[]>;

export const getEmptyMapping = (): VisualMappingState => ({});
