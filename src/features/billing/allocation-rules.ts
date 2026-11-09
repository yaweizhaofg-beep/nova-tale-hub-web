import type { MemberAllocation, WalletSnapshot } from "./wallet-types";

/** 团队钱包中「未分配」的保留额度 */
export const TEAM_RESERVED_STARS = 1000;

/** 读取某成员的分配记录 */
export function getAllocation(snapshot: WalletSnapshot, memberId: number): MemberAllocation {
  return snapshot.allocations[memberId] ?? { memberId, allocated: 0, used: 0, updatedAt: "—" };
}

/** 某成员剩余可用额度 */
export function getMemberAvailable(snapshot: WalletSnapshot, memberId: number): number {
  const a = getAllocation(snapshot, memberId);
  return Math.max(0, a.allocated - a.used);
}

/** 团队钱包已分配出去的总额 */
export function getTotalAllocated(snapshot: WalletSnapshot): number {
  return Object.values(snapshot.allocations).reduce((s, a) => s + a.allocated, 0);
}

/** 团队钱包可分配余额（充值积分 − 已分配 − 保留额度） */
export function getAssignableBalance(snapshot: WalletSnapshot): number {
  const w = snapshot.wallets.team;
  return Math.max(0, w.rechargeStars - getTotalAllocated(snapshot) - TEAM_RESERVED_STARS);
}
