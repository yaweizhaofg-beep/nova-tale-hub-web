import { Dialog } from "@/components/ui";
import { useWalletSnapshot } from "@/features/billing/wallet-query";
import BrandLogo from "@/components/BrandLogo";
import SpaceMedallion from "@/components/SpaceMedallion";
import { USER } from "@/shared";

export function SpacePickerModal({ currentSpace, onConfirm, onClose }: {
  currentSpace: "personal" | "team";
  onConfirm: (s: "personal" | "team") => void;
  onClose: () => void;
}) {
  const { wallets } = useWalletSnapshot();
  return (
    <Dialog label="切换工作空间" onClose={onClose} contentClassName="studio-space-dialog" overlayStyle={{ position: "fixed", inset: 0, zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.72)", backdropFilter: "blur(12px)" }}
      contentStyle={{ width: 480, background: "#13141B", borderRadius: 24, border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 32px 80px rgba(0,0,0,.8)", overflow: "hidden" }}>
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
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", lineHeight: 1.5 }}>{USER.name}<br />{wallets.personal.rechargeStars.toLocaleString()} 充值积分（个人钱包）</div>
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
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", lineHeight: 1.5 }}>团队空间<br />{wallets.team.rechargeStars.toLocaleString()} 充值积分（团队钱包）</div>
            </div>
            {currentSpace === "team" && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", background: "rgba(139,92,246,.12)", borderRadius: 100, padding: "3px 10px" }}>当前空间</div>
            )}
          </button>
        </div>
        <div style={{ padding: "0 28px 22px", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,.2)" }}>
          两个空间的余额独立，互不影响 · 点击外部关闭
        </div>
    </Dialog>
  );
}
