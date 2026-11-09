import { useState } from "react";
import { ChevronLeft, Plus, Search, MoreHorizontal } from "lucide-react";
import ProjectCover from "@/components/ProjectCover";
import type { Nav as NavType, PageId } from "@/router/page-location";
const gold = "#FF8A1F";

export function ProjectListPage({ navigate, onSpacePick }: NavType & { onSpacePick: (dest?: PageId) => void }) {
  const [q, setQ] = useState("");
  const projects = [
    { name: "《镜像》", genre: "都市情感", ep: "第03集《回声》", done: 12, running: 3, queued: 4, failed: 1, total: 20, updated: "今天 10:48", status: "active" },
    { name: "《星坠》", genre: "科幻冒险", ep: "第06集《归零》", done: 18, running: 0, queued: 0, failed: 0, total: 18, updated: "昨天 16:22", status: "done"   },
    { name: "《归途》", genre: "悬疑推理", ep: "第01集《迷雾》", done:  0, running: 0, queued: 0, failed: 0, total: 24, updated: "07-25",    status: "draft"  },
  ].filter(p => p.name.includes(q) || p.genre.includes(q));
  const sb: Record<string, { label: string; cs: string; cb: string }> = {
    active: { label: "生成中", cs: "#60a5fa", cb: "rgba(59,130,246,.15)" },
    done:   { label: "已完成", cs: "#34d399", cb: "rgba(52,211,153,.12)" },
    draft:  { label: "草稿",   cs: "rgba(255,255,255,0.45)", cb: "rgba(255,255,255,0.04)" },
  };

  return (
    <div className="studio-project-list" style={{ padding: "24px 28px", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate("workspace")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 13, padding: 0 }}>
            <ChevronLeft style={{ width: 14, height: 14 } as React.CSSProperties} />工作台
          </button>
          <span style={{ fontSize: 13, color: "#6F7480" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#F4F5F7" }}>全部剧目</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>共 {projects.length} 个</span>
        </div>
        <button onClick={() => onSpacePick("new-project")} className="orange-btn" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: "black", border: "none" }}>
          <Plus style={{ width: 14, height: 14 } as React.CSSProperties} />新建剧目
        </button>
      </div>
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 360 }}>
        <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "rgba(255,255,255,0.4)" } as React.CSSProperties} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索剧目"
          style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, padding: "8px 10px 8px 32px", fontSize: 12, color: "white", outline: "none", boxSizing: "border-box" } as React.CSSProperties} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {projects.map(p => {
          const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
          const s = sb[p.status];
          return (
            <div className="studio-project-row" key={p.name}
              style={{ background: "#13151C", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "14px 18px", transition: "border-color .15s, background .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,138,31,0.2)"; e.currentTarget.style.background = "#181B24"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; e.currentTarget.style.background = "#13151C"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 60, borderRadius: 6, position: "relative", overflow: "hidden", flexShrink: 0 }}>
                  <ProjectCover name={p.name} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#F4F5F7" }}>{p.name}</span>
                    <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, background: s.cb, color: s.cs, border: `1px solid ${s.cb}` }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{p.genre} · {p.ep}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[
                      { v: p.done,    c: "#34D399" },
                      { v: p.running, c: "#60A5FA" },
                      { v: p.queued,  c: "rgba(255,255,255,0.4)" },
                      { v: p.failed,  c: "#F87171" },
                    ].filter(x => x.v > 0).map((x, i) => (
                      <span key={i} style={{ fontSize: 12, color: x.c, fontVariantNumeric: "tabular-nums" }}>{x.v}</span>
                    ))}
                  </div>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                  <span style={{ fontSize: 11, color: "#6F7480" }}>{p.updated}</span>
                  <button style={{ padding: 4, borderRadius: 6, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }} onClick={e => e.stopPropagation()}>
                    <MoreHorizontal style={{ width: 14, height: 14 } as React.CSSProperties} />
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 10, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: p.status === "done" ? "#34D399" : gold, borderRadius: 2, transition: "width .3s" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
