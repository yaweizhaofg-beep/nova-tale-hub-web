import { useState } from "react";
import type { CSSProperties } from "react";
import "./usage-charts.css";
import type { TaskRecord } from "../../records";
import { colors } from "../../shared";
import { getTasksInRange, aggregateByMember, getDateRange, TEAM_TASK_LIST } from "../../records";
import { getMemberById } from "../../team";
import { Panel, GhostBtn } from "./shared";
import type { UsageRoute } from "./route";

const format = (value: number) => value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });

const palette = [colors.accent, colors.purple, colors.info, colors.success, colors.warning, colors.error];

interface Series {
  key: string;
  name: string;
  color: string;
  total: number;
  byDay: Map<string, number>;
}

function groupSeries(tasks: TaskRecord[], keyOf: (task: TaskRecord) => string,
  nameOf: (key: string) => string, universeKey: (task: TaskRecord) => string): Series[] {
  const keys = [...new Set(TEAM_TASK_LIST.map(universeKey))].sort();
  const grouped = new Map<string, Series>();
  for (const task of tasks) {
    const key = keyOf(task);
    const series = grouped.get(key) ?? {
      key, name: nameOf(key), color: palette[Math.max(0, keys.indexOf(key)) % palette.length], total: 0, byDay: new Map<string, number>(),
    };
    series.total += task.actual;
    const day = task.startedAt.slice(0, 10);
    series.byDay.set(day, (series.byDay.get(day) ?? 0) + task.actual);
    grouped.set(key, series);
  }
  return [...grouped.values()].sort((a, b) => b.total - a.total);
}

function ChartLegend({ series, total }: { series: Series[]; total?: number }) {
  return <ul className="usage-legend">{series.map(item => <li key={item.key}>
    <i style={{ background: item.color }} aria-hidden="true" />
    <span>{item.name}</span><strong>{format(item.total)}{total ? ` · ${format(item.total / total * 100)}%` : " 星石"}</strong>
  </li>)}</ul>;
}

function ChartEmpty() {
  return <div className="usage-chart-empty">所选时段暂无消耗</div>;
}

function ChartAxes({ days, maximum, width }: { days: string[]; maximum: number; width: number }) {
  const span = width - 70;
  const interval = Math.max(1, Math.ceil((days.length - 1) / 4));
  return <g fontSize="10" fill={colors.textMuted}>
    {[0, 1, 2, 3].map(tick => <g key={tick}>
      <line x1="48" x2={width - 22} y1={200 - tick * 55} y2={200 - tick * 55} stroke={colors.border} />
      <text x="40" y={204 - tick * 55} textAnchor="end">{format(maximum * tick / 3)}</text>
    </g>)}
    {days.map((day, index) => index % interval === 0 || index === days.length - 1 ?
      <text key={day} x={days.length === 1 ? 48 + span / 2 : 48 + index * span / (days.length - 1)}
        y="222" textAnchor="middle">{day.slice(5)}</text> : null)}
  </g>;
}

