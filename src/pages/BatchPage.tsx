// ═══════════════════════════════════════════════════════════════════════════════════
// BatchPage - 批量生成进度
// 设计来源：Figma Make BatchPage (LandingSection.tsx)
// 标记为：设计补全（非原稿还原，基于 Make 源码适配本地 token）
// ═══════════════════════════════════════════════════════════════════════════════════

import { AlertTriangle } from "lucide-react";
import { STORYBOARDS, PROJECT, colors } from "../shared";
import type { PageId } from "../shared";

interface NavType { navigate: (p: PageId) => void; }

const STATUS_STYLE: Record<string, { c: string; bg: string; label: string }> = {
  done:    { c: "#34d399", bg: "rgba(52,211,153,.12)", label: "成功" },
  running: { c: "#60a5fa", bg: "rgba(96,165,250,.12)", label: "生成中" },
  queued:  { c: "rgba(255,255,255,.45)", bg: "rgba(255,255,255,.06)", label: "排队中" },
  failed:  { c: "#f87171", bg: "rgba(248,113,113,.12)", label: "失败" },
};

const gold = "#ffac30";

export default function BatchPage({ navigate }: NavType) {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "white" }}>批量生成进度</h1>
          <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 3 }}>{PROJECT.name} · {PROJECT.chapter}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {([
          { label: "已完成", v: PROJECT.storyboards.done, c: "#34d399" },
          { label: "生成中",  v: PROJECT.storyboards.running, c: "#60a5fa" },
          { label: "排队中",  v: PROJECT.storyboards.queued, c: "rgba(255,255,255,.45)" },
          { label: "失败",    v: PROJECT.storyboards.failed, c: "#f87171" },
        ] as const).map(s => (
          <div key={s.label} style={{
            background: "linear-gradient(145deg,rgba(255,255,255,.055) 0%,rgba(14,11,22,.97))",
            border: `1px solid rgba(255,255,255,.08)`, borderRadius: 14, padding: 18, textAlign: "center",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.11), 0 8px 32px rgba(0,0,0,.45)",
          }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Failed alert */}
      {PROJECT.storyboards.failed > 0 && (
        <div style={{
          background: "rgba(248,113,113,.07)", border: "1px solid rgba(248,113,113,.18)",
          borderRadius: 12, padding: "13px 16px", display: "flex",
          alignItems: "center", justifyContent: "space-between", marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle style={{ width: 15, height: 15, color: "#f87171" }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
              {PROJECT.storyboards.failed} 条任务失败，星石已按实际消耗处理
            </span>
          </div>
          <button onClick={() => navigate("cost-confirm")}
            style={{
              padding: "6px 14px", borderRadius: 9, fontSize: 12, color: "#f87171",
              background: "rgba(248,113,113,.15)", border: "1px solid rgba(248,113,113,.2)", cursor: "pointer",
            }}>
            批量重试
          </button>
        </div>
      )}

      {/* Task table */}
      <div style={{
        background: "linear-gradient(145deg,rgba(255,255,255,.055) 0%,rgba(14,11,22,.97))",
        border: "1px solid rgba(255,255,255,.08)", borderRadius: 16,
        overflow: "hidden", boxShadow: "inset 0 1px 0 rgba(255,255,255,.11), 0 8px 32px rgba(0,0,0,.45)",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "rgba(255,255,255,.02)", borderBottom: `1px solid rgba(210,205,230,.14)` }}>
            <tr>
              {["任务ID","分镜描述","模型","状态","预计","实耗","操作"].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 12, fontWeight: 500, color: colors.textMuted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STORYBOARDS.map((sb, i) => {
              const s = STATUS_STYLE[sb.status];
              return (
                <tr key={sb.id} style={{ borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                  <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,.3)" }}>TSK-{String(i+1).padStart(3,"0")}</td>
                  <td style={{ padding: "11px 14px", color: "rgba(255,255,255,.6)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sb.desc}</td>
                  <td style={{ padding: "11px 14px", color: colors.textMuted }}>Seedance 2.0</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: s.bg, color: s.c }}>{s.label}</span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: gold }}>{sb.stars > 0 ? sb.stars.toFixed(2) : "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: colors.textMuted }}>
                    {sb.status === "done"    ? (sb.stars * 0.98).toFixed(2)
                    : sb.status === "failed" ? "已退回"
                    : "—"}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    {sb.status === "done"    && (
                      <button onClick={() => navigate("result")}
                        style={{ fontSize: 12, color: "#60a5fa", background: "none", border: "none", cursor: "pointer" }}>
                        查看
                      </button>
                    )}
                    {sb.status === "failed" && (
                      <button onClick={() => navigate("cost-confirm")}
                        style={{ fontSize: 12, color: "#f87171", background: "none", border: "none", cursor: "pointer" }}>
                        重试
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
