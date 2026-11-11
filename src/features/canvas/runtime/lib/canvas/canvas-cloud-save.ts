import { getImageBlob } from "@canvas/services/image-storage";
import { getMediaBlob } from "@canvas/services/file-storage";
import { rewriteOssPublicUrl, uploadAssetFileDirectWithKey } from "@canvas/lib/platform/oss-upload";
import { isOwnPermanentOssUrl, persistRemoteMediaToOss } from "@canvas/lib/platform/persist-media-to-oss";
import {
  deleteInfiniteCanvasProject,
  fetchInfiniteCanvasProjects,
  saveInfiniteCanvasProject,
  type InfiniteCanvasProjectDto,
} from "@canvas/services/api/backend-client";
import { useCanvasStore, type CanvasProject } from "@canvas/stores/canvas/use-canvas-store";
import { CanvasNodeType, type CanvasAssistantSession, type CanvasNodeData } from "@canvas/types/canvas";

function isHttpUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function isLocalMediaUrl(value?: string) {
  return Boolean(value && (value.startsWith("blob:") || value.startsWith("data:")));
}

/** 云端快照回写：保留本地生成中/已有内容，只吸收远程 https URL */
export function mergeCloudNodes(localNodes: CanvasNodeData[], remoteNodes: CanvasNodeData[], submittedNodes: CanvasNodeData[]): CanvasNodeData[] {
  const remoteById = new Map(remoteNodes.map((node) => [node.id, node]));
  const submittedById = new Map(submittedNodes.map((node) => [node.id, node]));
  return localNodes.map((local) => {
    const remote = remoteById.get(local.id);
    const submitted = submittedById.get(local.id);
    if (!remote || !submitted ||
      submitted.metadata?.content !== local.metadata?.content ||
      submitted.metadata?.storageKey !== local.metadata?.storageKey) return local;

    // 生成中：绝不能被保存快照打回空节点 / idle
    if (local.metadata?.status === "loading") return local;

    const localContent = local.metadata?.content;
    const remoteContent = remote.metadata?.content;

    // 本地已有结果、快照还是空的：保留本地
    if (localContent && !remoteContent) return local;

    // 本地仍是 blob、云端已升成 https：吸收 URL
    if (!isHttpUrl(localContent) && isHttpUrl(remoteContent)) {
      return {
        ...local,
        metadata: {
          ...local.metadata,
          content: remoteContent,
          storageKey: remote.metadata?.storageKey || "",
        },
      };
    }

    // 本地缺合规角标时，吸收快照里已有的
    if (!local.metadata?.complianceStatus && remote.metadata?.complianceStatus) {
      return {
        ...local,
        metadata: {
          ...local.metadata,
          complianceStatus: remote.metadata.complianceStatus,
          complianceError: remote.metadata.complianceError,
          complianceAssetId: remote.metadata.complianceAssetId,
          arkAssetId: remote.metadata.arkAssetId,
          complianceSupplierId: remote.metadata.complianceSupplierId,
          complianceSource: remote.metadata.complianceSource,
        },
      };
    }

    return local;
  });
}

/**
 * 云端保存返回的是发起时的快照。保存期间本地可能已写入生图/生视频等新数据，
 * 回写时必须以「当前本地」为准，仅吸收云端完成的公网 URL 迁移。
 */
export function mergeAfterCloudSave(latest: CanvasProject, saved: CanvasProject, submitted: CanvasProject): CanvasProject {
  const nodes = mergeCloudNodes(latest.nodes, saved.nodes, submitted.nodes);

  const savedSessions = saved.chatSessions || [];
  const latestSessions = latest.chatSessions || [];
  const savedSessionById = new Map(savedSessions.map((s) => [s.id, s]));
  const chatSessions = latestSessions.map((local) => {
    const remote = savedSessionById.get(local.id);
    if (!remote) return local;
    return {
      ...local,
      messages: local.messages.map((msg, index) => {
        const remoteMsg = remote.messages[index];
        if (!remoteMsg?.references?.length || !msg.references?.length) return msg;
        const references = msg.references.map((ref, refIndex) => {
          const remoteRef = remoteMsg.references?.[refIndex];
          if (remoteRef && !isHttpUrl(ref.dataUrl) && isHttpUrl(remoteRef.dataUrl)) {
            return { ...ref, dataUrl: remoteRef.dataUrl, storageKey: undefined };
          }
          return ref;
        });
        return { ...msg, references };
      }),
    };
  });

  return {
    ...latest,
    localOnly: undefined,
    title: latest.title,
    nodes,
    chatSessions,
    updatedAt: saved.updatedAt || latest.updatedAt,
  };
}

