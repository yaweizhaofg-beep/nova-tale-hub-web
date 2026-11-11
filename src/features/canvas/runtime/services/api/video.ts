import type { AiConfig } from "@canvas/stores/use-config-store";
import { resolveArkAssetUri, submitImportImageComplianceSafe } from "@canvas/lib/canvas/canvas-import-compliance";
import { isOwnPermanentOssUrl, persistBlobToOss, persistRemoteMediaToOss } from "@canvas/lib/platform/persist-media-to-oss";
import { probeVideoDimensions } from "@canvas/lib/canvas/video-upscale";
import { rewriteOssPublicUrl } from "@canvas/lib/platform/oss-upload";
import { originalImageUrl } from "@canvas/lib/platform/oss-image";
import {
  buildSeedancePromptText,
  seedanceReferenceLabel,
  seedanceVideoReferenceError,
  assertReferenceCountsForModel,
} from "@canvas/lib/seedance-video";
import {
  normalizeDurationForModel,
  normalizeResolutionForModel,
  ratioOptionsForModel,
  resolveGenerateAudioForModel,
  resolveVideoSeedForRequest,
  isXingyaoLiteNative4kPath,
} from "@canvas/lib/platform/videoModels.js";
import { getMediaBlob, type UploadedFile } from "@canvas/services/file-storage";
import { getImageBlob, imageToDataUrl } from "@canvas/services/image-storage";
import type { ReferenceImage } from "@canvas/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@canvas/types/media";
import {
  CANVAS_CLIENT_SOURCE,
  CANVAS_COMPUTER_SN,
  createAiVideoGeneration,
  getAiVideoTask,
} from "./backend-client";
import {
  getPlatformVideoSupplierId,
  supplierSupportsArkAssetUri,
  resolvePlatformModelMeta,
  usePlatformModelsStore,
} from "./platform-models";

type RequestOptions = { signal?: AbortSignal };

export type VideoGenerationResult = { blob?: Blob; url?: string; mimeType?: string };
export type VideoGenerationTask = { id: string; provider: "seedance"; model: string; modelKey: string };
export type VideoGenerationTaskState =
  | { status: "pending" }
  | { status: "completed"; result: VideoGenerationResult }
  | { status: "failed"; error: string };

const PENDING_STATUSES = new Set([
  "running",
  "pending",
  "queued",
  "processing",
  "submitted",
  "wait",
  "waiting",
  "enhancing",
  "in_progress",
  "created",
]);
const SUCCESS_STATUSES = new Set(["succeeded", "success", "completed", "complete", "done", "finished", "2", "成功"]);
const FAILED_STATUSES = new Set(["failed", "error", "cancelled", "失败", "已取消"]);

const VIDEO_POLL_INTERVAL_MS = 4000;
/** Seedance 2.5 等多参考任务常超过 30 分钟 */
const VIDEO_POLL_DEADLINE_MS = 60 * 60 * 1000;
const VIDEO_POLL_TRANSIENT_RETRIES = 8;

export const VIDEO_POLL_TIMEOUT_HINT = "视频生成超时，后台可能仍在处理；请刷新页面继续等待";

function isTransientVideoPollError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return false;
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  if (code === "ECONNABORTED" || code === "ERR_NETWORK") return true;
  const message = error instanceof Error ? error.message : String(error);
  return (
    /timeout of \d+ms exceeded/i.test(message) ||
    /network error/i.test(message) ||
    /502|503|504/.test(message) ||
    /查询任务接口超时/i.test(message)
  );
}

/** 从参考名抽出角色称呼，去掉扩展名/「音频N」等噪声 */
function cleanCharacterName(raw: string | undefined, fallback = "角色") {
  const name = String(raw || "")
    .replace(/\.[^.]+$/, "")
    .replace(/音频\d+/g, "")
    .replace(/[，。:\s]+/g, "")
    .trim();
  if (!name || /^(角色|音频|图片|video|audio|image|生成一个小人)\d*$/i.test(name)) return fallback;
  return name.slice(0, 24);
}

