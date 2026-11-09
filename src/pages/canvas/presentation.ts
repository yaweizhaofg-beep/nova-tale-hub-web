import type { NodeKind, NodeStatus } from "@/features/canvas/canvas-types";

export const KIND_COLOR: Record<NodeKind, string> = {
  text:   "#f59e0b",
  image:  "#22d3ee",
  video:  "#34d399",
  audio:  "#f472b6",
  genImg: "#a78bfa",
  genVid: "#6366f1",
  group:  "#94a3b8",
};
export const STATUS_COLOR: Record<NodeStatus, string> = {
  idle: "rgba(255,255,255,.25)", queued: "#f59e0b", running: "#6366f1",
  done: "#34d399", error: "#f87171", partial: "#f59e0b",
};
export const STATUS_LABEL: Record<NodeStatus, string> = {
  idle: "空", queued: "排队", running: "生成中", done: "完成", error: "失败", partial: "部分",
};

export const S = {
  bg:      "#090A0E",
  panel:   "#0E0F14",
  surface: "#13151C",
  bdr:     "rgba(255,255,255,.07)",
  bdr2:    "rgba(255,255,255,.12)",
  t1:      "#F4F5F7",
  t2:      "#A4A8B3",
  t3:      "#6F7480",
  t4:      "rgba(255,255,255,.2)",
  gold:    "#FF8A1F",
} as const;
