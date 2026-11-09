// ═══════════════════════════════════════════════════════════════════════════════════
// DeliveryPage - 下载交付
// 设计来源：Figma Make DeliveryPage (LandingSection.tsx)
// 标记为：设计补全（非原稿还原，基于 Make 源码适配本地 token）
// ═══════════════════════════════════════════════════════════════════════════════════

import { Play, Download, ChevronRight, AlertTriangle } from "lucide-react";
import { STORYBOARDS, PROJECT, colors } from "../shared";
import type { PageId } from "../shared";

interface NavType { navigate: (p: PageId) => void; }

const gold = "#ffac30";
const surface = "linear-gradient(145deg,rgba(255,255,255,.055) 0%,transparent 45%),rgba(14,11,22,.97)";
const bdr = "rgba(210,205,230,.14)";
const cardShadow = "inset 0 1px 0 rgba(255,255,255,.11), 0 8px 32px rgba(0,0,0,.45)";
const textMuted = "rgba(255,255,255,.45)";

export default function DeliveryPage({ navigate }: NavType) {
  // 仅已完成的任务生成文件列表
  const files = STORYBOARDS.filter(s => s.status === "done").map(s => ({
    id: s.id,
    name: `${s.id}_v1.mp4`,
    size: "24.6 MB",
    expiry: "2026-09-20",
    stars: s.stars,
  }));

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: textMuted, marginBottom: 16 }}>
        <button onClick={() => navigate("batch")}
          style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", padding: 0 }}>
          批量生成
        </button>
        <ChevronRight style={{ width: 13, height: 13 }} />
        <button onClick={() => navigate("result")}
          style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", padding: 0 }}>
          结果详情
        </button>
        <ChevronRight style={{ width: 13, height: 13 }} />
        <span style={{ color: "rgba(255,255,255,.7)", fontWeight: 500 }}>下载交付</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "white" }}>下载交付</h1>
          <p style={{ fontSize: 13, color: textMuted, marginTop: 3 }}>{PROJECT.name} · {files.length} 个文件</p>
        </div>
        <button
          onClick={() => navigate("billing")}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "9px 18px",
            borderRadius: 12, fontSize: 13, fontWeight: 600, color: "black",
            background: colors.accent, border: "none", cursor: "pointer",
          }}>
          <Download style={{ width: 15, height: 15 }} />
          打包下载
        </button>
      </div>

      {/* Expiry warning */}
      <div style={{
        background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.15)",
        borderRadius: 12, padding: "12px 16px", display: "flex", gap: 8, marginBottom: 16,
      }}>
        <AlertTriangle style={{ width: 14, height: 14, color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.6 }}>
          文件为短期缓存，到期后无法下载。请及时下载或配置自有对象存储。
        </p>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 0",
          background: surface, border: `1px solid ${bdr}`, borderRadius: 16,
        }}>
          <Play style={{ width: 48, height: 48, color: "rgba(255,255,255,.1)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.3)" }}>
            暂无已完成的生成文件
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.2)", marginTop: 6 }}>
            请先完成批量生成任务
          </p>
          <button onClick={() => navigate("batch")}
            style={{
              marginTop: 16, padding: "9px 20px", borderRadius: 10, fontSize: 13,
              background: colors.accent, border: "none", color: "#000", cursor: "pointer",
            }}>
            去批量生成
          </button>
        </div>
      ) : (
        <div style={{
          background: surface, border: `1px solid ${bdr}`, borderRadius: 16,
          overflow: "hidden", boxShadow: cardShadow,
        }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
            padding: "11px 16px", borderBottom: `1px solid ${bdr}`,
            fontSize: 12, color: textMuted, background: "rgba(255,255,255,.02)",
          }}>
            <span>文件名</span>
            <span>大小</span>
            <span>星石</span>
            <span>缓存到期</span>
          </div>
          {/* Table rows */}
          {files.map((f, i) => (
            <div key={f.id}
              style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
                padding: "12px 16px",
                borderBottom: i < files.length - 1 ? "1px solid rgba(255,255,255,.03)" : "none",
                alignItems: "center",
              }}>
              {/* File name */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Play style={{ width: 14, height: 14, color: textMuted, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>{f.name}</span>
              </div>
              {/* Size */}
              <span style={{ fontSize: 12, color: textMuted }}>{f.size}</span>
              {/* Stars */}
              <span style={{ fontSize: 12, color: gold, fontWeight: 600 }}>⭐ {f.stars.toFixed(2)}</span>
              {/* Expiry + download */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "rgba(251,191,36,.65)" }}>{f.expiry}</span>
                <button
                  style={{
                    fontSize: 12, color: "#60a5fa", display: "flex", alignItems: "center",
                    gap: 4, background: "none", border: "none", cursor: "pointer",
                  }}>
                  <Download style={{ width: 13, height: 13 }} />
                  下载
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