function promptAlreadyHasVoiceBinding(prompt: string) {
  return /参考图片\d+和音频\d+|的所有台词必须使用音频\d+的音色|参考描述\s*[:：]/.test(prompt);
}

/** 解析「图片1 小张 音频1」一类写法，生成 Seedance 可理解的角色-音色绑定说明 */
function buildVoiceBindingHints(prompt: string, imageCount: number, audioCount: number): string[] {
  const imageName = new Map<number, string>();
  const nameAudio = new Map<string, number>();
  const imageAudio = new Map<number, number>();

  for (const m of prompt.matchAll(/图片\s*(\d+)\s*([\u4e00-\u9fffA-Za-z0-9]{1,12})\s*音频\s*(\d+)/g)) {
    const img = Number(m[1]);
    const name = cleanCharacterName(m[2], "");
    const audio = Number(m[3]);
    if (!name || audio < 1 || audio > audioCount) continue;
    if (img >= 1 && (imageCount <= 0 || img <= imageCount)) {
      imageName.set(img, name);
      imageAudio.set(img, audio);
    }
    nameAudio.set(name, audio);
  }
  for (const m of prompt.matchAll(/图片\s*(\d+)\s*([\u4e00-\u9fffA-Za-z0-9]{1,12})/g)) {
    const img = Number(m[1]);
    const name = cleanCharacterName(m[2], "");
    if (!name) continue;
    if (imageCount > 0 && (img < 1 || img > imageCount)) continue;
    if (img >= 1 && !imageName.has(img)) imageName.set(img, name);
  }
  for (const m of prompt.matchAll(/([\u4e00-\u9fffA-Za-z0-9]{1,12})\s*(?:音色使用)?音频\s*(\d+)/g)) {
    const name = cleanCharacterName(m[1], "");
    const audio = Number(m[2]);
    if (!name || audio < 1 || audio > audioCount) continue;
    if (/^(图片|视频|音频|角色)\d*$/i.test(name)) continue;
    if (!nameAudio.has(name)) nameAudio.set(name, audio);
  }

  const hints: string[] = [];
  const boundImages = new Set<number>();
  const boundAudios = new Set<number>();
  const boundNames = new Set<string>();

  const bind = (name: string, img: number | null, audio: number) => {
    if (img && imageCount > 0 && img <= imageCount) {
      hints.push(`${name}参考图片${img}和音频${audio}`);
      boundImages.add(img);
    } else {
      hints.push(`${name}的所有台词必须使用音频${audio}的音色`);
    }
    boundAudios.add(audio);
    boundNames.add(name);
    nameAudio.delete(name);
  };

  for (const [img, name] of imageName) {
    const audio = imageAudio.get(img) ?? nameAudio.get(name);
    if (audio) bind(name, img, audio);
  }
  for (const [name, audio] of nameAudio) {
    if (boundNames.has(name)) continue;
    const img =
      [...imageName.entries()].find(([id, n]) => n === name && !boundImages.has(id))?.[0] ??
      (audio <= imageCount ? audio : 0);
    bind(name, img || null, audio);
  }
  for (let i = 1; i <= imageCount; i += 1) {
    if (boundImages.has(i)) continue;
    hints.push(`${imageName.get(i) || `角色${i}`}参考图片${i}`);
  }
  for (let i = 1; i <= audioCount; i += 1) {
    if (!boundAudios.has(i)) hints.push(`对白必须使用音频${i}的音色`);
  }
  return hints;
}

