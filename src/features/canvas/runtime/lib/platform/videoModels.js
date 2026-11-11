export const GROK_IMAGINE_MODEL_KEY = "grok_imagine";
export const SEEDANCE_15_PRO_MODEL_KEY = "doubao-seedance-1-5-pro-251215";
export const SEEDANCE_20_MODEL_KEY = "doubao-seedance-2-0-260128";
export const SEEDANCE_20_FAST_MODEL_KEY = "doubao-seedance-2-0-fast-260128";
export const SEEDANCE_20_MINI_MODEL_KEY = "doubao-seedance-2-0-mini-260615";
/** 与后台 TokenPricingUtil 星耀轻量版/超分打包对齐 */
export const SEEDANCE_20_UPSCALE_MODEL_KEY = "doubao-seedance-2-0-upscale-260128";
export const SEEDANCE_20_FAST_UPSCALE_MODEL_KEY = "doubao-seedance-2-0-fast-upscale-260128";
export const SEEDANCE_25_UPSCALE_MODEL_KEY = "doubao-seedance-2-5-upscale-260628";
export const SEEDANCE_20_ZIYONG_UPSCALE_MODEL_KEY = "dreamina-seedance-2-0-upscale-ziyong";

/** 星耀轻量是否在画布隐藏（与后端 PRODUCT_SURFACE_HIDDEN 对齐） */
export const XINGYAO_LITE_PRODUCT_HIDDEN = false;

/** 星耀轻量 Fast 已停售 */
export function isXingyaoLiteFastModel(modelKey) {
  const k = String(modelKey || "").trim().toLowerCase();
  return k === SEEDANCE_20_FAST_UPSCALE_MODEL_KEY || k.includes("seedance-2-0-fast-upscale");
}

/** 过滤隐藏的星耀轻量；并始终剔除已停售的 Fast */
export function excludeHiddenXingyaoLiteModels(models) {
  const list = Array.isArray(models) ? models : [];
  return list.filter((m) => {
    const key = m?.modelKey || m?.model_key || m?.name;
    if (isXingyaoLiteFastModel(key)) return false;
    if (XINGYAO_LITE_PRODUCT_HIDDEN && isSeedanceUpscaleBundleModel(key)) return false;
    return true;
  });
}
/** 与后台 TokenPricingUtil.MODEL_KEY_SEEDANCE_25 对齐 */
export const SEEDANCE_25_MODEL_KEY = "doubao-seedance-2-5-260628";

export const DEFAULT_DURATION_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
/** 与后台 AiVideoContentValidator：1.5 Pro 仅 4～12 或 -1 */
export const SEEDANCE_15_DURATION_OPTIONS = [-1, 4, 5, 6, 7, 8, 9, 10, 11, 12];
/** 与后台 AiVideoContentValidator：Seedance 2.5 仅 4～30（不支持 -1） */
export const SEEDANCE_25_DURATION_OPTIONS = [
  4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
];
export const GROK_DURATION_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
export const DEFAULT_RATIO_OPTIONS = ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "adaptive"];
export const GROK_RATIO_OPTIONS = ["16:9", "9:16"];
export const DEFAULT_RESOLUTION_OPTIONS = ["480p", "720p", "1080p"];
export const GROK_RESOLUTION_OPTIONS = ["480p", "720p"];
export const SEEDANCE_20_LITE_RESOLUTION_OPTIONS = ["480p", "720p"];
export const SEEDANCE_20_UPSCALE_RESOLUTION_OPTIONS = ["720p", "1080p"];
export const SEEDANCE_20_STANDARD_UPSCALE_RESOLUTION_OPTIONS = ["720p", "1080p", "4K"];
export const SEEDANCE_20_ZIYONG_UPSCALE_RESOLUTION_OPTIONS = ["480p", "720p", "1080p"];
export const SEEDANCE_25_RESOLUTION_OPTIONS = ["480p", "720p", "1080p"];

/** 线路四（盈合） */
export const YINGHE_VOLCANO_SUPPLIER_CODE = "YINGHE_VOLCANO";

