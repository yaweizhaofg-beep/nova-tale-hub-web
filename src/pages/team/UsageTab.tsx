// ═══════════════════════════════════════════════════════════════════════════════════
// src/pages/team/UsageTab.tsx — 用量明细页签
//
// 三个子视图共用同一份日期上下文与路由状态：
//   团队概览 → 团队消耗、日趋势、活跃成员
//   成员用量 → 按成员汇总，点「查看该成员任务」进入任务明细
//   任务明细 → 左侧任务列表 + 右侧任务详情（常驻双栏）
//
// 所有筛选、分页、任务 ID 都由父级（TeamPage）从 URL 解析后传入，
// 本组件不持有路由状态，避免渲染期写状态导致的循环更新。
// ═══════════════════════════════════════════════════════════════════════════════════

import "./task-records.css";
import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Download, TrendingUp, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { colors, ROLE_STYLE } from "../../shared";
import { getAllocation } from "../../billing";
import { getAllMembers } from "../../team";
import {
  getTasksInRange, aggregateByMember, dailyTrend,
  TASK_CATEGORIES, TASK_STATUSES, STATUS_META, TODAY, TASK_PAGE_SIZE,
  formatDuration, csvCell,
} from "../../records";
import type { SpaceKind } from "../../records";
import { USAGE_VIEWS } from "./route";
import type { UsageRoute, UsageView } from "./route";
import TaskDetail from "./TaskDetail";
import {
  Panel, Stat, Tag, DemoBadge, PrimaryBtn, GhostBtn, Empty, TableHead, TableScroll,
  LinkBtn, SearchBox, useIsNarrow,
} from "./shared";

