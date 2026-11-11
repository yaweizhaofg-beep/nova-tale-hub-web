import { nanoid } from 'nanoid';

export const MIN_SHOTS = 1;
export const MAX_SHOTS = 5000;
export const STORYBOARD_MODELS = [
  { value: 'fast', name: 'Fast', unitPrice: 18.55 },
  { value: 'pro', name: 'Pro', unitPrice: 45 },
] as const;

export type VideoModel = (typeof STORYBOARD_MODELS)[number]['value'];
export const MIN_SHOT_DURATION = 4;
export const MAX_SHOT_DURATION = 30;

export const SHOT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'] as const;
export const SHOT_RESOLUTIONS = ['480p', '720p', '1080p'] as const;
export const ASSET_KINDS = ['角色', '场景', '道具'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];
export type ShotStatus = '待开始' | '成功' | '失败';

export interface DemoAsset {
  id: string;
  kind: AssetKind;
  name: string;
  cover?: string;
  image?: string;
  audio?: string;
  aliases?: string;
  remark?: string;
}

export const DEMO_ASSETS: DemoAsset[] = [
  { id: 'role-lin', kind: '角色', name: '林昭' },
  { id: 'role-gu', kind: '角色', name: '顾言' },
  { id: 'role-guard', kind: '角色', name: '守门人' },
  { id: 'scene-street', kind: '场景', name: '晨雾长街', cover: '镜像' },
  { id: 'scene-house', kind: '场景', name: '旧宅书房', cover: '归途' },
  { id: 'scene-station', kind: '场景', name: '城外站台', cover: '星坠' },
  { id: 'prop-letter', kind: '道具', name: '旧信封' },
  { id: 'prop-photo', kind: '道具', name: '旧照片' },
  { id: 'prop-lamp', kind: '道具', name: '铜台灯' },
];

export interface LocalClip {
  name: string;
  url: string;
}

export interface ShotFields {
  prompt: string;
  remark: string;
  durationSeconds: number;
  ratio: (typeof SHOT_RATIOS)[number];
  resolution: (typeof SHOT_RESOLUTIONS)[number];
  assetIds?: string[];
  referenceVideo?: boolean;
  referenceClip?: LocalClip;
  videoModel?: VideoModel;
}

interface StoryboardDetails {
  name: string;
  fileName: string;
  targetShots: number;
  model: VideoModel;
}

export interface ArtStyle {
  preset: string;
  description: string;
}

export interface VideoRecord {
  id: string;
  time?: number;
  operation: '演示片段' | '生成视频' | '画质增强' | '擦除字幕';
  model: VideoModel;
  durationSeconds: number;
  ratio: ShotFields['ratio'];
  resolution: string;
  style?: string;
  prompt?: string;
  scene?: string;
  assetCount?: number;
  referenceName?: string;
  sourceId?: string;
  failed?: boolean;
}

export interface DemoStoryboard extends StoryboardDetails {
  id: string;
  edits: Partial<Record<number, ShotFields>>;
  shotIds: number[];
  lastShotId: number;
  artStyle?: ArtStyle;
  assets?: Record<string, DemoAsset>;
  videos?: Partial<Record<number, VideoRecord[]>>;
  activeVideos?: Partial<Record<number, string>>;
}

interface LegacyStoryboardDraft extends Partial<DemoStoryboard> {
  extraChapters?: { id: string }[];
  chapterShots?: Record<string, number[]>;
}

function initialShotIds(count: number) {
  return Array.from({ length: count }, (_, index) => index + 1);
}

