// ═══════════════════════════════════════════════════════════════════════════════════
// billing.ts — 套餐 / 积分充值 / 升级续费 / 存储扩容 的统一配置与模拟计费逻辑
//
// 设计来源：《星河AI原型修改需求：套餐与积分充值》(2026-10-31)
// 基础换算：1 元 = 10 积分（星石）。全站统一使用「星石」称呼。
// 本模块仅为前端演示配置与模拟计算，不接入真实支付，不修改真实余额。
// ═══════════════════════════════════════════════════════════════════════════════════

/** 基础换算：1 元 = 10 星石 */
export const STARS_PER_YUAN = 10;

/** 会员周期天数 */
export const PLAN_PERIOD_DAYS = 30;

/** 充值积分有效期（天），每笔到账起算 */
export const RECHARGE_VALID_DAYS = 365;

/** 存储扩容单价（元 / GB / 30天） */
export const STORAGE_PRICE_PER_GB = 0.30;

/** 存储总容量上限（GB） */
export const STORAGE_MAX_GB = 1024;

// ─── 套餐定义 ─────────────────────────────────────────────────────────────────

export type PlanScope = "personal" | "team";

export interface Plan {
  id: string;
  name: string;
  scope: PlanScope;
  /** 价格（元）／30天 */
  price: number;
  /** 包含积分（星石） */
  stars: number;
  /** 席位上限（含管理员） */
  seats: number;
  /** 每席位同时运行上限 */
  concurrencyPerSeat: number;
  /** 总存储（GB），团队为共享 */
  storageGb: number;
  /** 权益文案 */
  perks: string[];
  hot?: boolean;
  tag?: string;
}

/**
 * 套餐配置 —— 价格与积分以需求文档为准：
 * 个人创作版 299/3000、个人专业版 599/6100、工作室版 1999/21000、制作团队版 3999/42000。
 * 21000 与 42000 为本次采用值，不使用早期备选的 22000。
 */
export const PLANS: Plan[] = [
  {
    id: "personal-creator",
    name: "个人创作版",
    scope: "personal",
    price: 299,
    stars: 3000,
    seats: 1,
    concurrencyPerSeat: 4,
    storageGb: 3,
    perks: ["全创作模式", "1 人使用", "每席位最多同时运行 4 个任务", "3GB 存储"],
  },
  {
    id: "personal-pro",
    name: "个人专业版",
    scope: "personal",
    price: 599,
    stars: 6100,
    seats: 1,
    concurrencyPerSeat: 4,
    storageGb: 3,
    perks: ["全创作模式", "1 人使用", "每席位最多同时运行 4 个任务", "3GB 存储"],
    hot: true,
    tag: "推荐",
  },
  {
    id: "team-studio",
    name: "工作室版",
    scope: "team",
    price: 1999,
    stars: 21000,
    seats: 5,
    concurrencyPerSeat: 4,
    storageGb: 100,
    perks: ["全创作模式", "5 人协作", "全团队最多同时运行 4 个任务", "100GB 共享存储", "团队资产库", "项目共创"],
    hot: true,
    tag: "推荐",
  },
  {
    id: "team-production",
    name: "制作团队版",
    scope: "team",
    price: 3999,
    stars: 42000,
    seats: 10,
    concurrencyPerSeat: 8,
    storageGb: 1024,
    perks: ["全创作模式", "10 人协作", "全团队最多同时运行 8 个任务", "1TB 共享存储", "团队资产库", "项目共创"],
  },
];

export function plansFor(scope: PlanScope): Plan[] {
  return PLANS.filter((p) => p.scope === scope);
}

export function findPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

/** 席位上限不等于独占算力 —— 全站统一文案 */
export const CONCURRENCY_DISCLAIMER = "当前空间最多同时运行 {N} 个任务，高峰期可能排队";

/** 存储容量文案（团队为共享） */
export function storageLabel(plan: Plan): string {
  if (plan.storageGb >= 1024) return `${plan.storageGb / 1024}TB 共享`;
  return `${plan.storageGb}GB`;
}

// ─── 空间标识 ─────────────────────────────────────────────────────────────────

export type SpaceKind = "personal" | "team";

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

/**
 * 演示用钱包状态。个人与团队独立保存，切换空间不串账。
 * 数值为演示数据，不代表真实账户余额。
 *
 * 通过模块级 store 保存，充值成功后余额会真实增加（仅内存态，刷新即还原）。
 */
