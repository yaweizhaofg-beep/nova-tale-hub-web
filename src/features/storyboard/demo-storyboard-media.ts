import { nanoid } from 'nanoid';
import {
  DEMO_ASSETS,
  STORYBOARD_MODELS,
  getDemoShot,
  getDemoShotStatus,
  type DemoAsset,
  type DemoStoryboard,
  type ShotFields,
  type VideoModel,
  type VideoRecord,
} from './demo-storyboard';

export const STYLE_PRESETS = [
  { value: 'none', label: '无预设' },
  { value: 'cinema', label: '电影质感', description: '自然光影，细腻的颗粒感与电影式构图。' },
  { value: 'ink', label: '国风水墨', description: '东方水墨笔触，虚实相生，留白克制。' },
  { value: 'animation', label: '动画绘本', description: '柔和色彩，手绘轮廓与层次丰富的光线。' },
  { value: 'custom', label: '自定义' },
] as const;

export const ENHANCE_SCENES = ['通用模板', 'UGC 短视频', '短剧', 'AIGC'] as const;
export const ENHANCE_RESOLUTIONS = [
  '240p',
  '360p',
  '480p',
  '540p',
  '720p',
  '1080p',
  '2k',
  '4k',
] as const;
export const DEMO_VIDEO_URL = import.meta.env.BASE_URL + 'media/landing-hero-web.mp4';
export const DEMO_POSTER_URL = import.meta.env.BASE_URL + 'media/landing-hero-poster.jpg';

export function getStoryboardAssets(storyboard: DemoStoryboard) {
  const saved = storyboard.assets ?? {};
  return Object.values({
    ...Object.fromEntries(DEMO_ASSETS.map((asset) => [asset.id, asset])),
    ...saved,
  });
}

export function matchShotAssets(shot: ShotFields, assets: DemoAsset[]) {
  const prompt = shot.prompt.toLocaleLowerCase();
  const ids = new Set(shot.assetIds);
  for (const asset of assets) {
    const names = [asset.name, ...(asset.aliases ?? '').split(/[、,，]/)];
    if (names.some((name) => name.trim() && prompt.includes(name.trim().toLocaleLowerCase()))) {
      ids.add(asset.id);
    }
  }
  return [...ids];
}

export function getShotRecords(storyboard: DemoStoryboard, shotId: number): VideoRecord[] {
  const saved = storyboard.videos?.[shotId];
  if (saved) return saved;
  const status = getDemoShotStatus(storyboard, shotId);
  if (status === '待开始') return [];
  const shot = getDemoShot(storyboard, shotId);
  return [
    {
      id: 'sample-' + shotId,
      operation: status === '失败' ? '生成视频' : '演示片段',
      failed: status === '失败' || undefined,
      model: storyboard.model,
      durationSeconds: shot.durationSeconds,
      ratio: shot.ratio,
      resolution: shot.resolution,
    },
  ];
}

export function getActiveVideo(storyboard: DemoStoryboard, shotId: number) {
  const videos = getShotRecords(storyboard, shotId).filter((record) => !record.failed);
  return videos.find(({ id }) => id === storyboard.activeVideos?.[shotId]) ?? videos[0];
}

export function generateDemoVideos(storyboard: DemoStoryboard, ids: number[], autoMatch: boolean) {
  const videos = { ...storyboard.videos };
  const activeVideos = { ...storyboard.activeVideos };
  const edits = { ...storyboard.edits };
  const assets = autoMatch ? getStoryboardAssets(storyboard) : [];
  const time = Date.now();
  for (const id of ids) {
    const shot = getDemoShot(storyboard, id);
    const assetIds = autoMatch ? matchShotAssets(shot, assets) : shot.assetIds;
    const record: VideoRecord = {
      id: nanoid(),
      time,
      operation: '生成视频',
      model: shot.videoModel ?? storyboard.model,
      durationSeconds: shot.durationSeconds,
      ratio: shot.ratio,
      resolution: shot.resolution,
      style: storyboard.artStyle?.description.trim() || undefined,
      assetCount: assetIds?.length ?? 0,
      referenceName: shot.referenceVideo ? (shot.referenceClip?.name ?? '演示片段') : undefined,
      prompt: shot.prompt.trim().slice(0, 160),
    };
    videos[id] = [record, ...getShotRecords(storyboard, id)];
    activeVideos[id] = record.id;
    if (autoMatch) edits[id] = { ...shot, assetIds };
  }
  return { ...storyboard, videos, activeVideos, edits };
}

export function addDemoVideoVariant(
  storyboard: DemoStoryboard,
  shotId: number,
  source: VideoRecord,
  operation: '画质增强' | '擦除字幕',
  options: { resolution?: string; scene?: string } = {},
) {
  const record: VideoRecord = {
    ...source,
    ...options,
    id: nanoid(),
    time: Date.now(),
    operation,
    sourceId: source.id,
    scene: options.scene,
  };
  return {
    ...storyboard,
    videos: { ...storyboard.videos, [shotId]: [record, ...getShotRecords(storyboard, shotId)] },
    activeVideos: { ...storyboard.activeVideos, [shotId]: record.id },
  };
}

export const VIDEO_MODEL_OPTIONS = STORYBOARD_MODELS.map(({ value, name }) => ({
  value,
  label: name,
}));

export function videoModelLabel(model: VideoModel) {
  return VIDEO_MODEL_OPTIONS.find(({ value }) => value === model)?.label ?? model;
}

export function videoRecordTime(record: VideoRecord) {
  return record.time
    ? new Date(record.time).toLocaleString('zh-CN', { hour12: false })
    : '预置片段';
}
