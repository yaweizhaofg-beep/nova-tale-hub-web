import { CANVAS_SESSION_EXPIRED } from '@/features/canvas/frame-bridge';
import axios, { type AxiosInstance } from "axios";

import { API_BASE_URL } from "@canvas/constant/env";
import { clearAuthSession, getToken } from "@canvas/lib/auth-token";

export type ProfilePointsSummary = {
  pointsBalance?: number | string | null;
  subjectType?: "TALENT" | "STAFF" | "NONE" | string;
  subjectId?: number | null;
};

export async function fetchProfilePoints() {
  const { data } = await client.get<ProfilePointsSummary>("/admin/profile/points");
  return data;
}

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) delete config.headers["Content-Type"];
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const token = getToken();
    if (err.response?.status === 401 && token && err.config?.headers?.Authorization === "Bearer " + token) {
      clearAuthSession();
      window.dispatchEvent(new Event(CANVAS_SESSION_EXPIRED));
    }
    return Promise.reject(err);
  },
);

export const platformClient = client;

export type PlatformAiModel = {
  id: number;
  name: string;
  modelKey: string;
  category?: string;
  type?: string;
  supportedResolutions?: string[];
  requiresStaffQuota?: boolean;
  complianceSupplierId?: number;
};

export type ModelSupplierRoute = {
  id: number;
  supplierCode?: string;
  lineAlias?: string;
  userRemark?: string;
  defaultRoute?: boolean;
  selected?: boolean;
  hasCompanyApiKey?: boolean;
};

export type ImageTaskOptions = {
  defaultSupplierId?: number;
  defaultModelId?: number;
  models?: PlatformAiModel[];
  allImageModels?: PlatformAiModel[];
  routes?: ModelSupplierRoute[];
};

export type ImageTaskDto = {
  id: number;
  taskStatus?: string;
  resultImageUrls?: string[];
  errorMessage?: string;
};

export async function loginWithPassword(body: {
  username: string;
  password: string;
  captchaId: string;
  captchaCode: string;
  agreedToTerms?: boolean;
  rememberMe?: boolean;
}) {
  const { data } = await client.post<{
    token: string;
    username: string;
    staffId?: number | null;
    talentId?: number | null;
    menus?: string;
  }>("/login", body);
  return data;
}

export async function fetchPublicCaptcha() {
  const { data } = await client.get<{ captchaId: string; imageBase64: string }>("/public/captcha");
  return data;
}

export async function fetchImageTaskOptions(params?: { supplierId?: number }) {
  const { data } = await client.get<ImageTaskOptions>("/admin/image-tasks/options", { params });
  return data;
}

export async function fetchModelSupplierRoutes(line: "IMAGE" | "PREMIUM_COMIC" | "COMMENTARY", staffId?: number, talentId?: number) {
  const params: Record<string, string | number> = { line };
  if (staffId != null) params.staffId = staffId;
  if (talentId != null) params.talentId = talentId;
  const { data } = await client.get<ModelSupplierRoute[]>("/admin/model-supplier-routes", { params });
  const rows = Array.isArray(data) ? data : [];
  // 专属测试仅供 OpenAPI；画布不展示
  return rows.filter((r) => String(r?.supplierCode || "").toUpperCase() !== "ZHUANSHU_TEST");
}

/** 精品漫分镜视频模型：后端按线路 + 计价 + staff/talent 配额授权过滤 */
export async function fetchPremiumVideoModels(supplierId?: number, staffId?: number, talentId?: number) {
  const params: Record<string, number> = {};
  if (supplierId != null) params.supplierId = supplierId;
  if (staffId != null) params.staffId = staffId;
  if (talentId != null) params.talentId = talentId;
  const { data } = await client.get<PlatformAiModel[]>("/admin/storyboard-shots/video-models", { params });
  return Array.isArray(data) ? data : [];
}

/** 保存精品漫/解说漫线路偏好（与 admin-ui 分镜页一致） */
export async function saveModelSupplierPreferences(body: {
  premiumComicSupplierId?: number | null;
  commentarySupplierId?: number | null;
}) {
  const { data } = await client.put<{
    premiumComicSupplierId?: number | null;
    commentarySupplierId?: number | null;
  }>("/admin/model-supplier-routes/preferences", body);
  return data;
}

