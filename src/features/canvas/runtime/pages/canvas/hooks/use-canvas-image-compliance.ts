import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";

import { fetchCanvasImageComplianceByTask } from "@canvas/services/api/backend-client";
import {
    complianceMetaFromDto,
    hasMatchingArkCompliance,
    isImportCompliancePending,
    isRemoteHttpUrl,
    pickComplianceForVideoRoute,
    pollImportImageCompliance,
    submitImportImageComplianceSafe,
} from "@canvas/lib/canvas/canvas-import-compliance";
import { currentVideoRouteSupportsArkAssetUri, getPlatformVideoSupplierId } from "@canvas/services/api/platform-models";
import type { CanvasNodeData } from "@canvas/types/canvas";
import { CanvasNodeType } from "@canvas/types/canvas";

const POLL_MS = 4000;
/** 一直查不到登记资产 / 一直 PROCESSING：停止空转 */
const GIVE_UP_MS = 3 * 60 * 1000;
const TERMINAL = new Set(["ACTIVE", "FAILED"]);

function needsGenerationCompliancePoll(node: CanvasNodeData) {
    if (node.type !== CanvasNodeType.Image) return false;
    if (!node.metadata?.content) return false;
    if (node.metadata.complianceSource === "import") return false;
    if (node.metadata.platformTaskKind !== "image") return false;
    if (!node.metadata.platformTaskId) return false;
    if (node.metadata.status === "loading" || node.metadata.status === "error") return false;
    const status = node.metadata.complianceStatus;
    if (!status || !TERMINAL.has(status)) return true;
    // 已终态但当前视频线路不匹配 / 缺 ark id：需要按当前线路补合规
    if (currentVideoRouteSupportsArkAssetUri() && !hasMatchingArkCompliance(node.metadata)) return true;
    return status === "ACTIVE" && !node.metadata.arkAssetId;
}

function needsImportCompliancePoll(node: CanvasNodeData) {
    if (node.type !== CanvasNodeType.Image) return false;
    if (!node.metadata?.content) return false;
    if (node.metadata.status === "loading" || node.metadata.status === "error") return false;
    return isImportCompliancePending(node.metadata);
}

function needsCompliancePoll(node: CanvasNodeData) {
    return needsGenerationCompliancePoll(node) || needsImportCompliancePoll(node) || needsBadgeSyncForVideoRoute(node);
}

/** 多线路快照已有当前线路结果，但顶层角标字段尚未切过去 */
function needsBadgeSyncForVideoRoute(node: CanvasNodeData) {
    if (node.type !== CanvasNodeType.Image) return false;
    if (!node.metadata?.complianceLines?.length) return false;
    const picked = pickComplianceForVideoRoute(node.metadata);
    if (!picked.complianceStatus) return false;
    return (
        picked.complianceStatus !== node.metadata.complianceStatus ||
        (picked.arkAssetId || undefined) !== (node.metadata.arkAssetId || undefined) ||
        (picked.complianceSupplierId != null ? Number(picked.complianceSupplierId) : null) !==
            (node.metadata.complianceSupplierId != null ? Number(node.metadata.complianceSupplierId) : null)
    );
}

/** 方舟/BYTEPLUS：已有合规但线路不一致（或 ACTIVE 无 ark id）时需按当前视频线路重提 */
function needsComplianceResubmitForVideoRoute(node: CanvasNodeData) {
    if (!currentVideoRouteSupportsArkAssetUri()) return false;
    if (!isRemoteHttpUrl(node.metadata?.content)) return false;
    if (hasMatchingArkCompliance(node.metadata)) return false;
    const videoSid = getPlatformVideoSupplierId();
    const status = String(node.metadata?.complianceStatus || "").toUpperCase();
    // 当前线路已在检测中：只轮询，不重复提交
    if (
        status === "PROCESSING" &&
        videoSid != null &&
        node.metadata?.complianceSupplierId != null &&
        Number(node.metadata.complianceSupplierId) === Number(videoSid)
    ) {
        return false;
    }
    return true;
}

