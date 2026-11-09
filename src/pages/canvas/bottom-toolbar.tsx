import { type NodeKind, type Tool } from "@/features/canvas/canvas-types";
import { KIND_COLOR, S } from "./presentation";
import { type IconCProps, IconText, IconImage, IconVideo, IconAudio, IconGenImg, IconGroup } from "./node-icons";
import { Upload, MousePointer, Move } from "lucide-react";

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

export function BottomToolbar({ activeTool, onTool }: { activeTool:Tool; onTool:(t:Tool)=>void }) {
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
