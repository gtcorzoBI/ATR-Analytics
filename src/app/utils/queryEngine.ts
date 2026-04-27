/**
 * Query Engine Agnóstico para DataCanvas O.S.
 * Desacopla la lógica de visualización del motor de ejecución.
 */

export type AggregationType = 'SUM' | 'AVG' | 'COUNT' | 'DISTINCT' | 'MIN' | 'MAX' | 'STDEV' | 'VAR' | 'MEDIAN' | 'NONE';

export interface QueryField {
  name: string;
  alias?: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}

export interface QueryAggregation {
  field: string;
  type: AggregationType;
  alias?: string;
}

export interface QueryFilter {
  field: string;
  operator: '=' | '!=' | '>' | '<' | 'LIKE' | 'IN';
  value: any;
}

export interface QueryJoin {
  table: string;
  on: { localField: string; remoteField: string };
  type: 'INNER' | 'LEFT';
}

export interface QueryDefinition {
  sourceId: string;
  table: string;
  fields: QueryField[];
  filters?: QueryFilter[];
  groupBy?: string[];
  aggregations?: QueryAggregation[];
  joins?: QueryJoin[];
  limit?: number;
}

export interface ExecutionResult {
  columns: string[];
  rows: any[];
  totalRows?: number;
  mode: 'client' | 'server';
  executionTime: number;
}

class SQLTranslator {
  static translate(def: QueryDefinition, provider: 'sqlserver' | 'mysql' = 'sqlserver'): string {
    const limit = def.limit || 50000;
    
    let selectClause = "SELECT ";
    if (limit > 0 && provider === 'sqlserver') selectClause += `TOP ${limit} `;

    const selectItems: string[] = [];

    // Fields
    def.fields.forEach(f => {
      selectItems.push(`[${f.name}]${f.alias ? ` AS [${f.alias}]` : ''}`);
    });

    // Aggregations
    if (def.aggregations) {
      def.aggregations.forEach(agg => {
        if (agg.type !== 'NONE') {
          let func = agg.type;
          if (agg.type === 'DISTINCT') func = 'COUNT(DISTINCT ';
          else if (agg.type === 'STDEV') func = 'STDEV(';
          else if (agg.type === 'VAR') func = 'VAR(';
          else if (agg.type === 'MEDIAN') func = 'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ';
          else func = `${agg.type}(`;

          const suffix = agg.type === 'MEDIAN' ? ') OVER ()' : ')';
          const alias = agg.alias || `${agg.type}_${agg.field}`;
          
          if (agg.type === 'DISTINCT') {
             selectItems.push(`COUNT(DISTINCT [${agg.field}]) AS [${alias}]`);
          } else if (agg.type === 'MEDIAN') {
             // Median is complex in SQL Server/MySQL, using a simplified version or top 1
             selectItems.push(`${func}[${agg.field}]${suffix} AS [${alias}]`);
          } else {
             selectItems.push(`${func}[${agg.field}]) AS [${alias}]`);
          }
        }
      });
    }

    selectClause += selectItems.join(", ");
    let query = `${selectClause} FROM [${def.table}]`;

    // Joins
    if (def.joins) {
      def.joins.forEach(j => {
        query += ` ${j.type} JOIN [${j.table}] ON [${def.table}].[${j.on.localField}] = [${j.table}].[${j.on.remoteField}]`;
      });
    }

    // Filters
    if (def.filters && def.filters.length > 0) {
      const filterItems = def.filters.map(f => {
        const val = typeof f.value === 'string' ? `'${f.value}'` : f.value;
        return `[${f.field}] ${f.operator} ${val}`;
      });
      query += ` WHERE ${filterItems.join(" AND ")}`;
    }

    // Group By
    if (def.groupBy && def.groupBy.length > 0) {
      query += ` GROUP BY ${def.groupBy.map(g => `[${g}]`).join(", ")}`;
    }

    if (limit > 0 && provider === 'mysql') query += ` LIMIT ${limit}`;

    return query;
  }
}

export const QueryEngine = {
  evaluateMode(rowCount: number): 'client' | 'server' {
    return rowCount > 50000 ? 'server' : 'client';
  },

  toSQL(def: QueryDefinition, provider: 'sqlserver' | 'mysql' = 'sqlserver'): string {
    return SQLTranslator.translate(def, provider);
  },

  createBasic(sourceId: string, table: string, columns: string[]): QueryDefinition {
    return {
      sourceId,
      table,
      fields: columns.map(c => ({ name: c, type: 'string' })),
      limit: 50000
    };
  }
};