function pendingComplianceKey(nodes: CanvasNodeData[]) {
    const videoSid = getPlatformVideoSupplierId() ?? "";
    return nodes
        .filter(needsCompliancePoll)
        .map((n) =>
            n.metadata?.complianceSource === "import"
                ? `${n.id}:import:${n.metadata?.complianceAssetId}:${videoSid}`
                : `${n.id}:gen:${n.metadata?.platformTaskId}:${videoSid}`,
        )
        .sort()
        .join("|");
}

function pickStatus(rows: Awaited<ReturnType<typeof fetchCanvasImageComplianceByTask>>) {
    if (!rows.length) return null;
    const videoSid = getPlatformVideoSupplierId();
    if (videoSid != null) {
        const matched = rows.find((r) => r.complianceSupplierId != null && Number(r.complianceSupplierId) === Number(videoSid));
        if (matched) return complianceMetaFromDto(matched);
    }
    return complianceMetaFromDto(rows[0]);
}

function markFailed(message: string) {
    return {
        complianceStatus: "FAILED" as const,
        complianceError: message,
        arkAssetId: undefined,
    };
}

/**
 * 对已完成的画布生图 / 导入图片节点轮询合规结果；无结果或长期 PROCESSING 会停止，避免空转请求。
 * 上传时国内+海外并行合规；切线路优先从 complianceLines 同步角标，缺线路时再补提。
 */
