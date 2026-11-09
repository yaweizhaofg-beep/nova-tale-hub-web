// ═══════════════════════════════════════════════════════════════════════════════════
// CanvasPage - 无限画布编辑器（对齐 Make gAlz60sm49QC7SQ6Kjb0X0 CanvasPage.tsx）
// ═══════════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from "react";
import {
  ChevronDown, Plus, Minus, X,
  Undo2, Redo2, Save,
  ImageIcon, Play, Mic2, Upload, Layers,
  MoreHorizontal,
  MousePointer, Move,
  Clock, AlertTriangle, CheckCircle,
  Search, Zap, Film, AlignLeft,
  Trash2, Copy, Lock, Unlock, Eye, EyeOff,
  BarChart3,
} from "lucide-react";
import { Nav } from "../shared";
import { getCanvases } from "../canvases";
import type { SpaceKind } from "../billing";

// ─── Types ────────────────────────────────────────────────────────────────────
type NodeStatus = "idle" | "queued" | "running" | "done" | "error" | "partial";
type NodeKind = "text" | "image" | "video" | "audio" | "genImg" | "genVid" | "group";
type Tool = "select" | "move" | "text" | "image" | "video" | "audio" | "genCfg" | "group" | "upload";
type SidePaneTab = "elements" | "assets";

export interface CNode {
  id: string; kind: NodeKind; label: string;
  x: number; y: number; w: number; h: number;
  status: NodeStatus; locked?: boolean; hidden?: boolean;
  content?: string;
  params?: Record<string, string | number>;
}
export interface CEdge { from: string; to: string; }

// ─── Design Tokens (from Make) ────────────────────────────────────────────────
const KIND_COLOR: Record<NodeKind, string> = {
  text:   "#f59e0b",
  image:  "#22d3ee",
  video:  "#34d399",
  audio:  "#f472b6",
  genImg: "#a78bfa",
  genVid: "#6366f1",
  group:  "#94a3b8",
};
const STATUS_COLOR: Record<NodeStatus, string> = {
  idle: "rgba(255,255,255,.25)", queued: "#f59e0b", running: "#6366f1",
  done: "#34d399", error: "#f87171", partial: "#f59e0b",
};
const STATUS_LABEL: Record<NodeStatus, string> = {
  idle: "空", queued: "排队", running: "生成中", done: "完成", error: "失败", partial: "部分",
};

const S = {
  bg:      "#090A0E",
  panel:   "#0E0F14",
  surface: "#13151C",
  bdr:     "rgba(255,255,255,.07)",
  bdr2:    "rgba(255,255,255,.12)",
  t1:      "#F4F5F7",
  t2:      "#A4A8B3",
  t3:      "#6F7480",
  t4:      "rgba(255,255,255,.2)",
  gold:    "#FF8A1F",
} as const;

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INIT_NODES: CNode[] = [
  { id:"prompt", kind:"text",   label:"文本提示词",   x:80,  y:220, w:240, h:170, status:"idle",
    content:"主角林沐，30岁，现代都市艺术家。站在空旷画廊，背光，缓慢转身。侧脸近景，神情内敛，棉麻白衬衫。" },
  { id:"ref",    kind:"image",  label:"人物参考图",   x:390, y:150, w:190, h:240, status:"done" },
  { id:"genImg", kind:"genImg", label:"生图配置",     x:650, y:120, w:250, h:280, status:"done",
    params:{ 模型:"SD XL", 比例:"3:4", 数量:4, 积分:60 } },
  { id:"r1",     kind:"image",  label:"生成结果 1",   x:970, y:80,  w:176, h:230, status:"done" },
  { id:"r2",     kind:"image",  label:"生成结果 2",   x:1160,y:80,  w:176, h:230, status:"done" },
  { id:"r3",     kind:"image",  label:"生成结果 3",   x:970, y:326, w:176, h:230, status:"partial" },
  { id:"r4",     kind:"image",  label:"生成结果 4",   x:1160,y:326, w:176, h:230, status:"error" },
  { id:"genVid", kind:"genVid", label:"视频生成配置", x:1000,y:610, w:250, h:230, status:"idle",
    params:{ 模型:"Kling 1.5", 比例:"16:9", 时长:"5秒", 积分:80 } },
  { id:"vid",    kind:"video",  label:"视频结果",     x:1310,y:600, w:270, h:170, status:"queued" },
];
const INIT_EDGES: CEdge[] = [
  { from:"prompt", to:"genImg" },
  { from:"ref",    to:"genImg" },
  { from:"genImg", to:"r1" },
  { from:"genImg", to:"r2" },
  { from:"genImg", to:"r3" },
  { from:"genImg", to:"r4" },
  { from:"r1",     to:"genVid" },
  { from:"genVid", to:"vid" },
];

// ─── ElectricEdge ──────────────────────────────────────────────────────────────
function ElectricEdge({ a, b, color, selected }: {
  a:[number,number]; b:[number,number]; color:string; selected?:boolean;
}) {
  const mx  = a[0] + (b[0]-a[0])*0.5;
  const d   = `M ${a[0]} ${a[1]} C ${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}`;
  const chord = Math.hypot(b[0]-a[0], b[1]-a[1]);
  const len   = Math.max(120, chord * 1.35);
  const delay = (((a[0]*1.3 + a[1]*0.9 + b[0]*0.6) % 2400) / 2400).toFixed(3);
  const dur   = (2.2 + ((a[0]+b[1]) % 80) / 80).toFixed(2);
  const gap  = len + 600;
  const tailLen = 48;
  const midLen  = 28;
  const tipLen  = 8;

  return (
    <g>
      {selected && <path d={d} fill="none" stroke={color} strokeWidth={10} strokeOpacity={0.08} strokeLinecap="round"/>}
      <path d={d} fill="none" stroke={color} strokeWidth={1} strokeOpacity={selected ? 0.3 : 0.14} strokeLinecap="round"/>
      <path d={d} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round"
        strokeDasharray={`${tailLen} ${gap}`}
        style={{ strokeOpacity:0.22, filter:`blur(5px)`,
          animation:`comet ${dur}s ease-in-out -${delay}s infinite` }}/>
      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
        strokeDasharray={`${midLen} ${gap + tailLen - midLen}`}
        style={{ strokeOpacity:0.7, animation:`comet ${dur}s ease-in-out -${delay}s infinite` }}/>
      <path d={d} fill="none" stroke="rgba(255,255,255,.95)" strokeWidth={2} strokeLinecap="round"
        strokeDasharray={`${tipLen} ${gap + midLen - tipLen}`}
        style={{ animation:`comet ${dur}s ease-in-out -${delay}s infinite`,
          filter:`drop-shadow(0 0 3px ${color}) drop-shadow(0 0 6px ${color})` }}/>
      <circle cx={b[0]} cy={b[1]} r={4} fill={color} fillOpacity={0.15}/>
      <circle cx={b[0]} cy={b[1]} r={2.5} fill={color} fillOpacity={0.85}
        style={{filter:`drop-shadow(0 0 5px ${color}) drop-shadow(0 0 10px ${color})`}}/>
      <circle cx={a[0]} cy={a[1]} r={1.8} fill={color} fillOpacity={0.45}/>
    </g>
  );
}

// ─── Port ─────────────────────────────────────────────────────────────────────
function PortWrapper({ side, color, onClick, active }: {
  side:"left"|"right"; color:string; onClick?:()=>void; active?:boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        position:"absolute", top:"50%", transform:"translateY(-50%)",
        [side==="right" ? "right" : "left"]: -8,
        width:14, height:14, borderRadius:"50%", cursor:"crosshair", zIndex:6,
        background: active ? color : "rgba(10,10,20,.9)",
        border:`1.5px solid ${active ? color : `${color}60`}`,
        boxShadow: active
          ? `0 0 0 3px ${color}25, 0 0 12px ${color}80`
          : `0 0 6px ${color}30`,
        transition:"all .18s cubic-bezier(.4,0,.2,1)",
      }}
    />
  );
}

