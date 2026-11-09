import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from "@/components/ui";
import { useState } from "react";
import { ChevronRight, ChevronDown, Plus, Film, PenLine, Download } from "lucide-react";
import ProjectCover from "@/components/ProjectCover";
import { USER } from "@/shared";
import { PROJECT } from "@/shared";
import { useCanvasStore } from "@/features/canvas/canvas-store";
import type { Nav as NavType, PageId } from "@/router/page-location";
const gold = "#FF8A1F";

export function WorkspacePage({ navigate, onSpacePick, currentSpace }: NavType & { onSpacePick: (dest?: PageId) => void; currentSpace: "personal" | "team" }) {
  const [newOpen, setNewOpen] = useState(false);
  const [ccTab, setCcTab] = useState<"all" | "project" | "canvas">("all");

  const CANVASES = useCanvasStore(state => state.canvases[currentSpace]);
  const PROJECT_STORAGE_DAYS = 5;

  const showProject = ccTab === "all" || ccTab === "project";
  const showCanvas  = ccTab === "all" || ccTab === "canvas";

  const storageTier = (days: number) =>
    days <= 7  ? { color: "#F87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.25)",  label: `${days}天后清除`, urgent: true  } :
    days <= 14 ? { color: "#F59E0B", bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.25)",   label: `${days}天后清除`, urgent: false } :
                 { color: "#6F7480", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", label: `${days}天后清除`, urgent: false };

  return (
    <div className="studio-workspace" style={{ padding: "24px 28px", width: "100%", boxSizing: "border-box" }}>
      {/* Welcome + CTA */}
      <div className="studio-welcome" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F4F5F7", letterSpacing: "-0.03em", margin: 0, lineHeight: 1.15 }}>
          早上好，{USER.name}
        </h1>
        {currentSpace === "personal" && <button className="glass-btn" onClick={() => navigate("my-tasks")}
          style={{ marginLeft: "auto", marginRight: 12, padding: "8px 16px", borderRadius: 10, color: "#F4F5F7", cursor: "pointer" }}>
          我的任务
        </button>}
        <DropdownMenu open={newOpen} onOpenChange={setNewOpen}>
          <DropdownTrigger asChild><button type="button" className="glass-btn"
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#F4F5F7", border: "none", cursor: "pointer" }}>
            <Plus style={{ width: 13, height: 13, color: "rgba(255,255,255,0.65)" } as React.CSSProperties} />
            开始创作
            <ChevronDown style={{ width: 11, height: 11, color: "rgba(255,255,255,0.4)", transition: "transform .15s", transform: newOpen ? "rotate(180deg)" : "rotate(0deg)" } as React.CSSProperties} />
          </button></DropdownTrigger>
          <DropdownContent className="studio-workspace-menu" aria-label="开始创作" sideOffset={8} style={{ background: "#181B24", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.65)", padding: "6px 0", minWidth: 220 }}>
              {[
                { label: "剧目创作", sub: "剧本 → 分集 → 资产 → 分镜", icon: Film,    color: gold,      action: () => onSpacePick("new-project") },
                { label: "无限画布", sub: "节点编排 · 自由创作",         icon: PenLine, color: "#A78BFA", action: () => navigate("canvas") },
              ].map(opt => (
                <DropdownItem asChild key={opt.label} onSelect={opt.action}>
                  <button type="button" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "none", cursor: "pointer", textAlign: "left", transition: "background .15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `${opt.color}14`, border: `1px solid ${opt.color}22`, flexShrink: 0 }}>
                    <opt.icon style={{ width: 13, height: 13, color: opt.color } as React.CSSProperties} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#F4F5F7" }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "#6F7480", marginTop: 1 }}>{opt.sub}</div>
                  </div>
                </button>
                </DropdownItem>
              ))}
          </DropdownContent>
        </DropdownMenu>
      </div>

      {/* Stats strip */}
      <div className="studio-workspace-stats" style={{ display: "flex", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "14px 0", marginBottom: 28, gap: 0, flexWrap: "nowrap" }}>
        {([
          { value: "148",   unit: "条", label: "本月视频", color: "#FF8A1F" },
          { value: "3,241", unit: "颗", label: "星石消耗", color: "#FFB84D" },
          { value: "12",    unit: "个", label: "剧目总数", color: "#34D399" },
        ] as const).map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {i > 0 && <div style={{ width: 1, height: 26, background: "rgba(255,255,255,0.07)", flexShrink: 0, margin: "0 20px" }} />}
            <div style={{ whiteSpace: "nowrap" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 1 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{s.value}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{s.unit}</span>
                <span style={{ fontSize: 10, color: "#6F7480", marginLeft: 2 }}>{s.label}</span>
              </div>
            </div>
          </div>
        ))}
        <div style={{ flex: 1 }} />
      </div>

      {/* Continue creating header */}
      <div className="studio-continue-heading" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#6F7480", textTransform: "uppercase", letterSpacing: "0.09em" }}>继续创作</span>
          <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "2px" }}>
            {([["all", "全部"], ["project", "剧目"], ["canvas", "画布"]] as const).map(([id, label]) => (
              <button key={id} aria-pressed={ccTab === id} onClick={() => setCcTab(id)}
                style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, border: "none", cursor: "pointer", transition: "all .15s",
                  background: ccTab === id ? "rgba(255,138,31,0.15)" : "transparent",
                  color: ccTab === id ? gold : "rgba(255,255,255,0.4)", fontWeight: ccTab === id ? 500 : 400 }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => navigate("projects", { kind: ccTab === "canvas" ? "canvas" : null })}
          style={{ fontSize: 11.5, color: gold, display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", opacity: 0.7 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}>
          {ccTab === "canvas" ? "全部画布" : "全部剧目"}<ChevronRight style={{ width: 11, height: 11 } as React.CSSProperties} />
        </button>
      </div>

      {/* 3:4 Card grid */}
      <div className="studio-project-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>

        {showProject && (() => {
          const tier = storageTier(PROJECT_STORAGE_DAYS);
          return (
            <div className="studio-project-card"
              style={{ borderRadius: 12, overflow: "hidden",
                background: "#13151C",
                border: tier.urgent ? "1px solid rgba(248,113,113,0.22)" : "1px solid rgba(255,255,255,0.07)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.35)", transition: "transform .2s, box-shadow .2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(0,0,0,0.5)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.35)"; }}>
              <div style={{ width: "100%", aspectRatio: "3/4", background: "linear-gradient(160deg,#1A1108 0%,#120C04 40%,#0D0A06 100%)", position: "relative", overflow: "hidden" }}>
                <ProjectCover name={PROJECT.name} />
                <strong style={{ position: "absolute", bottom: 18, left: 16, right: 16, color: "#F4F5F7", fontSize: 22 }}>{PROJECT.name}</strong>
                <div style={{ position: "absolute", top: 9, right: 9 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 20, background: "rgba(96,165,250,0.15)", color: "#60A5FA", border: "1px solid rgba(96,165,250,0.25)", backdropFilter: "blur(4px)" }}>生成中</span>
                </div>
                {tier.urgent && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 48, background: "linear-gradient(to top, rgba(248,113,113,0.15), transparent)", pointerEvents: "none" }} />
                )}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.07)" }}>
                  <div style={{ height: "100%", background: gold, width: `${(PROJECT.storyboards.done / PROJECT.storyboards.total) * 100}%` }} />
                </div>
              </div>
              <div style={{ padding: "12px 14px 13px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F4F5F7", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{PROJECT.chapter}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#6F7480", whiteSpace: "nowrap" }}>{PROJECT.storyboards.done}/{PROJECT.storyboards.total} 镜</span>
                  <button onClick={e => e.stopPropagation()} title="立即导出，防止丢失"
                    style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 20, cursor: "pointer",
                      background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color,
                      fontWeight: tier.urgent ? 700 : 400, transition: "all .15s", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {tier.urgent && <Download style={{ width: 9, height: 9, flexShrink: 0 } as React.CSSProperties} />}
                    {tier.label}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {showCanvas && CANVASES.map(cv => {
          const tier = storageTier(cv.storageDays);
          return (
            <div key={cv.id} onClick={() => navigate("canvas", { canvas: cv.id })}
              style={{ borderRadius: 12, overflow: "hidden", cursor: "pointer",
                background: "#13151C",
                border: tier.urgent ? "1px solid rgba(248,113,113,0.22)" : "1px solid rgba(255,255,255,0.07)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.35)", transition: "transform .2s, box-shadow .2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(0,0,0,0.5)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.35)"; }}>
              <div style={{ width: "100%", aspectRatio: "3/4", background: "linear-gradient(160deg,#0E0A14 0%,#090610 40%,#07050D 100%)", position: "relative", overflow: "hidden" }}>
                <ProjectCover name={cv.name} />
                <div style={{ position: "absolute", top: 9, right: 9 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 20, background: "rgba(167,139,250,0.12)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.22)", backdropFilter: "blur(4px)" }}>画布</span>
                </div>
                {tier.urgent && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 48, background: "linear-gradient(to top, rgba(248,113,113,0.15), transparent)", pointerEvents: "none" }} />
                )}
              </div>
              <div style={{ padding: "12px 14px 13px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F4F5F7", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cv.name}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#6F7480", whiteSpace: "nowrap" }}>{cv.nodes} 节点 · {cv.updated}</span>
                  <button onClick={e => e.stopPropagation()} title="立即导出"
                    style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 20, cursor: "pointer",
                      background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color,
                      fontWeight: tier.urgent ? 700 : 400, transition: "all .15s", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {tier.urgent && <Download style={{ width: 9, height: 9, flexShrink: 0 } as React.CSSProperties} />}
                    {tier.label}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