function appendVoiceBindingHint(prompt: string, images: ReferenceImage[], audios: ReferenceAudio[]) {
  if (audios.length <= 0 || promptAlreadyHasVoiceBinding(prompt)) return prompt;
  const parsed = buildVoiceBindingHints(prompt, images.length, audios.length);
  if (parsed.length) return `${prompt.trim()}\n\n参考描述：${parsed.join("，")}`;

  const hints: string[] = [];
  const paired = Math.min(images.length, audios.length);
  for (let i = 0; i < paired; i += 1) {
    const name = cleanCharacterName(audios[i]?.name || images[i]?.name, `角色${i + 1}`);
    hints.push(`${name}参考图片${i + 1}和音频${i + 1}`);
  }
  for (let i = paired; i < images.length; i += 1) {
    const name = cleanCharacterName(images[i]?.name, `角色${i + 1}`);
    hints.push(`${name}参考图片${i + 1}`);
  }
  for (let i = paired; i < audios.length; i += 1) {
    hints.push(`对白必须使用音频${i + 1}的音色`);
  }
  return `${prompt.trim()}\n\n参考描述：${hints.join("，")}`;
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function readApiError(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value !== "object") return "";
  const row = value as { msg?: unknown; message?: unknown; error?: unknown; errorMessage?: unknown };
  const err = row.error;
  if (typeof err === "string") return err.trim();
  if (err && typeof err === "object" && "message" in err) return readApiError((err as { message?: unknown }).message);
  return readApiError(row.msg) || readApiError(row.message) || readApiError(row.errorMessage);
}

function asRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object") return payload as Record<string, unknown>;
  return {};
}

function unwrapPayload(payload: unknown): Record<string, unknown> {
  const root = asRecord(payload);
  if ("data" in root && root.data && typeof root.data === "object") return asRecord(root.data);
  return root;
}

function extractVideoTaskId(payload: unknown): string {
  const root = asRecord(payload);
  const inner = unwrapPayload(payload);
  for (const value of [inner.task_id, inner.taskId, inner.id, root.task_id, root.taskId, root.id]) {
    const id = String(value ?? "").trim();
    if (id) return id;
  }
  const detail =
    readApiError(root.error) ||
    readApiError(inner.error) ||
    readApiError(root.message) ||
    readApiError(inner.message) ||
    readApiError(root.msg) ||
    readApiError(inner.msg) ||
    readApiError(root.errorMessage) ||
    readApiError(inner.errorMessage);
  throw new Error(detail || "视频任务创建失败：未返回任务 ID");
}

function readAxiosErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const res = (error as { response?: { data?: unknown } }).response?.data;
  if (!res) return "";
  if (typeof res === "string") return res.trim();
  const row = asRecord(res);
  return (
    readApiError(row.error) ||
    readApiError(row.message) ||
    readApiError(row.msg) ||
    readApiError(row.errorMessage) ||
    ""
  );
}

function readTaskStatus(payload: unknown): string {
  const row = unwrapPayload(payload);
  return String(row.status ?? row.task_status ?? row.taskStatus ?? "").trim().toLowerCase();
}