export function useCanvasImageCompliance(nodes: CanvasNodeData[], setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>) {
    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;
    const inflightRef = useRef(new Set<string>());
    const startedAtRef = useRef(new Map<string, number>());
    const resubmittedRef = useRef(new Set<string>());
    const pendingKey = pendingComplianceKey(nodes);

    useEffect(() => {
        if (!pendingKey) return;

        let cancelled = false;
        let timer: number | undefined;

        const scheduleNext = () => {
            if (cancelled) return;
            const hasTargets = nodesRef.current.some(needsCompliancePoll);
            if (!hasTargets) {
                timer = undefined;
                return;
            }
            timer = window.setTimeout(() => void tick(), POLL_MS);
        };

        const tick = async () => {
            const targets = nodesRef.current.filter(needsCompliancePoll);
            if (!targets.length) {
                timer = undefined;
                return;
            }

            const videoSid = getPlatformVideoSupplierId();

            for (const node of targets) {
                if (inflightRef.current.has(node.id)) continue;
                inflightRef.current.add(node.id);
                const started = startedAtRef.current.get(node.id) ?? Date.now();
                startedAtRef.current.set(node.id, started);
                const timedOut = Date.now() - started >= GIVE_UP_MS;

                try {
                    if (timedOut) {
                        setNodes((prev) =>
                            prev.map((item) =>
                                item.id === node.id && needsCompliancePoll(item)
                                    ? {
                                          ...item,
                                          metadata: {
                                              ...item.metadata,
                                              ...markFailed(
                                                  "合规检测超时已停止轮询（历史任务可能未登记，或上游未返回终态）。新导入/生成的图片会自动检测。",
                                              ),
                                          },
                                      }
                                    : item,
                            ),
                        );
                        startedAtRef.current.delete(node.id);
                        continue;
                    }

                    // 切线路后：若已有多线路快照则只同步角标；没有当前线路记录才重提
                    const resubmitKey = `${node.id}:${videoSid ?? ""}`;
                    const hasCurrentLine =
                        videoSid != null &&
                        (node.metadata?.complianceLines || []).some((l) => Number(l.supplierId) === Number(videoSid));

                    if (needsBadgeSyncForVideoRoute(node)) {
                        const picked = pickComplianceForVideoRoute(node.metadata);
                        if (picked.complianceStatus) {
                            setNodes((prev) => {
                                let changed = false;
                                const next = prev.map((item) => {
                                    if (item.id !== node.id) return item;
                                    const m = item.metadata;
                                    if (
                                        m?.complianceStatus === picked.complianceStatus &&
                                        (m?.arkAssetId || undefined) === (picked.arkAssetId || undefined) &&
                                        (m?.complianceSupplierId != null ? Number(m.complianceSupplierId) : null) ===
                                            (picked.complianceSupplierId != null ? Number(picked.complianceSupplierId) : null) &&
                                        (m?.complianceError || undefined) === (picked.complianceError || undefined)
                                    ) {
                                        return item;
                                    }
                                    changed = true;
                                    return {
                                        ...item,
                                        metadata: {
                                            ...m,
                                            complianceStatus: picked.complianceStatus,
                                            arkAssetId: picked.arkAssetId,
                                            complianceSupplierId: picked.complianceSupplierId,
                                            complianceError: picked.complianceError,
                                        },
                                    };
                                });
                                return changed ? next : prev;
                            });
                        }
                        // 仅角标同步、当前线路已终态：不必继续轮询
                        if (
                            !needsImportCompliancePoll(node) &&
                            !needsGenerationCompliancePoll(node) &&
                            picked.complianceStatus &&
                            TERMINAL.has(picked.complianceStatus)
                        ) {
                            continue;
                        }
                    }

                    if (
                        needsComplianceResubmitForVideoRoute(node) &&
                        !hasCurrentLine &&
                        !resubmittedRef.current.has(resubmitKey)
                    ) {
                        resubmittedRef.current.add(resubmitKey);
                        const content = String(node.metadata?.content || "");
                        const refreshed = await submitImportImageComplianceSafe(content, node.title);
                        if (cancelled) return;
                        if (refreshed) {
                            const picked = pickComplianceForVideoRoute(refreshed);
                            setNodes((prev) =>
                                prev.map((item) =>
                                    item.id === node.id
                                        ? {
                                              ...item,
                                              metadata: {
                                                  ...item.metadata,
                                                  ...refreshed,
                                                  ...picked,
                                                  complianceSource: "import",
                                                  platformTaskId: undefined,
                                                  platformTaskKind: undefined,
                                              },
                                          }
                                        : item,
                                ),
                            );
                            startedAtRef.current.set(node.id, Date.now());
                        }
                        continue;
                    }

                    // 已有当前线路快照但角标字段未同步（例如刚切换线路）
                    if (hasCurrentLine && !hasMatchingArkCompliance(node.metadata) && !needsBadgeSyncForVideoRoute(node)) {
                        const picked = pickComplianceForVideoRoute(node.metadata);
                        if (picked.complianceStatus) {
                            setNodes((prev) =>
                                prev.map((item) => {
                                    if (item.id !== node.id) return item;
                                    const m = item.metadata;
                                    if (
                                        m?.complianceStatus === picked.complianceStatus &&
                                        (m?.arkAssetId || undefined) === (picked.arkAssetId || undefined) &&
                                        (m?.complianceSupplierId != null ? Number(m.complianceSupplierId) : null) ===
                                            (picked.complianceSupplierId != null ? Number(picked.complianceSupplierId) : null)
                                    ) {
                                        return item;
                                    }
                                    return {
                                        ...item,
                                        metadata: {
                                            ...m,
                                            complianceStatus: picked.complianceStatus,
                                            arkAssetId: picked.arkAssetId,
                                            complianceSupplierId: picked.complianceSupplierId,
                                            complianceError: picked.complianceError,
                                        },
                                    };
                                }),
                            );
                            if (picked.complianceStatus === "ACTIVE" || picked.complianceStatus === "FAILED") {
                                if (picked.complianceStatus === "ACTIVE" && picked.arkAssetId) {
                                    startedAtRef.current.delete(node.id);
                                }
                            }
                        }
                    }

                    const next =
                        (node.metadata?.complianceSource === "import" || needsComplianceResubmitForVideoRoute(node)) &&
                        node.metadata?.complianceAssetId
                            ? await pollImportImageCompliance(node.metadata.complianceAssetId)
                            : node.metadata?.platformTaskId
                              ? pickStatus(await fetchCanvasImageComplianceByTask(node.metadata.platformTaskId))
                              : node.metadata?.complianceAssetId
                                ? await pollImportImageCompliance(node.metadata.complianceAssetId)
                                : null;

                    if (cancelled) return;
                    if (!next) {
                        setNodes((prev) =>
                            prev.map((item) => {
                                if (item.id !== node.id) return item;
                                if (item.metadata?.complianceStatus === "PROCESSING") return item;
                                return {
                                    ...item,
                                    metadata: {
                                        ...item.metadata,
                                        complianceStatus: "PROCESSING",
                                        complianceError: undefined,
                                        arkAssetId: undefined,
                                    },
                                };
                            }),
                        );
                        continue;
                    }

                    // 轮询到了其它线路的 ACTIVE：不算当前线路完成，继续等
                    if (
                        currentVideoRouteSupportsArkAssetUri() &&
                        next.complianceStatus === "ACTIVE" &&
                        !hasMatchingArkCompliance({ ...next, complianceLines: next.complianceLines || node.metadata?.complianceLines })
                    ) {
                        // 仍写入 complianceLines，便于切线路后直接用
                        setNodes((prev) =>
                            prev.map((item) => {
                                if (item.id !== node.id) return item;
                                const mergedLines = next.complianceLines?.length
                                    ? next.complianceLines
                                    : item.metadata?.complianceLines;
                                const picked = pickComplianceForVideoRoute({
                                    ...item.metadata,
                                    ...next,
                                    complianceLines: mergedLines,
                                });
                                return {
                                    ...item,
                                    metadata: {
                                        ...item.metadata,
                                        ...next,
                                        ...picked,
                                        complianceLines: mergedLines,
                                        complianceSource:
                                            item.metadata?.complianceSource === "import" || !item.metadata?.platformTaskId
                                                ? "import"
                                                : item.metadata?.complianceSource,
                                    },
                                };
                            }),
                        );
                        if (!hasCurrentLine) resubmittedRef.current.delete(resubmitKey);
                        continue;
                    }

                    if (next.complianceStatus === "ACTIVE" || next.complianceStatus === "FAILED") {
                        startedAtRef.current.delete(node.id);
                    }

                    setNodes((prev) =>
                        prev.map((item) => {
                            if (item.id !== node.id) return item;
                            const m = item.metadata;
                            const mergedLines = next.complianceLines?.length ? next.complianceLines : m?.complianceLines;
                            const picked = pickComplianceForVideoRoute({ ...m, ...next, complianceLines: mergedLines });
                            if (
                                m?.complianceStatus === picked.complianceStatus &&
                                m?.complianceError === picked.complianceError &&
                                m?.complianceAssetId === next.complianceAssetId &&
                                m?.arkAssetId === picked.arkAssetId &&
                                m?.complianceSupplierId === picked.complianceSupplierId &&
                                JSON.stringify(m?.complianceLines || []) === JSON.stringify(mergedLines || [])
                            ) {
                                return item;
                            }
                            return {
                                ...item,
                                metadata: {
                                    ...m,
                                    ...next,
                                    ...picked,
                                    complianceLines: mergedLines,
                                    complianceSource:
                                        m?.complianceSource === "import" || !m?.platformTaskId ? "import" : m?.complianceSource,
                                    arkAssetId: picked.complianceStatus === "ACTIVE" ? picked.arkAssetId : undefined,
                                },
                            };
                        }),
                    );
                } catch {
                    // 单次失败下一轮再试；总时长仍受 GIVE_UP_MS 限制
                } finally {
                    inflightRef.current.delete(node.id);
                }
            }

            scheduleNext();
        };

        void tick();
        return () => {
            cancelled = true;
            if (timer !== undefined) window.clearTimeout(timer);
        };
    }, [pendingKey, setNodes]);
}
