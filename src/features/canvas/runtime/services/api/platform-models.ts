import { create } from "zustand";

import {
  createModelChannel,
  encodeChannelModel,
  findChannelModel,
  isPlatformChannel,
  modelOptionName,
  useConfigStore,
  type AiConfig,
  type ChannelModel,
  type ModelCapability,
} from "@canvas/stores/use-config-store";
import { getPlatformActorIds } from "@canvas/lib/auth-token";
import {
  normalizeAspectForModel,
  normalizeSizeForModel,
  sizeOptionsForModel,
} from "@canvas/lib/platform/imageModels.js";
import {
  excludeHiddenXingyaoLiteModels,
  normalizeDurationForModel,
  normalizeResolutionForModel,
  normalizeVideoSeedForModel,
  ratioOptionsForModel,
  resolveGenerateAudioForModel,
  supportsGenerateAudioForModel,
} from "@canvas/lib/platform/videoModels.js";
import {
  applySoftPreferenceFields,
  loadCloudCanvasPreferences,
  markCanvasPreferenceCloudHydrated,
  scheduleSaveCloudCanvasPreferences,
  type CanvasPreferencePayload,
} from "@canvas/lib/canvas/canvas-preference-cloud";
import {
  fetchCanvasTextModels,
  fetchImageTaskOptions,
  fetchModelSupplierRoutes,
  fetchPremiumVideoModels,
  saveModelSupplierPreferences,
  type CanvasTextModelDto,
  type ModelSupplierRoute,
  type PlatformAiModel,
} from "./backend-client";

export const PLATFORM_IMAGE_CHANNEL = "platform-image";
export const PLATFORM_VIDEO_CHANNEL = "platform-video";
export const PLATFORM_TEXT_CHANNEL = "platform-text";

const IMAGE_SUPPLIER_KEY = "platformImageSupplierId";
const VIDEO_SUPPLIER_KEY = "platformVideoSupplierId";

type PlatformModelsState = {
  imageRoutes: ModelSupplierRoute[];
  videoRoutes: ModelSupplierRoute[];
  imageSupplierId?: number;
  videoSupplierId?: number;
  loadingImage: boolean;
  loadingVideo: boolean;
};

export const usePlatformModelsStore = create<PlatformModelsState>(() => ({
  imageRoutes: [],
  videoRoutes: [],
  imageSupplierId: undefined,
  videoSupplierId: undefined,
  loadingImage: false,
  loadingVideo: false,
}));

export function getPlatformImageSupplierId() {
  return usePlatformModelsStore.getState().imageSupplierId;
}

export function getPlatformVideoSupplierId() {
  return usePlatformModelsStore.getState().videoSupplierId;
}

/**
 * 与后台 usesVolcanoArkStack / usesBytePlusArkStack 对齐。
 * 火山方舟、BytePlus 与盈合海外 V3 支持 asset://；盈合国内 / 移动云 / 五音等传 https。
 */
export function supplierSupportsArkAssetUri(supplierCode?: string | null) {
  const c = String(supplierCode || "").trim().toUpperCase();
  return (
    c === "VOLCANO_OFFICIAL" ||
    c === "VOLCANO_OFFICIAL_ENHANCE" ||
    c === "XINGYAO_LITE" ||
    c === "ZHUANSHU_TEST" ||
    c === "JIANGUO_VOLCANO" ||
    c === "VOLCANO_OFFICIAL_2119518150" ||
    c === "BYTEPLUS" ||
    c === "YINGHE_HAIWAI" ||
    c === "MOBILE_VOLCANO"
  );
}

/** 当前画布可选的方舟/BYTEPLUS 视频线路 id（上传时并行合规用） */
export function listArkCapableVideoSupplierIds(): number[] {
  const { videoRoutes } = usePlatformModelsStore.getState();
  const ids: number[] = [];
  for (const r of videoRoutes) {
    if (r?.id == null) continue;
    if (supplierSupportsArkAssetUri(r.supplierCode)) ids.push(r.id);
  }
  return ids;
}

