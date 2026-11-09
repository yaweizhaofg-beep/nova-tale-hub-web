// ═══════════════════════════════════════════════════════════════════════════════════
// records.ts — 任务执行记录与结算流水的唯一数据源
//
// 用途：
//   1. 团队「用量明细」的三个子视图（团队概览 / 成员用量 / 任务明细）都读这里；
//   2. 全局「账单」页的结算流水也读这里，保证任务 ID 可以跨页互相定位；
//   3. 「结果详情」页按任务 ID 读取同一条记录。
//
// ⚠️ 全部为前端演示数据，不接入任何真实服务；内容为虚构样例。
// ═══════════════════════════════════════════════════════════════════════════════════

import { TEAM_MEMBERS_INIT, TEAM_OWNER_ID } from "./shared";

// ─── 类型 ─────────────────────────────────────────────────────────────────────

/** 任务类别（对应左栏类别入口） */
export type TaskCategory = "语言模型" | "图片生成" | "视频生成";

/** 任务状态 —— 取自执行记录 */
export type TaskStatus = "成功" | "失败" | "进行中" | "排队中";

/** 结算状态 —— 取自结算记录，与任务状态相互独立 */
export type SettleStatus = "已结算" | "结算中" | "未结算";

export type SpaceKind = "personal" | "team";

/** 素材（参考素材 / 生成产物） */
export interface TaskAsset {
  kind: "图片" | "视频" | "音频" | "文件";
  name: string;
  /** 是否在当前空间与授权范围内可访问 */
  accessible: boolean;
  /** 可访问时的预览地址（演示用内联占位图） */
  url?: string;
  /** 不可访问时说明原因 */
  note?: string;
}

/** 任务执行记录 */
export interface TaskRecord {
  /** 任务 ID —— 团队用量、账单、结果页共用的稳定标识 */
  taskId: string;
  /** 任务号 —— 与任务 ID 分别展示的业务编号 */
  taskNo: string;
  /** 任务类别 */
  category: TaskCategory;
  /** 任务动作（类别下的具体操作） */
  action: string;
  /** 执行成员 ID */
  memberId: number;
  /** 项目名 */
  project: string;
  /** 项目 ID */
  projectId: string;
  /** 集 */
  episode: string;
  /** 分镜号 */
  storyboard: string;
  /** 模型 */
  model: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 输入提示词 */
  prompt: string;
  /** 输出文本（语言模型） */
  output?: string;
  /** 参考素材 */
  refs: TaskAsset[];
  /** 生成产物 */
  artifacts: TaskAsset[];
  /** 失败原因（失败任务） */
  failReason?: string;
  /** 开始时间 */
  startedAt: string;
  /** 结束时间 */
  endedAt?: string;
  /** 耗时（秒） */
  durationSec?: number;
  /** 规格 */
  spec?: string;
  /** 预计冻结 */
  frozen: number;
  /** 实扣 */
  actual: number;
  /** 退回 */
  refund: number;
  /** 结算状态 */
  settleStatus: SettleStatus;
  /** 所属空间 */
  space: SpaceKind;
}

/** 结算流水（账单页一行） */
export interface SettlementLine {
  /** 流水 ID：任务流水与 taskId 一致，订单流水为 ORDER-* */
  id: string;
  kind: "task" | "order";
  space: SpaceKind;
  /** 类型（任务类型或套餐名） */
  type: string;
  model: string;
  frozen: number;
  actual: number;
  refund: number;
  /** 流水后余额（legacy 个人流水保留原值） */
  balance?: number;
  time: string;
  /** 订单金额（元） */
  amount?: number;
  /** 关联任务 ID */
  taskId?: string;
  /** 是否为 legacy 固定样例 */
  legacy?: boolean;
}

// ─── 常量 ─────────────────────────────────────────────────────────────────────

/** 演示「今天」 */
export const TODAY = "2026-11-05";

/** 演示「现在」 */
export const NOW_STAMP = "2026-11-05 09:00";

/** 任务表默认每页条数 */
export const TASK_PAGE_SIZE = 20;

/** 任务类别入口 */
export const TASK_CATEGORIES: TaskCategory[] = ["语言模型", "图片生成", "视频生成"];

/** 任务状态入口 */
export const TASK_STATUSES: TaskStatus[] = ["成功", "失败", "进行中", "排队中"];

export const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  成功:   { label: "成功",   color: "#22c55e", bg: "rgba(34,197,94,.12)" },
  失败:   { label: "失败",   color: "#f87171", bg: "rgba(248,113,113,.12)" },
  进行中: { label: "进行中", color: "#38bdf8", bg: "rgba(56,189,248,.12)" },
  排队中: { label: "排队中", color: "#ffac30", bg: "rgba(255,172,48,.12)" },
};

// ─── 演示素材占位（内联 SVG，无外部依赖）─────────────────────────────────────

