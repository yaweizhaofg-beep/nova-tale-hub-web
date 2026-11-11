import { nanoid } from "nanoid";

import { isPlatformChannel, type AiConfig, type ModelChannel } from "@canvas/stores/use-config-store";
import { dataUrlToFile } from "@canvas/lib/image-utils";
import { originalImageUrl } from "@canvas/lib/platform/oss-image";
import { uploadAssetFileDirectWithKey } from "@canvas/lib/platform/oss-upload";
import { getImageBlob, imageToDataUrl, uploadImage } from "@canvas/services/image-storage";
import type { ReferenceImage } from "@canvas/types/image";
import { createCanvasTextGeneration, getImageTask, registerImageRef, submitImageTask } from "./backend-client";
import { getPlatformImageSupplierId, mapAspectRatio, mapQualityToSize, resolvePlatformModelMeta } from "./platform-models";

export type AiTextMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
};

export type GeneratedImage = { id: string; url: string; dataUrl: string };

type RequestOptions = { signal?: AbortSignal };

function isHttpUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

async function resolveReferenceHttpUrl(image: ReferenceImage): Promise<string | null> {
  if (isHttpUrl(image.url)) return originalImageUrl(image.url);
  if (isHttpUrl(image.dataUrl)) return originalImageUrl(image.dataUrl);
  return null;
}

async function prepareReference(image: ReferenceImage): Promise<{ refImageId?: number; refUrl?: string }> {
  const httpUrl = await resolveReferenceHttpUrl(image);
  if (httpUrl) return { refUrl: httpUrl };

  let file: File | null = null;
  if (image.storageKey) {
    const blob = await getImageBlob(image.storageKey);
    if (blob) file = new File([blob], image.name || "ref.png", { type: blob.type || image.type || "image/png" });
  }
  if (!file) {
    const dataUrl = await imageToDataUrl(image);
    if (!dataUrl) throw new Error("参考图无效");
    if (isHttpUrl(dataUrl)) return { refUrl: originalImageUrl(dataUrl) };
    file = dataUrlToFile({ ...image, dataUrl });
  }

  const uploaded = await uploadAssetFileDirectWithKey(file);
  const registered = await registerImageRef({
    ossObjectKey: uploaded.objectKey,
    publicUrl: uploaded.url,
    originalFilename: file.name,
  });
  if (!registered?.id) throw new Error("参考图登记失败");
  return { refImageId: registered.id };
}

