import axios from "axios";
import { customAlphabet } from "nanoid";
import { platformClient } from "@canvas/services/api/backend-client";
import { audioMimeType, normalizeAudioFormatValue, normalizeAudioSpeedValue, selectedAudioSpeakers } from "@canvas/lib/audio-generation";
import { persistRemoteMediaToOss } from "@canvas/lib/platform/persist-media-to-oss";
import { resolveMediaUrl } from "@canvas/services/file-storage";
import type { AiConfig } from "@canvas/stores/use-config-store";
import type { CanvasNodeMetadata } from "@canvas/types/canvas";
import type { NodeGenerationContext } from "@canvas/components/canvas/canvas-node-generation";

const base = "/admin/infinite-canvas/audio";
// 局域网 HTTP 没有 randomUUID；使用安全随机数，并满足后端 requestId 字符限制。
const createAudioRequestId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 32);
export type AudioModel = { id: number; name: string; model_key: string; configured: boolean; sell_per_minute: number; reserve_points: number; deduct_points: boolean };
export type AudioVoice = { speaker_id: string; name: string; trial_url?: string; description?: string; company_id: number };
export type AudioReference = { type: "audio" | "image" | "speaker"; value: string };
export type AudioTask = { id: string; status: string; request_json: string; original_duration?: number; duration?: number; audio_url?: string; subtitle_json?: string; actual_points?: number; reserved_points: number; error_message?: string; created_at: string };
export const audioStatusLabels: Record<string, string> = { QUEUED: "排队中", RUNNING: "生成中", UPLOADING: "保存中", STORING: "重试保存中", UNKNOWN: "结果待核对", FAILED: "失败（已退还预扣）", SUCCEEDED: "已完成" };
export const RESTORE_AUDIO_EVENT = "canvas:restore-audio-task";
export async function fetchAudioModels() { return (await platformClient.get<AudioModel[]>(`${base}/models`)).data; }
export async function fetchAudioVoices() { return (await platformClient.get<AudioVoice[]>(`${base}/voices`)).data; }
export async function fetchAudioHistory(page = 0) { return (await platformClient.get<AudioTask[]>(`${base}/tasks`, { params: { page } })).data; }
export async function fetchAudioTask(id: string) { return (await platformClient.get<AudioTask>(`${base}/tasks/${encodeURIComponent(id)}`)).data; }
export class AudioTaskPendingError extends Error { constructor(message: string) { super(message); this.name = "AudioTaskPendingError"; } }
export async function waitForAudioTask(id: string, signal?: AbortSignal): Promise<AudioTask> {
    const deadline = Date.now() + 12 * 60_000;
    while (Date.now() < deadline) {
        if (signal?.aborted) throw new DOMException("已停止等待；后台任务继续生成", "AbortError");
        let task: AudioTask;
        try { task = await fetchAudioTask(id); }
        catch { throw new AudioTaskPendingError("暂时无法查询音频任务，请从历史记录或刷新后继续查询，勿重复提交"); }
        if (task.status === "SUCCEEDED") return task;
        if (task.status === "FAILED") throw new Error(task.error_message || "音频生成失败，已退还预扣积分");
        if (task.status === "UNKNOWN") throw new AudioTaskPendingError(task.error_message || "上游结果待核对，请联系管理员");
        await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    throw new AudioTaskPendingError("音频仍在后台处理，请稍后从历史记录查询，勿重复提交");
}
export function audioTaskMetadata(task: AudioTask): CanvasNodeMetadata {
    const request = JSON.parse(task.request_json);
    const references: AudioReference[] = (request.references || []).map((r: Record<string, string>) => r.speaker ? { type: "speaker", value: r.speaker } : r.image_url ? { type: "image", value: r.image_url } : { type: "audio", value: r.audio_url });
    return { content: task.audio_url || "", storageKey: "", status: task.status === "SUCCEEDED" ? "success" : task.status === "FAILED" ? "error" : "loading", errorDetails: task.error_message, prompt: request.text_prompt,
        model: "seed-audio-1.0", audioFormat: request.audio_config?.format || "mp3", mimeType: audioMimeType(request.audio_config?.format),
        audioSpeed: String(1 + (request.audio_config?.speech_rate || 0) / 100), audioVolume: String(request.audio_config?.loudness_rate || 0), audioPitch: String(request.audio_config?.pitch_rate || 0), audioSubtitle: String(request.audio_config?.enable_subtitle !== false),
        audioInstructions: "", audioVoice: JSON.stringify(references.filter(r => r.type === "speaker").map(r => r.value)),
        durationMs: Number(task.duration || task.original_duration || 0) * 1000, audioOriginalDuration: Number(task.original_duration || 0), audioConsumedPoints: Number(task.actual_points || 0), audioSubtitleJson: task.subtitle_json,
        platformTaskId: task.id, platformTaskKind: "audio", audioReferenceSnapshot: references };
}
type RequestOptions = { signal?: AbortSignal; projectId?: string; nodeId?: string; context?: NodeGenerationContext | null; savedReferences?: AudioReference[]; onSubmitted: (id: string, task?: AudioTask) => void };
export async function requestAudioGeneration(config: AiConfig, prompt: string, options: RequestOptions): Promise<AudioTask> {
    const model = (await fetchAudioModels()).find(m => m.model_key === "seed-audio-1.0" && m.configured);
    if (!model) throw new Error("当前公司未启用火山音频线路，请联系管理员配置 API Key 和价格");
    const text = [(config.audioInstructions || "").trim(), prompt.trim().replace(/@?音频(\d+)/g, "@音频$1")].filter(Boolean).join("\n");
    if (!text || [...text].length > 3000) throw new Error("音频提示词（含声音指令）须为 1～3000 字");
    const context = options.context;
    let references = options.savedReferences;
    if (!references) {
        const speakers = selectedAudioSpeakers(config.audioVoice);
        const images = context?.referenceImages || [];
        const audios = context?.referenceAudios || [];
        if (context?.referenceVideos.length) throw new Error("音频生成不支持参考视频，请断开视频连接");
        if (images.length > 1 || (images.length && (audios.length || speakers.length))) throw new Error("仅可参考一张图片，图片不能与参考音频或指定音色混用");
        if (audios.length + speakers.length > 3) throw new Error("参考音频与指定音色合计不能超过 3 个");
        references = [];
        for (const image of images) references.push({ type: "image", value: await persistRemoteMediaToOss(image.dataUrl, image.name || "reference.png") });
        for (const audio of audios) {
            if ((audio.durationMs || 0) > 30_000) throw new Error("单条参考音频不能超过 30 秒");
            const url = await resolveMediaUrl(audio.storageKey, audio.url);
            references.push({ type: "audio", value: await persistRemoteMediaToOss(url, audio.name || "reference.mp3") });
        }
        references.push(...speakers.map(value => ({ type: "speaker" as const, value })));
    }
    if (options.signal?.aborted) throw new DOMException("已停止", "AbortError");
    const requestId = createAudioRequestId();
    let submitted: AudioTask;
    try {
        const response = await platformClient.post<AudioTask>(`${base}/tasks`, { requestId, modelId: model.id, projectId: options.projectId, nodeId: options.nodeId, prompt: text, references,
            format: normalizeAudioFormatValue(config.audioFormat), speechRate: Math.round((Number(normalizeAudioSpeedValue(config.audioSpeed)) - 1) * 100), loudnessRate: Number(config.audioVolume || 0), pitchRate: Number(config.audioPitch || 0), subtitle: config.audioSubtitle !== "false" });
        submitted = response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) throw new Error(typeof error.response.data === "string" ? error.response.data : error.response.data?.message || "音频提交失败，请检查参数和积分余额");
        options.onSubmitted(requestId);
        throw new AudioTaskPendingError("音频提交结果尚未确认，请在历史记录核对，勿重复生成");
    }
    options.onSubmitted(requestId, submitted);
    return waitForAudioTask(requestId, options.signal);
}
