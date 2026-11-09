// ═══════════════════════════════════════════════════════════════════════════════════
// src/pages/team/shared.tsx — 团队页签共用的小组件
// ═══════════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { colors } from "../../shared";

/**
 * 窄视口检测（默认断点 960px）。
 * 桌面双栏在窄视口退成单列，表格横向滚动限制在表格容器内。
 */
export function useIsNarrow(breakpoint = 960): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint,
  );
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return narrow;
}

/** 团队一级页签 */
export type TeamTabId = "members" | "stars" | "detail" | "usage" | "tasks";

export const TEAM_TABS: { id: TeamTabId; label: string; hint: string }[] = [
  { id: "members", label: "成员管理", hint: "席位、邀请、职能与移除" },
  { id: "usage", label: "用量明细", hint: "团队钱包与成员消耗" },
  { id: "tasks", label: "任务", hint: "任务列表与执行详情" },
];

/** 面板容器 —— 紫黑面板 + 细描边 */
export function Panel({ children, style, title, extra }: {
  children: ReactNode;
  style?: React.CSSProperties;
  title?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="studio-panel" style={{
      background: colors.bgSurface,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      overflow: "hidden",
      ...style,
    }}>
      {title && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 20px", borderBottom: `1px solid ${colors.border}`,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{title}</span>
          {extra && <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>{extra}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/** 统计小块 */
export function Stat({ label, value, color, sub }: {
  label: string;
  value: ReactNode;
  color?: string;
  sub?: string;
}) {
  return (
    <div style={{
      background: colors.bgSecondary,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: "13px 15px",
    }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: color ?? colors.textPrimary }}>{value}</div>
      <div style={{ fontSize: 10.5, color: colors.textMuted, marginTop: 2 }}>
        {label}{sub ? ` · ${sub}` : ""}
      </div>
    </div>
  );
}

/** 状态标签 */
export function Tag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 600,
      padding: "2px 7px", borderRadius: 100,
      background: bg, color, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

/** 演示数据标记 —— 界面明示「演示数据」 */
export function DemoBadge({ text = "演示数据" }: { text?: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600,
      padding: "2px 8px", borderRadius: 100,
      background: "rgba(56,189,248,.12)", color: colors.info,
      border: "1px solid rgba(56,189,248,.24)",
      whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

/** 主按钮（橙色） */
export function PrimaryBtn({ children, onClick, disabled, style, title }: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="btn-primary"
      style={{
        padding: "9px 18px", borderRadius: 11, fontSize: 12.5, fontWeight: 600,
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        display: "inline-flex", alignItems: "center", gap: 6,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** 次按钮（低对比描边） */
export function GhostBtn({ children, onClick, disabled, style, title }: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "9px 16px", borderRadius: 11, fontSize: 12.5, fontWeight: 600,
        background: colors.bgHover, border: `1px solid ${colors.borderStrong}`,
        color: disabled ? colors.textDisabled : colors.textSecondary,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", gap: 6,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** 空状态 */
export function Empty({ text, hint }: { text: string; hint?: string }) {
  return (
    <div style={{
      padding: "38px 20px", textAlign: "center",
      color: colors.textDisabled, fontSize: 12.5, lineHeight: 1.7,
    }}>
      <div>{text}</div>
      {hint && <div style={{ fontSize: 11, marginTop: 4, color: "rgba(255,255,255,.18)" }}>{hint}</div>}
    </div>
  );
}

/** 表头 */
export function TableHead({ columns, widths }: { columns: string[]; widths: string[] }) {
  return (
    <div className="studio-table-heading" style={{
      display: "grid", gridTemplateColumns: widths.join(" "),
      padding: "11px 20px", background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
    }}>
      {columns.map((c) => (
        <span key={c} style={{ fontSize: 10.5, fontWeight: 600, color: colors.textMuted, letterSpacing: "0.03em" }}>
          {c}
        </span>
      ))}
    </div>
  );
}

/** 可横向滚动的表格容器 */
export function TableScroll({ children, minWidth = 760 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div style={{ overflowX: "auto", overflowY: "hidden" }}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

/** 行内小链接按钮 */
export function LinkBtn({ children, onClick, color }: {
  children: ReactNode;
  onClick?: () => void;
  color?: string;
}) {
  return (
    <button className="studio-table-link"
      onClick={onClick}
      style={{
        background: "none", border: "none", padding: "2px 0",
        fontSize: 11.5, fontWeight: 600,
        color: color ?? colors.accent, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/** 搜索框 */
export function SearchBox({ value, onChange, placeholder, width = 220 }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  width?: number | string;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width, padding: "8px 12px", borderRadius: 9, fontSize: 12.5,
        background: colors.bgSecondary,
        border: `1px solid ${colors.borderStrong}`,
        color: colors.textPrimary, outline: "none", boxSizing: "border-box",
      }}
    />
  );
}

/** 模态遮罩容器 */
export function ModalShell({ onClose, children, width = 460 }: {
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width, maxWidth: "100%",
          background: colors.bgSecondary,
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: 20,
          boxShadow: "0 30px 80px rgba(0,0,0,.6)",
          overflow: "hidden",
          maxHeight: "88vh", display: "flex", flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** 模态头部 */
export function ModalHead({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "20px 22px", borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 4 }}>{sub}</div>}
      </div>
      <button
        onClick={onClose}
        aria-label="关闭"
        style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: "transparent", border: "none", color: colors.textMuted,
          cursor: "pointer", fontSize: 16, lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

/** 模态底部 */
export function ModalFoot({ children }: { children: ReactNode }) {
  return (
    <div style={{
      display: "flex", gap: 10, padding: "14px 22px",
      borderTop: `1px solid ${colors.border}`,
    }}>
      {children}
    </div>
  );
}

/** 输入框 */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.textMuted, marginBottom: 7 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 10.5, color: colors.textDisabled, marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

/** 文本输入 */
export function TextInput(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      type={props.type ?? "text"}
      value={props.value}
      onChange={e => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      autoFocus={props.autoFocus}
      style={{
        width: "100%", padding: "10px 13px", borderRadius: 10, fontSize: 13.5,
        background: colors.bgSurface,
        border: `1px solid ${colors.borderStrong}`,
        color: colors.textPrimary, outline: "none", boxSizing: "border-box",
      }}
    />
  );
}

/** 下拉选择 */
export function Select<T extends string>(props: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  width?: number | string;
}) {
  return (
    <select
      value={props.value}
      onChange={e => props.onChange(e.target.value as T)}
      style={{
        width: props.width ?? "100%", padding: "9px 12px", borderRadius: 10, fontSize: 12.5,
        background: colors.bgSurface,
        border: `1px solid ${colors.borderStrong}`,
        color: colors.textPrimary, outline: "none", boxSizing: "border-box",
      }}
    >
      {props.options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/** 角色徽标 */
export function RoleBadge({ role, style }: { role: string; style: { bg: string; color: string } }) {
  return (
    <span style={{
      display: "inline-flex", width: "max-content", justifySelf: "start",
      fontSize: 10.5, fontWeight: 600,
      padding: "3px 9px", borderRadius: 100,
      background: style.bg, color: style.color, whiteSpace: "nowrap",
    }}>
      {role}
    </span>
  );
}
