// ═══════════════════════════════════════════════════════════════════════════════════
// src/pages/team/StarsTab.tsx — 星石管理页签
//
// 左：团队钱包（余额 / 已分配 / 待分配 / 团队保留 + 套餐权益 / 冻结）
// 右：成员额度（最新分配额度 / 已消耗 / 剩余 / 状态），复用额度弹窗
// 回收口径见《团队管理改造方案》：只释放未用额度，保留已消耗记录。
// ═══════════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { colors } from "../../shared";
import {
  getWallet, getTotalAllocated, getAssignableBalance, TEAM_RESERVED_STARS,
  getAllocation, getMemberAvailable,
  setAllocationLimit,
} from "../../billing";
import type { TeamMember } from "../../team";
import {
  Panel, Stat, PrimaryBtn, GhostBtn,
  ModalShell, ModalHead, ModalFoot, Field, TextInput,
} from "./shared";

// ─── 额度弹窗（复用现有交互，改为方案口径）──────────────────────────────────

export function AllocationModal({ member, onClose, onToast }: {
  member: TeamMember;
  onClose: () => void;
  onToast: (message: string, kind?: "ok" | "err") => void;
}) {
  const [mode, setMode] = useState<"add" | "reclaim">("add");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const available = getMemberAvailable(member.id);
  const assignable = getAssignableBalance();
  const value = Number(amount);
  const limit = mode === "add" ? assignable : available;
  const valid = amount.trim() !== "" && Number.isFinite(value) && value > 0;
  const over = valid && value > limit;

  const submit = () => {
    if (!valid) { setError("请输入大于零的星石数量"); return; }
    const current = getAllocation(member.id);
    const next = mode === "add" ? current.allocated + value : current.allocated - value;
    const result = setAllocationLimit(member.id, next);
    if (!result.ok) { setError(result.reason); return; }
    onToast(`已为 ${member.name} ${mode === "add" ? "充值" : "回收"} ${value.toLocaleString()} 星石（团队额度划转）`);
    onClose();
  };

  return (
    <ModalShell onClose={onClose} width={440}>
      <ModalHead title={`管理额度 · ${member.name}`} sub="从团队待分配额度划转星石" onClose={onClose} />
      <div style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {(["add", "reclaim"] as const).map(action => (
            <button key={action} type="button" aria-pressed={mode === action} onClick={() => {
              setMode(action); setAmount(""); setError("");
            }} style={{
              flex: 1, padding: 10, borderRadius: 8, cursor: "pointer",
              border: `1px solid ${mode === action ? colors.accent : colors.border}`,
              background: mode === action ? colors.accentDim : "transparent",
              color: mode === action ? colors.accent : colors.textSecondary,
            }}>{action === "add" ? "充值额度" : "回收额度"}</button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16, fontSize: 12, color: colors.textSecondary }}>
          <span>剩余额度 {available.toLocaleString()} 星石</span>
          <span>{mode === "add" ? "团队待分配" : "可回收"} {limit.toLocaleString()} 星石</span>
        </div>
        <Field label={mode === "add" ? "充值数量（星石）" : "回收数量（星石）"}>
          <TextInput value={amount} type="number" autoFocus onChange={input => { setAmount(input); setError(""); }} />
        </Field>
        {mode === "reclaim" && <button type="button" onClick={() => { setAmount(String(available)); setError(""); }}
          style={{ marginTop: 10, border: "none", background: "none", color: colors.accent, cursor: "pointer", fontSize: 12 }}>
          全部回收
        </button>}
        {(error || over) && <p role="alert" style={{ marginTop: 10, fontSize: 12, color: colors.error }}>
          {error || (mode === "add" ? "超出团队待分配额度" : "超出可回收额度")}
        </p>}
      </div>
      <ModalFoot>
        <GhostBtn onClick={onClose}>取消</GhostBtn>
        <PrimaryBtn onClick={submit} disabled={!valid || over}>{mode === "add" ? "确认充值" : "确认回收"}</PrimaryBtn>
      </ModalFoot>
    </ModalShell>
  );
}

export function TeamWallet() {
  const wallet = getWallet("team");
  const totalAllocated = getTotalAllocated();
  const assignable = getAssignableBalance();
  return (
      <Panel title="团队钱包">
        <div style={{ padding: "18px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
            <Stat label="团队钱包余额" value={wallet.rechargeStars.toLocaleString()} color={colors.accent} sub="星石" />
            <Stat label="已分配" value={totalAllocated.toLocaleString()} color={colors.info} sub="星石" />
            <Stat label="待分配" value={assignable.toLocaleString()} color={colors.success} sub="星石" />
            <Stat label="团队保留" value={TEAM_RESERVED_STARS.toLocaleString()} color={colors.purple} sub="星石" />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", marginTop: 14, fontSize: 12, color: colors.textMuted }}>
            <span>冻结星石 {wallet.frozenStars.toLocaleString()}</span>
            <span>充值余额最近到期 {wallet.rechargeNearestExpiry || "—"}</span>
          </div>
        </div>
      </Panel>

  );
}