function guessExt(blob: Blob, fallbackName: string) {
  if (fallbackName.includes(".")) return "";
  if (blob.type.includes("png")) return ".png";
  if (blob.type.includes("jpeg") || blob.type.includes("jpg")) return ".jpg";
  if (blob.type.includes("webp")) return ".webp";
  if (blob.type.includes("gif")) return ".gif";
  if (blob.type.includes("mp4")) return ".mp4";
  if (blob.type.includes("webm")) return ".webm";
  if (blob.type.includes("audio")) return ".mp3";
  return "";
}

/** 把本地 Blob 直传到 OSS，返回公网 URL */
export async function uploadBlobToOss(blob: Blob, fallbackName: string): Promise<string> {
  const ext = guessExt(blob, fallbackName);
  const file = new File([blob], fallbackName.includes(".") ? fallbackName : `${fallbackName}${ext}`, {
    type: blob.type || "application/octet-stream",
  });
  const uploaded = await uploadAssetFileDirectWithKey(file);
  return uploaded.url;
}

async function resolveLocalBlob(storageKey?: string, content?: string): Promise<Blob | null> {
  if (storageKey?.startsWith("image:")) {
    const image = await getImageBlob(storageKey);
    if (image) return image;
  }
  if (storageKey) {
    const media = await getMediaBlob(storageKey);
    if (media) return media;
  }
  if (content && isLocalMediaUrl(content)) {
    try {
      return await (await fetch(content)).blob();
    } catch {
      return null;
    }
  }
  return null;
}

async function uploadLocalKey(storageKey: string, fallbackName: string, content?: string): Promise<string> {
  const blob = await resolveLocalBlob(storageKey, content);
  if (!blob) throw new Error(`本地媒体丢失，无法上传：${fallbackName}`);
  return uploadBlobToOss(blob, fallbackName);
}

async function needsCloudUpload(node: CanvasNodeData) {
  const content = node.metadata?.content;
  if (!content || typeof content !== "string") return false;
  if (Boolean(node.metadata?.storageKey) || isLocalMediaUrl(content)) return true;
  // 生成视频保留上游临时链，云端快照原样写入，不转存 OSS
  if (node.type === CanvasNodeType.Video && isHttpUrl(content)) return false;
  // 图片/音频等：上游临时 https 保存前转存到自有永久 OSS
  if (isHttpUrl(content)) return !(await isOwnPermanentOssUrl(content));
  return false;
}

async function migrateNodeMedia(nodes: CanvasNodeData[], onProgress?: (done: number, total: number) => void): Promise<CanvasNodeData[]> {
  const targets: CanvasNodeData[] = [];
  for (const node of nodes) {
    if (await needsCloudUpload(node)) targets.push(node);
  }
  let done = 0;
  const total = targets.length;
  const urlByKey = new Map<string, string>();
  const urlByNodeId = new Map<string, string>();

  for (const node of targets) {
    const content = node.metadata?.content;
    const key = node.metadata?.storageKey || "";
    const cacheKey = key || (isHttpUrl(content) ? `http:${content}` : `node:${node.id}`);
    if (!urlByKey.has(cacheKey)) {
      let url: string;
      if (isHttpUrl(content) && !key && !isLocalMediaUrl(content)) {
        url = await persistRemoteMediaToOss(content!, `${node.type || "file"}-${node.id}`);
      } else {
        url = await uploadLocalKey(key || `orphan:${node.id}`, `${node.type || "file"}-${node.id}`, content);
      }
      urlByKey.set(cacheKey, url);
    }
    urlByNodeId.set(node.id, urlByKey.get(cacheKey)!);
    done += 1;
    onProgress?.(done, Math.max(total, 1));
  }

  return nodes.map((node) => {
    const url = urlByNodeId.get(node.id);
    const rawContent = node.metadata?.content;
    const content = rawContent ? rewriteOssPublicUrl(rawContent) : rawContent;
    if (!url) return content !== node.metadata?.content ? { ...node, metadata: { ...node.metadata, content } } : node;
    return {
      ...node,
      metadata: {
        ...node.metadata,
        content: url,
        storageKey: "",
      },
    };
  });
}

