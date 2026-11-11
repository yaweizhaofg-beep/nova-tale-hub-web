import { defaultConfig, resolveModelForCapability, type AiConfig } from "@canvas/stores/use-config-store";
import { resolveImageUrl, uploadImage } from "@canvas/services/image-storage";
import { resolveMediaUrl } from "@canvas/services/file-storage";
import { imageMetadata, referenceUrl } from "@canvas/lib/canvas/canvas-node-factory";
import { rewriteOssPublicUrl } from "@canvas/lib/platform/oss-upload";
import { originalImageUrl } from "@canvas/lib/platform/oss-image";
import type { NodeGenerationInput } from "@canvas/components/canvas/canvas-node-generation";
import type { CanvasNodeGenerationMode } from "@canvas/components/canvas/canvas-node-prompt-panel";
import type { CanvasImageAngleParams } from "@canvas/components/canvas/canvas-node-angle-dialog";
import type { ReferenceImage } from "@canvas/types/image";
import { CanvasNodeType, type CanvasAssistantSession, type CanvasConnection, type CanvasNodeData, type CanvasNodeMetadata } from "@canvas/types/canvas";

export function imageExtension(dataUrl: string) {
    return dataUrl.match(/^data:image[/]([^;]+)/)?.[1] || dataUrl.match(/image[/]([^;]+)/)?.[1] || "png";
}

export function audioExtension(mimeType?: string) {
    if (mimeType?.includes("wav")) return "wav";
    if (mimeType?.includes("ogg") || mimeType?.includes("opus")) return "ogg";
    if (mimeType?.includes("aac")) return "aac";
    if (mimeType?.includes("flac")) return "flac";
    if (mimeType?.includes("pcm")) return "pcm";
    return "mp3";
}

export function generationReferenceUrls(context: { referenceImages: ReferenceImage[]; referenceVideos: Array<{ storageKey?: string; url?: string }>; referenceAudios?: Array<{ storageKey?: string; url?: string }> }) {
    return [
        ...context.referenceImages.map(referenceUrl).filter((url): url is string => Boolean(url)),
        ...context.referenceVideos.map((video) => video.storageKey || video.url).filter((url): url is string => Boolean(url)),
        ...(context.referenceAudios || []).map((audio) => audio.storageKey || audio.url).filter((url): url is string => Boolean(url)),
    ];
}

export async function resolveMetadataReferences(metadata: CanvasNodeMetadata) {
    if (metadata.generationType !== "edit") return [];
    if (!metadata.references?.length) return null;
    const references = await Promise.all(
        metadata.references.map(async (url, index) => {
            const dataUrl = url.startsWith("image:") ? await resolveImageUrl(url, "") : originalImageUrl(url);
            return dataUrl ? { id: `${index}`, name: `reference-${index}.png`, type: "image/png", dataUrl, storageKey: url.startsWith("image:") ? url : undefined } : null;
        }),
    );
    return references.every(Boolean) ? (references as ReferenceImage[]) : null;
}

export async function hydrateCanvasImages(nodes: CanvasNodeData[]) {
    return Promise.all(
        nodes.map(async (node) => {
            const rawContent = node.metadata?.content;
            const content = rawContent ? rewriteOssPublicUrl(rawContent) : rawContent;
            if ((node.type === CanvasNodeType.Video || node.type === CanvasNodeType.Audio) && node.metadata?.storageKey) return { ...node, metadata: { ...node.metadata, content: rewriteOssPublicUrl(await resolveMediaUrl(node.metadata.storageKey, content)) } };
            if (node.type !== CanvasNodeType.Image || !content) return content !== node.metadata?.content ? { ...node, metadata: { ...node.metadata, content } } : node;
            if (node.metadata?.storageKey) return { ...node, metadata: { ...node.metadata, content: rewriteOssPublicUrl(await resolveImageUrl(node.metadata.storageKey, content)) } };
            if (!content.startsWith("data:image/")) return content !== node.metadata?.content ? { ...node, metadata: { ...node.metadata, content } } : node;
            return { ...node, metadata: { ...node.metadata, ...imageMetadata(await uploadImage(content)) } };
        }),
    );
}

