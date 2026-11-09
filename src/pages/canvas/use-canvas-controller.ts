import { useCallback, useEffect, useRef, useState } from "react";
import type { SpaceKind } from "@/enums/space-kind";
import type { CNode, CEdge, NodeKind, Tool, SidePaneTab } from "@/features/canvas/canvas-types";
import { INIT_NODES, INIT_EDGES } from "@/features/canvas/canvas-mock";
import { useCanvasStore } from "@/features/canvas/canvas-store";

export type CtxMenu = { x:number; y:number; wx:number; wy:number; nodeId?:string };

const KIND_LABEL: Record<NodeKind,string> = {
  text:"文本",image:"图片",video:"视频",audio:"音频",genImg:"生图配置",genVid:"视频配置",group:"分组",
};
const KIND_W: Record<NodeKind,number> = {
  text:240,image:190,video:270,audio:190,genImg:250,genVid:250,group:300,
};
const KIND_H: Record<NodeKind,number> = {
  text:170,image:230,video:170,audio:130,genImg:280,genVid:230,group:200,
};
export const TOOL_KIND: Partial<Record<Tool,NodeKind>> = {
  text:"text",image:"image",video:"video",audio:"audio",genCfg:"genImg",group:"group",
};

export function useCanvasController(scope: SpaceKind, canvasId: string) {
  const [info] = useState(() => useCanvasStore.getState().canvases[scope].find(canvas => canvas.id === canvasId));
  const saveCanvas = useCanvasStore(state => state.saveCanvas);
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
  const [initialNodeCounter] = useState(() => nodes.reduce((highest, node) =>
    Math.max(highest, Number(/^node(\d+)$/.exec(node.id)?.[1] ?? 0)), 10));
  const nodeCounter = useRef(initialNodeCounter);
  const canvasRef   = useRef<HTMLDivElement>(null);
  const fileInputRef= useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (info) saveCanvas(scope, canvasId, canvasName, nodes, edges);
  }, [info, scope, canvasId, canvasName, nodes, edges, saveCanvas]);

  const onWheel = useCallback((e:React.WheelEvent)=>{
    e.preventDefault();
    setZoom(z=>Math.min(2,Math.max(0.2,z-e.deltaY*0.001)));
  },[]);

  const getWorldPos = ({ clientX, clientY }: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      wx: (clientX - (rect?.left ?? 0) - pan.x) / zoom,
      wy: (clientY - (rect?.top ?? 0) - pan.y) / zoom,
    };
  };

  const openCanvasMenu = (clientX: number, clientY: number) => {
    const { wx, wy } = getWorldPos({ clientX, clientY });
    setCtxMenu({ x: clientX, y: clientY, wx, wy });
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

  return {
    nodes, edges, pan, setPan, zoom, setZoom, selectedId,
    activeTool, setActiveTool, isPanning, connectFrom, canvasName, setCanvasName, sideOpen,
    setSideOpen, sideTab, setSideTab, ctxMenu, setCtxMenu, canvasRef, fileInputRef,
    onWheel, openCanvasMenu, onCanvasMD, onCanvasMM, onCanvasMU, onNodeMD, onNodeDrag,
    onNodeClick, onNodeCtx, onPortClick, onNodeFocus, onDeleteNode, onDuplicateNode, onToggleLock,
    onToggleHide, onAddNodeAt, onAddNode,
  };
}