export async function fetchAdminModels(params?: Record<string, unknown>) {
  const { data } = await client.get<{ content?: PlatformAiModel[] } | PlatformAiModel[]>("/admin/models", { params });
  if (Array.isArray(data)) return data;
  return data?.content || [];
}

export async function registerImageRef(body: {
  ossObjectKey: string;
  publicUrl: string;
  originalFilename?: string;
}) {
  const { data } = await client.post<{ id: number }>("/admin/image-tasks/ref-images", body);
  return data;
}

export async function submitImageTask(body: {
  aiModelId: number;
  modelSupplierId?: number;
  prompt: string;
  size?: string;
  aspectRatio?: string;
  refImageIds?: number[];
  refUrls?: string[];
  clientSource?: "XINGHE" | "CANVAS" | string;
}) {
  const { data } = await client.post<ImageTaskDto>("/admin/image-tasks", body, { timeout: 120000 });
  return data;
}

export async function getImageTask(id: number) {
  const { data } = await client.get<ImageTaskDto>(`/admin/image-tasks/${id}`);
  return data;
}

export async function createAiVideoGeneration(body: Record<string, unknown>) {
  const { data } = await client.post<Record<string, unknown>>("/admin/ai-video/generations", body, { timeout: 600000 });
  return data;
}

export async function getAiVideoTask(taskId: string, computerSn: string, modelKey: string) {
  const { data } = await client.get<Record<string, unknown>>(`/admin/ai-video/tasks/${encodeURIComponent(taskId)}`, {
    params: { computer_sn: computerSn, model_key: modelKey },
    timeout: 600000,
  });
  return data;
}

/** 从错误文案提取火山 Request id（与后台正则一致） */
export function extractVolcanoRequestId(text?: string | null) {
  const m = String(text || "").match(/\brequest\s*id\s*[:：]\s*([A-Za-z0-9_-]+)/i);
  return m?.[1]?.trim() || "";
}

export type VolcanoModerationResult = {
  requestId?: string;
  type?: string;
  summary?: string;
  blockReasons?: Array<{
    label?: string;
    subLabel?: string;
    detail?: string;
    labelText?: string;
    subLabelText?: string;
  }>;
};

/** 火山官方线：按 request_id 查询审核拦截具体原因 */
export async function queryVolcanoModerationResult(payload: {
  requestId?: string;
  taskDbId?: number;
  storyboardShotId?: number;
  type?: string;
}) {
  const { data } = await client.post<VolcanoModerationResult>("/admin/ai-video-tasks/moderation-result", {
    type: "request_id",
    ...payload,
  });
  return data;
}

export async function getOssAssetUploadSts() {
  const { data } = await client.get<{
    accessKeyId: string;
    accessKeySecret: string;
    securityToken: string;
    bucket: string;
    region: string;
    endpoint?: string;
    publicUrlBase?: string;
  }>("/admin/oss/upload-asset-sts");
  return data;
}

export const CANVAS_COMPUTER_SN = "infinite-canvas";
export const CANVAS_CLIENT_SOURCE = "CANVAS";

export type ProfilePointsLedgerRow = {
  changeType?: string;
  direction?: number;
  amountPoints?: number | string | null;
  modelKey?: string;
  modelName?: string;
  resolution?: string;
  clientSource?: string;
  createdAt?: string;
};

export type PageResult<T> = {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
};

export async function fetchProfilePointsLedger(params?: {
  page?: number;
  size?: number;
  changeType?: string;
  clientSource?: string;
  createdAtStart?: string;
  createdAtEnd?: string;
}) {
  const { data } = await client.get<PageResult<ProfilePointsLedgerRow>>("/admin/profile/points-ledger", { params });
  return data;
}

export type DramaAssetDto = {
  id: number;
  name?: string;
  alias?: string;
  ossUrl?: string;
  assetType?: string;
  category?: string;
  status?: string;
  dramaId?: number;
  dramaName?: string;
  staffId?: number;
  staffName?: string;
  remark?: string;
};

