import React, { useEffect, useState } from "react";

interface PuzzleLoaderProps {
  loading: boolean;
  success?: boolean;
}

export default function PuzzleLoader({ loading, success }: PuzzleLoaderProps) {
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Small delay for the "locking" animation to finish before showing check
      const timer = setTimeout(() => setShowCheck(true), 600);
      return () => clearTimeout(timer);
    } else {
      setShowCheck(false);
    }
  }, [loading]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-white/40 backdrop-blur-[2px] transition-all duration-700">
      <div className="relative w-16 h-16 mb-4">
        {/* Puzzle Pieces Container */}
        <div className={`relative w-full h-full transition-all duration-700 transform ${showCheck ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}>
          {/* Piece 1: Top Left */}
          <div className={`absolute top-0 left-0 w-7 h-7 bg-red-400 rounded-sm shadow-sm transition-all duration-1000 ease-in-out ${loading ? 'animate-puzzle-1' : 'translate-x-[0.5px] translate-y-[0.5px]'}`}>
             <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-red-400 rounded-full" />
          </div>
          {/* Piece 2: Top Right */}
          <div className={`absolute top-0 right-0 w-7 h-7 bg-red-500 rounded-sm shadow-sm transition-all duration-1000 ease-in-out ${loading ? 'animate-puzzle-2' : '-translate-x-[0.5px] translate-y-[0.5px]'}`}>
             <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
          </div>
          {/* Piece 3: Bottom Left */}
          <div className={`absolute bottom-0 left-0 w-7 h-7 bg-red-600 rounded-sm shadow-sm transition-all duration-1000 ease-in-out ${loading ? 'animate-puzzle-3' : 'translate-x-[0.5px] -translate-y-[0.5px]'}`}>
             <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-red-600 rounded-full" />
          </div>
          {/* Piece 4: Bottom Right */}
          <div className={`absolute bottom-0 right-0 w-7 h-7 bg-red-700 rounded-sm shadow-sm transition-all duration-1000 ease-in-out ${loading ? 'animate-puzzle-4' : '-translate-x-[0.5px] -translate-y-[0.5px]'}`}>
             <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-red-700 rounded-full" />
          </div>
        </div>

        {/* Success Checkmark */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${showCheck ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
            <svg className="w-8 h-8 text-white animate-success-draw" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </div>

      <div className={`text-[10px] font-bold uppercase tracking-widest transition-all duration-500 ${showCheck ? 'text-green-600' : 'text-slate-500'}`}>
        {showCheck ? '¡Datos Listos!' : 'Construyendo Reporte...'}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes puzzle-1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-8px, -8px) rotate(-10deg); }
        }
        @keyframes puzzle-2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(8px, -8px) rotate(10deg); }
        }
        @keyframes puzzle-3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-8px, 8px) rotate(10deg); }
        }
        @keyframes puzzle-4 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(8px, 8px) rotate(-10deg); }
        }
        @keyframes success-draw {
          from { stroke-dasharray: 0 100; }
          to { stroke-dasharray: 100 0; }
        }
        .animate-puzzle-1 { animation: puzzle-1 2s infinite ease-in-out; }
        .animate-puzzle-2 { animation: puzzle-2 2s infinite ease-in-out; }
        .animate-puzzle-3 { animation: puzzle-3 2s infinite ease-in-out; }
        .animate-puzzle-4 { animation: puzzle-4 2s infinite ease-in-out; }
        .animate-success-draw { stroke-dasharray: 100; animation: success-draw 0.6s ease-out; }
      `}} />
    </div>
  );
}
