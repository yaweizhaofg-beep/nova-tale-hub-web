// ═══════════════════════════════════════════════════════════════════════════════════
// NewProjectPage — 对齐 Figma Make NewProjectPage（App.tsx line 1170-1490）
// 双栏布局：左侧模式卡/剧目名/上传/参数横排/开始；右侧 AI 对话
// ═══════════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import {
  Upload, FileText, X, Sparkles, ChevronRight,
  Flame,
} from "lucide-react";
import type { Nav as NavType } from "../shared";

export function NewProjectPage({ navigate, onStart }: NavType & { onStart?: () => void }) {
  const [name, setName]               = useState("");
  const [model, setModel]             = useState("fast");
  const mode = "novel" as const;
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [targetShots, setTargetShots] = useState(500);
  /** 目标分镜数范围 */
  const MIN_SHOTS = 1;
  const MAX_SHOTS = 5000;

  const unitPrice = model === "fast" ? 18.55 : 45.0;
  /** 预计消耗：目标分镜数 × 单镜价格 */
  const estStars  = Math.round(targetShots * unitPrice);

  const MODES = [
    { key: "novel"  as const, icon: FileText, label: "小说 / 剧本",  sub: "AI 自动拆章生成分镜", color: "#FF8A1F", accept: ".txt,.docx,.md", hint: "支持 .txt · .docx · .md，最大 20 MB" },
  ];
  const activeMode = MODES.find(m => m.key === mode)!;
  const ready = !!name && !!uploadedFile;

  const selectStyle: React.CSSProperties = {
    height: 32, padding: "0 28px 0 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#F4F5F7", outline: "none", cursor: "pointer", appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236F7480' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 9px center",
  };

  return (
    <div className="studio-create" style={{
      height: "100%", display: "flex", flexDirection: "column",
      padding: "18px 24px", boxSizing: "border-box", overflow: "hidden",
      background: "linear-gradient(150deg,#09090D 0%,#0C0D13 60%,#08090E 100%)",
      position: "relative",
    }}>
      {/* Ambient glows */}
      <div style={{ position: "absolute", top: -40, left: "25%", width: 480, height: 240, borderRadius: "50%",
        background: "radial-gradient(ellipse,rgba(255,138,31,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, right: "5%", width: 360, height: 360, borderRadius: "50%",
        background: "radial-gradient(ellipse,rgba(167,139,250,0.04) 0%,transparent 70%)", pointerEvents: "none" }} />

      {/* Breadcrumb */}
      <div className="studio-create-breadcrumb" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, position: "relative", flexShrink: 0 }}>
        <button onClick={() => navigate("projects")}
          style={{ background: "none", border: "none", color: "#A4A8B3", cursor: "pointer", fontSize: 13, padding: 0 }}>
          剧目创作
        </button>
        <ChevronRight style={{ width: 12, height: 12, color: "#6F7480" }} />
        <span style={{ fontSize: 13, color: "#F4F5F7", fontWeight: 500 }}>新建剧目</span>
      </div>

      {/* Main grid */}
      <div className="studio-create-content" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minHeight: 0, position: "relative", maxWidth: 860, width: "100%", margin: "0 auto" }}>

        {/* LEFT COLUMN */}
        <div className="studio-create-form" style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>

          {/* Project name */}
          <div style={{ flexShrink: 0 }}>
            <label style={{ fontSize: 11, color: "#A4A8B3", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              剧目名称 <span style={{ color: "#F87171" }}>*</span>
            </label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="如：《镜像》"
              style={{ width: "100%", height: 38, padding: "0 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#F4F5F7", fontSize: 13.5, fontWeight: 500, outline: "none", boxSizing: "border-box", transition: "border-color .15s" }}
              onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,138,31,0.45)"; }}
              onBlur={e =>  { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }} />
          </div>

          {/* Upload area */}
          <div className="studio-upload-panel" style={{
            flex: 1, minHeight: 0, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.025)", backdropFilter: "blur(20px)", overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "11px 16px 0", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: activeMode.color }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#A4A8B3", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                上传剧本 / 小说
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: "12px 16px 14px", display: "flex", flexDirection: "column" }}>
              {uploadedFile ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 10,
                  border: `1px solid ${activeMode.color}30`, background: `${activeMode.color}0a`, flexShrink: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: `${activeMode.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <activeMode.icon style={{ width: 14, height: 14, color: activeMode.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#F4F5F7", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{uploadedFile}</div>
                    <div style={{ fontSize: 11, color: activeMode.color, marginTop: 1, opacity: 0.8 }}>已选择 · 准备就绪</div>
                  </div>
                  <button onClick={() => setUploadedFile(null)}
                    style={{ color: "#A4A8B3", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, cursor: "pointer", padding: "3px 7px", display: "flex", alignItems: "center" }}>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              ) : (
                <label className="studio-dropzone" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
                  borderRadius: 10, border: "1.5px dashed rgba(255,255,255,0.09)", cursor: "pointer", transition: "all .2s", position: "relative", overflow: "hidden" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = activeMode.color + "50"; el.style.background = `${activeMode.color}06`; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(255,255,255,0.09)"; el.style.background = "transparent"; }}>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 160, height: 100,
                    background: `radial-gradient(ellipse,${activeMode.color}10 0%,transparent 70%)`, pointerEvents: "none" }} />
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                    background: `linear-gradient(135deg,${activeMode.color}22,${activeMode.color}0a)`,
                    border: `1px solid ${activeMode.color}30`, boxShadow: `0 0 20px ${activeMode.color}18`,
                  }}>
                    <Upload style={{ width: 18, height: 18, color: activeMode.color }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#F4F5F7", marginBottom: 3 }}>拖拽或点击上传文件</div>
                    <div style={{ fontSize: 11, color: "#6F7480" }}>{activeMode.hint}</div>
                  </div>
                  <input type="file" style={{ display: "none" }} accept={activeMode.accept}
                    onChange={e => { const f = e.target.files?.[0]; if (f) setUploadedFile(f.name); }} />
                </label>
              )}
            </div>
          </div>

          {/* Settings row */}
          <div className="studio-create-settings" style={{
            flexShrink: 0, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.025)", backdropFilter: "blur(12px)", padding: "11px 14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "nowrap" }}>

              {/* 目标分镜数（上限 5000） */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 180 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "#6F7480", fontWeight: 600, letterSpacing: "0.05em" }}>目标分镜数</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: "auto" }}>
                    <input
                      type="number"
                      min={MIN_SHOTS} max={MAX_SHOTS} step={1} value={targetShots}
                      onChange={e => {
                        const n = Number(e.target.value);
                        if (Number.isNaN(n)) return;
                        setTargetShots(Math.min(MAX_SHOTS, Math.max(MIN_SHOTS, Math.round(n))));
                      }}
                      style={{ width: 62, padding: "2px 6px", borderRadius: 7, fontSize: 11, fontWeight: 700, textAlign: "right",
                        background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
                        color: "#FF8A1F", outline: "none", fontVariantNumeric: "tabular-nums" }}
                    />
                    <span style={{ fontSize: 11, color: "#FF8A1F", fontWeight: 700 }}>个</span>
                  </div>
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <style>{`
                    .eps-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 3px; border-radius: 2px; outline: none;
                      background: linear-gradient(to right, #FF8A1F ${((targetShots - MIN_SHOTS) / (MAX_SHOTS - MIN_SHOTS)) * 100}%, rgba(255,255,255,0.12) ${((targetShots - MIN_SHOTS) / (MAX_SHOTS - MIN_SHOTS)) * 100}%); }
                    .eps-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #FF8A1F; border: 2px solid #0C0D13; box-shadow: 0 0 6px rgba(255,138,31,0.5); cursor: pointer; }
                  `}</style>
                  <input type="range" min={MIN_SHOTS} max={MAX_SHOTS} step={1} value={targetShots} onChange={e => setTargetShots(Number(e.target.value))} className="eps-slider" />
                </div>
                <div style={{ fontSize: 10, color: "#6F7480", fontVariantNumeric: "tabular-nums" }}>
                  可选范围 {MIN_SHOTS} – {MAX_SHOTS} 个分镜
                </div>
              </div>

              <div style={{ width: 1, height: 38, background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

              {/* 生成模型 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: "#6F7480", fontWeight: 600, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>生成模型</span>
                <select value={model} onChange={e => setModel(e.target.value)} style={selectStyle}>
                  <option value="fast">Fast · 18.55★/镜</option>
                  <option value="pro">Pro · 45.00★/镜</option>
                </select>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ flexShrink: 0 }}>
            <button className="studio-create-submit"
              disabled={!ready}
              onClick={() => { onStart?.(); navigate("team-assets"); }}
              style={{
                width: "100%", height: 44, borderRadius: 11, fontSize: 14, fontWeight: 700,
                color: ready ? "black" : "#A4A8B3",
                border: "none", cursor: ready ? "pointer" : "not-allowed", transition: "all .2s",
                background: ready ? "linear-gradient(135deg,#FF8A1F,#FF6A1A)" : "rgba(255,255,255,0.07)",
                boxShadow: ready ? "0 4px 20px rgba(255,138,31,0.32)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              <Sparkles style={{ width: 14, height: 14 }} />
              开始拆分
              {ready && (
                <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 600,
                  background: "rgba(0,0,0,0.18)", borderRadius: 6, padding: "2px 8px", marginLeft: 4 }}>
                  <Flame style={{ width: 11, height: 11 }} />{estStars} 星石
                </span>
              )}
            </button>
            {!ready && (
              <p style={{ fontSize: 11, color: "#6F7480", textAlign: "center", marginTop: 6, marginBottom: 0 }}>
                {!name ? "请先填写剧目名称" : "请上传文件后继续"}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