export function isYingheVolcanoSupplier(supplier) {
  if (supplier == null) return false;
  const code = typeof supplier === "object" ? supplier.supplierCode || supplier.supplier_code : supplier;
  return String(code || "").trim().toUpperCase() === YINGHE_VOLCANO_SUPPLIER_CODE;
}

/** 满血 Seedance 2.0（非 fast / mini / 轻量超分） */
export function isSeedance20FullbloodModel(modelKey) {
  const k = String(modelKey || "").trim().toLowerCase();
  return k === SEEDANCE_20_MODEL_KEY || k === "dreamina-seedance-2-0-260128";
}

/** 线路四 + 满血 2.0：分镜台/画布仅允许 4K */
export function isYingheSeedance20FourKOnly(modelKey, supplier) {
  return isYingheVolcanoSupplier(supplier) && isSeedance20FullbloodModel(modelKey);
}

export function filterResolutionsForSupplier(modelKey, resolutions, supplier) {
  const list = Array.isArray(resolutions) ? resolutions : [];
  if (isMobileVolcanoSupplier(supplier)) return list.filter((r) => ["480p", "720p", "1080p"].includes(r));
  if (!isYingheSeedance20FourKOnly(modelKey, supplier)) return list;
  return ["4K"];
}

export function isMobileVolcanoSupplier(supplier) {
  const code = typeof supplier === "object" ? supplier?.supplierCode || supplier?.supplier_code : supplier;
  return String(code || "").trim().toUpperCase() === "MOBILE_VOLCANO";
}

/** 与后台 TokenPricingUtil 默认参考素材上限（Seedance 2.0 等）对齐 */
export const REF_LIMITS_DEFAULT = {
  maxImages: 9,
  maxVideos: 3,
  maxAudios: 3,
  maxMediaTotal: 12,
  minVideoDurationMs: 2000,
  maxVideoDurationMs: 15000,
  maxVideoTotalDurationMs: 15000,
  minAudioDurationMs: 1800,
  maxAudioDurationMs: 15000,
  maxAudioTotalDurationMs: 15000,
};

/** 与后台 Seedance 2.5 官方上限对齐：30 图 / 10 视频 / 10 音频 / 合计 50；参考视频/音频单条与总时长均 ≤30s */
export const REF_LIMITS_SEEDANCE_25 = {
  maxImages: 30,
  maxVideos: 10,
  maxAudios: 10,
  maxMediaTotal: 50,
  minVideoDurationMs: 2000,
  maxVideoDurationMs: 30000,
  maxVideoTotalDurationMs: 30000,
  minAudioDurationMs: 1800,
  maxAudioDurationMs: 30000,
  maxAudioTotalDurationMs: 30000,
};

function normKey(modelKey) {
  return String(modelKey || "").trim().toLowerCase();
}

export function isGrokImagineModel(modelKey) {
  return normKey(modelKey) === GROK_IMAGINE_MODEL_KEY;
}

export function isSeedance15ProModel(modelKey) {
  return normKey(modelKey) === SEEDANCE_15_PRO_MODEL_KEY;
}

/** 与后台 TokenPricingUtil.isSeedance25Model 对齐；2.5 超分 key 也算 2.5（时长/素材），其它 upscale 不算 */
export function isSeedance25Model(modelKey) {
  const k = normKey(modelKey);
  if (k === SEEDANCE_25_UPSCALE_MODEL_KEY) return true;
  if (k.includes("upscale")) return false;
  return k === SEEDANCE_25_MODEL_KEY || k.includes("seedance-2-5") || k.includes("seedance_2_5") || k.includes("seedance-2.5");
}

/** 超分打包（星耀轻量版）：勿用 includes("fast") 误伤 *-fast-upscale-* */
export function isSeedanceUpscaleBundleModel(modelKey) {
  const k = normKey(modelKey);
  return (
    k === SEEDANCE_20_UPSCALE_MODEL_KEY ||
    k === SEEDANCE_20_FAST_UPSCALE_MODEL_KEY ||
    k === SEEDANCE_25_UPSCALE_MODEL_KEY ||
    k.includes("seedance-2-0-upscale") ||
    k.includes("seedance-2-0-fast-upscale") ||
    k.includes("seedance-2-5-upscale") ||
    (k.includes("seedance") && k.includes("upscale"))
  );
}

