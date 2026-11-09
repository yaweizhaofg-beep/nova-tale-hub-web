import { useState } from "react";
import { ALL_TASKS } from "../records";
import type { SpaceKind } from "../billing";
import { colors, TEAM_OWNER_ID } from "../shared";
import type { Nav } from "../shared";
import { GhostBtn, ModalShell, ModalHead, ModalFoot } from "../pages/team/shared";

export function notificationTasks(scope: SpaceKind) {
  return ALL_TASKS.filter(task => task.space === scope && (scope === "team" || task.memberId === TEAM_OWNER_ID))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 50);
}

export default function TaskNotifications({ scope, readIds, onRead, onClose, navigate }: Nav & {
  scope: SpaceKind;
  readIds: Set<string>;
  onRead: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const tasks = notificationTasks(scope);
  const shown = tasks.filter(task => filter === "all" || task.status === "失败");
  const keyOf = (id: string) => scope + ":" + id;
  const unread = tasks.filter(task => !readIds.has(keyOf(task.taskId))).length;

  return (
    <ModalShell onClose={onClose} width={680}>
      <div role="dialog" aria-modal="true" aria-label="任务通知">
        <ModalHead title="消息通知" sub={`任务 · ${unread} 条未读`} onClose={onClose} />
        <div style={{ padding: "12px 20px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <strong style={{ color: colors.accent, fontSize: 13 }}>任务</strong>
          <select aria-label="通知筛选" value={filter} onChange={event => setFilter(event.target.value)}
            style={{ marginLeft: "auto", padding: 7, borderRadius: 8, background: colors.bgSecondary, border: `1px solid ${colors.border}`, color: colors.textPrimary }}>
            <option value="all">全部任务</option><option value="error">报错任务</option>
          </select>
        </div>
        <div style={{ maxHeight: "58vh", overflowY: "auto", padding: "0 20px 16px" }}>
          {shown.length === 0 && <p style={{ color: colors.textMuted, fontSize: 12 }}>暂无任务通知</p>}
          {shown.map(task => (
            <article key={task.taskId} style={{ padding: "16px 0", borderBottom: `1px solid ${colors.border}`, color: colors.textPrimary }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <strong style={{ fontSize: 13 }}>{task.action} · {task.storyboard}</strong>
                <span style={{ color: task.status === "失败" ? colors.error : colors.textSecondary, fontSize: 11 }}>{task.status}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: readIds.has(keyOf(task.taskId)) ? colors.textMuted : colors.accent }}>
                  {readIds.has(keyOf(task.taskId)) ? "已读" : "未读"}
                </span>
              </div>
              <p style={{ fontSize: 11, color: colors.textMuted, overflowWrap: "anywhere" }}>{task.project} · {task.model} · {task.taskId}</p>
              {task.status === "失败" && <p style={{ fontSize: 12, color: colors.error }}>报错信息　{task.failReason || "暂无详细错误信息"}</p>}
              <details onToggle={event => { if (event.currentTarget.open) onRead([keyOf(task.taskId)]); }}>
                <summary style={{ fontSize: 12, cursor: "pointer", color: colors.textSecondary }}>操作历史记录</summary>
                <ol style={{ fontSize: 12, color: colors.textSecondary, paddingLeft: 20, lineHeight: 1.9 }}>
                  <li>{task.startedAt}　提交任务</li>
                  {task.endedAt && <li>{task.endedAt}　{task.status === "失败" ? "执行失败" : "执行完成"}</li>}
                  {!task.endedAt && <li>{task.status === "排队中" ? "等待执行" : "任务执行中"}</li>}
                </ol>
              </details>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <GhostBtn onClick={() => {
                  onRead([keyOf(task.taskId)]);
                  onClose();
                  const day = task.startedAt.slice(0, 10);
                  navigate(scope === "team" ? "team-tasks" : "my-tasks",
                    { task: task.taskId, dfrom: day, dto: day, view: "tasks", member: null, cat: null, project: null, model: null, status: null, q: null, pg: null, source: null });
                }}>查看任务</GhostBtn>
              </div>
            </article>
          ))}
        </div>
        <ModalFoot><GhostBtn onClick={() => onRead(tasks.map(task => keyOf(task.taskId)))} disabled={unread === 0}>全部标记已读</GhostBtn><GhostBtn onClick={onClose}>关闭</GhostBtn></ModalFoot>
      </div>
    </ModalShell>
  );
}
