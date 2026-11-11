import {
  getCanvasVideoUpscaleJob,
  quoteCanvasVideoUpscale,
  createCanvasVideoUpscaleJob,
  type CanvasVideoUpscaleJobDto,
  type CanvasVideoUpscaleParams,
} from "@canvas/services/api/backend-client";
import { isRemoteHttpUrl } from "@canvas/lib/canvas/canvas-import-compliance";

/** 输出帧率：空字符串表示跟随原片 */
export const VIDEO_UPSCALE_FPS_OPTIONS = [
  { value: "", label: "跟随原片" },
  { value: "30", label: "30 fps" },
  { value: "60", label: "60 fps" },
  { value: "120", label: "120 fps" },
] as const;

export const VIDEO_UPSCALE_RESOLUTIONS = ["720p", "1080p", "2k"] as const;

export type VideoUpscaleParams = CanvasVideoUpscaleParams;

export const defaultVideoUpscaleParams: VideoUpscaleParams = {
  resolution: "1080p",
  targetFps: null,
};

const POLL_MS = 3000;
/** 整任务最长等待（增强+转码）；超时给明确文案，避免前端无限轮询 */
const POLL_DEADLINE_MS = 30 * 60 * 1000;

function platformErrorMessage(error: unknown, fallback: string) {
  const msg =
    (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
    (error as { message?: string })?.message;
  const text = typeof msg === "string" && msg.trim() ? msg.trim() : "";
  if (/timeout of \d+ms exceeded/i.test(text) || (error as { code?: string })?.code === "ECONNABORTED") {
    return "画质增强请求超时，请确认已部署最新前端，且网关 Nginx proxy_read_timeout ≥ 1800s；任务可能仍在后台运行，可稍后重试或查积分流水";
  }
  return text || fallback;
}

function normalizeStatus(status?: string | null) {
  return String(status || "")
    .trim()
    .toUpperCase();
}

export function probeVideoDurationSeconds(url: string, timeoutMs = 12000): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
    };
    video.onloadedmetadata = () => {
      const sec = video.duration;
      cleanup();
      resolve(Number.isFinite(sec) && sec > 0 ? Math.round(sec * 10000) / 10000 : null);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = url;
  });
}

export function probeVideoDimensions(url: string, timeoutMs = 12000): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
    };
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      cleanup();
      resolve(width >= 16 && height >= 16 ? { width, height } : null);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = url;
  });
}

async function resolveSourceDimensions(opts: {
  url: string;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
}) {
  const w = opts.sourceWidth;
  const h = opts.sourceHeight;
  if (w != null && h != null && w >= 16 && h >= 16) {
    return { sourceWidth: w, sourceHeight: h };
  }
  const probed = await probeVideoDimensions(opts.url);
  return probed ? { sourceWidth: probed.width, sourceHeight: probed.height } : {};
}

export function probeVideoSourceFps(url: string, timeoutMs = 12000): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
    };
    video.onloadedmetadata = () => {
      // 浏览器无法可靠读容器 fps，估价默认 24；有 WebCodecs 再增强
      cleanup();
      resolve(24);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = url;
  });
}

export async function resolveVideoDurationSeconds(opts: { url: string; durationMs?: number | null }) {
  if (opts.durationMs != null && Number.isFinite(opts.durationMs) && opts.durationMs > 0) {
    return Math.round((opts.durationMs / 1000) * 10000) / 10000;
  }
  const probed = await probeVideoDurationSeconds(opts.url);
  return probed && probed > 0 ? probed : 5;
}

/** @deprecated */
export type VideoEnhanceParams = VideoUpscaleParams;
/** @deprecated */
export const VIDEO_UPSCALE_MODES = [{ value: "generative", label: "大模型增强" }] as const;
/** @deprecated */
export const VIDEO_ENHANCE_SCENES = VIDEO_UPSCALE_MODES.map((m) => ({ value: m.value, label: m.label }));
/** @deprecated */
export const VIDEO_ENHANCE_RESOLUTIONS = VIDEO_UPSCALE_RESOLUTIONS;

export async function quoteVideoUpscale(opts: {
  videoUrl: string;
  durationMs?: number | null;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  params: VideoUpscaleParams;
}) {
  const url = opts.videoUrl.trim();
  const durationSeconds = await resolveVideoDurationSeconds({ url, durationMs: opts.durationMs });
  const sourceFps = (await probeVideoSourceFps(url)) ?? 24;
  const dimensions = await resolveSourceDimensions({ url, sourceWidth: opts.sourceWidth, sourceHeight: opts.sourceHeight });
  return quoteCanvasVideoUpscale({
    videoUrl: url,
    durationSeconds,
    sourceFps,
    ...dimensions,
    ...opts.params,
  });
}

export async function runVideoUpscale(opts: {
  nodeId: string;
  videoUrl: string;
  durationMs?: number | null;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  title?: string;
  params: VideoUpscaleParams;
  signal?: AbortSignal;
}): Promise<{ outputVideoUrl: string; job: CanvasVideoUpscaleJobDto }> {
  const url = opts.videoUrl.trim();
  if (!isRemoteHttpUrl(url) || !/^https:\/\//i.test(url)) {
    throw new Error("请先将视频上传到云端（https 地址）后再做画质增强");
  }

  const durationSeconds = await resolveVideoDurationSeconds({ url, durationMs: opts.durationMs });
  const sourceFps = (await probeVideoSourceFps(url)) ?? 24;
  const dimensions = await resolveSourceDimensions({ url, sourceWidth: opts.sourceWidth, sourceHeight: opts.sourceHeight });
  let job: CanvasVideoUpscaleJobDto;
  try {
    job = await createCanvasVideoUpscaleJob({
      videoUrl: url,
      durationSeconds,
      sourceFps,
      ...dimensions,
      nodeId: opts.nodeId,
      title: opts.title,
      ...opts.params,
    });
  } catch (error) {
    throw new Error(platformErrorMessage(error, "提交画质增强失败"));
  }

  if (!job?.id) throw new Error("提交画质增强失败：未返回任务 id");

  const deadline = Date.now() + POLL_DEADLINE_MS;
  while (true) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (Date.now() > deadline) {
      throw new Error("画质增强超时（已超过 30 分钟仍未完成，请稍后在积分流水中确认是否已扣费并重试）");
    }
    let detail: CanvasVideoUpscaleJobDto;
    try {
      detail = await getCanvasVideoUpscaleJob(job.id);
    } catch (error) {
      throw new Error(platformErrorMessage(error, "查询画质增强状态失败"));
    }
    const status = normalizeStatus(detail.status);
    if (status === "SUCCEEDED") {
      const outputVideoUrl = detail.outputVideoUrl?.trim();
      if (!outputVideoUrl) throw new Error("画质增强成功但未返回视频地址");
      return { outputVideoUrl, job: detail };
    }
    if (status === "FAILED") {
      throw new Error(detail.errorMessage || "画质增强失败");
    }
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(resolve, POLL_MS);
      opts.signal?.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
  }
}

/** @deprecated 使用 runVideoUpscale */
export const runVideoEnhance = async (opts: {
  nodeId: string;
  videoUrl: string;
  durationMs?: number | null;
  title?: string;
  bytes?: number;
  params: VideoUpscaleParams;
  signal?: AbortSignal;
}) => {
  const result = await runVideoUpscale(opts);
  return { ...result, outputDurationSeconds: undefined };
};