/**
 * 生成一张内联 SVG 占位图。
 * 网页版当前没有真实的素材库接口，这里用占位图表达「有产物且可访问」，
 * 界面需如实标注演示数据。
 */
function placeholder(label: string, hue: number, w = 320, h = 180): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="hsl(${hue},45%,22%)"/>` +
    `<stop offset="100%" stop-color="hsl(${(hue + 48) % 360},38%,12%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
    `<circle cx="${w * 0.78}" cy="${h * 0.26}" r="${h * 0.22}" fill="hsl(${hue},60%,58%)" opacity="0.28"/>` +
    `<path d="M0 ${h * 0.78} L${w * 0.28} ${h * 0.5} L${w * 0.52} ${h * 0.72} L${w * 0.72} ${h * 0.58} L${w} ${h * 0.8} L${w} ${h} L0 ${h} Z" fill="hsl(${(hue + 20) % 360},40%,10%)" opacity="0.8"/>` +
    `<text x="14" y="${h - 16}" font-family="system-ui,sans-serif" font-size="13" fill="rgba(255,255,255,.72)">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ─── 项目与集 ─────────────────────────────────────────────────────────────────

export interface ProjectInfo {
  id: string;
  name: string;
  episodes: string[];
}

export const PROJECTS: ProjectInfo[] = [
  { id: "PRJ-20260821-014", name: "《镜像》",       episodes: ["第03集《回声》", "第04集《裂隙》"] },
  { id: "PRJ-20260912-003", name: "《星际孤途》",   episodes: ["第01集《启程》", "第02集《深空》"] },
  { id: "PRJ-20261005-021", name: "《隐秘角落》",   episodes: ["第02集《雨夜》"] },
];

// ─── 模型与动作 ───────────────────────────────────────────────────────────────

export interface ModelInfo {
  name: string;
  category: TaskCategory;
  /** 单价参考（星石） */
  base: number;
}

export const MODELS: ModelInfo[] = [
  { name: "星核 LLM Pro",      category: "语言模型", base: 0.42 },
  { name: "星核 LLM Lite",     category: "语言模型", base: 0.18 },
  { name: "Flux 1.1 Pro",      category: "图片生成", base: 4.2 },
  { name: "SDXL Turbo",        category: "图片生成", base: 2.6 },
  { name: "Seedance 2.0 Fast", category: "视频生成", base: 18.55 },
  { name: "Seedance 2.0 Pro",  category: "视频生成", base: 26.4 },
  { name: "Wan 2.1 I2V",       category: "视频生成", base: 15.6 },
];

/** 类别 → 任务动作 */
export const ACTIONS: Record<TaskCategory, string[]> = {
  语言模型: ["文案改写", "提示词推理", "剧本续写", "角色小传"],
  图片生成: ["角色定妆", "场景概念图", "分镜草图"],
  视频生成: ["分镜视频生成", "运镜测试", "特效片段"],
};

// ─── 剧本文本素材（虚构）──────────────────────────────────────────────────────

const CHARACTERS = ["林澈", "苏晚", "周叙", "沈知微", "老陈"];
const MOODS = ["冷调、压抑", "暖调、怀旧", "高对比、硬光", "低饱和、青灰", "霓虹、夜雨"];
const SHOTS = ["推镜", "拉镜", "横移", "手持跟随", "环绕", "固定长镜"];
const SCENES = ["空旷走廊", "雨夜天台", "旧书店", "地铁站台", "废弃剧院", "海岸公路"];
const FX = ["时间倒流", "镜面破碎", "粒子消散", "重力失效", "色彩抽离"];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

// ─── 团队任务生成 ─────────────────────────────────────────────────────────────

/**
 * 生成团队任务记录（覆盖最近 30 天）。
 * 任务 ID 形如 TASK-20261105-1042，任务号形如 XJ-20261105-042。
 */
function buildTeamTasks(): TaskRecord[] {
  const out: TaskRecord[] = [];
  const end = new Date("2026-11-05T00:00:00+08:00");
  const perMember: Record<number, number> = { 1: 2.4, 2: 1.7, 3: 2.2, 4: 1.4, 5: 1.6 };

  for (let d = 29; d >= 0; d--) {
    const day = new Date(end.getTime() - d * 86400000);
    const date = toDateStr(day);
    const dow = day.getUTCDay();
    const weekend = dow === 0 || dow === 6 ? 0.55 : 1;
    let seq = 1000;

    TEAM_MEMBERS_INIT.forEach((m) => {
      const base = perMember[m.id] ?? 1.5;
      const count = Math.max(0, Math.round(base * weekend * (0.78 + ((d * 3 + m.id) % 4) * 0.1)));
      for (let k = 0; k < count; k++) {
        seq += 1;
        out.push(makeTask(date, d, m.id, seq, k));
      }
    });
  }
  return out;
}

function makeTask(date: string, dayOffset: number, memberId: number, seq: number, k: number): TaskRecord {
  const seed = dayOffset * 17 + memberId * 7 + k * 3;
  const category = pick<TaskCategory>(["视频生成", "视频生成", "图片生成", "语言模型"], seed);
  const models = MODELS.filter(m => m.category === category);
  const model = pick(models, seed + 1);
  const action = pick(ACTIONS[category], seed + 2);
  const project = pick(PROJECTS, seed + 3);
  const episode = pick(project.episodes, seed + 4);
  const storyboard = `SB-${String((seed % 18) + 1).padStart(3, "0")}`;
  const model0 = MODELS.find(m => m.name === model.name)!;

  // 状态分布：多数成功，少量失败，临近今天的部分进行中/排队
  const roll = (seed * 7) % 100;
  let status: TaskStatus = "成功";
  if (dayOffset === 0 && roll < 22) status = "进行中";
  else if (dayOffset === 0 && roll < 34) status = "排队中";
  else if (roll < 5) status = "失败";
  else if (dayOffset === 1 && roll < 9) status = "进行中";

  const frozen = Math.round(model0.base * (1 + ((seed + k) % 4) * 0.09) * 100) / 100;
  const refundRate = status === "失败" ? 1 : (seed + k) % 7 === 0 ? 0.02 : 0;
  const refund = Math.round(frozen * refundRate * 100) / 100;
  const actual = status === "成功" ? Math.round((frozen - refund) * 100) / 100 : 0;

  const hh = 8 + ((seed * 5) % 13);
  const mm = (seed * 13 + k * 7) % 60;
  const startedAt = `${date} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  const durationSec = status === "进行中" || status === "排队中"
    ? undefined
    : category === "视频生成" ? 28 + (seed % 150) : category === "图片生成" ? 4 + (seed % 22) : 1 + (seed % 14);
  const endedAt = durationSec !== undefined ? addSeconds(startedAt, durationSec) : undefined;

  const spec = category === "视频生成"
    ? `${pick(["480p", "720p", "1080p"], seed)} · ${pick(["5秒", "8秒", "10秒"], seed + 1)} · ${pick(["9:16", "16:9", "1:1"], seed + 2)} · ${pick(["有声音", "无声音"], seed + 3)}`
    : category === "图片生成"
      ? `${pick(["1024×1024", "1024×1792", "1792×1024"], seed)} · ${pick(["标准", "高清"], seed + 1)}`
      : `${pick(["32K", "128K"], seed)} 上下文 · 温度 ${(0.3 + (seed % 5) * 0.15).toFixed(2)}`;

  const prompt = makePrompt(category, action, project.name, episode, storyboard, seed);
  const output = category === "语言模型" && status === "成功" ? makeOutput(category, action, project.name, episode, storyboard, seed) : undefined;
  const refs = makeRefs(category, seed, status);
  const artifacts = makeArtifacts(category, seed, status);
  const failReason = status === "失败" ? makeFailReason(category, model.name, seed) : undefined;

  return {
    taskId: `TASK-${date.replace(/-/g, "")}-${seq}`,
    taskNo: `XJ-${date.replace(/-/g, "")}-${String(seq % 1000).padStart(3, "0")}`,
    category,
    action,
    memberId,
    project: project.name,
    projectId: project.id,
    episode,
    storyboard,
    model: model.name,
    status,
    prompt,
    output,
    refs,
    artifacts,
    failReason,
    startedAt,
    endedAt,
    durationSec,
    spec,
    frozen,
    actual,
    refund,
    settleStatus: status === "成功" ? (refund > 0 ? "已结算" : "已结算")
      : status === "失败" ? "已结算"
        : status === "进行中" ? "结算中" : "未结算",
    space: "team",
  };
}