/** @deprecated 管理端原接口；画布请用 fetchInfiniteCanvasAssets */
export async function fetchDramaAssets(params?: {
  page?: number;
  size?: number;
  name?: string;
  assetType?: string;
  status?: string;
  staffId?: number | string;
  dramaId?: number | string;
  category?: string;
}) {
  const { data } = await client.get<PageResult<DramaAssetDto>>("/admin/drama-assets", { params });
  return data;
}

/** 星核无限画布专用资产分页（服务端过滤 IMAGE/VIDEO/AUDIO，分页与总数对齐；须传角色标识） */
export async function fetchInfiniteCanvasAssets(params?: {
  page?: number;
  size?: number;
  name?: string;
  /** IMAGE | VIDEO | AUDIO | ALL */
  assetType?: string;
  dramaId?: number | string;
  staffId?: number;
  talentId?: number;
}) {
  const { data } = await client.get<PageResult<DramaAssetDto>>("/admin/infinite-canvas/assets", { params });
  return data;
}

export type InfiniteCanvasProjectDto = {
  id: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  payload?: Record<string, unknown>;
};

export async function fetchInfiniteCanvasProjects(signal?: AbortSignal) {
  const { data } = await client.get<InfiniteCanvasProjectDto[]>("/admin/infinite-canvas/projects", { signal });
  if (!Array.isArray(data)) throw new Error("云端画布列表响应格式异常");
  return data;
}

export async function fetchInfiniteCanvasProject(id: string) {
  const { data } = await client.get<InfiniteCanvasProjectDto>(`/admin/infinite-canvas/projects/${encodeURIComponent(id)}`);
  return data;
}

export async function saveInfiniteCanvasProject(id: string, body: { title: string; payload: Record<string, unknown> }) {
  const { data } = await client.put<InfiniteCanvasProjectDto>(`/admin/infinite-canvas/projects/${encodeURIComponent(id)}`, body, {
    timeout: 180000,
  });
  return data;
}

export async function deleteInfiniteCanvasProject(id: string) {
  await client.delete(`/admin/infinite-canvas/projects/${encodeURIComponent(id)}`);
}

export type InfiniteCanvasPreferenceDto = {
  id?: number;
  updatedAt?: string;
  payload?: Record<string, unknown>;
};

export async function fetchInfiniteCanvasPreferences() {
  const { data } = await client.get<InfiniteCanvasPreferenceDto>("/admin/infinite-canvas/preferences");
  return data;
}

export async function saveInfiniteCanvasPreferences(payload: Record<string, unknown>) {
  const { data } = await client.put<InfiniteCanvasPreferenceDto>("/admin/infinite-canvas/preferences", { payload });
  return data;
}

export type CanvasTextModelDto = {
  id: number;
  name?: string;
  modelKey?: string;
  supplierId?: number;
  supplierName?: string;
  supplierCode?: string;
};

export type CanvasTextGenerationDto = {
  content?: string;
  promptTokens?: number;
  completionTokens?: number;
  consumedPoints?: number | string;
};

const CANVAS_TEXT_HTTP_TIMEOUT_MS = 180_000;

export async function fetchCanvasTextModels() {
  const { data } = await client.get<CanvasTextModelDto[]>("/admin/infinite-canvas/text/models");
  return Array.isArray(data) ? data : [];
}

export async function createCanvasTextGeneration(
  payload: { aiModelId: number; prompt: string; systemPrompt?: string; reasoningEffort?: string },
  options?: { signal?: AbortSignal },
) {
  const { data } = await client.post<CanvasTextGenerationDto>("/admin/infinite-canvas/text/generations", payload, {
    timeout: CANVAS_TEXT_HTTP_TIMEOUT_MS,
    signal: options?.signal,
  });
  return data;
}

export type CanvasComplianceLineDto = {
  supplierId?: number;
  supplierCode?: string | null;
  complianceStatus?: string | null;
  complianceAssetId?: string | null;
  complianceError?: string | null;
};