/** 标准 2.0 轻量（可 4K 直出） */
export function isSeedance20StandardUpscaleModel(modelKey) {
  return normKey(modelKey) === SEEDANCE_20_UPSCALE_MODEL_KEY;
}

/** 星耀轻量 · 海外 2.0 自用（480/720/1080，不开放 4K） */
export function isSeedance20ZiyongUpscaleModel(modelKey) {
  const k = normKey(modelKey);
  return k === SEEDANCE_20_ZIYONG_UPSCALE_MODEL_KEY || k.includes("seedance-2-0-upscale-ziyong");
}

/** 星耀轻量 4K 直出：禁止参考视频 */
export function isXingyaoLiteNative4kPath(modelKey, resolution) {
  return isSeedance20StandardUpscaleModel(modelKey) && canonicalResolution(resolution) === "4K";
}

/** 与后台 TokenPricingUtil.isSeedance20FastModel 对齐（不含定制版） */
export function isSeedance20FastModel(modelKey) {
  const k = normKey(modelKey);
  if (isSeedanceUpscaleBundleModel(k)) return false;
  return k === SEEDANCE_20_FAST_MODEL_KEY || k.includes("seedance-2-0-fast") || k.includes("seedance-2.0-fast");
}

/** 与后台 isSeedance20LiteModel（fast + mini）对齐：不支持 1080p/4K；定制版除外 */
export function isSeedance20LiteModel(modelKey) {
  const k = normKey(modelKey);
  if (isSeedanceUpscaleBundleModel(k)) return false;
  return isSeedance20FastModel(k) || k === SEEDANCE_20_MINI_MODEL_KEY || k.includes("seedance-2-0-mini");
}

/** 与后台 isSeedance20StandardOrFastModel：上游强制有声（不含 2.5） */
export function isSeedance20ForcedAudioModel(modelKey) {
  const k = normKey(modelKey);
  return (
    k === SEEDANCE_20_MODEL_KEY ||
    k === SEEDANCE_20_FAST_MODEL_KEY ||
    k === SEEDANCE_20_MINI_MODEL_KEY ||
    k.startsWith("dreamina-seedance-2-0") ||
    k.includes("seedance-2-0") ||
    k.includes("seedance-2.0")
  );
}

/** 与后台 upstreamGenerateAudioForVideoRequest：2.0 系列 + 2.5 强制有声 */
export function isSeedanceForcedAudioModel(modelKey) {
  return isSeedance20ForcedAudioModel(modelKey) || isSeedance25Model(modelKey);
}

/** 与后台 TokenPricingUtil.maxReference* + Grok Imagine 最多 1 张图对齐 */
export function refLimitsForModel(modelKey, supplier) {
  const base = isSeedance25Model(modelKey) ? REF_LIMITS_SEEDANCE_25 : REF_LIMITS_DEFAULT;
  if (isMobileVolcanoSupplier(supplier)) return { ...base, maxImages: 9 };
  if (isGrokImagineModel(modelKey)) {
    return { ...base, maxImages: 1 };
  }
  return base;
}

export function referenceMediaLimitHintForModel(modelKey, supplier) {
  const lim = refLimitsForModel(modelKey, supplier);
  const maxSec = lim.maxVideoDurationMs / 1000;
  const totalSec = lim.maxVideoTotalDurationMs / 1000;
  const minAudioSec = lim.minAudioDurationMs / 1000;
  const maxAudioSec = lim.maxAudioDurationMs / 1000;
  const audioTotalSec = lim.maxAudioTotalDurationMs / 1000;
  const base = `参考素材：图≤${lim.maxImages}、视频≤${lim.maxVideos}、音频≤${lim.maxAudios}、合计≤${lim.maxMediaTotal}`;
  const mediaRules = `参考视频 mp4/mov，单条 2-${maxSec}s、总时长≤${totalSec}s；参考音频 mp3/wav，单条 ${minAudioSec}-${maxAudioSec}s、总时长≤${audioTotalSec}s`;
  if (isGrokImagineModel(modelKey)) {
    return `${base}（Grok Imagine 参考图最多 1 张）；${mediaRules}`;
  }
  return `${base}；${mediaRules}`;
}