// ─── SVG Kind icons ───────────────────────────────────────────────────────────
function IconText({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1 2.5h10M6 2.5V10M2.5 10h7" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconImage({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="10" rx="2" stroke={c} strokeWidth="1.2"/>
      <circle cx="4" cy="4" r="1.2" fill={c} fillOpacity=".8"/>
      <path d="M1 8l3-3 2.5 2.5L9 5l2 3" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconVideo({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="2.5" width="7.5" height="7" rx="1.5" stroke={c} strokeWidth="1.2"/>
      <path d="M8.5 5l2.5-1.5v5L8.5 7" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconAudio({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="4.5" y="1" width="3" height="6" rx="1.5" stroke={c} strokeWidth="1.2"/>
      <path d="M2 6.5a4 4 0 008 0" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="6" y1="10.5" x2="6" y2="11.5" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconGenImg({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1l.9 2.7L9.7 4.5 7 6.2l.9 2.7L6 7.2 3.1 8.9 4 6.2 1.3 4.5 4.1 3.7z" stroke={c} strokeWidth="1.1" strokeLinejoin="round" fill={`${c}25`}/>
      <circle cx="10" cy="10" r="1.5" fill={c} fillOpacity=".6"/>
    </svg>
  );
}
function IconGenVid({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1l.9 2.7L9.7 4.5 7 6.2l.9 2.7L6 7.2 3.1 8.9 4 6.2 1.3 4.5 4.1 3.7z" stroke={c} strokeWidth="1.1" strokeLinejoin="round" fill={`${c}25`}/>
      <path d="M8 9.5l2.5-1.5v3z" fill={c}/>
    </svg>
  );
}
function IconGroup({ c }: { c: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="4.5" height="4.5" rx="1" stroke={c} strokeWidth="1.1"/>
      <rect x="6.5" y="1" width="4.5" height="4.5" rx="1" stroke={c} strokeWidth="1.1"/>
      <rect x="1" y="6.5" width="4.5" height="4.5" rx="1" stroke={c} strokeWidth="1.1"/>
      <rect x="6.5" y="6.5" width="4.5" height="4.5" rx="1" stroke={c} strokeWidth="1.1"/>
    </svg>
  );
}
type IconCProps = { c: string };
const KIND_SVG: Record<NodeKind, React.FC<IconCProps>> = {
  text: IconText, image: IconImage, video: IconVideo, audio: IconAudio,
  genImg: IconGenImg, genVid: IconGenVid, group: IconGroup,
};
const KIND_ICON: Record<NodeKind,React.ElementType> = {
  text:AlignLeft, image:ImageIcon, video:Film, audio:Mic2,
  genImg:Zap, genVid:Zap, group:Layers,
};

// ─── NodeCard ─────────────────────────────────────────────────────────────────
function NodeCard({ node, selected, onMouseDown, onClick, onPortClick, connectFrom, onDelete, onContextMenu }: {
  node:CNode; selected:boolean;
  onMouseDown:(e:React.MouseEvent)=>void;
  onClick:(e:React.MouseEvent)=>void;
  onPortClick:(id:string,side:"left"|"right")=>void;
  connectFrom:{nodeId:string;side:"left"|"right"}|null;
  onDelete:(id:string)=>void;
  onContextMenu:(e:React.MouseEvent,id:string)=>void;
}) {
  const color   = KIND_COLOR[node.kind];
  const KindSvg = KIND_SVG[node.kind];

  const body = () => {
    if (node.kind==="text") return (
      <div style={{padding:"10px 13px",flex:1,overflow:"hidden"}}>
        <p style={{margin:0,fontSize:12,color:S.t2,lineHeight:1.8,
          display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
          {node.content}
        </p>
      </div>
    );
    if (node.kind==="image") return (
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
        background:`radial-gradient(ellipse at 50% 60%,${color}10 0%,transparent 65%)`}}>
        {node.status==="done" ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            <div style={{width:48,height:48,borderRadius:10,background:`${color}12`,border:`1px solid ${color}30`,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <IconImage c={`${color}80`}/>
            </div>
            <span style={{fontSize:10,color:S.t4}}>图片已就绪</span>
          </div>
        ) : node.status==="error" ? (
          <div style={{textAlign:"center"}}>
            <div style={{width:36,height:36,borderRadius:9,background:"rgba(248,113,113,.1)",
              border:"1px solid rgba(248,113,113,.25)",display:"flex",alignItems:"center",
              justifyContent:"center",margin:"0 auto 8px"}}>
              <AlertTriangle style={{width:16,height:16,color:"#f87171"}}/>
            </div>
            <div style={{fontSize:10.5,color:"#f87171",marginBottom:6}}>生成失败</div>
            <button style={{fontSize:11,padding:"4px 12px",borderRadius:7,
              background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.28)",
              color:"#f87171",cursor:"pointer"}}>重新生成</button>
          </div>
        ) : node.status==="running" ? (
          <div style={{width:"75%",textAlign:"center"}}>
            <div style={{height:2,background:"rgba(255,255,255,.06)",borderRadius:2,overflow:"hidden",marginBottom:8}}>
              <div style={{height:"100%",width:"55%",borderRadius:2,
                background:`linear-gradient(90deg,${color}80,${color})`,
                animation:"shimmer-bar 1.6s ease-in-out infinite"}}/>
            </div>
            <span style={{fontSize:10.5,color:S.t4}}>AI 生成中…</span>
          </div>
        ) : (
          <div style={{width:40,height:40,borderRadius:10,background:`${color}10`,
            border:`1px solid ${color}20`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <IconImage c={S.t4}/>
          </div>
        )}
      </div>
    );
    if (node.kind==="video") return (
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
        background:`radial-gradient(ellipse at 50% 60%,${color}10 0%,transparent 65%)`}}>
        {node.status==="queued" ? (
          <div style={{textAlign:"center"}}>
            <div style={{width:36,height:36,borderRadius:9,background:"rgba(251,191,36,.08)",
              border:"1px solid rgba(251,191,36,.2)",display:"flex",alignItems:"center",
              justifyContent:"center",margin:"0 auto 7px"}}>
              <Clock style={{width:16,height:16,color:"#fbbf24"}}/>
            </div>
            <div style={{fontSize:10.5,color:S.t4}}>队列等待中</div>
          </div>
        ) : (
          <div style={{width:44,height:44,borderRadius:"50%",
            background:`radial-gradient(circle,${color}25,${color}08)`,
            border:`1.5px solid ${color}45`,display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:`0 0 18px ${color}25`}}>
            <Play style={{width:16,height:16,color,marginLeft:3}}/>
          </div>
        )}
      </div>
    );
    if (node.kind==="genImg"||node.kind==="genVid") {
      const p = node.params||{};
      return (
        <div style={{padding:"10px 12px",flex:1,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
            {Object.entries(p).map(([k,v])=>(
              <div key={k} style={{borderRadius:8,padding:"6px 8px",
                background:`linear-gradient(135deg,${color}08,rgba(255,255,255,.02))`,
                border:`1px solid ${color}20`}}>
                <div style={{fontSize:8.5,color:S.t4,marginBottom:2,fontWeight:600,
                  textTransform:"uppercase",letterSpacing:"0.08em"}}>{k}</div>
                <div style={{fontSize:12,fontWeight:700,color:S.t1}}>{v}</div>
              </div>
            ))}
          </div>
          <button style={{padding:"8px 0",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",
            background:`${color}22`,border:`1px solid ${color}45`,color,
            letterSpacing:"0.03em",transition:"all .15s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${color}38`;}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=`${color}22`;}}>
            ⚡ 开始生成
          </button>
        </div>
      );
    }
    return null;
  };

  if (node.hidden) return null;

  return (
    <div style={{position:"absolute",left:node.x,top:node.y,width:node.w,zIndex:selected?10:1,
      animation:"node-appear .2s ease-out"}}>
      <PortWrapper side="left" color={color} onClick={()=>onPortClick(node.id,"left")}
        active={connectFrom?.nodeId===node.id&&connectFrom.side==="left"}/>
      <PortWrapper side="right" color={color} onClick={()=>onPortClick(node.id,"right")}
        active={connectFrom?.nodeId===node.id&&connectFrom.side==="right"}/>

      <div onMouseDown={onMouseDown} onClick={onClick}
        onContextMenu={e=>{e.preventDefault();e.stopPropagation();onContextMenu(e,node.id);}}
        style={{
          borderRadius:14, overflow:"hidden",
          cursor:node.locked?"not-allowed":"grab",
          userSelect:"none", height:node.h,
          display:"flex", flexDirection:"column",
          background: "rgba(14,15,20,0.92)",
          backdropFilter: "blur(16px)",
          border: selected ? `1px solid ${color}70` : `1px solid ${color}22`,
          boxShadow: selected
            ? `0 0 0 1px ${color}30, 0 0 24px ${color}28, 0 12px 40px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05)`
            : `0 4px 20px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.04)`,
          transition: "border-color .18s,box-shadow .18s",
          filter: node.locked ? "brightness(.7) saturate(.5)" : "none",
        }}>

        <div style={{height:2,flexShrink:0,
          background:`linear-gradient(90deg,transparent 0%,${color}90 35%,${color} 60%,transparent 100%)`,
          opacity: selected ? 1 : 0.45}}/>

        <div style={{display:"flex",alignItems:"center",gap:7,padding:"9px 11px 8px",
          background:`linear-gradient(170deg,${color}12 0%,transparent 80%)`,
          borderBottom:`1px solid ${color}18`,flexShrink:0}}>
          <div style={{width:24,height:24,borderRadius:7,display:"flex",alignItems:"center",
            justifyContent:"center",flexShrink:0,
            background:`${color}25`,border:`1px solid ${color}45`}}>
            <KindSvg c={color}/>
          </div>
          <span style={{flex:1,fontSize:12,fontWeight:600,color:S.t1,letterSpacing:"0.01em",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{node.label}</span>

          {node.status!=="idle" && (
            <span style={{fontSize:9,padding:"2px 6px",borderRadius:20,fontWeight:700,flexShrink:0,
              letterSpacing:"0.04em",
              color:STATUS_COLOR[node.status],
              background:`${STATUS_COLOR[node.status]}14`,
              border:`1px solid ${STATUS_COLOR[node.status]}30`}}>
              {STATUS_LABEL[node.status]}
            </span>
          )}
          {selected && (
            <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onDelete(node.id);}}
              style={{width:20,height:20,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",
                background:"rgba(248,113,113,.1)",border:"none",color:"#f87171",cursor:"pointer",flexShrink:0}}>
              <Trash2 style={{width:9,height:9}}/>
            </button>
          )}
          <button onMouseDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}
            style={{width:20,height:20,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",
              background:"none",border:"none",color:S.t4,cursor:"pointer",flexShrink:0,transition:"color .12s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=S.t2;}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=S.t4;}}>
            <MoreHorizontal style={{width:11,height:11}}/>
          </button>
        </div>

        <div style={{flex:1,minHeight:0,display:"flex",flexDirection:"column"}}>{body()}</div>
      </div>
    </div>
  );
}

// ─── Add node kinds ───────────────────────────────────────────────────────────
const ADD_KINDS: {kind:NodeKind;label:string;desc:string}[] = [
  {kind:"text",   label:"文本节点",   desc:"提示词 / 剧本描述"},
  {kind:"image",  label:"图片节点",   desc:"上传或接收生成图"},
  {kind:"genImg", label:"生图配置",   desc:"AI 图像生成节点"},
  {kind:"video",  label:"视频节点",   desc:"上传或接收视频"},
  {kind:"genVid", label:"视频配置",   desc:"AI 视频生成节点"},
  {kind:"audio",  label:"音频节点",   desc:"配乐 / 音效"},
  {kind:"group",  label:"分组",       desc:"框选节点归组"},
];

const SIDE_TABS: { id: SidePaneTab; icon: React.ElementType; label: string }[] = [
  { id: "elements", icon: Layers,    label: "元素" },
  { id: "assets",   icon: ImageIcon, label: "资产" },
];

// ─── SidePanel ───────────────────────────────────────────────────────────────
function SidePanel({ nodes, selectedNodeId, onNodeFocus, onDeleteNode, onAddNode,
  onToggleLock, onToggleHide, activeTab, onTabChange, onClose }: {
  nodes: CNode[]; selectedNodeId: string | null;
  onNodeFocus: (id: string) => void; onDeleteNode: (id: string) => void;
  onAddNode: (kind: NodeKind) => void; onToggleLock: (id: string) => void;
  onToggleHide: (id: string) => void;
  activeTab: SidePaneTab; onTabChange: (t: SidePaneTab) => void;
  onClose: () => void;
}) {
  const [search, setSearch]   = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const filtered = nodes.filter(n => n.label.includes(search) || search === "");

  return (
    <div style={{ width:280, flexShrink:0, background:S.panel,
      borderLeft:`1px solid ${S.bdr}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Tab header */}
      <div style={{ display:"flex", alignItems:"center", borderBottom:`1px solid ${S.bdr}`, flexShrink:0 }}>
        <div style={{ flex:1, display:"flex" }}>
          {SIDE_TABS.map(({ id, icon:Icon, label }) => (
            <button key={id} onClick={() => onTabChange(id)}
              style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                padding:"10px 0", background:"none", border:"none",
                borderBottom:`2px solid ${activeTab===id ? S.gold : "transparent"}`,
                color: activeTab===id ? S.gold : S.t3,
                cursor:"pointer", transition:"all .15s" }}>
              <Icon style={{ width:14, height:14 }}/>
              <span style={{ fontSize:10, fontWeight: activeTab===id ? 600 : 400 }}>{label}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose}
          style={{ width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center",
            background:"none", border:"none", color:S.t4, cursor:"pointer", flexShrink:0, marginRight:4 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = S.t2; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = S.t4; }}>
          <ChevronDown style={{ width:12, height:12, transform:"rotate(90deg)" }}/>
        </button>
      </div>

      {/* ── Elements tab ── */}
      {activeTab === "elements" && (
        <>
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${S.bdr}`, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:S.surface,
              borderRadius:7, padding:"5px 9px", border:`1px solid ${S.bdr}` }}>
              <Search style={{ width:11, height:11, color:S.t4, flexShrink:0 }}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索节点…"
                style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:12, color:S.t1 }}
                onMouseDown={e => e.stopPropagation()}/>
            </div>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"6px 8px" }}>
            {filtered.length === 0 && (
              <div style={{ textAlign:"center", padding:"32px 0", color:S.t4, fontSize:12 }}>暂无节点</div>
            )}
            {filtered.map(n => {
              const KindSvg = KIND_SVG[n.kind];
              const color   = KIND_COLOR[n.kind];
              const sel     = n.id === selectedNodeId;
              return (
                <div key={n.id}
                  style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 7px", borderRadius:8,
                    background: sel ? `${color}14` : "transparent",
                    border:`1px solid ${sel ? `${color}35` : "transparent"}`,
                    marginBottom:1, cursor:"pointer", transition:"all .14s" }}
                  onClick={() => onNodeFocus(n.id)}
                  onMouseEnter={e => { if(!sel)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.04)"; }}
                  onMouseLeave={e => { if(!sel)(e.currentTarget as HTMLElement).style.background="transparent"; }}>
                  <div style={{ width:2, height:16, borderRadius:2, flexShrink:0, background:sel?color:`${color}50` }}/>
                  <div style={{ width:20, height:20, borderRadius:5, display:"flex", alignItems:"center",
                    justifyContent:"center", flexShrink:0, background:`${color}16`, border:`1px solid ${color}28` }}>
                    <KindSvg c={sel ? color : `${color}90`}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11.5, fontWeight:sel?600:400, color:sel?S.t1:S.t2,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{n.label}</div>
                  </div>
                  <div
                    style={{ display:"flex", gap:2, flexShrink:0, opacity:sel?1:0, transition:"opacity .12s" }}>
                    <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onToggleLock(n.id);}}
                      title={n.locked?"解锁":"锁定"}
                      style={{ width:17, height:17, borderRadius:4, display:"flex", alignItems:"center",
                        justifyContent:"center", background:"none", border:"none",
                        color:n.locked?color:S.t4, cursor:"pointer" }}>
                      {n.locked?<Lock style={{width:8,height:8}}/>:<Unlock style={{width:8,height:8}}/>}
                    </button>
                    <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onToggleHide(n.id);}}
                      title={n.hidden?"显示":"隐藏"}
                      style={{ width:17, height:17, borderRadius:4, display:"flex", alignItems:"center",
                        justifyContent:"center", background:"none", border:"none",
                        color:n.hidden?S.t4:S.t3, cursor:"pointer" }}>
                      {n.hidden?<EyeOff style={{width:8,height:8}}/>:<Eye style={{width:8,height:8}}/>}
                    </button>
                    <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onDeleteNode(n.id);}}
                      style={{ width:17, height:17, borderRadius:4, display:"flex", alignItems:"center",
                        justifyContent:"center", background:"none", border:"none",
                        color:"rgba(248,113,113,.45)", cursor:"pointer" }}>
                      <Trash2 style={{width:8,height:8}}/>
                    </button>
                  </div>
                  <div style={{ width:5, height:5, borderRadius:"50%", flexShrink:0,
                    background:STATUS_COLOR[n.status], opacity:n.status==="idle"?0.4:1 }}/>
                </div>
              );
            })}
          </div>

          {/* Add node */}
          <div style={{ padding:"8px 10px", borderTop:`1px solid ${S.bdr}`, flexShrink:0, position:"relative" }}>
            {addOpen && (
              <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:6, right:6, zIndex:50,
                background:S.surface, border:`1px solid ${S.bdr2}`, borderRadius:12,
                boxShadow:"0 16px 48px rgba(0,0,0,.7)", padding:"4px 0", overflow:"hidden" }}>
                {ADD_KINDS.map(({ kind, label, desc }) => {
                  const KindSvg = KIND_SVG[kind];
                  const color   = KIND_COLOR[kind];
                  return (
                    <button key={kind} onMouseDown={e=>e.stopPropagation()}
                      onClick={() => { onAddNode(kind); setAddOpen(false); }}
                      style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"7px 12px",
                        background:"none", border:"none", cursor:"pointer", textAlign:"left" }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${color}0c`;}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
                      <div style={{ width:26, height:26, borderRadius:7, display:"flex", alignItems:"center",
                        justifyContent:"center", flexShrink:0, background:`${color}18`, border:`1px solid ${color}35` }}>
                        <KindSvg c={color}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:S.t1 }}>{label}</div>
                        <div style={{ fontSize:10, color:S.t4, marginTop:1 }}>{desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <button onMouseDown={e=>e.stopPropagation()} onClick={() => setAddOpen(o => !o)}
              style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                padding:"7px 0", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600,
                background: addOpen ? `${S.gold}20` : `${S.gold}0e`,
                border:`1px solid ${addOpen ? `${S.gold}50` : `${S.gold}28`}`,
                color:S.gold, transition:"all .15s" }}>
              <Plus style={{ width:12, height:12 }}/>
              添加节点
              <ChevronDown style={{ width:10, height:10,
                transform:addOpen?"rotate(180deg)":"rotate(0)", transition:"transform .18s" }}/>
            </button>
          </div>
        </>
      )}

      {/* ── Assets tab ── */}
      {activeTab === "assets" && (
        <>
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${S.bdr}`, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:S.surface,
              borderRadius:7, padding:"5px 9px", border:`1px solid ${S.bdr}` }}>
              <Search style={{ width:11, height:11, color:S.t4, flexShrink:0 }}/>
              <input placeholder="搜索资产…"
                style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:12, color:S.t1 }}
                onMouseDown={e => e.stopPropagation()}/>
            </div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"10px" }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", color:S.t4,
              textTransform:"uppercase", marginBottom:8 }}>已上传</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:5, marginBottom:14 }}>
              {Array.from({ length:6 }).map((_, i) => (
                <div key={i} style={{ aspectRatio:"1", borderRadius:7, background:S.surface,
                  border:`1px solid ${S.bdr}`, display:"flex", alignItems:"center",
                  justifyContent:"center", cursor:"pointer" }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=S.bdr2;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=S.bdr;}}>
                  <ImageIcon style={{ width:14, height:14, color:S.t4 }}/>
                </div>
              ))}
            </div>
            <button onMouseDown={e=>e.stopPropagation()}
              style={{ width:"100%", padding:"7px 0", borderRadius:7, display:"flex", alignItems:"center",
                justifyContent:"center", gap:5, background:"rgba(255,255,255,.04)",
                border:`1px solid ${S.bdr}`, color:S.t3, fontSize:12, cursor:"pointer" }}>
              <Upload style={{ width:12, height:12 }}/>上传素材
            </button>
          </div>
        </>
      )}

    </div>
  );
}