function makePrompt(
  category: TaskCategory, action: string,
  project: string, episode: string, sb: string, seed: number,
): string {
  const ch = pick(CHARACTERS, seed);
  const mood = pick(MOODS, seed + 1);
  const scene = pick(SCENES, seed + 2);
  const shot = pick(SHOTS, seed + 3);
  const fx = pick(FX, seed + 4);

  switch (category) {
    case "语言模型":
      if (action === "文案改写") {
        return `将以下台词改写为更口语化的对白，保留「${ch}」的情绪与信息量，不超过 40 字：\n「${scene}里的光断了，我们还在原地。」`;
      }
      if (action === "提示词推理") {
        return `为${project}${episode}分镜 ${sb} 生成视频生成提示词，要求：${mood}，主体动作清晰，镜头${shot}，避免人物面部畸变。`;
      }
      if (action === "剧本续写") {
        return `基于以下前情提要，为${project}${episode}续写一段对白，情绪基调${mood}，字数 200 以内：\n「${ch}第二次回到${scene}，发现时间比离开时早了两小时。」`;
      }
      return `为${project}中的角色「${ch}」生成 300 字角色小传，包含外形、说话习惯与一条人物弧光。`;
    case "图片生成":
      if (action === "角色定妆") {
        return `为${project}角色「${ch}」生成定妆照，半身像，${mood}，柔和影棚光，浅景深，服装为深色风衣。`;
      }
      if (action === "场景概念图") {
        return `${project}${episode}场景概念图：${scene}，${mood}，广角 establishing shot，体积雾，冷色主导。`;
      }
      return `根据分镜「${sb}：${ch}在${scene}回头」生成画面草图，${mood}，构图偏心，留出字幕安全区。`;
    default:
      if (action === "运镜测试") {
        return `测试${shot}运镜：${ch}在${scene}缓慢走过，${mood}，背景保持稳定，无人物形变。`;
      }
      if (action === "特效片段") {
        return `特效片段：${fx}，主体为${scene}中的静止物体，${mood}，镜头固定，8 秒一镜。`;
      }
      return `分镜 ${sb}：${ch}在${scene}回头，${mood}，镜头${shot}，光比 4:1，情绪压抑，画面右侧留出标题空间。`;
  }
}

