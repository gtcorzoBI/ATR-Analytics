export function generateJSX(visualId: string, mapping: any, columns: string[]): string {
  // Helper to safely access mapping items
  const m = (slotId: string) => mapping[slotId] || [];
  
  // Base theme constant for generated code
  const THEME = `const theme = {
    primary: "#6366f1",
    secondary: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    axis: "#94a3b8",
    grid: "rgba(148, 163, 184, 0.05)",
    text: "#64748b"
  };`;

  // General Aggregation Helper to be injected into the JSX
  const aggregationHelper = `
  const aggregateData = (rawData, mapping) => {
    if (!rawData || rawData.length === 0) return [];
    
    // Grouping slots
    const groups = [
      ...(mapping.xAxis || []), 
      ...(mapping.legend || []), 
      ...(mapping.category || []),
      ...(mapping.details || []),
      ...(mapping.rows || []),
      ...(mapping.columns || []),
      ...(mapping.breakdown || [])
    ].map(item => item.name);

    // Value slots
    const values = [
      ...(mapping.yAxis || []), 
      ...(mapping.yAxisSec || []),
      ...(mapping.yAxisColumn || []),
      ...(mapping.yAxisLine || []),
      ...(mapping.values || []),
      ...(mapping.target || []),
      ...(mapping.size || [])
    ];

    if (groups.length === 0 && values.length > 0) {
       const res = {};
       values.forEach(v => {
         const nums = rawData.map(r => Number(r[v.name] || 0)).filter(n => !isNaN(n));
         const displayName = v.displayName || v.name;
         if (v.agg === 'sum') res[displayName] = nums.reduce((a, b) => a + b, 0);
         else if (v.agg === 'avg') res[displayName] = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
         else if (v.agg === 'min') res[displayName] = Math.min(...nums);
         else if (v.agg === 'max') res[displayName] = Math.max(...nums);
         else if (v.agg === 'count') res[displayName] = rawData.length;
         else if (v.agg === 'median') {
            const sorted = [...nums].sort((a,b) => a-b);
            const mid = Math.floor(sorted.length / 2);
            res[displayName] = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
         }
         else if (v.agg === 'stdev' || v.agg === 'var') {
            const avg = nums.reduce((a,b) => a+b, 0) / nums.length;
            const variance = nums.reduce((s, n) => s + Math.pow(n - avg, 2), 0) / nums.length;
            res[displayName] = v.agg === 'var' ? variance : Math.sqrt(variance);
         }
         else res[displayName] = nums[0];
       });
       return [res];
    }

    const map = new Map();
    rawData.forEach(row => {
      const key = groups.map(g => row[g]).join('|');
      if (!map.has(key)) {
        const item = { _rawData: [row] };
        groups.forEach(g => item[g] = row[g]);
        map.set(key, item);
      } else {
        map.get(key)._rawData.push(row);
      }
    });

    return Array.from(map.values()).map(item => {
      const res = { ...item };
      values.forEach(v => {
        const nums = item._rawData.map(r => Number(r[v.name] || 0)).filter(n => !isNaN(n));
        const displayName = v.displayName || v.name;
        if (v.agg === 'sum') res[displayName] = nums.reduce((a, b) => a + b, 0);
        else if (v.agg === 'avg') res[displayName] = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        else if (v.agg === 'min') res[displayName] = Math.min(...nums);
        else if (v.agg === 'max') res[displayName] = Math.max(...nums);
        else if (v.agg === 'count') res[displayName] = item._rawData.length;
        else if (v.agg === 'distinct') res[displayName] = new Set(item._rawData.map(r => r[v.name])).size;
        else if (v.agg === 'median') {
            const sorted = [...nums].sort((a,b) => a-b);
            const mid = Math.floor(sorted.length / 2);
            res[displayName] = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
        }
        else if (v.agg === 'stdev' || v.agg === 'var') {
            const avg = nums.reduce((a,b) => a+b, 0) / nums.length;
            const variance = nums.reduce((s, n) => s + Math.pow(n - avg, 2), 0) / nums.length;
            res[displayName] = v.agg === 'var' ? variance : Math.sqrt(variance);
        }
        else res[displayName] = nums[0];
      });
      delete res._rawData;
      return res;
    });
  };`;

  const templates: Record<string, string> = {
    'bar-stacked': `
function Chart() {
  \${THEME}
  \${aggregationHelper}

  const mapping = \${JSON.stringify(mapping)};
  const chartData = aggregateData(data, mapping);
  const xKey = mapping.xAxis?.[0]?.name || columns[0];
  const legendKey = mapping.legend?.[0]?.name;
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis 
          dataKey={xKey} 
          stroke={theme.axis} 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip 
           cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
           contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
        />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />
        {mapping.yAxis?.map((v, i) => (
          <Bar 
            key={i}
            name={v.displayName || v.name}
            dataKey={v.displayName || v.name}
            stackId="a"
            fill={i === 0 ? theme.primary : i === 1 ? theme.secondary : theme.warning}
            radius={[4, 4, 0, 0]}
            onClick={(d) => window.onFilterChange?.({ field: xKey, value: d[xKey] })}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
    `,
    'bar-grouped': `
function Chart() {
  \${THEME}
  \${aggregationHelper}
  const mapping = \${JSON.stringify(mapping)};
  const chartData = aggregateData(data, mapping);
  const xKey = mapping.xAxis?.[0]?.name || columns[0];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey={xKey} stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />
        {mapping.yAxis?.map((v, i) => (
          <Bar 
            key={i}
            name={v.displayName || v.name}
            dataKey={v.displayName || v.name}
            fill={i === 0 ? theme.primary : i === 1 ? theme.secondary : theme.warning}
            radius={[4, 4, 0, 0]}
            barSize={20}
            onClick={(d) => window.onFilterChange?.({ field: xKey, value: d[xKey] })}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
    `,
    'line': `
function Chart() {
  \${THEME}
  \${aggregationHelper}
  const mapping = \${JSON.stringify(mapping)};
  const chartData = aggregateData(data, mapping);
  const xKey = mapping.xAxis?.[0]?.name || columns[0];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey={xKey} stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
        {mapping.yAxis?.map((v, i) => (
          <Line 
            key={i}
            name={v.displayName || v.name}
            dataKey={v.displayName || v.name}
            stroke={i === 0 ? theme.primary : i === 1 ? theme.secondary : theme.warning}
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
    `,
    'donut': `
function Chart() {
  \${THEME}
  \${aggregationHelper}
  const mapping = \${JSON.stringify(mapping)};
  const chartData = aggregateData(data, mapping);
  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  const valKey = mapping.yAxis?.[0]?.name || columns[1];
  const nameKey = mapping.legend?.[0]?.name || columns[0];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey={valKey}
          nameKey={nameKey}
          onClick={(d) => window.onFilterChange?.({ field: nameKey, value: d[nameKey] })}
        >
          {chartData.map((entry, index) => (
            <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
        <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
    `,
    'card': `
function Chart() {
  \${ aggregationHelper }
  const mapping = \${JSON.stringify(mapping)};
  const chartData = aggregateData(data, mapping)[0];
  const valField = mapping.yAxis?.[0];
  const val = chartData?.[valField?.displayName || valField?.name] || 0;
  
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-2 p-6">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {valField?.displayName || valField?.name || 'Indicador'}
      </span>
      <span className="text-5xl font-black tracking-tighter text-indigo-500">
        {typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 1 }) : val}
      </span>
      <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
         Propiedad Atómica
      </div>
    </div>
  );
}
    `,
    'treemap': `
function Chart() {
  \${THEME}
  \${aggregationHelper}
  const mapping = \${JSON.stringify(mapping)};
  const chartData = aggregateData(data, mapping);
  const nameKey = mapping.category?.[0]?.name || columns[0];
  const valKey = mapping.yAxis?.[0]?.displayName || mapping.yAxis?.[0]?.name || columns[1];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={chartData}
        dataKey={valKey}
        stroke="#fff"
        fill={theme.primary}
        aspectRatio={4/3}
        onClick={(d) => window.onFilterChange?.({ field: nameKey, value: d[nameKey] })}
      >
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
      </Treemap>
    </ResponsiveContainer>
  );
}
    `,
    'table': `
function Chart() {
  const mapping = \${JSON.stringify(mapping)};
  const cols = mapping.columns?.length > 0 ? mapping.columns : columns.map(c => ({ name: c }));
  
  return (
    <div className="w-full h-full overflow-auto bg-white/5 rounded-xl border border-slate-700/50">
      <table className="w-full text-left border-collapse text-[10px]">
        <thead className="sticky top-0 bg-slate-800 z-10">
          <tr>
            {cols.map(c => (
              <th key={c.name} className="px-4 py-2 font-black uppercase tracking-widest text-indigo-400 border-b border-slate-700">
                {c.displayName || c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 100).map((row, i) => (
            <tr key={i} className="border-b border-slate-700/30 hover:bg-white/5 transition">
              {cols.map(c => (
                <td key={c.name} className="px-4 py-2 opacity-70 font-medium whitespace-nowrap">
                  {String(row[c.name] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
    `,
    'bar-horizontal': `
function Chart() {
  \${THEME}
  \${aggregationHelper}
  const mapping = \${JSON.stringify(mapping)};
  const chartData = aggregateData(data, mapping);
  const yKey = mapping.xAxis?.[0]?.name || columns[0];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
        <XAxis type="number" stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} />
        <YAxis dataKey={yKey} type="category" stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
        {mapping.yAxis?.map((v, i) => (
          <Bar 
            key={i} 
            name={v.displayName || v.name} 
            dataKey={v.displayName || v.name} 
            fill={i === 0 ? theme.primary : theme.secondary} 
            radius={[0, 4, 4, 0]} 
            onClick={(d) => window.onFilterChange?.({ field: yKey, value: d[yKey] })}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
    `,
    'combo': `
function Chart() {
  \${THEME}
  \${aggregationHelper}
  const mapping = \${JSON.stringify(mapping)};
  const chartData = aggregateData(data, mapping);
  const xKey = mapping.xAxis?.[0]?.name || columns[0];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid stroke={theme.grid} vertical={false} />
        <XAxis dataKey={xKey} stroke={theme.axis} fontSize={10} tickLine={false} />
        <YAxis yAxisId="left" stroke={theme.axis} fontSize={10} />
        <YAxis yAxisId="right" orientation="right" stroke={theme.secondary} fontSize={10} />
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
        <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px' }} />
        <Bar yAxisId="left" dataKey={mapping.yAxisColumn?.[0]?.displayName || mapping.yAxisColumn?.[0]?.name} fill={theme.primary} radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" dataKey={mapping.yAxisLine?.[0]?.displayName || mapping.yAxisLine?.[0]?.name} stroke={theme.secondary} strokeWidth={3} dot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
    `,
    'scatter': `
function Chart() {
  \${THEME}
  \${aggregationHelper}
  const mapping = \${JSON.stringify(mapping)};
  const chartData = aggregateData(data, mapping);
  const xKey = mapping.xAxis?.[0]?.displayName || mapping.xAxis?.[0]?.name;
  const yKey = mapping.yAxis?.[0]?.displayName || mapping.yAxis?.[0]?.name;
  const nameKey = mapping.details?.[0]?.name || columns[0];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid stroke={theme.grid} />
        <XAxis type="number" dataKey={xKey} name={xKey} stroke={theme.axis} fontSize={10} />
        <YAxis type="number" dataKey={yKey} name={yKey} stroke={theme.axis} fontSize={10} />
        <ZAxis type="number" dataKey={mapping.size?.[0]?.displayName || mapping.size?.[0]?.name} range={[50, 400]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
        <Scatter name="Datos" data={chartData} fill={theme.primary} onClick={(d) => window.onFilterChange?.({ field: nameKey, value: d[nameKey] })} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
    `,
    'matrix': `
function Chart() {
  const mapping = \${JSON.stringify(mapping)};
  const [expanded, setExpanded] = React.useState({});
  \${aggregationHelper}
  const chartData = aggregateData(data, mapping);
  
  const rowKey = mapping.rows?.[0]?.name || columns[0];
  const colKey = mapping.columns?.[0]?.name || columns[1];
  const valKey = mapping.values?.[0]?.displayName || mapping.values?.[0]?.name;

  return (
    <div className="w-full h-full overflow-auto p-2 bg-slate-900/50 rounded-2xl border border-slate-700">
      <div className="text-[10px] font-black uppercase text-indigo-400 mb-4 px-2">Matriz de Rendimiento</div>
      <table className="w-full text-left text-[10px] border-collapse">
        <thead>
          <tr>
            <th className="p-2 border-b border-slate-700 bg-slate-800 sticky left-0 z-10 text-slate-500 uppercase">{rowKey}</th>
            {[...new Set(chartData.map(d => d[colKey]))].map(c => (
              <th key={c} className="p-2 border-b border-slate-700 whitespace-nowrap text-center text-slate-400 font-bold">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...new Set(chartData.map(d => d[rowKey]))].map(r => (
            <tr key={r} className="hover:bg-white/5 transition">
              <td className="p-2 border-b border-slate-800 sticky left-0 bg-slate-900 font-bold text-indigo-300">{r}</td>
              {[...new Set(chartData.map(d => d[colKey]))].map(c => {
                const item = chartData.find(d => d[rowKey] === r && d[colKey] === c);
                const val = item ? item[valKey] : 0;
                return (
                  <td key={c} className="p-2 border-b border-slate-800 text-center opacity-70">
                    <div className="w-full h-full p-1 rounded bg-indigo-500/5 hover:bg-indigo-500/20 transition cursor-pointer"
                       onClick={() => window.onFilterChange?.({ field: rowKey, value: r })}>
                      {typeof val === 'number' ? val.toLocaleString() : val}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
    `,
    'kpi': `
function Chart() {
  \${aggregationHelper}
  const mapping = \${JSON.stringify(mapping)};
  const chartData = aggregateData(data, mapping)[0];
  const indField = mapping.yAxis?.[0];
  const targetField = mapping.target?.[0];
  
  const current = chartData?.[indField?.displayName || indField?.name] || 0;
  const target = chartData?.[targetField?.displayName || targetField?.name] || 0;
  const percent = target > 0 ? (current / target) * 100 : 0;
  
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{indField?.displayName || indField?.name}</span>
        <span className={\`text-6xl font-black tracking-tighter \${percent >= 100 ? 'text-emerald-500' : 'text-orange-500'}\`}>
          {typeof current === 'number' ? current.toLocaleString() : current}
        </span>
      </div>
      
      <div className="w-full max-w-[200px] space-y-2">
        <div className="flex justify-between text-[9px] font-bold uppercase opacity-60">
           <span>Meta: {target.toLocaleString()}</span>
           <span>{percent.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
           <div 
            className={\`h-full transition-all duration-1000 \${percent >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}\`} 
            style={{ width: \`\${Math.min(percent, 100)}%\` }} 
           />
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest opacity-40">
         <span className={percent >= 100 ? 'text-emerald-500' : 'text-orange-500'}>
            {percent >= 100 ? 'Objetivo Cumplido' : 'Bajo la Meta'}
         </span>
      </div>
    </div>
  );
}
    `,
    'slicer': `
function Chart() {
  const mapping = \${JSON.stringify(mapping)};
  const field = mapping.field?.[0]?.name || columns[0];
  const items = [...new Set(data.map(d => d[field]))].sort();
  const [selected, setSelected] = React.useState(null);

  const handleClick = (val) => {
    const newVal = selected === val ? null : val;
    setSelected(newVal);
    window.onFilterChange?.({ field, value: newVal });
  };

  return (
    <div className="w-full h-full flex flex-col p-4 bg-slate-900/40 rounded-3xl border border-slate-700/50 overflow-hidden">
      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3 px-1">Filtro: {field}</div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
        <button 
          onClick={() => handleClick(null)}
          className={\`w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold transition \${selected === null ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-white/5 text-slate-400'}\`}
        >
          (Todo)
        </button>
        {items.map(item => (
          <button 
            key={item}
            onClick={() => handleClick(item)}
            className={\`w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold transition \${selected === item ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-white/5 text-slate-400'}\`}
          >
            {String(item)}
          </button>
        ))}
      </div>
    </div>
  );
}
    `
    ,
    'area': `
function Chart() {
  \${THEME}
  \${aggregationHelper}
  const mapping = \${JSON.stringify(mapping)};
  const chartData = aggregateData(data, mapping);
  const xKey = mapping.xAxis?.[0]?.name || columns[0];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <defs>
          <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={theme.primary} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={theme.primary} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey={xKey} stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
        {mapping.yAxis?.map((v, i) => (
          <Area 
            key={i} 
            type="monotone" 
            name={v.displayName || v.name} 
            dataKey={v.displayName || v.name} 
            stroke={theme.primary} 
            fillOpacity={1} 
            fill="url(#colorPv)" 
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
    `,
    'waterfall': `
function Chart() {
  \${THEME}
  \${aggregationHelper}
  const mapping = \${JSON.stringify(mapping)};
  const chartData = aggregateData(data, mapping);
  const catKey = mapping.category?.[0]?.name || columns[0];
  const valKey = mapping.yAxis?.[0]?.displayName || mapping.yAxis?.[0]?.name || columns[1];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey={catKey} stroke={theme.axis} fontSize={10} tickLine={false} />
        <YAxis stroke={theme.axis} fontSize={10} tickLine={false} />
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
        <Bar dataKey={valKey} fill={theme.primary} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
    `,
    'funnel': `
function Chart() {
  \${THEME}
  \${aggregationHelper}
  const mapping = \${JSON.stringify(mapping)};
  const chartData = aggregateData(data, mapping).sort((a, b) => (b[mapping.yAxis?.[0]?.name] || 0) - (a[mapping.yAxis?.[0]?.name] || 0));
  const catKey = mapping.category?.[0]?.name || columns[0];
  const valKey = mapping.yAxis?.[0]?.displayName || mapping.yAxis?.[0]?.name || columns[1];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <FunnelChart>
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
        <Funnel
          data={chartData}
          dataKey={valKey}
          nameKey={catKey}
          labelLine={true}
        >
          {chartData.map((entry, index) => (
            <Cell key={\`cell-\${index}\`} fill={[theme.primary, theme.secondary, theme.warning][index % 3]} />
          ))}
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}
    `
  };

  return ((templates as any)[visualId] || templates['bar-stacked']).trim();
}
