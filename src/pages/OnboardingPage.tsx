// ═══════════════════════════════════════════════════════════════════════════════════
// OnboardingPage - 引导选择页（1:1 还原 Figma Make LandingSection.tsx OnboardingPage）
// 展示 6 个创作方式卡片，点击后 navigate(m.dest)
// 本页为演示界面，未接真实创作服务。
// ═══════════════════════════════════════════════════════════════════════════════════

import { useState, useRef } from "react";
import {
  Film, Mic2, ImageIcon, PenLine, Layers,
  Flame, ChevronLeft,
} from "lucide-react";
import type { Nav, PageId } from "../shared";

// ─── 3-D Tilt Card（对齐 Make TiltCard） ──────────────────────────────────────
function TiltCard({ children, className = "", style = {} }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width  - 0.5;
    const ny = (e.clientY - r.top)  / r.height - 0.5;
    ref.current.style.transform =
      `perspective(900px) rotateY(${nx * 14}deg) rotateX(${-ny * 10}deg) scale(1.025)`;
  };
  const onLeave = () => {
    if (ref.current)
      ref.current.style.transform = "perspective(900px) rotateY(0) rotateX(0) scale(1)";
  };
  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

// ─── 创作方式数据（对齐 Make OnboardingPage modes） ────────────────────────────
const MODES = [
  { icon: Film,     title: "剧目创作", desc: "完整剧本转连续视频",   sub: "剧本文件 · 约5步", dest: "workspace" as PageId, c: "#7c3aed", primary: true  as const },
  { icon: ImageIcon,title: "漫画创作", desc: "剧本转漫画分镜图",    sub: "剧本文件 · 约4步", dest: "workspace" as PageId, c: "#0e7490", badge: "完善中" },
  { icon: Mic2,     title: "解说漫",   desc: "制作旁白解说视频",    sub: "图文稿 · 约3步",  dest: "workspace" as PageId, c: "#059669" },
  { icon: Layers,   title: "无限画布", desc: "自由组合多模态素材",  sub: "任意素材 · 灵活",  dest: "canvas"   as PageId, c: "#d97706" },
  { icon: PenLine,  title: "剧本创作", desc: "改写已有故事剧本",    sub: "文本文件 · 约3步", dest: "workspace" as PageId, c: "#dc4f20", badge: "Beta" },
];

export function OnboardingPage({ navigate, backTo }: Nav & { backTo?: PageId }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#090A0E",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
    }}>
      <div style={{ maxWidth: 640, width: "100%" }}>

        {/* 顶部导航栏 */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#FF8A1F",
            }}>
              <Flame style={{ width: 15, height: 15, color: "black" }} />
            </div>
            <span style={{ fontWeight: 600, color: "rgba(255,255,255,.7)", fontSize: 14 }}>
              星核耀火
            </span>
          </div>
          <button
            onClick={() => navigate(backTo ?? "landing")}
            style={{
              background: "none", border: "none",
              color: "rgba(255,255,255,.3)",
              display: "flex", alignItems: "center", gap: 4, fontSize: 12,
              cursor: "pointer",
            }}>
            <ChevronLeft style={{ width: 14, height: 14 }} />
            {backTo ? "返回" : "上一步"}
          </button>
        </div>

        {/* 标题 */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 8 }}>
            你这次想完成什么？
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)" }}>
            选择最符合当前目标的创作方式
          </p>
        </div>

        {/* 卡片网格 */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
        }}>
          {MODES.map((m, idx) => (
            <TiltCard key={m.title}>
              <button
                onClick={() => navigate(m.dest)}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  width: "100%", textAlign: "left", padding: 22,
                  borderRadius: 18, position: "relative", overflow: "hidden",
                  background: m.primary
                    ? `radial-gradient(ellipse at 20% 20%,${m.c}30,rgba(255,255,255,.04) 65%)`
                    : "rgba(255,255,255,.03)",
                  border: `1px solid ${m.primary ? m.c + "35" : "rgba(255,255,255,.08)"}`,
                  display: "flex", flexDirection: "column",
                  cursor: "pointer",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxShadow: hoveredIdx === idx
                    ? `0 0 0 1px ${m.c}44, 0 8px 32px rgba(0,0,0,.4)`
                    : "none",
                }}>
                {/* 徽章 */}
                {m.badge && (
                  <span style={{
                    position: "absolute", top: 12, right: 12,
                    fontSize: 9, fontWeight: 700,
                    padding: "2px 7px", borderRadius: 20,
                    background: "rgba(255,255,255,.08)",
                    border: "1px solid rgba(255,255,255,.12)",
                    color: "rgba(255,255,255,.5)",
                  }}>
                    {m.badge}
                  </span>
                )}

                {/* 底部 glow */}
                <div style={{
                  position: "absolute", bottom: -12, right: -12,
                  width: 60, height: 60, borderRadius: "50%",
                  background: m.c, opacity: 0.15, filter: "blur(16px)",
                  pointerEvents: "none",
                }} />

                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14,
                  background: `${m.c}22`,
                  border: `1px solid ${m.c}30`,
                }}>
                  <m.icon style={{ width: 20, height: 20, color: m.c }} />
                </div>

                <div style={{
                  fontSize: 14, fontWeight: 700, color: m.primary ? "#FF8A1F" : "white",
                  marginBottom: 3,
                }}>
                  {m.title}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", marginBottom: 5 }}>
                  {m.sub}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", lineHeight: 1.5 }}>
                  {m.desc}
                </div>
              </button>
            </TiltCard>
          ))}
        </div>

        {/* 跳过 */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => navigate("workspace")}
            style={{
              fontSize: 13, color: "rgba(255,255,255,.3)",
              background: "none", border: "none",
              cursor: "pointer",
            }}>
            跳过，进入首页
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;
