import { getNodeSpec, NODE_DEFAULT_SIZE } from "@canvas/constant/canvas";
import { nodeSizeFromRatio } from "@canvas/lib/canvas/canvas-node-size";
import type { AiConfig } from "@canvas/stores/use-config-store";
import { defaultConfig } from "@canvas/stores/use-config-store";
import type { UploadedImage } from "@canvas/services/image-storage";
import type { UploadedFile } from "@canvas/services/file-storage";
import type { ReferenceImage } from "@canvas/types/image";
import { CanvasNodeType, type CanvasImageGenerationType, type CanvasNodeData, type CanvasNodeMetadata, type CanvasNodeTypeId, type Position } from "@canvas/types/canvas";
import { originalImageUrl } from "@canvas/lib/platform/oss-image";

export function createCanvasNode(type: CanvasNodeTypeId, position: Position, metadata?: CanvasNodeMetadata): CanvasNodeData {
    const spec = getNodeSpec(type);
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    return {
        id,
        type,
        title: spec.title,
        position: {
            x: position.x - spec.width / 2,
            y: position.y - spec.height / 2,
        },
        width: spec.width,
        height: spec.height,
        metadata: { ...spec.metadata, ...metadata },
    };
}

export function imageMetadata(image: UploadedImage): CanvasNodeMetadata {
    return { content: image.url, storageKey: image.storageKey, status: "success", naturalWidth: image.width, naturalHeight: image.height, bytes: image.bytes, mimeType: image.mimeType };
}

export function videoMetadata(video: UploadedFile): CanvasNodeMetadata {
    return { content: video.url, storageKey: video.storageKey, status: "success", loadingLabel: undefined, naturalWidth: video.width, naturalHeight: video.height, bytes: video.bytes, mimeType: video.mimeType || "video/mp4", durationMs: video.durationMs, posterUrl: undefined };
}

export const PLATFORM_VIDEO_TTL_MS = 24 * 60 * 60 * 1000;
export const PLATFORM_VIDEO_WARN_MS = 2 * 60 * 60 * 1000;

/** 平台生成/增强的临时链视频：从写入起 24 小时后过期 */
export function withPlatformVideoExpiry(metadata: CanvasNodeMetadata): CanvasNodeMetadata {
    return { ...metadata, videoExpiresAt: Date.now() + PLATFORM_VIDEO_TTL_MS };
}

export function countPlatformVideosExpiringSoon(nodes: CanvasNodeData[], now = Date.now()) {
    return nodes.filter((node) => {
        if (node.type !== CanvasNodeType.Video) return false;
        const expiresAt = node.metadata?.videoExpiresAt;
        if (!expiresAt) return false;
        const left = expiresAt - now;
        return left > 0 && left <= PLATFORM_VIDEO_WARN_MS;
    }).length;
}

export function audioMetadata(audio: UploadedFile): CanvasNodeMetadata {
    return { content: audio.url, storageKey: audio.storageKey, status: "success", bytes: audio.bytes, mimeType: audio.mimeType || "audio/mpeg", durationMs: audio.durationMs };
}

export function referenceUrl(image: ReferenceImage) {
    const url = originalImageUrl(image.url);
    const dataUrl = originalImageUrl(image.dataUrl);
    return image.storageKey || url || (!dataUrl.startsWith("data:") ? dataUrl : undefined);
}

export function buildImageGenerationMetadata(type: CanvasImageGenerationType, config: AiConfig, count: number, references: ReferenceImage[]): CanvasNodeMetadata {
    return {
        generationType: type,
        model: config.model,
        size: config.size,
        quality: config.quality,
        ...(config.background ? { background: config.background } : {}),
        count,
        references: references.map(referenceUrl).filter((url): url is string => Boolean(url)),
    };
}

export function buildAudioGenerationMetadata(config: AiConfig): CanvasNodeMetadata {
    return {
        model: config.model,
        audioVoice: config.audioVoice,
        audioFormat: config.audioFormat,
        audioSpeed: config.audioSpeed,
        audioInstructions: config.audioInstructions,
        audioPitch: config.audioPitch,
        audioVolume: config.audioVolume,
        audioSubtitle: config.audioSubtitle,
    };
}

/** 新建视频节点时写入全局偏好默认值，避免只改偏好却进画布仍像未设置 */
export function buildVideoPreferenceMetadata(config: AiConfig): CanvasNodeMetadata {
    return {
        model: config.videoModel || config.model,
        size: config.videoSize || defaultConfig.videoSize,
        vquality: config.vquality || defaultConfig.vquality,
        seconds: config.videoSeconds || defaultConfig.videoSeconds,
        generateAudio: config.videoGenerateAudio || defaultConfig.videoGenerateAudio,
        watermark: config.videoWatermark || defaultConfig.videoWatermark,
        seed: config.videoSeed || "",
        status: "idle",
        content: "",
    };
}

export function applyNodeConfigPatch(node: CanvasNodeData, patch: Partial<CanvasNodeData["metadata"]>) {
    const safePatch = patch || {};
    const next = { ...node, metadata: { ...node.metadata, ...safePatch } };
    const spec = node.type === CanvasNodeType.Video ? NODE_DEFAULT_SIZE[CanvasNodeType.Video] : NODE_DEFAULT_SIZE[CanvasNodeType.Image];
    const box = node.type === CanvasNodeType.Video ? Math.max(spec.width, spec.height) : 0;
    const size = typeof safePatch.size === "string" && !node.metadata?.content
        ? nodeSizeFromRatio(safePatch.size, box || spec.width, box || spec.height)
        : null;
    return size && (node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video) ? { ...next, ...size, position: { x: node.position.x + node.width / 2 - size.width / 2, y: node.position.y + node.height / 2 - size.height / 2 } } : next;
}