const WALLET_STORE: Record<SpaceKind, SpaceWallet> = {
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

type WalletListener = () => void;
const WALLET_LISTENERS = new Set<WalletListener>();

export function subscribeWallet(fn: WalletListener): () => void {
  WALLET_LISTENERS.add(fn);
  return () => { WALLET_LISTENERS.delete(fn); };
}

function emitWallet() {
  WALLET_LISTENERS.forEach((fn) => fn());
}

/** 读取指定空间钱包快照（返回引用，仅用于读取字段） */
export function getWallet(space: SpaceKind): SpaceWallet {
  return WALLET_STORE[space];
}

/**
 * 充值到账：只增加目标空间的充值积分，不改变会员日期与权益。
 * 同一空间重复调用会累加，调用方需自行做重复点击保护。
 */
export function creditRecharge(space: SpaceKind, stars: number): void {
  if (stars <= 0) return;
  WALLET_STORE[space].rechargeStars += stars;
  emitWallet();
}

/** 会员到期状态（演示用切换） */
export function setPlanActive(space: SpaceKind, active: boolean): void {
  WALLET_STORE[space].planActive = active;
  emitWallet();
}

/**
 * 兼容旧的静态引用。使用方应改用 getWallet() + subscribeWallet()。
 * @deprecated
 */
export const DEMO_WALLETS = WALLET_STORE;


/** 空间名称 */
export const SPACE_NAMES: Record<SpaceKind, string> = {
  personal: "个人空间",
  team: "星耀漫剧工作室",
};

// ─── 充值档位 ─────────────────────────────────────────────────────────────────

export interface RechargePack {
  /** 价格（元） */
  price: number;
  /** 到账星石 */
  stars: number;
  hot?: boolean;
}

/**
 * 充值档位。沿用当前档位价格，积分按 1:10 换算，不设赠送活动。
 * 199 / 499 / 1000 元分别对应 1990 / 4990 / 10000 星石。
 */
export const RECHARGE_PACKS: RechargePack[] = [
  { price: 199,  stars: 1990 },
  { price: 499,  stars: 4990 },
  { price: 1000, stars: 10000, hot: true },
];

// ─── 升级计算 ─────────────────────────────────────────────────────────────────

/** 升级允许的路径：仅同类型、同范围升级 */
export interface UpgradePath {
  fromId: string;
  toId: string;
}

/** 仅支持 299→599、1999→3999 同类型升级 */
export const UPGRADE_PATHS: UpgradePath[] = [
  { fromId: "personal-creator", toId: "personal-pro" },
  { fromId: "team-studio", toId: "team-production" },
];

export function canUpgrade(fromId: string, toId: string): boolean {
  return UPGRADE_PATHS.some((p) => p.fromId === fromId && p.toId === toId);
}

/**
 * 升级计算。
 * 剩余比例 = 本周期剩余秒数 ÷ 本周期总秒数
 * 补款     = (新档价格 − 旧档价格) × 剩余比例
 * 补发积分 = (新档完整积分 − 旧档完整积分) × 剩余比例
 *
 * 金额四舍五入至分，积分向下取至支持的最小单位（1 星石）。
 */
export interface UpgradeQuote {
  fromPlan: Plan;
  toPlan: Plan;
  /** 剩余比例 0~1 */
  remainingRatio: number;
  /** 剩余天数（向上取整展示） */
  remainingDays: number;
  /** 剩余秒数 */
  remainingSeconds: number;
  /** 补款（元，四舍五入至分） */
  topUpAmount: number;
  /** 补发星石（向下取整） */
  topUpStars: number;
  /** 原到期日 */
  originalExpiry: string;
  /** 变化权益 */
  benefitChanges: { label: string; from: string; to: string }[];
}

export function computeUpgrade(fromPlan: Plan, toPlan: Plan, remainingSeconds: number, originalExpiry: string): UpgradeQuote {
  const totalSeconds = PLAN_PERIOD_DAYS * 24 * 3600;
  const remainingRatio = Math.max(0, Math.min(1, remainingSeconds / totalSeconds));

  const topUpAmount = Math.round((toPlan.price - fromPlan.price) * remainingRatio * 100) / 100;
  const topUpStars = Math.floor((toPlan.stars - fromPlan.stars) * remainingRatio);

  const benefitChanges: UpgradeQuote["benefitChanges"] = [
    { label: "席位上限", from: `${fromPlan.seats} 人`, to: `${toPlan.seats} 人` },
    { label: "同时运行任务", from: `${fromPlan.concurrencyPerSeat}`, to: `${toPlan.concurrencyPerSeat}` },
    { label: "存储容量", from: storageLabel(fromPlan), to: storageLabel(toPlan) },
  ];
  if (fromPlan.scope === toPlan.scope && fromPlan.scope === "team") {
    benefitChanges.push({ label: "团队资产", from: "团队资产库", to: "团队资产库 + 项目共创" });
  }

  return {
    fromPlan,
    toPlan,
    remainingRatio,
    remainingDays: Math.ceil((remainingSeconds / (24 * 3600)) * 10) / 10,
    remainingSeconds,
    topUpAmount,
    topUpStars,
    originalExpiry,
    benefitChanges,
  };
}

/**
 * 验收示例：半周期时
 * 299→599 支付 150 元、补 1550 星石
 * 1999→3999 支付 1000 元、补 10500 星石
 */
export function halfPeriodUpgradeQuote(fromPlan: Plan, toPlan: Plan, originalExpiry: string): UpgradeQuote {
  return computeUpgrade(fromPlan, toPlan, (PLAN_PERIOD_DAYS * 24 * 3600) / 2, originalExpiry);
}

// ─── 存储扩容 ─────────────────────────────────────────────────────────────────

export interface StorageQuote {
  currentGb: number;
  targetGb: number;
  addedGb: number;
  /** 剩余天数 */
  remainingDays: number;
  /** 付款金额（元） */
  amount: number;
  /** 到期日（与会员同日） */
  expiry: string;
}

/**
 * 存储扩容报价。
 * 新增容量 0.30 元 / GB / 30天，只增加存储，不增加流量。
 * 按当前会员剩余比例收费，与会员同日到期，总容量上限 1TB。
 */
export function computeStorageQuote(currentGb: number, targetGb: number, remainingDays: number, expiry: string): StorageQuote {
  const addedGb = Math.max(0, targetGb - currentGb);
  const ratio = Math.max(0, Math.min(1, remainingDays / PLAN_PERIOD_DAYS));
  const fullPrice = addedGb * STORAGE_PRICE_PER_GB;
  const amount = Math.round(fullPrice * ratio * 100) / 100;
  return { currentGb, targetGb, addedGb, remainingDays, amount, expiry };
}

/** 升级套餐时按目标容量重算扩容差额，不重复收费 */
export function storageTargetForPlan(plan: Plan): number {
  return plan.storageGb;
}

// ─── 充值明细 ─────────────────────────────────────────────────────────────────

export interface RechargeOrder {
  id: string;
  space: SpaceKind;
  spaceName: string;
  /** 金额（元） */
  amount: number;
  /** 到账星石 */
  stars: number;
  /** 到账时间 */
  creditedAt: string;
  /** 到期时间（到账起 365 天） */
  expiresAt: string;
  status: "成功" | "处理中" | "失败" | "已取消";
}

/** 演示充值明细（按空间分别保存） */
export const DEMO_RECHARGE_ORDERS: RechargeOrder[] = [
  { id: "ORDER-20260820-001", space: "team",     spaceName: "星耀漫剧工作室", amount: 1000, stars: 10000, creditedAt: "2026-08-20 09:00", expiresAt: "2027-08-20", status: "成功" },
  { id: "ORDER-20260715-003", space: "personal", spaceName: "个人空间",        amount: 199,  stars: 1990,  creditedAt: "2026-07-15 14:30", expiresAt: "2027-07-15", status: "成功" },
  { id: "ORDER-20260601-011", space: "personal", spaceName: "个人空间",        amount: 499,  stars: 4990,  creditedAt: "2026-06-01 10:00", expiresAt: "2027-06-01", status: "成功" },
];

// ─── 通用说明文案 ─────────────────────────────────────────────────────────────
/** 充值页统一提示 */
export const RECHARGE_NOTICE =
  "充值仅增加积分，不开通或延长会员；生成任务需有效会员。";

/** 会员到期时的提示 */
export const EXPIRED_MEMBERSHIP_NOTICE =
  "当前会员已到期，充值不会恢复生成权限，需另行续费会员。";

/** 充值积分有效期说明 */
export const RECHARGE_VALID_NOTICE = `到账起 ${RECHARGE_VALID_DAYS} 天有效`;

// ─── 分团队钱包（成员额度分配）─────────────────────────────────────────────────

/**
 * 团队钱包向成员分配的额度。
 * 成员只能使用分配到自己的额度，超额不可用；未分配部分保留在团队钱包。
 */
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

/** 成员 id → 分配记录 */
const ALLOCATION_STORE: Record<number, MemberAllocation> = {
  1: { memberId: 1, allocated: 2000, used: 1240, updatedAt: "2026-10-20 10:00" },
  2: { memberId: 2, allocated: 1500, used: 860,  updatedAt: "2026-10-22 14:30" },
  3: { memberId: 3, allocated: 1000, used: 720,  updatedAt: "2026-10-25 09:15" },
  4: { memberId: 4, allocated: 500,  used: 0,    updatedAt: "2026-10-26 11:00" },
  5: { memberId: 5, allocated: 0,    used: 0,    updatedAt: "2026-10-26 11:00" },
};

/** 团队钱包中「未分配」的保留额度 */
export const TEAM_RESERVED_STARS = 1000;

/** 读取某成员的分配记录 */
export function getAllocation(memberId: number): MemberAllocation {
  if (!ALLOCATION_STORE[memberId]) {
    ALLOCATION_STORE[memberId] = { memberId, allocated: 0, used: 0, updatedAt: "—" };
  }
  return ALLOCATION_STORE[memberId];
}

/** 某成员剩余可用额度 */
export function getMemberAvailable(memberId: number): number {
  const a = getAllocation(memberId);
  return Math.max(0, a.allocated - a.used);
}

/** 团队钱包已分配出去的总额 */
export function getTotalAllocated(): number {
  return Object.values(ALLOCATION_STORE).reduce((s, a) => s + a.allocated, 0);
}

/** 团队钱包可分配余额（充值积分 − 已分配 − 保留额度） */
export function getAssignableBalance(): number {
  const w = getWallet("team");
  return Math.max(0, w.rechargeStars - getTotalAllocated() - TEAM_RESERVED_STARS);
}

/**
 * 分配额度给成员。
 * 不得超过团队可分配余额；被释放的旧额度自动回到可分配余额。
 * 返回是否成功（false 表示超出可分配余额）。
 */
export function allocateToMember(memberId: number, stars: number): boolean {
  if (!Number.isFinite(stars) || stars < 0) return false;
  const alloc = getAllocation(memberId);
  const delta = stars - alloc.allocated;
  if (delta > getAssignableBalance()) return false;
  alloc.allocated = stars;
  alloc.updatedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
  emitWallet();
  return true;
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
  const alloc = getAllocation(memberId);
  const released = Math.max(0, alloc.allocated - alloc.used);
  const kept = alloc.used;
  alloc.allocated = kept;
  alloc.updatedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
  emitWallet();
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
  const alloc = getAllocation(memberId);
  if (stars < alloc.used) {
    return { ok: false, reason: `额度上限不能低于已消耗 ${alloc.used.toLocaleString()} 星石` };
  }
  const delta = stars - alloc.allocated;
  if (delta > getAssignableBalance()) {
    return { ok: false, reason: `超出团队待分配额度 ${getAssignableBalance().toLocaleString()} 星石` };
  }
  alloc.allocated = stars;
  alloc.updatedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
  emitWallet();
  return { ok: true };
}

/**
 * 移除成员时释放其额度（演示口径：只释放未用部分）。
 * 已消耗记录保留在额度历史中，不回滚。
 */
export function releaseMemberAllocation(memberId: number): { released: number; kept: number } {
  return revokeAllocation(memberId);
}

/** 成员分配状态 */
export type AllocationStatus = "over" | "low" | "healthy" | "none";

export function allocationStatus(memberId: number): AllocationStatus {
  const a = getAllocation(memberId);
  if (a.allocated === 0) return "none";
  if (a.used >= a.allocated) return "over";
  if (a.allocated - a.used <= a.allocated * 0.2) return "low";
  return "healthy";
}

export const ALLOCATION_STATUS_META: Record<AllocationStatus, { label: string; color: string; bg: string }> = {
  healthy: { label: "正常",   color: "#34d399", bg: "rgba(16,185,129,.12)" },
  low:    { label: "偏低",   color: "#fbbf24", bg: "rgba(251,191,36,.12)" },
  over:   { label: "已用尽", color: "#f87171", bg: "rgba(248,113,113,.12)" },
  none:   { label: "未分配", color: "rgba(255,255,255,.4)", bg: "rgba(255,255,255,.05)" },
};
