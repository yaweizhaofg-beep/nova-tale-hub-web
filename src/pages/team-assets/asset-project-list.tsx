import layout from "./asset-layout.module.css";
import { ChevronRight, Plus, Film, Shield, Check } from "lucide-react";
import { gold, bdr, dim, card, green } from "./presentation";
import { TEAM_MEMBERS } from "@/features/assets/asset-mock";
import type { AssetProject } from "@/features/assets/asset-mock";

interface Props {
  projects: AssetProject[];
  permOpen: string | null;
  setPermOpen: (projectId: string | null) => void;
  getProjVisible: (projectId: string) => ReadonlySet<string>;
  toggleMember: (projectId: string, memberId: string) => void;
  onOpenProject: (projectId: string) => void;
  onCreate: () => void;
}

export function AssetProjectList({ projects, permOpen, setPermOpen, getProjVisible, toggleMember, onOpenProject, onCreate }: Props) {
  return (
    <div className={"studio-asset-page " + layout.projectList} >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "white", marginBottom: 4 }}>团队资产</h1>
          <p style={{ fontSize: 13, color: dim }}>管理团队共享资产：角色、场景、道具（共三类，独立团队钱包）</p>
        </div>
        <button
          onClick={onCreate}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
            backdropFilter: "blur(12px)", color: "rgba(255,255,255,.85)", cursor: "pointer" }}>
          <Plus style={{ width: 14, height: 14 }} />新建资产
        </button>
      </div>

      <div className={layout.projectGrid}>
        {projects.map(proj => {
          const visible = getProjVisible(proj.id);
          const pOpen  = permOpen === proj.id;
          return (
            <div key={proj.id}
              style={{ aspectRatio: "3/4", position: "relative", borderRadius: 18, overflow: "hidden",
                cursor: "pointer", border: `1px solid ${pOpen ? "rgba(255,255,255,.2)" : bdr}`,
                background: card, transition: "border-color .15s,transform .2s", display: "flex", flexDirection: "column" }}
              onMouseEnter={e => { ((e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"); ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.18)"); }}
              onMouseLeave={e => { ((e.currentTarget as HTMLElement).style.transform = "translateY(0)"); ((e.currentTarget as HTMLElement).style.borderColor = pOpen ? "rgba(255,255,255,.2)" : bdr); }}>

              {/* Preview area */}
              <div onClick={() => { onOpenProject(proj.id); }}
                style={{ flex: 1, position: "relative",
                  background: `radial-gradient(ellipse at 30% 25%, ${proj.color}2e 0%, transparent 60%), radial-gradient(ellipse at 75% 75%, ${proj.color}1a 0%, transparent 55%), ${card}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16,
                  background: `${proj.color}1c`, border: `1px solid ${proj.color}38`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 28px ${proj.color}1a` }}>
                  <Film style={{ width: 24, height: 24, color: proj.color }} />
                </div>
                <div style={{ textAlign: "center", padding: "0 14px" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 6 }}>{proj.name}</div>
                  <div style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, display: "inline-block",
                    background: `${proj.color}16`, border: `1px solid ${proj.color}32`, color: proj.color }}>
                    {proj.genre}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div onClick={() => { onOpenProject(proj.id); }}
                style={{ padding: "11px 13px 12px",
                  background: "rgba(0,0,0,.32)", backdropFilter: "blur(12px)",
                  borderTop: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
                  {[
                    { l: "角色", v: proj.chars },
                    { l: "场景", v: proj.scenes },
                    { l: "道具", v: proj.props },
                  ].map(s => (
                    <div key={s.l} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>{s.v}</div>
                      <div style={{ fontSize: 9.5, color: dim }}>{s.l}</div>
                    </div>
                  ))}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 1, color: proj.audioReady ? green : "rgba(255,255,255,.22)" }}>
                      {proj.audioReady ? "✓" : "—"}
                    </div>
                    <div style={{ fontSize: 9.5, color: dim }}>声音</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <button onClick={e => { e.stopPropagation(); setPermOpen(pOpen ? null : proj.id); }}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      padding: "7px 0", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: pOpen ? "rgba(255,138,31,.18)" : "rgba(255,255,255,.07)",
                      border: `1px solid ${pOpen ? "rgba(255,138,31,.45)" : "rgba(255,255,255,.13)"}`,
                      color: pOpen ? gold : "rgba(255,255,255,.65)", transition: "all .15s" }}
                    onMouseEnter={e => { if (!pOpen) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.12)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.9)"; } }}
                    onMouseLeave={e => { if (!pOpen) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.07)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.65)"; } }}>
                    <Shield style={{ width: 11, height: 11 }} />访问权限
                  </button>
                  <button onClick={e => { e.stopPropagation(); onOpenProject(proj.id); }}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      padding: "7px 0", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: `${proj.color}14`, border: `1px solid ${proj.color}35`, color: proj.color,
                      transition: "all .15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${proj.color}26`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${proj.color}14`; }}>
                    进入资产 <ChevronRight style={{ width: 11, height: 11 }} />
                  </button>
                </div>
              </div>

              {/* Permission overlay */}
              {pOpen && (
                <div onClick={e => e.stopPropagation()}
                  style={{ position: "absolute", inset: 0, zIndex: 10,
                    background: "rgba(9,10,15,0.92)", backdropFilter: "blur(18px)",
                    padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.85)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Shield style={{ width: 12, height: 12, color: gold }} />访问权限
                    </span>
                    <button onClick={() => setPermOpen(null)}
                      style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
                        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,.5)", fontSize: 16, lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: dim, marginBottom: 2 }}>
                    {visible.size} / {TEAM_MEMBERS.length} 成员可见
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, overflowY: "auto" }}>
                    {TEAM_MEMBERS.map(m => {
                      const on = visible.has(m.id);
                      return (
                        <button key={m.id} onClick={() => toggleMember(proj.id, m.id)}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 9, cursor: "pointer",
                            background: on ? "rgba(255,138,31,.12)" : "rgba(255,255,255,.04)",
                            border: `1px solid ${on ? "rgba(255,138,31,.3)" : "rgba(255,255,255,.08)"}` }}>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 9, fontWeight: 700, background: on ? `${gold}22` : "rgba(255,255,255,.08)", color: on ? gold : "rgba(255,255,255,.4)" }}>
                            {m.avatar}
                          </div>
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: on ? "white" : "rgba(255,255,255,.55)" }}>{m.name}</div>
                            <div style={{ fontSize: 10, color: dim }}>{m.role}</div>
                          </div>
                          {on && <Check style={{ width: 10, height: 10, color: gold, flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
