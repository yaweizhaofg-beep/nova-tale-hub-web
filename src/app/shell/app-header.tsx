import { useWalletSnapshot } from "@/features/billing/wallet-query";
import { ChevronDown, Users, User, Sparkles, Star, Zap } from "lucide-react";
import { USER } from "@/shared";
const gold = "#FF8A1F";

export function AppHeader({ currentSpace, onSpacePick, onMembership }: {
  currentSpace: "personal" | "team";
  onSpacePick: () => void;
  onMembership: () => void;
}) {
  const { rechargeStars } = useWalletSnapshot().wallets[currentSpace];
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