// ─── Bottom toolbar ───────────────────────────────────────────────────────────
type ToolDef = {id:Tool; label:string; kindKey?:NodeKind; svgIcon?:React.FC<IconCProps>; lucideIcon?:React.ElementType};
const TOOLS: ToolDef[] = [
  {id:"select",  label:"选择",  lucideIcon:MousePointer},
  {id:"move",    label:"移动",  lucideIcon:Move},
  {id:"text",    label:"文本",  kindKey:"text",   svgIcon:IconText},
  {id:"image",   label:"图片",  kindKey:"image",  svgIcon:IconImage},
  {id:"video",   label:"视频",  kindKey:"video",  svgIcon:IconVideo},
  {id:"audio",   label:"音频",  kindKey:"audio",  svgIcon:IconAudio},
  {id:"genCfg",  label:"生图",  kindKey:"genImg", svgIcon:IconGenImg},
  {id:"group",   label:"分组",  kindKey:"group",  svgIcon:IconGroup},
  {id:"upload",  label:"上传",  lucideIcon:Upload},
];

function BottomToolbar({ activeTool, onTool }: { activeTool:Tool; onTool:(t:Tool)=>void }) {
  return (
    <div style={{
      position:"absolute", left:16, top:"50%", transform:"translateY(-50%)",
      zIndex:40, display:"flex", flexDirection:"column", alignItems:"center", gap:1,
      background:"rgba(12,13,18,.94)", backdropFilter:"blur(24px) saturate(160%)",
      border:`1px solid rgba(255,255,255,.09)`,
      borderRadius:16, padding:"7px 5px",
      boxShadow:"0 8px 40px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.06)",
    }}>
      {TOOLS.map((t, i) => {
        const active = activeTool === t.id;
        const color  = active && t.kindKey ? KIND_COLOR[t.kindKey] : S.t3;
        const sep1 = i === 2;
        const sep2 = i === TOOLS.length - 1;
        return (
          <div key={t.id} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
            {(sep1 || sep2) && (
              <div style={{ height:1, width:18, background:"rgba(255,255,255,.08)", margin:"4px 0" }}/>
            )}
            <button title={t.label} onClick={() => onTool(t.id)}
              style={{
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                gap:3, padding:"7px 6px",
                borderRadius:10, border:"none", cursor:"pointer",
                color: active ? color : S.t3,
                background: active ? `${color}18` : "transparent",
                boxShadow: active ? `0 0 0 1px ${color}30` : "none",
                transition:"all .16s cubic-bezier(.4,0,.2,1)",
                minWidth:34,
              }}
              onMouseEnter={e => {
                if(!active)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)";
                (e.currentTarget as HTMLElement).style.color=active?color:S.t2;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background=active?`${color}18`:"transparent";
                (e.currentTarget as HTMLElement).style.color=active?color:S.t3;
              }}>
              <div style={{ width:15, height:15, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {t.svgIcon ? (
                  <t.svgIcon c={active ? color : "currentColor"}/>
                ) : t.lucideIcon ? (
                  <t.lucideIcon style={{ width:15, height:15, strokeWidth:active?2:1.5 }}/>
                ) : null}
              </div>
              <span style={{ fontSize:9.5, fontWeight:active?700:400, whiteSpace:"nowrap", lineHeight:1, letterSpacing:"0.02em" }}>
                {t.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Context menu ─────────────────────────────────────────────────────────────
type CtxMenu = { x:number; y:number; wx:number; wy:number; nodeId?:string };

const MENU_BTN: React.CSSProperties = {
  width:"100%", display:"flex", alignItems:"center", gap:9, padding:"8px 12px",
  background:"none", border:"none", cursor:"pointer", textAlign:"left", color:S.t2, fontSize:12.5,
};

function ContextMenu({ menu, nodes, onAddAt, onClose, onDelete, onDuplicate, onToggleLock, onToggleHide }: {
  menu:CtxMenu; nodes:CNode[];
  onAddAt:(kind:NodeKind,wx:number,wy:number)=>void;
  onClose:()=>void;
  onDelete:(id:string)=>void;
  onDuplicate:(id:string)=>void;
  onToggleLock:(id:string)=>void;
  onToggleHide:(id:string)=>void;
}) {
  const node = menu.nodeId ? nodes.find(n=>n.id===menu.nodeId) : undefined;
  const LEFT = Math.min(menu.x, (typeof window !== "undefined" ? window.innerWidth : 1200)  - 220);
  const TOP  = Math.min(menu.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 400);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200 }} onMouseDown={onClose}
      onContextMenu={e=>{e.preventDefault();onClose();}}>
      <div onMouseDown={e=>e.stopPropagation()} style={{
        position:"fixed", left:LEFT, top:TOP, zIndex:201,
        background:S.surface, border:`1px solid ${S.bdr2}`, borderRadius:13,
        padding:"5px 0", minWidth:210,
        boxShadow:"0 20px 60px rgba(0,0,0,.75)",
      }}>
        {node ? (
          <>
            <div style={{ padding:"7px 12px 9px", borderBottom:`1px solid ${S.bdr}`, marginBottom:3 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                {(() => { const Icon=KIND_ICON[node.kind]; const c=KIND_COLOR[node.kind]; return (
                  <div style={{ width:22, height:22, borderRadius:5, display:"flex", alignItems:"center",
                    justifyContent:"center", background:`${c}20`, border:`1px solid ${c}35` }}>
                    <Icon style={{ width:11, height:11, color:c }}/>
                  </div>
                ); })()}
                <span style={{ fontSize:12, fontWeight:600, color:S.t1 }}>{node.label}</span>
              </div>
            </div>
            {[
              { label:"复制节点",                icon:Copy,                     fn:()=>{onDuplicate(node.id);onClose();} },
              { label:node.locked?"解锁":"锁定", icon:node.locked?Unlock:Lock,  fn:()=>{onToggleLock(node.id);onClose();} },
              { label:node.hidden?"显示":"隐藏", icon:node.hidden?Eye:EyeOff,   fn:()=>{onToggleHide(node.id);onClose();} },
            ].map(({ label, icon:Icon, fn }) => (
              <button key={label} style={MENU_BTN} onClick={fn}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
                <Icon style={{ width:13, height:13, color:S.t3, flexShrink:0 }}/>{label}
              </button>
            ))}
            <div style={{ margin:"4px 8px", height:1, background:S.bdr }}/>
            <button style={{ ...MENU_BTN, color:"#f87171" }} onClick={() => { onDelete(node.id); onClose(); }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(248,113,113,.08)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
              <Trash2 style={{ width:13, height:13, flexShrink:0 }}/>删除节点
            </button>
          </>
        ) : (
          <>
            <div style={{ padding:"6px 12px 8px", borderBottom:`1px solid ${S.bdr}`, marginBottom:3 }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", color:S.t4, textTransform:"uppercase" }}>添加节点</span>
            </div>
            {ADD_KINDS.map(({ kind, label, desc }) => {
              const Icon  = KIND_ICON[kind];
              const color = KIND_COLOR[kind];
              return (
                <button key={kind} style={MENU_BTN} onClick={() => { onAddAt(kind,menu.wx,menu.wy); onClose(); }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
                  <div style={{ width:24, height:24, borderRadius:6, display:"flex", alignItems:"center",
                    justifyContent:"center", background:`${color}20`, border:`1px solid ${color}35`, flexShrink:0 }}>
                    <Icon style={{ width:12, height:12, color }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:S.t1 }}>{label}</div>
                    <div style={{ fontSize:10.5, color:S.t4, marginTop:1 }}>{desc}</div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Minimap ──────────────────────────────────────────────────────────────────
const MM_W = 192;
const MM_H = 118;

function Minimap({ nodes, pan, zoom, canvasW, canvasH, onPan, onZoom }: {
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

// ─── Canvas list + team ───────────────────────────────────────────────────────
const TEAM_MEMBERS = [
  { id:1, name:"赵雅薇", avatar:"赵", role:"管理员",  online:true  },
  { id:2, name:"林子墨", avatar:"林", role:"管理员",  online:true  },
  { id:3, name:"陈晓悦", avatar:"陈", role:"导演",    online:false },
  { id:4, name:"吴诗涵", avatar:"吴", role:"编剧",    online:true  },
  { id:5, name:"孙轩宇", avatar:"孙", role:"制作人",  online:false },
];

// ─── TopBar ───────────────────────────────────────────────────────────────────
function TopBar({ name, onNameChange, navigate, nodeCount, edgeCount, onUndo, onRedo, creditUsed, scope }: {
  scope: SpaceKind;
  name:string; onNameChange:(v:string)=>void; navigate:Nav["navigate"];
  nodeCount:number; edgeCount:number;
  onUndo:()=>void; onRedo:()=>void; creditUsed:number;
}) {
  const [editing,      setEditing]      = useState(false);
  const [draft,        setDraft]        = useState(name);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [teamOpen,     setTeamOpen]     = useState(false);
  const activeCanvas = new URLSearchParams(window.location.search).get("canvas") ?? "cv0";
  const CANVAS_LIST = getCanvases(scope);

  return (
    <div style={{ height:52, flexShrink:0, display:"flex", alignItems:"center",
      padding:"0 12px", gap:5,
      background:S.panel, borderBottom:`1px solid ${S.bdr}`,
      zIndex:50, position:"relative" }}
      onClick={() => { setSwitcherOpen(false); setTeamOpen(false); }}>

      {/* Close */}
      <button onClick={e=>{e.stopPropagation();navigate("projects", { kind: "canvas" });}} title="关闭画布"
        style={{ width:28, height:28, borderRadius:7, display:"flex", alignItems:"center",
          justifyContent:"center", background:"rgba(255,255,255,.06)", border:`1px solid rgba(255,255,255,.1)`,
          backdropFilter:"blur(8px)", color:S.t3, cursor:"pointer", flexShrink:0 }}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=S.t1;(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.11)";}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=S.t3;(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)";}}>
        <X style={{ width:14, height:14 }}/>
      </button>

      <div style={{ width:1, height:18, background:S.bdr, flexShrink:0 }}/>

      {/* Canvas name + switcher */}
      <div style={{ position:"relative", flexShrink:0 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:3 }}>
          {editing
            ? <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)}
                onBlur={() => { setEditing(false); onNameChange(draft||name); }}
                onKeyDown={e => { if(e.key==="Enter"||e.key==="Escape"){ setEditing(false); onNameChange(draft||name); } }}
                onMouseDown={e=>e.stopPropagation()}
                style={{ fontSize:13, fontWeight:600, color:S.t1, background:"rgba(255,255,255,.06)",
                  border:`1px solid ${S.bdr2}`, borderRadius:7, padding:"3px 9px", outline:"none", minWidth:140 }}/>
            : <button onDoubleClick={() => { setDraft(name); setEditing(true); }} title="双击重命名"
                style={{ fontSize:13, fontWeight:600, color:S.t1, background:"none", border:"none",
                  cursor:"text", padding:"3px 4px", borderRadius:6, maxWidth:200,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {name}
              </button>}
          <button onClick={() => { setSwitcherOpen(o=>!o); setTeamOpen(false); }}
            style={{ width:20, height:20, borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center",
              background:switcherOpen?S.surface:"none", border:"none", color:S.t3, cursor:"pointer" }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=S.surface;}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=switcherOpen?S.surface:"none";}}>
            <ChevronDown style={{ width:11, height:11, transition:"transform .15s", transform:switcherOpen?"rotate(180deg)":"rotate(0)" }}/>
          </button>
        </div>

        {switcherOpen && (
          <div style={{ position:"absolute", top:"calc(100% + 8px)", left:0, zIndex:300,
            background:S.surface, border:`1px solid ${S.bdr2}`, borderRadius:12,
            padding:"6px 0", minWidth:240, boxShadow:"0 20px 60px rgba(0,0,0,.7)" }}>
            <div style={{ padding:"5px 12px 8px", borderBottom:`1px solid ${S.bdr}` }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", color:S.t4, textTransform:"uppercase" }}>切换画布</span>
            </div>
            {CANVAS_LIST.map(cv => (
              <button key={cv.id} onClick={() => { navigate("canvas", { canvas: cv.id }); setSwitcherOpen(false); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                  background:"none", border:"none", cursor:"pointer", textAlign:"left" }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
                <div style={{ width:26, height:26, borderRadius:6, display:"flex", alignItems:"center",
                  justifyContent:"center", background:`${KIND_COLOR.genImg}20`, border:`1px solid ${KIND_COLOR.genImg}30`, flexShrink:0 }}>
                  <Layers style={{ width:12, height:12, color:KIND_COLOR.genImg }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:activeCanvas===cv.id?600:400,
                    color:activeCanvas===cv.id?S.t1:S.t2,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cv.name}</div>
                  <div style={{ fontSize:10.5, color:S.t4, marginTop:1 }}>{cv.nodes} 个节点 · {cv.updated}</div>
                </div>
                {activeCanvas===cv.id && <CheckCircle style={{ width:13, height:13, color:KIND_COLOR.video, flexShrink:0 }}/>}
              </button>
            ))}
            <div style={{ margin:"4px 8px", height:1, background:S.bdr }}/>
            <button onClick={() => { setSwitcherOpen(false); navigate("projects", { kind: "canvas", create: "1" }); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
                background:"none", border:"none", cursor:"pointer", color:S.gold, fontSize:12.5, fontWeight:600 }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
              <Plus style={{ width:12, height:12 }}/>新建画布
            </button>
          </div>
        )}
      </div>

      <div style={{ flex:1 }}/>

      {/* Stats pill */}
      <div style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 8px", borderRadius:6,
        background:"rgba(255,255,255,.05)", border:`1px solid rgba(255,255,255,.08)`,
        backdropFilter:"blur(12px)" }}>
        <BarChart3 style={{ width:10, height:10, color:S.t4 }}/>
        <span style={{ fontSize:11, color:S.t3 }}>{nodeCount}节点 · {edgeCount}连线</span>
      </div>

      {/* Undo/Redo */}
      {[{icon:Undo2,fn:onUndo},{icon:Redo2,fn:onRedo}].map(({ icon:Icon, fn }, i) => (
        <button key={i} onClick={fn}
          style={{ width:28, height:28, borderRadius:7, display:"flex", alignItems:"center",
            justifyContent:"center", background:"rgba(255,255,255,.05)", border:`1px solid rgba(255,255,255,.08)`,
            color:S.t3, cursor:"pointer", backdropFilter:"blur(8px)" }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=S.t1;(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.1)";}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=S.t3;(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.05)";}}>
          <Icon style={{ width:13, height:13 }}/>
        </button>
      ))}

      <div style={{ width:1, height:18, background:"rgba(255,255,255,.08)" }}/>

      {/* Credits */}
      <div style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:6,
        background:"rgba(255,255,255,.05)", border:`1px solid rgba(255,255,255,.08)`,
        backdropFilter:"blur(12px)", fontSize:11.5, color:S.t3 }}>
        <Zap style={{ width:11, height:11, color:S.t4 }}/>
        <span style={{ color:S.t2, fontWeight:600 }}>{creditUsed}</span>
        <span>积分</span>
      </div>

      <div style={{ width:1, height:18, background:"rgba(255,255,255,.08)" }}/>

      {/* Team */}
      <div style={{ position:"relative" }} onClick={e=>e.stopPropagation()}>
        <button onClick={() => { setTeamOpen(o=>!o); setSwitcherOpen(false); }}
          style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", borderRadius:7,
            background:teamOpen?"rgba(255,255,255,.1)":"rgba(255,255,255,.06)",
            border:`1px solid ${teamOpen?"rgba(255,255,255,.18)":"rgba(255,255,255,.11)"}`,
            backdropFilter:"blur(12px)",
            color:S.t2, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .15s" }}
          onMouseEnter={e=>{if(!teamOpen){(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.1)";}}}
          onMouseLeave={e=>{if(!teamOpen){(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)";}}}>
          <div style={{ display:"flex", alignItems:"center", marginRight:2 }}>
            {TEAM_MEMBERS.filter(m=>m.online).slice(0,3).map((m, i) => (
              <div key={m.id} style={{ width:18, height:18, borderRadius:"50%", display:"flex", alignItems:"center",
                justifyContent:"center", background:"rgba(255,255,255,.12)",
                border:`1.5px solid ${S.panel}`,
                fontSize:8, fontWeight:700, color:S.t2,
                marginLeft:i===0?0:-5, zIndex:3-i, flexShrink:0 }}>
                {m.avatar}
              </div>
            ))}
          </div>
          团队
        </button>

        {teamOpen && (
          <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, zIndex:300,
            background:S.surface, border:`1px solid ${S.bdr2}`, borderRadius:12,
            padding:"6px 0", minWidth:260, boxShadow:"0 20px 60px rgba(0,0,0,.7)" }}>
            <div style={{ padding:"8px 14px 10px", borderBottom:`1px solid ${S.bdr}` }}>
              <div style={{ fontSize:13, fontWeight:700, color:S.t1, marginBottom:2 }}>星耀漫剧工作室</div>
              <div style={{ fontSize:11, color:S.t3 }}>
                {TEAM_MEMBERS.filter(m=>m.online).length} 人在线 · {TEAM_MEMBERS.length} 位成员
              </div>
            </div>
            {TEAM_MEMBERS.map(m => (
              <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px" }}>
                <div style={{ position:"relative", flexShrink:0 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center",
                    justifyContent:"center", background:`${KIND_COLOR.genVid}25`,
                    border:`1px solid ${KIND_COLOR.genVid}40`, fontSize:11, fontWeight:700, color:KIND_COLOR.genVid }}>
                    {m.avatar}
                  </div>
                  <div style={{ position:"absolute", bottom:0, right:0, width:7, height:7, borderRadius:"50%",
                    background:m.online?KIND_COLOR.video:"rgba(255,255,255,.2)",
                    border:`1.5px solid ${S.surface}` }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color:S.t1 }}>{m.name}</div>
                  <div style={{ fontSize:10.5, color:S.t4 }}>{m.role}</div>
                </div>
                <span style={{ fontSize:10, color:m.online?KIND_COLOR.video:S.t4 }}>
                  {m.online?"在线":"离线"}
                </span>
              </div>
            ))}
            <div style={{ margin:"4px 8px", height:1, background:S.bdr }}/>
            <button onClick={() => { navigate("team"); setTeamOpen(false); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
                background:"none", border:"none", cursor:"pointer", color:S.gold, fontSize:12.5, fontWeight:600, textAlign:"left" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
              <ChevronDown style={{ width:12, height:12, transform:"rotate(-90deg)" }}/>管理团队成员
            </button>
          </div>
        )}
      </div>

      {/* Save */}
      <button
        style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:7,
          background:"rgba(255,255,255,.08)", border:`1px solid rgba(255,255,255,.16)`,
          backdropFilter:"blur(12px) saturate(150%)",
          color:S.t1, fontSize:12, fontWeight:600, cursor:"pointer",
          boxShadow:"inset 0 1px 0 rgba(255,255,255,.12)" }}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.13)";}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.08)";}}>
        <Save style={{ width:12, height:12 }}/>保存
      </button>
    </div>
  );
}

// ─── CanvasPage ───────────────────────────────────────────────────────────────
const KIND_LABEL: Record<NodeKind,string> = {
  text:"文本",image:"图片",video:"视频",audio:"音频",genImg:"生图配置",genVid:"视频配置",group:"分组",
};
const KIND_W: Record<NodeKind,number> = {
  text:240,image:190,video:270,audio:190,genImg:250,genVid:250,group:300,
};
const KIND_H: Record<NodeKind,number> = {
  text:170,image:230,video:170,audio:130,genImg:280,genVid:230,group:200,
};
const TOOL_KIND: Partial<Record<Tool,NodeKind>> = {
  text:"text",image:"image",video:"video",audio:"audio",genCfg:"genImg",group:"group",
};

export default function CanvasPage({ navigate, scope }: Nav & { scope: SpaceKind }) {
  const canvasId = new URLSearchParams(window.location.search).get("canvas") ?? "cv0";
  const info = getCanvases(scope).find(canvas => canvas.id === canvasId);
  const [nodes, setNodes] = useState<CNode[]>(() => info?.nodesData ?? INIT_NODES.slice(0, info?.nodes ?? INIT_NODES.length));
  const [edges] = useState<CEdge[]>(() => info?.edgesData ?? INIT_EDGES.filter(edge => nodes.some(node => node.id === edge.from) && nodes.some(node => node.id === edge.to)));
  const [pan,         setPan]         = useState({x:40,y:40});
  const [zoom,        setZoom]        = useState(0.85);
  const [selectedId,  setSelectedId]  = useState<string|null>(null);
  const [activeTool,  setActiveTool]  = useState<Tool>("select");
  const [draggingId,  setDraggingId]  = useState<string|null>(null);
  const [dragOff,     setDragOff]     = useState({x:0,y:0});
  const [isPanning,   setIsPanning]   = useState(false);
  const [panStart,    setPanStart]    = useState({x:0,y:0});
  const [panOrig,     setPanOrig]     = useState({x:0,y:0});
  const [connectFrom, setConnectFrom] = useState<{nodeId:string;side:"left"|"right"}|null>(null);
  const [canvasName,  setCanvasName]  = useState(info?.name ?? "《镜像》主创画布");
  const [sideOpen,    setSideOpen]    = useState(true);
  const [sideTab,     setSideTab]     = useState<SidePaneTab>("elements");
  const [ctxMenu,     setCtxMenu]     = useState<CtxMenu|null>(null);
  const dragMoved   = useRef(false);
  const nodeCounter = useRef(10);
  const canvasRef   = useRef<HTMLDivElement>(null);
  const fileInputRef= useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (info) {
      info.name = canvasName; info.nodes = nodes.length; info.edges = edges.length;
      info.nodesData = nodes; info.edgesData = edges;
    }
  }, [info, canvasName, nodes, edges]);

  const onWheel = useCallback((e:React.WheelEvent)=>{
    e.preventDefault();
    setZoom(z=>Math.min(2,Math.max(0.2,z-e.deltaY*0.001)));
  },[]);

  const getWorldPos = (e:React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      wx: (e.clientX - (rect?.left??0) - pan.x) / zoom,
      wy: (e.clientY - (rect?.top ??0) - pan.y) / zoom,
    };
  };

  const onCanvasCtx = (e:React.MouseEvent) => {
    e.preventDefault();
    const {wx,wy} = getWorldPos(e);
    setCtxMenu({x:e.clientX, y:e.clientY, wx, wy});
  };

  const onCanvasMD = (e:React.MouseEvent) => {
    if(e.button===2) return;
    setCtxMenu(null); setConnectFrom(null);
    if(e.button===1 || e.altKey || activeTool==="move") {
      e.preventDefault(); setIsPanning(true);
      setPanStart({x:e.clientX,y:e.clientY}); setPanOrig({...pan});
      return;
    }
    if(activeTool==="upload") { fileInputRef.current?.click(); return; }
    const kind = TOOL_KIND[activeTool];
    if(kind) {
      const {wx,wy} = getWorldPos(e);
      onAddNodeAt(kind, wx - KIND_W[kind]/2, wy - KIND_H[kind]/2);
      setActiveTool("select");
      return;
    }
    setSelectedId(null);
  };

  const onCanvasMM = (e:React.MouseEvent) => {
    if(isPanning) setPan({x:panOrig.x+(e.clientX-panStart.x),y:panOrig.y+(e.clientY-panStart.y)});
  };
  const onCanvasMU = () => { setIsPanning(false); setDraggingId(null); };

  const onNodeMD = (e:React.MouseEvent, node:CNode) => {
    if(node.locked||activeTool!=="select"&&activeTool!=="move") return;
    e.stopPropagation(); dragMoved.current=false;
    setDraggingId(node.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    const nl = (rect?.left??0) + node.x*zoom + pan.x;
    const nt = (rect?.top??0)  + node.y*zoom + pan.y;
    setDragOff({x:e.clientX-nl, y:e.clientY-nt});
  };
  const onNodeDrag = (e:React.MouseEvent) => {
    if(!draggingId) return;
    dragMoved.current=true;
    const rect = canvasRef.current?.getBoundingClientRect();
    setNodes(prev=>prev.map(n=>n.id===draggingId
      ?{...n,
        x:(e.clientX-(rect?.left??0)-dragOff.x-pan.x)/zoom,
        y:(e.clientY-(rect?.top ??0)-dragOff.y-pan.y)/zoom}:n));
  };
  const onNodeClick = (e:React.MouseEvent, id:string) => {
    e.stopPropagation();
    if(!dragMoved.current) setSelectedId(s=>s===id?null:id);
  };
  const onNodeCtx = (e:React.MouseEvent, id:string) => {
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({x:e.clientX, y:e.clientY, wx:0, wy:0, nodeId:id});
  };
  const onPortClick = (nodeId:string, side:"left"|"right") => {
    if(!connectFrom){setConnectFrom({nodeId,side});return;}
    setConnectFrom(null);
  };
  const onNodeFocus = (id:string) => {
    const n=nodes.find(x=>x.id===id); if(!n) return;
    setSelectedId(id);
    const cw = canvasRef.current?.clientWidth  ?? 900;
    const ch = canvasRef.current?.clientHeight ?? 700;
    setPan({x:-(n.x+n.w/2)*zoom+cw/2, y:-(n.y+n.h/2)*zoom+ch/2});
  };
  const onDeleteNode = (id:string) => {
    setNodes(p=>p.filter(n=>n.id!==id));
    if(selectedId===id) setSelectedId(null);
  };
  const onDuplicateNode = (id:string) => {
    const n=nodes.find(x=>x.id===id); if(!n) return;
    nodeCounter.current++;
    setNodes(p=>[...p,{...n,id:`node${nodeCounter.current}`,x:n.x+24,y:n.y+24}]);
  };
  const onToggleLock = (id:string) => setNodes(p=>p.map(n=>n.id===id?{...n,locked:!n.locked}:n));
  const onToggleHide = (id:string) => setNodes(p=>p.map(n=>n.id===id?{...n,hidden:!n.hidden}:n));

  const onAddNodeAt = (kind:NodeKind, wx:number, wy:number) => {
    nodeCounter.current++;
    const id = `node${nodeCounter.current}`;
    setNodes(p=>[...p,{
      id, kind, label:`新建${KIND_LABEL[kind]}`,
      x:wx, y:wy, w:KIND_W[kind], h:KIND_H[kind], status:"idle",
    }]);
    setSelectedId(id);
  };
  const onAddNode = (kind:NodeKind) => {
    const cw = canvasRef.current?.clientWidth  ?? 900;
    const ch = canvasRef.current?.clientHeight ?? 700;
    onAddNodeAt(kind, (-pan.x+cw/2)/zoom - KIND_W[kind]/2, (-pan.y+ch/2)/zoom - KIND_H[kind]/2);
  };

  return (
    <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", overflow:"hidden", background:S.bg }}>
      <style>{`
        @keyframes comet { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-800} }
        @keyframes shimmer-bar { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes node-appear {
          from{opacity:0;transform:scale(.94)}
          to{opacity:1;transform:scale(1)}
        }
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.18)}
      `}</style>

      {ctxMenu && (
        <ContextMenu menu={ctxMenu} nodes={nodes}
          onAddAt={onAddNodeAt} onClose={() => setCtxMenu(null)}
          onDelete={onDeleteNode} onDuplicate={onDuplicateNode}
          onToggleLock={onToggleLock} onToggleHide={onToggleHide}/>
      )}
      <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" multiple
        style={{ display:"none" }} onChange={() => {}}/>

      <TopBar scope={scope} name={canvasName} onNameChange={setCanvasName} navigate={navigate}
        nodeCount={nodes.length} edgeCount={edges.length}
        onUndo={() => {}} onRedo={() => {}} creditUsed={60}/>

      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>

        {/* Canvas */}
        <div ref={canvasRef} style={{ flex:1, position:"relative", overflow:"hidden",
          cursor: isPanning ? "grabbing"
                : activeTool==="move" ? "grab"
                : TOOL_KIND[activeTool] ? "crosshair"
                : activeTool==="upload" ? "copy"
                : "default",
          userSelect:"none", background:S.bg }}
          onWheel={onWheel} onMouseDown={onCanvasMD}
          onMouseMove={e => { onCanvasMM(e); onNodeDrag(e); }}
          onMouseUp={onCanvasMU} onMouseLeave={onCanvasMU}
          onContextMenu={onCanvasCtx}>

          {/* Grid */}
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
            <defs>
              <pattern id="cv-dots-sm" x={pan.x%(20*zoom)} y={pan.y%(20*zoom)}
                width={20*zoom} height={20*zoom} patternUnits="userSpaceOnUse">
                <circle cx={0} cy={0} r={0.7} fill="rgba(255,255,255,.04)"/>
              </pattern>
              <pattern id="cv-dots-lg" x={pan.x%(100*zoom)} y={pan.y%(100*zoom)}
                width={100*zoom} height={100*zoom} patternUnits="userSpaceOnUse">
                <circle cx={0} cy={0} r={1.3} fill="rgba(255,255,255,.09)"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cv-dots-sm)"/>
            <rect width="100%" height="100%" fill="url(#cv-dots-lg)"/>
          </svg>

          {/* Transform layer */}
          <div style={{ position:"absolute", inset:0,
            transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin:"0 0" }}>
            <svg style={{ position:"absolute", inset:0, width:2400, height:1600, overflow:"visible", pointerEvents:"none" }}>
              {edges.map((e, i) => {
                const a=nodes.find(n=>n.id===e.from);
                const b=nodes.find(n=>n.id===e.to);
                if(!a||!b) return null;
                const sel=selectedId===a.id||selectedId===b.id;
                return (
                  <ElectricEdge key={i}
                    a={[a.x+a.w, a.y+a.h/2]}
                    b={[b.x,     b.y+b.h/2]}
                    color={KIND_COLOR[a.kind]} selected={sel}/>
                );
              })}
            </svg>
            {nodes.map(node => (
              <NodeCard key={node.id} node={node}
                selected={selectedId===node.id}
                onMouseDown={e => onNodeMD(e,node)}
                onClick={e => onNodeClick(e,node.id)}
                onPortClick={onPortClick}
                connectFrom={connectFrom}
                onDelete={onDeleteNode}
                onContextMenu={onNodeCtx}/>
            ))}
          </div>

          <BottomToolbar activeTool={activeTool} onTool={setActiveTool}/>

          <Minimap
            nodes={nodes} pan={pan} zoom={zoom}
            canvasW={canvasRef.current?.clientWidth ?? 900}
            canvasH={canvasRef.current?.clientHeight ?? 700}
            onPan={setPan}
            onZoom={d => setZoom(z => Math.min(2, Math.max(0.2, z + d)))}/>
        </div>

        {/* Unified side panel */}
        {sideOpen ? (
          <SidePanel
            nodes={nodes} selectedNodeId={selectedId}
            onNodeFocus={onNodeFocus} onDeleteNode={onDeleteNode}
            onAddNode={onAddNode} onToggleLock={onToggleLock} onToggleHide={onToggleHide}
            activeTab={sideTab} onTabChange={setSideTab}
            onClose={() => setSideOpen(false)}/>
        ) : (
          <div style={{ width:36, flexShrink:0, background:S.panel,
            borderLeft:`1px solid ${S.bdr}`, display:"flex", flexDirection:"column",
            alignItems:"center", paddingTop:10, gap:2 }}>
            {SIDE_TABS.map(({ id, icon:Icon, label }) => (
              <button key={id} onClick={() => { setSideTab(id); setSideOpen(true); }}
                title={label}
                style={{ width:28, height:28, borderRadius:7, display:"flex", alignItems:"center",
                  justifyContent:"center", background:sideTab===id?`${S.gold}18`:"none",
                  border:"none", color:sideTab===id?S.gold:S.t4, cursor:"pointer",
                  transition:"all .15s" }}
                onMouseEnter={e => { if(sideTab!==id)(e.currentTarget as HTMLElement).style.color=S.t2; }}
                onMouseLeave={e => { if(sideTab!==id)(e.currentTarget as HTMLElement).style.color=S.t4; }}>
                <Icon style={{ width:14, height:14 }}/>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
