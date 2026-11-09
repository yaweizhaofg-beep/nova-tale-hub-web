// ═══════════════════════════════════════════════════════════════════════════════════
// App.tsx - 星核耀火桌面应用
// 对齐 Figma Make 源码（App.tsx + AppLayout.tsx + WorkspacePage + ProjectListPage）
// 重写 Sidebar / Header / WorkspacePage / ProjectsPage / TeamAssetsPage 等
// ═══════════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from "react";
import {
  ChevronRight, ChevronDown, ChevronLeft,
  Plus, Film, PenLine, Package, CreditCard, Search, MoreHorizontal,
  Home, Users, User, Bell, Headphones, MessageSquare, BookOpen, FileText,
  Sparkles, Star, Zap, HelpCircle, Download, Wrench, Scissors,
} from "lucide-react";

import BrandLogo from "./components/BrandLogo";
import SpaceMedallion from "./components/SpaceMedallion";
import { guardGuestSearch } from "./auth";
import "./styles/studio.css";

// Import pages
import LandingPage from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { RegisterPage } from "./pages/RegisterPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { NewProjectPage } from "./pages/NewProjectPage";
import UserCenterPage from "./pages/UserCenterPage";
import CanvasPage from "./pages/CanvasPage";
import CanvasListPage from "./pages/CanvasListPage";
import { getCanvases } from "./canvases";
import SupportWidget from "./components/SupportWidget";
import ProjectCover from "./components/ProjectCover";
import CostConfirmPage from "./pages/CostConfirmPage";
import TeamPage from "./pages/TeamPage";
import BatchPage from "./pages/BatchPage";
import ResultPage from "./pages/ResultPage";
import DeliveryPage from "./pages/DeliveryPage";
import UpgradePage from "./pages/UpgradePage";
import TeamAssetsPage from "./pages/TeamAssetsPage";
import BillingPage from "./pages/BillingPage";
import MembershipPage from "./pages/MembershipPage";
import TaskNotifications, { notificationTasks } from "./components/TaskNotifications";
import TaskRecordsPage from "./pages/TaskRecordsPage";
import { USER, PROJECT } from "./shared";
import { getWallet, subscribeWallet } from "./billing";
import type { Nav as NavType, PageId } from "./shared";

// ─── Sidebar Nav (Make AppLayout SIDEBAR_NAV) ────────────────────────────────
const SIDEBAR_NAV: { id: PageId | null; label: string; icon: typeof Home }[] = [
  { id: "workspace",     label: "创作", icon: Home       },
  { id: "team-assets",   label: "资产", icon: Package    },
  { id: "tools",         label: "工具", icon: Wrench     },
  { id: "billing",       label: "账单", icon: CreditCard },
  { id: "team",          label: "团队", icon: Users      },
];

const gold = "#FF8A1F";