// Only drafts written by the earlier chapter-based prototype need this conversion.
function flattenLegacyShotIds(
  total: number,
  chapters: LegacyStoryboardDraft['extraChapters'],
  overrides: LegacyStoryboardDraft['chapterShots'],
) {
  const count = Math.min(total, 3);
  const base = Math.floor(total / count);
  const remainder = total % count;
  const original = initialShotIds(total);
  const ids = Array.from({ length: count }, (_, index) => {
    const first = index * base + Math.min(index, remainder);
    return (
      overrides?.[String(index + 1)] ??
      original.slice(first, first + base + Number(index < remainder))
    );
  });
  for (const { id } of chapters ?? []) ids.push(overrides?.[id] ?? []);
  return ids.flat();
}
const SAMPLE_SHOTS = [
  '远景，清晨的街道笼罩在薄雾中。镜头缓缓推进，路灯在画面边缘熄灭。',
  '中景，主角在门前停下脚步，低头看向手里的信封。暖光从窗内透出。',
  '特写，手指缓缓展开信纸。浅景深，焦点从信纸移向主角的眼睛。',
  '跟拍，主角转身沿街走向远处。镜头经过前景中的树影，保持平稳。',
  '全景，风吹动窗帘，光线落在桌面的旧照片上。镜头停留片刻。',
  '近景，主角抬头望向窗外。镜头轻轻拉远，画面渐暗。',
];

function storageKey(id: string) {
  return 'nova:demo-storyboard:' + id;
}

export function saveDemoStoryboard(storyboard: DemoStoryboard) {
  sessionStorage.setItem(storageKey(storyboard.id), JSON.stringify(storyboard));
}

export function createDemoStoryboard(details: StoryboardDetails) {
  const storyboard: DemoStoryboard = {
    ...details,
    id: nanoid(),
    edits: {},
    shotIds: initialShotIds(details.targetShots),
    lastShotId: details.targetShots,
  };
  saveDemoStoryboard(storyboard);
  return storyboard;
}

export function readDemoStoryboard(id: string | null): DemoStoryboard | null {
  if (!id) return null;
  try {
    const value: LegacyStoryboardDraft | null = JSON.parse(
      sessionStorage.getItem(storageKey(id)) ?? 'null',
    );
    if (
      value?.id !== id ||
      typeof value.name !== 'string' ||
      typeof value.fileName !== 'string' ||
      typeof value.targetShots !== 'number' ||
      !Number.isInteger(value.targetShots) ||
      value.targetShots < MIN_SHOTS ||
      value.targetShots > MAX_SHOTS ||
      !STORYBOARD_MODELS.some((model) => model.value === value.model) ||
      !value.edits ||
      typeof value.edits !== 'object' ||
      Array.isArray(value.edits)
    )
      return null;
    const { extraChapters, chapterShots, shotIds, lastShotId, ...draft } = value;
    const order = shotIds ?? flattenLegacyShotIds(value.targetShots, extraChapters, chapterShots);
    if (!Array.isArray(order) || !order.every((id) => Number.isSafeInteger(id) && id > 0))
      return null;
    const unique = new Set(order);
    if (unique.size !== order.length) return null;
    let maxId = Math.max(
      value.targetShots,
      typeof lastShotId === 'number' && Number.isSafeInteger(lastShotId) ? lastShotId : 0,
    );
    for (const id of order) maxId = Math.max(maxId, id);
    return { ...draft, shotIds: order, lastShotId: maxId } as DemoStoryboard;
  } catch {
    return null;
  }
}

export function getDemoShot(storyboard: DemoStoryboard, shotNumber: number): ShotFields {
  const original = shotNumber <= storyboard.targetShots;
  return {
    prompt: original ? SAMPLE_SHOTS[(shotNumber - 1) % SAMPLE_SHOTS.length] : '',
    remark: '',
    durationSeconds: 5,
    ratio: '16:9',
    resolution: '720p',
    assetIds: original
      ? ['role-lin', shotNumber % 2 ? 'scene-street' : 'scene-house', 'prop-letter']
      : [],
    referenceVideo: original && shotNumber % 3 === 1,
    ...storyboard.edits[shotNumber],
  };
}

export function getDemoShotStatus(storyboard: DemoStoryboard, id: number): ShotStatus {
  if (storyboard.videos?.[id]?.some((record) => !record.failed)) return '成功';
  if (id > storyboard.targetShots) return '待开始';
  if (id % 5 === 0) return '失败';
  return id % 3 === 1 ? '成功' : '待开始';
}
