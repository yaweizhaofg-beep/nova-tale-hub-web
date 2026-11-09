import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from "@/components/ui";
import { useState } from "react";
import { type CNode, type NodeKind, type SidePaneTab } from "@/features/canvas/canvas-types";
import { KIND_COLOR, STATUS_COLOR, S } from "./presentation";
import { KIND_SVG } from "./node-icons";
import { ADD_KINDS } from "./node-options";
import { ChevronDown, Plus, ImageIcon, Upload, Layers, Search, Trash2, Lock, Unlock, Eye, EyeOff } from "lucide-react";

export const SIDE_TABS: { id: SidePaneTab; icon: React.ElementType; label: string }[] = [
  { id: "elements", icon: Layers,    label: "元素" },
  { id: "assets",   icon: ImageIcon, label: "资产" },
];

// ─── SidePanel ───────────────────────────────────────────────────────────────
export function SidePanel({ nodes, selectedNodeId, onNodeFocus, onDeleteNode, onAddNode,
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
            <DropdownMenu open={addOpen} onOpenChange={setAddOpen}>
              <DropdownContent aria-label="添加节点" side="top" align="center" sideOffset={14} style={{ width:"calc(var(--radix-dropdown-menu-trigger-width) + 8px)",
                background:S.surface, border:`1px solid ${S.bdr2}`, borderRadius:12,
                boxShadow:"0 16px 48px rgba(0,0,0,.7)", padding:"4px 0", overflow:"hidden" }}>
                {ADD_KINDS.map(({ kind, label, desc }) => {
                  const KindSvg = KIND_SVG[kind];
                  const color   = KIND_COLOR[kind];
                  return (
                    <DropdownItem asChild key={kind} onSelect={() => onAddNode(kind)}>
                  <button type="button" style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"7px 12px",
                        border:"none", cursor:"pointer", textAlign:"left" }} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${color}0c`;}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
                      <div style={{ width:26, height:26, borderRadius:7, display:"flex", alignItems:"center",
                        justifyContent:"center", flexShrink:0, background:`${color}18`, border:`1px solid ${color}35` }}>
                        <KindSvg c={color}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:S.t1 }}>{label}</div>
                        <div style={{ fontSize:10, color:S.t4, marginTop:1 }}>{desc}</div>
                      </div>
                    </button>
                </DropdownItem>
                  );
                })}
              </DropdownContent>
              <DropdownTrigger asChild><button type="button" onMouseDown={e=>e.stopPropagation()}
              style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                padding:"7px 0", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600,
                background: addOpen ? `${S.gold}20` : `${S.gold}0e`,
                border:`1px solid ${addOpen ? `${S.gold}50` : `${S.gold}28`}`,
                color:S.gold, transition:"all .15s" }}>
              <Plus style={{ width:12, height:12 }}/>
              添加节点
              <ChevronDown style={{ width:10, height:10,
                transform:addOpen?"rotate(180deg)":"rotate(0)", transition:"transform .18s" }}/>
              </button></DropdownTrigger>
            </DropdownMenu>
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
