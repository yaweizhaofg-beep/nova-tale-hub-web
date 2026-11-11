/** 正式环境平台后端 API 根路径（不含末尾斜杠） */
export const PLATFORM_API_ORIGIN = "https://ai-tools.xingyao-mcn.cn";
export const PLATFORM_API_BASE = `${PLATFORM_API_ORIGIN}/api`;

/** 媒体中转服务（media-proxy / persist-remote-media） */
export const MEDIA_API_ORIGIN = "https://canvas-media-relay.xingyao-mcn.cn";
export const MEDIA_API_BASE = `${MEDIA_API_ORIGIN}/api`;

/**
 * 前端请求后台的 baseURL。
 * - 开发默认 `/api`（Vite 代理到平台后端，可用 `VITE_API_PROXY_TARGET` 覆盖）
 * - 生产默认正式环境 `https://ai-tools.xingyao-mcn.cn/api`
 * - 可用 `VITE_API_BASE_URL` 覆盖
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? PLATFORM_API_BASE : "/api")
).replace(/\/$/, "");

/**
 * 媒体中转专用 API（media-proxy / persist-remote-media）。
 * - 生产默认 `https://canvas-media-relay.xingyao-mcn.cn/api`（浏览器直连中转机）
 * - 开发默认与 {@link API_BASE_URL} 相同
 * - 可用 `VITE_MEDIA_API_BASE_URL` 覆盖
 */
export const MEDIA_API_BASE_URL = (
  import.meta.env.VITE_MEDIA_API_BASE_URL || (import.meta.env.PROD ? MEDIA_API_BASE : API_BASE_URL)
).replace(/\/$/, "");
