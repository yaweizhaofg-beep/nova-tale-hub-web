import { AlertTriangle } from "lucide-react";
import { PLAN_PERIOD_DAYS, halfPeriodUpgradeQuote, type UpgradeQuote, type Plan } from "@/billing";
import { DEMO_EXPIRY } from "./upgrade-demo";
import { Dialog } from "@/components/ui";
import styles from "./upgrade-dialog.module.css";
const gold = "#ffac30";

export function UpgradeConfirmModal({ from, to, onClose, onConfirm }: {
  from: Plan; to: Plan; onClose: () => void; onConfirm: () => void;
}) {
  const quote: UpgradeQuote = halfPeriodUpgradeQuote(from, to, DEMO_EXPIRY);
  const nextPeriodPrice = to.price;

  return (
    <Dialog label="确认升级套餐" onClose={onClose} overlayClassName={styles.overlay}
      contentStyle={{ background: "#13151C", border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, padding: "28px 32px",
          width: "100%", maxWidth: 520, boxShadow: "0 32px 80px rgba(0,0,0,.7)" }}>

        <div style={{ fontSize: 17, fontWeight: 700, color: "white", marginBottom: 4 }}>确认升级套餐</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 20 }}>
          升级立即生效，原到期时间不变
        </div>

        {/* Plan transition */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18,
          background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginBottom: 4 }}>原套餐</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.7)" }}>{from.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>¥{from.price} · {from.stars.toLocaleString()} 积分</div>
          </div>
          <div style={{ fontSize: 18, color: gold }}>→</div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginBottom: 4 }}>新套餐</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{to.name}</div>
            <div style={{ fontSize: 11, color: gold, marginTop: 2, fontWeight: 600 }}>¥{to.price} · {to.stars.toLocaleString()} 积分</div>
          </div>
        </div>

        {/* Quote rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 18 }}>
          {([
            ["剩余时间", `${quote.remainingDays} 天（约 ${(quote.remainingRatio * 100).toFixed(0)}%）`],
            ["补款", `¥${quote.topUpAmount.toFixed(2)}`],
            ["补发积分", `+${quote.topUpStars.toLocaleString()}`],
            ["原到期日", quote.originalExpiry],
            ["下周期完整价格", `¥${nextPeriodPrice} / ${PLAN_PERIOD_DAYS}天`],
          ] as const).map(([l, v], i, arr) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0",
              borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
              <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.45)" }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: l === "补款" ? gold : l === "补发积分" ? "#34d399" : "rgba(255,255,255,.8)" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Benefit changes */}
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12,
          padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.45)", marginBottom: 8 }}>权益变化</div>
          {quote.benefitChanges.map(b => (
            <div key={b.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12,
              color: "rgba(255,255,255,.5)", marginBottom: 5 }}>
              <span>{b.label}</span>
              <span><span style={{ color: "rgba(255,255,255,.4)" }}>{b.from}</span>
                <span style={{ color: "rgba(255,255,255,.25)", margin: "0 5px" }}>→</span>
                <span style={{ color: "#34d399", fontWeight: 600 }}>{b.to}</span></span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "12px 0", borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.65)" }}>
            取消
          </button>
          <button onClick={onConfirm}
            style={{ flex: 2, padding: "12px 0", borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: "linear-gradient(135deg,#ff8c20,#ff5010)", border: "none", color: "black" }}>
            支付 ¥{quote.topUpAmount.toFixed(2)}，立即升级
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11, color: "rgba(255,255,255,.28)", lineHeight: 1.6 }}>
          <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 2, color: "rgba(255,255,255,.3)" }} />
          <span>降级将于下周期生效，当期不退差价。模拟支付为演示，不产生真实订单。</span>
        </div>
    </Dialog>
  );
}
