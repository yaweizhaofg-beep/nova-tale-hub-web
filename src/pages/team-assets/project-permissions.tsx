import { ChevronDown, Shield, Check } from "lucide-react";
import { gold, bdr, dim, card } from "./presentation";
import { TEAM_MEMBERS } from "@/features/assets/asset-mock";

interface Props {
  expanded: boolean;
  visible: ReadonlySet<string>;
  onToggle: () => void;
  onMemberToggle: (id: string) => void;
}

export function ProjectPermissions({ expanded, visible, onToggle, onMemberToggle }: Props) {
  return (
    <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
          <button onClick={onToggle}
            aria-expanded={expanded}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shield style={{ width: 14, height: 14, color: gold }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.8)" }}>访问权限管理</span>
              <span style={{ fontSize: 11, color: dim, marginLeft: 4 }}>仅管理员可配置</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: dim }}>{visible.size} / {TEAM_MEMBERS.length} 成员可见</span>
              <ChevronDown style={{ width: 13, height: 13, color: dim, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .15s" }} />
            </div>
          </button>
          {expanded && (
            <div style={{ borderTop: `1px solid ${bdr}`, padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 10 }}>
              {TEAM_MEMBERS.map(m => {
                const on = visible.has(m.id);
                return (
                  <button key={m.id} onClick={() => onMemberToggle(m.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 10, cursor: "pointer", transition: "all .15s",
                      background: on ? "rgba(255,138,31,.1)" : "rgba(255,255,255,.04)",
                      border: `1px solid ${on ? "rgba(255,138,31,.3)" : "rgba(255,255,255,.1)"}` }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, background: on ? `${gold}22` : "rgba(255,255,255,.1)", color: on ? gold : "rgba(255,255,255,.5)" }}>
                      {m.avatar}
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: on ? "white" : "rgba(255,255,255,.55)" }}>{m.name}</div>
                      <div style={{ fontSize: 10.5, color: dim }}>{m.role}</div>
                    </div>
                    {on && <Check style={{ width: 12, height: 12, color: gold, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
  );
}