/** 当前画布所选视频线路是否支持参考图传 asset:// */
export function currentVideoRouteSupportsArkAssetUri() {
  const { videoRoutes, videoSupplierId } = usePlatformModelsStore.getState();
  const route = videoRoutes.find((r) => r.id === videoSupplierId);
  return supplierSupportsArkAssetUri(route?.supplierCode);
}

function asChannelModel(m: PlatformAiModel, capability: ModelCapability): ChannelModel {
  return {
    name: `${m.id}__${m.modelKey || m.name}`,
    capability,
    aiModelId: m.id,
    modelKey: m.modelKey || String(m.id),
    displayName: m.name || m.modelKey || String(m.id),
    complianceSupplierId: m.complianceSupplierId,
    supportedResolutions: Array.isArray(m.supportedResolutions) ? m.supportedResolutions : undefined,
  };
}

function textModelsFromDto(rows: CanvasTextModelDto[]): ChannelModel[] {
  return rows
    .filter((m) => m?.id)
    .map((m) =>
      asChannelModel(
        { id: m.id, name: m.name || m.modelKey || String(m.id), modelKey: m.modelKey || String(m.id) },
        "text",
      ),
    );
}

/** 与分镜页一致：优先已选且有密钥 → 默认且有密钥 → 有密钥 → 已选 → 默认 → 首个 */
function pickRoute(routes: ModelSupplierRoute[], preferredId?: number | null): ModelSupplierRoute | undefined {
  if (preferredId != null && routes.some((r) => r.id === preferredId)) {
    return routes.find((r) => r.id === preferredId);
  }
  return (
    routes.find((r) => r.selected && r.hasCompanyApiKey) ||
    routes.find((r) => r.defaultRoute && r.hasCompanyApiKey) ||
    routes.find((r) => r.hasCompanyApiKey) ||
    routes.find((r) => r.selected) ||
    routes.find((r) => r.defaultRoute) ||
    routes[0]
  );
}

/** 图片模型只取 options.models（当前线路关联），禁止回退到 allImageModels */
function imageModelsFromOptions(options: Awaited<ReturnType<typeof fetchImageTaskOptions>> | null): PlatformAiModel[] {
  if (!options) return [];
  return Array.isArray(options.models) ? options.models : [];
}

