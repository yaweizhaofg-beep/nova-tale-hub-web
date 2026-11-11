import { resolveModelRequestConfig, type AiConfig } from "@canvas/stores/use-config-store";
import type { ReferenceImage } from "@canvas/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@canvas/types/media";
import { usePlatformModelsStore } from "@canvas/services/api/platform-models";
import { REF_LIMITS_DEFAULT, refLimitsForModel, referenceMediaLimitHintForModel, referenceVideoLimitHintForModel } from "@canvas/lib/platform/videoModels.js";

function selectedVideoSupplier() {
    const { videoRoutes, videoSupplierId } = usePlatformModelsStore.getState();
    return videoRoutes.find((r) => r.id === videoSupplierId);
}

export function referenceMediaLimitHint(modelKey?: string) {
    return referenceMediaLimitHintForModel(modelKey, selectedVideoSupplier());
}

/** 默认上限（2.0 等）；按模型请用 refLimitsForModel / referenceByteLimits */
export const SEEDANCE_REFERENCE_LIMITS = {
    images: REF_LIMITS_DEFAULT.maxImages,
    videos: REF_LIMITS_DEFAULT.maxVideos,
    audios: REF_LIMITS_DEFAULT.maxAudios,
    mediaTotal: REF_LIMITS_DEFAULT.maxMediaTotal,
    imageMaxBytes: 30 * 1024 * 1024,
    videoMaxBytes: 200 * 1024 * 1024,
    audioMaxBytes: 15 * 1024 * 1024,
};
export const SEEDANCE_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime"];

export function referenceCountLimits(modelKey?: string) {
    const lim = refLimitsForModel(modelKey, selectedVideoSupplier());
    return {
        images: lim.maxImages as number,
        videos: lim.maxVideos as number,
        audios: lim.maxAudios as number,
        mediaTotal: lim.maxMediaTotal as number,
        minVideoDurationMs: lim.minVideoDurationMs as number,
        maxVideoDurationMs: lim.maxVideoDurationMs as number,
        maxVideoTotalDurationMs: lim.maxVideoTotalDurationMs as number,
        minAudioDurationMs: (lim.minAudioDurationMs ?? 1800) as number,
        maxAudioDurationMs: (lim.maxAudioDurationMs ?? 15000) as number,
        maxAudioTotalDurationMs: (lim.maxAudioTotalDurationMs ?? 15000) as number,
        imageMaxBytes: SEEDANCE_REFERENCE_LIMITS.imageMaxBytes,
        videoMaxBytes: SEEDANCE_REFERENCE_LIMITS.videoMaxBytes,
        audioMaxBytes: SEEDANCE_REFERENCE_LIMITS.audioMaxBytes,
    };
}

export function assertReferenceCountsForModel(
    modelKey: string,
    images: number,
    videos: number,
    audios: number,
) {
    const lim = referenceCountLimits(modelKey);
    if (images > lim.images) throw new Error(`参考图最多 ${lim.images} 张（当前 ${images} 张）`);
    if (videos > lim.videos) throw new Error(`参考视频最多 ${lim.videos} 个（当前 ${videos} 个）`);
    if (audios > lim.audios) throw new Error(`参考音频最多 ${lim.audios} 个（当前 ${audios} 个）`);
    const total = images + videos + audios;
    if (total > lim.mediaTotal) throw new Error(`参考素材合计最多 ${lim.mediaTotal} 个（当前 ${total} 个）`);
}

export const seedanceResolutionOptions = [
    { value: "480p", label: "480p" },
    { value: "720p", label: "720p" },
    { value: "1080p", label: "1080p" },
] as const;

export const seedanceRatioOptions = [
    { value: "16:9", label: "横屏" },
    { value: "9:16", label: "竖屏" },
    { value: "1:1", label: "方形" },
    { value: "4:3", label: "标准横屏" },
    { value: "3:4", label: "标准竖屏" },
    { value: "21:9", label: "宽银幕" },
    { value: "adaptive", label: "自适应" },
] as const;

export const seedanceDurationOptions = [-1, 4, 5, 6, 8, 10, 12, 15] as const;

const seedancePixels = {
    "480p": {
        "16:9": "864x496",
        "4:3": "752x560",
        "1:1": "640x640",
        "3:4": "560x752",
        "9:16": "496x864",
        "21:9": "992x432",
    },
    "720p": {
        "16:9": "1280x720",
        "4:3": "1112x834",
        "1:1": "960x960",
        "3:4": "834x1112",
        "9:16": "720x1280",
        "21:9": "1470x630",
    },
    "1080p": {
        "16:9": "1920x1080",
        "4:3": "1664x1248",
        "1:1": "1440x1440",
        "3:4": "1248x1664",
        "9:16": "1080x1920",
        "21:9": "2206x946",
    },
} as const;

