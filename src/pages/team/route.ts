// ═══════════════════════════════════════════════════════════════════════════════════
// src/pages/team/route.ts — 团队页的路由状态解析与序列化
//
// 团队页的一级页签与用量明细的子视图、日期、筛选、分页、任务 ID 全部放在
// 查询参数里，保证刷新、浏览器前进／后退、深链都能重建同一视图。
//
// 参数约定：
//   tab      一级页签：members | stars | detail | usage
//   member   上下文成员 ID（用量页为筛选成员；成员档案／星石页为定位成员）
//   view     用量子视图：overview | members | tasks
//   task     选中的任务 ID
//   dfrom    起始日期（Asia/Shanghai 自然日）
//   dto      结束日期
//   cat      任务类别：all | 语言模型 | 图片生成 | 视频生成
//   project  项目名，空串表示全部
//   model    模型名，空串表示全部
//   status   任务状态：all | 成功 | 失败 | 进行中 | 排队中
//   q        搜索词（项目名 / 分镜号 / 模型 / 任务 ID / 任务号）
//   pg       任务表页码，从 1 开始
//   sort     排序：time（开始时间倒序）| actual（实扣倒序）
// ═══════════════════════════════════════════════════════════════════════════════════

import { getRecentStart, TODAY } from "../../records";
import type { TaskCategory, TaskStatus } from "../../records";
import type { TeamTabId } from "./shared";

export type UsageView = "overview" | "members" | "tasks";
export type TaskSort = "time" | "actual";

export interface UsageRoute {
  /** 子视图 */
  view: UsageView;
  /** 成员筛选（可为已移除成员，用于历史追溯） */
  member: number | null;
  /** 选中的任务 ID */
  task: string | null;
  /** 起始日期 */
  from: string;
  /** 结束日期 */
  to: string;
  /** 任务类别 */
  cat: TaskCategory | "all";
  /** 项目名，空串为全部 */
  project: string;
  /** 模型名，空串为全部 */
  model: string;
  /** 任务状态 */
  status: TaskStatus | "all";
  /** 搜索词 */
  q: string;
  /** 页码 */
  pg: number;
  /** 排序 */
  sort: TaskSort;
}

export const USAGE_VIEWS: { id: UsageView; label: string }[] = [
  { id: "overview", label: "团队概览" },
  { id: "members", label: "成员用量" },
  { id: "tasks", label: "任务明细" },
];

/** 默认路由 */
export function defaultUsageRoute(): UsageRoute {
  return {
    view: "overview",
    member: null,
    task: null,
    from: getRecentStart(7),
    to: TODAY,
    cat: "all",
    project: "",
    model: "",
    status: "all",
    q: "",
    pg: 1,
    sort: "time",
  };
}

const VALID_VIEWS: UsageView[] = ["overview", "members", "tasks"];
const VALID_CATS: (TaskCategory | "all")[] = ["all", "语言模型", "图片生成", "视频生成"];
const VALID_STATUS: (TaskStatus | "all")[] = ["all", "成功", "失败", "进行中", "排队中"];

/** 从查询串解析用量路由 */
export function parseUsageRoute(search: string): UsageRoute {
  const p = new URLSearchParams(search);
  const d = defaultUsageRoute();

  const view = p.get("view") as UsageView | null;
  const cat = p.get("cat");
  const status = p.get("status");
  const sort = p.get("sort");
  const memberRaw = p.get("member");
  const pgRaw = Number(p.get("pg"));

  return {
    view: view && VALID_VIEWS.includes(view) ? view : d.view,
    member: memberRaw !== null && memberRaw !== "" && Number.isFinite(Number(memberRaw))
      ? Number(memberRaw) : null,
    task: p.get("task") || null,
    from: p.get("dfrom") || d.from,
    to: p.get("dto") || d.to,
    cat: cat && VALID_CATS.includes(cat as TaskCategory | "all") ? cat as TaskCategory | "all" : d.cat,
    project: p.get("project") || "",
    model: p.get("model") || "",
    status: status && VALID_STATUS.includes(status as TaskStatus | "all") ? status as TaskStatus | "all" : d.status,
    q: p.get("q") || "",
    pg: Number.isFinite(pgRaw) && pgRaw >= 1 ? Math.floor(pgRaw) : 1,
    sort: sort === "actual" ? "actual" : "time",
  };
}

/** 一级页签解析 */
export function parseTab(search: string): TeamTabId {
  const params = new URLSearchParams(search);
  if (params.get("page") === "team-tasks") return "tasks";
  const t = params.get("tab");
  if (t === "detail") return "members";
  if (t === "stars") return "usage";
  if (t === "members" || t === "tasks" || t === "usage") return t;
  return "members";
}

/**
 * 定位成员解析（成员档案 / 星石管理）。
 * 与用量页的 member 筛选分开：这里的成员必须是当前在席成员。
 */
export function parseFocus(search: string): number | null {
  const raw = new URLSearchParams(search).get("focus");
  if (raw === null || raw === "") return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

/**
 * 序列化为查询参数。
 * 只写入有值的项，避免 URL 过长；`member` 无论上下文都保留。
 */
export function usageRouteParams(route: UsageRoute): URLSearchParams {
  const p = new URLSearchParams();
  if (route.view !== "overview") p.set("view", route.view);
  if (route.member !== null) p.set("member", String(route.member));
  if (route.task) p.set("task", route.task);
  if (route.from !== getRecentStart(7)) p.set("dfrom", route.from);
  if (route.to !== TODAY) p.set("dto", route.to);
  if (route.cat !== "all") p.set("cat", route.cat);
  if (route.project) p.set("project", route.project);
  if (route.model) p.set("model", route.model);
  if (route.status !== "all") p.set("status", route.status);
  if (route.q) p.set("q", route.q);
  if (route.pg > 1) p.set("pg", String(route.pg));
  if (route.sort !== "time") p.set("sort", route.sort);
  return p;
}
