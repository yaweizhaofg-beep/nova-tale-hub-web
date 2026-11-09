import type { SpaceKind } from "@/enums/space-kind";
import { getAllocation, getAssignableBalance } from "./allocation-rules";
import type { MemberAllocation, SpaceWallet, WalletSnapshot } from "./wallet-types";

const initialWallets: Record<SpaceKind, SpaceWallet> = {
  personal: {
    planId: "personal-creator",
    planStars: 3000,
    planExpiresAt: "2026-11-20",
    planActive: true,
    rechargeStars: 2486,
    rechargeNearestExpiry: "2027-05-18",
    frozenStars: 0,
    storageExtraGb: 0,
  },
  team: {
    planId: "team-studio",
    planStars: 21000,
    planExpiresAt: "2026-11-20",
    planActive: true,
    rechargeStars: 8250,
    rechargeNearestExpiry: "2027-05-18",
    frozenStars: 18.55,
    storageExtraGb: 0,
  },
};

const initialAllocations: Record<number, MemberAllocation> = {
  1: { memberId: 1, allocated: 2000, used: 1240, updatedAt: "2026-10-20 10:00" },
  2: { memberId: 2, allocated: 1500, used: 860,  updatedAt: "2026-10-22 14:30" },
  3: { memberId: 3, allocated: 1000, used: 720,  updatedAt: "2026-10-25 09:15" },
  4: { memberId: 4, allocated: 500,  used: 0,    updatedAt: "2026-10-26 11:00" },
  5: { memberId: 5, allocated: 0,    used: 0,    updatedAt: "2026-10-26 11:00" },
};

let snapshot: WalletSnapshot = { wallets: initialWallets, allocations: initialAllocations };
const listeners = new Set<(snapshot: WalletSnapshot) => void>();

export function readWalletSnapshot() { return snapshot; }

export function subscribeWallet(listener: (snapshot: WalletSnapshot) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function publish(next: WalletSnapshot) {
  snapshot = next;
  listeners.forEach(listener => listener(next));
}

function saveAllocation(allocation: MemberAllocation, allocated: number) {
  const updatedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
  publish({ ...snapshot, allocations: { ...snapshot.allocations, [allocation.memberId]: { ...allocation, allocated, updatedAt } } });
}

/**
 * 充值到账：只增加目标空间的充值积分，不改变会员日期与权益。
 * 同一空间重复调用会累加，调用方需自行做重复点击保护。
 */
export function creditRecharge(space: SpaceKind, stars: number): void {
  if (!Number.isFinite(stars) || stars <= 0) return;
  const wallet = snapshot.wallets[space];
  publish({ ...snapshot, wallets: { ...snapshot.wallets, [space]: { ...wallet, rechargeStars: wallet.rechargeStars + stars } } });
}

/**
 * 回收成员额度 —— 演示口径（见《团队管理改造方案》§3 星石管理）。
 *
 * 与旧版 `revokeAllocation()` 的区别：
 *   - 旧版把分配值清零，待分配余额按旧上限全额增加（会把已消耗部分也放回待分配）。
 *   - 本版**只释放未使用额度**：新分配上限 = 已消耗额，
 *     待分配余额只增加 `max(0, 原分配 − 已消耗)`。
 *
 * 例：分配 2,000、已用 1,240 → 回收后分配上限 1,240，待分配增加 760，
 *     团队钱包余额不变，已用部分继续占用该成员的额度记录。
 *
 * ⚠️ 生产结算口径待确认：接真实结算前需确认钱包余额是否已扣同一笔历史消耗，
 *    以免重复占用。正式实现应以结算后的实际可用余额和预留金额为准。
 */
export function revokeAllocation(memberId: number): { released: number; kept: number } {
  const alloc = getAllocation(snapshot, memberId);
  const released = Math.max(0, alloc.allocated - alloc.used);
  const kept = alloc.used;
  saveAllocation(alloc, kept);
  return { released, kept };
}

/**
 * 按方案口径设置成员额度上限（供额度弹窗保存使用）。
 * 降低上限时不得低于已消耗额；增加时不得超过团队待分配余额。
 *
 * @returns { ok: true } | { ok: false, reason }
 */
export function setAllocationLimit(
  memberId: number,
  stars: number,
): { ok: true } | { ok: false; reason: string } {
  if (!Number.isFinite(stars)) return { ok: false, reason: "请输入有效额度" };
  if (stars < 0) return { ok: false, reason: "额度不能为负数" };
  const alloc = getAllocation(snapshot, memberId);
  if (stars < alloc.used) {
    return { ok: false, reason: `额度上限不能低于已消耗 ${alloc.used.toLocaleString()} 星石` };
  }
  const delta = stars - alloc.allocated;
  if (delta > getAssignableBalance(snapshot)) {
    return { ok: false, reason: `超出团队待分配额度 ${getAssignableBalance(snapshot).toLocaleString()} 星石` };
  }
  saveAllocation(alloc, stars);
  return { ok: true };
}

/**
 * 移除成员时释放其额度（演示口径：只释放未用部分）。
 * 已消耗记录保留在额度历史中，不回滚。
 */
export function releaseMemberAllocation(memberId: number): { released: number; kept: number } {
  return revokeAllocation(memberId);
}
