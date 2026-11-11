import {
  fetchInfiniteCanvasPreferences,
  saveInfiniteCanvasPreferences,
} from "@canvas/services/api/backend-client";
import { findChannelModel, useConfigStore, type AiConfig } from "@canvas/stores/use-config-store";

const IMAGE_SUPPLIER_KEY = "platformImageSupplierId";
const VIDEO_SUPPLIER_KEY = "platformVideoSupplierId";

function readSupplierId(key: string) {
  const n = Number(localStorage.getItem(key));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type CanvasPreferencePayload = {
  imageSupplierId?: number | null;
  videoSupplierId?: number | null;
  imageAiModelId?: number | null;
  videoAiModelId?: number | null;
  textAiModelId?: number | null;
  imageModel?: string;
  videoModel?: string;
  textModel?: string;
  canvasImageCount?: string;
  systemPrompt?: string;
  quality?: string;
  size?: string;
  vquality?: string;
  videoSize?: string;
  videoSeconds?: string;
  videoGenerateAudio?: string;
  videoSeed?: string;
  reasoningEffort?: AiConfig["reasoningEffort"];
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saving = false;
let cloudHydrated = false;

export function isCanvasPreferenceCloudHydrated() {
  return cloudHydrated;
}

export function markCanvasPreferenceCloudHydrated() {
  cloudHydrated = true;
}

export function collectCanvasPreferencePayload(config = useConfigStore.getState().config): CanvasPreferencePayload {
  const imageMeta = findChannelModel(config, config.imageModel || config.model)?.model;
  const videoMeta = findChannelModel(config, config.videoModel)?.model;
  const textMeta = findChannelModel(config, config.textModel)?.model;
  return {
    imageSupplierId: readSupplierId(IMAGE_SUPPLIER_KEY),
    videoSupplierId: readSupplierId(VIDEO_SUPPLIER_KEY),

    imageAiModelId: imageMeta?.aiModelId ?? null,
    videoAiModelId: videoMeta?.aiModelId ?? null,
    textAiModelId: textMeta?.aiModelId ?? null,
    imageModel: config.imageModel || config.model || "",
    videoModel: config.videoModel || "",
    textModel: config.textModel || "",
    canvasImageCount: config.canvasImageCount,
    systemPrompt: config.systemPrompt,
    quality: config.quality,
    size: config.size,
    vquality: config.vquality,
    videoSize: config.videoSize,
    videoSeconds: config.videoSeconds,
    videoGenerateAudio: config.videoGenerateAudio,
    videoSeed: config.videoSeed,
    reasoningEffort: config.reasoningEffort,
  };
}

function parseReasoningEffort(value: unknown): AiConfig["reasoningEffort"] | undefined {
  switch (value) {
    case "auto":
    case "low":
    case "medium":
    case "high":
    case "xhigh":
      return value;
    default:
      return undefined;
  }
}

export function parseCanvasPreferencePayload(raw?: Record<string, unknown> | null): CanvasPreferencePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const num = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const str = (value: unknown) => (typeof value === "string" ? value : undefined);
  return {
    imageSupplierId: num(raw.imageSupplierId),
    videoSupplierId: num(raw.videoSupplierId),
    imageAiModelId: num(raw.imageAiModelId),
    videoAiModelId: num(raw.videoAiModelId),
    textAiModelId: num(raw.textAiModelId),
    imageModel: str(raw.imageModel),
    videoModel: str(raw.videoModel),
    textModel: str(raw.textModel),
    canvasImageCount: str(raw.canvasImageCount),
    systemPrompt: str(raw.systemPrompt),
    quality: str(raw.quality),
    size: str(raw.size),
    vquality: str(raw.vquality),
    videoSize: str(raw.videoSize),
    videoSeconds: str(raw.videoSeconds),
    videoGenerateAudio: str(raw.videoGenerateAudio),
    videoSeed: str(raw.videoSeed),
    reasoningEffort: parseReasoningEffort(raw.reasoningEffort),
  };
}

export async function loadCloudCanvasPreferences(): Promise<CanvasPreferencePayload | null> {
  const dto = await fetchInfiniteCanvasPreferences();
  return parseCanvasPreferencePayload(dto?.payload || null);
}

export async function saveCloudCanvasPreferences(payload = collectCanvasPreferencePayload()) {
  if (saving) return;
  saving = true;
  try {
    await saveInfiniteCanvasPreferences(payload as unknown as Record<string, unknown>);
  } finally {
    saving = false;
  }
}

/** 偏好变更后防抖入库（需先完成云端灌入，避免本地旧值覆盖库） */
export function scheduleSaveCloudCanvasPreferences(delayMs = 800) {
  if (!cloudHydrated) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void saveCloudCanvasPreferences().catch(() => undefined);
  }, delayMs);
}

export function applySoftPreferenceFields(config: AiConfig, pref: CanvasPreferencePayload): AiConfig {
  return {
    ...config,
    ...(pref.canvasImageCount != null ? { canvasImageCount: pref.canvasImageCount } : {}),
    ...(pref.systemPrompt != null ? { systemPrompt: pref.systemPrompt } : {}),
    ...(pref.quality != null ? { quality: pref.quality } : {}),
    ...(pref.size != null ? { size: pref.size } : {}),
    ...(pref.vquality != null ? { vquality: pref.vquality } : {}),
    ...(pref.videoSize != null ? { videoSize: pref.videoSize } : {}),
    ...(pref.videoSeconds != null ? { videoSeconds: pref.videoSeconds } : {}),
    ...(pref.videoGenerateAudio != null ? { videoGenerateAudio: pref.videoGenerateAudio } : {}),
    ...(pref.videoSeed != null ? { videoSeed: pref.videoSeed } : {}),
    ...(pref.reasoningEffort != null ? { reasoningEffort: pref.reasoningEffort } : {}),
  };
}