// ─── QR Modal (客服微信二维码 — Make) ──────────────────────────────────────────
function QRModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#13151C", border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, padding: "28px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, boxShadow: "0 32px 80px rgba(0,0,0,.7)", minWidth: 240 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#F4F5F7", marginBottom: 4 }}>专属客服</div>
          <div style={{ fontSize: 12, color: "#6F7480" }}>扫码添加微信，7×12小时在线</div>
        </div>
        <svg width="148" height="148" viewBox="0 0 148 148" style={{ display: "block", borderRadius: 10 }}>
          <rect width="148" height="148" fill="#ffffff" rx="8" />
          <rect x="10" y="10" width="42" height="42" fill="#111" rx="4" />
          <rect x="16" y="16" width="30" height="30" fill="#fff" rx="2" />
          <rect x="22" y="22" width="18" height="18" fill="#111" rx="1" />
          <rect x="96" y="10" width="42" height="42" fill="#111" rx="4" />
          <rect x="102" y="16" width="30" height="30" fill="#fff" rx="2" />
          <rect x="108" y="22" width="18" height="18" fill="#111" rx="1" />
          <rect x="10" y="96" width="42" height="42" fill="#111" rx="4" />
          <rect x="16" y="102" width="30" height="30" fill="#fff" rx="2" />
          <rect x="22" y="108" width="18" height="18" fill="#111" rx="1" />
          {[
            [60,10],[66,10],[72,10],[78,10],[84,10],[90,10],
            [60,16],[72,16],[84,16],
            [60,22],[66,22],[78,22],[90,22],
            [60,28],[72,28],[84,28],
            [60,34],[66,34],[72,34],[78,34],[84,34],[90,34],
            [10,60],[16,60],[22,60],[28,60],[34,60],[40,60],[46,60],[52,60],
            [10,66],[22,66],[34,66],[52,66],
            [10,72],[28,72],[46,72],[52,72],
            [10,78],[16,78],[22,78],[40,78],[52,78],
            [10,84],[34,84],[40,84],[52,84],
            [10,90],[16,90],[22,90],[28,90],[34,90],[40,90],[46,90],[52,90],
            [60,60],[72,60],[78,60],[90,60],[96,60],[102,60],[108,60],[120,60],[132,60],
            [60,66],[72,66],[84,66],[96,66],[108,66],[120,66],[132,66],
            [60,72],[66,72],[78,72],[90,72],[102,72],[114,72],[126,72],[132,72],
            [60,78],[72,78],[84,78],[96,78],[108,78],[120,78],
            [60,84],[66,84],[78,84],[90,84],[96,84],[102,84],[108,84],[114,84],[120,84],[132,84],
            [60,90],[72,90],[84,90],[96,90],[120,90],[132,90],
            [60,96],[66,96],[72,96],[78,96],[90,96],[96,96],[108,96],[120,96],
            [66,102],[78,102],[84,102],[90,102],[96,102],[108,102],[114,102],[132,102],
            [60,108],[66,108],[78,108],[84,108],[102,108],[108,108],[114,108],[120,108],[132,108],
            [60,114],[72,114],[84,114],[90,114],[96,114],[102,114],[114,114],[126,114],[132,114],
            [60,120],[66,120],[78,120],[90,120],[96,120],[108,120],[120,120],
            [66,126],[72,126],[78,126],[84,126],[96,126],[108,126],[114,126],[120,126],[132,126],
            [60,132],[66,132],[84,132],[90,132],[102,132],[114,132],[126,132],[132,132],
          ].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="5" height="5" fill="#111" rx="0.5" />
          ))}
        </svg>
        <div style={{ fontSize: 11, color: "#6F7480", textAlign: "center", lineHeight: 1.6 }}>
          工作日 9:00–21:00<br />节假日 10:00–18:00
        </div>
        <button onClick={onClose} style={{ padding: "7px 28px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)", color: "#A4A8B3", fontSize: 12, cursor: "pointer" }}>
          关闭
        </button>
      </div>
    </div>
  );
}