export async function hydrateAssistantImages(sessions: CanvasAssistantSession[]) {
    const hydrateItem = async <T extends { dataUrl?: string; storageKey?: string }>(item: T) => {
        if (item.storageKey) return { ...item, dataUrl: rewriteOssPublicUrl(await resolveImageUrl(item.storageKey, item.dataUrl)) };
        if (item.dataUrl?.startsWith("data:image/")) {
            const image = await uploadImage(item.dataUrl);
            return { ...item, dataUrl: image.url, storageKey: image.storageKey };
        }
        const dataUrl = item.dataUrl ? rewriteOssPublicUrl(item.dataUrl) : item.dataUrl;
        return dataUrl !== item.dataUrl ? { ...item, dataUrl } : item;
    };
    return Promise.all(
        sessions.map(async (session) => ({
            ...session,
            messages: await Promise.all(
                session.messages.map(async (message) => ({
                    ...message,
                    references: await Promise.all((message.references || []).map(hydrateItem)),
                })),
            ),
        })),
    );
}

export function getGenerationCount(count: string) {
    return Math.max(1, Math.min(15, Math.floor(Math.abs(Number(count)) || 1)));
}

export function getInputSummary(inputs: NodeGenerationInput[]) {
    return {
        textCount: inputs.filter((input) => input.type === "text").length,
        imageCount: inputs.filter((input) => input.type === "image").length,
        videoCount: inputs.filter((input) => input.type === "video").length,
        audioCount: inputs.filter((input) => input.type === "audio").length,
    };
}

export function buildGenerationConfig(config: AiConfig, node: CanvasNodeData | undefined, mode: CanvasNodeGenerationMode): AiConfig {
    const defaultVideoSize = config.videoSize || defaultConfig.videoSize;
    return {
        ...config,
        model: mode === "audio" ? "seed-audio-1.0" : resolveModelForCapability(config, node?.metadata?.model, mode),
        reasoningEffort: node?.metadata?.reasoningEffort || config.reasoningEffort || defaultConfig.reasoningEffort,
        quality: node?.metadata?.quality || config.quality || defaultConfig.quality,
        size: mode === "video" ? node?.metadata?.size || defaultVideoSize : node?.metadata?.size || config.size || defaultConfig.size,
        videoSize: mode === "video" ? node?.metadata?.size || defaultVideoSize : config.videoSize || defaultVideoSize,
        background: node?.metadata?.background ?? config.background ?? defaultConfig.background,
        videoSeconds: node?.metadata?.seconds || config.videoSeconds || defaultConfig.videoSeconds,
        vquality: node?.metadata?.vquality || config.vquality || defaultConfig.vquality,
        videoGenerateAudio: node?.metadata?.generateAudio || config.videoGenerateAudio || defaultConfig.videoGenerateAudio,
        videoWatermark: node?.metadata?.watermark || config.videoWatermark || defaultConfig.videoWatermark,
        videoSeed: node?.metadata?.seed ?? config.videoSeed ?? defaultConfig.videoSeed,
        audioVoice: node?.metadata?.audioVoice ?? config.audioVoice ?? defaultConfig.audioVoice,
        audioFormat: node?.metadata?.audioFormat || config.audioFormat || defaultConfig.audioFormat,
        audioSpeed: node?.metadata?.audioSpeed || config.audioSpeed || defaultConfig.audioSpeed,
        audioInstructions: node?.metadata?.audioInstructions ?? config.audioInstructions ?? defaultConfig.audioInstructions,
        audioPitch: node?.metadata?.audioPitch ?? config.audioPitch ?? defaultConfig.audioPitch,
        audioVolume: node?.metadata?.audioVolume ?? config.audioVolume ?? defaultConfig.audioVolume,
        audioSubtitle: node?.metadata?.audioSubtitle ?? config.audioSubtitle ?? defaultConfig.audioSubtitle,
        count: String(node?.metadata?.count || (mode === "image" ? config.canvasImageCount || config.count : config.count) || defaultConfig.count),
    };
}

export function hasResumablePlatformTask(node: CanvasNodeData) {
    const kind = node.metadata?.platformTaskKind;
    if (!node.metadata?.platformTaskId || (kind !== "image" && kind !== "video" && kind !== "audio")) return false;
    if (node.metadata?.status === "loading") return true;
    // 前端轮询超时误判失败时，刷新后仍可续等后台任务
    return (kind === "video" || kind === "audio") && node.metadata?.status === "error";
}

