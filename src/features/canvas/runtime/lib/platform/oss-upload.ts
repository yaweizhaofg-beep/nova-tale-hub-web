import { getOssAssetUploadSts } from "@canvas/services/api/backend-client";

function datePath() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}/${month}/${day}`;
}

function objectExt(file: File) {
  const name = file?.name || "";
  if (name.includes(".")) return name.slice(name.lastIndexOf("."));
  return "";
}

function randomObjectId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function buildAssetObjectKey(file: File) {
  return `assets/${datePath()}/${randomObjectId()}${objectExt(file)}`;
}

const OSS_CDN_PUBLIC_HOST = "video-seedance2.xingyao-mcn.cn";

export function rewriteOssPublicUrl(url?: string | null) {
  if (!url) return url || "";
  return url.replace(
    /^https?:\/\/video-seedance2\.oss-cn-beijing\.aliyuncs\.com(?=[/:?]|$)/i,
    `https://${OSS_CDN_PUBLIC_HOST}`,
  );
}

let cachedSts: Awaited<ReturnType<typeof getOssAssetUploadSts>> | null = null;
let cachedStsAt = 0;
const STS_CACHE_MS = 4 * 60 * 1000;

async function loadSts() {
  const now = Date.now();
  if (cachedSts && now - cachedStsAt < STS_CACHE_MS) return cachedSts;
  const data = await getOssAssetUploadSts();
  if (!data?.accessKeyId || !data.bucket || !data.region) throw new Error("上传授权响应无效");
  cachedSts = data;
  cachedStsAt = now;
  return data;
}

function buildPublicUrl(objectKey: string, sts: NonNullable<typeof cachedSts>) {
  const base = (sts.publicUrlBase || "").trim();
  const url = base
    ? `${base.replace(/\/$/, "")}/${objectKey}`
    : `https://${OSS_CDN_PUBLIC_HOST}/${objectKey}`;
  return rewriteOssPublicUrl(url);
}

const IMAGE_MAX_SIZE = 20 * 1024 * 1024;

export async function uploadAssetFileDirectWithKey(file: File) {
  if (file.type?.startsWith("image/") && file.size > IMAGE_MAX_SIZE) {
    throw new Error(`图片大小不能超过 20MB，当前 ${(file.size / 1024 / 1024).toFixed(1)}MB`);
  }
  const [sts, { default: OSS }] = await Promise.all([loadSts(), import("ali-oss")]);
  const objectKey = buildAssetObjectKey(file);
  const client = new OSS({
    region: sts.region,
    accessKeyId: sts.accessKeyId,
    accessKeySecret: sts.accessKeySecret,
    stsToken: sts.securityToken,
    bucket: sts.bucket,
    secure: true,
  });
  await client.put(objectKey, file);
  return { objectKey, url: buildPublicUrl(objectKey, sts) };
}
