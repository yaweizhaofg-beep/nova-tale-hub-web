// ═══════════════════════════════════════════════════════════════════════════════════
// BillingPage — 账单与消耗
// 面包屑 + 标题
// 页签（积分消耗 / 套餐购买 / 星石充值 / 退回）+ 表格 + 任务ID点击 + 订单勾选
// 开具发票 modal + CSV 导出
//
// 结算流水来自 records.ts，与团队用量、任务详情共享同一份任务 ID，
// 因此账单点某条任务可以精确定位到该任务（不会出现 1045 打开 1048）。
// ═══════════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, X, Download, FileText, Check, ArrowLeft, SlidersHorizontal } from "lucide-react";
import { USER } from "../shared";
import { submitInvoiceRequest } from "../invoices";
import { getMemberById } from "../team";
import type { Nav as NavType } from "../shared";
import {
  SETTLEMENT_LINES, RECHARGE_LINES, getTaskById, csvCell,
} from "../records";
import type { SettlementLine, SpaceKind } from "../records";

// ═══ Design tokens ════════════════════════════════════════════════════════════
const gold       = "#FF8A1F";
const surface    = "linear-gradient(145deg,rgba(255,255,255,.055) 0%,transparent 45%),rgba(14,11,22,.97)";
const bdr        = "rgba(255,255,255,0.07)";
const cardShadow = "inset 0 1px 0 rgba(255,255,255,0.11), 0 8px 32px rgba(0,0,0,0.45)";
const textDim    = "rgba(255,255,255,0.6)";
const textMuted  = "rgba(255,255,255,0.45)";

const billingTabs = ["套餐购买", "星石充值", "积分消耗", "退回"] as const;
type BillingTab = typeof billingTabs[number];
const emptyFilters = { from: "", to: "", member: "", project: "", model: "" };