function makeOutput(
  category: TaskCategory, action: string,
  project: string, episode: string, sb: string, seed: number,
): string {
  const ch = pick(CHARACTERS, seed);
  const scene = pick(SCENES, seed + 2);
  if (category !== "语言模型") return "";
  if (action === "文案改写") {
    return `「灯灭的那一刻，我们还在原地。」（保留原意，去掉书面语，口语化，无信息损失）`;
  }
  if (action === "提示词推理") {
    return [
      `镜头${sb}｜${project}${episode}`,
      `画面：${ch}站在${scene}边缘，逆光剪影，尘埃在光束中缓慢浮动。`,
      `镜头：缓慢推镜至面部特写，焦点由前景虚化衣物过渡到眼神。`,
      `色调：冷蓝主色，阴影保留细节，不使用高对比硬光。`,
      `约束：保持人物五官稳定，双手自然下垂，避免多余肢体。`,
    ].join("\n");
  }
  if (action === "剧本续写") {
    return [
      `${ch}站在${scene}门口，第二次确认墙上的钟。`,
      `「两点。」他说，比上一次更轻。`,
      `没有人回答。风把门推开一条缝，房间里的声音比走廊更近，也更旧。`,
      `（情绪：${pick(MOODS, seed)}；结尾留白，为下一场对白留接口）`,
    ].join("\n");
  }
  return [
    `姓名：${ch}`,
    `外形：身形偏瘦，常年一件深色风衣，右手小指有旧伤。`,
    `说话习惯：短句，很少用形容词，情绪越强语速越慢。`,
    `人物弧光：从「用记录回避感受」到「愿意为他人承担一次不可撤销的选择」。`,
  ].join("\n");
}

function makeRefs(category: TaskCategory, seed: number, status: TaskStatus): TaskAsset[] {
  if (category === "语言模型") return [];
  const refs: TaskAsset[] = [];
  const n = category === "视频生成" ? 2 : 1;
  for (let i = 0; i < n; i++) {
    // 部分素材标记为不可访问，用于验证「缺失项如实显示」
    const accessible = (seed + i) % 7 !== 3;
    refs.push({
      kind: category === "图片生成" ? "图片" : (i === 0 ? "图片" : "视频"),
      name: `ref_${String((seed + i) % 12).padStart(2, "0")}.${category === "视频生成" && i === 1 ? "mp4" : "png"}`,
      accessible,
      url: accessible ? placeholder(`参考素材 ${i + 1}`, (seed * 9 + i * 40) % 360) : undefined,
      note: accessible ? undefined : "未关联素材库记录（演示：素材已下架或超出当前授权范围）",
    });
  }
  if (category === "视频生成" && seed % 5 === 0) {
    refs.push({
      kind: "音频", name: "ambience_03.wav", accessible: true,
      url: placeholder("参考音频", 200), note: undefined,
    });
  }
  if (status === "排队中") return refs.slice(0, 1);
  return refs;
}

function makeArtifacts(category: TaskCategory, seed: number, status: TaskStatus): TaskAsset[] {
  if (status !== "成功") return [];
  if (category === "语言模型") return [];
  if (category === "图片生成") {
    return [{
      kind: "图片", name: `out_${String(seed % 40).padStart(3, "0")}.png`, accessible: true,
      url: placeholder("生成图片", (seed * 13) % 360),
    }];
  }
  return [{
    kind: "视频", name: `out_${String(seed % 40).padStart(3, "0")}.mp4`, accessible: true,
    url: placeholder("生成视频首帧", (seed * 17) % 360),
  }];
}

function makeFailReason(category: TaskCategory, model: string, seed: number): string {
  const reasons: Record<TaskCategory, string[]> = {
    语言模型: [
      "上游模型返回 503，任务在网关阶段中断，未产生输出。",
      "输入超出上下文长度限制，请求被拒绝。",
      "内容安全审核未通过，已终止执行。",
    ],
    图片生成: [
      "生成服务队列超时，任务在排队 15 分钟后被回收。",
      "参考图分辨率超出限制，服务返回参数错误。",
    ],
    视频生成: [
      "生成过程中显存不足，任务在第 3 帧中断。",
      "内容安全审核命中，已终止执行并释放冻结。",
      "素材下载失败，参考视频不可达。",
    ],
  };
  const list = reasons[category];
  return `${list[seed % list.length]}（模型：${model}）`;
}