// ─── Space Picker Modal (Make 工作空间切换) ──────────────────────────────────
function SpacePickerModal({ currentSpace, onConfirm, onClose }: {
  currentSpace: "personal" | "team";
  onConfirm: (s: "personal" | "team") => void;
  onClose: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.72)", backdropFilter: "blur(12px)" }}
      onClick={onClose}>
      <div className="studio-space-dialog" role="dialog" aria-label="切换工作空间" onClick={e => e.stopPropagation()}
        style={{ width: 480, background: "#13141B", borderRadius: 24, border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 32px 80px rgba(0,0,0,.8)", overflow: "hidden" }}>
        <div style={{ padding: "28px 32px 0", textAlign: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FF8A1F", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <BrandLogo size={40}/>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 6 }}>切换工作空间</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.6 }}>
            切换后，后续生成任务和作品<br />归属将随之改变
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, padding: "24px 28px 28px" }}>
          <button className="studio-space-option studio-space-option-personal" aria-pressed={currentSpace === "personal"} onClick={() => onConfirm("personal")}
            style={{ flex: 1, padding: "22px 18px", borderRadius: 16, cursor: "pointer", textAlign: "left",
              border: `2px solid ${currentSpace === "personal" ? "#60a5fa" : "rgba(255,255,255,.08)"}`,
              background: currentSpace === "personal" ? "rgba(96,165,250,.08)" : "rgba(255,255,255,.03)",
              transition: "all .15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
            onMouseEnter={e => { if (currentSpace !== "personal") { e.currentTarget.style.borderColor = "rgba(96,165,250,.4)"; e.currentTarget.style.background = "rgba(96,165,250,.04)"; } }}
            onMouseLeave={e => { if (currentSpace !== "personal") { e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; e.currentTarget.style.background = "rgba(255,255,255,.03)"; } }}>
            <SpaceMedallion space="personal" size={72}/>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "white", marginBottom: 4 }}>个人空间</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", lineHeight: 1.5 }}>{USER.name}<br />{getWallet("personal").rechargeStars.toLocaleString()} 充值积分（个人钱包）</div>
            </div>
            {currentSpace === "personal" && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", background: "rgba(96,165,250,.12)", borderRadius: 100, padding: "3px 10px" }}>当前空间</div>
            )}
          </button>
          <button className="studio-space-option studio-space-option-team" aria-pressed={currentSpace === "team"} onClick={() => onConfirm("team")}
            style={{ flex: 1, padding: "22px 18px", borderRadius: 16, cursor: "pointer", textAlign: "left",
              border: `2px solid ${currentSpace === "team" ? "#a78bfa" : "rgba(255,255,255,.08)"}`,
              background: currentSpace === "team" ? "rgba(139,92,246,.08)" : "rgba(255,255,255,.03)",
              transition: "all .15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
            onMouseEnter={e => { if (currentSpace !== "team") { e.currentTarget.style.borderColor = "rgba(139,92,246,.4)"; e.currentTarget.style.background = "rgba(139,92,246,.04)"; } }}
            onMouseLeave={e => { if (currentSpace !== "team") { e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; e.currentTarget.style.background = "rgba(255,255,255,.03)"; } }}>
            <SpaceMedallion space="team" size={72}/>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "white", marginBottom: 4 }}>{USER.team}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", lineHeight: 1.5 }}>团队空间<br />{getWallet("team").rechargeStars.toLocaleString()} 充值积分（团队钱包）</div>
            </div>
            {currentSpace === "team" && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", background: "rgba(139,92,246,.12)", borderRadius: 100, padding: "3px 10px" }}>当前空间</div>
            )}
          </button>
        </div>
        <div style={{ padding: "0 28px 22px", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,.2)" }}>
          两个空间的余额独立，互不影响 · 点击外部关闭
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar (Make AppLayout — 68px + 空间切换 + 底部消息/帮助/头像) ──────────
function Sidebar({ currentPage, currentSpace, onNavigate, onSpacePick, onNotifToggle, onHelpToggle, unread, serviceOpen }: {
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
        <button title="帮助中心" onClick={onHelpToggle}
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

// ─── Help Popup (Make 帮助中心 popover) ───────────────────────────────────────
function HelpPopup({ onOpenService, onOpenFeedback, onClose }: {
  onOpenService: () => void;
  onOpenFeedback: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 198 }} onClick={onClose} />
      <div style={{ position: "fixed", left: 72, bottom: 60, zIndex: 199, width: 280, background: "#111218", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.8)", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>帮助中心</div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)" }}>遇到问题？我们来帮你</div>
        </div>
        <button onClick={() => { onClose(); onOpenService(); }}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background .12s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Headphones style={{ width: 16, height: 16, color: "#22C55E" } as React.CSSProperties} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.85)" }}>联系客服</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 1 }}>扫码添加专属客服微信</div>
          </div>
          <ChevronRight style={{ width: 14, height: 14, color: "rgba(255,255,255,.2)", marginLeft: "auto" } as React.CSSProperties} />
        </button>
        <div style={{ height: 1, background: "rgba(255,255,255,.05)", margin: "0 14px" }} />
        <button onClick={() => { onClose(); onOpenFeedback(); }}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background .12s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,138,31,.1)", border: "1px solid rgba(255,138,31,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MessageSquare style={{ width: 16, height: 16, color: "rgba(255,138,31,.9)" } as React.CSSProperties} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.85)" }}>提交问题 · 申请反馈</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 1 }}>报告 Bug 或提交功能建议</div>
          </div>
          <ChevronRight style={{ width: 14, height: 14, color: "rgba(255,255,255,.2)", marginLeft: "auto" } as React.CSSProperties} />
        </button>
        <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "10px 0", background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: "rgba(255,255,255,.3)", transition: "color .12s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.3)")}>
            <BookOpen style={{ width: 12, height: 12 } as React.CSSProperties} />使用文档
          </button>
          <div style={{ width: 1, background: "rgba(255,255,255,.06)" }} />
          <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "10px 0", background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: "rgba(255,255,255,.3)", transition: "color .12s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.3)")}>
            <FileText style={{ width: 12, height: 12 } as React.CSSProperties} />更新日志
          </button>
        </div>
      </div>
    </>
  );
}

