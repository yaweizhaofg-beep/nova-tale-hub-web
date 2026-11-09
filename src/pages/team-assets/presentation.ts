import type { AssetStatus, Comp } from "@/features/assets/asset-types";

export const gold   = "#FF8A1F";
export const bdr    = "rgba(255,255,255,.08)";
export const dim    = "rgba(255,255,255,.45)";
export const card   = "#13151C";
export const green  = "#10b981";
export const imgBg  = "#09090f";

export const ddSel = {
  background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 8, padding: "5px 10px", fontSize: 12, color: "rgba(255,255,255,.8)",
  outline: "none", cursor: "pointer",
} as const;

export const STATUS_CFG: Record<AssetStatus, { label: string; color: string; bg: string; border: string }> = {
  confirmed:  { label: "已确认", color: green,           bg: "rgba(16,185,129,.1)",  border: "rgba(16,185,129,.25)"  },
  pending:    { label: "待确认", color: gold,           bg: "rgba(255,138,31,.1)",  border: "rgba(255,138,31,.25)"  },
  generating: { label: "生成中", color: "#60a5fa",       bg: "rgba(96,165,250,.1)",  border: "rgba(96,165,250,.25)"  },
  failed:     { label: "失败",   color: "#f87171",      bg: "rgba(248,113,113,.1)", border: "rgba(248,113,113,.25)" },
};

export const compCfg: Record<Comp, { text: string; c: string; bg: string; border: string }> = {
  pass:       { text: "已确认", c: "#34d399", bg: "rgba(52,211,153,.1)",  border: "rgba(52,211,153,.25)" },
  review:     { text: "审核中", c: "#fbbf24", bg: "rgba(251,191,36,.1)",  border: "rgba(251,191,36,.25)" },
  generating: { text: "生成中", c: "#60a5fa", bg: "rgba(96,165,250,.1)",  border: "rgba(96,165,250,.25)" },
  failed:     { text: "失败",   c: "#f87171", bg: "rgba(248,113,113,.1)", border: "rgba(248,113,113,.25)" },
  empty:      { text: "待确认", c: "#71717a", bg: "rgba(113,113,122,.1)", border: "rgba(113,113,122,.25)" },
};

export const statusToComp = (s: AssetStatus): Comp =>
  s === "confirmed" ? "pass" : s === "pending" ? "empty" : s as Comp;