// ─── 手写演示任务（覆盖 3 类任务，含成功 / 失败 / 进行中）────────────────────

function buildShowcaseTasks(): TaskRecord[] {
  interface MkOpts {
    output?: string;
    refs?: TaskAsset[];
    artifacts?: TaskAsset[];
    failReason?: string;
    spec?: string;
    durationSec?: number;
  }

  const mk = (
    taskId: string, taskNo: string,
    category: TaskCategory, action: string, memberId: number,
    project: ProjectInfo, episode: string, storyboard: string,
    model: string, status: TaskStatus,
    startedAt: string,
    frozen: number, refund: number,
    prompt: string,
    opts: MkOpts = {},
  ): TaskRecord => {
    const { output, refs = [], artifacts = [], failReason, spec, durationSec } = opts;
    return {
      taskId, taskNo, category, action, memberId,
      project: project.name, projectId: project.id, episode, storyboard,
      model, status, prompt, output, refs, artifacts, failReason,
      startedAt,
      endedAt: durationSec !== undefined ? addSeconds(startedAt, durationSec) : undefined,
      durationSec,
      spec: spec ?? (category === "视频生成" ? "1080p · 8秒 · 16:9 · 有声音" : category === "图片生成" ? "1792×1024 · 高清" : "128K 上下文 · 温度 0.70"),
      frozen,
      actual: status === "成功" ? Math.round((frozen - refund) * 100) / 100 : 0,
      refund,
      settleStatus: status === "成功" || status === "失败" ? "已结算" : status === "进行中" ? "结算中" : "未结算",
      space: "team",
    };
  };

  const P = PROJECTS[0];
  const P2 = PROJECTS[1];

  return [
    // 语言模型 · 成功
    mk(
      "TASK-20261105-9001", "XJ-20261105-001",
      "语言模型", "提示词推理", 3,
      P, "第03集《回声》", "SB-004",
      "星核 LLM Pro", "成功",
      "2026-11-05 08:12",
      0.42, 0,
      "为《镜像》第03集《回声》分镜 SB-004 生成视频生成提示词，要求：冷调、压抑，主体动作清晰，镜头缓慢推镜，避免人物面部畸变。",
      {
        durationSec: 9,
        output: [
          "分镜 SB-004｜《镜像》第03集《回声》",
          "画面：林澈站在废弃剧院门口，逆光剪影，尘埃在门缝光束中缓慢浮动。",
          "镜头：缓慢推镜至面部特写，焦点由前景虚化的门框过渡到眼神。",
          "色调：冷蓝主色，阴影保留细节，不使用高对比硬光。",
          "约束：五官稳定，双手自然下垂，避免多余肢体；画面右侧留出标题空间。",
        ].join("\n"),
        spec: "128K 上下文 · 温度 0.70",
      },
    ),
    // 视频生成 · 成功
    mk(
      "TASK-20261105-9002", "XJ-20261105-002",
      "视频生成", "分镜视频生成", 1,
      P, "第03集《回声》", "SB-005",
      "Seedance 2.0 Pro", "成功",
      "2026-11-05 08:41",
      26.4, 0.53,
      "分镜 SB-005：苏晚在雨夜天台回头，冷调、压抑，镜头手持跟随，光比 4:1，情绪压抑，画面右侧留出标题空间。",
      {
        durationSec: 96,
        refs: [
          { kind: "图片", name: "sb005_ref_a.png", accessible: true, url: placeholder("参考图 A", 212) },
          { kind: "视频", name: "sb005_ref_b.mp4", accessible: true, url: placeholder("参考视频 B", 268) },
          { kind: "音频", name: "rain_ambience.wav", accessible: true, url: placeholder("参考音频", 190) },
        ],
        artifacts: [
          { kind: "视频", name: "sb005_out_v3.mp4", accessible: true, url: placeholder("生成视频", 232) },
        ],
        spec: "1080p · 8秒 · 16:9 · 有声音",
      },
    ),
    // 图片生成 · 成功
    mk(
      "TASK-20261104-9003", "XJ-20261104-003",
      "图片生成", "场景概念图", 2,
      P2, "第01集《启程》", "SB-002",
      "Flux 1.1 Pro", "成功",
      "2026-11-04 16:22",
      4.2, 0.08,
      "《星际孤途》第01集《启程》场景概念图：海岸公路，低饱和、青灰，广角 establishing shot，体积雾，冷色主导。",
      {
        durationSec: 12,
        refs: [
          { kind: "图片", name: "coast_ref.png", accessible: true, url: placeholder("参考图", 178) },
        ],
        artifacts: [
          { kind: "图片", name: "coast_concept_v2.png", accessible: true, url: placeholder("生成图片", 158) },
        ],
      },
    ),
    // 视频生成 · 失败
    mk(
      "TASK-20261103-9004", "XJ-20261103-004",
      "视频生成", "特效片段", 5,
      P, "第04集《裂隙》", "SB-009",
      "Wan 2.1 I2V", "失败",
      "2026-11-03 14:05",
      15.6, 15.6,
      "特效片段：重力失效，主体为废弃剧院中的静止椅子，高对比、硬光，镜头固定，8 秒一镜。",
      {
        durationSec: 41,
        refs: [
          { kind: "图片", name: "sb009_ref.png", accessible: false, note: "未关联素材库记录（演示：素材已下架或超出当前授权范围）" },
        ],
        failReason: "生成过程中显存不足，任务在第 3 帧中断。（模型：Wan 2.1 I2V）",
      },
    ),
    // 语言模型 · 失败
    mk(
      "TASK-20261102-9005", "XJ-20261102-005",
      "语言模型", "剧本续写", 4,
      P2, "第02集《深空》", "SB-011",
      "星核 LLM Pro", "失败",
      "2026-11-02 11:38",
      0.42, 0.42,
      "基于前情提要，为《星际孤途》第02集《深空》续写一段对白，情绪基调霓虹、夜雨，字数 200 以内。",
      {
        durationSec: 6,
        failReason: "输入超出上下文长度限制，请求被拒绝。（模型：星核 LLM Pro）",
      },
    ),
    // 视频生成 · 进行中
    mk(
      "TASK-20261105-9006", "XJ-20261105-006",
      "视频生成", "运镜测试", 3,
      P, "第03集《回声》", "SB-007",
      "Seedance 2.0 Fast", "进行中",
      "2026-11-05 09:02",
      18.55, 0,
      "测试环绕运镜：沈知微在地铁站台缓慢走过，冷调、压抑，背景保持稳定，无人物形变。",
      {
        refs: [
          { kind: "图片", name: "sb007_ref.png", accessible: true, url: placeholder("参考图", 320) },
        ],
      },
    ),
    // 图片生成 · 排队中
    mk(
      "TASK-20261105-9007", "XJ-20261105-007",
      "图片生成", "角色定妆", 5,
      P2, "第01集《启程》", "SB-001",
      "SDXL Turbo", "排队中",
      "2026-11-05 09:04",
      2.6, 0,
      "为《星际孤途》角色「周叙」生成定妆照，半身像，高对比、硬光，柔和影棚光，浅景深，服装为深色风衣。",
    ),
  ];
}

