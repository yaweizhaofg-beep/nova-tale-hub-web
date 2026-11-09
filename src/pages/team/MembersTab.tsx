// ═══════════════════════════════════════════════════════════════════════════════════
// src/pages/team/MembersTab.tsx — 成员管理页签
//
// 席位用量、成员列表与移除历史
// ═══════════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { Plus, Settings, Trash2, UserPlus, History } from "lucide-react";
import { colors, ROLE_STYLE, TEAM_OWNER_ID } from "../../shared";
import type { TeamRole } from "../../shared";
import {
  getActiveMembers, getRemovedMembers,
  getSeatUsed, getSeatsLeft, isSeatFull, TEAM_MAX_SEATS,
  inviteMember, revokeInvite, acceptInvite, changeMemberRole, removeMember,
} from "../../team";
import type { TeamMember } from "../../team";
import { AllocationModal } from "./StarsTab";
import {
  getAllocation, getMemberAvailable,
} from "../../billing";
import {
  Panel, Tag, PrimaryBtn, GhostBtn, Empty, TableHead, TableScroll,
  LinkBtn, SearchBox, ModalShell, ModalHead, ModalFoot, Field, TextInput, Select, RoleBadge,
} from "./shared";

// ─── 席位状态展示 ─────────────────────────────────────────────────────────────

const SEAT_META: Record<string, { label: string; color: string; bg: string }> = {
  active:  { label: "在席",   color: colors.success, bg: "rgba(34,197,94,.12)" },
  removed: { label: "已移除", color: colors.textMuted, bg: "rgba(255,255,255,.05)" },
};

// ─── 邀请弹窗 ─────────────────────────────────────────────────────────────────

function InviteModal({ onClose, onToast }: { onClose: () => void; onToast: (m: string, k?: "ok" | "err") => void }) {
  const [account, setAccount] = useState("");
  const [role, setRole] = useState<TeamRole>("编剧");
  const [err, setErr] = useState("");
  const full = isSeatFull();

  const submit = () => {
    if (isSeatFull()) { setErr("席位已满，请先腾出一个席位"); return; }
    const invitation = inviteMember(account, role);
    if (!invitation.ok) { setErr(invitation.reason); return; }
    const result = acceptInvite(invitation.invite.id);
    if (!result.ok) {
      revokeInvite(invitation.invite.id);
      setErr(result.reason);
      return;
    }
    onToast(`${result.member.name} 已加入团队（演示）`);
    onClose();
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalHead
        title="邀请成员"
        sub="演示流程：按账号模拟成员加入工作室"
        onClose={onClose}
      />
      <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
        {full && (
          <div style={{
            padding: "10px 12px", borderRadius: 10, fontSize: 12.5, lineHeight: 1.6,
            background: "rgba(255,172,48,.08)", border: "1px solid rgba(255,172,48,.22)", color: colors.warning,
          }}>
            当前席位已满（{TEAM_MAX_SEATS}/{TEAM_MAX_SEATS}），请先腾出一个席位。
          </div>
        )}
        <Field label="账号（邮箱或用户名）">
          <TextInput value={account} onChange={v => { setAccount(v); setErr(""); }} placeholder="对方注册时使用的邮箱或用户名" autoFocus />
        </Field>
        <Field label="分配职能">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(["管理员", "导演", "编剧", "制作人"] as const).map(r => {
              const rs = ROLE_STYLE[r];
              const on = role === r;
              return (
                <button key={r} onClick={() => setRole(r)}
                  style={{
                    padding: "11px 13px", borderRadius: 11, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    background: on ? rs.bg : colors.bgSurface,
                    border: `1px solid ${on ? rs.color + "60" : colors.border}`,
                  }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: on ? rs.color : colors.textDisabled }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: on ? rs.color : colors.textSecondary }}>{r}</span>
                </button>
              );
            })}
          </div>
        </Field>
        {err && <div style={{ fontSize: 12.5, color: colors.error }}>{err}</div>}
      </div>
      <ModalFoot>
        <GhostBtn onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>取消</GhostBtn>
        <PrimaryBtn onClick={submit} disabled={full || !account.trim()} style={{ flex: 2, justifyContent: "center" }}>
          <UserPlus style={{ width: 14, height: 14 }} />模拟加入
        </PrimaryBtn>
      </ModalFoot>
    </ModalShell>
  );
}

