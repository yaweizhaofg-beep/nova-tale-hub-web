import { getToken } from "@canvas/lib/auth-token";
import { MEDIA_API_BASE_URL } from "@canvas/constant/env";

export type ImageCropRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type ImageAngleTransform = {
    horizontalAngle: number;
    pitchAngle: number;
    cameraDistance: number;
    wideAngle: boolean;
};

export type ImageUpscaleAlgorithm = "nearest" | "bilinear" | "high";

export const MAX_UPSCALE_LONG_EDGE = 4096;

export type ImageUpscaleParams = {
    targetLongEdge: number;
    algorithm: ImageUpscaleAlgorithm;
};

export type ImageSplitParams = {
    rows: number;
    columns: number;
    horizontalLines?: number[];
    verticalLines?: number[];
};

export type ImageSplitPiece = {
    row: number;
    column: number;
    dataUrl: string;
};

export async function cropDataUrl(dataUrl: string, crop?: ImageCropRect) {
    return withLoadedImage(dataUrl, (image) => {
        if (crop) {
            return drawCrop(image, Math.floor(crop.x * image.width), Math.floor(crop.y * image.height), Math.ceil(crop.width * image.width), Math.ceil(crop.height * image.height));
        }
        const size = Math.min(image.width, image.height);
        const sx = Math.max(0, Math.floor((image.width - size) / 2));
        const sy = Math.max(0, Math.floor((image.height - size) / 2));
        return drawCrop(image, sx, sy, size, size);
    });
}

export async function splitDataUrl(dataUrl: string, params: ImageSplitParams): Promise<ImageSplitPiece[]> {
    return withLoadedImage(dataUrl, (image) => {
        const xCuts = buildSplitCuts(params.verticalLines, image.width, Math.max(1, Math.floor(params.columns)));
        const yCuts = buildSplitCuts(params.horizontalLines, image.height, Math.max(1, Math.floor(params.rows)));
        const pieces: ImageSplitPiece[] = [];

        for (let row = 0; row < yCuts.length - 1; row += 1) {
            const sy = yCuts[row];
            const sh = yCuts[row + 1] - sy;
            for (let column = 0; column < xCuts.length - 1; column += 1) {
                const sx = xCuts[column];
                const sw = xCuts[column + 1] - sx;
                pieces.push({ row, column, dataUrl: drawCrop(image, sx, sy, sw, sh) });
            }
        }

        return pieces;
    });
}

function buildSplitCuts(lines: number[] | undefined, size: number, count: number) {
    if (!lines?.length) return Array.from({ length: count + 1 }, (_, index) => Math.floor((index * size) / count));
    return [0, ...lines.map((line) => Math.round(line * size)).filter((line) => line > 0 && line < size).sort((a, b) => a - b), size];
}

export async function transformAngleDataUrl(dataUrl: string, params: ImageAngleTransform) {
    return withLoadedImage(dataUrl, (image) => {
        const canvas = document.createElement("canvas");
        const padding = Math.round(Math.max(image.width, image.height) * 0.18);
        canvas.width = image.width + padding * 2;
        canvas.height = image.height + padding * 2;
        const context = canvas.getContext("2d");
        if (!context) return dataUrl;
        context.clearRect(0, 0, canvas.width, canvas.height);

        const horizontal = params.horizontalAngle / 60;
        const pitch = params.pitchAngle / 45;
        const distanceScale = 1.12 - params.cameraDistance * 0.035;
        const wideScale = params.wideAngle ? 0.88 : 1;
        const scale = Math.max(0.64, Math.min(1.1, distanceScale * wideScale));
        const width = image.width * scale * (1 - Math.abs(horizontal) * 0.28);
        const height = image.height * scale * (1 - Math.abs(pitch) * 0.18);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const skewX = horizontal * image.width * 0.18;
        const skewY = pitch * image.height * 0.12;
        const x = cx - width / 2 + horizontal * padding * 0.5;
        const y = cy - height / 2 + pitch * padding * 0.45;

        context.save();
        context.setTransform(1, pitch * 0.08, horizontal * -0.1, 1, 0, 0);
        context.drawImage(image, x + skewX, y + skewY, width, height);
        context.restore();

        if (params.wideAngle) {
            const gradient = context.createRadialGradient(cx, cy, Math.min(canvas.width, canvas.height) * 0.2, cx, cy, Math.max(canvas.width, canvas.height) * 0.62);
            gradient.addColorStop(0, "rgba(255,255,255,0)");
            gradient.addColorStop(1, "rgba(0,0,0,0.18)");
            context.fillStyle = gradient;
            context.fillRect(0, 0, canvas.width, canvas.height);
        }

        return exportCanvas(canvas);
    });
}