// ─── legacy 个人空间样例（保留原账单数据）────────────────────────────────────

/**
 * 个人空间的固定样例任务。
 * 与 BillingPage 原有的 6 条任务流水一一对应，ID 与金额保持不变，
 * 用于修复「账单点 1045 却打开 1048」的错跳。
 */
function buildLegacyTasks(): TaskRecord[] {
  const mk = (
    taskId: string, taskNo: string, type: string, model: string,
    startedAt: string, durationSec: number,
    frozen: number, actual: number, refund: number,
    category: TaskCategory, action: string, prompt: string,
  ): TaskRecord => ({
    taskId, taskNo, category, action,
    memberId: 1, project: "《镜像》", projectId: "PRJ-20260821-014",
    episode: "第03集《回声》", storyboard: "SB-001",
    model, status: "成功", prompt,
    output: category === "语言模型" ? "（个人空间样例：语言模型输出文本）" : undefined,
    refs: category === "语言模型" ? [] : [{
      kind: "图片", name: "legacy_ref.png", accessible: true, url: placeholder("参考图", 300),
    }],
    artifacts: category === "语言模型" ? [] : [{
      kind: "视频", name: "legacy_out.mp4", accessible: true, url: placeholder("生成视频", 310),
    }],
    startedAt, endedAt: addSeconds(startedAt, durationSec), durationSec,
    spec: category === "视频生成" ? "480p · 5秒 · 9:16 · 无声音 · 1张参考图" : undefined,
    frozen, actual, refund,
    settleStatus: "已结算",
    space: "personal",
    // type 保留账单原「类型」文案
    ...(type ? {} : {}),
  });

  return [
    mk("TASK-20260821-1048", "PS-20260821-048", "视频生成", "Seedance 2.0 Fast", "2026-08-21 10:52", 92, 18.55, 18.22, 0.33, "视频生成", "分镜视频生成", "分镜 SB-001：主角站在空旷的走廊，背光，缓慢转身，冷调、压抑。"),
    mk("TASK-20260821-1045", "PS-20260821-045", "视频生成", "Seedance 2.0 Fast", "2026-08-21 10:45", 88, 22.10, 22.10, 0, "视频生成", "分镜视频生成", "分镜 SB-002：特写，眼神迷离，光线从窗缝透入，低饱和、青灰。"),
    mk("TASK-20260821-1032", "PS-20260821-032", "视频生成", "Seedance 2.0 Fast", "2026-08-21 10:32", 84, 19.80, 19.40, 0.40, "视频生成", "分镜视频生成", "分镜 SB-003：两人对话，景深虚化，低调光效，镜头缓慢推镜。"),
    mk("TASK-20260820-2240", "PS-20260820-040", "视频生成", "Wan 2.1 I2V", "2026-08-20 22:40", 76, 15.60, 15.60, 0, "视频生成", "运镜测试", "测试横移运镜：主体走过地铁站台，霓虹、夜雨。"),
    mk("TASK-20260820-1818", "PS-20260820-018", "图片生成", "Flux 1.1 Pro", "2026-08-20 18:18", 9, 4.20, 4.00, 0.20, "图片生成", "场景概念图", "《镜像》第03集场景概念图：旧书店，冷调、压抑，广角。"),
    mk("TASK-20260819-0955", "PS-20260819-055", "视频生成", "Seedance 2.0 Fast", "2026-08-19 09:55", 81, 21.30, 21.30, 0, "视频生成", "分镜视频生成", "分镜 SB-006：主角独坐，窗外车流，暖调、怀旧。"),
  ];
}

