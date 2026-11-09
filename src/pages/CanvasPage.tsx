import layout from "./canvas/editor.module.css";
import { useLocation } from "react-router";
import { type Nav } from "@/router/page-location";
import { type SpaceKind } from "@/enums/space-kind";
import { KIND_COLOR, S } from "./canvas/presentation";
import { SIDE_TABS, SidePanel } from "./canvas/elements-panel";
import { useCanvasController, TOOL_KIND } from "./canvas/use-canvas-controller";
import { ElectricEdge } from "./canvas/electric-edge";
import { NodeCard } from "./canvas/node-card";
import { BottomToolbar } from "./canvas/bottom-toolbar";
import { ContextMenu } from "./canvas/context-menu";
import { Minimap } from "./canvas/minimap";
import { TopBar } from "./canvas/top-bar";

export default function CanvasPage({ navigate, scope }: Nav & { scope: SpaceKind }) {
  const canvasId = new URLSearchParams(useLocation().search).get("canvas") ?? "cv0";
  const {
    nodes, edges, pan, setPan, zoom, setZoom, selectedId,
    activeTool, setActiveTool, isPanning, connectFrom, canvasName, setCanvasName, sideOpen,
    setSideOpen, sideTab, setSideTab, ctxMenu, setCtxMenu, canvasRef, fileInputRef,
    onWheel, openCanvasMenu, onCanvasMD, onCanvasMM, onCanvasMU, onNodeMD, onNodeDrag,
    onNodeClick, onNodeCtx, onPortClick, onNodeFocus, onDeleteNode, onDuplicateNode, onToggleLock,
    onToggleHide, onAddNodeAt, onAddNode,
  } = useCanvasController(scope, canvasId);

  return (
    <div className={layout.editor}>
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

      <div className={layout.body}>

        {/* Canvas */}
        <div ref={canvasRef} role="region" aria-label="画布编辑区" tabIndex={0} style={{ flex:1, position:"relative", overflow:"hidden",
          cursor: isPanning ? "grabbing"
                : activeTool==="move" ? "grab"
                : TOOL_KIND[activeTool] ? "crosshair"
                : activeTool==="upload" ? "copy"
                : "default",
          userSelect:"none", background:S.bg }}
          onWheel={onWheel} onMouseDown={onCanvasMD}
          onMouseMove={e => { onCanvasMM(e); onNodeDrag(e); }}
          onMouseUp={onCanvasMU} onMouseLeave={onCanvasMU}
          onContextMenu={event => {
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            openCanvasMenu(event.clientX, event.clientY);
          }}
          onKeyDown={event => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
              event.preventDefault();
              const bounds = event.currentTarget.getBoundingClientRect();
              openCanvasMenu(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
            }
          }}>

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