function readTaskVideoUrl(payload: unknown): string {
  const row = unwrapPayload(payload);
  const nested = asRecord(row.result);
  const content = asRecord(row.content);
  const candidates = [
    row.video_url,
    row.videoUrl,
    row.result_url,
    row.resultUrl,
    row.url,
    row.output_url,
    row.outputUrl,
    nested.video_url,
    nested.url,
    content.video_url,
    content.url,
  ];
  for (const item of candidates) {
    if (typeof item === "string" && /^https?:\/\//i.test(item)) return item;
  }
  return "";
}

function readTaskError(payload: unknown): string {
  const row = unwrapPayload(payload);
  return readApiError(row.error) || readApiError(row.errorMessage) || readApiError(row.message) || readApiError(row.msg) || "视频生成失败";
}

async function ensureImageUrl(image: ReferenceImage, modelKey: string, complianceSupplierId?: number, selectedSupplierId?: number): Promise<string> {
  const { videoRoutes } = usePlatformModelsStore.getState();
  // 海外轻量可从轻量虚线路选择，但后端实际固定使用 YINGHE_HAIWAI。
  const overseas = modelKey.toLowerCase().startsWith("dreamina-seedance-2-0");
  const videoSupplierId = overseas
    ? complianceSupplierId ?? videoRoutes.find((r) => r.supplierCode?.toUpperCase() === "YINGHE_HAIWAI")?.id
    : selectedSupplierId ?? getPlatformVideoSupplierId();
  if (overseas && videoSupplierId == null) throw new Error("海外视频线路不可用，请刷新线路列表后重试");
  const arkCapable = overseas || supplierSupportsArkAssetUri(videoRoutes.find((r) => r.id === videoSupplierId)?.supplierCode);

  const existingUri = resolveArkAssetUri({
    complianceStatus: image.complianceStatus,
    arkAssetId: image.arkAssetId,
    complianceSupplierId: image.complianceSupplierId,
    videoSupplierId,
    complianceLines: image.complianceLines,
  });
  if (existingUri) return existingUri;

  if (arkCapable) {
    const sourceUrl = originalImageUrl(
      (image.url && /^https?:\/\//i.test(image.url) ? image.url : undefined) ||
      (image.dataUrl && /^https?:\/\//i.test(image.dataUrl) ? image.dataUrl : undefined),
    );
    if (sourceUrl) {
      const refreshed = await submitImportImageComplianceSafe(sourceUrl, image.name, videoSupplierId);
      if (refreshed) {
        image.complianceStatus = refreshed.complianceStatus;
        image.arkAssetId = refreshed.arkAssetId;
        image.complianceSupplierId = refreshed.complianceSupplierId;
        image.complianceLines = refreshed.complianceLines;
        const arkUri = resolveArkAssetUri({
          complianceStatus: refreshed.complianceStatus,
          arkAssetId: refreshed.arkAssetId,
          complianceSupplierId: refreshed.complianceSupplierId,
          videoSupplierId,
          complianceLines: refreshed.complianceLines,
        });
        if (arkUri) return arkUri;
        const status = String(refreshed.complianceStatus || "").toUpperCase();
        if (status === "PROCESSING") {
          throw new Error("参考图正在按当前视频线路做合规检测，请等图片角标变为「已合规」后再生成（需传 asset://）");
        }
        if (status === "FAILED") {
          throw new Error(refreshed.complianceError || "参考图合规失败，无法使用 Dreamina/方舟生视频，请更换图片后重试");
        }
      }
    }
    throw new Error("参考图尚未取得当前线路的合规资产（asset://）。请确认图片角标为「已合规」且与当前视频线路一致后再生成。");
  }

  const direct = originalImageUrl(image.url);
  if (direct.startsWith("asset://")) return direct;
  if (/^https?:\/\//i.test(direct)) {
    if (await isOwnPermanentOssUrl(direct)) return rewriteOssPublicUrl(direct);
    return persistRemoteMediaToOss(direct, image.name || "ref.png");
  }
  if (image.storageKey) {
    const blob = await getImageBlob(image.storageKey);
    if (blob) return persistBlobToOss(blob, image.name || "ref.png");
  }
  const dataUrl = originalImageUrl(await imageToDataUrl(image));
  if (!dataUrl) throw new Error("参考图无效");
  if (/^https?:\/\//i.test(dataUrl)) {
    if (await isOwnPermanentOssUrl(dataUrl)) return rewriteOssPublicUrl(dataUrl);
    return persistRemoteMediaToOss(dataUrl, image.name || "ref.png");
  }
  const blob = await (await fetch(dataUrl)).blob();
  return persistBlobToOss(blob, image.name || "ref.png");
}

async function ensureReferenceMediaUrl(item: {
  url: string;
  storageKey?: string;
  name?: string;
  type?: string;
}): Promise<string> {
  const url = item.url?.trim() || "";
  if (url.startsWith("asset://")) return url;
  // 已有远程 https（含海外 TOS 签名临时链）直接交给平台，不再服务端转存（成片本身也不落自有 OSS）
  if (/^https?:\/\//i.test(url)) return rewriteOssPublicUrl(url);
  let blob: Blob | null = null;
  if (item.storageKey) blob = await getMediaBlob(item.storageKey);
  if (!blob && url.startsWith("blob:")) blob = await (await fetch(url)).blob();
  if (!blob) throw new Error("参考媒体无效，请重新上传");
  return persistBlobToOss(blob, item.name || "media.bin");
}

export async function createVideoGenerationTask(
  config: AiConfig,
  prompt: string,
  references: ReferenceImage[] = [],
  videoReferences: ReferenceVideo[] = [],
  audioReferences: ReferenceAudio[] = [],
  options?: RequestOptions,
): Promise<VideoGenerationTask> {
  const meta = resolvePlatformModelMeta(config, config.model || config.videoModel);
  if (!meta?.modelKey) throw new Error("请先选择平台视频模型（需已登录）");

  // 在等待合规前固定本次线路；期间切换线路不应改变生成使用的 Key。
  const { videoRoutes, videoSupplierId } = usePlatformModelsStore.getState();
  if (videoSupplierId == null) throw new Error("请先选择视频线路");
  const supplier = videoRoutes.find((r) => r.id === videoSupplierId);

  assertReferenceCountsForModel(meta.modelKey, references.length, videoReferences.length, audioReferences.length);
  const images = references;
  const videos = videoReferences;
  const audios = audioReferences;

  for (let i = 0; i < audios.length; i += 1) {
    const durationMs = audios[i]?.durationMs;
    if (typeof durationMs === "number" && durationMs > 0 && durationMs < 1800) {
      throw new Error(
        `${seedanceReferenceLabel("audio", i)} 时长需 ≥1.8 秒（当前约 ${(durationMs / 1000).toFixed(1)} 秒），请换更长参考音`,
      );
    }
  }

  const videoError = seedanceVideoReferenceError(videos, meta.modelKey);
  if (videoError) throw new Error(videoError);

  let text = buildSeedancePromptText(prompt, images, videos, audios);
  if (text) text = appendVoiceBindingHint(text.trim(), images, audios);

  const content: Array<Record<string, unknown>> = [];
  if (text) content.push({ type: "text", text });

  for (const image of images) {
    if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const url = await ensureImageUrl(image, meta.modelKey, meta.complianceSupplierId, videoSupplierId);
    content.push({ type: "image_url", role: "reference_image", image_url: { url } });
  }
  for (const video of videos) {
    if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const url = await ensureReferenceMediaUrl({
      url: video.url,
      storageKey: video.storageKey,
      name: video.name || "video.mp4",
      type: video.type || "video/mp4",
    });
    content.push({ type: "video_url", role: "reference_video", video_url: { url } });
  }
  for (const audio of audios) {
    if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const url = await ensureReferenceMediaUrl({
      url: audio.url,
      storageKey: audio.storageKey,
      name: audio.name || "audio.mp3",
      type: audio.type || "audio/mpeg",
    });
    content.push({ type: "audio_url", role: "reference_audio", audio_url: { url } });
  }

  const ratios = ratioOptionsForModel(meta.modelKey);
  const preferredRatio = config.videoSize || config.size || "";
  const ratio = ratios.includes(preferredRatio) ? preferredRatio : ratios[0] || "16:9";
  const resolution = normalizeResolutionForModel(
    meta.modelKey,
    config.vquality || "720p",
    { supportedResolutions: meta.supportedResolutions },
    supplier,
  );
  if (isXingyaoLiteNative4kPath(meta.modelKey, resolution) && videos.length > 0) {
    throw new Error("该模型 4K 不支持参考视频，请改用 720p/1080p，或去掉参考视频");
  }
  const duration = normalizeDurationForModel(meta.modelKey, config.videoSeconds);

  const generateAudio =
    audios.length > 0 ? true : resolveGenerateAudioForModel(meta.modelKey, config.videoGenerateAudio);

  const body: Record<string, unknown> = {
    model: meta.modelKey,
    computer_sn: CANVAS_COMPUTER_SN,
    client_source: CANVAS_CLIENT_SOURCE,
    model_key: meta.modelKey,
    model_supplier_id: videoSupplierId,
    content,
    generate_audio: generateAudio,
    ratio,
    resolution,
    duration,
    watermark: String(config.videoWatermark || "false") === "true",
  };

  const seed = resolveVideoSeedForRequest(config.videoSeed, meta.modelKey);
  if (seed != null) body.seed = seed;

  if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  let created: unknown;
  try {
    created = await createAiVideoGeneration(body);
  } catch (error) {
    const detail = readAxiosErrorMessage(error);
    if (detail) throw new Error(detail);
    throw error instanceof Error ? error : new Error("视频任务创建失败");
  }
  return {
    id: extractVideoTaskId(created),
    provider: "seedance",
    model: config.model || config.videoModel,
    modelKey: meta.modelKey,
  };
}

export async function pollVideoGenerationTask(
  _config: AiConfig,
  task: VideoGenerationTask,
  options?: RequestOptions,
): Promise<VideoGenerationTaskState> {
  if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const modelKey = task.modelKey || "";
  const payload = await getAiVideoTask(task.id, CANVAS_COMPUTER_SN, modelKey);
  const status = readTaskStatus(payload);
  if (FAILED_STATUSES.has(status)) return { status: "failed", error: readTaskError(payload) };

  const url = readTaskVideoUrl(payload);
  // 后处理中（定制版超分/官方超分）：不回显、不完成
  if (status === "enhancing") {
    return { status: "pending" };
  }
  if (url && SUCCESS_STATUSES.has(status)) {
    return { status: "completed", result: { url, mimeType: "video/mp4" } };
  }
  if (PENDING_STATUSES.has(status)) {
    return { status: "pending" };
  }
  // 无明确成功态时不因残留 video_url 提前完成（避免上游 succeeded 抢跑）
  if (url && status === "") {
    return { status: "completed", result: { url, mimeType: "video/mp4" } };
  }
  return { status: "pending" };
}

export async function waitForVideoGenerationTask(
  config: AiConfig,
  task: VideoGenerationTask,
  options?: RequestOptions,
): Promise<VideoGenerationResult> {
  const deadline = Date.now() + VIDEO_POLL_DEADLINE_MS;
  let transientRetries = 0;
  while (Date.now() < deadline) {
    if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      const state = await pollVideoGenerationTask(config, task, options);
      transientRetries = 0;
      if (state.status === "completed") return state.result;
      if (state.status === "failed") throw new Error(state.error);
    } catch (error) {
      if (options?.signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) throw error;
      if (isTransientVideoPollError(error) && transientRetries < VIDEO_POLL_TRANSIENT_RETRIES) {
        transientRetries += 1;
        await delay(VIDEO_POLL_INTERVAL_MS, options?.signal);
        continue;
      }
      throw error;
    }
    await delay(VIDEO_POLL_INTERVAL_MS, options?.signal);
  }
  throw new Error(VIDEO_POLL_TIMEOUT_HINT);
}

export async function requestVideoGeneration(
  config: AiConfig,
  prompt: string,
  references: ReferenceImage[] = [],
  videoReferences: ReferenceVideo[] = [],
  audioReferences: ReferenceAudio[] = [],
  options?: RequestOptions,
): Promise<VideoGenerationResult> {
  const task = await createVideoGenerationTask(config, prompt, references, videoReferences, audioReferences, options);
  return waitForVideoGenerationTask(config, task, options);
}

/** 生成视频直接使用上游临时链展示/下载，不再转存自有 OSS（图片/音频仍走 OSS）。 */
export async function storeGeneratedVideo(result: VideoGenerationResult): Promise<UploadedFile> {
  if (result.url && /^https?:\/\//i.test(result.url)) {
    const probed = await probeVideoDimensions(result.url);
    return {
      url: result.url,
      storageKey: "",
      bytes: 0,
      mimeType: result.mimeType || "video/mp4",
      width: probed?.width,
      height: probed?.height,
    };
  }
  if (result.blob) {
    const url = URL.createObjectURL(result.blob);
    const probed = await probeVideoDimensions(url);
    return {
      url,
      storageKey: "",
      bytes: result.blob.size,
      mimeType: result.mimeType || result.blob.type || "video/mp4",
      width: probed?.width,
      height: probed?.height,
    };
  }
  throw new Error("视频结果为空");
}