// ─── 结算流水 ─────────────────────────────────────────────────────────────────

/** 充值 / 订单流水（两个空间独立） */
export const RECHARGE_LINES: SettlementLine[] = [
  { id: "ORDER-20260821-001", kind: "order", space: "team",     type: "套餐购买",     model: "工作室版",    frozen: 0, actual: 0, refund: 0, time: "2026-08-21 09:00", amount: 1999 },
  { id: "ORDER-20260715-003", kind: "order", space: "personal", type: "套餐购买",     model: "个人创作版",   frozen: 0, actual: 0, refund: 0, time: "2026-07-15 14:30", amount: 299 },
  { id: "ORDER-20260601-011", kind: "order", space: "personal", type: "星石充值",     model: "自定义充值",   frozen: 0, actual: 0, refund: 0, time: "2026-06-01 10:00", amount: 200 },
];

/** legacy 个人空间任务的账单余额（保留原页面数值） */
const LEGACY_BALANCE: Record<string, number> = {
  "TASK-20260821-1048": 2486.0,
  "TASK-20260821-1045": 2504.22,
  "TASK-20260821-1032": 2526.32,
  "TASK-20260820-2240": 5324.72,
  "TASK-20260820-1818": 5340.32,
  "TASK-20260819-0955": 5344.32,
};

/** 团队空间期初余额（演示口径：套餐星石 + 充值星石） */
const TEAM_SPACE_OPENING_BALANCE = 21000 + 19990;

function buildSettlementLines(teamTasks: TaskRecord[], legacyTasks: TaskRecord[]): SettlementLine[] {
  const lines: SettlementLine[] = [];

  legacyTasks.forEach(t => {
    lines.push({
      id: t.taskId, kind: "task", space: "personal",
      type: t.category === "视频生成" ? "视频生成" : "图片生成",
      model: t.model, frozen: t.frozen, actual: t.actual, refund: t.refund,
      balance: LEGACY_BALANCE[t.taskId], time: t.startedAt, taskId: t.taskId, legacy: true,
    });
  });

  // 团队任务流水：按时间倒序累计团队空间余额
  // 仅「已结算」的任务有流水；进行中 / 排队中的任务尚未产生结算记录。
  let teamBalance = TEAM_SPACE_OPENING_BALANCE;
  const sorted = [...teamTasks].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  sorted.forEach(t => {
    if (t.settleStatus !== "已结算") return;
    teamBalance = Math.round((teamBalance - t.actual + t.refund) * 100) / 100;
    lines.push({
      id: t.taskId, kind: "task", space: "team",
      type: t.category, model: t.model,
      frozen: t.frozen, actual: t.actual, refund: t.refund,
      balance: teamBalance, time: t.startedAt, taskId: t.taskId,
    });
  });

  // 一条演示用的追加结算事件：同一任务下的退款调整，用于展示「多条结算事件可展开」
  const multi = teamTasks.find(t => t.taskId === "TASK-20261105-9002");
  if (multi) {
    lines.push({
      id: `${multi.taskId}-ADJ`, kind: "task", space: "team",
      type: "退款调整", model: multi.model,
      frozen: 0, actual: 0, refund: 0.53,
      time: `${multi.startedAt.slice(0, 10)} 12:30`, taskId: multi.taskId,
    });
  }

  return lines;
}

// ─── 组装 ─────────────────────────────────────────────────────────────────────

const SHOWCASE_TASKS = buildShowcaseTasks();
const TEAM_TASKS = buildTeamTasks();
const LEGACY_TASKS = buildLegacyTasks();

/** 全部任务（团队 + 个人 legacy） */
export const ALL_TASKS: TaskRecord[] = [...TEAM_TASKS, ...SHOWCASE_TASKS, ...LEGACY_TASKS];

