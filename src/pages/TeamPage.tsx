// ═══════════════════════════════════════════════════════════════════════════════════
// TeamPage - 团队管理页（容器）
//
// 一级页签：成员管理 / 星石管理 / 成员详情 / 用量明细
//
// 路由状态全部来自 URL（?page=team&tab=...&member=...&view=...&task=...）：
//   · 一级页签、上下文成员
//   · 用量明细的子视图、日期、筛选、分页、选中的任务 ID
// 刷新、浏览器前进／后退、深链都能重建同一视图。
//
// 成员归属校验规则：
//   · 用量明细允许已移除成员（历史追溯）
//   · 成员档案 / 星石管理只允许当前在席成员
// ═══════════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { colors } from "../shared";
import type { Nav as NavType } from "../shared";
import { subscribeWallet } from "../billing";
import { subscribeTeam, getActiveMembers, getMemberById } from "../team";
import { TEAM_TABS } from "./team/shared";
import type { TeamTabId } from "./team/shared";
import { parseTab, parseUsageRoute, parseFocus, usageRouteParams } from "./team/route";
import type { UsageRoute } from "./team/route";
import MembersTab from "./team/MembersTab";
import { TeamWallet } from "./team/StarsTab";
import TeamUsageSummary from "./team/TeamUsageSummary";
import TaskRecordsPage from "./TaskRecordsPage";

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState { msg: string; kind: "ok" | "err" }

