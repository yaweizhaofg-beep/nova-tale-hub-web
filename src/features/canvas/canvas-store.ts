import { create } from 'zustand';
import type { CNode, CEdge } from './canvas-types';
import type { SpaceKind } from '@/enums/space-kind';

export interface CanvasInfo {
  nodesData?: CNode[];
  edgesData?: CEdge[];
  id: string;
  name: string;
  nodes: number;
  edges: number;
  updated: string;
  storageDays: number;
}
const initial: CanvasInfo[] = [
  {
    id: 'cv1',
    name: '星耀制作流程画布',
    nodes: 7,
    edges: 6,
    updated: '今天 14:30',
    storageDays: 5,
  },
  {
    id: 'cv2',
    name: '《星坠》宣传物料',
    nodes: 3,
    edges: 2,
    updated: '昨天 09:15',
    storageDays: 19,
  },
  {
    id: 'cv0',
    name: '《镜像》主创画布',
    nodes: 9,
    edges: 8,
    updated: '今天 14:48',
    storageDays: 5,
  },
];
const canvases: Record<SpaceKind, CanvasInfo[]> = {
  personal: initial.map((canvas) => ({ ...canvas })),
  team: initial.map((canvas) => ({ ...canvas })),
};

interface CanvasStore {
  canvases: Record<SpaceKind, CanvasInfo[]>;
  createCanvas: (scope: SpaceKind, name: string) => CanvasInfo;
  saveCanvas: (scope: SpaceKind, id: string, name: string, nodes: CNode[], edges: CEdge[]) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  canvases,
  createCanvas: (scope, name) => {
    const canvas: CanvasInfo = {
      id: crypto.randomUUID(),
      name: name.trim(),
      nodes: 0,
      edges: 0,
      updated: '刚刚',
      storageDays: 30,
    };
    set((state) => ({
      canvases: { ...state.canvases, [scope]: [canvas, ...state.canvases[scope]] },
    }));
    return canvas;
  },
  saveCanvas: (scope, id, name, nodes, edges) => {
    set((state) => {
      const canvas = state.canvases[scope].find((item) => item.id === id);
      if (
        !canvas ||
        (canvas.name === name && canvas.nodesData === nodes && canvas.edgesData === edges)
      )
        return state;
      return {
        canvases: {
          ...state.canvases,
          [scope]: state.canvases[scope].map((canvas) =>
            canvas.id === id
              ? {
                  ...canvas,
                  name,
                  nodes: nodes.length,
                  edges: edges.length,
                  nodesData: nodes,
                  edgesData: edges,
                }
              : canvas,
          ),
        },
      };
    });
  },
}));