// ─── App Header (Make 状态条 + 会员积分 + 客服) ───────────────────────────────
function AppHeader({ currentSpace, onSpacePick, onMembership }: {
  currentSpace: "personal" | "team";
  onSpacePick: () => void;
  onMembership: () => void;
}) {
  const [, refreshWallet] = useState(0);
  useEffect(() => subscribeWallet(() => refreshWallet(version => version + 1)), []);
  const { rechargeStars } = getWallet(currentSpace);
  const activeStars = currentSpace === "team" ? USER.teamActiveStars : USER.activeStars;

  return (
    <header className="studio-header" style={{
      height: 60, flexShrink: 0, display: "flex", alignItems: "center",
      padding: "0 20px", gap: 8,
      background: "#090A0E",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      {/* Status strip */}
      <div className="studio-status" style={{
        display: "flex", alignItems: "center", gap: 7, minWidth: 0, overflowX: "auto", scrollbarWidth: "none",
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 8, padding: "0 14px", height: 30,
        whiteSpace: "nowrap",
      }}>
        <button onClick={onSpacePick}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          {currentSpace === "team"
            ? <Users style={{ width: 10, height: 10, color: "#a78bfa", flexShrink: 0 } as React.CSSProperties} />
            : <User  style={{ width: 10, height: 10, color: "#60a5fa", flexShrink: 0 } as React.CSSProperties} />}
          <span style={{ fontSize: 11, fontWeight: 600, color: currentSpace === "team" ? "#a78bfa" : "#60a5fa" }}>
            {currentSpace === "team" ? "团队空间" : "个人空间"}
          </span>
          <ChevronDown style={{ width: 9, height: 9, color: currentSpace === "team" ? "rgba(167,139,250,.6)" : "rgba(96,165,250,.6)" } as React.CSSProperties} />
        </button>
        <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>套餐剩余</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#F4F5F7" }}>{USER.planDaysLeft} 天</span>
        <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
        <Zap style={{ width: 10, height: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0 } as React.CSSProperties} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>并发</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#F4F5F7" }}>
          {USER.concurrent.used}<span style={{ color: "rgba(255,255,255,0.25)", fontWeight: 400 }}>/{USER.concurrent.total}</span>
        </span>
        <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
        <span role="group" aria-label={currentSpace === "team" ? "团队钱包" : "个人钱包"}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, color: "rgba(255,255,255,.58)" }}>
          <Star aria-hidden="true" size={11} color={gold} />
          <span>{currentSpace === "team" ? "团队钱包" : "个人钱包"}</span>
          <span>付费星石 <b style={{ color: gold }}>{rechargeStars.toLocaleString()}</b></span>
          <span>活动星石 <b style={{ color: "#F4F5F7" }}>{activeStars.toLocaleString()}</b></span>
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <button onClick={onMembership} style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 8px", height: 28, background: "none", border: "none", color: "#FF8A1F", fontSize: 11.5, fontWeight: 500, cursor: "pointer", opacity: 0.85, transition: "opacity .15s", flexShrink: 0 }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "0.85")}>
        <Sparkles style={{ width: 11, height: 11 } as React.CSSProperties} />
        会员积分
      </button>
    </header>
  );
}