function readStoredSupplierId(key: string): number | undefined {
  const n = Number(localStorage.getItem(key));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function writeStoredSupplierId(key: string, id?: number) {
  if (id != null) localStorage.setItem(key, String(id));
  else localStorage.removeItem(key);
}

function syncChannels(imageModels: ChannelModel[], videoModels: ChannelModel[], textModels?: ChannelModel[]) {
  const prev = useConfigStore.getState().config;
  const textList =
    textModels ??
    prev.channels.find((c) => c.id === PLATFORM_TEXT_CHANNEL)?.models.filter((m) => m.capability === "text") ??
    [];
  const imageChannel = createModelChannel({
    id: PLATFORM_IMAGE_CHANNEL,
    name: "平台图片",
    baseUrl: "platform",
    apiKey: "platform",
    apiFormat: "openai",
    models: imageModels,
  });
  const videoChannel = createModelChannel({
    id: PLATFORM_VIDEO_CHANNEL,
    name: "平台视频",
    baseUrl: "platform",
    apiKey: "platform",
    apiFormat: "openai",
    models: videoModels,
  });
  const textChannel = createModelChannel({
    id: PLATFORM_TEXT_CHANNEL,
    name: "平台文本",
    baseUrl: "platform",
    apiKey: "platform",
    apiFormat: "openai",
    models: textList,
  });
  const kept = prev.channels.filter(
    (c) =>
      isPlatformChannel(c) &&
      c.id !== PLATFORM_IMAGE_CHANNEL &&
      c.id !== PLATFORM_VIDEO_CHANNEL &&
      c.id !== PLATFORM_TEXT_CHANNEL,
  );
  return [imageChannel, videoChannel, textChannel, ...kept];
}

export function normalizeImageParamsForModel(modelKey: string, quality?: string, size?: string) {
  return {
    quality: normalizeSizeForModel(modelKey, quality || "1K"),
    size: normalizeAspectForModel(modelKey, size || "auto"),
  };
}

export function normalizeVideoParamsForModel(modelKey: string, model?: ChannelModel, vquality?: string, size?: string, videoSeconds?: string, videoGenerateAudio?: string, videoSeed?: string) {
  const { videoRoutes, videoSupplierId } = usePlatformModelsStore.getState();
  const supplier = videoRoutes.find((r) => r.id === videoSupplierId) || undefined;
  const resolution = normalizeResolutionForModel(modelKey, vquality || "720p", model, supplier);
  const ratios = ratioOptionsForModel(modelKey);
  const ratio = ratios.includes(size || "") ? size! : ratios[0] || "16:9";
  const seconds = String(normalizeDurationForModel(modelKey, videoSeconds));
  return {
    vquality: resolution,
    size: ratio,
    videoSeconds: seconds,
    videoGenerateAudio: String(resolveGenerateAudioForModel(modelKey, videoGenerateAudio ?? "true")),
    videoSeed: normalizeVideoSeedForModel(modelKey, videoSeed),
    supportedResolutions: model?.supportedResolutions,
  };
}

function pickModelValue(channelId: string, models: ChannelModel[], preferredEncoded?: string, preferredId?: number) {
  if (preferredEncoded) {
    const name = modelOptionName(preferredEncoded);
    if (models.some((m) => m.name === name)) return encodeChannelModel(channelId, name);
  }
  if (preferredId) {
    const hit = models.find((m) => m.aiModelId === preferredId);
    if (hit) return encodeChannelModel(channelId, hit.name);
  }
  return models[0] ? encodeChannelModel(channelId, models[0].name) : "";
}

export function formatRouteLabel(r?: ModelSupplierRoute | null) {
  if (!r) return "";
  let t = r.lineAlias || `线路#${r.id}`;
  if (!r.hasCompanyApiKey) t += "（未配密钥）";
  if (r.defaultRoute) t += " · 默认";
  return t;
}

/** 登录后或刷新：拉云端偏好 → 线路 → 模型（对齐后台权限） */
export async function bootstrapPlatformModels() {
  const { staffId, talentId } = getPlatformActorIds();
  usePlatformModelsStore.setState({ loadingImage: true, loadingVideo: true });
  try {
    const cloudPref = await loadCloudCanvasPreferences().catch(() => null);
    const storedImageSupplier = cloudPref?.imageSupplierId ?? readStoredSupplierId(IMAGE_SUPPLIER_KEY);
    const storedVideoSupplier = cloudPref?.videoSupplierId ?? readStoredSupplierId(VIDEO_SUPPLIER_KEY);

    // 图片：options.routes + options.models(按 supplierId 过滤)
    // 视频：PREMIUM_COMIC 线路（后端按 staff/talent 配额剔除空线路）
    // 文本：精品漫 TEXT 模型池
    const [imageOptions, videoRoutes, textModelsRaw] = await Promise.all([
      fetchImageTaskOptions(storedImageSupplier ? { supplierId: storedImageSupplier } : {}).catch(() => null),
      fetchModelSupplierRoutes("PREMIUM_COMIC", staffId, talentId).catch(() => [] as ModelSupplierRoute[]),
      fetchCanvasTextModels().catch(() => [] as CanvasTextModelDto[]),
    ]);

    const imageRoutes = imageOptions?.routes || [];
    const imageRoute = pickRoute(imageRoutes, storedImageSupplier ?? imageOptions?.defaultSupplierId);
    const imageSupplierId = imageRoute?.id;

    let imageModelsRaw = imageModelsFromOptions(imageOptions);
    if (imageSupplierId && (storedImageSupplier !== imageSupplierId || !imageModelsRaw.length)) {
      const refreshed = await fetchImageTaskOptions({ supplierId: imageSupplierId }).catch(() => null);
      imageModelsRaw = imageModelsFromOptions(refreshed);
    }

    const videoRoute = pickRoute(videoRoutes, storedVideoSupplier);
    const videoSupplierId = videoRoute?.id;
    const videoModelsRaw = videoSupplierId
      ? await fetchPremiumVideoModels(videoSupplierId, staffId, talentId).catch(() => [] as PlatformAiModel[])
      : [];

    const imageModels = imageModelsRaw.map((m) => asChannelModel(m, "image"));
    const videoModels = excludeHiddenXingyaoLiteModels(videoModelsRaw).map((m) => asChannelModel(m, "video"));
    const textModels = textModelsFromDto(textModelsRaw);

    writeStoredSupplierId(IMAGE_SUPPLIER_KEY, imageSupplierId);
    writeStoredSupplierId(VIDEO_SUPPLIER_KEY, videoSupplierId);
    usePlatformModelsStore.setState({
      imageRoutes,
      videoRoutes,
      imageSupplierId,
      videoSupplierId,
    });

    const prev = applySoftPreferenceFields(useConfigStore.getState().config, cloudPref || {});
    const imageValue = pickModelValue(
      PLATFORM_IMAGE_CHANNEL,
      imageModels,
      cloudPref?.imageModel || prev.imageModel || prev.model,
      cloudPref?.imageAiModelId ?? imageOptions?.defaultModelId,
    );
    const videoValue = pickModelValue(
      PLATFORM_VIDEO_CHANNEL,
      videoModels,
      cloudPref?.videoModel || prev.videoModel,
      cloudPref?.videoAiModelId ?? undefined,
    );
    const textValue = pickModelValue(
      PLATFORM_TEXT_CHANNEL,
      textModels,
      cloudPref?.textModel || prev.textModel,
      cloudPref?.textAiModelId ?? undefined,
    );
    const imageMeta = imageModels.find((m) => encodeChannelModel(PLATFORM_IMAGE_CHANNEL, m.name) === imageValue);
    const videoMeta = videoModels.find((m) => encodeChannelModel(PLATFORM_VIDEO_CHANNEL, m.name) === videoValue);
    const imageParams = normalizeImageParamsForModel(imageMeta?.modelKey || "", prev.quality, prev.size);
    const videoParams = normalizeVideoParamsForModel(videoMeta?.modelKey || "", videoMeta, prev.vquality, prev.videoSize || prev.size, prev.videoSeconds, prev.videoGenerateAudio, prev.videoSeed);

    useConfigStore.setState({
      config: {
        ...prev,
        channelMode: "local",
        baseUrl: "platform",
        apiKey: "platform",
        channels: syncChannels(imageModels, videoModels, textModels),
        model: imageValue || prev.model,
        imageModel: imageValue || prev.imageModel,
        videoModel: videoValue || prev.videoModel,
        textModel: textValue || prev.textModel,
        quality: imageParams.quality,
        size: imageParams.size,
        vquality: videoParams.vquality,
        videoSize: videoParams.size,
        videoSeconds: videoParams.videoSeconds,
        videoGenerateAudio: videoParams.videoGenerateAudio,
        videoSeed: videoParams.videoSeed,
        models: [...imageModels, ...videoModels, ...textModels].map((m) => m.name),
      },
    });
    markCanvasPreferenceCloudHydrated();
    // 首次无云端记录时把当前偏好写入库
    if (!cloudPref || isEmptyPreference(cloudPref)) {
      scheduleSaveCloudCanvasPreferences(0);
    }
  } finally {
    usePlatformModelsStore.setState({ loadingImage: false, loadingVideo: false });
  }
}

function isEmptyPreference(pref: CanvasPreferencePayload) {
  return !pref.imageSupplierId && !pref.videoSupplierId && !pref.imageAiModelId && !pref.videoAiModelId && !pref.textAiModelId && !pref.imageModel && !pref.videoModel && !pref.textModel;
}

export async function selectImageRoute(supplierId: number) {
  usePlatformModelsStore.setState({ loadingImage: true, imageSupplierId: supplierId });
  writeStoredSupplierId(IMAGE_SUPPLIER_KEY, supplierId);
  try {
    const options = await fetchImageTaskOptions({ supplierId });
    const imageRoutes = options.routes?.length ? options.routes : usePlatformModelsStore.getState().imageRoutes;
    // 仅当前线路关联模型，与 ImageManageList 的 modelSupplierId 语义一致
    const imageModels = imageModelsFromOptions(options).map((m) => asChannelModel(m, "image"));
    usePlatformModelsStore.setState({ imageRoutes, imageSupplierId: supplierId });

    const prev = useConfigStore.getState().config;
    const videoChannel = prev.channels.find((c) => c.id === PLATFORM_VIDEO_CHANNEL);
    const videoModels = videoChannel?.models.filter((m) => m.capability === "video") || [];
    const imageValue = pickModelValue(PLATFORM_IMAGE_CHANNEL, imageModels, undefined, options.defaultModelId);
    const imageMeta = imageModels.find((m) => encodeChannelModel(PLATFORM_IMAGE_CHANNEL, m.name) === imageValue);
    const imageParams = normalizeImageParamsForModel(imageMeta?.modelKey || "", prev.quality, prev.size);

    useConfigStore.setState({
      config: {
        ...prev,
        channels: syncChannels(imageModels, videoModels),
        model: imageValue || prev.model,
        imageModel: imageValue || prev.imageModel,
        quality: imageParams.quality,
        size: imageParams.size,
        models: [...imageModels, ...videoModels, ...(prev.channels.find((c) => c.id === PLATFORM_TEXT_CHANNEL)?.models || [])].map((m) => m.name),
      },
    });
    scheduleSaveCloudCanvasPreferences();
  } finally {
    usePlatformModelsStore.setState({ loadingImage: false });
  }
}

export async function selectVideoRoute(supplierId: number) {
  const { staffId, talentId } = getPlatformActorIds();
  usePlatformModelsStore.setState({ loadingVideo: true, videoSupplierId: supplierId });
  writeStoredSupplierId(VIDEO_SUPPLIER_KEY, supplierId);
  try {
    // 与分镜页一致：保存精品漫线路偏好，再按 staff/talent 拉可见模型
    await saveModelSupplierPreferences({ premiumComicSupplierId: supplierId }).catch(() => undefined);
    const [videoRoutes, videoModelsRaw] = await Promise.all([
      fetchModelSupplierRoutes("PREMIUM_COMIC", staffId, talentId).catch(() => usePlatformModelsStore.getState().videoRoutes),
      fetchPremiumVideoModels(supplierId, staffId, talentId),
    ]);
    const videoModels = excludeHiddenXingyaoLiteModels(videoModelsRaw).map((m) => asChannelModel(m, "video"));
    usePlatformModelsStore.setState({ videoRoutes, videoSupplierId: supplierId });

    const prev = useConfigStore.getState().config;
    const imageChannel = prev.channels.find((c) => c.id === PLATFORM_IMAGE_CHANNEL);
    const imageModels = imageChannel?.models.filter((m) => m.capability === "image") || [];
    const videoValue = pickModelValue(PLATFORM_VIDEO_CHANNEL, videoModels, prev.videoModel);
    const videoMeta = videoModels.find((m) => encodeChannelModel(PLATFORM_VIDEO_CHANNEL, m.name) === videoValue);
    const videoParams = normalizeVideoParamsForModel(videoMeta?.modelKey || "", videoMeta, prev.vquality, prev.videoSize || prev.size, prev.videoSeconds, prev.videoGenerateAudio, prev.videoSeed);

    useConfigStore.setState({
      config: {
        ...prev,
        channels: syncChannels(imageModels, videoModels),
        videoModel: videoValue || prev.videoModel,
        vquality: videoParams.vquality,
        videoSize: videoParams.size,
        videoSeconds: videoParams.videoSeconds,
        videoGenerateAudio: videoParams.videoGenerateAudio,
        videoSeed: videoParams.videoSeed,
        models: [...imageModels, ...videoModels, ...(prev.channels.find((c) => c.id === PLATFORM_TEXT_CHANNEL)?.models || [])].map((m) => m.name),
      },
    });
    scheduleSaveCloudCanvasPreferences();
  } finally {
    usePlatformModelsStore.setState({ loadingVideo: false });
  }
}

/** 切换模型时刷新可用参数（写入全局 config；节点侧需同步 patch） */
export function applyModelParamDefaults(config: AiConfig, modelValue: string): Partial<AiConfig> {
  const meta = resolvePlatformModelMeta({ ...config, model: modelValue }, modelValue);
  if (!meta) return {};
  if (meta.capability === "image") {
    return normalizeImageParamsForModel(meta.modelKey, config.quality, config.size);
  }
  if (meta.capability === "video") {
    const found = findChannelModel(config, modelValue)?.model;
    const prevMeta = resolvePlatformModelMeta(config, config.model || config.videoModel);
    let audioIn = config.videoGenerateAudio;
    // Grok 等无声模型会把开关写成 false；切回可有声模型时不要沿用，避免无声成片
    if (prevMeta?.modelKey && !supportsGenerateAudioForModel(prevMeta.modelKey) && supportsGenerateAudioForModel(meta.modelKey)) {
      audioIn = "true";
    }
    const videoParams = normalizeVideoParamsForModel(meta.modelKey, found, config.vquality, config.videoSize || config.size, config.videoSeconds, audioIn, config.videoSeed);
    return {
      vquality: videoParams.vquality,
      videoSize: videoParams.size,
      size: videoParams.size,
      videoSeconds: videoParams.videoSeconds,
      videoGenerateAudio: videoParams.videoGenerateAudio,
      videoSeed: videoParams.videoSeed,
    };
  }
  return {};
}

/** 节点 metadata 补丁：模型切换后同步参数 */
export function modelChangeMetadataPatch(config: AiConfig, modelValue: string): Record<string, unknown> {
  // 用切换前的 config.model 判断上一模型；不要先覆盖 model 再算参数
  const params = applyModelParamDefaults(config, modelValue);
  const patch: Record<string, unknown> = { model: modelValue };
  if (params.quality != null) patch.quality = params.quality;
  if (params.size != null) patch.size = params.size;
  if (params.vquality != null) patch.vquality = params.vquality;
  if (params.videoSeconds != null) patch.seconds = params.videoSeconds;
  if (params.videoGenerateAudio != null) patch.generateAudio = params.videoGenerateAudio;
  if (params.videoSeed != null) patch.seed = params.videoSeed;
  return patch;
}

export type PlatformModelMeta = {
  complianceSupplierId?: number;
  aiModelId: number;
  modelKey: string;
  displayName: string;
  capability: ModelCapability;
  supportedResolutions?: string[];
};

export function resolvePlatformModelMeta(config: AiConfig, modelValue?: string): PlatformModelMeta | null {
  const value = (modelValue || config.model || "").trim();
  if (!value) return null;
  const found = findChannelModel(config, value);
  const model = found?.model;
  if (model?.aiModelId) {
    return {
      aiModelId: model.aiModelId,
      modelKey: model.modelKey || modelOptionName(value),
      displayName: model.displayName || model.name,
      complianceSupplierId: model.complianceSupplierId,
      capability: model.capability,
      supportedResolutions: model.supportedResolutions,
    };
  }
  const raw = modelOptionName(value);
  const [idPart, keyPart] = raw.split("__");
  const aiModelId = Number(idPart);
  if (!Number.isFinite(aiModelId) || aiModelId <= 0) return null;
  return {
    aiModelId,
    modelKey: keyPart || raw,
    displayName: raw,
    complianceSupplierId: found?.model.complianceSupplierId,
    capability: found?.model.capability || "image",
    supportedResolutions: found?.model.supportedResolutions,
  };
}

export function mapQualityToSize(quality?: string, modelKey?: string): string {
  return normalizeSizeForModel(modelKey || "", quality || "1K");
}

export function mapAspectRatio(size?: string, modelKey?: string): string {
  return normalizeAspectForModel(modelKey || "", size || "auto");
}

export function platformImageSizeOptions(modelKey: string) {
  return sizeOptionsForModel(modelKey);
}
