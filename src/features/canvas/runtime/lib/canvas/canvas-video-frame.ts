/** 从视频截取帧为 PNG dataUrl（用于画布图片节点） */

import { fetchRemoteMediaBlob } from "@canvas/lib/platform/persist-media-to-oss";
import { getMediaBlob } from "@canvas/services/file-storage";

function waitVideoEvent(video: HTMLVideoElement, event: keyof HTMLMediaElementEventMap, timeoutMs = 20000) {
    return new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => {
            cleanup();
            reject(new Error("视频加载超时，无法截取帧"));
        }, timeoutMs);
        const onOk = () => {
            cleanup();
            resolve();
        };
        const onErr = () => {
            cleanup();
            reject(new Error("视频加载失败，无法截取帧"));
        };
        const cleanup = () => {
            window.clearTimeout(timer);
            video.removeEventListener(event, onOk);
            video.removeEventListener("error", onErr);
        };
        video.addEventListener(event, onOk, { once: true });
        video.addEventListener("error", onErr, { once: true });
    });
}

/** 等待至少一帧解码完成，避免首帧 currentTime≈0 时画布仍是空的 */
function waitDecodedFrame(video: HTMLVideoElement, timeoutMs = 5000) {
    return new Promise<void>((resolve) => {
        const done = () => resolve();
        const anyVideo = video as HTMLVideoElement & {
            requestVideoFrameCallback?: (cb: () => void) => number;
        };
        if (typeof anyVideo.requestVideoFrameCallback === "function") {
            const timer = window.setTimeout(done, timeoutMs);
            anyVideo.requestVideoFrameCallback(() => {
                window.clearTimeout(timer);
                done();
            });
            return;
        }
        requestAnimationFrame(() => requestAnimationFrame(done));
    });
}

export type CapturedVideoFrame = {
    dataUrl: string;
    width: number;
    height: number;
    timeSec: number;
};

export function captureFrameFromVideoElement(video: HTMLVideoElement): CapturedVideoFrame {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) throw new Error("视频尚未就绪，请稍候再截取");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法截取视频帧");
    ctx.drawImage(video, 0, 0, width, height);
    try {
        return {
            dataUrl: canvas.toDataURL("image/png"),
            width,
            height,
            timeSec: Number.isFinite(video.currentTime) ? video.currentTime : 0,
        };
    } catch {
        throw new Error("视频跨域限制，无法截取帧");
    }
}

type CaptureSource = { url: string; revoke?: () => void };

/** 尽量得到同源 blob URL，避免 OSS 无 CORS 时无法截帧 */
async function resolveCaptureSource(src: string, storageKey?: string): Promise<CaptureSource> {
    if (storageKey) {
        const local = await getMediaBlob(storageKey);
        if (local) {
            const url = URL.createObjectURL(local);
            return { url, revoke: () => URL.revokeObjectURL(url) };
        }
    }
    if (src.startsWith("blob:") || src.startsWith("data:")) {
        return { url: src };
    }
    if (!/^https?:\/\//i.test(src)) {
        throw new Error("不支持的视频地址，无法截取帧");
    }

    const blob = await fetchRemoteMediaBlob(src);
    const url = URL.createObjectURL(blob);
    return { url, revoke: () => URL.revokeObjectURL(url) };
}

async function loadSeekableVideo(src: string, storageKey?: string) {
    const source = await resolveCaptureSource(src, storageKey);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = source.url;
    try {
        await waitVideoEvent(video, "loadedmetadata");
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            await Promise.race([waitVideoEvent(video, "loadeddata"), waitVideoEvent(video, "canplay")]).catch(() => undefined);
        }
        return { video, revoke: source.revoke };
    } catch (error) {
        source.revoke?.();
        video.removeAttribute("src");
        video.load();
        throw error;
    }
}

async function seekAndCapture(video: HTMLVideoElement, timeSec: number): Promise<CapturedVideoFrame> {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    // 精确 0 在部分编码下尚未解码出画面；略微偏移到首个可显示帧，再标记为 0s
    let target = duration > 0 ? Math.min(Math.max(0, timeSec), Math.max(0, duration - 0.04)) : Math.max(0, timeSec);
    const reportAsZero = timeSec <= 0;
    if (reportAsZero && duration > 0.08) {
        target = Math.min(0.04, duration * 0.002);
    }

    // 已在目标附近时强制「先离开再 seek」，否则不会触发 seeked、首帧常为空白
    if (Math.abs(video.currentTime - target) <= 0.02) {
        const nudge = duration > 0.2 ? Math.min(Math.max(target + 0.12, 0.12), duration - 0.04) : target + 0.01;
        video.currentTime = nudge;
        await waitVideoEvent(video, "seeked").catch(() => undefined);
    }
    video.currentTime = target;
    await waitVideoEvent(video, "seeked");
    await waitDecodedFrame(video);

    const frame = captureFrameFromVideoElement(video);
    return { ...frame, timeSec: reportAsZero ? 0 : target };
}

function disposeVideo(video: HTMLVideoElement, revoke?: () => void) {
    video.removeAttribute("src");
    video.load();
    revoke?.();
}

/** 抽取指定时间点的一帧（独立加载，不影响节点内播放） */
export async function captureVideoFrameAt(src: string, timeSec: number, storageKey?: string): Promise<CapturedVideoFrame> {
    const { video, revoke } = await loadSeekableVideo(src, storageKey);
    try {
        return await seekAndCapture(video, timeSec);
    } finally {
        disposeVideo(video, revoke);
    }
}

/** 抽取首帧与尾帧（分别截取，互不影响） */
export async function captureVideoFirstLastFrames(src: string, storageKey?: string): Promise<{ first: CapturedVideoFrame; last: CapturedVideoFrame }> {
    const { video, revoke } = await loadSeekableVideo(src, storageKey);
    try {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const first = await seekAndCapture(video, 0);
        const last = await seekAndCapture(video, duration > 0 ? duration : 0);
        return { first, last };
    } finally {
        disposeVideo(video, revoke);
    }
}

function shrinkJpeg(dataUrl: string, maxWidth: number) {
    return new Promise<string>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const scale = Math.min(1, maxWidth / Math.max(1, image.width));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext("2d");
            if (!context) {
                reject(new Error("无法压缩封面"));
                return;
            }
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.72));
        };
        image.onerror = () => reject(new Error("封面预览失败"));
        image.src = dataUrl;
    });
}

let posterActive = 0;
const posterWaiters: Array<() => void> = [];
const posterJobs = new Map<string, Promise<string>>();

function takePosterSlot() {
    if (posterActive < 1) {
        posterActive += 1;
        return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
        posterWaiters.push(() => {
            posterActive += 1;
            resolve();
        });
    });
}

function releasePosterSlot() {
    posterActive = Math.max(0, posterActive - 1);
    posterWaiters.shift()?.();
}

/** 临时链视频截一张小封面并上传 OSS。同一地址只跑一次。 */
export function loadVideoPosterUrl(src: string, storageKey?: string) {
    const existing = posterJobs.get(src);
    if (existing) return existing;
    const job = (async () => {
        await takePosterSlot();
        try {
            const { uploadImage } = await import("@canvas/services/image-storage");
            const frame = await captureVideoFrameAt(src, 0.1, storageKey);
            const jpeg = await shrinkJpeg(frame.dataUrl, 480);
            const uploaded = await uploadImage(jpeg);
            return uploaded.url;
        } finally {
            releasePosterSlot();
        }
    })();
    posterJobs.set(src, job);
    job.catch(() => posterJobs.delete(src));
    return job;
}
