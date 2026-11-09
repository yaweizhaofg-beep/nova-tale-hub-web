import { useState } from "react";
import { colors } from "../../shared";
import { getActiveMembers } from "../../team";
import { getAllocation, getMemberAvailable } from "../../billing";
import type { TeamMember } from "../../team";
import { AllocationModal } from "./StarsTab";
import { Panel, PrimaryBtn } from "./shared";

export default function MemberDetailTab({ focusMemberId, onToast }: {
  focusMemberId?: number | null;
  onToast: (message: string, kind?: "ok" | "err") => void;
}) {
  const [target, setTarget] = useState<TeamMember | null>(null);
  const members = getActiveMembers();
  const cellStyle = { padding: "16px 20px", textAlign: "left" as const, borderBottom: `1px solid ${colors.border}` };

  return (
    <Panel>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse", fontSize: 13, color: colors.textPrimary }}>
          <thead style={{ background: colors.bgSecondary }}>
            <tr>{["成员", "剩余额度", "最新分配额度", "已消耗额度", "操作"].map(label => (
              <th key={label} scope="col" style={{ ...cellStyle, fontSize: 12, fontWeight: 500, color: colors.textMuted }}>{label}</th>
            ))}</tr>
          </thead>
          <tbody>
            {members.length === 0 && <tr><td colSpan={5} style={cellStyle}>暂无成员</td></tr>}
            {members.map(member => {
              const allocation = getAllocation(member.id);
              return (
                <tr key={member.id} style={{ background: member.id === focusMemberId ? colors.accentDim : undefined }}>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span aria-hidden="true" style={{
                        width: 32, height: 32, display: "grid", placeItems: "center",
                        background: colors.bgElevated, borderRadius: "50%", color: colors.accent,
                      }}>{member.avatar}</span>
                      <strong>{member.name}</strong>
                    </div>
                  </td>
                  <td style={{ ...cellStyle, color: colors.success }}>{getMemberAvailable(member.id).toLocaleString()}</td>
                  <td style={cellStyle}>{allocation.allocated.toLocaleString()}</td>
                  <td style={{ ...cellStyle, color: colors.textSecondary }}>{allocation.used.toLocaleString()}</td>
                  <td style={cellStyle}><PrimaryBtn onClick={() => setTarget(member)}>管理额度</PrimaryBtn></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {target && <AllocationModal member={target} onClose={() => setTarget(null)} onToast={onToast} />}
    </Panel>
  );
}
