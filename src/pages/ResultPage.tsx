// ═══════════════════════════════════════════════════════════════════════════════════
// ResultPage - 结果详情（查看/后处理）
// 设计来源：Figma Make ResultPage (LandingSection.tsx)
// 标记为：设计补全（非原稿还原，基于 Make 源码适配本地 token）
//
// 带 ?task=<任务ID> 进入时，按该 ID 加载对应任务的真实内容（与团队用量、
// 账单页共享同一份记录）；未知 ID 显示「找不到记录」。
// 不带任务 ID 时沿用既有通用结果样例。
// ═══════════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import {
  Play, Download, ChevronRight, Scissors, Sparkles, RefreshCw, ArrowLeft
} from "lucide-react";
import { PROJECT, TASK, STORYBOARDS } from "../shared";
import type { Nav as NavType } from "../shared";
import { getTaskById, formatDuration, STATUS_META } from "../records";

const gold = "#ffac30";
const surface = "linear-gradient(145deg,rgba(255,255,255,.055) 0%,transparent 45%),rgba(14,11,22,.97)";
const bdr = "rgba(210,205,230,.14)";
const cardShadow = "inset 0 1px 0 rgba(255,255,255,.11), 0 8px 32px rgba(0,0,0,.45)";
const textDim = "rgba(255,255,255,.6)";
const textMuted = "rgba(255,255,255,.45)";