export type CanvasImageComplianceDto = {
  id: number;
  name?: string;
  ossUrl?: string;
  complianceStatus?: string | null;
  complianceError?: string | null;
  /** 方舟侧合规资产 id（用于 asset://）；多线路时以 complianceLines 为准 */
  complianceAssetId?: string | null;
  complianceSupplierId?: number | null;
  complianceAssetUrl?: string | null;
  complianceLines?: CanvasComplianceLineDto[] | null;
};

/** 按平台生图任务 id 查询合规登记资产及状态 */
export async function fetchCanvasImageComplianceByTask(taskId: string | number) {
  const { data } = await client.get<CanvasImageComplianceDto[] | { data?: CanvasImageComplianceDto[] }>(
    `/admin/infinite-canvas/compliance/by-image-task/${encodeURIComponent(String(taskId))}`,
  );
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { data?: CanvasImageComplianceDto[] }).data)) {
    return (data as { data: CanvasImageComplianceDto[] }).data;
  }
  return [];
}

/** 导入图片：登记合规资产并提交检测（可一次提交国内+海外多线路） */
export async function submitCanvasImportImageCompliance(payload: {
  ossUrl: string;
  name?: string;
  modelSupplierId?: number | null;
  modelSupplierIds?: number[];
}) {
  const { data } = await client.post<CanvasImageComplianceDto>("/admin/infinite-canvas/compliance/import", payload);
  return data;
}

/** 按合规登记资产 id 查询导入图合规状态 */
export async function fetchCanvasImportImageCompliance(assetId: string | number) {
  const { data } = await client.get<CanvasImageComplianceDto>(
    `/admin/infinite-canvas/compliance/by-asset/${encodeURIComponent(String(assetId))}`,
  );
  return data;
}

export type VideoUpscaleResolution = "720p" | "1080p" | "2k";

export type CanvasVideoUpscaleParams = {
  resolution: VideoUpscaleResolution;
  /** 目标输出帧率；null/省略 = 跟随原片 */
  targetFps?: number | null;
};

export type CanvasVideoUpscaleSubmitPayload = CanvasVideoUpscaleParams & {
  videoUrl: string;
  durationSeconds?: number;
  sourceFps?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  nodeId?: string;
  title?: string;
};

export type CanvasVideoUpscaleQuoteDto = {
  mode?: string;
  resolution?: string;
  reservedPoints?: number | string;
  durationSeconds?: number | string;
  sourceFps?: number | string;
  targetFps?: number | string | null;
  billingFps?: number | string;
  markup?: number | string;
  officialEnhancePoints?: number | string;
  officialTranscodePoints?: number | string;
  officialTotalPoints?: number | string;
};

export type CanvasVideoUpscaleJobDto = {
  id?: number;
  status?: string;
  mode?: string;
  resolution?: string;
  reservedPoints?: number | string;
  settledPoints?: number | string;
  outputVideoUrl?: string;
  errorMessage?: string;
  enhanceTaskId?: string;
  transcodeTaskId?: string;
  outputDurationSeconds?: number | string;
  outputFps?: number | string;
  outputResolution?: string;
};

/** MediaKit 大模型增强提交/探测可能较慢；单次请求超时 30 分钟 */
const VIDEO_UPSCALE_HTTP_TIMEOUT_MS = 1_800_000;

export async function quoteCanvasVideoUpscale(payload: CanvasVideoUpscaleSubmitPayload) {
  const { data } = await client.post<CanvasVideoUpscaleQuoteDto>("/admin/infinite-canvas/video-upscale/quote", payload, {
    timeout: VIDEO_UPSCALE_HTTP_TIMEOUT_MS,
  });
  return data;
}

export async function createCanvasVideoUpscaleJob(payload: CanvasVideoUpscaleSubmitPayload) {
  const { data } = await client.post<CanvasVideoUpscaleJobDto>("/admin/infinite-canvas/video-upscale/jobs", payload, {
    timeout: VIDEO_UPSCALE_HTTP_TIMEOUT_MS,
  });
  return data;
}

