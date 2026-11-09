// ═══════════════════════════════════════════════════════════════════════════════════
// src/pages/team/TaskDetail.tsx — 任务详情（右栏）
//
// 按任务类型展示实际内容：
//   语言模型 → 输入提示词 + 输出文本
//   图片生成 → 提示词 + 参考图 + 生成图
//   视频生成 → 提示词 + 参考图片／视频／音频 + 输出视频或文件
//   失败任务 → 已有失败原因
// 结算信息放在独立的「星石结算」区：预计冻结 / 实扣 / 退回 / 结算状态。
// ═══════════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import {
  AlertTriangle, Copy, Check, FileText, Image as ImageIcon, Video, Music, Download,
} from "lucide-react";
import { colors } from "../../shared";
import {
  getSettlementsByTaskId, formatDuration, STATUS_META,
} from "../../records";
import type { TaskAsset, TaskRecord } from "../../records";
import {
  Panel, Tag, DemoBadge, GhostBtn, Empty, LinkBtn,
} from "./shared";

function fmt(n: number): string {
  return n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

const ASSET_ICON: Record<TaskAsset["kind"], typeof ImageIcon> = {
  图片: ImageIcon,
  视频: Video,
  音频: Music,
  文件: FileText,
};

/** 可复制的文本块 */
function CopyBlock({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: colors.textMuted }}>{label}</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(text).then(
              () => { setCopied(true); setTimeout(() => setCopied(false), 1600); },
              () => setCopied(false),
            );
          }}
          style={{
            marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 10.5, color: copied ? colors.success : colors.textMuted,
          }}
        >
          {copied ? <Check style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <div style={{
        padding: "11px 13px", borderRadius: 10, maxHeight: 220, overflowY: "auto",
        background: colors.bgSecondary, border: `1px solid ${colors.border}`,
        fontSize: 12, lineHeight: 1.75, color: colors.textSecondary,
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>{text}</div>
    </div>
  );
}

/** 素材块 */
function AssetBlock({ title, assets, emptyText }: {
  title: string;
  assets: TaskAsset[];
  emptyText: string;
}) {
  if (assets.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.textMuted, marginBottom: 7 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: colors.textDisabled }}>{emptyText}</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.textMuted, marginBottom: 7 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {assets.map((a, i) => {
          const Icon = ASSET_ICON[a.kind] ?? FileText;
          return (
            <div key={`${a.name}-${i}`} style={{
              borderRadius: 10, overflow: "hidden",
              border: `1px solid ${colors.border}`,
              background: colors.bgSecondary,
            }}>
              <div style={{
                height: 82, display: "flex", alignItems: "center", justifyContent: "center",
                background: a.accessible && a.url
                  ? `center/cover no-repeat url("${a.url}")`
                  : "rgba(255,255,255,.03)",
                color: colors.textDisabled,
              }}>
                {!(a.accessible && a.url) && <Icon style={{ width: 20, height: 20 }} />}
              </div>
              <div style={{ padding: "8px 10px" }}>
                <div style={{
                  fontSize: 11, color: colors.textSecondary,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{a.name}</div>
                <div style={{ fontSize: 9.5, color: a.accessible ? colors.success : colors.warning, marginTop: 3 }}>
                  {a.accessible ? `${a.kind} · 可访问` : `${a.kind} · 不可访问`}
                </div>
                {!a.accessible && a.note && (
                  <div style={{ fontSize: 9.5, color: colors.textDisabled, marginTop: 3, lineHeight: 1.5 }}>
                    {a.note}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskFacts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="task-facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function TaskDetail({
  task, memberName, onOpenSettlement, onClose, closeLabel = "关闭",
}: {
  task: TaskRecord | undefined;
  memberName?: string;
  /** 打开该任务的结算流水（仅在确有流水时提供） */
  onOpenSettlement?: (taskId: string) => void;
  onClose?: () => void;
  closeLabel?: string;
}) {
  if (!task) {
    return (
      <Panel title="任务详情" style={{ height: "100%" }}>
        <Empty text="请从左侧选择一条任务" hint="点击任意一行查看该任务的执行内容与结算信息" />
      </Panel>
    );
  }

  const meta = STATUS_META[task.status];
  const settlements = getSettlementsByTaskId(task.taskId);
  const isFailed = task.status === "失败";
  const pending = task.status === "进行中" || task.status === "排队中";

  const info: [string, string][] = [
    ["任务 ID", task.taskId],
    ["模型", task.model],
    ["项目 / 分镜", [task.project, task.storyboard].filter(Boolean).join(" · ") || "—"],
    ["开始时间 / 耗时", `${task.startedAt} · ${formatDuration(task.durationSec)}`],
  ];
  const technicalInfo: [string, string][] = [
    ["任务号", task.taskNo],
    ["类型", task.category],
    ["集", task.episode],
    ["结束时间", task.endedAt ?? (pending ? "进行中" : "—")],
  ];
  if (task.space === "team") technicalInfo.push(["执行成员", memberName ?? `成员${task.memberId}`]);
  if (task.spec) technicalInfo.push(["规格", task.spec]);

  return (
    <Panel
      title={task.action}
      extra={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tag label={meta.label} color={meta.color} bg={meta.bg} />
          {onClose && <LinkBtn onClick={onClose}>{closeLabel}</LinkBtn>}
        </div>
      }
    >
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
        {/* 基本信息 */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.textMuted, marginBottom: 8 }}>基本信息</div>
          <TaskFacts rows={info} />
          <details className="task-technical">
            <summary>更多任务信息</summary>
            <TaskFacts rows={technicalInfo} />
          </details>
        </div>

        {/* 失败原因 */}
        {isFailed && task.failReason && (
          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: "rgba(248,113,113,.07)", border: "1px solid rgba(248,113,113,.22)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
              <AlertTriangle style={{ width: 13, height: 13, color: colors.error }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: colors.error }}>失败原因</span>
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>{task.failReason}</div>
          </div>
        )}

        {/* 语言模型：输入 / 输出 */}
        {task.category === "语言模型" && (
          <>
            <CopyBlock label="输入提示词" text={task.prompt} />
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.textMuted, marginBottom: 7 }}>输出文本</div>
              {task.output ? (
                <CopyBlock label="" text={task.output} />
              ) : (
                <div style={{
                  padding: "11px 13px", borderRadius: 10,
                  background: colors.bgSecondary, border: `1px solid ${colors.border}`,
                  fontSize: 11.5, color: colors.textDisabled,
                }}>
                  {pending ? "任务尚未完成，暂无输出" : "本次执行没有产生输出"}
                </div>
              )}
            </div>
          </>
        )}

        {/* 图片 / 视频：提示词 + 素材 + 产物 */}
        {(task.category === "图片生成" || task.category === "视频生成") && (
          <>
            <CopyBlock
              label={task.category === "图片生成" ? "图片提示词" : "视频提示词"}
              text={task.prompt}
            />
            <AssetBlock
              title="参考素材"
              assets={task.refs}
              emptyText={task.category === "图片生成" ? "未关联参考图" : "未关联参考图片／视频／音频"}
            />
            <AssetBlock
              title="生成产物"
              assets={task.artifacts}
              emptyText={pending ? "任务进行中，暂无产物" : "本次执行没有产生产物"}
            />
            {task.artifacts.some(a => a.accessible) && (
              <GhostBtn
                style={{ alignSelf: "flex-start" }}
                onClick={() => {
                  const a = task.artifacts.find(x => x.accessible);
                  if (!a?.url) return;
                  const w = window.open();
                  if (w) w.document.write(`<img src="${a.url}" style="max-width:100%"/>`);
                }}
              >
                <Download style={{ width: 13, height: 13 }} />预览产物
              </GhostBtn>
            )}
          </>
        )}

        {/* 星石结算 */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.textMuted, marginBottom: 8 }}>星石结算</div>
          <div style={{
            padding: 12, borderRadius: 10,
            background: colors.bgSecondary, border: `1px solid ${colors.border}`,
          }}>
            {([
              ["预计冻结", fmt(task.frozen), colors.textSecondary],
              ["实扣", fmt(task.actual), colors.accent],
              ["退回", task.refund > 0 ? fmt(task.refund) : "—", task.refund > 0 ? colors.success : colors.textDisabled],
              ["结算状态", task.settleStatus, task.settleStatus === "已结算" ? colors.success : colors.warning],
            ] as [string, string, string][]).map(([k, v, c], i) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: i === 0 ? "0 0 7px" : "7px 0",
                borderTop: i === 0 ? "none" : `1px solid ${colors.border}`,
                fontSize: 12,
              }}>
                <span style={{ color: colors.textMuted }}>{k}</span>
                <span style={{ color: c, fontWeight: 600 }}>{v}</span>
              </div>
            ))}

            {/* 关联流水 */}
            {settlements.length > 0 ? (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 7 }}>
                  关联结算流水（{settlements.length} 条）
                </div>
                {settlements.map((s, i) => (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    fontSize: 11, padding: "4px 0",
                  }}>
                    <span style={{ color: colors.textDisabled, fontFamily: "ui-monospace, monospace" }}>{s.id}</span>
                    <span style={{ color: colors.textMuted }}>{s.time}</span>
                    <span style={{ marginLeft: "auto", color: colors.textSecondary }}>
                      {s.actual > 0 ? `实扣 ${fmt(s.actual)}` : s.refund > 0 ? `退回 ${fmt(s.refund)}` : "—"}
                    </span>
                    {i === 0 && onOpenSettlement && (
                      <LinkBtn onClick={() => onOpenSettlement(task.taskId)}>查看结算流水</LinkBtn>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: 11, color: colors.textDisabled }}>暂无关联结算流水</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ paddingTop: 4 }}>
          <DemoBadge text="任务内容为演示数据，素材与产物为占位文件" />
        </div>
      </div>
    </Panel>
  );
}
