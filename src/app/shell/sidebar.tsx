import { Package, CreditCard, Home, Users, Bell, HelpCircle, Wrench } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import SpaceMedallion from "@/components/SpaceMedallion";
import { USER } from "@/shared";
import type { PageId } from "@/router/page-location";

const SIDEBAR_NAV: { id: PageId | null; label: string; icon: typeof Home }[] = [
  { id: "workspace",     label: "创作", icon: Home       },
  { id: "team-assets",   label: "资产", icon: Package    },
  { id: "tools",         label: "工具", icon: Wrench     },
  { id: "billing",       label: "账单", icon: CreditCard },
  { id: "team",          label: "团队", icon: Users      },
];


export function Sidebar({ currentPage, currentSpace, onNavigate, onSpacePick, onNotifToggle, onHelpToggle, unread, serviceOpen }: {
  currentPage: PageId;
  currentSpace: "personal" | "team";
  onNavigate: (p: PageId) => void;
  onSpacePick: () => void;
  onNotifToggle: () => void;
  onHelpToggle: () => void;
  unread: number;
  serviceOpen: boolean;
}) {
  return (
    <aside className="studio-sidebar" style={{
      width: 68, flexShrink: 0,
      display: "flex", flexDirection: "column", alignItems: "center",
      background: "#0E0F14",
      borderRight: "1px solid rgba(255,255,255,0.05)",
      position: "relative",
    }}>
      {/* Logo */}
      <button onClick={() => onNavigate("landing")} title="返回首页"
        style={{ width: "100%", display: "flex", justifyContent: "center", padding: "18px 0 14px", background: "none", border: "none", cursor: "pointer" }}
        onMouseEnter={e => { (e.currentTarget.firstElementChild as HTMLElement).style.opacity = "0.8"; }}
        onMouseLeave={e => { (e.currentTarget.firstElementChild as HTMLElement).style.opacity = "1"; }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "#FF8A1F", transition: "opacity .15s" }}>
          <BrandLogo size={32}/>
        </div>
      </button>

      {/* Space switcher */}
      <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: 6 }}>
        <button className={`studio-space-medallion studio-space-${currentSpace}`} onClick={onSpacePick}
          title={currentSpace === "team" ? `团队空间：${USER.team}` : "个人空间"}
          style={{
            width: 40, height: 40, borderRadius: 11, border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
            background: currentSpace === "team" ? "rgba(139,92,246,.15)" : "rgba(96,165,250,.12)",
            transition: "background .15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = currentSpace === "team" ? "rgba(139,92,246,.25)" : "rgba(96,165,250,.22)")}
          onMouseLeave={e => (e.currentTarget.style.background = currentSpace === "team" ? "rgba(139,92,246,.15)" : "rgba(96,165,250,.12)")}>
          <SpaceMedallion space={currentSpace} size={46}/>
          <span style={{ fontSize: 8, fontWeight: 700, color: currentSpace === "team" ? "#a78bfa" : "#60a5fa", letterSpacing: "0.02em" }}>
            {currentSpace === "team" ? "团队" : "个人"}
          </span>
        </button>
      </div>

      <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 8 }} />

      {/* Nav */}
      <nav style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "0 8px", overflowY: "auto" }}>
        {SIDEBAR_NAV.filter(entry => currentSpace === "team" || entry.id !== "team").map(entry => {
          const item = entry.id === "my-tasks" && currentSpace === "team" ? { ...entry, id: "team-tasks" as const } : entry;
          const active = !!(item.id && (currentPage === item.id || (item.id === "team" && currentPage === "team-tasks")));
          const clickable = !!item.id;
          return (
            <button className="studio-nav-item" aria-current={active ? "page" : undefined} data-nav={item.id} key={item.label} onClick={() => item.id && onNavigate(item.id as PageId)} title={item.label}
              style={{
                width: "100%", display: "flex", flexDirection: "column", alignItems: "center",
                gap: 4, padding: "9px 0", borderRadius: 8,
                border: "none", cursor: clickable ? "pointer" : "default",
                transition: "background .15s",
                background: active ? "rgba(255,138,31,0.10)" : "transparent",
                position: "relative",
                opacity: clickable ? 1 : 0.35,
              }}              onMouseEnter={e => { if (!active && clickable) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = active ? "rgba(255,138,31,0.10)" : "transparent"; }}>
              {active && (
                <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 2, height: 20, background: "#FF8A1F", borderRadius: "0 2px 2px 0" }} />
              )}
              <item.icon style={{
                width: 17, height: 17,
                strokeWidth: active ? 2 : 1.5,
                color: active ? "#FF8A1F" : "rgba(255,255,255,0.28)",
                transition: "color .15s",
              } as React.CSSProperties} />
              <span style={{
                fontSize: 10, lineHeight: 1,
                fontWeight: active ? 600 : 400,
                color: active ? "#F4F5F7" : "rgba(255,255,255,0.35)",
                letterSpacing: "0.01em",
                transition: "color .15s",
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom — 消息/帮助/头像 */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "8px 8px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>

        {/* Bell / 消息 */}
        <button title="消息通知" onClick={onNotifToggle}
          style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 0", borderRadius: 8, background: serviceOpen ? "none" : "transparent", border: serviceOpen ? "1px solid transparent" : "1px solid transparent", cursor: "pointer", position: "relative" }}>
          <div style={{ position: "relative" }}>
            <Bell style={{ width: 15, height: 15, color: "rgba(255,255,255,0.28)", strokeWidth: 1.5 } as React.CSSProperties} />
            {unread > 0 && (
              <span style={{ position: "absolute", top: -3, right: -4, minWidth: 14, height: 14, borderRadius: 7, background: "#EF4444", border: "1.5px solid #0E0F14", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "white", padding: "0 2px" }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", lineHeight: 1 }}>消息</span>
        </button>

        {/* Help */}
        <button id="help-trigger" title="帮助中心" onClick={onHelpToggle}
          style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 0", borderRadius: 8, background: "none", border: "1px solid transparent", cursor: "pointer", transition: "background .15s" }}>
          <HelpCircle style={{ width: 15, height: 15, color: "rgba(255,255,255,0.2)", strokeWidth: 1.5 } as React.CSSProperties} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", lineHeight: 1 }}>帮助</span>
        </button>

        {/* Avatar */}
        <button onClick={() => onNavigate("user-center")} title={USER.name}
          style={{ width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,138,31,0.12)", color: "#FF8A1F", fontSize: 11, fontWeight: 700, marginTop: 4, transition: "background .15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,138,31,0.22)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,138,31,0.12)")}>
          {USER.avatar}
        </button>
      </div>
    </aside>
  );
}