function Toast({ state, onClose }: { state: ToastState | null; onClose: () => void }) {
  useEffect(() => {
    if (!state) return;
    const t = setTimeout(onClose, 3600);
    return () => clearTimeout(t);
  }, [state, onClose]);

  if (!state) return null;
  const ok = state.kind === "ok";
  return (
    <div
      role="status"
      style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        zIndex: 2000, maxWidth: 620,
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 18px", borderRadius: 12,
        background: colors.bgElevated,
        border: `1px solid ${ok ? "rgba(34,197,94,.3)" : "rgba(248,113,113,.35)"}`,
        boxShadow: "0 16px 40px rgba(0,0,0,.5)",
        animation: "fade-up .22s ease",
      }}
    >
      <div style={{
        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
        background: ok ? colors.success : colors.error,
      }} />
      <span style={{ fontSize: 12.5, color: colors.textPrimary, lineHeight: 1.55 }}>{state.msg}</span>
      <button onClick={onClose} aria-label="关闭提示"
        style={{ background: "none", border: "none", color: colors.textDisabled, cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0, marginLeft: 4 }}>
        ×
      </button>
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function TeamPage({ navigate }: NavType) {
  const [tab, setTab] = useState<TeamTabId>(() => parseTab(window.location.search));
  const [usage, setUsage] = useState<UsageRoute>(() => parseUsageRoute(window.location.search));
  const [focusMember, setFocusMember] = useState<number | null>(() => parseFocus(window.location.search));
  const [toast, setToast] = useState<ToastState | null>(null);
  const [, forceRender] = useState(0);

  // 钱包 / 团队数据变化时刷新
  useEffect(() => subscribeWallet(() => forceRender(v => v + 1)), []);
  useEffect(() => subscribeTeam(() => forceRender(v => v + 1)), []);

  // 浏览器前进／后退：重建同一视图
  useEffect(() => {
    const onPop = () => {
      setTab(parseTab(window.location.search));
      setUsage(parseUsageRoute(window.location.search));
      setFocusMember(parseFocus(window.location.search));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const onToast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    setToast({ msg, kind });
  }, []);

  /**
   * 写回 URL。路由状态是唯一真相来源，组件不额外保存副本。
   *
   * URL 参数分工：
   *   member —— 用量页的成员筛选（允许已移除成员，用于历史追溯）
   *   focus  —— 成员档案 / 星石管理的定位成员（只允许当前在席成员）
   */
  const writeUrl = useCallback((
    next: { tab?: TeamTabId; usage?: UsageRoute; focus?: number | null },
    opts?: { replace?: boolean },
  ) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", "team");

    const nextTab = next.tab ?? tab;
    params.set("tab", nextTab);

    const nextUsage = next.usage ?? usage;

    // 用量子状态（日期、筛选、分页、任务 ID）只在用量页有意义
    const USAGE_KEYS = ["view", "task", "dfrom", "dto", "cat", "project", "model", "status", "q", "pg", "sort"];
    if (nextTab === "usage" || nextTab === "tasks") {
      USAGE_KEYS.forEach(k => params.delete(k));
      usageRouteParams(nextUsage).forEach((v, k) => params.set(k, v));
    } else {
      USAGE_KEYS.forEach(k => params.delete(k));
    }

    // 成员筛选：用量页用 member，其它页用 focus
    if (nextTab === "usage" || nextTab === "tasks") {
      if (nextUsage.member !== null) params.set("member", String(nextUsage.member));
      else params.delete("member");
      params.delete("focus");
    } else {
      params.delete("member");
      const focus = next.focus === undefined ? focusMember : next.focus;
      if (focus !== null && focus !== undefined) params.set("focus", String(focus));
      else params.delete("focus");
    }

    const url = "?" + params.toString();
    if (opts?.replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  }, [tab, usage, focusMember]);

  /** 切换一级页签 */
  const changeTab = useCallback((next: TeamTabId) => {
    setTab(next);
    // 星石管理的额度弹窗只在明确点「管理额度」时打开，切换页签不自动弹出
    writeUrl({ tab: next, focus: next === "stars" ? null : undefined });
  }, [writeUrl]);

  const openTasks = useCallback((route: UsageRoute) => {
    const nextUsage = { ...route, view: "tasks" as const };
    setUsage(nextUsage);
    setTab("tasks");
    writeUrl({ tab: "tasks", usage: nextUsage });
  }, [writeUrl]);

  /**
   * 跳到指定页签，可带成员 ID。
   * memberId 校验规则按目标页签区分：
   *   · usage 允许已移除成员（历史追溯）
   *   · detail / stars 只允许当前在席成员
   */
  const goTab = useCallback((next: TeamTabId, memberId?: number) => {
    if (memberId !== undefined) {
      const member = getMemberById(memberId);
      const allowed = next === "usage"
        ? !!member
        : !!member && member.seat === "active";
      if (!allowed) {
        setToast({ msg: "该成员不属于当前团队", kind: "err" });
        writeUrl({ tab: next, focus: null });
        return;
      }
    }

    if (next === "usage") {
      // 统一进入任务明细，带上该成员和已有日期条件
      const nextUsage: UsageRoute = {
        ...usage,
        view: "tasks",
        member: memberId !== undefined ? memberId : usage.member,
        task: null,
        pg: 1,
      };
      openTasks(nextUsage);
    } else {
      setTab(next);
      setFocusMember(memberId ?? null);
      writeUrl({ tab: next, focus: memberId ?? null });
    }
  }, [openTasks, usage, writeUrl]);

  /** 用量子路由变化 */
  const onUsageRouteChange = useCallback((
    next: Partial<UsageRoute>,
    opts?: { replace?: boolean },
  ) => {
    const merged: UsageRoute = { ...usage, ...next };
    setUsage(merged);
    writeUrl({ tab: "usage", usage: merged }, opts);
  }, [usage, writeUrl]);

  const members = getActiveMembers();
  const onlineCount = members.filter(m => m.online).length;

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
      {/* ── 页头 ── */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary, marginBottom: 4 }}>
          团队管理
        </h1>
        <p style={{ fontSize: 13, color: colors.textMuted }}>
          星耀漫剧工作室 · {members.length} 人 · {onlineCount} 人在线
        </p>
      </div>

      {/* ── 一级页签 ── */}
      <div
        role="tablist"
        aria-label="团队管理页签"
        style={{
          display: "flex", gap: 4, marginBottom: 18,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {TEAM_TABS.map(t => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => changeTab(t.id)}
              title={t.hint}
              style={{
                position: "relative",
                padding: "10px 16px 12px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: on ? 700 : 500,
                color: on ? colors.accent : colors.textMuted,
                transition: "color .15s",
              }}
            >
              {t.label}
              {on && (
                <span style={{
                  position: "absolute", left: 12, right: 12, bottom: -1,
                  height: 2, background: colors.accent, borderRadius: "2px 2px 0 0",
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── 页签内容 ── */}
      {tab === "members" && (
        <MembersTab
          focusMemberId={focusMember}
          onOpenUsage={id => goTab("usage", id)}
          onToast={onToast}
        />
      )}
      {tab === "usage" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TeamWallet />
          <TeamUsageSummary route={usage} onChange={onUsageRouteChange} onOpenTasks={openTasks} />
        </div>
      )}
      {tab === "tasks" && <TaskRecordsPage embedded space="team" navigate={navigate} />}

      <Toast state={toast} onClose={() => setToast(null)} />
    </div>
  );
}