function fmt(n: number): string {
  return n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function UsageTab({
  route, onRouteChange, onOpenStars, onToast, onOpenBilling, space = "team", standalone = false, onOpenTasks, title, toolbarAction,
}: {
  route: UsageRoute;
  onRouteChange: (next: Partial<UsageRoute>, opts?: { replace?: boolean }) => void;
  onOpenStars?: (memberId?: number) => void;
  onToast: (m: string, k?: "ok" | "err") => void;
  /** 打开账单页并定位到某条结算流水 */
  onOpenBilling: (taskId: string) => void;
  space?: SpaceKind;
  standalone?: boolean;
  title?: string;
  toolbarAction?: ReactNode;
  onOpenTasks?: (route: UsageRoute) => void;
}) {
  const narrow = useIsNarrow(900);
  const personal = space === "personal";
  const changeRoute = (next: Partial<UsageRoute>, opts?: { replace?: boolean }) => {
    if (next.view === "tasks" && onOpenTasks) onOpenTasks({ ...route, ...next });
    else onRouteChange(next, opts);
  };
  const allMembers = getAllMembers();
  const memberMap = useMemo(
    () => new Map(allMembers.map(m => [m.id, m])),
    [allMembers],
  );

  const { from, to } = route;
  const personalStart = getTasksInRange("0000-01-01", TODAY, "personal").map(t => t.startedAt.slice(0, 10)).sort()[0] ?? from;

  // 日期区间内的全部团队任务
  const rangeTasks = useMemo(() => getTasksInRange(from || "0000-01-01", to || "9999-12-31", space), [from, to, space]);

  // 应用当前筛选
  const filtered = useMemo(() => {
    const kw = route.q.trim().toLowerCase();
    return rangeTasks.filter(t => {
      if (!personal && route.member !== null && t.memberId !== route.member) return false;
      if (route.cat !== "all" && t.category !== route.cat) return false;
      if (route.project && t.project !== route.project) return false;
      if (route.model && t.model !== route.model) return false;
      if (route.status !== "all" && t.status !== route.status) return false;
      if (!kw) return true;
      return (
        t.taskId.toLowerCase().includes(kw) ||
        t.taskNo.toLowerCase().includes(kw) ||
        t.storyboard.toLowerCase().includes(kw) ||
        t.project.toLowerCase().includes(kw) ||
        t.model.toLowerCase().includes(kw) ||
        t.action.toLowerCase().includes(kw) ||
        t.prompt.toLowerCase().includes(kw)
      );
    });
  }, [rangeTasks, route, personal]);

  // 排序
  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (!standalone && route.sort === "actual") arr.sort((a, b) => b.actual - a.actual);
    else arr.sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0));
    return arr;
  }, [filtered, route.sort, standalone]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / TASK_PAGE_SIZE));
  const page = Math.min(route.pg, totalPages);
  const pageTasks = sorted.slice((page - 1) * TASK_PAGE_SIZE, page * TASK_PAGE_SIZE);

  const selectedTask = route.task ? sorted.find(t => t.taskId === route.task) : undefined;
  const showDetailOnly = narrow && !!selectedTask;
  const detailPanel = useRef<HTMLElement>(null);
  const openedRow = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (showDetailOnly) {
      detailPanel.current?.focus();
    } else {
      openedRow.current?.focus({ preventScroll: true });
      openedRow.current = null;
    }
  }, [showDetailOnly]);

  const totals = useMemo(() => ({
    count: sorted.length,
    actual: sorted.reduce((s, t) => s + t.actual, 0),
    refund: sorted.reduce((s, t) => s + t.refund, 0),
    frozen: sorted.reduce((s, t) => s + t.frozen, 0),
  }), [sorted]);

  const memberRows = useMemo(() => {
    const rows = aggregateByMember(rangeTasks);
    return rows.map(r => ({ ...r, member: memberMap.get(r.memberId) }));
  }, [rangeTasks, memberMap]);

  const trend = useMemo(() => route.view === "overview" ? dailyTrend(rangeTasks, from, to) : [], [rangeTasks, from, to, route.view]);
  const maxTrend = Math.max(1, ...trend.map(t => t.value));
  const activeMembers = new Set(rangeTasks.map(t => t.memberId)).size;
  const dailyAvg = trend.length ? rangeTasks.reduce((s, t) => s + t.actual, 0) / trend.length : 0;

  const projectNames = [...new Set(rangeTasks.map(t => t.project))].filter(Boolean).sort();
  const modelNames = [...new Set(rangeTasks.map(t => t.model))].filter(Boolean).sort();

  // ── 导出 CSV（按当前筛选，跨分页一致）──────────────────────────────────────
  const exportCSV = () => {
    const headers = [
      "任务ID", "任务号", "状态", "类别", "动作", ...(!personal ? ["成员", "账号"] : []),
      "项目", "集", "分镜", "模型", "提示词摘要", "开始时间", "耗时(秒)",
      "预估冻结", "实扣", "退回", "结算状态",
    ];
    const rows = sorted.map(t => {
      const m = memberMap.get(t.memberId);
      return [
        t.taskId, t.taskNo, t.status, t.category, t.action,
        ...(!personal ? [m?.name ?? `成员${t.memberId}`, m?.account ?? "-"] : []),
        t.project, t.episode, t.storyboard, t.model,
        t.prompt.replace(/\s+/g, " ").slice(0, 80),
        t.startedAt, t.durationSec ?? "",
        t.frozen, t.actual, t.refund, t.settleStatus,
      ].map(csvCell).join(",");
    });
    const csv = [headers.map(csvCell).join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `${personal ? "个人" : "团队"}任务明细_${from}_${to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    onToast(`已导出 ${rows.length} 条任务（按当前筛选，跨分页一致）`);
  };

  const resetFilters = () => {
    onRouteChange({
      cat: "all", member: null, project: "", model: "", status: "all", q: "", pg: 1, task: null,
      ...(standalone ? { from: "", to: "", sort: "time" as const } : {}),
    });
  };

  const switchView = (view: UsageView) => {
    changeRoute({ view, task: null });
  };

  // ── 子视图切换 ─────────────────────────────────────────────────────────────
  const viewBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {!standalone && <div style={{
        display: "flex", gap: 4, padding: 4,
        background: colors.bgSurface, border: `1px solid ${colors.border}`,
        borderRadius: 11,
      }}>
        {USAGE_VIEWS.map(v => {
          const on = route.view === v.id;
          return (
            <button key={v.id} onClick={() => switchView(v.id)}
              style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                background: on ? colors.accentDim : "transparent",
                color: on ? colors.accent : colors.textMuted,
                border: "none", cursor: "pointer",
              }}>{v.label}</button>
          );
        })}
      </div>}
      {!personal && route.member !== null && (
        <button
          onClick={() => onRouteChange({ member: null, pg: 1, task: null })}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 11px", borderRadius: 100, fontSize: 11.5,
            background: colors.accentDim, border: "1px solid rgba(255,138,31,.3)",
            color: colors.accent, cursor: "pointer",
          }}
          title="移除成员筛选"
        >
          成员：{memberMap.get(route.member)?.name ?? `成员${route.member}`} ×
        </button>
      )}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <DemoBadge text="演示数据" />
        <GhostBtn onClick={exportCSV} disabled={sorted.length === 0}>
          <Download style={{ width: 13, height: 13 }} />导出 CSV
        </GhostBtn>
      </div>
    </div>
  );

  const dateInputs = (
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <input aria-label="开始日期" type="date" value={from} max={to}
              onChange={e => onRouteChange({ from: e.target.value, pg: 1, task: null })}
              style={{
                padding: "6px 10px", borderRadius: 8, fontSize: 12,
                background: colors.bgSecondary, border: `1px solid ${colors.borderStrong}`,
                color: colors.textSecondary, outline: "none",
              }} />
            <span style={{ fontSize: 12, color: colors.textMuted }}>至</span>
            <input aria-label="结束日期" type="date" value={to} min={from} max={TODAY}
              onChange={e => onRouteChange({ to: e.target.value, pg: 1, task: null })}
              style={{
                padding: "6px 10px", borderRadius: 8, fontSize: 12,
                background: colors.bgSecondary, border: `1px solid ${colors.borderStrong}`,
                color: colors.textSecondary, outline: "none",
              }} />
          </div>
  );

  const dateControls = (
    <div className="task-date-controls">
          <div style={{
            display: "flex", gap: 4, padding: 4,
            background: colors.bgSecondary, border: `1px solid ${colors.border}`,
            borderRadius: 10,
          }}>
            {([
              { k: "7d" as const, label: "近 7 天", from: "2026-10-30" },
              { k: "30d" as const, label: "近 30 天", from: "2026-10-07" },
              ...(personal ? [{ k: "all" as const, label: "全部时间", from: personalStart }] : []),
            ]).map(r => {
              const on = from === r.from && (r.k === "all" || to === TODAY);
              return (
                <button key={r.k} onClick={() => {
                  onRouteChange({ from: r.from, to: TODAY, task: null, pg: 1 });
                }}
                  style={{
                    padding: "6px 13px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: on ? colors.accentDim : "transparent",
                    color: on ? colors.accent : colors.textMuted,
                    border: "none", cursor: "pointer",
                  }}>{r.label}</button>
              );
            })}
          </div>

      {dateInputs}
    </div>
  );

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 12,
      "--task-ink": colors.textPrimary, "--task-muted": colors.textSecondary,
      "--task-border": colors.border, "--task-surface": colors.bgSurface,
      "--task-hover": colors.bgHover, "--task-accent": colors.accent, "--task-selected": colors.accentDim,
    } as CSSProperties}>
      {!standalone && <>{dateControls}{viewBar}</>}

      {/* ── 团队概览 ── */}
      {route.view === "overview" && (
        <>
          {rangeTasks.length === 0 ? (
            <Panel title="团队用量">
              <Empty text="所选时段暂无用量" hint="请调整日期范围，或该时段确实没有生成任务" />
            </Panel>
          ) : (
            <>
              <Panel title="团队用量" extra={
                <span style={{ fontSize: 11, color: colors.textMuted }}>{from} 至 {to}</span>
              }>
                <div style={{ padding: "18px 20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                    <Stat label="已结算消耗" value={fmt(totals.actual)} color={colors.accent} sub="星石" />
                    <Stat label="日均消耗" value={fmt(dailyAvg)} color={colors.info} sub="星石 / 天" />
                    <Stat label="活跃成员" value={activeMembers} color={colors.success} sub="人" />
                    <Stat label="任务数" value={totals.count} color={colors.purple} sub="条" />
                  </div>

                  {/* 日趋势 */}
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <TrendingUp style={{ width: 14, height: 14, color: colors.accent }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: colors.textPrimary }}>日趋势</span>
                      <span style={{ fontSize: 11, color: colors.textMuted }}>
                        合计 {fmt(totals.actual)} 星石 · 退回 {fmt(totals.refund)} 不计入消耗
                      </span>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "flex-end", gap: 3,
                      height: 110, padding: "10px 0",
                      borderBottom: `1px solid ${colors.border}`,
                    }}>
                      {trend.map(t => {
                        const h = Math.max(2, (t.value / maxTrend) * 88);
                        const d = t.date.slice(5);
                        return (
                          <div key={t.date} title={`${t.date} · ${fmt(t.value)} 星石`}
                            style={{
                              flex: 1, height: h, borderRadius: "3px 3px 0 0",
                              background: t.value > 0
                                ? `linear-gradient(180deg, ${colors.accent}, rgba(255,138,31,.35))`
                                : "rgba(255,255,255,.05)",
                              position: "relative",
                            }}>
                            {trend.length <= 10 && (
                              <span style={{
                                position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)",
                                fontSize: 9, color: colors.textDisabled, whiteSpace: "nowrap",
                              }}>{d}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {trend.length > 10 && (
                      <div style={{ fontSize: 10.5, color: colors.textDisabled, marginTop: 18 }}>
                        共 {trend.length} 天，悬停柱形查看每日消耗
                      </div>
                    )}
                  </div>

                  <div style={{
                    marginTop: 16, padding: "10px 12px", borderRadius: 10,
                    background: colors.bgSecondary, border: `1px solid ${colors.border}`,
                    fontSize: 11, color: colors.textMuted, lineHeight: 1.7,
                  }}>
                    充值与冻结不计入消耗；退回金额不重复扣减。预估冻结合计 {fmt(totals.frozen)} 星石，
                    实扣合计 {fmt(totals.actual)} 星石。当前团队钱包余额为<strong style={{ color: colors.textSecondary }}>当前值</strong>，非历史期末值。
                  </div>
                </div>
              </Panel>

              {/* 入口 */}
              <Panel title="继续查看">
                <div style={{ padding: "18px 20px", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <PrimaryBtn onClick={() => changeRoute({ view: "tasks", task: null, pg: 1 })}>
                    查看任务明细
                  </PrimaryBtn>
                  <GhostBtn onClick={() => onRouteChange({ view: "members", task: null })}>
                    查看成员用量
                  </GhostBtn>
                  <span style={{ fontSize: 11, color: colors.textMuted, alignSelf: "center" }}>
                    两个入口进入同一张任务表，沿用当前日期条件
                  </span>
                </div>
              </Panel>
            </>
          )}
        </>
      )}

      {/* ── 成员用量 ── */}
      {route.view === "members" && (
        <Panel title="成员用量" extra={
          <span style={{ fontSize: 11, color: colors.textMuted }}>
            {from} 至 {to} · 按消耗降序
          </span>
        }>
          {memberRows.length === 0 ? (
            <Empty text="所选时段暂无用量" hint="请调整日期范围后再查看" />
          ) : (
            <>
              <TableHead
                columns={["成员", "所选期间消耗", "任务数", "最近使用时间", "当前额度", "操作"]}
                widths={["1.8fr", "1.2fr", "0.8fr", "1.3fr", "1fr", "1.3fr"]}
              />
              <TableScroll minWidth={820}>
                {memberRows.map((r, i) => {
                  const removed = r.member?.seat === "removed";
                  const rs = ROLE_STYLE[r.member?.role ?? ""] ?? { bg: colors.bgHover, color: colors.textMuted };
                  return (
                    <div key={r.memberId} style={{
                      display: "grid", gridTemplateColumns: "1.8fr 1.2fr 0.8fr 1.3fr 1fr 1.3fr",
                      alignItems: "center", padding: "12px 20px",
                      borderBottom: i < memberRows.length - 1 ? `1px solid ${colors.border}` : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: removed ? colors.bgHover : rs.bg,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11.5, fontWeight: 700,
                          color: removed ? colors.textMuted : rs.color,
                          opacity: removed ? 0.6 : 1,
                        }}>{r.member?.avatar ?? "?"}</div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: colors.textPrimary }}>
                              {r.member?.name ?? `成员${r.memberId}`}
                            </span>
                            {removed && <Tag label="已移除" color={colors.textMuted} bg="rgba(255,255,255,.05)" />}
                          </div>
                          <span style={{ fontSize: 10.5, color: colors.textMuted }}>{r.member?.account ?? "-"}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.accent }}>{fmt(r.actual)}</span>
                      <span style={{ fontSize: 12, color: colors.textSecondary }}>{r.count}</span>
                      <span style={{ fontSize: 11.5, color: colors.textMuted }}>{r.last || "—"}</span>
                      <span style={{ fontSize: 11.5, color: colors.textMuted }}>
                        {removed ? "—" : `${getAllocation(r.memberId).allocated.toLocaleString()}（当前值）`}
                      </span>
                      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <LinkBtn onClick={() => changeRoute({
                          view: "tasks", member: r.memberId, pg: 1, task: null,
                        })}>查看该成员任务</LinkBtn>
                        {!removed && <LinkBtn onClick={() => onOpenStars?.(r.memberId)}>额度</LinkBtn>}
                      </div>
                    </div>
                  );
                })}
              </TableScroll>
              <div style={{ padding: "12px 20px", borderTop: `1px solid ${colors.border}`, fontSize: 11, color: colors.textMuted, lineHeight: 1.7 }}>
                已移除成员保留历史消耗，可在所选时段内继续追溯；「当前额度」为当前值，历史日期下不代表该日期的额度分母。
              </div>
            </>
          )}
        </Panel>
      )}

      {/* ── 任务明细（左列表 + 右详情） ── */}
      {route.view === "tasks" && (
        <>
          <div className="task-list-toolbar">
            {title && <h1 className="task-records-title">{title}</h1>}
            {!showDetailOnly && <div className="task-toolbar-actions">
              <select aria-label="任务类型" value={route.cat}
                onChange={e => onRouteChange({ cat: e.target.value as UsageRoute["cat"], pg: 1, task: null })}>
                <option value="all">任务类型</option>
                {TASK_CATEGORIES.map(category => (
                  <option key={category} value={category}>{category === "语言模型" ? "文字生成" : category}</option>
                ))}
              </select>
              <SearchBox value={route.q}
                onChange={q => onRouteChange({ q, pg: 1, task: null }, { replace: true })}
                placeholder="搜索任务、分镜或模型" width={195} />
              {!personal && <select aria-label="成员" value={route.member ?? ""}
                onChange={e => onRouteChange({ member: e.target.value ? Number(e.target.value) : null, pg: 1, task: null })}>
                <option value="">全部成员</option>
                {allMembers.map(member => <option key={member.id} value={member.id}>
                  {member.name}{member.seat === "removed" ? "（已移除）" : ""}
                </option>)}
              </select>}
              <select aria-label="项目" value={route.project}
                onChange={e => onRouteChange({ project: e.target.value, pg: 1, task: null })}>
                <option value="">全部项目</option>
                {projectNames.map(project => <option key={project} value={project}>{project}</option>)}
              </select>
              <select aria-label="模型" value={route.model}
                onChange={e => onRouteChange({ model: e.target.value, pg: 1, task: null })}>
                <option value="">全部模型</option>
                {modelNames.map(model => <option key={model} value={model}>{model}</option>)}
              </select>
              <select aria-label="状态" value={route.status}
                onChange={e => onRouteChange({ status: e.target.value as UsageRoute["status"], pg: 1, task: null })}>
                <option value="all">全部状态</option>
                {TASK_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
              {standalone && <details className="task-time-filter">
                <summary aria-label="时间筛选">
                  {from || to ? `${from ? from.slice(5) : "不限"} 至 ${to ? to.slice(5) : "不限"}` : "全部时间"}
                </summary>
                <div className="task-time-options">{dateInputs}</div>
              </details>}
              <GhostBtn onClick={resetFilters}><RotateCcw size={12} />重置</GhostBtn>
            </div>}
            {toolbarAction}
          </div>

          <div className="task-workspace" data-detail-only={showDetailOnly}>
            <div className="task-list-column" hidden={showDetailOnly}>
            <Panel title="任务列表" extra={<div className="task-list-actions">
              <span className="task-list-count">{totals.count} 条</span>
              {standalone && <><DemoBadge text="演示数据" /><GhostBtn onClick={exportCSV} disabled={sorted.length === 0}>
                <Download size={13} />导出 CSV
              </GhostBtn></>}
            </div>}>
              {sorted.length === 0 ? (
                <Empty
                  text={rangeTasks.length === 0 ? "所选时段暂无任务" : "没有符合筛选条件的任务"}
                  hint={rangeTasks.length === 0 ? "请调整日期范围" : "点击「重置」清空筛选条件"}
                />
              ) : (
                <>
                  <div className="task-row task-row-head" aria-hidden="true">
                    <span>任务</span><span>状态</span><span>开始时间</span>
                  </div>
                  <div className="task-rows">
                    {pageTasks.map(task => {
                      const meta = STATUS_META[task.status];
                      const member = memberMap.get(task.memberId);
                      return (
                        <button type="button" key={task.taskId}
                          className="task-row" aria-pressed={route.task === task.taskId}
                          onClick={e => {
                            if (narrow) openedRow.current = e.currentTarget;
                            onRouteChange({ task: task.taskId });
                          }}>
                          <span className="task-row-main">
                            <strong title={task.taskId}>{task.action} · {task.storyboard || task.category}</strong>
                            <small>{[task.project, task.model, !personal ? member?.name : ""].filter(Boolean).join(" · ")}</small>
                          </span>
                          <Tag label={meta.label} color={meta.color} bg={meta.bg} />
                          <span className="task-row-time">
                            <span>{task.startedAt}</span>
                            <small>{formatDuration(task.durationSec)}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 分页 */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 20px", borderTop: `1px solid ${colors.border}`,
                  }}>
                    <span style={{ fontSize: 11, color: colors.textMuted }}>
                      第 {page} / {totalPages} 页
                    </span>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <button
                        disabled={page <= 1}
                        onClick={() => onRouteChange({ pg: page - 1, task: null })}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "5px 11px", borderRadius: 8, fontSize: 11.5,
                          background: page <= 1 ? "transparent" : colors.bgHover,
                          border: `1px solid ${colors.border}`,
                          color: page <= 1 ? colors.textDisabled : colors.textSecondary,
                          cursor: page <= 1 ? "not-allowed" : "pointer",
                        }}>
                        <ChevronLeft style={{ width: 11, height: 11 }} />上一页
                      </button>
                      <button
                        disabled={page >= totalPages}
                        onClick={() => onRouteChange({ pg: page + 1, task: null })}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "5px 11px", borderRadius: 8, fontSize: 11.5,
                          background: page >= totalPages ? "transparent" : colors.bgHover,
                          border: `1px solid ${colors.border}`,
                          color: page >= totalPages ? colors.textDisabled : colors.textSecondary,
                          cursor: page >= totalPages ? "not-allowed" : "pointer",
                        }}>
                        下一页<ChevronRight style={{ width: 11, height: 11 }} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </Panel>
          </div>

          {/* 右栏：任务详情 */}
          {(!narrow || selectedTask) && <section ref={detailPanel} tabIndex={-1}
            aria-label="任务详情" className="task-inspector">
            <TaskDetail key={selectedTask?.taskId}
              task={selectedTask}
              memberName={selectedTask ? memberMap.get(selectedTask.memberId)?.name : undefined}
              onOpenSettlement={(taskId) => onOpenBilling(taskId)}
              onClose={() => onRouteChange({ task: null })}
              closeLabel={showDetailOnly ? "返回列表" : "取消选择"}
            />
          </section>}
          </div>
        </>
      )}
    </div>
  );
}