export async function getCanvasVideoUpscaleJob(jobId: number) {
  const { data } = await client.get<CanvasVideoUpscaleJobDto>(`/admin/infinite-canvas/video-upscale/jobs/${jobId}`, {
    timeout: VIDEO_UPSCALE_HTTP_TIMEOUT_MS,
  });
  return data;
}

/** @deprecated 旧 MediaKit 画质增强；画布请用 createCanvasVideoUpscaleJob */
export type VideoEnhanceScene = "common" | "ugc" | "short_series" | "aigc";
export type VideoEnhanceResolution = "240p" | "360p" | "480p" | "540p" | "720p" | "1080p" | "2k" | "4k";

export type VideoEnhanceRegisterPayload = {
  ossObjectKey: string;
  sourceVideoUrl: string;
  durationSeconds: number;
  originalFilename?: string;
  fileSizeBytes?: number;
  scene?: string;
  resolution?: string;
};

export type VideoEnhanceJobDto = {
  id?: number;
  assetId?: number;
  scene?: string;
  resolution?: string;
  status?: string;
  errorMessage?: string;
  outputVideoUrl?: string;
  outputDurationSeconds?: number;
  outputResolution?: string;
};

export type VideoEnhanceAssetRowDto = {
  id: number;
  originalFilename?: string;
  sourceVideoUrl?: string;
  durationSeconds?: number;
  scene?: string;
  resolutionTarget?: string;
  displayStatus?: string;
  lastErrorMessage?: string;
  latestJob?: VideoEnhanceJobDto | null;
  jobs?: VideoEnhanceJobDto[];
};

/** @deprecated */
export async function registerVideoEnhanceAsset(payload: VideoEnhanceRegisterPayload) {
  const { data } = await client.post<VideoEnhanceAssetRowDto>("/admin/video-enhance/assets", payload);
  return data;
}

/** @deprecated */
export async function startVideoEnhance(assetId: number, body?: { scene?: string; resolution?: string }) {
  const { data } = await client.post<VideoEnhanceJobDto>(`/admin/video-enhance/assets/${assetId}/enhance`, body || {});
  return data;
}

/** @deprecated */
export async function getVideoEnhanceAsset(assetId: number) {
  const { data } = await client.get<VideoEnhanceAssetRowDto>(`/admin/video-enhance/assets/${assetId}`);
  return data;
}

/** 站内信列表项（与管理端 /admin/system-notice-inbox 对齐） */
export type SystemNoticeInboxItem = {
  id: number;
  title?: string;
  startAt?: string;
  read?: boolean;
  category?: string;
  categoryDisplay?: string;
};

export type SystemNoticeInboxDetail = {
  id: number;
  name?: string;
  posterUrl?: string;
  contentHtml?: string;
  startAt?: string;
  endAt?: string;
  category?: string;
  categoryDisplay?: string;
  inboxLinkType?: string | null;
  inboxLinkDramaId?: number | null;
  inboxLinkChapterId?: number | null;
  inboxLinkAssetId?: number | null;
  inboxLinkWorkTicketId?: number | null;
};

export async function fetchSystemNoticeInbox(params?: {
  category?: string;
  title?: string;
  readStatus?: "ALL" | "UNREAD" | "READ";
}) {
  const { data } = await client.get<SystemNoticeInboxItem[]>("/admin/system-notice-inbox", { params });
  return Array.isArray(data) ? data : [];
}

export async function fetchSystemNoticeInboxUnreadCount() {
  const { data } = await client.get<{ count?: number }>("/admin/system-notice-inbox/unread-count");
  return Number(data?.count ?? 0);
}

export async function fetchSystemNoticeInboxDetail(id: number) {
  const { data } = await client.get<SystemNoticeInboxDetail>(`/admin/system-notice-inbox/${id}`);
  return data;
}

export async function markSystemNoticeInboxBatchRead(ids: number[]) {
  await client.post("/admin/system-notice-inbox/batch-read", ids);
}

export async function markSystemNoticeInboxReadAll() {
  await client.post("/admin/system-notice-inbox/read-all");
}