/** 团队任务 */
export const TEAM_TASK_LIST: TaskRecord[] = [...TEAM_TASKS, ...SHOWCASE_TASKS];

/** 结算流水 */
export const SETTLEMENT_LINES: SettlementLine[] = buildSettlementLines(TEAM_TASK_LIST, LEGACY_TASKS);

const TASK_INDEX = new Map(ALL_TASKS.map(t => [t.taskId, t]));
const LINE_INDEX = new Map(SETTLEMENT_LINES.map(l => [l.id, l]));

// ─── 查询 ─────────────────────────────────────────────────────────────────────

/** 按任务 ID 取任务 */
export function getTaskById(taskId: string): TaskRecord | undefined {
  return TASK_INDEX.get(taskId);
}

/** 按任务 ID 取结算流水（第一条） */
export function getSettlementByTaskId(taskId: string): SettlementLine | undefined {
  return LINE_INDEX.get(taskId);
}

/** 按任务 ID 取全部结算流水（同一任务可能有多条结算事件） */
export function getSettlementsByTaskId(taskId: string): SettlementLine[] {
  return SETTLEMENT_LINES.filter(l => l.taskId === taskId);
}

/** 任务是否有关联结算流水（决定是否提供「查看结算流水」） */
export function hasSettlement(taskId: string): boolean {
  return LINE_INDEX.has(taskId);
}

/** 日期区间内的团队任务 */
export function getTasksInRange(from: string, to: string, space: SpaceKind = "team"): TaskRecord[] {
  return ALL_TASKS.filter(t => t.space === space && (space === "team" || t.memberId === TEAM_OWNER_ID)
    && t.startedAt.slice(0, 10) >= from && t.startedAt.slice(0, 10) <= to);
}

/** 某成员的全部任务（含已移除成员的历史任务） */
export function getMemberUsage(memberId: number): TaskRecord[] {
  return TEAM_TASK_LIST.filter(t => t.memberId === memberId);
}

/** 日期区间内的自然日列表 */
export function getDateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  for (let t = start; t <= end; t += 86400000) out.push(toDateStr(new Date(t)));
  return out;
}

/** 距今 N 天的起始日期（含今天） */
export function getRecentStart(days: number): string {
  const end = new Date("2026-11-05T00:00:00+08:00");
  return toDateStr(new Date(end.getTime() - (days - 1) * 86400000));
}

/** 成员汇总（按实扣降序） */
export interface MemberUsage {
  memberId: number;
  count: number;
  actual: number;
  refund: number;
  frozen: number;
  last: string;
}

export function aggregateByMember(tasks: TaskRecord[]): MemberUsage[] {
  const map = new Map<number, MemberUsage>();
  tasks.forEach(t => {
    const cur = map.get(t.memberId) ?? { memberId: t.memberId, count: 0, actual: 0, refund: 0, frozen: 0, last: "" };
    cur.count += 1;
    cur.actual += t.actual;
    cur.refund += t.refund;
    cur.frozen += t.frozen;
    if (t.startedAt > cur.last) cur.last = t.startedAt;
    map.set(t.memberId, cur);
  });
  return Array.from(map.values()).sort((a, b) => b.actual - a.actual);
}

/** 日趋势 */
export function dailyTrend(tasks: TaskRecord[], from: string, to: string): { date: string; value: number }[] {
  const days = getDateRange(from, to);
  const map = new Map<string, number>();
  days.forEach(d => map.set(d, 0));
  tasks.forEach(t => map.set(t.startedAt.slice(0, 10), (map.get(t.startedAt.slice(0, 10)) ?? 0) + t.actual));
  return days.map(d => ({ date: d, value: map.get(d) ?? 0 }));
}

/** 全部项目名（筛选下拉用） */
export function getProjectNames(): string[] {
  return Array.from(new Set(TEAM_TASK_LIST.map(t => t.project)));
}

/** 全部模型名（筛选下拉用） */
export function getModelNames(): string[] {
  return Array.from(new Set(TEAM_TASK_LIST.map(t => t.model)));
}

// ─── 工具 ─────────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const ms = d.getTime() + 8 * 3600000;
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function addSeconds(stamp: string, sec: number): string {
  const [d, t] = stamp.split(" ");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  const ms = Date.UTC(y, mo - 1, da, h, mi) + sec * 1000;
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")} ${String(dt.getUTCHours()).padStart(2, "0")}:${String(dt.getUTCMinutes()).padStart(2, "0")}`;
}

/** 秒 → 人类可读耗时 */
export function formatDuration(sec?: number): string {
  if (sec === undefined || sec === null) return "—";
  if (sec < 60) return `${sec} 秒`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m} 分钟` : `${m} 分 ${s} 秒`;
}

/** CSV 单元格转义（正确处理逗号、引号与换行） */
export function csvCell(v: string | number | undefined): string {
  const s = v === undefined || v === null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
