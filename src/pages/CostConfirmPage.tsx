// ═══════════════════════════════════════════════════════════════════════════════════
// CostConfirmPage - 生成前费用确认
// 原为 StoryboardPage 内嵌弹窗；分镜管理页删除后独立成页，保留原有视觉与交互。
// 模拟计费，不接入真实支付。
// ═══════════════════════════════════════════════════════════════════════════════════

import { X } from "lucide-react";
import { colors, gold } from "../shared";
import type { Nav as NavType } from "../shared";

const C = {
  orange: "#ff8c20",
};

export default function CostConfirmPage({ navigate }: NavType) {
  const TASK = {
    model: "Seedance 2.0 Fast",
    spec: "480p · 5秒 · 9:16 · 无声音 · 1张参考图",
    estimatedStars: 18.55,
    estimatedCNY: 1.86,
    priceVersion: "2026-08-21 10:00",
  };
  const SHOTS = 20;

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          background: "#0E0F14", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12,
          boxShadow: "0 30px 80px rgba(0,0,0,.6)", overflow: "hidden",
        }}>
          <div style={{
            padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,.07)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "white" }}>生成前费用确认</h2>
            <button onClick={() => navigate("batch")}
              style={{ color: colors.textMuted, background: "none", border: "none", cursor: "pointer" }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>

          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Task info */}
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: 16 }}>
              {([
                ["任务类型", "批量视频生成"],
                ["模型", TASK.model],
                ["规格", TASK.spec],
                ["数量", `${SHOTS} 条分镜`],
              ] as const).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: colors.textMuted }}>{k}</span>
                  <span style={{ color: "rgba(255,255,255,.8)", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Cost */}
            <div style={{ background: "rgba(255,138,31,.07)", border: "1px solid rgba(255,138,31,.2)", borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: colors.textMuted }}>预计消耗</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: gold }}>
                    {(TASK.estimatedStars * SHOTS).toFixed(2)} 星石
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 2 }}>
                    ≈ ¥{(TASK.estimatedCNY * SHOTS).toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.07)", fontSize: 10, color: "rgba(255,255,255,.25)" }}>
                价格版本：{TASK.priceVersion}
              </div>
            </div>

            {/* Notice */}
            <div style={{
              background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12,
              padding: "12px 16px", fontSize: 11.5, color: "rgba(255,255,255,.45)", lineHeight: 1.8,
            }}>
              · 提交前将自动扣除积分余额，请确保余额充足<br />
              · 生成任务需要有效会员，会员到期不影响已充值积分的有效期<br />
              · 演示计费，不产生真实订单
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => navigate("batch")}
                style={{
                  flex: 1, padding: "11px 0", borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.07)", color: colors.textSecondary,
                }}>
                取消
              </button>
              <button onClick={() => navigate("batch")}
                style={{
                  flex: 2, padding: "11px 0", borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: C.orange, border: "none", color: "black", boxShadow: "0 4px 20px rgba(255,140,32,.4)",
                }}>
                确认并提交
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
