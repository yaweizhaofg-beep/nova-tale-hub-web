// ═══════════════════════════════════════════════════════════════════════════════════
// UpgradePage - 会员套餐（个人 / 团队）
// 保留原布局、视觉与导航；价格与权益改用 src/billing.ts 统一配置。
// 模拟交互，不接入真实支付。
// ═══════════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { ChevronLeft, Users, User, Check, HardDrive, AlertTriangle } from "lucide-react";
import { USER } from "../shared";
import type { PageId } from "../shared";
import {
  PLAN_PERIOD_DAYS, CONCURRENCY_DISCLAIMER, storageLabel,
  SPACE_NAMES,
  plansFor, findPlan, canUpgrade, halfPeriodUpgradeQuote,
  computeStorageQuote, STORAGE_PRICE_PER_GB, STORAGE_MAX_GB,
  type Plan, type PlanScope, type SpaceKind, type UpgradeQuote,
} from "../billing";

interface NavType { navigate: (p: PageId) => void; }

const gold = "#ffac30";

/** 空间 → 套餐范围映射 */
const SCOPE_OF_SPACE: Record<SpaceKind, PlanScope> = { personal: "personal", team: "team" };

export default function UpgradePage({ navigate }: NavType) {
  const [tab, setTab] = useState<PlanScope>(SCOPE_OF_SPACE[USER.currentSpace]);
  const [upgradeTo, setUpgradeTo] = useState<Plan | null>(null);
  const [storageOpen, setStorageOpen] = useState(false);

  const [space, setSpace] = useState<SpaceKind>(USER.currentSpace);
  const plans = plansFor(tab);
  const currentPlan = findPlan(DEMO_CURRENT_PLAN[space]) ?? plans[0];

  return (
    <div style={{ minHeight: "100vh", background: "#090A0E", color: "white", position: "relative" }}>

      {/* Ambient blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "8%", left: "12%", width: 600, height: 400, borderRadius: "50%",
          background: "radial-gradient(ellipse,rgba(255,138,31,.07) 0%,transparent 70%)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "8%", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(ellipse,rgba(168,85,247,.05) 0%,transparent 68%)", filter: "blur(100px)" }} />
      </div>

      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(9,10,14,.9)", backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,.07)", padding: "0 32px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 56, display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("user-center")}
            style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,.45)",
              background: "none", border: "none", cursor: "pointer", padding: "4px 0",
            }}>
            <ChevronLeft style={{ width: 14, height: 14 }} />
            个人中心
          </button>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,.1)" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "white" }}>会员套餐</span>
          <div style={{ flex: 1 }} />
          {/* 空间切换 */}
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.09)", borderRadius: 10, padding: 3, gap: 3 }}>
            {(["personal", "team"] as SpaceKind[]).map(sp => (
              <button key={sp} onClick={() => setSpace(sp)}
                style={{ padding: "4px 14px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                  border: "none", transition: "all .18s",
                  ...(space === sp
                    ? { background: "rgba(255,172,48,.2)", color: gold }
                    : { background: "transparent", color: "rgba(255,255,255,.45)" }) }}>
                {SPACE_NAMES[sp]}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,.4)" }}>
            <span>当前套餐：</span>
            <span style={{ color: gold, fontWeight: 600 }}>{currentPlan.name}</span>
            <span style={{ color: "rgba(255,255,255,.3)" }}>· {DEMO_REMAINING_DAYS} 天后到期</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "48px 32px 80px" }}>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "white", letterSpacing: "-0.02em", marginBottom: 10 }}>
            选择会员套餐
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.38)", marginBottom: 28 }}>
            个人与团队独立购买、独立余额 · 会员 {PLAN_PERIOD_DAYS} 天周期，套餐积分随本周期结束失效
          </p>

          {/* Tab toggle */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{
              display: "inline-flex", background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, padding: 4, gap: 4,
            }}>
              {([["personal","个人套餐"],["team","团队套餐"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => { setTab(k); setSpace(k); }}
                  style={{
                    padding: "7px 24px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", transition: "all .18s", border: "none",
                    ...(tab === k
                      ? { background: gold, color: "black", boxShadow: `0 2px 12px rgba(255,138,31,.35)` }
                      : { background: "transparent", color: "rgba(255,255,255,.5)" }),
                  }}>
                  {label}
                </button>
              ))}
            </div>
            {tab === "team" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,.4)" }}>
                <Users style={{ width: 12, height: 12, color: "#a78bfa" }} />
                <span>团队会员包含团队成员、共享资产与项目共创 · 个人钱包与团队钱包独立不串账 · 不支持个人升级团队</span>
              </div>
            )}
            {tab === "personal" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,.4)" }}>
                <User style={{ width: 12, height: 12, color: "#60a5fa" }} />
                <span>个人会员仅限本人使用，不含团队成员、共享资产和项目共创功能 · 个人与团队独立购买、独立余额，不支持个人升级团队</span>
              </div>
            )}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${plans.length},1fr)`, gap: 16, alignItems: "stretch" }}>
          {plans.map(plan => {
            const isCurrent = plan.id === currentPlan.id;
            const upgradeable = !isCurrent && canUpgrade(currentPlan.id, plan.id);
            const sameScope = plan.scope === currentPlan.scope;
            return (
              <div key={plan.id}
                style={{
                  position: "relative", borderRadius: 16, padding: "24px 20px 20px",
                  display: "flex", flexDirection: "column", boxSizing: "border-box",
                  transition: "transform .2s, box-shadow .2s",
                  ...(plan.hot ? {
                    background: "radial-gradient(ellipse at 50% 0%,rgba(255,138,31,.14),rgba(255,255,255,.03) 68%)",
                    border: "1px solid rgba(255,138,31,.3)", boxShadow: "0 0 48px rgba(255,100,20,.1)",
                  } : isCurrent ? {
                    background: "rgba(255,138,31,.04)",
                    border: "1px solid rgba(255,138,31,.18)",
                  } : {
                    background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
                  }),
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = plan.hot ? "0 8px 48px rgba(255,100,20,.18)" : "0 8px 32px rgba(0,0,0,.4)";
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "none";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = plan.hot ? "0 0 48px rgba(255,100,20,.1)" : "none";
                }}>

                {/* Hot / Tag badge */}
                {plan.tag && (
                  <div style={{
                    position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
                    fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 20, whiteSpace: "nowrap",
                    ...(plan.tag === "推荐" ? { background: gold, color: "black" }
                      : { background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.65)" }),
                  }}>
                    {plan.tag}
                  </div>
                )}
                {isCurrent && (
                  <div style={{
                    position: "absolute", top: -13, right: 16,
                    fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 20,
                    background: "rgba(255,138,31,.18)", border: "1px solid rgba(255,138,31,.3)", color: gold,
                  }}>
                    当前套餐
                  </div>
                )}

                {/* Plan name */}
                <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 8 }}>{plan.name}</div>

                {/* Price */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 30, fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>
                      ¥{plan.price}
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>/{PLAN_PERIOD_DAYS}天</span>
                  </div>
                </div>

                {/* Included stars */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 5, marginBottom: 14,
                  padding: "6px 10px", borderRadius: 8,
                  background: "rgba(255,138,31,.07)", border: "1px solid rgba(255,138,31,.15)",
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
                    <polygon points="6,1 7.5,4.5 11,5 8.5,7.5 9.5,11 6,9 2.5,11 3.5,7.5 1,5 4.5,4.5" fill={gold} />
                  </svg>
                  <span style={{ fontSize: 13, color: gold, fontWeight: 700 }}>{plan.stars.toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,138,31,.6)" }}>包含积分</span>
                </div>

                {/* Key stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                  {([
                    ["席位", `${plan.seats}人`],
                    ["总存储", storageLabel(plan)],
                  ] as const).map(([l, v]) => (
                    <div key={l} style={{ background: "rgba(255,255,255,.04)", borderRadius: 8, padding: "7px 10px" }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.85)" }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Perks */}
                <div style={{ flex: 1, marginBottom: 14 }}>
                  {plan.perks.map(p => (
                    <div key={p} style={{
                      display: "flex", alignItems: "center", gap: 7, fontSize: 12,
                      color: "rgba(255,255,255,.5)", marginBottom: 7,
                    }}>
                      <Check style={{ width: 12, height: 12, flexShrink: 0, color: plan.hot ? gold : "rgba(255,255,255,.3)" }} />
                      {p}
                    </div>
                  ))}
                </div>

                {/* Concurrency disclaimer */}
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", lineHeight: 1.6, marginBottom: 14 }}>
                  {CONCURRENCY_DISCLAIMER.replace("{N}", String(plan.concurrencyPerSeat))}
                </div>

                {/* CTA */}
                <button
                  disabled={isCurrent}
                  onClick={() => {
                    if (isCurrent) return;
                    if (upgradeable) { setUpgradeTo(plan); return; }
                    navigate("user-center");
                  }}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 11, fontSize: 13, fontWeight: 700,
                    cursor: isCurrent ? "default" : "pointer", transition: "all .18s", border: "none",
                    ...(isCurrent
                      ? { background: "rgba(255,138,31,.1)", color: "rgba(255,138,31,.5)" }
                      : plan.hot
                        ? { background: gold, color: "black", boxShadow: `0 4px 20px rgba(255,138,31,.4)` }
                        : { background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.75)" }),
                  }}>
                  {isCurrent ? "当前套餐" : upgradeable ? "立即升级" : sameScope ? "切换套餐" : "购买并开通"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Storage expansion */}
        <div style={{
          marginTop: 32, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)",
          borderRadius: 16, padding: "20px 28px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <HardDrive style={{ width: 15, height: 15, color: gold }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.45)", letterSpacing: "0.05em" }}>
              存储扩容
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.9 }}>
              <div>新增容量 <span style={{ color: gold, fontWeight: 600 }}>¥{STORAGE_PRICE_PER_GB.toFixed(2)} / GB / {PLAN_PERIOD_DAYS}天</span>，只增加存储，不增加流量</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)" }}>
                按当前会员剩余比例收费，与会员同日到期 · 总容量上限 {STORAGE_MAX_GB / 1024}TB · 超额流量价格与到期数据删除规则待确认
              </div>
            </div>
            <button onClick={() => setStorageOpen(true)}
              style={{ padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.75)" }}>
              扩容存储
            </button>
          </div>
        </div>

        {/* Rules */}
        <div style={{
          marginTop: 16, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)",
          borderRadius: 16, padding: "20px 28px",
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.45)",
            letterSpacing: "0.05em", marginBottom: 12, textTransform: "uppercase",
          }}>
            套餐升级计算公式
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.9 }}>
              <div><span style={{ color: gold, fontWeight: 600 }}>补款</span> = (新档价格 − 旧档价格) × 剩余比例</div>
              <div><span style={{ color: "#34d399", fontWeight: 600 }}>补发积分</span> = (新档完整积分 − 旧档完整积分) × 剩余比例</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 6 }}>
                剩余比例 = 本周期剩余秒数 ÷ 本周期总秒数 · 原到期日不变 · 原余额保留，只补差额积分
              </div>
            </div>
            <div style={{
              background: "rgba(255,138,31,.06)", border: "1px solid rgba(255,138,31,.15)",
              borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", lineHeight: 1.9,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: gold, marginBottom: 6 }}>示例：剩半周期时升级</div>
              {(() => {
                const p1 = findPlan("personal-creator")!;
                const p2 = findPlan("personal-pro")!;
                const q = halfPeriodUpgradeQuote(p1, p2, DEMO_EXPIRY);
                const t1 = findPlan("team-studio")!;
                const t2 = findPlan("team-production")!;
                const q2 = halfPeriodUpgradeQuote(t1, t2, DEMO_EXPIRY);
                return (
                  <>
                    <div>¥299 → ¥599：支付 <span style={{ color: gold, fontWeight: 600 }}>¥{q.topUpAmount.toFixed(2)}</span>、补 <span style={{ color: "#34d399", fontWeight: 600 }}>{q.topUpStars.toLocaleString()}</span> 积分</div>
                    <div>¥1999 → ¥3999：支付 <span style={{ color: gold, fontWeight: 600 }}>¥{q2.topUpAmount.toFixed(2)}</span>、补 <span style={{ color: "#34d399", fontWeight: 600 }}>{q2.topUpStars.toLocaleString()}</span> 积分</div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {upgradeTo && (
        <UpgradeConfirmModal
          from={currentPlan}
          to={upgradeTo}
          onClose={() => setUpgradeTo(null)}
          onConfirm={() => { setUpgradeTo(null); navigate("user-center"); }}
        />
      )}
      {storageOpen && (
        <StorageExpandModal
          currentPlan={currentPlan}
          onClose={() => setStorageOpen(false)}
          onConfirm={() => { setStorageOpen(false); navigate("user-center"); }}
        />
      )}
    </div>
  );
}

// ─── 演示常量 ─────────────────────────────────────────────────────────────────

/** 演示：各空间当前套餐 */
const DEMO_CURRENT_PLAN: Record<SpaceKind, string> = {
  personal: "personal-creator",
  team: "team-studio",
};

/** 演示：剩余天数 */
const DEMO_REMAINING_DAYS = 21;

/** 演示：到期日 */
const DEMO_EXPIRY = "2026-11-20";

// ─── 升级确认弹窗 ─────────────────────────────────────────────────────────────

function UpgradeConfirmModal({ from, to, onClose, onConfirm }: {
  from: Plan; to: Plan; onClose: () => void; onConfirm: () => void;
}) {
  const quote: UpgradeQuote = halfPeriodUpgradeQuote(from, to, DEMO_EXPIRY);
  const nextPeriodPrice = to.price;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,.6)", backdropFilter: "blur(8px)", padding: 24 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#13151C", border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, padding: "28px 32px",
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
      </div>
    </div>
  );
}

// ─── 存储扩容弹窗 ─────────────────────────────────────────────────────────────

function StorageExpandModal({ currentPlan, onClose, onConfirm }: {
  currentPlan: Plan; onClose: () => void; onConfirm: () => void;
}) {
  const [targetGb, setTargetGb] = useState(currentPlan.storageGb * 2);
  const currentGb = currentPlan.storageGb;
  const quote = computeStorageQuote(currentGb, targetGb, DEMO_REMAINING_DAYS, DEMO_EXPIRY);
  const overLimit = targetGb > STORAGE_MAX_GB;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,.6)", backdropFilter: "blur(8px)", padding: 24 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#13151C", border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, padding: "28px 32px",
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
      </div>
    </div>
  );
}
