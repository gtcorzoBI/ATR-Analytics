import React from 'react';
import LiveWidget from './LiveWidget';

interface MiniChartPreviewProps {
  name: string;
  code: string;
  rows: any[];
  columns: string[];
  dark: boolean;
}

export default function MiniChartPreview({ name, code, rows, columns, dark }: MiniChartPreviewProps) {
  return (
    <div className={`
      relative group overflow-hidden rounded-xl border transition-all duration-300
      ${dark ? 'bg-slate-900/50 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-300'}
      aspect-video shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing
    `}>
      {/* Label Overlay */}
      <div className={`
        absolute top-0 left-0 right-0 p-2 z-10 flex items-center justify-between
        ${dark ? 'bg-gradient-to-b from-black/60 to-transparent' : 'bg-gradient-to-b from-white/80 to-transparent'}
      `}>
         <span className={`text-[10px] font-bold truncate pr-4 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
            {name}
         </span>
         <span className={`text-[9px] opacity-50 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            {rows.length} reg.
         </span>
      </div>

      {/* The Actual Rendered Content (Scaled Down) */}
      <div className="absolute inset-x-0 bottom-0 top-6 overflow-hidden pointer-events-none origin-top transition-transform group-hover:scale-[1.02]">
        <div style={{ transform: 'scale(0.35)', transformOrigin: 'top left', width: '286%', height: '286%' }}>
          <LiveWidget 
            code={code} 
            rows={rows} 
            columns={columns} 
            dark={dark} 
            padding={10}
            hideControls={true} 
          />
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors pointer-events-none" />
    </div>
  );
}