export function isSeedanceVideoConfig(config: AiConfig | Pick<AiConfig, "model" | "videoModel" | "apiFormat">) {
    const requestConfig = "channels" in config ? resolveModelRequestConfig(config, config.model || config.videoModel) : config;
    return requestConfig.apiFormat === "ark";
}

export function normalizeSeedanceResolution(value: string) {
    const normalized = normalizeResolutionToken(value);
    return seedanceResolutionOptions.some((item) => item.value === normalized) ? normalized : "720p";
}

export function normalizeResolutionToken(value: string) {
    if (value === "low") return "480p";
    if (value === "auto" || value === "high" || value === "medium") return "720p";
    const resolution = String(value || "").replace(/p$/i, "") || "720";
    return `${resolution}p`;
}

export function normalizeSeedanceDuration(value: string) {
    if (String(value).trim() === "-1") return -1;
    const seconds = Math.floor(Number(value) || 5);
    return Math.max(4, Math.min(15, seconds));
}

export function normalizeSeedanceRatio(value: string) {
    if (!value || value === "auto" || value === "adaptive") return "adaptive";
    if (seedanceRatioOptions.some((item) => item.value === value)) return value;
    const match = value.match(/^(\d+)x(\d+)$/);
    if (!match) return "adaptive";
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!width || !height) return "adaptive";
    const ratio = width / height;
    const options = [
        ["16:9", 16 / 9],
        ["4:3", 4 / 3],
        ["1:1", 1],
        ["3:4", 3 / 4],
        ["9:16", 9 / 16],
        ["21:9", 21 / 9],
    ] as const;
    return options.reduce((best, item) => (Math.abs(item[1] - ratio) < Math.abs(best[1] - ratio) ? item : best), options[0])[0];
}

export function seedancePixelLabel(resolution: string, ratio: string) {
    const normalizedResolution = normalizeSeedanceResolution(resolution) as keyof typeof seedancePixels;
    const normalizedRatio = normalizeSeedanceRatio(ratio) as keyof (typeof seedancePixels)[typeof normalizedResolution] | "adaptive";
    if (normalizedRatio === "adaptive") return "自动匹配";
    return seedancePixels[normalizedResolution][normalizedRatio] || "";
}

export function boolConfig(value: string | undefined, fallback: boolean) {
    if (value === "true") return true;
    if (value === "false") return false;
    return fallback;
}

export function seedanceReferenceLabel(kind: "image" | "video" | "audio", index: number) {
    if (kind === "image") return `图片${index + 1}`;
    if (kind === "video") return `视频${index + 1}`;
    return `音频${index + 1}`;
}

export function buildSeedancePromptText(prompt: string, images: ReferenceImage[], videos: ReferenceVideo[], audios: ReferenceAudio[]) {
    const labels = [
        ...images.map((_, index) => seedanceReferenceLabel("image", index)),
        ...videos.map((_, index) => seedanceReferenceLabel("video", index)),
        ...audios.map((_, index) => seedanceReferenceLabel("audio", index)),
    ];
    const text = prompt.trim();
    if (!labels.length) return text;
    return `参考资产编号：${labels.join("、")}。请按这些编号理解提示词中的图片、视频和音频引用。\n\n${text}`;
}

export function seedanceVideoReferenceError(videos: ReferenceVideo[], modelKey?: string) {
    const lim = referenceCountLimits(modelKey);
    let totalDurationMs = 0;
    for (let index = 0; index < videos.length; index += 1) {
        const video = videos[index];
        const label = seedanceReferenceLabel("video", index);
        if (!SEEDANCE_VIDEO_MIME_TYPES.includes(video.type)) return `${label} 仅支持 mp4/mov 格式`;
        if (video.bytes && video.bytes > lim.videoMaxBytes) return `${label} 超过 200MB，请压缩后再上传`;
        if (video.durationMs) {
            if (video.durationMs < lim.minVideoDurationMs || video.durationMs > lim.maxVideoDurationMs) {
                return `${label} 时长需要在 ${lim.minVideoDurationMs / 1000}-${lim.maxVideoDurationMs / 1000} 秒之间`;
            }
            totalDurationMs += video.durationMs;
        }
        if (video.width && video.height) {
            if (video.width < 300 || video.width > 6000 || video.height < 300 || video.height > 6000) return `${label} 宽高需要在 300-6000px 之间`;
            const ratio = video.width / video.height;
            if (ratio < 0.4 || ratio > 2.5) return `${label} 宽高比需要在 0.4-2.5 之间`;
            const pixels = video.width * video.height;
            if (pixels < 640 * 640 || pixels > 3326 * 2494) return `${label} 总像素需要在 409600-8295044 之间`;
        }
    }
    if (totalDurationMs > lim.maxVideoTotalDurationMs) {
        return `参考视频总时长不能超过 ${lim.maxVideoTotalDurationMs / 1000} 秒`;
    }
    return "";
}

export function seedanceVideoReferenceHint(modelKey?: string) {
    return referenceVideoLimitHintForModel(modelKey);
}