// ─── 移除确认弹窗 ─────────────────────────────────────────────────────────────

function RemoveModal({ member, onClose, onDone }: {
  member: TeamMember;
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const isCreator = member.id === TEAM_OWNER_ID;

  const confirm = () => {
    setBusy(true);
    // 演示：一次提交成功或失败（移除 + 释放额度）
    const r = removeMember(member.id);
    setBusy(false);
    if (!r.ok) { onDone(r.reason ?? "移除失败", false); return; }
    onDone(`已移除 ${member.name}（演示）。其历史消耗保留，可在用量明细追溯`, true);
    onClose();
  };

  return (
    <ModalShell onClose={onClose} width={420}>
      <ModalHead title={`移除成员 · ${member.name}`} sub="此操作需要二次确认" onClose={onClose} />
      <div style={{ padding: "18px 22px", fontSize: 13, color: colors.textSecondary, lineHeight: 1.75 }}>
        {isCreator ? (
          <div style={{ color: colors.error }}>
            创始人受保护，不可被移除或通过职能编辑降权。
          </div>
        ) : (
          <>
            移除后 <strong style={{ color: colors.textPrimary }}>{member.name}</strong> 将退出团队并释放席位。
            <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: colors.bgSurface, border: `1px solid ${colors.border}`, fontSize: 12.5, color: colors.textMuted }}>
              其历史用量与消耗记录将保留，可在「用量明细」按成员继续追溯。
            </div>
          </>
        )}
      </div>
      <ModalFoot>
        <GhostBtn onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>取消</GhostBtn>
        <PrimaryBtn
          onClick={confirm}
          disabled={isCreator || busy}
          style={{ flex: 1, justifyContent: "center", background: isCreator ? undefined : colors.error, color: isCreator ? undefined : "#000" }}
        >
          {isCreator ? "创始人受保护" : "确认移除"}
        </PrimaryBtn>
      </ModalFoot>
    </ModalShell>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function MembersTab({
  focusMemberId, onOpenUsage, onToast,
}: {
  focusMemberId?: number | null;
  onOpenUsage: (memberId?: number) => void;
  onToast: (m: string, k?: "ok" | "err") => void;
}) {
  const [quotaTarget, setQuotaTarget] = useState<TeamMember | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<TeamRole>("编剧");
  const [kw, setKw] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);

  const members = getActiveMembers();
  const removed = getRemovedMembers();
  const used = getSeatUsed();
  const left = getSeatsLeft();
  const full = isSeatFull();

  const filter = (m: TeamMember) => {
    if (!kw.trim()) return true;
    const k = kw.trim().toLowerCase();
    return m.name.toLowerCase().includes(k) || m.account.toLowerCase().includes(k);
  };

  const filtered = useMemo(() => members.filter(filter), [members, kw]);
  const onlineCount = members.filter(m => m.online).length;

  const handleRoleSave = (id: number) => {
    const r = changeMemberRole(id, editRole);
    setEditId(null);
    if (!r.ok) { onToast(r.reason ?? "修改失败", "err"); return; }
    onToast("职能已更新");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── 席位用量条 ── */}
      <Panel>
        <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: full ? colors.warning : colors.accent }}>
              {used}
            </span>
            <span style={{ fontSize: 14, color: colors.textMuted }}>/ {TEAM_MAX_SEATS} 席位</span>
          </div>

          {/* 席位格 */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {Array.from({ length: TEAM_MAX_SEATS }).map((_, i) => (
              <div key={i} style={{
                width: 26, height: 8, borderRadius: 4,
                background: i < used ? (full ? colors.warning : colors.accent) : "rgba(255,255,255,.08)",
              }} />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 13 }}>
            <span style={{ color: colors.textMuted }}>
              在席 <strong style={{ color: colors.textPrimary }}>{members.length}</strong> 人
            </span>
            <span style={{ color: colors.textMuted }}>
              在线 <strong style={{ color: colors.success }}>{onlineCount}</strong> 人
            </span>
            <span style={{ color: colors.textMuted }}>
              剩余 <strong style={{ color: left ? colors.success : colors.warning }}>{left}</strong> 席
            </span>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {full && (
              <span style={{ fontSize: 12, color: colors.warning }}>
                席位已满，请先腾出一个席位
              </span>
            )}
            <PrimaryBtn onClick={() => setShowInvite(true)}>
              <Plus style={{ width: 14, height: 14 }} />邀请成员
            </PrimaryBtn>
          </div>
        </div>
      </Panel>

      {/* ── 成员表 ── */}
      <Panel title="团队成员" extra={
        <SearchBox value={kw} onChange={setKw} placeholder="搜索姓名或账号" />
      }>
        <TableScroll minWidth={1000}>
          <TableHead
            columns={["成员 / 账号", "职能", "席位状态", "在线状态", "剩余额度", "最新分配额度", "已消耗额度", "操作"]}
            widths={["2fr", "0.8fr", "0.7fr", "0.7fr", "0.9fr", "1fr", "0.9fr", "140px"]}
          />
          {filtered.length === 0 ? (
            <Empty text={kw ? "没有匹配的成员" : "暂无成员"} hint={kw ? "试试其他姓名或账号" : "点击右上角「邀请成员」开始"} />
          ) : filtered.map((m, i) => {
            const rs = ROLE_STYLE[m.role] ?? { bg: colors.bgHover, color: colors.textMuted };
            const isCreator = m.id === TEAM_OWNER_ID;
            const a = getAllocation(m.id);
            const avail = getMemberAvailable(m.id);
            return (
              <div key={m.id} style={{
                display: "grid", gridTemplateColumns: "2fr 0.8fr 0.7fr 0.7fr 0.9fr 1fr 0.9fr 140px",
                background: focusMemberId === m.id ? colors.accentDim : undefined,
                alignItems: "center", padding: "13px 20px",
                borderBottom: i < filtered.length - 1 ? `1px solid ${colors.border}` : "none",
              }}>
                {/* 成员 / 账号 */}
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ position: "relative" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", background: rs.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, color: rs.color,
                    }}>{m.avatar}</div>
                    <div style={{
                      position: "absolute", bottom: 0, right: 0,
                      width: 10, height: 10, borderRadius: "50%",
                      background: m.online ? colors.success : colors.textDisabled,
                      border: `2px solid ${colors.bgSurface}`,
                    }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>{m.name}</span>
                      {isCreator && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: colors.accent, color: "#000" }}>
                          创始人
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: colors.textMuted }}>{m.account}</span>
                  </div>
                </div>

                {/* 职能 */}
                <div>
                  {editId === m.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <Select value={editRole} onChange={setEditRole} options={["管理员", "导演", "编剧", "制作人"] as const} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleRoleSave(m.id)} style={{
                          fontSize: 12, color: colors.accent, background: colors.accentDim,
                          border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 600,
                        }}>保存</button>
                        <button onClick={() => setEditId(null)} style={{
                          fontSize: 12, color: colors.textMuted, background: "transparent",
                          border: "none", padding: "4px 6px", cursor: "pointer",
                        }}>取消</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <RoleBadge role={m.role} style={rs} />
                      {!isCreator && (
                        <button onClick={() => { setEditId(m.id); setEditRole(m.role); }} title="修改职能"
                          style={{ background: "none", border: "none", color: colors.textDisabled, cursor: "pointer", padding: 3, display: "flex" }}>
                          <Settings style={{ width: 12, height: 12 }} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 席位状态 */}
                <div><Tag {...SEAT_META.active} label="在席" /></div>

                {/* 在线状态 */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.online ? colors.success : colors.textDisabled }} />
                  <span style={{ fontSize: 12.5, color: m.online ? colors.success : colors.textMuted }}>
                    {m.online ? "在线" : "离线"}
                  </span>
                </div>

                <span style={{ fontSize: 13, color: colors.success }}>{avail.toLocaleString()}</span>
                <span style={{ fontSize: 13, color: colors.textPrimary }}>{a.allocated.toLocaleString()}</span>
                <span style={{ fontSize: 13, color: colors.textSecondary }}>{a.used.toLocaleString()}</span>

                {/* 操作 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 10 }}>
                  <LinkBtn onClick={() => setQuotaTarget(m)}>管理额度</LinkBtn>
                  {isCreator ? <span style={{ color: colors.textMuted }}>—</span> : (
                    <button onClick={() => setRemoveTarget(m)} title="删除成员" aria-label={`删除成员 ${m.name}`}
                      style={{
                        background: "none", border: `1px solid ${colors.border}`,
                        color: colors.textMuted, padding: "4px 9px", borderRadius: 7,
                        fontSize: 12, cursor: "pointer",
                      }}>
                      <Trash2 style={{ width: 11, height: 11 }} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </TableScroll>
      </Panel>

      {/* ── 已移除（历史） ── */}
      <Panel title="已移除成员" extra={
        <button onClick={() => setShowRemoved(v => !v)}
          style={{
            background: "none", border: `1px solid ${colors.border}`, color: colors.textMuted,
            borderRadius: 8, padding: "5px 11px", fontSize: 12.5, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
          <History style={{ width: 12, height: 12 }} />
          {showRemoved ? "收起" : `查看 ${removed.length} 人`}
        </button>
      }>
        {!showRemoved ? (
          <div style={{ padding: "14px 20px", fontSize: 12.5, color: colors.textMuted }}>
            已移除成员不占用席位，其历史消耗保留在「用量明细」中可追溯。
          </div>
        ) : removed.length === 0 ? (
          <Empty text="暂无已移除成员" />
        ) : (
          <TableHead columns={["成员 / 账号", "职能", "移除时间", "历史消耗"]} widths={["2fr", "1fr", "1.2fr", "1.4fr"]} />
        )}
        {showRemoved && removed.map((m, i) => {
          const rs = ROLE_STYLE[m.role] ?? { bg: colors.bgHover, color: colors.textMuted };
          const a = getAllocation(m.id);
          return (
            <div key={m.id} style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr 1.4fr",
              alignItems: "center", padding: "12px 20px",
              borderBottom: i < removed.length - 1 ? `1px solid ${colors.border}` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: colors.bgHover,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: colors.textMuted,
                }}>{m.avatar}</div>
                <div>
                  <div style={{ fontSize: 13, color: colors.textSecondary }}>{m.name}</div>
                  <div style={{ fontSize: 11.5, color: colors.textMuted }}>{m.account}</div>
                </div>
              </div>
              <RoleBadge role={m.role} style={rs} />
              <span style={{ fontSize: 12.5, color: colors.textMuted }}>{m.removedAt ?? "—"}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12.5, color: colors.textMuted }}>
                  已用 {a.used.toLocaleString()} 星石
                </span>
                <LinkBtn onClick={() => onOpenUsage(m.id)}>查看明细</LinkBtn>
              </div>
            </div>
          );
        })}
      </Panel>

      {quotaTarget && <AllocationModal member={quotaTarget} onClose={() => setQuotaTarget(null)} onToast={onToast} />}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onToast={onToast} />}
      {removeTarget && (
        <RemoveModal member={removeTarget} onClose={() => setRemoveTarget(null)}
          onDone={(m, ok) => onToast(m, ok ? "ok" : "err")} />
      )}
    </div>
  );
}
