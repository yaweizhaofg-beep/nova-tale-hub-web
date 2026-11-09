import { useState, useRef } from "react";
import { type CNode } from "@/features/canvas/canvas-types";
import { KIND_COLOR, S } from "./presentation";
import { Plus, Minus } from "lucide-react";

const MM_W = 192;
const MM_H = 118;

export function Minimap({ nodes, pan, zoom, canvasW, canvasH, onPan, onZoom }: {
  nodes: CNode[]; pan: {x:number;y:number}; zoom: number;
  canvasW: number; canvasH: number;
  onPan: (p:{x:number;y:number}) => void; onZoom: (delta:number) => void;
}) {
  const [dragPos, setDragPos] = useState<{x:number;y:number}|null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const onHeaderDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    const onMM = (ev: MouseEvent) => {
      setDragPos({ x: ev.clientX - offX, y: ev.clientY - offY });
    };
    const onMU = () => {
      document.removeEventListener("mousemove", onMM);
      document.removeEventListener("mouseup", onMU);
    };
    document.addEventListener("mousemove", onMM);
    document.addEventListener("mouseup", onMU);
  };

  const visible = nodes.filter(n => !n.hidden);
  if (visible.length === 0) return null;

  const allX = visible.flatMap(n => [n.x, n.x + n.w]);
  const allY = visible.flatMap(n => [n.y, n.y + n.h]);
  const pad  = 50;
  const wMinX = Math.min(...allX) - pad;
  const wMinY = Math.min(...allY) - pad;
  const wMaxX = Math.max(...allX) + pad;
  const wMaxY = Math.max(...allY) + pad;
  const wW = wMaxX - wMinX;
  const wH = wMaxY - wMinY;
  const sc = Math.min(MM_W / wW, MM_H / wH);

  const toMX = (wx: number) => (wx - wMinX) * sc;
  const toMY = (wy: number) => (wy - wMinY) * sc;

  const vpWX = -pan.x / zoom;
  const vpWY = -pan.y / zoom;
  const vpWW = canvasW / zoom;
  const vpWH = canvasH / zoom;
  const vrX = Math.max(0, toMX(vpWX));
  const vrY = Math.max(0, toMY(vpWY));
  const vrW = Math.min(MM_W - vrX, vpWW * sc);
  const vrH = Math.min(MM_H - vrY, vpWH * sc);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = mx / sc + wMinX;
    const wy = my / sc + wMinY;
    onPan({ x: -(wx * zoom) + canvasW / 2, y: -(wy * zoom) + canvasH / 2 });
  };

  const posStyle: React.CSSProperties = dragPos
    ? { position:"absolute", left: dragPos.x, top: dragPos.y }
    : { position:"absolute", right:16, bottom:80 };

  return (
    <div ref={panelRef} style={{
      ...posStyle, zIndex:40,
      background:"rgba(12,13,18,.92)", backdropFilter:"blur(20px)",
      border:`1px solid ${S.bdr2}`, borderRadius:10,
      boxShadow:"0 8px 32px rgba(0,0,0,.5)", overflow:"hidden", userSelect:"none",
    }}>
      <div onMouseDown={onHeaderDragStart}
        style={{ height:14, display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"grab", background:"rgba(255,255,255,.02)", borderBottom:`1px solid ${S.bdr}` }}>
        <div style={{ width:24, height:2, borderRadius:2, background:"rgba(255,255,255,.15)" }}/>
      </div>
      <div style={{ position:"relative", width:MM_W, height:MM_H }}>
        <svg width={MM_W} height={MM_H} style={{ display:"block", cursor:"crosshair" }}
          onMouseDown={e => e.stopPropagation()} onClick={handleClick}>
          {visible.map(n => (
            <rect key={n.id} x={toMX(n.x)} y={toMY(n.y)}
              width={Math.max(3, n.w * sc)} height={Math.max(3, n.h * sc)} rx={2}
              fill={`${KIND_COLOR[n.kind]}22`} stroke={KIND_COLOR[n.kind]} strokeWidth={0.8}/>
          ))}
          <rect x={vrX} y={vrY} width={Math.max(8, vrW)} height={Math.max(6, vrH)}
            fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.55)"
            strokeWidth={1} strokeDasharray="3 2"/>
        </svg>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:0, borderTop:`1px solid ${S.bdr}`, padding:"4px 6px" }}>
        <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onZoom(-0.1);}}
          style={{ width:26, height:26, borderRadius:6, display:"flex", alignItems:"center",
            justifyContent:"center", background:"none", border:"none", color:S.t3, cursor:"pointer" }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=S.surface;}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
          <Minus style={{ width:11, height:11 }}/>
        </button>
        <span style={{ flex:1, textAlign:"center", fontSize:11, fontWeight:600, color:S.t2 }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onZoom(0.1);}}
          style={{ width:26, height:26, borderRadius:6, display:"flex", alignItems:"center",
            justifyContent:"center", background:"none", border:"none", color:S.t3, cursor:"pointer" }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=S.surface;}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
          <Plus style={{ width:11, height:11 }}/>
        </button>
      </div>
    </div>
  );
}