async function migrateChatSessions(sessions: CanvasAssistantSession[]): Promise<CanvasAssistantSession[]> {
  const next: CanvasAssistantSession[] = [];
  for (const session of sessions) {
    const messages = [];
    for (const message of session.messages) {
      if (!message.references?.length) {
        messages.push(message);
        continue;
      }
      const references = [];
      for (const ref of message.references) {
        if (typeof ref.dataUrl === "string" && isHttpUrl(ref.dataUrl)) {
          if (await isOwnPermanentOssUrl(ref.dataUrl)) {
            references.push({ ...ref, dataUrl: rewriteOssPublicUrl(ref.dataUrl) });
          } else {
            const url = await persistRemoteMediaToOss(ref.dataUrl, `chat-${ref.id || "ref"}`);
            references.push({ ...ref, dataUrl: url, storageKey: undefined });
          }
          continue;
        }
        if (ref.storageKey || isLocalMediaUrl(ref.dataUrl)) {
          const url = await uploadLocalKey(ref.storageKey || `chat:${ref.id}`, `chat-${ref.id || "ref"}`, ref.dataUrl);
          references.push({ ...ref, dataUrl: url, storageKey: undefined });
        } else {
          references.push(ref);
        }
      }
      messages.push({ ...message, references });
    }
    next.push({ ...session, messages });
  }
  return next;
}

export function projectFromCloudDto(dto: InfiniteCanvasProjectDto): CanvasProject {
  const payload = (dto.payload || {}) as Partial<CanvasProject>;
  const now = new Date().toISOString();
  return {
    id: dto.id,
    title: dto.title || payload.title || "未命名画布",
    createdAt: dto.createdAt || payload.createdAt || now,
    updatedAt: dto.updatedAt || payload.updatedAt || now,
    nodes: Array.isArray(payload.nodes) ? payload.nodes : [],
    connections: Array.isArray(payload.connections) ? payload.connections : [],
    chatSessions: Array.isArray(payload.chatSessions) ? payload.chatSessions : [],
    activeChatId: payload.activeChatId ?? null,
    backgroundMode: payload.backgroundMode || "lines",
    showImageInfo: Boolean(payload.showImageInfo),
    viewport: payload.viewport || { x: 0, y: 0, k: 1 },
  };
}

export async function loadCloudProjectsIntoLocal(signal?: AbortSignal): Promise<CanvasProject[]> {
  const list = await fetchInfiniteCanvasProjects(signal);
  return list.map(projectFromCloudDto);
}

export async function saveProjectToCloud(
  project: CanvasProject,
  onProgress?: (message: string) => void,
): Promise<CanvasProject> {
  onProgress?.("正在上传本地媒体…");
  const nodes = await migrateNodeMedia(project.nodes, (done, total) => {
    onProgress?.(`正在上传本地媒体（${done}/${total}）…`);
  });
  onProgress?.("正在处理会话附件…");
  const chatSessions = await migrateChatSessions(project.chatSessions || []);
  const next: CanvasProject = {
    ...project,
    localOnly: undefined,
    nodes,
    chatSessions,
    updatedAt: new Date().toISOString(),
  };
  onProgress?.("正在保存到云端…");
  const dto = await saveInfiniteCanvasProject(project.id, {
    title: next.title,
    payload: next as unknown as Record<string, unknown>,
  });
  return projectFromCloudDto(dto);
}

/** 仅改标题入库（不重传媒体）；若云端尚无记录则按当前内容 upsert */
export async function renameProjectOnCloud(project: CanvasProject, title: string): Promise<CanvasProject> {
  const nextTitle = title.trim() || "未命名画布";
  const next: CanvasProject = {
    ...project,
    title: nextTitle,
    updatedAt: new Date().toISOString(),
  };
  const dto = await saveInfiniteCanvasProject(project.id, {
    title: nextTitle,
    payload: next as unknown as Record<string, unknown>,
  });
  return projectFromCloudDto(dto);
}

export async function deleteCloudProjects(ids: string[]) {
  const localDraftIds = new Set(useCanvasStore.getState().projects.filter((project) => project.localOnly).map((project) => project.id));
  const results = await Promise.allSettled(ids.map(async (id) => {
    if (!localDraftIds.has(id)) await deleteInfiniteCanvasProject(id);
  }));
  const deleted = ids.filter((_, index) => results[index].status === "fulfilled");
  return { deleted, failed: ids.filter((_, index) => results[index].status === "rejected") };
}
