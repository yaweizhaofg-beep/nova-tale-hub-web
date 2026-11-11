import { getToken } from "@canvas/lib/auth-token";
import { MEDIA_API_BASE_URL } from "@canvas/constant/env";
import { getOssAssetUploadSts, platformClient } from "@canvas/services/api/backend-client";
import { uploadAssetFileDirectWithKey, rewriteOssPublicUrl } from "@canvas/lib/platform/oss-upload";

let cachedPublicUrlBase = "";
let cachedBucketHost = "";
let cachedBaseAt = 0;
const BASE_CACHE_MS = 4 * 60 * 1000;

function looksSignedUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.searchParams.has("X-Amz-Signature") || u.searchParams.has("X-Amz-Algorithm")) return true;
    if (u.searchParams.has("X-Tos-Signature") || u.searchParams.has("X-Tos-Algorithm")) return true;
    if (u.searchParams.has("Signature") && (u.searchParams.has("Expires") || u.searchParams.has("OSSAccessKeyId"))) return true;
  } catch {
    return false;
  }
  return false;
}

/** 上游临时/海外 TOS 等常无 CORS，浏览器直连会红字失败；应优先走后台代理 */
export function shouldPreferMediaProxy(url: string) {
  if (!/^https?:\/\//i.test(url)) return false;
  if (looksSignedUrl(url)) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes("volces.com") ||
      host.includes("bytepluses.com") ||
      host.includes(".tos-") ||
      host.startsWith("tos-") ||
      host.includes("scapi.net")
    );
  } catch {
    return false;
  }
}

async function loadOwnOssBases() {
  const now = Date.now();
  if (cachedPublicUrlBase && now - cachedBaseAt < BASE_CACHE_MS) {
    return { publicUrlBase: cachedPublicUrlBase, bucketHost: cachedBucketHost };
  }
  const sts = await getOssAssetUploadSts();
  const publicUrlBase = (sts.publicUrlBase || "").trim().replace(/\/$/, "");
  const ep = (sts.endpoint || "").replace(/^https?:\/\//, "");
  const bucketHost = sts.bucket && ep ? `${sts.bucket}.${ep}` : "";
  cachedPublicUrlBase = publicUrlBase;
  cachedBucketHost = bucketHost;
  cachedBaseAt = now;
  return { publicUrlBase, bucketHost };
}

/** 是否已是画布直传的永久 OSS（assets/ 路径、无签名） */
export async function isOwnPermanentOssUrl(url?: string | null): Promise<boolean> {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  if (looksSignedUrl(url)) return false;
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes("/assets/")) return false;
    const { publicUrlBase, bucketHost } = await loadOwnOssBases();
    if (publicUrlBase && url.startsWith(`${publicUrlBase}/`)) return true;
    if (bucketHost && parsed.hostname === bucketHost) return true;
    if (parsed.hostname.toLowerCase() === "video-seedance2.oss-cn-beijing.aliyuncs.com") return true;
    if (parsed.hostname.toLowerCase() === "video-seedance2.xingyao-mcn.cn") return true;
  } catch {
    return false;
  }
  return false;
}

async function fetchBlobDirect(src: string) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`下载媒体失败 (${res.status})`);
  return res.blob();
}

async function fetchBlobViaProxy(src: string) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  // POST body 传 url：海外 TOS 签名链很长，线上 GET query 易被网关切断 → Failed to fetch
  const res = await fetch(`${MEDIA_API_BASE_URL}/admin/infinite-canvas/media-proxy`, {
    method: "POST",
    headers,
    body: JSON.stringify({ url: src }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text.trim() || `代理下载媒体失败 (${res.status})`);
  }
  return res.blob();
}

/** 远程媒体：签名/海外链只走后台代理（直连常 CORS，Network 仍可能显示 200） */
export async function fetchRemoteMediaBlob(src: string): Promise<Blob> {
  if (shouldPreferMediaProxy(src)) {
    try {
      return await fetchBlobViaProxy(src);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "代理下载失败";
      throw new Error(`海外/签名媒体需经代理转存：${msg}`);
    }
  }
  try {
    return await fetchBlobDirect(src);
  } catch {
    return fetchBlobViaProxy(src);
  }
}

function guessExt(blob: Blob, fallbackName: string) {
  if (fallbackName.includes(".")) return "";
  if (blob.type.includes("png")) return ".png";
  if (blob.type.includes("jpeg") || blob.type.includes("jpg")) return ".jpg";
  if (blob.type.includes("webp")) return ".webp";
  if (blob.type.includes("gif")) return ".gif";
  if (blob.type.includes("mp4")) return ".mp4";
  if (blob.type.includes("webm")) return ".webm";
  if (blob.type.includes("audio") || blob.type.includes("mpeg")) return ".mp3";
  if (blob.type.includes("wav")) return ".wav";
  return "";
}

function fileNameFromUrl(url: string, fallbackName: string) {
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").pop() || "";
    if (base.includes(".")) return base.slice(0, 120);
  } catch {
    /* ignore */
  }
  return fallbackName;
}

/** Blob 直传永久 OSS，返回公网 URL */
export async function persistBlobToOss(blob: Blob, fallbackName: string): Promise<string> {
  const ext = guessExt(blob, fallbackName);
  const name = fallbackName.includes(".") ? fallbackName : `${fallbackName}${ext}`;
  const file = new File([blob], name, { type: blob.type || "application/octet-stream" });
  const uploaded = await uploadAssetFileDirectWithKey(file);
  return uploaded.url;
}

/**
 * 服务端拉取上游并写入自有 OSS（正式环境跨域代理整段视频易 Failed to fetch）。
 */
async function persistViaServer(src: string): Promise<string> {
  const { data } = await platformClient.post<{ url?: string }>(
    "/admin/infinite-canvas/persist-remote-media",
    { url: src },
    { baseURL: MEDIA_API_BASE_URL, timeout: 600_000 },
  );
  const permanent = rewriteOssPublicUrl((data?.url || "").trim());
  if (!/^https?:\/\//i.test(permanent)) {
    throw new Error("服务端转存未返回永久地址");
  }
  return permanent;
}

/**
 * 把远程临时链（上游 CDN / 签名 URL）转存到自有永久 OSS。
 * 已是自有 assets/ 永久地址则原样返回。
 * 海外/签名媒体走服务端转存；其它仍可浏览器拉 blob 后直传。
 */
export async function persistRemoteMediaToOss(url: string, fallbackName = "media.bin"): Promise<string> {
  if (await isOwnPermanentOssUrl(url)) return rewriteOssPublicUrl(url);
  if (shouldPreferMediaProxy(url)) {
    try {
      return await persistViaServer(url);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "服务端转存失败";
      throw new Error(`海外/签名媒体需经代理转存：${msg}`);
    }
  }
  const blob = await fetchRemoteMediaBlob(url);
  return persistBlobToOss(blob, fileNameFromUrl(url, fallbackName));
}