export function isVideoPollTimeout(error: unknown) {
    return error instanceof Error && error.message.includes("视频生成超时");
}

export function shouldKeepVideoTaskWaiting(node: CanvasNodeData, error: unknown) {
    return Boolean(node.metadata?.platformTaskId) && ((isVideoPollTimeout(error) && node.metadata?.platformTaskKind === "video") || (error instanceof Error && error.name === "AudioTaskPendingError" && node.metadata?.platformTaskKind === "audio"));
}

/** 刷新后：有平台任务 id 的 loading 节点保留以便续轮询；其余 loading 静默回 idle。 */
export function resetInterruptedGeneration(nodes: CanvasNodeData[]) {
    return nodes.map((node) => {
        // 早期音频引用校验失败误标记了仍有可播放内容的来源节点；只修复该错误状态。
        if (node.type === CanvasNodeType.Audio && node.metadata?.content && node.metadata.status === "error"
            && node.metadata.errorDetails === "提示词包含不存在的声音参考") {
            return { ...node, metadata: { ...node.metadata, status: "success" as const, errorDetails: undefined } };
        }
        if (node.metadata?.status !== "loading") return node;
        if (hasResumablePlatformTask(node)) return node;
        return {
            ...node,
            metadata: {
                ...node.metadata,
                status: "idle" as const,
                errorDetails: undefined,
                platformTaskId: undefined,
                platformTaskKind: undefined,
                platformModelKey: undefined,
            },
        };
    });
}

export function clearPlatformTaskMeta() {
    return { platformTaskId: undefined, platformTaskKind: undefined, platformModelKey: undefined } as const;
}

/** 生图成功后保留任务 id，供合规状态查询 */
export function keepImagePlatformTaskMeta(taskId: string | number) {
    return {
        platformTaskId: String(taskId),
        platformTaskKind: "image" as const,
        platformModelKey: undefined,
    };
}

export function isGenerationCanceled(error: unknown) {
    return error instanceof Error && (error.message === "请求已取消" || error.name === "AbortError");
}

export function findRetrySourceNode(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const queue = connections.filter((connection) => connection.toNodeId === nodeId).map((connection) => connection.fromNodeId);
    const visited = new Set<string>();
    while (queue.length) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const node = nodes.find((item) => item.id === id);
        if (node?.type === CanvasNodeType.Config) return node;
        connections.filter((connection) => connection.toNodeId === id).forEach((connection) => queue.push(connection.fromNodeId));
    }
    return null;
}

export function sourceNodeReferenceImages(node: CanvasNodeData | null) {
    if (!node || node.type !== CanvasNodeType.Image || !node.metadata?.content) return [];
    return [
        {
            id: node.id,
            name: `${node.title || node.id}.png`,
            type: node.metadata.mimeType || "image/png",
            dataUrl: node.metadata.content,
            storageKey: node.metadata.storageKey,
            arkAssetId: node.metadata.arkAssetId,
            complianceStatus: node.metadata.complianceStatus,
            complianceSupplierId: node.metadata.complianceSupplierId,
            complianceLines: node.metadata.complianceLines,
        },
    ];
}

export function isAudioFile(file: File) {
    return file.type.startsWith("audio/") || /\.(mp3|wav)$/i.test(file.name);
}

export function buildAngleLabel(params: CanvasImageAngleParams) {
    const horizontal = params.horizontalAngle === 0 ? "正面视角" : params.horizontalAngle > 0 ? `向右旋转 ${params.horizontalAngle} 度` : `向左旋转 ${Math.abs(params.horizontalAngle)} 度`;
    const pitch = params.pitchAngle === 0 ? "水平视角" : params.pitchAngle > 0 ? `俯视 ${params.pitchAngle} 度` : `仰视 ${Math.abs(params.pitchAngle)} 度`;
    return `AI 多角度：${horizontal}，${pitch}，镜头距离 ${params.cameraDistance.toFixed(1)}，${params.wideAngle ? "广角" : "标准"}镜头`;
}

export function buildAnglePrompt(params: CanvasImageAngleParams) {
    return `基于参考图重新生成同一主体的新视角，保持主体、颜色、材质和画面风格一致，不要只做透视变形。${buildAngleLabel(params)}。`;
}
