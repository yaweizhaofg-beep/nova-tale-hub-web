import { useState } from "react";
import { computeStorageQuote, STORAGE_PRICE_PER_GB, STORAGE_MAX_GB, PLAN_PERIOD_DAYS, type Plan } from "@/billing";
import { DEMO_EXPIRY, DEMO_REMAINING_DAYS } from "./upgrade-demo";
import { Dialog } from "@/components/ui";
import styles from "./upgrade-dialog.module.css";
const gold = "#ffac30";

export function StorageExpandModal({ currentPlan, onClose, onConfirm }: {
  currentPlan: Plan; onClose: () => void; onConfirm: () => void;
}) {
  const [targetGb, setTargetGb] = useState(currentPlan.storageGb * 2);
  const currentGb = currentPlan.storageGb;
  const quote = computeStorageQuote(currentGb, targetGb, DEMO_REMAINING_DAYS, DEMO_EXPIRY);
  const overLimit = targetGb > STORAGE_MAX_GB;

  return (
    <Dialog label="扩容存储" onClose={onClose} overlayClassName={styles.overlay}
      contentStyle={{ background: "#13151C", border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, padding: "28px 32px",
          width: "100%", maxWidth: 480, boxShadow: "0 32px 80px rgba(0,0,0,.7)" }}>

        <div style={{ fontSize: 17, fontWeight: 700, color: "white", marginBottom: 4 }}>扩容存储</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 20 }}>
          ¥{STORAGE_PRICE_PER_GB.toFixed(2)} / GB / {PLAN_PERIOD_DAYS}天 · 只增加存储，不增加流量
        </div>

        {/* Current usage */}
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12,
          padding: "14px 16px", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>当前容量</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.8)" }}>
              {currentGb}GB{currentPlan.scope === "team" ? " 共享" : ""}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (currentGb / STORAGE_MAX_GB) * 100)}%`,
              background: "linear-gradient(90deg,#ff8c20,#ff5010)", borderRadius: 999 }} />
          </div>
        </div>

        {/* Target */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 8 }}>目标总容量</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="number" value={targetGb} min={currentGb} step={currentGb}
              onChange={e => setTargetGb(Number(e.target.value) || currentGb)}
              style={{ flex: 1, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "white", outline: "none" }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>GB</span>
          </div>
          {overLimit && (
            <div style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}>超过总容量上限 {STORAGE_MAX_GB / 1024}TB</div>
          )}
        </div>

        {/* Quote */}
        <div style={{ background: "rgba(255,138,31,.06)", border: "1px solid rgba(255,138,31,.15)", borderRadius: 12,
          padding: "14px 16px", marginBottom: 18 }}>
          {([
            ["新增容量", `${quote.addedGb} GB`],
            ["剩余天数", `${quote.remainingDays} 天`],
            ["到期日", quote.expiry],
          ] as const).map(([l, v], i, arr) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
              borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{l}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,.8)", fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>付款金额</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: gold }}>¥{quote.amount.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "12px 0", borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.65)" }}>
            取消
          </button>
          <button onClick={onConfirm} disabled={overLimit}
            style={{ flex: 2, padding: "12px 0", borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: overLimit ? "not-allowed" : "pointer",
              background: overLimit ? "rgba(255,255,255,.1)" : "linear-gradient(135deg,#ff8c20,#ff5010)", border: "none",
              color: overLimit ? "rgba(255,255,255,.3)" : "black" }}>
            支付 ¥{quote.amount.toFixed(2)}，确认扩容
          </button>
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
          升级套餐时按目标容量重算扩容差额，不重复收费 · 模拟支付为演示
        </div>
    </Dialog>
  );
}
