import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from "react";

const OSS_CDN_HOST = "video-seedance2.xingyao-mcn.cn";

/** 列表、chip、素材条等小图。 */
export const OSS_THUMB_WIDTH = 100;

function canOssProcess(url: string) {
    try {
        const host = new URL(url).hostname.toLowerCase();
        return host === OSS_CDN_HOST || host.endsWith(".aliyuncs.com");
    } catch {
        return false;
    }
}

/** 请求参数、保存、合规都用原图，去掉展示用的 x-oss-process。 */
export function originalImageUrl(url?: string | null) {
    const raw = String(url ?? "").trim();
    if (!/[?&]x-oss-process=/i.test(raw)) return raw;
    return raw
        .replace(/([?&])x-oss-process=[^&#]*/gi, "$1")
        .replace(/\?&/g, "?")
        .replace(/&&/g, "&")
        .replace(/[?&](#|$)/, "$1");
}

/** 仅用于展示。节点里保存的 content 仍是原图 URL。 */
export function ossImageThumb(url: string | null | undefined, width: number): string {
    const raw = String(url || "").trim();
    if (!raw || raw.startsWith("data:") || raw.startsWith("blob:") || /[?&]x-oss-process=/i.test(raw) || !canOssProcess(raw)) return raw;
    const w = Math.max(1, Math.round(width));
    const process = `image/resize,w_${w},m_lfit/format,webp/ignore-error,1`;
    return `${raw}${raw.includes("?") ? "&" : "?"}x-oss-process=${process}`;
}

/** 按节点在画布上的宽度取一档压缩宽度，最大 1600。 */
export function ossCanvasDisplayWidth(nodeWidth: number) {
    const px = Math.max(OSS_THUMB_WIDTH, Math.round(nodeWidth || 340)) * 2;
    return Math.min(1600, Math.ceil(px / 200) * 200);
}

/** 自有 OSS 视频的封面截图。非 OSS、data、blob 返回空字符串，调用方不要为此去加载视频。 */
export function ossVideoPoster(url: string | null | undefined, width: number): string {
    const raw = originalImageUrl(String(url || "").trim().split("#")[0]);
    if (!raw || /^(data:|blob:|asset:)/i.test(raw) || !canOssProcess(raw)) return "";
    const w = Math.max(1, Math.round(width));
    const process = `video/snapshot,t_0,f_jpg,w_${w},m_fast`;
    return `${raw}${raw.includes("?") ? "&" : "?"}x-oss-process=${process}`;
}

export function OssVideoPoster({ url, maxWidth, className, fallback }: { url: string; maxWidth: number; className?: string; fallback?: ReactNode }) {
    const poster = ossVideoPoster(url, maxWidth);
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [poster]);
    if (!poster || failed) {
        if (/^https?:\/\//i.test(url)) {
            return <video src={`${url.split("#")[0]}#t=0.1`} muted playsInline preload="metadata" className={className} />;
        }
        return <>{fallback}</>;
    }
    return <img src={poster} alt="" draggable={false} className={className} onError={() => setFailed(true)} />;
}

export function bindOssThumb(image: HTMLImageElement, url: string, width: number) {
    const thumb = ossImageThumb(url, width);
    image.src = thumb;
    if (thumb === url) return;
    image.addEventListener(
        "error",
        () => {
            image.src = url;
        },
        { once: true },
    );
}

export function OssThumbImage({ src, maxWidth, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { src: string; maxWidth: number }) {
    const thumb = ossImageThumb(src, maxWidth);
    const [useOriginal, setUseOriginal] = useState(false);
    useEffect(() => setUseOriginal(false), [thumb]);
    return (
        <img
            {...rest}
            src={useOriginal ? src : thumb}
            onError={() => {
                if (!useOriginal && thumb !== src) setUseOriginal(true);
            }}
        />
    );
}