export default function BillingPage({ navigate, space = "team" }: NavType & { space?: SpaceKind }) {
  const [tab, setTab] = useState<BillingTab>(() => new URLSearchParams(window.location.search).has("task") ? "积分消耗" : "套餐购买");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const filterCount = Number(!!(filters.from || filters.to)) + Number(!!filters.member) + Number(!!filters.project) + Number(!!filters.model);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceTitle, setInvoiceTitle] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [invoiceDone, setInvoiceDone] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [focusTask, setFocusTask] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const records = useMemo(() =>
    [...RECHARGE_LINES, ...SETTLEMENT_LINES].filter(line => line.space === space).map(line => {
      const linkedTask = line.taskId ? getTaskById(line.taskId) : undefined;
      const task = linkedTask?.space === space ? linkedTask : undefined;
      return {
        ...line, task,
        memberName: task ? (space === "personal" ? USER.name : getMemberById(task.memberId)?.name ?? `成员 ${task.memberId}`) : "",
      };
    }),
    [space],
  );

  const projects = new Map<string, string>();
  const members = new Map<number, string>();
  const models = new Set<string>();
  for (const row of records) {
    if (!row.task) continue;
    models.add(row.task.model);
    if (row.task.projectId && row.task.project) projects.set(row.task.projectId, row.task.project);
    members.set(row.task.memberId, row.memberName);
  }

  const updateFilters = (patch: Partial<typeof emptyFilters>) => {
    setFilters(current => ({ ...current, ...patch }));
    setSelectedIds(new Set());
  };

  // 从团队任务详情带过来的任务 ID：定位到对应账单记录
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("task");
    setFocusTask(t);
    if (!t) return;
    // 该任务没有关联流水时给出提示
    const exists = records.some(r => r.taskId === t);
    if (!exists) setFocusTask(null);
  }, [records]);

  // 定位到目标行
  useEffect(() => {
    if (!focusTask) return;
    const el = rowRefs.current[focusTask];
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusTask]);

  const isOrder = (r: SettlementLine) => r.kind === "order";
  const showCheckbox = tab === "套餐购买" || tab === "星石充值";
  const invalidDateRange = !!filters.from && !!filters.to && filters.from > filters.to;
  const filtered = records.filter(row => {
    const date = row.time.slice(0, 10);
    if ((filters.from && date < filters.from) || (filters.to && date > filters.to)) return false;
    if (space === "team" && filters.member && String(row.task?.memberId ?? "") !== filters.member) return false;
    if (filters.project && row.task?.projectId !== filters.project) return false;
    if (filters.model && row.task?.model !== filters.model) return false;
    if (showCheckbox) return isOrder(row) && row.type === tab;
    return !isOrder(row) && (tab !== "退回" || row.refund > 0);
  });
  const orderRows = filtered.filter(isOrder);
  const allOrderIds = orderRows.map(row => row.id);
  const selectedOrders = allOrderIds.filter(id => selectedIds.has(id));
  const invoiceAmount = orderRows.filter(row => selectedIds.has(row.id)).reduce((sum, row) => sum + (row.amount ?? 0), 0);

  const toggleRow = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAll = () => {
    if (selectedOrders.length === allOrderIds.length) {
      setSelectedIds(prev => { const n = new Set(prev); allOrderIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); allOrderIds.forEach(id => n.add(id)); return n; });
    }
  };

  /** 打开某条任务：按精确的任务 ID 定位，携带来源上下文供返回 */
  const openTask = (r: SettlementLine) => {
    if (!r.taskId) return;
    const task = getTaskById(r.taskId);
    if (!task || task.space !== space) return;
    const page = space === "personal" ? "my-tasks" : "team-tasks";
    const params = new URLSearchParams(window.location.search);
    const date = task.startedAt.slice(0, 10);
    const restore = focusTask === r.taskId && params.get("source") === page;
    navigate(page, {
      view: "tasks", task: r.taskId, source: "billing",
      ...(!restore ? { member: null, dfrom: date, dto: date, pg: null, cat: null,
        project: null, model: null, status: null, q: null, sort: null } : {}),
    });
  };

  const backToUsage = () => {
    navigate(space === "personal" ? "my-tasks" : "team-tasks", {
      view: "tasks", task: focusTask, source: null,
    });
  };

  // Make line 2287-2292 — 导出 CSV（按当前筛选范围）
  const exportCSV = () => {
    const headers = ["ID","空间","类型","模型/套餐","对应项目","使用人","预计冻结","实际结算","退回","余额","时间","金额(元)"];
    const rows = filtered.map(r => [
      r.id,
      r.space === "team" ? "团队空间" : "个人空间",
      r.type, r.model, r.task?.project ?? "", r.memberName,
      r.frozen || "—", r.actual || "—", r.refund || "—",
      r.balance?.toLocaleString() ?? "—",
      r.time, r.amount ?? "—",
    ].map(csvCell).join(","));
    const csv = [headers.map(csvCell).join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `账单_${tab}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const submitInvoice = () => {
    const result = submitInvoiceRequest({
      scope: space, title: invoiceTitle, email: invoiceEmail,
      amount: invoiceAmount, orderIds: selectedOrders,
    });
    if (!result.ok) { setInvoiceError(result.reason); return; }
    setInvoiceError("");
    setInvoiceDone(true);
  };

  const iStyle = { width: "100%", background: "rgba(255,255,255,.05)", border: `1px solid ${bdr}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "white", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const } as const;
  const labelS = { fontSize: 11, color: textMuted, marginBottom: 4, display: "block" as const } as const;

  return (
    <div style={{ padding: 24, maxWidth: 1440, margin: "0 auto", position: "relative" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: textMuted, marginBottom: 16 }}>
        <button onClick={() => navigate("delivery")} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer" }}>下载交付</button>
        <ChevronRight style={{ width: 13, height: 13 }} />
        <span style={{ color: "rgba(255,255,255,.7)", fontWeight: 500 }}>消耗账单</span>
      </div>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 20 }}>
        账单与消耗 <span style={{ fontSize: 12, fontWeight: 400, color: textMuted }}>演示账单</span>
      </h1>

      {/* Tabs + toolbar */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, borderBottom: `1px solid ${bdr}`, marginBottom: 0 }}>
        <div style={{ display: "flex", flex: 1 }}>
          {billingTabs.map(t => (
            <button key={t} aria-pressed={tab === t} onClick={() => {
              setTab(t);
              if (t === "套餐购买" || t === "星石充值") updateFilters({ member: "", project: "", model: "" });
              else setSelectedIds(new Set());
            }}
              style={{ padding: "10px 14px", whiteSpace: "nowrap", fontSize: 13, background: "none", border: "none", cursor: "pointer", transition: "all .2s",
                ...(tab === t ? { borderBottom: `2px solid ${gold}`, color: gold, fontWeight: 600 } : { color: textMuted }) }}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8 }}>
          {selectedOrders.length > 0 && (
            <span style={{ fontSize: 12, color: textMuted }}>已选 <b style={{ color: gold }}>{selectedOrders.length}</b> 条</span>
          )}
          {showCheckbox && <button onClick={() => { setInvoiceDone(false); setInvoiceError(""); setInvoiceOpen(true); }}
            disabled={selectedOrders.length === 0}
            title={selectedOrders.length === 0 ? "请先勾选订单记录" : "对选中订单开具发票（演示）"}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: selectedOrders.length === 0 ? "not-allowed" : "pointer",
              background: selectedOrders.length === 0 ? "rgba(255,138,31,.04)" : "rgba(255,138,31,.10)",
              border: `1px solid ${selectedOrders.length === 0 ? "rgba(255,138,31,.15)" : "rgba(255,138,31,.28)"}`,
              color: selectedOrders.length === 0 ? "rgba(255,138,31,.4)" : gold }}>
            <FileText style={{ width: 12, height: 12 }} />开具发票
          </button>}
          <button type="button" aria-expanded={filtersOpen} aria-controls="billing-filters"
            onClick={() => setFiltersOpen(open => !open)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 13px", borderRadius: 7,
              fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${bdr}`,
              background: filterCount ? "rgba(255,138,31,.10)" : "rgba(255,255,255,.05)",
              color: filterCount ? gold : textDim }}>
            <SlidersHorizontal size={13} />筛选{filterCount > 0 ? ` (${filterCount})` : ""}
          </button>
          <button onClick={exportCSV} disabled={filtered.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 13px", borderRadius: 7, fontSize: 12, cursor: "pointer",
              background: "rgba(255,255,255,.05)", border: `1px solid ${bdr}`, color: textMuted }}>
            <Download style={{ width: 11, height: 11 }} />导出
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div id="billing-filters" style={{ display: "flex", flexWrap: "wrap", alignItems: "end",
          gap: 12, padding: 14, borderBottom: `1px solid ${bdr}`, background: surface }}>
          <label style={{ minWidth: 140, maxWidth: "100%" }}>
            <span style={labelS}>模型</span>
            <select aria-label="模型" style={iStyle} value={filters.model} onChange={event => updateFilters({ model: event.target.value })}>
              <option value="">全部模型</option>
              {[...models].sort().map(model => <option key={model} value={model}>{model}</option>)}
            </select>
          </label>
          <label style={{ minWidth: 116 }}>
            <span style={labelS}>开始日期</span>
            <input style={{ ...iStyle, colorScheme: "dark" }} type="date" value={filters.from}
              max={filters.to || undefined} onChange={e => updateFilters({ from: e.target.value })} />
          </label>
          <label style={{ minWidth: 116 }}>
            <span style={labelS}>结束日期</span>
            <input style={{ ...iStyle, colorScheme: "dark" }} type="date" value={filters.to}
              min={filters.from || undefined} onChange={e => updateFilters({ to: e.target.value })} />
          </label>
          <label style={{ minWidth: 140, maxWidth: "100%" }}>
            <span style={labelS}>对应项目</span>
            <select aria-label="对应项目" style={iStyle} value={filters.project} onChange={e => updateFilters({ project: e.target.value })}>
              <option value="">全部项目</option>
              {[...projects].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          {space === "team" && <label style={{ minWidth: 116, maxWidth: "100%" }}>
            <span style={labelS}>使用人</span>
            <select aria-label="使用人" style={iStyle} value={filters.member} onChange={e => updateFilters({ member: e.target.value })}>
              <option value="">全部使用人</option>
              {[...members].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>}
          <button type="button" onClick={() => updateFilters(emptyFilters)} disabled={filterCount === 0}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`,
              background: "transparent", color: textDim, fontSize: 12 }}>重置筛选</button>
          <span role="status" style={{ padding: "8px 0", color: invalidDateRange ? "#f87171" : textMuted, fontSize: 12 }}>
            {invalidDateRange ? "开始日期不能晚于结束日期" : `共 ${filtered.length} 条`}
          </span>
        </div>
      )}

      {/* Table */}
      <div style={{ background: surface, border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 16px 16px", overflowX: "auto", boxShadow: cardShadow }}>
        <table style={{ width: "100%", minWidth: 1080, borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "rgba(255,255,255,.02)", borderBottom: `1px solid ${bdr}` }}>
            <tr>
              {showCheckbox && (
                <th style={{ padding: "11px 14px", width: 36 }}>
                  <input type="checkbox" checked={allOrderIds.length > 0 && selectedOrders.length === allOrderIds.length}
                    ref={(el: HTMLInputElement | null) => { if (el) el.indeterminate = selectedOrders.length > 0 && selectedOrders.length < allOrderIds.length; }}
                    onChange={toggleAll} style={{ cursor: "pointer", accentColor: gold, width: 14, height: 14 }} />
                </th>
              )}
              {["任务/订单ID", "类型", "模型/套餐", "对应项目", "使用人", "预计冻结", "实际结算", "退回", "余额", "时间", "金额"].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 12, fontWeight: 500, color: textMuted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr>
              <td colSpan={showCheckbox ? 12 : 11} style={{ padding: 28, color: textMuted }}>
                当前条件下暂无账单记录
              </td>
            </tr>}
            {filtered.map(r => {
              const selectable = isOrder(r) && showCheckbox;
              const checked = selectedIds.has(r.id);
              const focused = focusTask !== null && r.taskId === focusTask;
              // 只有存在对应任务记录时才提供「查看任务」跳转
              const hasTask = !!r.task;
              return (
                <tr key={r.id} ref={el => { rowRefs.current[r.id] = el; }}
                  onClick={() => selectable && toggleRow(r.id)}
                  style={{ borderBottom: "1px solid rgba(255,255,255,.03)", cursor: selectable ? "pointer" : "default",
                    background: focused ? "rgba(255,138,31,.10)" : checked ? "rgba(255,138,31,.04)" : "transparent",
                    transition: "background .1s" }}>
                  {showCheckbox && (
                    <td style={{ padding: "11px 14px" }}>
                      {selectable && <input type="checkbox" checked={checked} onChange={() => toggleRow(r.id)}
                        onClick={e => e.stopPropagation()} style={{ cursor: "pointer", accentColor: gold, width: 14, height: 14 }} />}
                    </td>
                  )}
                  <td style={{ padding: "11px 14px" }}>
                    <button onClick={e => { e.stopPropagation(); if (hasTask) openTask(r); }}
                      title={hasTask ? `查看任务 ${r.taskId}` : "该流水没有关联任务记录"}
                      style={{ fontSize: 11, fontFamily: "monospace",
                        color: hasTask ? "#60a5fa" : textMuted,
                        background: "none", border: "none",
                        cursor: hasTask ? "pointer" : "default" }}>{r.id}</button>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: textDim }}>
                    {r.type}
                    <div style={{ fontSize: 9.5, color: textMuted, marginTop: 2 }}>
                      {r.space === "team" ? "团队空间" : "个人空间"}
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: textMuted }}>{r.model}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: textDim }}>{r.task?.project || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: textDim }}>{r.memberName || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: textMuted }}>{r.frozen > 0 ? r.frozen : "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "rgba(255,255,255,.75)" }}>{r.actual > 0 ? r.actual : "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#34d399" }}>{r.refund > 0 ? `+${r.refund}` : "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "rgba(255,255,255,.65)" }}>
                    {r.balance !== undefined ? r.balance.toLocaleString() : "—"}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 11, color: textMuted }}>{r.time}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: r.amount ? gold : textMuted, fontWeight: r.amount ? 600 : 400 }}>
                    {r.amount ? `¥${r.amount}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 定位到指定任务时的上下文条 */}
      {focusTask && (
        <div style={{
          marginTop: 14, padding: "11px 16px", borderRadius: 10,
          display: "flex", alignItems: "center", gap: 12,
          background: "rgba(255,138,31,.07)", border: "1px solid rgba(255,138,31,.22)",
        }}>
          <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.75)" }}>
            已定位到任务 <span style={{ fontFamily: "ui-monospace, monospace", color: gold }}>{focusTask}</span> 的结算流水
          </span>
          <button onClick={backToUsage}
            style={{
              marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5,
              padding: "6px 13px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
              background: "rgba(255,138,31,.12)", border: "1px solid rgba(255,138,31,.3)",
              color: gold, cursor: "pointer",
            }}>
            <ArrowLeft style={{ width: 11, height: 11 }} />{space === "personal" ? "返回我的任务" : "返回用量"}
          </button>
        </div>
      )}

      {/* Demo notice */}
      <div style={{ marginTop: 14, fontSize: 11, color: "rgba(255,255,255,.25)", textAlign: "center" }}>
        演示界面 — 账单数据为静态展示，开具发票与扣费操作未连接真实服务
      </div>

      {/* Invoice modal */}
      {invoiceOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)" }}
          onClick={() => setInvoiceOpen(false)}>
          <div style={{ width: 480, background: "#111318", border: `1px solid ${bdr}`, borderRadius: 16,
            boxShadow: "0 32px 96px rgba(0,0,0,.8)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 22px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>开具发票</div>
                <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>已选 {selectedOrders.length} 笔订单 · 开票金额 <span style={{ color: gold, fontWeight: 700 }}>¥{invoiceAmount}</span></div>
              </div>
              <button onClick={() => setInvoiceOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: textMuted, padding: 4 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {invoiceDone ? (
              <div style={{ padding: "48px 32px", textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Check style={{ width: 24, height: 24, color: "#34d399" }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 6 }}>申请已提交</div>
                <div style={{ fontSize: 13, color: textMuted, lineHeight: 1.7, marginBottom: 24 }}>
                  可在个人中心「我的发票」查看此申请。<br />接收邮箱 <span style={{ color: textDim }}>{invoiceEmail}</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,138,31,.7)", background: "rgba(255,138,31,.08)", border: "1px solid rgba(255,138,31,.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 16, display: "inline-block" }}>
                  演示反馈 · 实际开票未连接服务
                </div>
                <div><button onClick={() => setInvoiceOpen(false)}
                  style={{ padding: "8px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: "rgba(255,255,255,.06)", border: `1px solid ${bdr}`, color: textDim }}>关闭</button></div>
              </div>
            ) : (
              <div style={{ padding: "22px 22px 0" }}>
                <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: gold, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,.75)", fontWeight: 500 }}>增值税普通发票</span>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelS}>发票抬头 <span style={{ color: "#f87171" }}>*</span></label>
                  <input aria-label="发票抬头" value={invoiceTitle} onChange={e => setInvoiceTitle(e.target.value)} placeholder="公司名称或个人姓名" style={iStyle} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelS}>接收邮箱 <span style={{ color: "#f87171" }}>*</span></label>
                  <input aria-label="接收邮箱" type="email" value={invoiceEmail} onChange={e => setInvoiceEmail(e.target.value)} placeholder="发票将发送至此邮箱" style={iStyle} />
                </div>

                <div style={{ background: "rgba(255,255,255,.025)", border: `1px solid ${bdr}`, borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: textMuted, marginBottom: 8, fontWeight: 600 }}>开票明细</div>
                  {records.filter(r => selectedIds.has(r.id)).map(r => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                      <span style={{ color: textDim }}>{r.model} <span style={{ color: textMuted, fontSize: 11 }}>({r.time.slice(0, 10)})</span></span>
                      <span style={{ color: gold, fontWeight: 600 }}>¥{r.amount}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingTop: 8, marginTop: 2 }}>
                    <span style={{ color: textDim, fontWeight: 600 }}>合计</span>
                    <span style={{ color: gold, fontWeight: 700 }}>¥{invoiceAmount}</span>
                  </div>
                </div>

                {invoiceError && <p role="alert" style={{ fontSize: 12, color: "#f87171" }}>{invoiceError}</p>}
                <div style={{ padding: "0 0 22px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setInvoiceOpen(false)}
                    style={{ padding: "9px 20px", borderRadius: 8, fontSize: 13, cursor: "pointer", background: "rgba(255,255,255,.05)", border: `1px solid ${bdr}`, color: textMuted }}>取消</button>
                  <button onClick={submitInvoice} disabled={!invoiceTitle || !invoiceEmail}
                    style={{ padding: "9px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      background: !invoiceTitle || !invoiceEmail ? "rgba(255,138,31,.3)" : `linear-gradient(135deg,${gold},#FF6A1A)`,
                      border: "none", color: "white", opacity: !invoiceTitle || !invoiceEmail ? .5 : 1 }}>
                    提交申请
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
