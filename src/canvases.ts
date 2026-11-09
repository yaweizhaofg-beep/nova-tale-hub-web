import type { CNode, CEdge } from "./pages/CanvasPage";
import type { SpaceKind } from "./billing";

export interface CanvasInfo {
  nodesData?: CNode[]; edgesData?: CEdge[];
  id: string; name: string; nodes: number; edges: number; updated: string; storageDays: number;
}
const initial: CanvasInfo[] = [
  { id: "cv1", name: "星耀制作流程画布", nodes: 7, edges: 6, updated: "今天 14:30", storageDays: 5 },
  { id: "cv2", name: "《星坠》宣传物料", nodes: 3, edges: 2, updated: "昨天 09:15", storageDays: 19 },
  { id: "cv0", name: "《镜像》主创画布", nodes: 9, edges: 8, updated: "今天 14:48", storageDays: 5 },
];
const canvases: Record<SpaceKind, CanvasInfo[]> = {
  personal: initial.map(canvas => ({ ...canvas })), team: initial.map(canvas => ({ ...canvas })),
};
export function getCanvases(scope: SpaceKind): CanvasInfo[] { return canvases[scope]; }
export function createCanvas(scope: SpaceKind, name: string): CanvasInfo {
  const canvas: CanvasInfo = { id: crypto.randomUUID(), name: name.trim(), nodes: 0, edges: 0, updated: "刚刚", storageDays: 30 };
  canvases[scope].unshift(canvas);
  return canvas;
}
