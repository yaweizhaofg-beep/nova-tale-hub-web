import { type CNode } from "@/features/canvas/canvas-types";
import { KIND_COLOR, STATUS_COLOR, STATUS_LABEL, S } from "./presentation";
import { IconImage, KIND_SVG } from "./node-icons";
import { Play, MoreHorizontal, Clock, AlertTriangle, Trash2 } from "lucide-react";

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

export function NodeCard({ node, selected, onMouseDown, onClick, onPortClick, connectFrom, onDelete, onContextMenu }: {
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