export async function upscaleDataUrl(dataUrl: string, params: ImageUpscaleParams) {
    return withLoadedImage(dataUrl, (image) => {
        const { width, height } = resolveUpscaleSize(image.width, image.height, params.targetLongEdge);
        return params.algorithm === "high" ? drawStepUpscale(image, width, height) : drawResize(image, image.width, image.height, width, height, params.algorithm);
    });
}

export function resolveUpscaleSize(width: number, height: number, targetLongEdge: number) {
    const longEdge = Math.max(1, width, height);
    const target = Math.min(MAX_UPSCALE_LONG_EDGE, Math.max(1, Math.round(targetLongEdge)));
    const scale = target / longEdge;
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function drawCrop(image: HTMLImageElement, sx: number, sy: number, sw: number, sh: number) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, sw);
    canvas.height = Math.max(1, sh);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法创建画布，裁剪失败");
    context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return exportCanvas(canvas);
}

function drawStepUpscale(image: HTMLImageElement, width: number, height: number) {
    let source: CanvasImageSource = image;
    let sourceWidth = image.width;
    let sourceHeight = image.height;

    while (sourceWidth * 2 < width && sourceHeight * 2 < height) {
        const nextWidth = sourceWidth * 2;
        const nextHeight = sourceHeight * 2;
        const next = drawResizeCanvas(source, sourceWidth, sourceHeight, nextWidth, nextHeight, "high");
        source = next;
        sourceWidth = nextWidth;
        sourceHeight = nextHeight;
    }

    return drawResize(source, sourceWidth, sourceHeight, width, height, "high");
}

function drawResize(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, width: number, height: number, algorithm: ImageUpscaleAlgorithm) {
    return exportCanvas(drawResizeCanvas(source, sourceWidth, sourceHeight, width, height, algorithm));
}

function drawResizeCanvas(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, width: number, height: number, algorithm: ImageUpscaleAlgorithm) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return canvas;
    context.imageSmoothingEnabled = algorithm !== "nearest";
    context.imageSmoothingQuality = algorithm === "bilinear" ? "medium" : "high";
    context.drawImage(source, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);
    return canvas;
}

function exportCanvas(canvas: HTMLCanvasElement) {
    try {
        return canvas.toDataURL("image/png");
    } catch {
        throw new Error("图片跨域限制，无法导出。请确认媒体代理可用后重试");
    }
}

type ImageSource = { url: string; revoke?: () => void };

async function fetchBlobDirect(src: string) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`下载图片失败 (${res.status})`);
    return res.blob();
}

async function fetchBlobViaProxy(src: string) {
    const token = getToken();
    // POST body 传 url：与 persist-media-to-oss 一致，避免超长签名链塞进 GET query
    const res = await fetch(`${MEDIA_API_BASE_URL}/admin/infinite-canvas/media-proxy`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: src }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text.trim() || `代理下载图片失败 (${res.status})`);
    }
    return res.blob();
}

/** 远程图先拉成同源 blob，避免 OSS 无 CORS 时 canvas 被污染无法 toDataURL */
async function resolveImageSource(src: string): Promise<ImageSource> {
    if (src.startsWith("blob:") || src.startsWith("data:")) return { url: src };
    if (!/^https?:\/\//i.test(src)) return { url: src };

    let blob: Blob;
    try {
        blob = await fetchBlobDirect(src);
    } catch {
        blob = await fetchBlobViaProxy(src);
    }
    const url = URL.createObjectURL(blob);
    return { url, revoke: () => URL.revokeObjectURL(url) };
}

function decodeImage(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("图片加载失败"));
        image.src = url;
    });
}

async function withLoadedImage<T>(src: string, fn: (image: HTMLImageElement) => T | Promise<T>): Promise<T> {
    const source = await resolveImageSource(src);
    try {
        const image = await decodeImage(source.url);
        return await fn(image);
    } finally {
        source.revoke?.();
    }
}