export default function ResultPage({ navigate, space = "team" }: NavType & { space?: "personal" | "team" }) {
  const [av, setAv] = useState(0); // active version A/B/C
  const [taskId, setTaskId] = useState<string | null>(() => {
    const t = new URLSearchParams(window.location.search).get("task");
    return t || null;
  });
  const [from, setFrom] = useState<string | null>(() => {
    const f = new URLSearchParams(window.location.search).get("from");
    return f || null;
  });

  // 浏览器前进／后退时同步任务 ID
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      setTaskId(p.get("task"));
      setFrom(p.get("from"));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const selectedSB = STORYBOARDS.find(s => s.status === "done") ?? STORYBOARDS[0];
  const matchedTask = taskId ? getTaskById(taskId) : undefined;
  const task = matchedTask?.space === space ? matchedTask : undefined;

  // 返回来源
  const goBack = () => {
    if (from === "billing") {
      navigate("billing", { task: taskId, from: null });
      return;
    }
    if (from === "team") {
      navigate("team", { tab: "usage", view: "tasks", task: taskId, from: null });
      return;
    }
    navigate("batch");
  };

  // ── 带任务 ID 但查无此任务 ──
  if (taskId && !task) {
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: textMuted, marginBottom: 16 }}>
          <button onClick={goBack} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", padding: 0 }}>
            返回
          </button>
          <ChevronRight style={{ width: 13, height: 13 }} />
          <span style={{ color: "rgba(255,255,255,.7)", fontWeight: 500 }}>结果详情</span>
        </div>
        <div style={{
          maxWidth: 520, margin: "60px auto", textAlign: "center",
          background: surface, border: `1px solid ${bdr}`, borderRadius: 16, padding: "40px 32px", boxShadow: cardShadow,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 8 }}>找不到该任务的记录</div>
          <div style={{ fontSize: 13, color: textMuted, lineHeight: 1.8, marginBottom: 20 }}>
            任务 ID <span style={{ fontFamily: "ui-monospace, monospace", color: textDim }}>{taskId}</span>
            <br />
            该 ID 在当前空间与授权范围内没有对应的执行记录。
          </div>
          <button onClick={goBack}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 22px", borderRadius: 10,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "rgba(255,255,255,.06)", border: `1px solid ${bdr}`, color: textDim }}>
            <ArrowLeft style={{ width: 13, height: 13 }} />返回
          </button>
        </div>
      </div>
    );
  }

  // ── 带任务 ID：按该任务展示真实内容 ──
  if (task) {
    const meta = STATUS_META[task.status];
    const preview = task.artifacts.find(a => a.accessible && a.url);
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: textMuted, marginBottom: 16 }}>
          <button onClick={goBack} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", padding: 0 }}>
            {from === "billing" ? "账单与消耗" : from === "team" ? "用量明细" : "批量生成"}
          </button>
          <ChevronRight style={{ width: 13, height: 13 }} />
          <span style={{ color: "rgba(255,255,255,.7)", fontWeight: 500 }}>结果详情</span>
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "white" }}>
              {task.taskId} · 结果详情
            </h1>
            <p style={{ fontSize: 13, color: textMuted, marginTop: 3 }}>
              {task.project} · {task.episode} · {task.storyboard}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 100,
              background: meta.bg, color: meta.color,
            }}>{task.status}</span>
            <button onClick={goBack}
              style={{
                padding: "9px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                color: "#34d399", background: "rgba(52,211,153,.12)",
                border: "1px solid rgba(52,211,153,.2)", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
              <ArrowLeft style={{ width: 13, height: 13 }} />返回
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
          <div>
            {/* 产物预览 */}
            <div style={{
              background: "#090A0E", border: `1px solid ${bdr}`, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              aspectRatio: "16/9", maxHeight: 420, overflow: "hidden",
            }}>
              {preview ? (
                <img src={preview.url} alt={preview.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <Play style={{ width: 48, height: 48, color: "rgba(255,255,255,.12)", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>
                    {task.status === "成功" ? "本次执行没有可预览的产物" : "任务尚未产出结果"}
                  </div>
                  {task.spec && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.2)", marginTop: 4 }}>{task.spec}</div>
                  )}
                </div>
              )}
            </div>

            {/* 提示词 / 输出 */}
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 8 }}>
                  {task.category === "语言模型" ? "输入提示词" : `${task.category}提示词`}
                </div>
                <div style={{
                  background: surface, border: `1px solid ${bdr}`, borderRadius: 12, padding: 14,
                  fontSize: 13, lineHeight: 1.8, color: "rgba(255,255,255,.78)", whiteSpace: "pre-wrap",
                }}>{task.prompt}</div>
              </div>

              {task.category === "语言模型" && (
                <div>
                  <div style={{ fontSize: 12, color: textMuted, marginBottom: 8 }}>输出文本</div>
                  <div style={{
                    background: surface, border: `1px solid ${bdr}`, borderRadius: 12, padding: 14,
                    fontSize: 13, lineHeight: 1.8, color: "rgba(255,255,255,.78)", whiteSpace: "pre-wrap",
                  }}>{task.output || "（本次执行没有输出）"}</div>
                </div>
              )}

              {task.failReason && (
                <div style={{
                  background: "rgba(248,113,113,.07)", border: "1px solid rgba(248,113,113,.22)",
                  borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.8, color: "rgba(255,255,255,.78)",
                }}>
                  <div style={{ fontSize: 12, color: "#f87171", marginBottom: 6 }}>失败原因</div>
                  {task.failReason}
                </div>
              )}

              {/* 后处理 */}
              <div>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 8 }}>
                  后处理（确认费用后执行）
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {([
                    { icon: Scissors, l: "字幕擦除" },
                    { icon: Sparkles, l: "画质增强" },
                    { icon: Play, l: "抽取帧" },
                    { icon: RefreshCw, l: "重新生成" },
                  ] as const).map(b => (
                    <button key={b.l} onClick={() => navigate("cost-confirm")}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "8px 13px",
                        borderRadius: 10, fontSize: 12, color: textDim, border: "none",
                        background: "rgba(255,255,255,.04)", cursor: "pointer",
                      }}>
                      <b.icon style={{ width: 13, height: 13 }} />{b.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: surface, border: `1px solid ${bdr}`, borderRadius: 16, padding: 18, boxShadow: cardShadow }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: textDim, marginBottom: 14 }}>任务信息</div>
              {([
                ["任务 ID", task.taskId],
                ["任务号", task.taskNo],
                ["类型", `${task.category} · ${task.action}`],
                ["模型", task.model],
                ["项目", `${task.project}（${task.projectId}）`],
                ["分镜", task.storyboard],
                ["开始时间", task.startedAt],
                ["结束时间", task.endedAt ?? "—"],
                ["耗时", formatDuration(task.durationSec)],
                ["规格", task.spec ?? "—"],
              ] as const).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: textMuted, marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ background: surface, border: `1px solid ${bdr}`, borderRadius: 16, padding: 18, boxShadow: cardShadow }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: textDim, marginBottom: 14 }}>费用明细</div>
              {([
                ["预计冻结", `${task.frozen.toFixed(2)} 星石`, ""],
                ["实际结算", `${task.actual.toFixed(2)} 星石`, ""],
                ["退回", task.refund > 0 ? `+${task.refund.toFixed(2)} 星石` : "—", "#34d399"],
                ["结算状态", task.settleStatus, task.settleStatus === "已结算" ? "#34d399" : ""],
              ] as const).map(([k, v, c]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 9, fontSize: 13 }}>
                  <span style={{ color: textMuted }}>{k}</span>
                  <span style={{ color: (c as string) || "rgba(255,255,255,.75)", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            <button
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "11px 0", borderRadius: 12, fontSize: 13,
                background: "rgba(255,255,255,.04)", border: "none", color: textDim, cursor: "pointer",
              }}>
              <Download style={{ width: 15, height: 15 }} />
              下载当前版本
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, color: "rgba(255,255,255,.25)", textAlign: "center" }}>
          演示界面 — 任务内容与素材为虚构样例，未连接真实生成服务
        </div>
      </div>
    );
  }

  // ── 通用结果样例（不带任务 ID）──────────────────────────────────────────────
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: textMuted, marginBottom: 16 }}>
        <button onClick={() => navigate("batch")}
          style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", padding: 0 }}>
          批量生成
        </button>
        <ChevronRight style={{ width: 13, height: 13 }} />
        <span style={{ color: "rgba(255,255,255,.7)", fontWeight: 500 }}>结果详情</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "white" }}>
            {selectedSB.id} · 结果详情
          </h1>
          <p style={{ fontSize: 13, color: textMuted, marginTop: 3 }}>{PROJECT.name} · {PROJECT.chapter}</p>
        </div>
        <button onClick={() => navigate("delivery")}
          style={{
            padding: "9px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600,
            color: "#34d399", background: "rgba(52,211,153,.12)",
            border: "1px solid rgba(52,211,153,.2)", cursor: "pointer",
          }}>
          加入交付清单
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>

        {/* Video preview */}
        <div>
          <div style={{
            background: "#090A0E", border: `1px solid ${bdr}`, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            aspectRatio: "9/16", maxHeight: 480,
          }}>
            <div style={{ textAlign: "center" }}>
              <Play style={{ width: 48, height: 48, color: "rgba(255,255,255,.12)", margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>
                版本 {String.fromCharCode(65 + av)}（主采用）
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.2)", marginTop: 4 }}>
                {TASK.spec}
              </div>
            </div>
          </div>

          {/* Version selector */}
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            {(["版本 A（主采用）", "版本 B", "版本 C"] as const).map((v, i) => (
              <button key={v} onClick={() => setAv(i)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", transition: "all .2s",
                  ...(av === i
                    ? { background: "rgba(255,138,31,.12)", border: "1px solid rgba(255,138,31,.3)", color: gold }
                    : { background: surface, border: `1px solid ${bdr}`, color: textMuted }),
                }}>
                {v}
              </button>
            ))}
          </div>

          {/* 后处理 */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: textMuted, marginBottom: 8 }}>
              后处理（确认费用后执行）
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {([
                { icon: Scissors, l: "字幕擦除" },
                { icon: Sparkles, l: "画质增强" },
                { icon: Play, l: "抽取帧" },
                { icon: RefreshCw, l: "重新生成" },
              ] as const).map(b => (
                <button key={b.l} onClick={() => navigate("cost-confirm")}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 13px",
                    borderRadius: 10, fontSize: 12, color: textDim, border: "none",
                    background: "rgba(255,255,255,.04)", cursor: "pointer",
                  }}>
                  <b.icon style={{ width: 13, height: 13 }} />{b.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Task info */}
          <div style={{
            background: surface, border: `1px solid ${bdr}`, borderRadius: 16,
            padding: 18, boxShadow: cardShadow,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: textDim, marginBottom: 14 }}>
              任务信息
            </div>
            {([
              ["任务ID", TASK.id],
              ["模型", TASK.model],
              ["规格", TASK.spec],
              ["价格版本", TASK.priceVersion],
            ] as const).map(([k, v]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: textMuted, marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Cost breakdown */}
          <div style={{
            background: surface, border: `1px solid ${bdr}`, borderRadius: 16,
            padding: 18, boxShadow: cardShadow,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: textDim, marginBottom: 14 }}>
              费用明细
            </div>
            {([
              ["预计冻结", `${TASK.estimatedStars.toFixed(2)} 星石`, ""],
              ["实际结算", `${(TASK.estimatedStars * 0.98).toFixed(2)} 星石`, ""],
              ["退回", `+${(TASK.estimatedStars * 0.02).toFixed(2)} 星石`, "#34d399"],
            ] as const).map(([k, v, c]) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between", marginBottom: 9, fontSize: 13,
              }}>
                <span style={{ color: textMuted }}>{k}</span>
                <span style={{ color: (c as string) || "rgba(255,255,255,.75)", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Download */}
          <button
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "11px 0", borderRadius: 12, fontSize: 13,
              background: "rgba(255,255,255,.04)", border: "none", color: textDim, cursor: "pointer",
            }}>
            <Download style={{ width: 15, height: 15 }} />
            下载当前版本
          </button>
        </div>
      </div>
    </div>
  );
}
