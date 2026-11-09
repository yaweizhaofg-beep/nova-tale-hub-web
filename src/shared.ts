// ─── Shared Types & Mock Data ─────────────────────────────────────────────────

export type PageId =
  | "landing" | "register" | "verify" | "onboarding"
  | "workspace" | "projects" | "new-project"
  | "assets" | "cost-confirm"
  | "batch" | "result" | "delivery" | "billing"
  | "canvas" | "tools" | "membership" | "user-center"
  | "team" | "my-tasks" | "team-tasks" | "team-assets" | "login" | "upgrade";

export interface Nav {
  /**
   * 跳转页面。
   * @param p 目标页面
   * @param extra 额外查询参数；值为 null 时删除该参数
   */
  navigate: (p: PageId, extra?: Record<string, string | null>) => void;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
export const USER = {
  name: "赵雅薇", avatar: "赵", team: "星耀漫剧工作室",
  plan: "星轨小队", planDaysLeft: 21,
  concurrent: { used: 6, total: 8 }, queue: { used: 47, total: 1000 },
  paidStars: 2486.0, activeStars: 59.0,
  activeStarsExpiry: "12天后（29颗即将过期）",
  teamPaidStars: 8250.0, teamActiveStars: 120.0,
  currentSpace: "team" as "personal" | "team",
};

export const STUDIO_MEMBERS = [
  { avatar: "赵", name: "赵雅薇", role: "创始人",   online: true  },
  { avatar: "李", name: "李明浩", role: "主创编剧",  online: true  },
  { avatar: "陈", name: "陈思雨", role: "视觉导演",  online: true  },
  { avatar: "王", name: "王浩然", role: "AI调度师",  online: false },
  { avatar: "张", name: "张晓琳", role: "剪辑后期",  online: false },
];

export const PROJECT = {
  name: "《镜像》", id: "PRJ-20260821-014", chapter: "第03集《回声》",
  storyboards: { total: 20, done: 12, running: 3, queued: 4, failed: 1 },
};

export const TASK = {
  id: "TASK-20260821-1048", model: "Seedance 2.0 Fast",
  spec: "480p · 5秒 · 9:16 · 无声音 · 1张参考图",
  estimatedStars: 18.55, estimatedCNY: 1.86, priceVersion: "2026-08-21 10:00",
};

export const STORYBOARDS = [
  { id: "SB-001", desc: "镜头1：主角站在空旷的走廊，背光，缓慢转身", status: "done",    stars: 18.55 },
  { id: "SB-002", desc: "镜头2：特写，眼神迷离，光线从窗缝透入",     status: "done",    stars: 22.10 },
  { id: "SB-003", desc: "镜头3：两人对话，景深虚化，低调光效",       status: "done",    stars: 19.80 },
  { id: "SB-004", desc: "镜头4：俯拍城市街道，雨后反光",             status: "running", stars: 18.55 },
  { id: "SB-005", desc: "镜头5：手持镜头，快速穿越人群",             status: "running", stars: 24.00 },
  { id: "SB-006", desc: "镜头6：主角独坐，窗外车流",                 status: "running", stars: 18.55 },
  { id: "SB-007", desc: "镜头7：两人分离，背影渐远",                 status: "queued",  stars: 18.55 },
  { id: "SB-008", desc: "镜头8：闪回，温暖色调，笑声",               status: "queued",  stars: 20.30 },
  { id: "SB-009", desc: "镜头9：回到当下，对比冷色调",               status: "queued",  stars: 18.55 },
  { id: "SB-010", desc: "镜头10：结尾长镜头，主角走向远处",           status: "queued",  stars: 22.00 },
  { id: "SB-011", desc: "镜头11：叠化转场，时间跳跃",                status: "failed",  stars: 0     },
];

export const TEAM_OWNER_ID = 1;
export const TEAM_MEMBERS_INIT = [
  { id: 1, name: "赵雅薇", account: "zhao@xingyao.ai", role: "管理员", avatar: "赵", joined: "2026-06-01" },
  { id: 2, name: "林子墨", account: "lin@xingyao.ai",  role: "管理员", avatar: "林", joined: "2026-06-03" },
  { id: 3, name: "陈晓悦", account: "chen@xingyao.ai", role: "导演",   avatar: "陈", joined: "2026-07-12" },
  { id: 4, name: "吴诗涵", account: "wu@xingyao.ai",   role: "编剧",   avatar: "吴", joined: "2026-07-28" },
  { id: 5, name: "孙轩宇", account: "sun@xingyao.ai",  role: "制作人", avatar: "孙", joined: "2026-08-05" },
];

export const TEAM_ROLES = ["管理员", "导演", "编剧", "制作人"] as const;
export type TeamRole = typeof TEAM_ROLES[number];

export const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  "管理员":  { bg: "rgba(139,92,246,.2)",  color: "#a78bfa" },
  "导演":    { bg: "rgba(16,185,129,.18)", color: "#34d399" },
  "编剧":    { bg: "rgba(251,191,36,.18)", color: "#fbbf24" },
  "制作人":  { bg: "rgba(14,165,233,.18)", color: "#38bdf8" },
  "创始人":  { bg: "linear-gradient(135deg, #ff8a1f, #ffad4a)", color: "#000" },
  "主创编剧": { bg: "rgba(34,197,94,0.18)", color: "#22c55e" },
  "视觉导演": { bg: "rgba(249,115,22,0.18)", color: "#f97316" },
  "AI调度师": { bg: "rgba(236,72,153,0.18)", color: "#ec4899" },
  "剪辑后期": { bg: "rgba(99,102,241,0.18)", color: "#6366f1" },
};

// ─── Shared UI Tokens (Figma Design System) ───────────────────────────────────
export const surface     = "linear-gradient(145deg,rgba(255,255,255,.055) 0%,transparent 45%),rgba(14,11,22,.97)";
export const cardShadow = "inset 0 1px 0 rgba(255,255,255,.11), 0 8px 32px rgba(0,0,0,.45)";
export const textDim    = "rgba(255,255,255,.6)";
export const textMuted  = "rgba(255,255,255,.45)";
export const gold       = "#ffac30";

// ─── Color Tokens ──────────────────────────────────────────────────────────────
export const colors = {
  bgPrimary: "#0d0e12",
  bgSecondary: "#14151b",
  bgSurface: "#1a1b22",
  bgElevated: "#24252e",
  bgHover: "rgba(255,255,255,0.05)",
  bgActive: "rgba(255,138,31,0.1)",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.12)",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.75)",
  textMuted: "rgba(255,255,255,0.45)",
  textDisabled: "rgba(255,255,255,0.25)",
  accent: "#ff8a1f",
  accentLight: "#ffad4a",
  accentDim: "rgba(255,140,32,0.15)",
  success: "#22c55e",
  warning: "#ffac30",
  error: "#f87171",
  info: "#38bdf8",
  purple: "#a78bfa",
};
