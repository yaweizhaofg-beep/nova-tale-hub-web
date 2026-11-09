// ═══════════════════════════════════════════════════════════════════════════════════
// team.ts — 团队管理数据层
//
// 覆盖《星核耀火网页版 · 团队管理改造方案》需要的几类数据：
//   1. 成员（席位状态 + 在线状态）、邀请（待接受）
//   2. 团队级订阅，供四个页签共享同一份快照
//
// 任务执行记录与结算流水统一放在 records.ts，团队用量、账单与结果页共用同一份，
// 保证任务 ID 可以跨页定位。
//
// 全部为前端演示数据，刷新即还原；不接入任何真实服务。
// ═══════════════════════════════════════════════════════════════════════════════════

import { TEAM_MEMBERS_INIT, TEAM_OWNER_ID, TEAM_ROLES } from "./shared";
import type { TeamRole } from "./shared";
import {
  getMemberUsage as recordsGetMemberUsage,
  getTasksInRange,
  TODAY,
} from "./records";

// ─── 类型 ─────────────────────────────────────────────────────────────────────

/** 席位状态：待接受邀请本期不占席，正式加入后占席 */
export type SeatStatus = "active" | "pending" | "removed";

export interface TeamMember {
  id: number;
  name: string;
  account: string;
  role: TeamRole;
  avatar: string;
  joined: string;
  /** 席位状态 */
  seat: SeatStatus;
  /** 在线状态（与席位状态分开，来自在线数据） */
  online: boolean;
  /** 移除时间（历史列表用） */
  removedAt?: string;
}

/** 邀请记录 */
export interface TeamInvite {
  id: number;
  account: string;
  role: TeamRole;
  /** 发出时间 */
  createdAt: string;
  /** 待接受 */
  status: "pending" | "accepted" | "revoked";
}

/** 用量流水 —— 趋势 / 成员用量 / 任务明细 / CSV 共用同一套 */
// 旧的 UsageRecord 已被 records.ts 的 TaskRecord 取代，此处保留类型别名以兼容旧引用。
export type { TaskRecord as UsageRecord } from "./records";

// ─── 常量 ─────────────────────────────────────────────────────────────────────

/** 团队席位上限（与工作室版套餐一致） */
export const TEAM_MAX_SEATS = 5;

/** 在线成员 ID 集合（演示：在线数据独立于席位状态） */
const ONLINE_INIT = new Set([1, 2, 3]);

// ─── 成员 ─────────────────────────────────────────────────────────────────────

function toMember(m: (typeof TEAM_MEMBERS_INIT)[number]): TeamMember {
  return {
    id: m.id,
    name: m.name,
    account: m.account,
    role: m.role as TeamRole,
    avatar: m.avatar,
    joined: m.joined,
    seat: "active",
    online: ONLINE_INIT.has(m.id),
  };
}

const MEMBER_STORE: TeamMember[] = TEAM_MEMBERS_INIT.map(toMember);

// ─── 邀请 ─────────────────────────────────────────────────────────────────────

const INVITE_STORE: TeamInvite[] = [];

// ─── 用量（委托给 records.ts 的任务记录）──────────────────────────────────────
//
// 团队用量流水覆盖最近 30 天，供日期筛选与趋势聚合使用。
// 消耗金额与 billing.ts 的成员额度「已消耗」同源口径（实扣 = actual）。
// 数据与查询统一放在 records.ts，团队用量、账单、任务详情共用同一份记录。

// ─── 订阅 ─────────────────────────────────────────────────────────────────────

type TeamListener = () => void;
const TEAM_LISTENERS = new Set<TeamListener>();

export function subscribeTeam(fn: TeamListener): () => void {
  TEAM_LISTENERS.add(fn);
  return () => { TEAM_LISTENERS.delete(fn); };
}

function emitTeam() {
  TEAM_LISTENERS.forEach((fn) => fn());
}

// ─── 成员读取 ─────────────────────────────────────────────────────────────────

/** 全部成员（含已移除），按 ID 升序 */
export function getAllMembers(): TeamMember[] {
  return MEMBER_STORE;
}

/** 在席成员（正式加入，占席） */
export function getActiveMembers(): TeamMember[] {
  return MEMBER_STORE.filter((m) => m.seat === "active");
}

/** 待接受邀请的成员占位（尚未占席） */
export function getPendingMembers(): TeamMember[] {
  return MEMBER_STORE.filter((m) => m.seat === "pending");
}

/** 已移除成员（历史列表，保留历史消耗） */
export function getRemovedMembers(): TeamMember[] {
  return MEMBER_STORE.filter((m) => m.seat === "removed");
}

/** 按 ID 取成员（包含已移除，用于历史追溯） */
export function getMemberById(id: number): TeamMember | undefined {
  return MEMBER_STORE.find((m) => m.id === id);
}

/** 成员是否属于当前团队且在席 */
export function isActiveMember(id: number): boolean {
  return MEMBER_STORE.some((m) => m.id === id && m.seat === "active");
}