export function referenceVideoLimitHintForModel(modelKey) {
  const lim = refLimitsForModel(modelKey);
  const maxSec = lim.maxVideoDurationMs / 1000;
  const totalSec = lim.maxVideoTotalDurationMs / 1000;
  return `参数限制：mp4/mov；单条 2-${maxSec}s，最多 ${lim.maxVideos} 条且总时长 ≤ ${totalSec}s`;
}

export function durationOptionsForModel(modelKey) {
  if (isGrokImagineModel(modelKey)) return GROK_DURATION_OPTIONS;
  if (isSeedance15ProModel(modelKey)) return SEEDANCE_15_DURATION_OPTIONS;
  // 2.5 超分打包与官方 2.5 同时长 4～30
  if (isSeedance25Model(modelKey) || normKey(modelKey) === SEEDANCE_25_UPSCALE_MODEL_KEY) {
    return SEEDANCE_25_DURATION_OPTIONS;
  }
  return DEFAULT_DURATION_OPTIONS;
}

export function normalizeDurationForModel(modelKey, seconds) {
  const opts = durationOptionsForModel(modelKey);
  const n = Number(seconds);
  if (opts.includes(n)) return n;
  const positive = opts.filter((d) => d > 0).slice().sort((a, b) => a - b);
  if (!positive.length) return opts.includes(-1) ? -1 : 11;
  if (!Number.isFinite(n)) return positive.includes(11) ? 11 : positive[0];
  if (n < positive[0]) return positive[0];
  if (n > positive[positive.length - 1]) return positive[positive.length - 1];
  let best = positive[0];
  let bestDist = Math.abs(n - best);
  for (const d of positive) {
    const dist = Math.abs(n - d);
    if (dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}

export function ratioOptionsForModel(modelKey) {
  return isGrokImagineModel(modelKey) ? GROK_RATIO_OPTIONS : DEFAULT_RATIO_OPTIONS;
}

export function resolutionOptionsForModel(modelKey, model, supplier) {
  let out;
  if (isGrokImagineModel(modelKey)) {
    out = GROK_RESOLUTION_OPTIONS;
  } else if (isSeedanceUpscaleBundleModel(modelKey)) {
    const ziyong = isSeedance20ZiyongUpscaleModel(modelKey);
    const allow4k = isSeedance20StandardUpscaleModel(modelKey);
    const defaults = ziyong
      ? [...SEEDANCE_20_ZIYONG_UPSCALE_RESOLUTION_OPTIONS]
      : allow4k
        ? [...SEEDANCE_20_STANDARD_UPSCALE_RESOLUTION_OPTIONS]
        : [...SEEDANCE_20_UPSCALE_RESOLUTION_OPTIONS];
    const raw = model?.supportedResolutions;
    let list = Array.isArray(raw) ? raw.map((t) => String(t).trim()).filter(Boolean) : [];
    list = list
      .map((r) => canonicalResolution(r) || r)
      .filter((r) => r === "720p" || r === "1080p" || (r === "480p" && ziyong) || (r === "4K" && allow4k));
    out = list.length ? [...new Set(list)] : defaults;
  } else {
    const raw = model?.supportedResolutions;
    let list = Array.isArray(raw) ? raw.map((t) => String(t).trim()).filter(Boolean) : [];
    if (!list.length) {
      list = isSeedance25Model(modelKey) ? [...SEEDANCE_25_RESOLUTION_OPTIONS] : [...DEFAULT_RESOLUTION_OPTIONS];
    }
    // 与后台校验对齐：2.0 lite 仅 480/720；2.5 允许 480/720/1080
    if (isSeedance20LiteModel(modelKey)) {
      list = list.filter((r) => {
        const c = canonicalResolution(r) || r;
        return c === "480p" || c === "720p";
      });
      if (!list.length) {
        list = [...SEEDANCE_20_LITE_RESOLUTION_OPTIONS];
      }
    } else if (isSeedance25Model(modelKey) && !isSeedanceUpscaleBundleModel(modelKey)) {
      list = list.filter((r) => {
        const c = canonicalResolution(r) || r;
        return c === "480p" || c === "720p" || c === "1080p";
      });
      if (!list.length) {
        list = [...SEEDANCE_25_RESOLUTION_OPTIONS];
      }
    }
    out = list;
  }
  return filterResolutionsForSupplier(modelKey, out, supplier ?? model);
}

export function supportsGenerateAudioForModel(modelKey) {
  if (isGrokImagineModel(modelKey)) return false;
  // 2.0 / 2.5 上游强制有声，开关无意义
  if (isSeedanceForcedAudioModel(modelKey)) return false;
  return true;
}

/** 实际发给上游的有声开关（与后台 upstreamGenerateAudioForVideoRequest 对齐） */
export function resolveGenerateAudioForModel(modelKey, configured) {
  if (isGrokImagineModel(modelKey)) return false;
  if (isSeedanceForcedAudioModel(modelKey)) return true;
  return String(configured || "true") !== "false";
}

export function normalizeResolutionForModel(modelKey, resolution, model, supplier) {
  const opts = resolutionOptionsForModel(modelKey, model, supplier);
  const canon = canonicalResolution(resolution);
  if (opts.includes(canon)) return canon;
  if (opts.includes(resolution)) return resolution;
  if (isGrokImagineModel(modelKey) && (canon === "1080p" || canon === "4K")) return "720p";
  if (opts.includes("720p")) return "720p";
  return opts[0] || "720p";
}

/** 视频 seed 下限（各模型一致）；-1 表示由上游随机 */
export const VIDEO_SEED_MIN = -1;
/** Seedance 2.0 等 uint32 上限 */
export const VIDEO_SEED_MAX_DEFAULT = 4294967295;
/** Seedance 2.5 官方 int32 上限 */
export const VIDEO_SEED_MAX_SEEDANCE_25 = 2147483647;

export function maxSeedForModel(modelKey) {
  return isSeedance25Model(modelKey) ? VIDEO_SEED_MAX_SEEDANCE_25 : VIDEO_SEED_MAX_DEFAULT;
}

export function randomVideoSeedForModel(modelKey) {
  const minB = BigInt(VIDEO_SEED_MIN);
  const maxB = BigInt(maxSeedForModel(modelKey));
  const span = maxB - minB + 1n;
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  let x = 0n;
  for (let i = 0; i < buf.length; i++) {
    x = (x << 8n) | BigInt(buf[i]);
  }
  return Number((x % span) + minB);
}

/** @returns {number | null} null 表示不传种子 */
export function normalizeSeedForModel(seed, modelKey) {
  if (seed === null || seed === undefined || seed === "") return null;
  const n = Number(seed);
  if (!Number.isInteger(n) || n < VIDEO_SEED_MIN) return n;
  const max = maxSeedForModel(modelKey);
  if (n <= max) return n;
  return n % (max + 1);
}

/** @returns {string} 留空则返回 "" */
export function normalizeVideoSeedForModel(modelKey, videoSeed) {
  const raw = String(videoSeed ?? "").trim();
  if (!raw) return "";
  const normalized = normalizeSeedForModel(Math.trunc(Number(raw)), modelKey);
  if (normalized === null || normalized === undefined) return "";
  return String(normalized);
}

/** @returns {number | undefined} */
export function resolveVideoSeedForRequest(videoSeed, modelKey) {
  const raw = String(videoSeed ?? "").trim();
  if (!raw) return undefined;
  const normalized = normalizeSeedForModel(Math.trunc(Number(raw)), modelKey);
  if (normalized === null || normalized === undefined) return undefined;
  return normalized;
}

export function canonicalResolution(v) {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  if (s === "P480" || s === "480p") return "480p";
  if (s === "P720" || s === "720p") return "720p";
  if (s === "P1080" || s === "1080p") return "1080p";
  if (s === "P2K" || s === "2k" || s === "2K" || s === "1440p") return "2k";
  if (s === "4K" || s === "4k") return "4K";
  const low = s.toLowerCase();
  if (low === "2k" || low.includes("1440")) return "2k";
  if (low.includes("1080")) return "1080p";
  if (low.includes("480")) return "480p";
  if (low.includes("720")) return "720p";
  if (low === "720") return "720p";
  return s;
}
