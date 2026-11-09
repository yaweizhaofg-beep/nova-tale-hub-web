import type { SpaceKind } from "@/enums/space-kind";

export interface SpaceWallet {
  /** 套餐可用积分（随会员周期结束失效） */
  planStars: number;
  /** 套餐到期时间 */
  planExpiresAt: string;
  /** 会员是否有效 */
  planActive: boolean;
  /** 充值可用积分 */
  rechargeStars: number;
  /** 充值积分最近到期时间 */
  rechargeNearestExpiry: string;
  /** 冻结积分（不计入可用余额） */
  frozenStars: number;
  /** 当前套餐 id */
  planId: string;
  /** 已扩容存储（GB），在套餐基础上叠加 */
  storageExtraGb: number;
}

export interface MemberAllocation {
  /** 成员 id，与 shared.ts 的 TEAM_MEMBERS_INIT 对应 */
  memberId: number;
  /** 已分配额度（星石） */
  allocated: number;
  /** 已消耗（星石） */
  used: number;
  /** 最近一次分配时间 */
  updatedAt: string;
}

export interface WalletSnapshot {
  wallets: Record<SpaceKind, SpaceWallet>;
  allocations: Record<number, MemberAllocation>;
}
