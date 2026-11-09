import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem, Popover, PopoverTrigger, PopoverContent } from "@/components/ui";
import { useRef, useState } from "react";
import { CANVAS_TEAM_MEMBERS } from "@/features/canvas/canvas-mock";
import { useLocation } from "react-router";
import { type Nav } from "@/router/page-location";
import { type SpaceKind } from "@/enums/space-kind";
import { useCanvasStore } from "@/features/canvas/canvas-store";
import { KIND_COLOR, S } from "./presentation";
import { ChevronDown, Plus, X, Undo2, Redo2, Save, Layers, CheckCircle, Zap, BarChart3 } from "lucide-react";


// ─── TopBar ───────────────────────────────────────────────────────────────────
export function TopBar({ name, onNameChange, navigate, nodeCount, edgeCount, onUndo, onRedo, creditUsed, scope }: {
  scope: SpaceKind;
  name:string; onNameChange:(v:string)=>void; navigate:Nav["navigate"];
  nodeCount:number; edgeCount:number;
  onUndo:()=>void; onRedo:()=>void; creditUsed:number;
}) {
  const [editing,      setEditing]      = useState(false);
  const [draft,        setDraft]        = useState(name);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [teamOpen,     setTeamOpen]     = useState(false);
  const switcherGroup = useRef<HTMLDivElement>(null);
  const switcherTrigger = useRef<HTMLButtonElement>(null);
  const [switcherOffset, setSwitcherOffset] = useState(0);
  const activeCanvas = new URLSearchParams(useLocation().search).get("canvas") ?? "cv0";
  const CANVAS_LIST = useCanvasStore(state => state.canvases[scope]);

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
      <div ref={switcherGroup} style={{ position:"relative", flexShrink:0 }} onClick={e=>e.stopPropagation()}>
        <DropdownMenu open={switcherOpen} onOpenChange={open => {
          if (open && switcherGroup.current && switcherTrigger.current) {
            setSwitcherOffset(switcherGroup.current.getBoundingClientRect().left - switcherTrigger.current.getBoundingClientRect().left);
            setTeamOpen(false);
          }
          setSwitcherOpen(open);
        }}>
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
          <DropdownTrigger asChild><button type="button" ref={switcherTrigger} aria-label="切换画布"
            style={{ width:20, height:20, borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center",
              background:switcherOpen?S.surface:"none", border:"none", color:S.t3, cursor:"pointer" }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=S.surface;}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=switcherOpen?S.surface:"none";}}>
            <ChevronDown style={{ width:11, height:11, transition:"transform .15s", transform:switcherOpen?"rotate(180deg)":"rotate(0)" }}/>
          </button></DropdownTrigger>
        </div>
        <DropdownContent aria-label="切换画布" align="start" alignOffset={switcherOffset} sideOffset={8} style={{
            background:S.surface, border:`1px solid ${S.bdr2}`, borderRadius:12,
            padding:"6px 0", minWidth:240, boxShadow:"0 20px 60px rgba(0,0,0,.7)" }}>
            <div style={{ padding:"5px 12px 8px", borderBottom:`1px solid ${S.bdr}` }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", color:S.t4, textTransform:"uppercase" }}>切换画布</span>
            </div>
            {CANVAS_LIST.map(cv => (
              <DropdownItem asChild key={cv.id} onSelect={() => navigate("canvas", { canvas: cv.id })}>
                  <button type="button" style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                  border:"none", cursor:"pointer", textAlign:"left" }} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
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
                </DropdownItem>
            ))}
            <div style={{ margin:"4px 8px", height:1, background:S.bdr }}/>
            <DropdownItem asChild onSelect={() => navigate("projects", { kind: "canvas", create: "1" })}>
                  <button type="button" style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
                border:"none", cursor:"pointer", color:S.gold, fontSize:12.5, fontWeight:600 }} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
              <Plus style={{ width:12, height:12 }}/>新建画布
            </button>
                </DropdownItem>
        </DropdownContent>
        </DropdownMenu>
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
        <Popover open={teamOpen} onOpenChange={open => { setTeamOpen(open); if (open) setSwitcherOpen(false); }}>
        <PopoverTrigger asChild><button type="button"
          style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", borderRadius:7,
            background:teamOpen?"rgba(255,255,255,.1)":"rgba(255,255,255,.06)",
            border:`1px solid ${teamOpen?"rgba(255,255,255,.18)":"rgba(255,255,255,.11)"}`,
            backdropFilter:"blur(12px)",
            color:S.t2, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .15s" }}
          onMouseEnter={e=>{if(!teamOpen){(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.1)";}}}
          onMouseLeave={e=>{if(!teamOpen){(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)";}}}>
          <div style={{ display:"flex", alignItems:"center", marginRight:2 }}>
            {CANVAS_TEAM_MEMBERS.filter(m=>m.online).slice(0,3).map((m, i) => (
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
        </button></PopoverTrigger>
        <PopoverContent aria-label="团队成员" sideOffset={8} style={{
            background:S.surface, border:`1px solid ${S.bdr2}`, borderRadius:12,
            padding:"6px 0", minWidth:260, boxShadow:"0 20px 60px rgba(0,0,0,.7)" }}>
            <div style={{ padding:"8px 14px 10px", borderBottom:`1px solid ${S.bdr}` }}>
              <div style={{ fontSize:13, fontWeight:700, color:S.t1, marginBottom:2 }}>星耀漫剧工作室</div>
              <div style={{ fontSize:11, color:S.t3 }}>
                {CANVAS_TEAM_MEMBERS.filter(m=>m.online).length} 人在线 · {CANVAS_TEAM_MEMBERS.length} 位成员
              </div>
            </div>
            {CANVAS_TEAM_MEMBERS.map(m => (
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
        </PopoverContent>
        </Popover>
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