function ToolsPage() {
  return (
    <section style={{ padding: "24px 28px" }}>
      <h1 style={{ color: "#F4F5F7", fontSize: 22, marginBottom: 24 }}>工具</h1>
      <div style={{ maxWidth: 320, padding: 20, borderRadius: 12, color: "#F4F5F7",
        background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
        <Scissors size={22} color={gold} />
        <strong style={{ display: "block", fontSize: 15, marginTop: 14 }}>视频分割</strong>
        <p style={{ fontSize: 12, opacity: .6, marginTop: 7 }}>按时间拆分视频片段</p>
        <span style={{ display: "inline-block", marginTop: 14, fontSize: 11, opacity: .5 }}>暂未开放</span>
      </div>
    </section>
  );
}

// ─── Workspace Page (Make — 早上好 + 开始创作下拉 + 3-统计 + 继续创作 3-tab + 3:4 卡片) ──
function WorkspacePage({ navigate, onSpacePick, currentSpace }: NavType & { onSpacePick: (dest?: PageId) => void; currentSpace: "personal" | "team" }) {
  const [newOpen, setNewOpen] = useState(false);
  const [ccTab, setCcTab] = useState<"all" | "project" | "canvas">("all");

  const CANVASES = getCanvases(currentSpace);
  const PROJECT_STORAGE_DAYS = 5;

  const showProject = ccTab === "all" || ccTab === "project";
  const showCanvas  = ccTab === "all" || ccTab === "canvas";

  const storageTier = (days: number) =>
    days <= 7  ? { color: "#F87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.25)",  label: `${days}天后清除`, urgent: true  } :
    days <= 14 ? { color: "#F59E0B", bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.25)",   label: `${days}天后清除`, urgent: false } :
                 { color: "#6F7480", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", label: `${days}天后清除`, urgent: false };

  const startNew = (dest: PageId) => { navigate(dest); setNewOpen(false); };

  return (
    <div className="studio-workspace" style={{ padding: "24px 28px", width: "100%", boxSizing: "border-box" }} onClick={() => setNewOpen(false)}>
      {/* Welcome + CTA */}
      <div className="studio-welcome" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F4F5F7", letterSpacing: "-0.03em", margin: 0, lineHeight: 1.15 }}>
          早上好，{USER.name}
        </h1>
        {currentSpace === "personal" && <button className="glass-btn" onClick={() => navigate("my-tasks")}
          style={{ marginLeft: "auto", marginRight: 12, padding: "8px 16px", borderRadius: 10, color: "#F4F5F7", cursor: "pointer" }}>
          我的任务
        </button>}
        <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setNewOpen(o => !o)} className="glass-btn"
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#F4F5F7", border: "none", cursor: "pointer" }}>
            <Plus style={{ width: 13, height: 13, color: "rgba(255,255,255,0.65)" } as React.CSSProperties} />
            开始创作
            <ChevronDown style={{ width: 11, height: 11, color: "rgba(255,255,255,0.4)", transition: "transform .15s", transform: newOpen ? "rotate(180deg)" : "rotate(0deg)" } as React.CSSProperties} />
          </button>
          {newOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 200, background: "#181B24", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.65)", padding: "6px 0", minWidth: 220 }}>
              {[
                { label: "剧目创作", sub: "剧本 → 分集 → 资产 → 分镜", icon: Film,    color: gold,      action: () => { onSpacePick("new-project"); setNewOpen(false); } },
                { label: "无限画布", sub: "节点编排 · 自由创作",         icon: PenLine, color: "#A78BFA", action: () => { startNew("canvas"); } },
              ].map(opt => (
                <button key={opt.label} onClick={opt.action}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background .15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `${opt.color}14`, border: `1px solid ${opt.color}22`, flexShrink: 0 }}>
                    <opt.icon style={{ width: 13, height: 13, color: opt.color } as React.CSSProperties} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#F4F5F7" }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "#6F7480", marginTop: 1 }}>{opt.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
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

// ─── Project List Page (Make 全部剧目 — 行卡 + 搜索) ──────────────────────────
function ProjectListPage({ navigate, onSpacePick }: NavType & { onSpacePick: (dest?: PageId) => void }) {
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
// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const guardedSearch = guardGuestSearch(window.location.search);
  if (guardedSearch !== window.location.search) window.history.replaceState(null, "", guardedSearch);
  const params = new URLSearchParams(guardedSearch);
  const initialPage = (params.get("page") ?? "workspace") as PageId;
  const [currentPage, setCurrentPage] = useState<PageId>(initialPage);
  const [, updateLocation] = useState(0);

  // App shell state
  const [currentSpace, setCurrentSpace] = useState<"personal" | "team">(() =>
    sessionStorage.getItem("xinghe-space") === "personal" ? "personal" : USER.currentSpace
  );
  const [showSpacePicker, setShowSpacePicker] = useState(false);
  const [pendingNav, setPendingNav] = useState<PageId | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readNoticeIds, setReadNoticeIds] = useState<Set<string>>(new Set());
  const [helpOpen, setHelpOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const openSpacePicker = (dest?: PageId) => {
    setPendingNav(dest ?? null);
    setShowSpacePicker(true);
  };
  const confirmSpace = (s: "personal" | "team") => {
    const required = pendingNav === "my-tasks" ? "personal" : (pendingNav === "team" || pendingNav === "team-tasks") ? "team" : null;
    if (required && required !== s) return;
    sessionStorage.setItem("xinghe-space", s);
    setCurrentSpace(s);
    setShowSpacePicker(false);
    setPendingNav(null);
    if (pendingNav && pendingNav !== currentPage) navigate(pendingNav);
    else if (!pendingNav && s !== currentSpace &&
      ["team", "team-tasks", "my-tasks", "billing", "result"].includes(currentPage)) navigate("workspace");
  };

  const navigate = useCallback((page: PageId, extra?: Record<string, string | null>) => {
    setNotifOpen(false); setHelpOpen(false);
    // 切换页面时保留团队页签等查询参数
    const params = new URLSearchParams(window.location.search);
    // 用量子视图状态只在团队页、账单页与结果页有意义。
    // 账单页与结果页保留这些参数，便于「返回用量」时恢复来源状态。
    const keepsTeamState = ["team", "team-tasks", "my-tasks", "billing", "result"].includes(page);
    if (!keepsTeamState) {
      ["tab", "member", "focus", "source", "space", "view", "dfrom", "dto", "cat", "project", "model", "status", "q", "pg", "sort"].forEach(k => params.delete(k));
    }
    // 任务 ID 在团队、账单与结果页之间需要保留，用于互相定位
    if (!keepsTeamState) params.delete("task");
    if (page !== "result") params.delete("from");
    if (page !== "canvas") params.delete("canvas");
    if (page !== "projects") { params.delete("kind"); params.delete("create"); }
    params.set("page", page);
    // 额外的目标参数（如 task / from）
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => {
        if (v === null) params.delete(k);
        else params.set(k, v);
      });
    }
    const search = guardGuestSearch("?" + params.toString());
    if (search !== window.location.search) window.history.pushState(null, "", search);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  /**
   * 团队管理仅在团队空间下有数据。
   * 从个人空间进入团队页时，先确认切换到团队空间。
   */
  const navWithSpace = useCallback((page: PageId) => {
    if (((page === "team" || page === "team-tasks") && currentSpace !== "team") ||
        (page === "my-tasks" && currentSpace !== "personal")) {
      setPendingNav(page);
      setShowSpacePicker(true);
      return;
    }
    if (page !== currentPage) {
      const cleared = Object.fromEntries(
        ["tab", "view", "member", "focus", "dfrom", "dto", "cat", "project", "model", "status", "q", "pg", "sort", "task", "source", "space"]
          .map(key => [key, null])
      );
      navigate(page, cleared);
    }
  }, [currentPage, currentSpace, navigate]);

  // Browser back/forward support
  useEffect(() => {
    const onPop = () => {
      const guarded = guardGuestSearch(window.location.search);
      if (guarded !== window.location.search) window.history.replaceState(null, "", guarded);
      const p = new URLSearchParams(guarded).get("page") as PageId | null;
      setCurrentPage(p ?? "workspace");
      updateLocation(version => version + 1);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /**
   * 直接以 ?page=team 打开时，若当前是个人空间，先弹出空间确认。
   */
  const requiredSpace = (currentPage === "team" || currentPage === "team-tasks") ? "team" : currentPage === "my-tasks" ? "personal" : null;
  useEffect(() => {
    if (requiredSpace && currentSpace !== requiredSpace) {
      setPendingNav(currentPage);
      setShowSpacePicker(true);
    }
  }, [currentPage, currentSpace, requiredSpace]);

  const isAppShell =
    currentPage !== "landing" && currentPage !== "register" && currentPage !== "verify" &&
    currentPage !== "onboarding" && currentPage !== "login" && currentPage !== "upgrade" &&
    currentPage !== "canvas";

  const unread = notificationTasks(currentSpace).filter(task => !readNoticeIds.has(currentSpace + ":" + task.taskId)).length;

  const renderPage = () => {
    if (requiredSpace && requiredSpace !== currentSpace) return null;
    switch (currentPage) {
      case "my-tasks":          return <TaskRecordsPage key="personal" navigate={navigate} space="personal" />;
      case "team-tasks":        return <TeamPage navigate={navigate} />;
      case "landing":           return <LandingPage navigate={navigate} />;
      case "login":             return <AuthPage navigate={navigate} />;
      case "register":          return <RegisterPage navigate={navigate} />;
      case "onboarding":        return <OnboardingPage navigate={navigate} />;
      case "membership":        return <MembershipPage key={currentSpace} currentSpace={currentSpace} />;
      case "tools":             return <ToolsPage />;
      case "workspace":         return <WorkspacePage navigate={navigate} onSpacePick={openSpacePicker} currentSpace={currentSpace} />;
      case "projects":          return params.get("kind") === "canvas"
        ? <CanvasListPage key={currentSpace} navigate={navigate} scope={currentSpace} />
        : <ProjectListPage navigate={navigate} onSpacePick={openSpacePicker} />;
      case "new-project":       return <NewProjectPage navigate={navigate} />;
      case "canvas":            return <CanvasPage key={params.get("canvas") ?? "cv0"} navigate={navigate} scope={currentSpace} />;
      case "team":              return <TeamPage navigate={navigate} />;
      case "batch":             return <BatchPage navigate={navigate} />;
      case "result":            return <ResultPage navigate={navigate} space={currentSpace} />;
      case "delivery":          return <DeliveryPage navigate={navigate} />;
      case "upgrade":           return <UpgradePage navigate={navigate} />;
      case "cost-confirm":      return <CostConfirmPage navigate={navigate} />;
      case "team-assets":       return <TeamAssetsPage navigate={navigate} />;
      case "assets":            return <TeamAssetsPage navigate={navigate} />;
      case "billing":           return <BillingPage key={currentSpace} navigate={navigate} space={currentSpace} />;
      case "user-center":       return <UserCenterPage key={currentSpace} navigate={navigate} currentSpace={currentSpace} />;
      default:                  return <WorkspacePage navigate={navigate} onSpacePick={openSpacePicker} currentSpace={currentSpace} />;
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#090A0E", overflow: "hidden" }}>
      {isAppShell ? (
        <>
          <div className="studio-shell" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              <Sidebar currentPage={currentPage} currentSpace={currentSpace}
                onNavigate={navWithSpace} onSpacePick={() => openSpacePicker()}
              onNotifToggle={() => { setNotifOpen(o => !o); setHelpOpen(false); }}
              onHelpToggle={()  => { setHelpOpen(o  => !o); setNotifOpen(false); }}
              unread={unread} serviceOpen={serviceOpen} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#090A0E", minWidth: 0 }}>
              <AppHeader currentSpace={currentSpace}
                onMembership={() => navigate("membership")}
                onSpacePick={() => openSpacePicker()} />
              <main className="studio-main" data-page={currentPage} style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                {renderPage()}
              </main>
            </div>
          </div>

          {showSpacePicker && (
            <SpacePickerModal currentSpace={currentSpace}
              onConfirm={confirmSpace}
              onClose={() => {
                setShowSpacePicker(false);
                setPendingNav(null);
                if (requiredSpace && requiredSpace !== currentSpace) navigate("workspace");
              }} />
          )}
          {notifOpen && <TaskNotifications scope={currentSpace} readIds={readNoticeIds}
            onRead={ids => setReadNoticeIds(current => new Set([...current, ...ids]))}
            onClose={() => setNotifOpen(false)} navigate={navigate} />}
          {helpOpen && (
            <HelpPopup
              onClose={() => setHelpOpen(false)}
              onOpenService={() => setServiceOpen(true)}
              onOpenFeedback={() => setFeedbackOpen(true)}
            />
          )}
          {serviceOpen && <QRModal onClose={() => setServiceOpen(false)} />}
        </>
      ) : (
        <>
          {currentPage === "canvas"
            ? <div style={{ flex: 1, overflow: "hidden", position: "relative" }}><CanvasPage key={params.get("canvas") ?? "cv0"} navigate={navigate} scope={currentSpace} /></div>
            : renderPage()
          }
        </>
      )}
      <SupportWidget requested={feedbackOpen} onHandled={() => setFeedbackOpen(false)} />
    </div>
  );
}
