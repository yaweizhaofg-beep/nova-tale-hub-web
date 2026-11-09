import { DropdownItem, PointMenu } from "@/components/ui";
import { type CNode, type NodeKind } from "@/features/canvas/canvas-types";
import { KIND_COLOR, S } from "./presentation";
import { KIND_ICON } from "./node-icons";
import { ADD_KINDS } from "./node-options";
import { type CtxMenu } from "./use-canvas-controller";
import { Trash2, Copy, Lock, Unlock, Eye, EyeOff } from "lucide-react";

const MENU_BTN: React.CSSProperties = {
  width:"100%", display:"flex", alignItems:"center", gap:9, padding:"8px 12px",
  border:"none", cursor:"pointer", textAlign:"left", color:S.t2, fontSize:12.5,
};

export function ContextMenu({ menu, nodes, onAddAt, onClose, onDelete, onDuplicate, onToggleLock, onToggleHide }: {
  menu:CtxMenu; nodes:CNode[];
  onAddAt:(kind:NodeKind,wx:number,wy:number)=>void;
  onClose:()=>void;
  onDelete:(id:string)=>void;
  onDuplicate:(id:string)=>void;
  onToggleLock:(id:string)=>void;
  onToggleHide:(id:string)=>void;
}) {
  const node = menu.nodeId ? nodes.find(n=>n.id===menu.nodeId) : undefined;
  const left = Math.max(8, Math.min(menu.x, window.innerWidth - 220));
  const top = Math.max(8, Math.min(menu.y, window.innerHeight - 400));

  return (
    <PointMenu x={left} y={top} label={node ? "节点操作" : "添加节点"} onClose={onClose} style={{
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
              { label:"复制节点",                icon:Copy,                     fn:()=>{onDuplicate(node.id);} },
              { label:node.locked?"解锁":"锁定", icon:node.locked?Unlock:Lock,  fn:()=>{onToggleLock(node.id);} },
              { label:node.hidden?"显示":"隐藏", icon:node.hidden?Eye:EyeOff,   fn:()=>{onToggleHide(node.id);} },
            ].map(({ label, icon:Icon, fn }) => (
              <DropdownItem asChild key={label} onSelect={fn}>
                  <button type="button" style={MENU_BTN} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
                <Icon style={{ width:13, height:13, color:S.t3, flexShrink:0 }}/>{label}
              </button>
                </DropdownItem>
            ))}
            <div style={{ margin:"4px 8px", height:1, background:S.bdr }}/>
            <DropdownItem asChild onSelect={() => { onDelete(node.id); }}>
                  <button type="button" style={{ ...MENU_BTN, color:"#f87171" }} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(248,113,113,.08)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
              <Trash2 style={{ width:13, height:13, flexShrink:0 }}/>删除节点
            </button>
                </DropdownItem>
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
                <DropdownItem asChild key={kind} onSelect={() => { onAddAt(kind,menu.wx,menu.wy); }}>
                  <button type="button" style={MENU_BTN} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
                  <div style={{ width:24, height:24, borderRadius:6, display:"flex", alignItems:"center",
                    justifyContent:"center", background:`${color}20`, border:`1px solid ${color}35`, flexShrink:0 }}>
                    <Icon style={{ width:12, height:12, color }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:S.t1 }}>{label}</div>
                    <div style={{ fontSize:10.5, color:S.t4, marginTop:1 }}>{desc}</div>
                  </div>
                </button>
                </DropdownItem>
              );
            })}
          </>
        )}
    </PointMenu>
  );
}
