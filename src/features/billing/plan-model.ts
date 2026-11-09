import type { SpaceKind } from "@/enums/space-kind";

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
