/** 与平台 admin-ui imageModels 对齐的最小子集 */
export const GPT_IMAGE_MODEL_KEY = "image_gpt";
export const GPT_SIZE_PLACEHOLDER = "default";
export const NANO_SIZE_OPTIONS = ["1K", "2K", "4K"];
export const NANO_ASPECT_OPTIONS = ["auto", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "5:4", "4:5", "21:9"];
export const GPT_ASPECT_OPTIONS = [
  "auto", "1:1", "3:2", "2:3", "16:9", "9:16", "4:3", "3:4",
  "21:9", "9:21", "1:3", "3:1", "2:1", "1:2",
];

export function isGptImageModel(modelKey) {
  return modelKey === GPT_IMAGE_MODEL_KEY;
}

export function isSGptImageModel(modelKey) {
  return String(modelKey || "").trim().toLowerCase() === "image_s_gpt";
}

export function isYingheSGpt25(modelKey) {
  const key = String(modelKey || "").trim().toLowerCase();
  return key === "image_s_gpt_2_5_flare" || key === "image_s_gpt_2_5_sunburst"
    || key === "s-gpt-image-2.5-flare" || key === "s-gpt-image-2.5-sunburst";
}

export function isZhangyugeGpt25(modelKey) {
  const key = String(modelKey || "").trim().toLowerCase();
  return key === "image_gpt_2_5" || key === "image_gpt_2_5_flare" || key === "image_gpt_2_5_sunburst"
    || key === "gpt-image-2.5" || key === "gpt-image-2.5-flare" || key === "gpt-image-2.5-sunburst";
}

export function isZhangyugeGpt25Quality(modelKey) {
  const key = String(modelKey || "").trim().toLowerCase();
  return key === "image_gpt_2_5_flare" || key === "image_gpt_2_5_sunburst"
    || key === "gpt-image-2.5-flare" || key === "gpt-image-2.5-sunburst";
}

export function isSvipGptImageModel(modelKey) {
  const key = String(modelKey || "").trim().toLowerCase();
  return key === "image_svip_gpt_2" || key === "svip-gpt-image-2" || key === "image_svip_gpt";
}

export function usesQualityTier(modelKey) {
  return isSvipGptImageModel(modelKey) || isYingheSGpt25(modelKey) || isZhangyugeGpt25Quality(modelKey);
}

export function isGptLikeImage(modelKey) {
  return isGptImageModel(modelKey) || isSGptImageModel(modelKey)
    || isYingheSGpt25(modelKey) || isZhangyugeGpt25(modelKey) || isSvipGptImageModel(modelKey);
}

export function sizeOptionsForModel(modelKey) {
  if (isSeedreamPro(modelKey)) return ["1K", "1.5K", "2K"];
  if (usesQualityTier(modelKey)) return NANO_SIZE_OPTIONS;
  return isGptLikeImage(modelKey) ? [] : NANO_SIZE_OPTIONS;
}

export function aspectOptionsForModel(modelKey) {
  return isGptLikeImage(modelKey) ? GPT_ASPECT_OPTIONS : NANO_ASPECT_OPTIONS;
}

export function normalizeSizeForModel(modelKey, size) {
  if (isSeedreamPro(modelKey)) return ["1K", "1.5K", "2K"].includes(size) ? size : "1K";
  if (usesQualityTier(modelKey)) return NANO_SIZE_OPTIONS.includes(size) ? size : "1K";
  if (isGptLikeImage(modelKey)) return GPT_SIZE_PLACEHOLDER;
  return NANO_SIZE_OPTIONS.includes(size) ? size : "1K";
}

export function normalizeAspectForModel(modelKey, aspect) {
  const opts = aspectOptionsForModel(modelKey);
  const a = aspect || "auto";
  return opts.includes(a) ? a : "auto";
}

export function usesResolutionTier(modelKey) {
  return usesQualityTier(modelKey) || !isGptLikeImage(modelKey);
}

export function isSeedreamPro(modelKey) {
  return String(modelKey || "").trim().toLowerCase() === "doubao-seedream-5-0-pro-260628";
}