/** 已占用席位数 */
export function getSeatUsed(): number {
  return getActiveMembers().length;
}

/** 剩余席位数 */
export function getSeatsLeft(): number {
  return Math.max(0, TEAM_MAX_SEATS - getSeatUsed());
}

/** 邀请是否满席（满席时仍可发邀请，但接受时失败） */
export function isSeatFull(): boolean {
  return getSeatUsed() >= TEAM_MAX_SEATS;
}

// ─── 成员写操作 ───────────────────────────────────────────────────────────────

/**
 * 邀请成员。账号去首尾空格；已加入成员与待接受邀请给出不同提示。
 * 待接受邀请本期不占席。
 *
 * @returns { ok: true } | { ok: false, reason }
 */
export function inviteMember(account: string, role: TeamRole):
  | { ok: true; invite: TeamInvite }
  | { ok: false; reason: string } {
  const acc = account.trim();
  if (!acc) return { ok: false, reason: "请填写账号" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(acc) && acc.length < 3) {
    return { ok: false, reason: "账号格式不正确" };
  }
  const active = getActiveMembers().some((m) => m.account === acc);
  if (active) return { ok: false, reason: "该账号已是团队成员" };
  const pending = INVITE_STORE.some((i) => i.status === "pending" && i.account === acc);
  if (pending) return { ok: false, reason: "该账号已有待接受的邀请" };

  const invite: TeamInvite = {
    id: Date.now(),
    account: acc,
    role,
    createdAt: nowStamp(),
    status: "pending",
  };
  INVITE_STORE.push(invite);
  emitTeam();
  return { ok: true, invite };
}

/** 撤销待接受邀请 */
export function revokeInvite(inviteId: number): boolean {
  const inv = INVITE_STORE.find((i) => i.id === inviteId);
  if (!inv || inv.status !== "pending") return false;
  inv.status = "revoked";
  emitTeam();
  return true;
}

/** 待接受的邀请列表 */
export function getPendingInvites(): TeamInvite[] {
  return INVITE_STORE.filter((i) => i.status === "pending");
}

/**
 * 模拟接受邀请（演示功能）。
 * 接受前重新校验席位与邀请有效性；满席时失败并保留邀请。
 */
export function acceptInvite(inviteId: number):
  | { ok: true; member: TeamMember }
  | { ok: false; reason: string } {
  const inv = INVITE_STORE.find((i) => i.id === inviteId);
  if (!inv || inv.status !== "pending") return { ok: false, reason: "邀请不存在或已失效" };
  if (isSeatFull()) return { ok: false, reason: `席位已满（${TEAM_MAX_SEATS} 人），无法接受邀请` };
  if (getActiveMembers().some((m) => m.account === inv.account)) {
    return { ok: false, reason: "该账号已是团队成员" };
  }

  const id = nextMemberId();
  const member: TeamMember = {
    id,
    name: inv.account.split("@")[0],
    account: inv.account,
    role: inv.role,
    avatar: inv.account[0].toUpperCase(),
    joined: nowDate(),
    seat: "active",
    online: false,
  };
  MEMBER_STORE.push(member);
  inv.status = "accepted";
  emitTeam();
  return { ok: true, member };
}

/** 修改成员职能。创始人不可降权。 */
export function changeMemberRole(memberId: number, role: TeamRole): { ok: boolean; reason?: string } {
  const m = MEMBER_STORE.find((x) => x.id === memberId);
  if (!m) return { ok: false, reason: "成员不存在" };
  if (m.id === TEAM_OWNER_ID) return { ok: false, reason: "创始人不可修改职能" };
  m.role = role;
  emitTeam();
  return { ok: true };
}

/**
 * 移除成员。创始人受保护。
 * 移除后：保留历史消耗（用量流水不删除）。
 */
export function removeMember(memberId: number): { ok: boolean; reason?: string } {
  const m = MEMBER_STORE.find((x) => x.id === memberId);
  if (!m) return { ok: false, reason: "成员不存在" };
  if (m.id === TEAM_OWNER_ID) return { ok: false, reason: "创始人受保护，不可移除" };
  m.seat = "removed";
  m.removedAt = nowStamp();
  m.online = false;
  emitTeam();
  return { ok: true };
}

function nextMemberId(): number {
  return MEMBER_STORE.reduce((mx, m) => Math.max(mx, m.id), 0) + 1;
}

// ─── 用量（委托给 records.ts）──────────────────────────────────────────────────

/** 全部团队任务（含已移除成员的历史消耗） */
export function getUsageRecords() {
  return getTasksInRange("1970-01-01", "2999-12-31");
}

/** 某成员的任务（含已移除成员） */
export function getMemberUsage(memberId: number) {
  return recordsGetMemberUsage(memberId);
}

/** 演示「今天」对应的时间戳 */
export function nowStamp(): string {
  return `${TODAY} 09:00`;
}

/** 演示「今天」日期 */
export function nowDate(): string {
  return TODAY;
}

/** 职能列表（对外暴露，供团队页复用） */
export { TEAM_ROLES };
