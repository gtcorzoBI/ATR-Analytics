export interface VisualSlotDef {
  id: string;
  label: string;
  type: 'category' | 'value' | 'series';
}

export interface VisualDef {
  id: string;
  label: string;
  iconType: string;
  slots: VisualSlotDef[];
}

export const VISUAL_DEFINITIONS: Record<string, VisualDef> = {
  'bar': { id: 'bar', label: 'Barras Agrupadas', iconType: 'BarChart3', slots: [ {id: 'xAxis', label: 'Eje X', type: 'category'}, {id: 'yAxis', label: 'Eje Y', type: 'value'}, {id: 'legend', label: 'Leyenda', type: 'series'}, {id: 'smallMultiples', label: 'Múltiplos pequeños', type: 'category'}, {id: 'tooltips', label: 'Tooltips', type: 'value'} ] },
  'bar-stacked': { id: 'bar-stacked', label: 'Barras Apiladas', iconType: 'LayoutPanelTop', slots: [ {id: 'xAxis', label: 'Eje X', type: 'category'}, {id: 'yAxis', label: 'Eje Y', type: 'value'}, {id: 'legend', label: 'Leyenda', type: 'series'}, {id: 'smallMultiples', label: 'Múltiplos pequeños', type: 'category'}, {id: 'tooltips', label: 'Tooltips', type: 'value'} ] },
  'line': { id: 'line', label: 'Líneas', iconType: 'RefreshCw', slots: [ {id: 'xAxis', label: 'Eje X', type: 'category'}, {id: 'yAxis', label: 'Eje Y', type: 'value'}, {id: 'yAxisSec', label: 'Eje Y Secundario', type: 'value'}, {id: 'legend', label: 'Leyenda', type: 'series'}, {id: 'smallMultiples', label: 'Múltiplos', type: 'category'}, {id: 'tooltips', label: 'Tooltips', type: 'value'} ] },
  'bar-h': { id: 'bar-h', label: 'Barras Horizontales', iconType: 'Layers', slots: [ {id: 'xAxis', label: 'Eje Y (Categoría)', type: 'category'}, {id: 'yAxis', label: 'Eje X (Valor)', type: 'value'}, {id: 'legend', label: 'Leyenda', type: 'series'}, {id: 'smallMultiples', label: 'Múltiplos', type: 'category'}, {id: 'tooltips', label: 'Tooltips', type: 'value'} ] },
  'area': { id: 'area', label: 'Área', iconType: 'LayoutDashboard', slots: [ {id: 'xAxis', label: 'Eje X', type: 'category'}, {id: 'yAxis', label: 'Eje Y', type: 'value'}, {id: 'tooltips', label: 'Tooltips', type: 'value'} ] },
  'table': { id: 'table', label: 'Tabla', iconType: 'Table2', slots: [ {id: 'cols', label: 'Columnas', type: 'category'} ] },
  'matrix': { id: 'matrix', label: 'Matriz', iconType: 'Grid', slots: [ {id: 'rows', label: 'Filas', type: 'category'}, {id: 'cols', label: 'Columnas', type: 'category'}, {id: 'values', label: 'Valores', type: 'value'} ] },
  'slicer': { id: 'slicer', label: 'Segmentador', iconType: 'Filter', slots: [ {id: 'xAxis', label: 'Campo Filtro', type: 'category'} ] },
  'card': { id: 'card', label: 'Tarjeta', iconType: 'FileText', slots: [ {id: 'yAxis', label: 'Valor', type: 'value'}, {id: 'tooltips', label: 'Tooltips', type: 'value'} ] },
  'donut': { id: 'donut', label: 'Dona', iconType: 'Circle', slots: [ {id: 'legend', label: 'Leyenda', type: 'category'}, {id: 'yAxis', label: 'Valores', type: 'value'}, {id: 'details', label: 'Detalles', type: 'category'}, {id: 'tooltips', label: 'Tooltips', type: 'value'} ] },
  'pie': { id: 'pie', label: 'Circular', iconType: 'PieChart', slots: [ {id: 'legend', label: 'Leyenda', type: 'category'}, {id: 'yAxis', label: 'Valores', type: 'value'}, {id: 'details', label: 'Detalles', type: 'category'}, {id: 'tooltips', label: 'Tooltips', type: 'value'} ] },
  'combo': { id: 'combo', label: 'Columnas y Líneas', iconType: 'BarChart3', slots: [ {id: 'xAxis', label: 'Eje X', type: 'category'}, {id: 'yAxis', label: 'Eje Y (Columna)', type: 'value'}, {id: 'yAxisSec', label: 'Eje Y (Línea)', type: 'value'}, {id: 'legend', label: 'Leyenda Columna', type: 'series'}, {id: 'tooltips', label: 'Tooltips', type: 'value'} ] },
  'scatter': { id: 'scatter', label: 'Dispersión', iconType: 'Circle', slots: [ {id: 'xAxis', label: 'Eje X', type: 'value'}, {id: 'yAxis', label: 'Eje Y', type: 'value'}, {id: 'details', label: 'Valores (ID)', type: 'category'}, {id: 'legend', label: 'Leyenda', type: 'series'}, {id: 'size', label: 'Tamaño', type: 'value'}, {id: 'playAxis', label: 'Eje Reproducción', type: 'category'} ] },
  'kpi': { id: 'kpi', label: 'KPI', iconType: 'FileText', slots: [ {id: 'yAxis', label: 'Valor', type: 'value'}, {id: 'trend', label: 'Eje Tendencia', type: 'category'}, {id: 'target', label: 'Destino (Meta)', type: 'value'} ] },
  'treemap': { id: 'treemap', label: 'Treemap', iconType: 'Grid', slots: [ {id: 'xAxis', label: 'Categoría', type: 'category'}, {id: 'details', label: 'Detalles', type: 'category'}, {id: 'yAxis', label: 'Valores', type: 'value'} ] }
};

export type VisualSlotItem = { name: string; agg: 'sum' | 'avg' | 'count' | 'distinct_count' | 'min' | 'max' | 'none'; };
export type VisualMappingState = Record<string, VisualSlotItem[]>;

// Helper to generate the initial empty state for a mapping
export const getEmptyMapping = (): VisualMappingState => ({});