export default function TeamUsageSummary({ route, onChange, onOpenTasks }: {
  route: UsageRoute;
  onChange: (patch: Partial<UsageRoute>) => void;
  onOpenTasks: (route: UsageRoute) => void;
}) {
  const [selectedProjects, setSelectedProjects] = useState<string[] | null>(null);
  const tasks = getTasksInRange(route.from, route.to);
  const rows = aggregateByMember(tasks);
  const days = getDateRange(route.from, route.to);
  const total = tasks.reduce((sum, task) => sum + task.actual, 0);
  const memberSeries = groupSeries(tasks, task => String(task.memberId), key => getMemberById(Number(key))?.name ?? "未知成员", task => String(task.memberId));
  const modelSeries = groupSeries(tasks, task => task.model, key => key, task => task.model);
  const projectSeries = groupSeries(tasks, task => task.projectId || "unlinked",
    key => TEAM_TASK_LIST.find(task => task.projectId === key)?.project || "未关联项目", task => task.projectId || "unlinked");
  const memberPeak = Math.max(1, ...days.map(day => memberSeries.reduce((sum, member) => sum + (member.byDay.get(day) ?? 0), 0)));
  const visibleProjects = selectedProjects === null ? projectSeries : projectSeries.filter(project => selectedProjects.includes(project.key));
  const projectPeak = Math.max(1, ...visibleProjects.flatMap(project => [...project.byDay.values()]));
  const inputStyle = { padding: "7px 10px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bgSecondary, color: colors.textPrimary, fontSize: 12, colorScheme: "dark" };
  const cellStyle = { padding: "12px 18px", textAlign: "left" as const, borderBottom: `1px solid ${colors.border}` };

  return (
    <div className="usage-summary" style={{
      "--usage-text": colors.textPrimary, "--usage-muted": colors.textMuted, "--usage-secondary": colors.textSecondary,
    } as CSSProperties}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <strong style={{ fontSize: 14, color: colors.textPrimary, marginRight: "auto" }}>用量统计</strong>
        <input aria-label="开始日期" type="date" style={inputStyle} value={route.from} max={route.to}
          onChange={event => event.target.value && onChange({ from: event.target.value })} />
        <span style={{ fontSize: 12, color: colors.textMuted }}>至</span>
        <input aria-label="结束日期" type="date" style={inputStyle} value={route.to} min={route.from}
          onChange={event => event.target.value && onChange({ to: event.target.value })} />
      </div>
      <div className="usage-summary-stats">
        {[["已结算消耗", format(total) + " 星石"], ["任务数", tasks.length + " 条"], ["使用成员", rows.length + " 人"]].map(([label, value]) => (
          <div key={label}><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <Panel title="成员用量统计" extra={<span className="usage-unit">星石 / 日</span>}>
        {total > 0 ? <div className="usage-chart-body">
          <svg viewBox="0 0 720 230" role="img" aria-label="按成员分色的每日消耗柱状图">
            <ChartAxes days={days} maximum={memberPeak} width={720} />
            {days.map((day, index) => {
              let bottom = 200;
              const barWidth = Math.min(28, 650 / days.length * 0.68);
              const x = (days.length === 1 ? 373 : 48 + index * 650 / (days.length - 1)) - barWidth / 2;
              return <g key={day}>
                {memberSeries.map(series => {
                  const amount = series.byDay.get(day) ?? 0;
                  const height = amount / memberPeak * 165;
                  bottom -= height;
                  return <rect key={series.key} x={x} y={bottom} width={barWidth} height={height}
                    fill={series.color} tabIndex={amount > 0 ? 0 : undefined}>
                    <title>{day} · {series.name} · {format(amount)} 星石</title>
                  </rect>;
                })}
              </g>;
            })}
          </svg>
          <ChartLegend series={memberSeries} />
        </div> : <ChartEmpty />}
      </Panel>
      <div className="usage-chart-grid">
        <Panel title="模型消耗占比">
          {total > 0 ? <div className="usage-chart-body usage-donut-layout">
            <svg viewBox="0 0 200 200" role="img" aria-label="模型消耗环形图">
              <circle cx="100" cy="100" r="72" fill="none" stroke={colors.border} strokeWidth="24" />
              {modelSeries.map((series, index) => {
                const offset = modelSeries.slice(0, index).reduce((sum, model) => sum + model.total, 0) / total * 100;
                return <circle key={series.key} cx="100" cy="100" r="72" fill="none" stroke={series.color}
                  strokeWidth="24" pathLength="100" strokeDasharray={`${series.total / total * 100} 100`}
                  strokeDashoffset={-offset} transform="rotate(-90 100 100)" tabIndex={0}>
                  <title>{series.name} · {format(series.total)} 星石 · {format(series.total / total * 100)}%</title>
                </circle>;
              })}
              <text x="100" y="95" textAnchor="middle" fill={colors.textPrimary} fontSize="20" fontWeight="700">{format(total)}</text>
              <text x="100" y="117" textAnchor="middle" fill={colors.textMuted} fontSize="11">消耗星石</text>
            </svg>
            <ChartLegend series={modelSeries} total={total} />
          </div> : <ChartEmpty />}
        </Panel>
        <Panel title="项目消耗趋势" extra={
          <details className="usage-project-picker">
            <summary>选择项目（{visibleProjects.length}）</summary>
            <div>
              <button type="button" onClick={() => setSelectedProjects(null)}>全选</button>
              <button type="button" onClick={() => setSelectedProjects([])}>清空</button>
              {[...new Map(TEAM_TASK_LIST.map(task => [task.projectId || "unlinked", task.project || "未关联项目"])).entries()].map(([id, name]) => (
                <label key={id}><input type="checkbox" aria-label={`项目 ${name}`}
                  checked={selectedProjects === null || selectedProjects.includes(id)}
                  onChange={event => {
                    const all = [...new Set(TEAM_TASK_LIST.map(task => task.projectId || "unlinked"))];
                    const current = selectedProjects ?? all;
                    setSelectedProjects(event.target.checked ? [...current, id] : current.filter(key => key !== id));
                  }} />{name}</label>
              ))}
            </div>
          </details>
        }>
          {total > 0 ? <div className="usage-chart-body">
            <svg viewBox="0 0 600 230" role="img" aria-label="各项目每日消耗曲线图">
              <ChartAxes days={days} maximum={projectPeak} width={600} />
              {visibleProjects.map(series => {
                const points = days.map((day, index) => ({
                  x: days.length === 1 ? 312 : 48 + index * 530 / Math.max(1, days.length - 1),
                  y: 200 - (series.byDay.get(day) ?? 0) / projectPeak * 165,
                  day, value: series.byDay.get(day) ?? 0,
                }));
                const path = points.map((point, index) => {
                  if (index === 0) return `M ${point.x} ${point.y}`;
                  const previous = points[index - 1];
                  const middle = (previous.x + point.x) / 2;
                  return `C ${middle} ${previous.y} ${middle} ${point.y} ${point.x} ${point.y}`;
                }).join(" ");
                return <g key={series.key}>
                  <path d={path} stroke={series.color} strokeWidth="2.5" fill="none" />
                  {points.map(point => <circle key={point.day} cx={point.x} cy={point.y} r="3.5" fill={series.color} tabIndex={0}>
                    <title>{point.day} · {series.name} · {format(point.value)} 星石</title>
                  </circle>)}
                </g>;
              })}
            </svg>
            {visibleProjects.length === 0 && <p className="usage-unit">{selectedProjects?.length === 0 ? "请选择要查看的项目" : "所选项目在此时段暂无消耗"}</p>}
            <ChartLegend series={visibleProjects} />
          </div> : <ChartEmpty />}
        </Panel>
      </div>
      <Panel title="成员用量" extra={<GhostBtn onClick={() => onOpenTasks({ ...route, member: null, task: null, pg: 1 })}>查看全部任务</GhostBtn>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 550, borderCollapse: "collapse", color: colors.textPrimary, fontSize: 12 }}>
            <thead style={{ color: colors.textMuted }}><tr>
              {["成员", "消耗星石", "任务数", "最近使用", "操作"].map(label => <th key={label} style={cellStyle}>{label}</th>)}
            </tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} style={cellStyle}>所选时段暂无用量</td></tr>}
              {rows.map(row => {
                const member = getMemberById(row.memberId);
                return <tr key={row.memberId}>
                  <td style={cellStyle}>{member?.name ?? "未知成员"}{member?.seat === "removed" ? "（已移除）" : ""}</td>
                  <td style={cellStyle}>{format(row.actual)}</td><td style={cellStyle}>{row.count}</td><td style={cellStyle}>{row.last}</td>
                  <td style={cellStyle}><GhostBtn onClick={() => onOpenTasks({ ...route, member: row.memberId, task: null, pg: 1 })}>查看任务</GhostBtn></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
