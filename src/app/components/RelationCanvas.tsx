import React, { useState, useRef, useEffect } from "react";
import { Database, Plus } from "lucide-react";

export interface NodeDef {
  id: string;
  title: string;
  x: number;
  y: number;
  fields: { name: string; type: string }[];
}

export interface EdgeDef {
  id: string;
  fromNode: string;
  fromField: string;
  toNode: string;
  toField: string;
  type: "1:1" | "1:N" | "N:M";
}

interface RelationCanvasProps {
  nodes: NodeDef[];
  edges: EdgeDef[];
  onNodesChange: (nodes: NodeDef[]) => void;
  onEdgesChange: (edges: EdgeDef[]) => void;
  dark?: boolean;
}

export default function RelationCanvas({ nodes, edges, onNodesChange, onEdgesChange, dark }: RelationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const [connectionStart, setConnectionStart] = useState<{ node: string; field: string } | null>(null);
  const connectionStartRef = useRef<{ node: string; field: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Pan canvas
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);

  const theme = {
    bg: dark ? "#06090f" : "#f8fafc",
    nodeBg: dark ? "#161b22" : "white",
    nodeBorder: dark ? "#30363d" : "#e2e8f0",
    text: dark ? "#e6edf3" : "#0f172a",
    muted: dark ? "#8b949e" : "#64748b",
    line: dark ? "#6366f1" : "#818cf8"
  };

  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      // Don't clear connectionStart here — finishConnection handles it
      // Only clear node dragging and panning
      setDraggingNode(null);
      setIsPanning(false);
      // If click landed on background (not a field connector), cancel connection
      const target = e.target as HTMLElement;
      if (!target.closest('[data-connector]')) {
        setConnectionStart(null);
        connectionStartRef.current = null;
      }
    };
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (connectionStartRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left - viewTransform.x) / viewTransform.scale,
          y: (e.clientY - rect.top - viewTransform.y) / viewTransform.scale
        });
      }

      if (isPanning && !connectionStartRef.current) {
        setViewTransform(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [connectionStart, isPanning, viewTransform]);

  const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    setDraggingNode(id);
    offsetRef.current = {
      x: e.clientX / viewTransform.scale - node.x,
      y: e.clientY / viewTransform.scale - node.y
    };
  };

  const onNodeMouseMove = (e: React.MouseEvent) => {
    if (draggingNode) {
      onNodesChange(nodes.map(n => 
        n.id === draggingNode 
          ? { ...n, x: e.clientX / viewTransform.scale - offsetRef.current.x, y: e.clientY / viewTransform.scale - offsetRef.current.y } 
          : n
      ));
    }
  };

  const startConnection = (e: React.MouseEvent, nodeId: string, field: string) => {
    e.stopPropagation();
    e.preventDefault();
    const cs = { node: nodeId, field };
    setConnectionStart(cs);
    connectionStartRef.current = cs;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left - viewTransform.x) / viewTransform.scale,
        y: (e.clientY - rect.top - viewTransform.y) / viewTransform.scale
      });
    }
  };

  const finishConnection = (e: React.MouseEvent, toNode: string, toField: string) => {
    e.stopPropagation();
    e.preventDefault();
    const cs = connectionStartRef.current;
    if (cs && cs.node !== toNode) {
      const newEdge: EdgeDef = {
        id: `e-${Date.now()}`,
        fromNode: cs.node,
        fromField: cs.field,
        toNode,
        toField,
        type: "1:N"
      };
      onEdgesChange([...edges, newEdge]);
    }
    setConnectionStart(null);
    connectionStartRef.current = null;
  };

  const getFieldPos = (nodeId: string, field: string, isRight: boolean) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const fieldIndex = node.fields.findIndex(f => f.name === field);
    if (fieldIndex === -1) return { x: 0, y: 0 };
    return {
      x: node.x + (isRight ? 220 : 0),
      y: node.y + 40 + (fieldIndex * 28) + 14 // header is ~40, row is ~28, center is 14
    };
  };

  return (
    <div 
      className="w-full h-full relative overflow-hidden" 
      style={{ background: theme.bg }}
      onMouseDown={(e) => {
        // Only start panning if click is on background, not on a node or connector
        if ((e.target as HTMLElement).closest('[data-node]') || (e.target as HTMLElement).closest('[data-connector]')) return;
        setIsPanning(true);
      }}
      onMouseMove={onNodeMouseMove}
      ref={containerRef}
      onWheel={(e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          setViewTransform(prev => ({ ...prev, scale: Math.max(0.2, Math.min(3, prev.scale - e.deltaY * 0.001)) }));
        }
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: dark
            ? "radial-gradient(circle, #30363d 1px, transparent 1px)"
            : "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
          backgroundSize: `${24 * viewTransform.scale}px ${24 * viewTransform.scale}px`,
          backgroundPosition: `${viewTransform.x}px ${viewTransform.y}px`
        }}
      />

      <div 
        className="absolute inset-0 origin-top-left"
        style={{ transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})` }}
      >
        {/* Edges SVG Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
          {edges.map(e => {
            const p1 = getFieldPos(e.fromNode, e.fromField, true);
            const p2 = getFieldPos(e.toNode, e.toField, false);
            return (
              <g key={e.id}>
                <path
                  d={`M ${p1.x} ${p1.y} C ${p1.x + 50} ${p1.y}, ${p2.x - 50} ${p2.y}, ${p2.x} ${p2.y}`}
                  fill="none"
                  stroke={theme.line}
                  strokeWidth="2"
                  className="animate-dash"
                  strokeDasharray="4 4"
                />
                <circle cx={p1.x} cy={p1.y} r="4" fill={theme.line} />
                <circle cx={p2.x} cy={p2.y} r="4" fill={theme.line} />
              </g>
            );
          })}
          {connectionStart && (
            <path
              d={`M ${getFieldPos(connectionStart.node, connectionStart.field, true).x} ${getFieldPos(connectionStart.node, connectionStart.field, true).y} C ${getFieldPos(connectionStart.node, connectionStart.field, true).x + 50} ${getFieldPos(connectionStart.node, connectionStart.field, true).y}, ${mousePos.x - 50} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
              fill="none"
              stroke={theme.line}
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity={0.6}
            />
          )}
        </svg>

        {/* Nodes Layer */}
        {nodes.map(node => (
          <div
            key={node.id}
            data-node
            onMouseDown={(e) => onNodeMouseDown(e, node.id)}
            className="absolute rounded-xl shadow-xl flex flex-col font-sans select-none cursor-move transition-shadow"
            style={{ 
              left: node.x, top: node.y, width: 220, 
              background: theme.nodeBg, border: `1px solid ${theme.nodeBorder}`,
              boxShadow: draggingNode === node.id ? '0 25px 50px -12px rgba(0,0,0,0.25)' : '0 10px 15px -3px rgba(0,0,0,0.1)'
            }}
          >
            <div className="h-10 px-3 flex items-center border-b font-bold text-[11px]" style={{ borderColor: theme.nodeBorder, color: theme.text }}>
              <Database className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
              <span className="truncate">{node.title}</span>
            </div>
            <div className="py-1 overflow-y-auto" style={{ maxHeight: '280px' }}>
              {node.fields.map(field => (
                <div 
                  key={field.name} 
                  className="flex items-center justify-between px-3 h-7 hover:bg-slate-500/10 transition-colors group relative"
                >
                  {/* Left connector — drop target */}
                  <div 
                    data-connector
                    className="absolute -left-2 top-1.5 w-4 h-4 bg-transparent cursor-crosshair z-10"
                    onMouseUp={(e) => finishConnection(e, node.id, field.name)}
                  />
                  <div className="flex gap-2 items-center overflow-hidden">
                    <span style={{ color: theme.text }} className="text-[10px] truncate">{field.name}</span>
                  </div>
                  <span style={{ color: theme.muted }} className="text-[9px] uppercase">{field.type}</span>
                  
                  {/* Right connector — drag origin */}
                  <div 
                    data-connector
                    className={`absolute -right-2 top-1.5 w-4 h-4 border-2 border-indigo-500 rounded-full cursor-crosshair transition-opacity ${
                      connectionStart ? 'opacity-100 bg-indigo-500/30' : 'opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-800'
                    }`}
                    onMouseDown={(e) => startConnection(e, node.id, field.name)}
                    onMouseUp={(e) => finishConnection(e, node.id, field.name)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