export async function waitForPlatformImageTask(id: number, signal?: AbortSignal): Promise<GeneratedImage[]> {
  while (true) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const task = await getImageTask(id);
    const status = (task.taskStatus || "").toLowerCase();
    if (status === "completed" || status === "success" || status === "succeeded") {
      if (!task.resultImageUrls?.length) throw new Error("生图完成但未返回图片");
      return (task.resultImageUrls || []).map((url) => ({ id: nanoid(), url, dataUrl: url }));
    }
    if (status === "failed" || status === "error" || status === "cancelled") {
      throw new Error(task.errorMessage || "生图失败");
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
}

export async function createPlatformImageTask(
  config: AiConfig,
  prompt: string,
  references: ReferenceImage[] = [],
  options?: RequestOptions,
): Promise<{ id: number }> {
  const meta = resolvePlatformModelMeta(config, config.model || config.imageModel);
  if (!meta?.aiModelId) throw new Error("请先选择平台图片模型（需已登录）");
  if (meta.modelKey === "doubao-seedream-5-0-pro-260628" && references.length > 10) {
    throw new Error("Seedream 5.0 Pro 最多支持 10 张参考图");
  }
  const prepared = await Promise.all(references.map((img) => prepareReference(img)));
  const refImageIds = prepared.map((p) => p.refImageId).filter((id): id is number => typeof id === "number");
  const refUrls = prepared.map((p) => p.refUrl).filter((url): url is string => Boolean(url));
  if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const submitted = await submitImageTask({
    aiModelId: meta.aiModelId,
    modelSupplierId: getPlatformImageSupplierId(),
    prompt,
    size: mapQualityToSize(config.quality, meta.modelKey),
    aspectRatio: mapAspectRatio(config.size, meta.modelKey),
    clientSource: "CANVAS",
    ...(refImageIds.length ? { refImageIds } : {}),
    ...(refUrls.length ? { refUrls } : {}),
  });
  if (!submitted?.id) throw new Error("生图任务创建失败");
  return { id: submitted.id };
}

async function runOneImageTask(config: AiConfig, prompt: string, references: ReferenceImage[], signal?: AbortSignal): Promise<GeneratedImage[]> {
  const created = await createPlatformImageTask(config, prompt, references, { signal });
  return waitForPlatformImageTask(created.id, signal);
}

async function runPlatformImage(config: AiConfig, prompt: string, references: ReferenceImage[], options?: RequestOptions) {
  const n = Math.max(1, Math.min(4, Math.floor(Math.abs(Number(config.count)) || 1)));
  const batches = await Promise.all(Array.from({ length: n }, () => runOneImageTask(config, prompt, references, options?.signal)));
  return batches.flat();
}

export async function requestGeneration(config: AiConfig, prompt: string, options?: RequestOptions) {
  return runPlatformImage(config, prompt, [], options);
}

export async function requestEdit(
  config: AiConfig,
  prompt: string,
  references: ReferenceImage[],
  _mask?: ReferenceImage,
  options?: RequestOptions,
) {
  return runPlatformImage(config, prompt, references, options);
}

function flattenMessageContent(content: AiTextMessage["content"]) {
  if (typeof content === "string") return content;
  return content
    .flatMap((part) => (part.type === "text" && part.text.trim() ? [part.text] : []))
    .join("\n");
}

function flattenTextMessages(messages: AiTextMessage[]) {
  let systemPrompt = "";
  const userParts: string[] = [];
  for (const message of messages) {
    const text = flattenMessageContent(message.content).trim();
    if (!text) continue;
    if (message.role === "system") systemPrompt = systemPrompt ? `${systemPrompt}\n${text}` : text;
    else userParts.push(text);
  }
  return { systemPrompt, prompt: userParts.join("\n\n") };
}

export async function requestImageQuestion(
  config: AiConfig,
  messages: AiTextMessage[],
  onDelta: (text: string) => void,
  options?: RequestOptions,
): Promise<string> {
  const meta = resolvePlatformModelMeta(config, config.model || config.textModel);
  if (!meta?.aiModelId) throw new Error("请先选择平台文本模型（需已登录）");
  const { systemPrompt, prompt } = flattenTextMessages(messages);
  if (!prompt.trim()) throw new Error("请输入要生成的文本内容");
  try {
    const result = await createCanvasTextGeneration(
      {
        aiModelId: meta.aiModelId,
        prompt,
        systemPrompt: systemPrompt || undefined,
        reasoningEffort: config.reasoningEffort,
      },
      { signal: options?.signal },
    );
    const content = (result.content || "").trim();
    if (!content) throw new Error("文本模型未返回内容");
    onDelta(content);
    return content;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    const axiosError = error as { name?: string; code?: string; response?: { data?: { message?: string; msg?: string } } };
    if (axiosError?.name === "CanceledError" || axiosError?.code === "ERR_CANCELED") {
      throw new DOMException("Aborted", "AbortError");
    }
    const data = axiosError?.response?.data;
    throw new Error(data?.message || data?.msg || (error instanceof Error ? error.message : "文本生成失败"));
  }
}

export async function fetchImageModels() {
  return [] as string[];
}

export async function fetchChannelModels(channel: ModelChannel): Promise<string[]> {
  if (!isPlatformChannel(channel)) {
    throw new Error("当前版本使用平台统一模型配置，不支持手动拉取自定义渠道模型");
  }
  return [...new Set(channel.models.map((model) => model.name))];
}

/** 工作台等处若仍按 dataUrl 落库，可先采用远程 URL */
export async function persistGeneratedImageUrl(url: string) {
  return uploadImage(url);
}
