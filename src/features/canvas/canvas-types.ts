export type NodeStatus = "idle" | "queued" | "running" | "done" | "error" | "partial";
export type NodeKind = "text" | "image" | "video" | "audio" | "genImg" | "genVid" | "group";
export type Tool = "select" | "move" | "text" | "image" | "video" | "audio" | "genCfg" | "group" | "upload";
export type SidePaneTab = "elements" | "assets";

export interface CNode {
  id: string; kind: NodeKind; label: string;
  x: number; y: number; w: number; h: number;
  status: NodeStatus; locked?: boolean; hidden?: boolean;
  content?: string;
  params?: Record<string, string | number>;
}
export interface CEdge { from: string; to: string; }
