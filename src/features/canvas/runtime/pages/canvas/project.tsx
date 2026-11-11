import { lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent as ReactChangeEvent, DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { saveAs } from "file-saver";

import { createPlatformImageTask, requestEdit, requestGeneration, requestImageQuestion, waitForPlatformImageTask } from "@canvas/services/api/image";
import { requestAudioGeneration, waitForAudioTask, audioTaskMetadata, RESTORE_AUDIO_EVENT, type AudioTask } from "@canvas/services/api/audio";
import { createVideoGenerationTask, storeGeneratedVideo, waitForVideoGenerationTask, type VideoGenerationTask } from "@canvas/services/api/video";
import { bootstrapPlatformModels } from "@canvas/services/api/platform-models";
import { useConfigStore, useEffectiveConfig } from "@canvas/stores/use-config-store";
import { nanoid } from "nanoid";
import { getDataUrlByteSize, readImageMeta } from "@canvas/lib/image-utils";
import { canvasThemes, type CanvasBackgroundMode } from "@canvas/lib/canvas-theme";
import { useAssetStore } from "@canvas/stores/use-asset-store";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import { cropDataUrl, splitDataUrl, upscaleDataUrl } from "@canvas/lib/canvas/canvas-image-data";
import { captureVideoFrameAt, captureVideoFirstLastFrames, type CapturedVideoFrame } from "@canvas/lib/canvas/canvas-video-frame";
import { readAssetDragData } from "@canvas/lib/canvas/canvas-asset-dnd";
import { uploadBlobToOss } from "@canvas/lib/canvas/canvas-cloud-save";
import { fetchRemoteMediaBlob } from "@canvas/lib/platform/persist-media-to-oss";
import { ensureImportComplianceMeta, isRemoteHttpUrl, pickComplianceBadgeMeta, submitImportImageComplianceSafe, type ImportComplianceMeta } from "@canvas/lib/canvas/canvas-import-compliance";
import { fitNodeSize, nodeSizeFromRatio, VIDEO_NODE_MIN_EDGE } from "@canvas/lib/canvas/canvas-node-size";
import { resolveImageVideoPrompt } from "@canvas/lib/canvas/style-description";
import { getImageBlob, uploadImage } from "@canvas/services/image-storage";
import { getMediaBlob, uploadMediaFile } from "@canvas/services/file-storage";
import { App, Button, Modal } from "antd";
import { NODE_DEFAULT_SIZE, getNodeSpec } from "@canvas/constant/canvas";
import { ActiveConnectionPath, ConnectionPath } from "@canvas/components/canvas/canvas-connections";
import { CanvasConfigComposer } from "@canvas/components/canvas/canvas-config-composer";
import { CanvasConfigNodePanel } from "@canvas/components/canvas/canvas-config-node-panel";
import { CanvasNodeContextMenu } from "@canvas/components/canvas/canvas-context-menu";
import { CanvasLazyDialog } from "@canvas/components/canvas/canvas-lazy-dialog";
import type { CanvasImageAngleParams } from "@canvas/components/canvas/canvas-node-angle-dialog";
import type { CanvasImageCropRect } from "@canvas/components/canvas/canvas-node-crop-dialog";
import type { CanvasImageMaskEditPayload } from "@canvas/components/canvas/canvas-node-mask-edit-dialog";
import type { CanvasImageSplitParams } from "@canvas/components/canvas/canvas-node-split-dialog";
import type { CanvasImageUpscaleParams } from "@canvas/components/canvas/canvas-node-upscale-dialog";
import { buildNodeGenerationContext, buildNodeGenerationInputs, buildNodeResponseMessages, hydrateNodeGenerationContext, type NodeGenerationInput } from "@canvas/components/canvas/canvas-node-generation";
import { runVideoUpscale, probeVideoDimensions, type VideoUpscaleParams } from "@canvas/lib/canvas/video-upscale";
import { CanvasNodeHoverToolbar } from "@canvas/components/canvas/canvas-node-hover-toolbar";
import { CanvasNodeInfoModal } from "@canvas/components/canvas/canvas-node-info-modal";
import { InfiniteCanvas, type CanvasInteractionMode } from "@canvas/components/canvas/infinite-canvas";
import { canvasSpacePressedRef } from "@canvas/lib/canvas/canvas-space-pan";
import { CanvasMultiSelectConnectHub } from "@canvas/components/canvas/canvas-multi-select-connect-hub";
import { Minimap } from "@canvas/components/canvas/canvas-mini-map";
import { CanvasNode } from "@canvas/components/canvas/canvas-node";
import { CanvasNodePromptPanel, type CanvasNodeGenerationMode } from "@canvas/components/canvas/canvas-node-prompt-panel";
import { CanvasToolbar } from "@canvas/components/canvas/canvas-toolbar";
import { AssetPickerModal, type InsertAssetPayload } from "@canvas/components/canvas/asset-picker-modal";
import { CanvasSidePanel } from "@canvas/components/canvas/canvas-side-panel";
import { CanvasZoomControls } from "@canvas/components/canvas/canvas-zoom-controls";
import { useCanvasStore } from "@canvas/stores/canvas/use-canvas-store";
import { useCanvasCloudPersist } from "@canvas/pages/canvas/hooks/use-canvas-cloud-persist";
import { useCanvasImageCompliance } from "@canvas/pages/canvas/hooks/use-canvas-image-compliance";
import { buildNodeMentionReferences, collectCopyConnections, getInboundResourceConnections, nextPromptAfterDisconnectResource, type CanvasResourceReference } from "@canvas/lib/canvas/canvas-resource-references";
import { APP_NAME } from "@canvas/constant/app-brand";
import { applyNodeConfigPatch, audioMetadata, buildAudioGenerationMetadata, buildImageGenerationMetadata, buildVideoPreferenceMetadata, countPlatformVideosExpiringSoon, createCanvasNode, imageMetadata, videoMetadata, withPlatformVideoExpiry } from "@canvas/lib/canvas/canvas-node-factory";
import { findContainingGroupId, findGroupDropTarget, getConnectionTargetAnchor, isHiddenBatchChild, isHiddenBatchConnectionEndpoint, normalizeConnection, offsetDraggedNodes, snapNodesIntoGroup } from "@canvas/lib/canvas/canvas-node-geometry";
import {
    audioExtension,
    buildAngleLabel,
    buildAnglePrompt,
    buildGenerationConfig,
    clearPlatformTaskMeta,
    findRetrySourceNode,
    generationReferenceUrls,
    getGenerationCount,
    getInputSummary,
    hasResumablePlatformTask,
    hydrateAssistantImages,
    hydrateCanvasImages,
    imageExtension,
    isAudioFile,
    isGenerationCanceled,
    keepImagePlatformTaskMeta,
    resetInterruptedGeneration,
    resolveMetadataReferences,
    isVideoPollTimeout,
    shouldKeepVideoTaskWaiting,
    sourceNodeReferenceImages,
} from "@canvas/lib/canvas/canvas-generation-helpers";
import { getNodeDefinition, isBuiltinNodeType as isBuiltinType, useNodeRegistryVersion } from "@canvas/lib/canvas/node-registry";
import { registerBuiltinNodes } from "@canvas/components/canvas/nodes/builtin-nodes";
import { CanvasRefreshShell } from "@canvas/components/canvas/canvas-refresh-shell";
import { CanvasTopBar } from "@canvas/components/canvas/canvas-top-bar";
import { ConnectionCreateMenu, NodeCreateMenu, type PendingConnectionCreate } from "@canvas/components/canvas/canvas-create-menus";
import {
    CanvasNodeType,
    type CanvasAssistantSession,
    type CanvasConnection,
    type CanvasNodeData,
    type CanvasNodeTypeId,
    type ConnectionHandle,
    type ContextMenuState,
    type Position,
    type SelectionBox,
    type ViewportTransform,
} from "@canvas/types/canvas";

const CanvasNodeAngleDialog = lazy(() => import("@canvas/components/canvas/canvas-node-angle-dialog").then((module) => ({ default: module.CanvasNodeAngleDialog })));
const CanvasNodeCropDialog = lazy(() => import("@canvas/components/canvas/canvas-node-crop-dialog").then((module) => ({ default: module.CanvasNodeCropDialog })));
const CanvasNodeMaskEditDialog = lazy(() => import("@canvas/components/canvas/canvas-node-mask-edit-dialog").then((module) => ({ default: module.CanvasNodeMaskEditDialog })));
const CanvasNodeSplitDialog = lazy(() => import("@canvas/components/canvas/canvas-node-split-dialog").then((module) => ({ default: module.CanvasNodeSplitDialog })));
const CanvasNodeUpscaleDialog = lazy(() => import("@canvas/components/canvas/canvas-node-upscale-dialog").then((module) => ({ default: module.CanvasNodeUpscaleDialog })));
const CanvasVideoEnhanceDialog = lazy(() => import("@canvas/components/canvas/canvas-video-enhance-dialog").then((module) => ({ default: module.CanvasVideoEnhanceDialog })));
const CanvasPlatformSettings = lazy(() => import("@/features/canvas/canvas-platform-settings").then((module) => ({ default: module.CanvasPlatformSettings })));

// 内置节点注册到统一注册表(模块加载时执行一次)
registerBuiltinNodes();

type CanvasClipboard = {
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
};

type ConnectionDropTarget = {
    nodeId: string | null;
    isNearNode: boolean;
};

type CanvasHistoryEntry = Pick<CanvasClipboard, "nodes" | "connections"> & {
    chatSessions: CanvasAssistantSession[];
    activeChatId: string | null;
    backgroundMode: CanvasBackgroundMode;
    showImageInfo: boolean;
};

type CanvasGenerationRequest = {
    targetNodeId: string;
    originNodeId: string;
    runningNodeId: string;
    controller: AbortController;
};

type CanvasNodeDrag = {
    startX: number;
    startY: number;
    initialPositions: ReadonlyMap<string, Position>;
    offset: Position;
    frame: number | null;
    hasMoved: boolean;
    hasPreview: boolean;
};

const VIDEO_NODE_MAX_WIDTH = 420;
const VIDEO_NODE_MAX_HEIGHT = 420;
/** 多文件拖入/上传时横向间距（节点中心之间按默认宽度推算） */
const DROP_MEDIA_GAP = 32;
// 稳定的空引用数组:避免每次渲染 `... || []` 产生新数组引用而击穿 CanvasNode 的 React.memo
const EMPTY_REFERENCES: CanvasResourceReference[] = [];
const CONNECTION_HANDLE_HIT_RADIUS = 40;
const CONNECTION_NODE_HIT_PADDING = 32;
const CANVAS_SHORTCUT_IGNORE = "input, textarea, select, [contenteditable='true'], [data-canvas-no-zoom], [data-canvas-shortcuts-ignore], [aria-modal='true']";
const NODE_STATUS_IDLE = "idle" as const;
const NODE_STATUS_LOADING = "loading" as const;
const NODE_STATUS_SUCCESS = "success" as const;
const NODE_STATUS_ERROR = "error" as const;

/** 多文件横向排布：按真实宽高依次落位，保证节点间有空隙且不重叠（返回节点中心点） */
function createHorizontalPositionResolver(anchor: Position, initialLeft: number | null = null) {
    let nextLeft: number | null = initialLeft;
    return (size: { width: number; height: number }): Position => {
        const left = nextLeft == null ? anchor.x - size.width / 2 : nextLeft;
        nextLeft = left + size.width + DROP_MEDIA_GAP;
        return { x: left + size.width / 2, y: anchor.y };
    };
}

type DropPositionInput = Position | ((size: { width: number; height: number }) => Position);

function resolveDropCenter(position: DropPositionInput, size: { width: number; height: number }): Position {
    return typeof position === "function" ? position(size) : position;
}

export default function CanvasPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <CanvasRefreshShell />;

    return <InfiniteCanvasPage />;
}

function InfiniteCanvasPage() {
    const { message, modal } = App.useApp();
    useEffect(() => {
        const pauseOtherMedia = (event: Event) => {
            if (!(event.target instanceof HTMLMediaElement)) return;
            document.querySelectorAll<HTMLMediaElement>("audio, video").forEach((media) => {
                if (media !== event.target && !media.paused) media.pause();
            });
        };
        // play 不冒泡；捕获阶段同时覆盖节点、历史弹窗和音色试听。
        document.addEventListener("play", pauseOtherMedia, true);
        return () => document.removeEventListener("play", pauseOtherMedia, true);
    }, []);
    // 订阅节点注册表版本,插件动态注册/卸载后驱动画布重渲染
    const nodeRegistryVersion = useNodeRegistryVersion((state) => state.version);
    const params = useParams<{ id: string }>();
    const navigate = useNavigate();
    const projectId = params.id || "";
    const [interactionMode, setInteractionMode] = useState<CanvasInteractionMode>("select");
    const containerRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const uploadTargetRef = useRef<{ nodeId?: string; position?: Position } | null>(null);
    const clipboardRef = useRef<CanvasClipboard | null>(null);
    const historyRef = useRef<{ past: CanvasHistoryEntry[]; future: CanvasHistoryEntry[] }>({ past: [], future: [] });
    const lastHistoryRef = useRef<CanvasHistoryEntry | null>(null);
    const historyCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const viewportSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const applyingHistoryRef = useRef(false);
    const historyPausedRef = useRef(false);
    const didInitialCenterRef = useRef(false);
    const warnedExpireKeyRef = useRef<string | null>(null);
    const dragRef = useRef<CanvasNodeDrag | null>(null);

    const effectiveConfig = useEffectiveConfig();
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const configDialogOpen = useConfigStore((state) => state.isConfigOpen);
    const setConfigDialogOpen = useConfigStore((state) => state.setConfigDialogOpen);
    useEffect(() => {
        void bootstrapPlatformModels().catch(() => undefined);
    }, []);
    const addAsset = useAssetStore((state) => state.addAsset);
    const cleanupAssetImages = useAssetStore((state) => state.cleanupImages);
    const hydrated = useCanvasStore((state) => state.hydrated);
    const createProject = useCanvasStore((state) => state.createProject);
    const openProject = useCanvasStore((state) => state.openProject);
    const updateProject = useCanvasStore((state) => state.updateProject);
    const renameProject = useCanvasStore((state) => state.renameProject);
    const deleteProjects = useCanvasStore((state) => state.deleteProjects);
    const currentProject = useCanvasStore((state) => state.projects.find((project) => project.id === projectId));
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const [nodes, setNodes] = useState<CanvasNodeData[]>([]);
    const [connections, setConnections] = useState<CanvasConnection[]>([]);
    useCanvasImageCompliance(nodes, setNodes);
    const [chatSessions, setChatSessions] = useState<CanvasAssistantSession[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [viewport, setViewport] = useState<ViewportTransform>({ x: 0, y: 0, k: 1 });
    const [canvasGesturing, setCanvasGesturing] = useState(false);
    const [size, setSize] = useState({ width: 1200, height: 720 });
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [connectingParams, setConnectingParams] = useState<ConnectionHandle | null>(null);
    const [connectionTargetNodeId, setConnectionTargetNodeId] = useState<string | null>(null);
    const [pendingConnectionCreate, setPendingConnectionCreate] = useState<PendingConnectionCreate | null>(null);
    const [mouseWorld, setMouseWorld] = useState<Position>({ x: 0, y: 0 });
    const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [nodeCreatePosition, setNodeCreatePosition] = useState<Position | null>(null);
    const [runningNodeId, setRunningNodeId] = useState<string | null>(null);
    const [isMiniMapOpen, setIsMiniMapOpen] = useState(true);
    const [backgroundMode, setBackgroundMode] = useState<CanvasBackgroundMode>("dots");
    const [showImageInfo, setShowImageInfo] = useState(false);
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);
    const [projectLoaded, setProjectLoaded] = useState(false);
    const [toolbarNodeId, setToolbarNodeId] = useState<string | null>(null);
    const [titleEditingNodeId, setTitleEditingNodeId] = useState<string | null>(null);
    const [nodeImageSettingsOpen, setNodeImageSettingsOpen] = useState(false);
    const [dialogNodeId, setDialogNodeId] = useState<string | null>(null);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editRequestNonce, setEditRequestNonce] = useState(0);
    const [infoNodeId, setInfoNodeId] = useState<string | null>(null);
    const [cropNodeId, setCropNodeId] = useState<string | null>(null);
    const [maskEditNodeId, setMaskEditNodeId] = useState<string | null>(null);
    const [splitNodeId, setSplitNodeId] = useState<string | null>(null);
    const [upscaleNodeId, setUpscaleNodeId] = useState<string | null>(null);
    const [videoEnhanceNodeId, setVideoEnhanceNodeId] = useState<string | null>(null);
    const [angleNodeId, setAngleNodeId] = useState<string | null>(null);
    const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);
    const [titleEditing, setTitleEditing] = useState(false);
    const [titleDraft, setTitleDraft] = useState("");
    const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
    const [cloudContentRevision, setCloudContentRevision] = useState(0);
    const [collapsingBatchIds, setCollapsingBatchIds] = useState<Set<string>>(new Set());
    const [openingBatchIds, setOpeningBatchIds] = useState<Set<string>>(new Set());
    const [isNodeDragging, setIsNodeDragging] = useState(false);
    const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(null);

    const nodesRef = useRef(nodes);
    const connectionsRef = useRef(connections);
    const selectedNodeIdsRef = useRef(selectedNodeIds);
    const viewportRef = useRef(viewport);
    const canvasGesturingRef = useRef(false);
    const focusAnimRef = useRef<number | null>(null);
    const connectingParamsRef = useRef(connectingParams);
    const connectionTargetNodeIdRef = useRef(connectionTargetNodeId);
    const selectionBoxRef = useRef(selectionBox);
    const pendingConnectionCreateRef = useRef(pendingConnectionCreate);
    const connectionGestureDoneRef = useRef(false);
    const generationRequestsRef = useRef(new Map<string, CanvasGenerationRequest>());


    const createHistoryEntry = useCallback(
        (): CanvasHistoryEntry => ({
            nodes: nodesRef.current,
            connections: connectionsRef.current,
            chatSessions,
            activeChatId,
            backgroundMode,
            showImageInfo,
        }),
        [activeChatId, backgroundMode, chatSessions, showImageInfo],
    );

    const cleanupCanvasFiles = useCallback(
        (extra?: unknown) => {
            cleanupAssetImages({ extra, history: historyRef.current, lastHistory: lastHistoryRef.current });
        },
        [cleanupAssetImages],
    );

    const startGenerationRequest = useCallback((targetNodeId: string, originNodeId: string, runningId = originNodeId, controller = new AbortController()) => {
        const previous = generationRequestsRef.current.get(targetNodeId);
        if (previous?.controller !== controller) previous?.controller.abort();
        generationRequestsRef.current.set(targetNodeId, { targetNodeId, originNodeId, runningNodeId: runningId, controller });
        return controller;
    }, []);

    const finishGenerationRequest = useCallback((targetNodeId: string, controller: AbortController) => {
        const request = generationRequestsRef.current.get(targetNodeId);
        if (request?.controller === controller) generationRequestsRef.current.delete(targetNodeId);
    }, []);

    const stopGenerationByRunningId = useCallback((runningId: string) => {
        const affectedNodeIds = new Set<string>();
        generationRequestsRef.current.forEach((request) => {
            if (request.runningNodeId !== runningId) return;
            request.controller.abort();
            generationRequestsRef.current.delete(request.targetNodeId);
            affectedNodeIds.add(request.targetNodeId);
            affectedNodeIds.add(request.originNodeId);
        });
        setRunningNodeId((current) => (current === runningId ? null : current));
        if (!affectedNodeIds.size) return;
        setNodes((prev) =>
            prev.map((node) =>
                affectedNodeIds.has(node.id) && node.metadata?.status === NODE_STATUS_LOADING
                    ? { ...node, metadata: { ...node.metadata, status: node.metadata?.platformTaskKind === "audio" ? NODE_STATUS_ERROR : NODE_STATUS_IDLE, errorDetails: node.metadata?.platformTaskKind === "audio" ? "已停止等待，后台任务继续；可继续查询或打开音频历史" : undefined, ...(node.metadata?.platformTaskKind === "audio" ? {} : clearPlatformTaskMeta()) } }
                    : node,
            ),
        );
    }, []);

    const confirmStopGeneration = useCallback(
        (nodeId: string) => {
            modal.confirm({
                title: "停止生成？",
                content: nodesRef.current.some(n => (n.id === nodeId || connectionsRef.current.some(c => c.fromNodeId === nodeId && c.toNodeId === n.id)) && n.metadata?.platformTaskKind === "audio") ? "仅停止等待音频结果；后台生成和计费会继续，可从音频历史取回。" : "当前生成请求会被中断，已经生成完成的内容会保留。",
                okText: "停止",
                cancelText: "继续生成",
                okButtonProps: { danger: true },
                onOk: () => stopGenerationByRunningId(nodeId),
            });
        },
        [modal, stopGenerationByRunningId],
    );

    const resumePlatformNodeTask = useCallback(
        async (node: CanvasNodeData) => {
            if (!hasResumablePlatformTask(node)) return;
            const taskId = node.metadata!.platformTaskId!;
            const kind = node.metadata!.platformTaskKind!;
            const controller = startGenerationRequest(node.id, node.id, node.id);
            setRunningNodeId(node.id);
            try {
                if (kind === "audio") {
                    const result = await waitForAudioTask(taskId, controller.signal);
                    setNodes(prev => prev.map(item => item.id === node.id ? { ...item, metadata: { ...item.metadata, ...audioTaskMetadata(result) } } : item));
                    message.success("音频已生成");
                    return;
                }
                if (kind === "video") {
                    const task: VideoGenerationTask = {
                        id: taskId,
                        provider: "seedance",
                        model: node.metadata?.model || "",
                        modelKey: node.metadata?.platformModelKey || "",
                    };
                    const result = await waitForVideoGenerationTask(effectiveConfig, task, { signal: controller.signal });
                    const video = await storeGeneratedVideo(result);
                    const videoSize = fitNodeSize(video.width || node.width, video.height || node.height, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
                    setNodes((prev) =>
                        prev.map((item) =>
                            item.id === node.id
                                ? {
                                      ...item,
                                      width: videoSize.width,
                                      height: videoSize.height,
                                      position: { x: item.position.x + item.width / 2 - videoSize.width / 2, y: item.position.y + item.height / 2 - videoSize.height / 2 },
                                      metadata: { ...item.metadata, ...withPlatformVideoExpiry(videoMetadata(video)), ...clearPlatformTaskMeta() },
                                  }
                                : item,
                        ),
                    );
                    message.success("视频已生成");
                    return;
                }
                const imageId = Number(taskId);
                if (!Number.isFinite(imageId) || imageId <= 0) throw new Error("无效的生图任务");
                const image = (await waitForPlatformImageTask(imageId, controller.signal))[0];
                if (!image) throw new Error("生图完成但未返回图片");
                const uploaded = await uploadImage(image.dataUrl);
                const imageSize = fitNodeSize(uploaded.width, uploaded.height, node.width, node.height);
                setNodes((prev) =>
                    prev.map((item) => {
                        if (item.id !== node.id) return item;
                        const center = { x: item.position.x + item.width / 2, y: item.position.y + item.height / 2 };
                        return {
                            ...item,
                            position: { x: center.x - imageSize.width / 2, y: center.y - imageSize.height / 2 },
                            width: imageSize.width,
                            height: imageSize.height,
                            metadata: { ...item.metadata, ...imageMetadata(uploaded), ...keepImagePlatformTaskMeta(taskId) },
                        };
                    }),
                );
                message.success("图片已生成");
            } catch (error) {
                if (isGenerationCanceled(error)) return;
                const errorDetails = error instanceof Error ? error.message : "生成失败";
                const keepWaiting = shouldKeepVideoTaskWaiting(node, error);
                if (keepWaiting) message.warning(errorDetails);
                else message.error(errorDetails);
                setNodes((prev) =>
                    prev.map((item) =>
                        item.id === node.id
                            ? {
                                  ...item,
                                  metadata: {
                                      ...item.metadata,
                                      status: keepWaiting ? NODE_STATUS_LOADING : NODE_STATUS_ERROR,
                                      errorDetails,
                                      ...(keepWaiting ? {} : clearPlatformTaskMeta()),
                                  },
                              }
                            : item,
                    ),
                );
            } finally {
                finishGenerationRequest(node.id, controller);
                setRunningNodeId((current) => (current === node.id ? null : current));
            }
        },
        [effectiveConfig, finishGenerationRequest, message, startGenerationRequest],
    );
    const resumePlatformNodeTaskRef = useRef(resumePlatformNodeTask);
    resumePlatformNodeTaskRef.current = resumePlatformNodeTask;

    useEffect(() => {
        if (!hydrated) return;
        setProjectLoaded(false);
        const project = openProject(projectId);
        if (!project) {
            navigate("/canvas", { replace: true });
            return;
        }

        const restore = async () => {
            const restoredNodes = await hydrateCanvasImages(resetInterruptedGeneration(project.nodes));
            const restoredSessions = await hydrateAssistantImages(project.chatSessions || []);
            setNodes(restoredNodes);
            setConnections(project.connections);
            setChatSessions(restoredSessions);
            setActiveChatId(project.activeChatId || null);
            setBackgroundMode(project.backgroundMode);
            setShowImageInfo(project.showImageInfo || false);
            setViewport(project.viewport);
            historyRef.current = { past: [], future: [] };
            if (historyCommitTimerRef.current) {
                clearTimeout(historyCommitTimerRef.current);
                historyCommitTimerRef.current = null;
            }
            lastHistoryRef.current = {
                nodes: restoredNodes,
                connections: project.connections,
                chatSessions: restoredSessions,
                activeChatId: project.activeChatId || null,
                backgroundMode: project.backgroundMode,
                showImageInfo: project.showImageInfo || false,
            };
            setHistoryState({ canUndo: false, canRedo: false });
            setProjectLoaded(true);
            const expiringSoon = countPlatformVideosExpiringSoon(restoredNodes);
            if (expiringSoon > 0 && warnedExpireKeyRef.current !== projectId) {
                warnedExpireKeyRef.current = projectId;
                modal.warning({
                    title: "视频即将过期",
                    content: `有 ${expiringSoon} 个视频将在两小时内过期，请及时下载。`,
                    okText: "知道了",
                });
            }
            restoredNodes.filter(hasResumablePlatformTask).forEach((node) => void resumePlatformNodeTaskRef.current(node));
        };
        void restore();
    }, [hydrated, modal, navigate, openProject, projectId]);


    useEffect(() => {
        if (!projectLoaded || applyingHistoryRef.current || historyPausedRef.current) return;
        const next = createHistoryEntry();
        const previous = lastHistoryRef.current;
        if (
            previous?.nodes === next.nodes &&
            previous.connections === next.connections &&
            previous.chatSessions === next.chatSessions &&
            previous.activeChatId === next.activeChatId &&
            previous.backgroundMode === next.backgroundMode &&
            previous.showImageInfo === next.showImageInfo
        )
            return;

        if (historyCommitTimerRef.current) clearTimeout(historyCommitTimerRef.current);
        historyCommitTimerRef.current = setTimeout(() => {
            const current = createHistoryEntry();
            const last = lastHistoryRef.current;
            if (!last) return;
            historyRef.current.past = [...historyRef.current.past.slice(-49), last];
            historyRef.current.future = [];
            setHistoryState({ canUndo: true, canRedo: false });
            lastHistoryRef.current = current;
            historyCommitTimerRef.current = null;
        }, 180);

        return () => {
            if (historyCommitTimerRef.current) {
                clearTimeout(historyCommitTimerRef.current);
                historyCommitTimerRef.current = null;
            }
        };
    }, [activeChatId, backgroundMode, chatSessions, connections, createHistoryEntry, nodes, projectLoaded, showImageInfo]);

    useEffect(() => {
        if (!projectLoaded || historyPausedRef.current) return;
        updateProject(projectId, { nodes, connections, chatSessions, activeChatId, backgroundMode, showImageInfo });
        setCloudContentRevision((n) => n + 1);
    }, [activeChatId, backgroundMode, chatSessions, connections, nodes, projectId, projectLoaded, showImageInfo, updateProject]);

    const liveCloudProject = useMemo(() => {
        if (!currentProject) return null;
        return {
            ...currentProject,
            nodes,
            connections,
            chatSessions,
            activeChatId,
            backgroundMode,
            showImageInfo,
            viewport,
        };
    }, [activeChatId, backgroundMode, chatSessions, connections, currentProject, nodes, showImageInfo, viewport]);

    const { saving: cloudSaving, saveToCloud, bypassNextLeave } = useCanvasCloudPersist({
        enabled: projectLoaded && Boolean(liveCloudProject),
        project: liveCloudProject,
        contentRevision: cloudContentRevision,
        getLatestProject: () => {
            if (!currentProject) return null;
            return {
                ...currentProject,
                nodes: nodesRef.current,
                connections: connectionsRef.current,
                chatSessions,
                activeChatId,
                backgroundMode,
                showImageInfo,
                viewport: viewportRef.current,
            };
        },
        onSaved: ({ project: saved, mergeNodes, mergeConnections, mergeChatSessions }) => {
            setNodes(mergeNodes);
            setConnections(mergeConnections);
            setChatSessions(mergeChatSessions);
            setActiveChatId(saved.activeChatId);
            setBackgroundMode(saved.backgroundMode);
            setShowImageInfo(saved.showImageInfo);
            setViewport(saved.viewport);
            if (saved.title !== currentProject?.title) renameProject(projectId, saved.title);
        },
    });

    useEffect(() => {
        if (!dialogNodeId) setNodeImageSettingsOpen(false);
    }, [dialogNodeId]);

    useEffect(() => {
        if (!projectLoaded) return;
        if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
        viewportSaveTimerRef.current = setTimeout(() => {
            updateProject(projectId, { viewport: viewportRef.current });
            viewportSaveTimerRef.current = null;
        }, 500);
        return () => {
            if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
        };
    }, [projectId, projectLoaded, updateProject, viewport]);

    useLayoutEffect(() => {
        nodesRef.current = nodes;
        connectionsRef.current = connections;
        selectedNodeIdsRef.current = selectedNodeIds;
        if (!canvasGesturingRef.current) viewportRef.current = viewport;
        connectingParamsRef.current = connectingParams;
        connectionTargetNodeIdRef.current = connectionTargetNodeId;
        pendingConnectionCreateRef.current = pendingConnectionCreate;
    }, [nodes, connections, selectedNodeIds, viewport, connectingParams, connectionTargetNodeId, pendingConnectionCreate]);

    useLayoutEffect(() => {
        selectionBoxRef.current = selectionBox;
    }, [selectionBox]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const updateSize = () => {
            const rect = el.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
            if (!didInitialCenterRef.current) {
                didInitialCenterRef.current = true;
                setViewport({ x: width / 2, y: height / 2, k: 1 });
            }
        };

        updateSize();
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(el);
        return () => resizeObserver.disconnect();
    }, []);

    const screenToCanvas = useCallback((clientX: number, clientY: number) => {
        const rect = containerRef.current?.getBoundingClientRect();
        const currentViewport = viewportRef.current;
        const localX = clientX - (rect?.left || 0);
        const localY = clientY - (rect?.top || 0);

        return {
            x: (localX - currentViewport.x) / currentViewport.k,
            y: (localY - currentViewport.y) / currentViewport.k,
        };
    }, []);

    const canvasToScreen = useCallback((point: Position) => {
        const current = viewportRef.current;
        return {
            x: current.x + point.x * current.k,
            y: current.y + point.y * current.k,
        };
    }, []);

    const getCanvasCenter = useCallback(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        return screenToCanvas((rect?.left || 0) + (rect?.width || size.width) / 2, (rect?.top || 0) + (rect?.height || size.height) / 2);
    }, [screenToCanvas, size.height, size.width]);

    useEffect(() => {
        const restore = (event: Event) => {
            const task = (event as CustomEvent<AudioTask>).detail;
            if (!task?.id) return;
            const existing = nodesRef.current.find(n => n.metadata?.platformTaskKind === "audio" && n.metadata?.platformTaskId === task.id);
            if (existing) {
                setNodes(prev => prev.map(n => n.id === existing.id ? { ...n, metadata: { ...n.metadata, ...audioTaskMetadata(task) } } : n));
                setSelectedNodeIds(new Set([existing.id]));
                const updated = { ...existing, metadata: { ...existing.metadata, ...audioTaskMetadata(task) } };
                if (hasResumablePlatformTask(updated) && !generationRequestsRef.current.has(existing.id)) void resumePlatformNodeTaskRef.current(updated);
                return;
            }
            const spec = NODE_DEFAULT_SIZE[CanvasNodeType.Audio];
            const center = getCanvasCenter();
            const id = nanoid();
            const restored: CanvasNodeData = { id, type: CanvasNodeType.Audio, title: "音频历史", width: spec.width, height: spec.height,
                position: { x: center.x - spec.width / 2, y: center.y - spec.height / 2 }, metadata: audioTaskMetadata(task) };
            setNodes(prev => [...prev, restored]);
            if (hasResumablePlatformTask(restored)) void resumePlatformNodeTaskRef.current(restored);
            setSelectedNodeIds(new Set([id]));
        };
        window.addEventListener(RESTORE_AUDIO_EVENT, restore);
        return () => window.removeEventListener(RESTORE_AUDIO_EVENT, restore);
    }, [getCanvasCenter]);

    const setConnecting = useCallback((next: ConnectionHandle | null) => {
        connectingParamsRef.current = next;
        setConnectingParams(next);
        if (next) connectionGestureDoneRef.current = false;
        if (!next) {
            connectionTargetNodeIdRef.current = null;
            setConnectionTargetNodeId(null);
        }
    }, []);

    /** 批量选中且从选中节点之一拖线时，整批一起连到同一目标；否则仅当前节点 */
    const resolveConnectSourceIds = useCallback((current: ConnectionHandle) => {
        const selected = selectedNodeIdsRef.current;
        if (selected.size > 1 && selected.has(current.nodeId)) {
            return Array.from(selected).filter((id) => {
                const node = nodesRef.current.find((item) => item.id === id);
                return Boolean(node && node.type !== CanvasNodeType.Group);
            });
        }
        return [current.nodeId];
    }, []);

    const keepNodeToolbar = useCallback(
        (nodeId: string) => {
            if (dragRef.current || nodeImageSettingsOpen || !selectedNodeIdsRef.current.has(nodeId)) return;
            setToolbarNodeId(nodeId);
        },
        [nodeImageSettingsOpen],
    );

    const hideNodeToolbar = useCallback(() => {}, []);

    const connectNodes = useCallback(
        (current: ConnectionHandle, targetNodeId: string) => {
            const sourceIds = resolveConnectSourceIds(current).filter((id) => id !== targetNodeId);
            if (!sourceIds.length) return;

            const nodesSnapshot = nodesRef.current;
            const existing = new Set(connectionsRef.current.map((conn) => `${conn.fromNodeId}->${conn.toNodeId}`));
            const additions: CanvasConnection[] = [];
            let blockedConfigPair = false;

            for (const sourceId of sourceIds) {
                const connection = normalizeConnection(sourceId, targetNodeId, nodesSnapshot, current.handleType);
                if (!connection) {
                    blockedConfigPair = true;
                    continue;
                }
                const key = `${connection.fromNodeId}->${connection.toNodeId}`;
                if (existing.has(key)) continue;
                existing.add(key);
                additions.push({ id: nanoid(), fromNodeId: connection.fromNodeId, toNodeId: connection.toNodeId });
            }

            if (!additions.length) {
                if (blockedConfigPair) message.warning("配置节点之间不能连接");
                return;
            }
            setConnections((prev) => [...prev, ...additions]);
            setContextMenu(null);
        },
        [message, resolveConnectSourceIds],
    );

    const createConnectedNode = useCallback(
        (type: CanvasNodeType.Image | CanvasNodeType.Text | CanvasNodeType.Config | CanvasNodeType.Video | CanvasNodeType.Audio, pending: PendingConnectionCreate) => {
            const metadata =
                type === CanvasNodeType.Config
                    ? { model: effectiveConfig.imageModel || effectiveConfig.model, size: effectiveConfig.size, count: getGenerationCount(effectiveConfig.canvasImageCount || effectiveConfig.count) }
                    : type === CanvasNodeType.Video
                      ? buildVideoPreferenceMetadata(effectiveConfig)
                      : undefined;
            let newNode = createCanvasNode(type, pending.position, metadata);
            if (type === CanvasNodeType.Video && metadata?.size) newNode = applyNodeConfigPatch(newNode, { size: metadata.size });
            const sourceIds = resolveConnectSourceIds(pending.connection);
            const nodesWithNew = [...nodesRef.current, newNode];
            const additions: CanvasConnection[] = [];
            let blockedConfigPair = false;

            for (const sourceId of sourceIds) {
                const connection = normalizeConnection(sourceId, newNode.id, nodesWithNew, pending.connection.handleType);
                if (!connection) {
                    blockedConfigPair = true;
                    continue;
                }
                additions.push({ id: nanoid(), ...connection });
            }

            if (!additions.length) {
                if (blockedConfigPair) message.warning("配置节点之间不能连接");
                return;
            }

            setNodes((prev) => [...prev, newNode]);
            setConnections((prev) => [...prev, ...additions]);
            setSelectedNodeIds(new Set([newNode.id]));
            setSelectedConnectionId(null);
            if (type !== CanvasNodeType.Text) setDialogNodeId(newNode.id);
            setPendingConnectionCreate(null);
            setConnecting(null);
        },
        [effectiveConfig, message, resolveConnectSourceIds, setConnecting],
    );

    const cancelPendingConnectionCreate = useCallback(() => {
        setPendingConnectionCreate(null);
        setConnecting(null);
    }, [setConnecting]);

    const getConnectionDropTarget = useCallback(
        (clientX: number, clientY: number, current: ConnectionHandle): ConnectionDropTarget => {
            const world = screenToCanvas(clientX, clientY);
            const scale = Math.max(viewportRef.current.k, 0.05);
            const padding = CONNECTION_NODE_HIT_PADDING / scale;
            const handleRadius = CONNECTION_HANDLE_HIT_RADIUS / scale;
            const sourceIds = new Set(resolveConnectSourceIds(current));
            let isNearNode = false;
            let bestNodeId: string | null = null;
            let bestPriority = Number.POSITIVE_INFINITY;

            [...nodesRef.current]
                .filter((node) => !isHiddenBatchChild(node, nodesRef.current))
                .reverse()
                .forEach((node) => {
                    // 源节点（含批量选中）附近松手应视为空白，弹出新建菜单，而不是直接取消连线
                    if (sourceIds.has(node.id)) return;

                    const anchor = getConnectionTargetAnchor(node, current);
                    const dx = world.x - anchor.x;
                    const dy = world.y - anchor.y;
                    const hitsHandle = dx * dx + dy * dy <= handleRadius * handleRadius;
                    const hitsInside = world.x >= node.position.x && world.x <= node.position.x + node.width && world.y >= node.position.y && world.y <= node.position.y + node.height;
                    const hitsExpanded = world.x >= node.position.x - padding && world.x <= node.position.x + node.width + padding && world.y >= node.position.y - padding && world.y <= node.position.y + node.height + padding;

                    if (!hitsHandle && !hitsInside && !hitsExpanded) return;
                    isNearNode = true;
                    const canConnect = Array.from(sourceIds).some((sourceId) => normalizeConnection(sourceId, node.id, nodesRef.current, current.handleType));
                    if (!canConnect) return;

                    const priority = hitsInside ? 0 : hitsHandle ? 1 : 2;
                    if (priority < bestPriority) {
                        bestNodeId = node.id;
                        bestPriority = priority;
                    }
                });

            return { nodeId: bestNodeId, isNearNode };
        },
        [resolveConnectSourceIds, screenToCanvas],
    );

    const visibleNodes = useMemo(() => {
        const padding = 280;
        const rect = containerRef.current?.getBoundingClientRect();
        const width = rect?.width || size.width;
        const height = rect?.height || size.height;
        const viewLeft = -viewport.x / viewport.k - padding;
        const viewTop = -viewport.y / viewport.k - padding;
        const viewRight = viewLeft + width / viewport.k + padding * 2;
        const viewBottom = viewTop + height / viewport.k + padding * 2;

        return nodes.filter((node) => !isHiddenBatchChild(node, nodes, collapsingBatchIds) && node.position.x + node.width > viewLeft && node.position.x < viewRight && node.position.y + node.height > viewTop && node.position.y < viewBottom);
    }, [collapsingBatchIds, nodes, size.height, size.width, viewport.k, viewport.x, viewport.y]);

    const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
    // 工具条跟随「单选节点」:点击/新建/框选/键盘选中任一节点都会显示,不再仅靠精确点中触发。
    // 多选时不显示;拖拽中由下方 isNodeDragging 守卫隐藏。
    const singleSelectedNodeId = selectedNodeIds.size === 1 ? Array.from(selectedNodeIds)[0] : null;
    const toolbarNode = (toolbarNodeId ? nodeById.get(toolbarNodeId) || null : null) || (singleSelectedNodeId ? nodeById.get(singleSelectedNodeId) || null : null);
    const infoNode = infoNodeId ? nodeById.get(infoNodeId) || null : null;
    const cropNode = cropNodeId ? nodeById.get(cropNodeId) || null : null;
    const maskEditNode = maskEditNodeId ? nodeById.get(maskEditNodeId) || null : null;
    const splitNode = splitNodeId ? nodeById.get(splitNodeId) || null : null;
    const upscaleNode = upscaleNodeId ? nodeById.get(upscaleNodeId) || null : null;
    const videoEnhanceNode = videoEnhanceNodeId ? nodeById.get(videoEnhanceNodeId) || null : null;
    const angleNode = angleNodeId ? nodeById.get(angleNodeId) || null : null;
    const previewNode = previewNodeId ? nodeById.get(previewNodeId) || null : null;
    const hasMultipleSelectedNodes = selectedNodeIds.size > 1;
    const activeNodeId = hasMultipleSelectedNodes ? null : hoveredNodeId || (selectedNodeIds.size === 1 ? Array.from(selectedNodeIds)[0] : null);
    const connectingSourceIds = useMemo(() => {
        if (!connectingParams) return [] as string[];
        if (selectedNodeIds.size > 1 && selectedNodeIds.has(connectingParams.nodeId)) {
            return Array.from(selectedNodeIds).filter((id) => {
                const node = nodeById.get(id);
                return Boolean(node && node.type !== CanvasNodeType.Group);
            });
        }
        return [connectingParams.nodeId];
    }, [connectingParams, nodeById, selectedNodeIds]);
    const batchChildCountById = useMemo(() => {
        const map = new Map<string, number>();
        nodes.forEach((node) => {
            if (node.metadata?.isBatchRoot) map.set(node.id, node.metadata.batchChildIds?.length || 0);
        });
        return map;
    }, [nodes]);
    const groupChildCountById = useMemo(() => {
        const map = new Map<string, number>();
        nodes.forEach((node) => {
            const groupId = node.metadata?.groupId;
            if (groupId) map.set(groupId, (map.get(groupId) || 0) + 1);
        });
        return map;
    }, [nodes]);
    const batchMotionById = useMemo(() => {
        const map = new Map<string, { x: number; y: number; index: number }>();
        nodes.forEach((node) => {
            const rootId = node.metadata?.batchRootId;
            if (!rootId) return;
            const root = nodeById.get(rootId);
            const index = root?.metadata?.batchChildIds?.indexOf(node.id) ?? 0;
            const stackX = root ? root.position.x + 34 + index * 14 : node.position.x;
            const stackY = root ? root.position.y + 14 + index * 8 : node.position.y;
            map.set(node.id, { x: stackX - node.position.x, y: stackY - node.position.y, index: Math.max(index, 0) });
        });
        return map;
    }, [nodeById, nodes]);
    const relatedHighlight = useMemo(() => {
        const nodeIds = new Set<string>();
        const connectionIds = new Set<string>();

        if (!activeNodeId) return { nodeIds, connectionIds };

        nodeIds.add(activeNodeId);
        connections.forEach((connection) => {
            if (connection.fromNodeId !== activeNodeId && connection.toNodeId !== activeNodeId) return;
            connectionIds.add(connection.id);
            nodeIds.add(connection.fromNodeId);
            nodeIds.add(connection.toNodeId);
        });

        return { nodeIds, connectionIds };
    }, [activeNodeId, connections]);

    const configInputsById = useMemo(() => {
        const map = new Map<string, NodeGenerationInput[]>();
        nodes.forEach((node) => {
            if (node.type !== CanvasNodeType.Config) return;
            map.set(node.id, buildNodeGenerationInputs(node.id, nodes, connections));
        });
        return map;
    }, [connections, nodes]);
    const mentionReferencesByNodeId = useMemo(() => {
        const map = new Map<string, ReturnType<typeof buildNodeMentionReferences>>();
        nodes.forEach((node) => map.set(node.id, buildNodeMentionReferences(node, nodes, connections)));
        return map;
    }, [connections, nodes]);
    const createNode = useCallback(
        (type: CanvasNodeTypeId, position?: Position) => {
            const targetPosition = position || getCanvasCenter();
            const configMetadata =
                type === CanvasNodeType.Config
                    ? {
                          model: effectiveConfig.imageModel || effectiveConfig.model,
                          size: effectiveConfig.size,
                          count: getGenerationCount(effectiveConfig.canvasImageCount || effectiveConfig.count),
                      }
                    : type === CanvasNodeType.Video
                      ? buildVideoPreferenceMetadata(effectiveConfig)
                      : undefined;
            let newNode = createCanvasNode(type, targetPosition, configMetadata);
            if (type === CanvasNodeType.Video && configMetadata?.size) newNode = applyNodeConfigPatch(newNode, { size: configMetadata.size });

            setNodes((prev) => [...prev, newNode]);
            setSelectedNodeIds(new Set([newNode.id]));
            setSelectedConnectionId(null);
            const definition = getNodeDefinition(type);
            // 纯展示型插件节点(hidePanel)不弹面板;插件自定义 Panel 需显式 autoOpenPanel 才在新建时打开;
            // 声明了 useBuiltinPanel 的插件节点复用内置生成面板,新建即打开(与图片节点一致);
            // 内置的图片/视频/配置类节点保持原有「新建即打开生图面板」行为。
            const wantsPanel = definition?.hidePanel
                ? false
                : definition?.Panel
                  ? Boolean(definition.autoOpenPanel)
                  : definition?.useBuiltinPanel
                    ? true
                    : isBuiltinType(type) && type !== CanvasNodeType.Text && type !== CanvasNodeType.Group;
            if (wantsPanel) setDialogNodeId(newNode.id);
        },
        [effectiveConfig, getCanvasCenter],
    );

    const deleteNodes = useCallback(
        (ids: Set<string>) => {
            if (!ids.size) return;
            const allIds = new Set(ids);
            nodesRef.current.forEach((node) => {
                if (ids.has(node.id)) node.metadata?.batchChildIds?.forEach((childId) => allIds.add(childId));
            });
            setNodes((prev) => {
                const next = prev.filter((node) => !allIds.has(node.id));
                return next.map((node) => {
                    const groupId = node.metadata?.groupId;
                    if (groupId && allIds.has(groupId)) return { ...node, metadata: { ...node.metadata, groupId: undefined } };
                    const childIds = node.metadata?.batchChildIds?.filter((childId) => !allIds.has(childId));
                    if (!node.metadata?.isBatchRoot || childIds?.length === node.metadata.batchChildIds?.length) return node;
                    const primaryImageId = childIds?.includes(node.metadata.primaryImageId || "") ? node.metadata.primaryImageId : childIds?.[0];
                    const primaryNode = next.find((item) => item.id === primaryImageId);
                    return {
                        ...node,
                        metadata: {
                            ...node.metadata,
                            batchChildIds: childIds,
                            primaryImageId,
                            content: primaryNode?.metadata?.content || node.metadata.content,
                            naturalWidth: primaryNode?.metadata?.naturalWidth || node.metadata.naturalWidth,
                            naturalHeight: primaryNode?.metadata?.naturalHeight || node.metadata.naturalHeight,
                        },
                    };
                });
            });
            setConnections((prev) => prev.filter((conn) => !allIds.has(conn.fromNodeId) && !allIds.has(conn.toNodeId)));
            setSelectedNodeIds(new Set());
            setSelectedConnectionId(null);
            setHoveredNodeId((current) => (current && allIds.has(current) ? null : current));
            setToolbarNodeId((current) => (current && allIds.has(current) ? null : current));
            setDialogNodeId((current) => (current && allIds.has(current) ? null : current));
            setEditingNodeId((current) => (current && allIds.has(current) ? null : current));
            setInfoNodeId((current) => (current && allIds.has(current) ? null : current));
            setCropNodeId((current) => (current && allIds.has(current) ? null : current));
            setMaskEditNodeId((current) => (current && allIds.has(current) ? null : current));
            setAngleNodeId((current) => (current && allIds.has(current) ? null : current));
            setPreviewNodeId((current) => (current && allIds.has(current) ? null : current));
            setRunningNodeId((current) => (current && allIds.has(current) ? null : current));
            setContextMenu((current) => (current?.type === "node" && allIds.has(current.nodeId) ? null : current));
            cleanupCanvasFiles({ projectId, nodes: nodesRef.current.filter((node) => !allIds.has(node.id)), chatSessions });
        },
        [chatSessions, cleanupCanvasFiles, projectId],
    );

    const deleteConnection = useCallback((connectionId: string) => {
        const removed = connectionsRef.current.find((conn) => conn.id === connectionId);
        if (removed) {
            const nextPrompt = nextPromptAfterDisconnectResource(removed.toNodeId, removed.fromNodeId, nodesRef.current, connectionsRef.current);
            if (nextPrompt != null) {
                setNodes((prev) => prev.map((node) => (node.id === removed.toNodeId ? { ...node, metadata: { ...node.metadata, prompt: nextPrompt } } : node)));
            }
        }
        setConnections((prev) => prev.filter((conn) => conn.id !== connectionId));
        setSelectedConnectionId((current) => (current === connectionId ? null : current));
        setContextMenu((current) => (current?.type === "connection" && current.connectionId === connectionId ? null : current));
    }, []);

    const deselectCanvas = useCallback(() => {
        cancelPendingConnectionCreate();
        setSelectedNodeIds(new Set());
        setSelectedConnectionId(null);
        setContextMenu(null);
        setSelectionBox(null);
        setHoveredNodeId(null);
        setToolbarNodeId(null);
        setDialogNodeId(null);
        setEditingNodeId(null);
    }, [cancelPendingConnectionCreate]);

    const handleViewportChange = useCallback((next: ViewportTransform) => {
        viewportRef.current = next;
        setViewport(next);
        setContextMenu(null);
    }, []);

    const handleViewportFrame = useCallback((next: ViewportTransform) => {
        viewportRef.current = next;
    }, []);

    const handleGestureChange = useCallback((active: boolean) => {
        canvasGesturingRef.current = active;
        setCanvasGesturing(active);
        if (active) {
            setContextMenu(null);
            setNodeCreatePosition(null);
            setPendingConnectionCreate(null);
        }
    }, []);

    const clearCanvas = useCallback(() => {
        setNodes([]);
        setConnections([]);
        setInfoNodeId(null);
        setCropNodeId(null);
        setMaskEditNodeId(null);
        setAngleNodeId(null);
        setPreviewNodeId(null);
        setRunningNodeId(null);
        deselectCanvas();
        setClearConfirmOpen(false);
        cleanupCanvasFiles({ projectId, nodes: [], chatSessions: [] });
    }, [cleanupCanvasFiles, deselectCanvas, projectId]);

    const duplicateNode = useCallback((nodeId: string) => {
        const source = nodesRef.current.find((node) => node.id === nodeId);
        if (!source) return;

        const id = `${source.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const next: CanvasNodeData = {
            ...source,
            id,
            title: `${source.title} Copy`,
            position: { x: source.position.x + 36, y: source.position.y + 36 },
            metadata: source.metadata ? { ...source.metadata } : undefined,
        };
        // 右键「复制」走这里：把入边参考资产连到新节点（不克隆资产），否则提示词 chip 无法回显
        const inbound = getInboundResourceConnections(nodeId, nodesRef.current, connectionsRef.current).map((connection, index) => ({
            ...connection,
            id: `conn-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
            toNodeId: id,
        }));

        setNodes((prev) => [...prev, next]);
        if (inbound.length) setConnections((prev) => [...prev, ...inbound]);
        setSelectedNodeIds(new Set([id]));
        setSelectedConnectionId(null);
        if (next.type !== CanvasNodeType.Group) setDialogNodeId(id);
    }, []);

    const copySelectedNodes = useCallback(() => {
        const selectedIds = selectedNodeIdsRef.current;
        if (!selectedIds.size) return;

        const copiedNodes = nodesRef.current
            .filter((node) => selectedIds.has(node.id))
            .map((node) => ({
                ...node,
                position: { ...node.position },
                metadata: node.metadata ? { ...node.metadata } : undefined,
            }));

        if (!copiedNodes.length) return;

        // 只拷选中节点；入边资源连线保留原 fromId，粘贴时连回画布上原资产
        clipboardRef.current = {
            nodes: copiedNodes,
            connections: collectCopyConnections(selectedIds, nodesRef.current, connectionsRef.current).map((connection) => ({ ...connection })),
        };
    }, []);

    const pasteCopiedNodes = useCallback(() => {
        const clipboard = clipboardRef.current;
        if (!clipboard?.nodes.length) return false;

        const center = getCanvasCenter();
        const bounds = clipboard.nodes.reduce(
            (acc, node) => ({
                left: Math.min(acc.left, node.position.x),
                top: Math.min(acc.top, node.position.y),
                right: Math.max(acc.right, node.position.x + node.width),
                bottom: Math.max(acc.bottom, node.position.y + node.height),
            }),
            { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
        );
        const dx = center.x - (bounds.left + bounds.right) / 2;
        const dy = center.y - (bounds.top + bounds.bottom) / 2;
        const idMap = new Map<string, string>();
        const nextNodes = clipboard.nodes.map((node, index) => {
            const id = `${node.type}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
            idMap.set(node.id, id);
            return {
                ...node,
                id,
                title: node.title.endsWith(" Copy") ? node.title : `${node.title} Copy`,
                position: {
                    x: node.position.x + dx,
                    y: node.position.y + dy,
                },
                metadata: node.metadata ? { ...node.metadata } : undefined,
            };
        });

        const pastedNodes = nextNodes.map((node) => {
            const groupId = node.metadata?.groupId;
            if (!groupId) return node;
            return { ...node, metadata: { ...node.metadata, groupId: idMap.get(groupId) } };
        });

        const existingIds = new Set(nodesRef.current.map((node) => node.id));
        const nextConnections = clipboard.connections.flatMap((connection, index) => {
            const toNodeId = idMap.get(connection.toNodeId);
            if (!toNodeId) return [];
            const fromNodeId = idMap.get(connection.fromNodeId) || (existingIds.has(connection.fromNodeId) ? connection.fromNodeId : null);
            if (!fromNodeId) return [];
            return [
                {
                    ...connection,
                    id: `conn-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
                    fromNodeId,
                    toNodeId,
                },
            ];
        });

        setNodes((prev) => [...prev, ...pastedNodes]);
        setConnections((prev) => [...prev, ...nextConnections]);
        setSelectedNodeIds(new Set(pastedNodes.map((node) => node.id)));
        setSelectedConnectionId(null);
        setContextMenu(null);
        setDialogNodeId(pastedNodes[0]?.type === CanvasNodeType.Group ? null : pastedNodes[0]?.id || null);
        return true;
    }, [getCanvasCenter]);

    const resetViewport = useCallback(() => {
        setViewport({ x: size.width / 2, y: size.height / 2, k: 1 });
        setContextMenu(null);
    }, [size.height, size.width]);

    const focusNode = useCallback(
        (nodeId: string) => {
            const node = nodesRef.current.find((item) => item.id === nodeId);
            if (!node) return;
            const worldX = node.position.x + node.width / 2;
            const worldY = node.position.y + node.height / 2;
            const k = Math.min(Math.max(Math.min((size.width * 0.6) / node.width, (size.height * 0.6) / node.height), 0.05), 1.5);
            const target = { x: size.width / 2 - worldX * k, y: size.height / 2 - worldY * k, k };
            setSelectedNodeIds(new Set([nodeId]));
            setSelectedConnectionId(null);
            setContextMenu(null);

            if (focusAnimRef.current) cancelAnimationFrame(focusAnimRef.current);
            const start = { ...viewportRef.current };
            const duration = 450;
            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
            let startTime: number | null = null;
            const step = (now: number) => {
                if (startTime === null) startTime = now;
                const progress = Math.min((now - startTime) / duration, 1);
                const t = easeOutCubic(progress);
                setViewport({ x: start.x + (target.x - start.x) * t, y: start.y + (target.y - start.y) * t, k: start.k + (target.k - start.k) * t });
                focusAnimRef.current = progress < 1 ? requestAnimationFrame(step) : null;
            };
            focusAnimRef.current = requestAnimationFrame(step);
        },
        [size.height, size.width],
    );

    useEffect(() => () => void (focusAnimRef.current && cancelAnimationFrame(focusAnimRef.current)), []);

    const setZoomScale = useCallback(
        (scale: number) => {
            const nextScale = Math.min(Math.max(scale, 0.05), 5);
            setViewport((prev) => ({
                x: size.width / 2 - ((size.width / 2 - prev.x) / prev.k) * nextScale,
                y: size.height / 2 - ((size.height / 2 - prev.y) / prev.k) * nextScale,
                k: nextScale,
            }));
            setContextMenu(null);
        },
        [size.height, size.width],
    );

    useEffect(() => {
        const handleZoomShortcut = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
            const zoomOut = event.key === "-" || event.key === "_" || event.code === "Minus" || event.code === "NumpadSubtract";
            const zoomIn = event.key === "=" || event.key === "+" || event.code === "Equal" || event.code === "NumpadAdd";
            if (!zoomOut && !zoomIn) return;
            event.preventDefault();
            if (event.target instanceof Element && event.target.closest(CANVAS_SHORTCUT_IGNORE)) return;
            const current = viewportRef.current.k;
            setZoomScale(current * (zoomIn ? 1.1 : 1 / 1.1));
        };
        window.addEventListener("keydown", handleZoomShortcut, true);
        return () => window.removeEventListener("keydown", handleZoomShortcut, true);
    }, [setZoomScale]);

    const applyHistory = useCallback((entry: CanvasHistoryEntry) => {
        if (historyCommitTimerRef.current) {
            clearTimeout(historyCommitTimerRef.current);
            historyCommitTimerRef.current = null;
        }
        applyingHistoryRef.current = true;
        setNodes(entry.nodes);
        setConnections(entry.connections);
        setChatSessions(entry.chatSessions);
        setActiveChatId(entry.activeChatId);
        setBackgroundMode(entry.backgroundMode);
        setShowImageInfo(entry.showImageInfo);
        setSelectedNodeIds(new Set());
        setSelectedConnectionId(null);
        setContextMenu(null);
        setTimeout(() => {
            lastHistoryRef.current = entry;
            applyingHistoryRef.current = false;
            setHistoryState({ canUndo: historyRef.current.past.length > 0, canRedo: historyRef.current.future.length > 0 });
        });
    }, []);

    const undoCanvas = useCallback(() => {
        const previous = historyRef.current.past.pop();
        const current = lastHistoryRef.current;
        if (!previous || !current) return;
        historyRef.current.future.push(current);
        applyHistory(previous);
    }, [applyHistory]);

    const redoCanvas = useCallback(() => {
        const next = historyRef.current.future.pop();
        const current = lastHistoryRef.current;
        if (!next || !current) return;
        historyRef.current.past.push(current);
        applyHistory(next);
    }, [applyHistory]);

    const createAndOpenProject = useCallback(() => {
        const id = createProject(`${APP_NAME} ${useCanvasStore.getState().projects.length + 1}`);
        navigate(`/canvas/${id}`);
    }, [createProject, navigate]);

    const deleteCurrentProject = useCallback(() => {
        if (cloudSaving) return;
        void import("@canvas/lib/canvas/canvas-cloud-save")
            .then(({ deleteCloudProjects }) => deleteCloudProjects([projectId]))
            .then(({ failed }) => {
                if (failed.length) throw new Error("删除失败");
                bypassNextLeave();
                deleteProjects([projectId]);
                cleanupAssetImages();
                navigate("/canvas");
            })
            .catch(() => message.error("删除画布失败，请重试。"));
    }, [bypassNextLeave, cleanupAssetImages, cloudSaving, deleteProjects, message, navigate, projectId]);

    const exportCurrentProject = useCallback(async () => {
        const project = useCanvasStore.getState().projects.find((item) => item.id === projectId);
        if (!project) return message.error("未找到当前画布");
        const hide = message.loading("正在导出当前画布…", 0);
        try {
            const { exportCanvasProjects } = await import("@canvas/lib/canvas/canvas-export");
            await exportCanvasProjects([project], project.title || APP_NAME);
            message.success("已导出当前画布");
        } catch (error) {
            console.error(error);
            message.error("导出失败，请重试");
        } finally {
            hide();
        }
    }, [message, projectId]);

    const handleCanvasMouseDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            setContextMenu(null);
            setNodeCreatePosition(null);
            if (pendingConnectionCreateRef.current) cancelPendingConnectionCreate();
            if (event.button !== 0 || canvasSpacePressedRef.current) return;

            // 左键空白处：单击取消选中；拖动框选（Shift 追加）
            const world = screenToCanvas(event.clientX, event.clientY);
            const nextSelectionBox = {
                startWorldX: world.x,
                startWorldY: world.y,
                currentWorldX: world.x,
                currentWorldY: world.y,
                additive: event.shiftKey,
                initialSelectedNodeIds: event.shiftKey ? Array.from(selectedNodeIdsRef.current) : [],
            };
            selectionBoxRef.current = nextSelectionBox;
            setSelectionBox(nextSelectionBox);
            if (!event.shiftKey) {
                setSelectedNodeIds(new Set());
                setToolbarNodeId(null);
                setDialogNodeId(null);
                setEditingNodeId(null);
                setHoveredNodeId(null);
            }

            setSelectedConnectionId(null);
        },
        [cancelPendingConnectionCreate, screenToCanvas],
    );

    // 仅处理「选中」的纯逻辑,供 body 冒泡拖拽入口与外层 capture 入口共用。
    // 返回本次点击后的单选目标 id(多选/取消时为 null),用于同步工具条。
    const selectNodeByEvent = useCallback((event: Pick<ReactMouseEvent, "shiftKey" | "metaKey" | "ctrlKey">, nodeId: string) => {
        const nextSelected = new Set(selectedNodeIdsRef.current);
        if (event.shiftKey || event.metaKey || event.ctrlKey) {
            if (nextSelected.has(nodeId)) nextSelected.delete(nodeId);
            else nextSelected.add(nodeId);
        } else if (!nextSelected.has(nodeId)) {
            nextSelected.clear();
            nextSelected.add(nodeId);
        }
        setSelectedNodeIds(nextSelected);
        const soloId = nextSelected.size === 1 && nextSelected.has(nodeId) ? nodeId : null;
        setToolbarNodeId(soloId);
        return { nextSelected, soloId };
    }, []);

    // capture 阶段选中:点击节点内部任意元素(含吞掉 mousedown 的 textarea/iframe)都能选中并弹出工具条。
    // 只做选中,不启动拖拽 —— 拖拽仍由 body 的 onMouseDown(冒泡)负责,故编辑器内选词不会拖动节点。
    // capture 必先于同一次事件的 body 冒泡触发,故把算好的选中集暂存,供紧随其后的拖拽入口复用,避免二次选中(shift 反选被抵消)。
    const pendingSelectionRef = useRef<Set<string> | null>(null);
    const handleNodeSelectCapture = useCallback(
        (event: ReactMouseEvent, nodeId: string) => {
            if (interactionMode === "move" || event.button !== 0 || canvasSpacePressedRef.current) return;
            setContextMenu(null);
            setHoveredNodeId(null);
            setSelectedConnectionId(null);
            const { nextSelected } = selectNodeByEvent(event, nodeId);
            pendingSelectionRef.current = nextSelected;
        },
        [interactionMode, selectNodeByEvent],
    );

    const handleNodeMouseDown = useCallback((event: ReactMouseEvent, nodeId: string) => {
        event.stopPropagation();
        if (interactionMode === "move" || event.button !== 0 || canvasSpacePressedRef.current) return;
        // 选中已由 capture 阶段完成;这里只负责建立拖拽。若因故没走 capture,则兜底再选一次。
        const currentNodes = nodesRef.current;
        const nextSelected = pendingSelectionRef.current ?? selectNodeByEvent(event, nodeId).nextSelected;
        pendingSelectionRef.current = null;
        const dragIds = new Set(nextSelected);
        const selectedGroupIds = new Set<string>();
        currentNodes.forEach((node) => {
            if (!nextSelected.has(node.id)) return;
            node.metadata?.batchChildIds?.forEach((childId) => dragIds.add(childId));
            if (node.type === CanvasNodeType.Group) selectedGroupIds.add(node.id);
        });
        const initialPositions = new Map<string, Position>();
        for (const node of currentNodes) {
            const groupId = node.metadata?.groupId;
            if (dragIds.has(node.id) || (groupId && selectedGroupIds.has(groupId))) {
                initialPositions.set(node.id, { x: node.position.x, y: node.position.y });
            }
        }
        if (!initialPositions.size) return;
        dragRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            initialPositions,
            offset: { x: 0, y: 0 },
            frame: null,
            hasMoved: false,
            hasPreview: false,
        };
        historyPausedRef.current = true;
        setIsNodeDragging(true);
    }, [interactionMode, selectNodeByEvent]);

    const finishNodeDrag = useCallback((clientX?: number, clientY?: number) => {
        const drag = dragRef.current;
        if (!drag) return;
        dragRef.current = null;
        if (drag.frame !== null) cancelAnimationFrame(drag.frame);

        const { initialPositions } = drag;

        historyPausedRef.current = false;
        setIsNodeDragging(false);
        setDropTargetGroupId(null);
        if (drag.hasMoved && clientX != null && clientY != null) {
            const scale = viewportRef.current.k;
            const offset = { x: (clientX - drag.startX) / scale, y: (clientY - drag.startY) / scale };
            setNodes((prev) => {
                const moved = offsetDraggedNodes(prev, initialPositions, offset);
                const targetGroup = findGroupDropTarget(initialPositions, moved);
                if (targetGroup) return snapNodesIntoGroup(initialPositions, moved, targetGroup);
                const groups = moved.filter((node) => node.type === CanvasNodeType.Group);
                return moved.map((node) => {
                    if (!initialPositions.has(node.id) || node.type === CanvasNodeType.Group) return node;
                    const groupId = findContainingGroupId(node, groups);
                    if (node.metadata?.groupId === groupId) return node;
                    return { ...node, metadata: { ...node.metadata, groupId } };
                });
            });
        } else if (drag.hasPreview) {
            // 失焦时保留最后已预览的位置，并在解除历史暂停后同步到存储。
            setNodes((prev) => prev.slice());
        }

        if (!drag.hasMoved && initialPositions.size === 1) {
            const clickedNodeId = initialPositions.keys().next().value;
            const clickedNode = nodesRef.current.find((node) => node.id === clickedNodeId);
            const clickedDefinition = clickedNode ? getNodeDefinition(clickedNode.type) : undefined;
            if (clickedNode?.type === CanvasNodeType.Text) {
                setDialogNodeId((current) => (current === clickedNodeId ? current : null));
            } else if (clickedDefinition?.hidePanel) {
                // 纯展示型插件节点:单击只选中,不弹下方面板
                setDialogNodeId((current) => (current === clickedNodeId ? current : null));
            } else if (clickedNodeId && clickedNode?.type !== CanvasNodeType.Group) {
                setDialogNodeId(clickedNodeId);
            }
        }
    }, []);

    const getConnectionDropTargetRef = useRef(getConnectionDropTarget);
    getConnectionDropTargetRef.current = getConnectionDropTarget;
    const screenToCanvasRef = useRef(screenToCanvas);
    screenToCanvasRef.current = screenToCanvas;
    const mouseWorldRef = useRef(mouseWorld);
    mouseWorldRef.current = mouseWorld;

    const handleGlobalMouseMove = useCallback((event: MouseEvent) => {
        const drag = dragRef.current;
        if (drag) {
            const dx = event.clientX - drag.startX;
            const dy = event.clientY - drag.startY;
            if (!drag.hasMoved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return;
            drag.hasMoved = true;
            const scale = viewportRef.current.k;
            drag.offset = { x: dx / scale, y: dy / scale };
            if (drag.frame !== null) return;
            drag.frame = requestAnimationFrame(() => {
                drag.frame = null;
                if (dragRef.current !== drag) return;
                const { initialPositions, offset } = drag;
                const current = nodesRef.current;
                const preview = offsetDraggedNodes(current, initialPositions, offset);
                setDropTargetGroupId(findGroupDropTarget(initialPositions, preview)?.id ?? null);
                // 保留排队中的生成结果等节点变更，仅在状态已变化时重算位移。
                setNodes((prev) => prev === current ? preview : offsetDraggedNodes(prev, initialPositions, offset));
                drag.hasPreview = true;
            });
            return;
        }

        if (connectingParamsRef.current && !pendingConnectionCreateRef.current) {
            const dropTarget = getConnectionDropTargetRef.current(event.clientX, event.clientY, connectingParamsRef.current);
            if (connectionTargetNodeIdRef.current !== dropTarget.nodeId) {
                connectionTargetNodeIdRef.current = dropTarget.nodeId;
                setConnectionTargetNodeId(dropTarget.nodeId);
            }
            const nextWorld = screenToCanvasRef.current(event.clientX, event.clientY);
            const prevWorld = mouseWorldRef.current;
            if (prevWorld.x !== nextWorld.x || prevWorld.y !== nextWorld.y) {
                mouseWorldRef.current = nextWorld;
                setMouseWorld(nextWorld);
            }
        }
    }, []);

    const handleGlobalPointerMove = useCallback((event: PointerEvent) => {
        const currentSelection = selectionBoxRef.current;
        if (!currentSelection) return;

        if (event.buttons === 0) {
            selectionBoxRef.current = null;
            setSelectionBox(null);
            return;
        }

        const world = screenToCanvasRef.current(event.clientX, event.clientY);
        const rectX = Math.min(currentSelection.startWorldX, world.x);
        const rectY = Math.min(currentSelection.startWorldY, world.y);
        const rectW = Math.abs(world.x - currentSelection.startWorldX);
        const rectH = Math.abs(world.y - currentSelection.startWorldY);
        const nextSelected = new Set<string>(currentSelection.additive ? currentSelection.initialSelectedNodeIds : []);

        nodesRef.current
            .filter((node) => !isHiddenBatchChild(node, nodesRef.current))
            .forEach((node) => {
                const intersects = rectX < node.position.x + node.width && rectX + rectW > node.position.x && rectY < node.position.y + node.height && rectY + rectH > node.position.y;

                if (intersects) nextSelected.add(node.id);
            });

        const nextSelectionBox = { ...currentSelection, currentWorldX: world.x, currentWorldY: world.y };
        selectionBoxRef.current = nextSelectionBox;
        setSelectionBox(nextSelectionBox);
        setSelectedNodeIds(nextSelected);
    }, []);

    const finishConnectionGesture = useCallback(
        (clientX: number, clientY: number) => {
            if (connectionGestureDoneRef.current) return;
            if (pendingConnectionCreateRef.current) return;
            const currentConnection = connectingParamsRef.current;
            if (!currentConnection) return;
            connectionGestureDoneRef.current = true;

            const dropTarget = getConnectionDropTarget(clientX, clientY, currentConnection);
            if (dropTarget.nodeId) {
                connectNodes(currentConnection, dropTarget.nodeId);
                setConnecting(null);
                return;
            }
            if (dropTarget.isNearNode) {
                setConnecting(null);
                return;
            }
            const position = screenToCanvas(clientX, clientY);
            mouseWorldRef.current = position;
            setMouseWorld(position);
            pendingConnectionCreateRef.current = { connection: currentConnection, position };
            setPendingConnectionCreate({ connection: currentConnection, position });
        },
        [connectNodes, getConnectionDropTarget, screenToCanvas, setConnecting],
    );

    const finishNodeDragRef = useRef(finishNodeDrag);
    finishNodeDragRef.current = finishNodeDrag;
    const finishConnectionGestureRef = useRef(finishConnectionGesture);
    finishConnectionGestureRef.current = finishConnectionGesture;

    const handleGlobalMouseUp = useCallback((event: MouseEvent) => {
        finishNodeDragRef.current(event.clientX, event.clientY);

        selectionBoxRef.current = null;
        setSelectionBox(null);

        finishConnectionGestureRef.current(event.clientX, event.clientY);
    }, []);

    useEffect(() => {
        const handlePointerUp = (event: PointerEvent) => {
            finishNodeDragRef.current(event.clientX, event.clientY);
            finishConnectionGestureRef.current(event.clientX, event.clientY);
        };
        const resetGesturesOnLoseFocus = () => {
            finishNodeDragRef.current();
            selectionBoxRef.current = null;
            setSelectionBox(null);
            if (connectingParamsRef.current) {
                setConnecting(null);
                connectionTargetNodeIdRef.current = null;
                setConnectionTargetNodeId(null);
            }
            if (pendingConnectionCreateRef.current) {
                pendingConnectionCreateRef.current = null;
                setPendingConnectionCreate(null);
            }
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") resetGesturesOnLoseFocus();
        };
        window.addEventListener("mousemove", handleGlobalMouseMove);
        window.addEventListener("mouseup", handleGlobalMouseUp);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", resetGesturesOnLoseFocus);
        window.addEventListener("blur", resetGesturesOnLoseFocus);
        window.addEventListener("pagehide", resetGesturesOnLoseFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pointermove", handleGlobalPointerMove);
        return () => {
            const drag = dragRef.current;
            if (drag?.frame != null) {
                cancelAnimationFrame(drag.frame);
                drag.frame = null;
            }
            window.removeEventListener("mousemove", handleGlobalMouseMove);
            window.removeEventListener("mouseup", handleGlobalMouseUp);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", resetGesturesOnLoseFocus);
            window.removeEventListener("blur", resetGesturesOnLoseFocus);
            window.removeEventListener("pagehide", resetGesturesOnLoseFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("pointermove", handleGlobalPointerMove);
        };
    }, [handleGlobalMouseMove, handleGlobalMouseUp, handleGlobalPointerMove, setConnecting]);

    /** 本地缓存后立刻直传 OSS，避免云端保存时仍是 blob */
    const promoteLocalMediaToOss = useCallback(async (storageKey: string | undefined, fileName: string) => {
        if (!storageKey) return null;
        const blob = storageKey.startsWith("image:") ? await getImageBlob(storageKey) : await getMediaBlob(storageKey);
        if (!blob) return null;
        return uploadBlobToOss(blob, fileName || storageKey);
    }, []);

    const attachImportCompliance = useCallback(async (nodeId: string, ossUrl: string, title?: string, existing?: ImportComplianceMeta | null) => {
        const meta = existing?.complianceAssetId ? existing : await submitImportImageComplianceSafe(ossUrl, title);
        if (!meta) return;
        setNodes((prev) =>
            prev.map((node) =>
                node.id === nodeId
                    ? {
                          ...node,
                          metadata: {
                              ...node.metadata,
                              ...meta,
                              platformTaskId: undefined,
                              platformTaskKind: undefined,
                          },
                      }
                    : node,
            ),
        );
    }, []);

    const createImageFileNode = useCallback(async (file: File, position: DropPositionInput) => {
        const local = await uploadImage(file);
        let image = local;
        try {
            const ossUrl = await promoteLocalMediaToOss(local.storageKey, file.name || "image.png");
            if (ossUrl) image = { ...local, url: ossUrl, storageKey: "" };
        } catch (error) {
            message.warning(error instanceof Error ? error.message : "图片上传云端失败，保存画布时将重试");
        }
        const size = fitNodeSize(image.width, image.height);
        const center = resolveDropCenter(position, size);
        const id = `image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newNode: CanvasNodeData = {
            id,
            type: CanvasNodeType.Image,
            title: file.name,
            position: { x: center.x - size.width / 2, y: center.y - size.height / 2 },
            width: size.width,
            height: size.height,
            metadata: imageMetadata(image),
        };

        setNodes((prev) => [...prev, newNode]);
        setSelectedNodeIds(new Set([id]));
        setSelectedConnectionId(null);
        setDialogNodeId(id);
        if (isRemoteHttpUrl(image.url)) void attachImportCompliance(id, image.url, file.name);
        return size;
    }, [attachImportCompliance, message, promoteLocalMediaToOss]);

    const createVideoFileNode = useCallback(async (file: File, position: DropPositionInput) => {
        const local = await uploadMediaFile(file, "video");
        let video = local;
        try {
            const ossUrl = await promoteLocalMediaToOss(local.storageKey, file.name || "video.mp4");
            if (ossUrl) video = { ...local, url: ossUrl, storageKey: "" };
        } catch (error) {
            message.warning(error instanceof Error ? error.message : "视频上传云端失败，保存画布时将重试");
        }
        const size = fitNodeSize(video.width || 1280, video.height || 720, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
        const center = resolveDropCenter(position, size);
        const id = `video-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setNodes((prev) => [
            ...prev,
            {
                id,
                type: CanvasNodeType.Video,
                title: file.name,
                position: { x: center.x - size.width / 2, y: center.y - size.height / 2 },
                width: size.width,
                height: size.height,
                metadata: videoMetadata(video),
            },
        ]);
        setSelectedNodeIds(new Set([id]));
        setSelectedConnectionId(null);
        setDialogNodeId(id);
        return size;
    }, [message, promoteLocalMediaToOss]);

    const createAudioFileNode = useCallback(async (file: File, position: DropPositionInput) => {
        const local = await uploadMediaFile(file, "audio");
        let audio = local;
        try {
            const ossUrl = await promoteLocalMediaToOss(local.storageKey, file.name || "audio.mp3");
            if (ossUrl) audio = { ...local, url: ossUrl, storageKey: "" };
        } catch (error) {
            message.warning(error instanceof Error ? error.message : "音频上传云端失败，保存画布时将重试");
        }
        const size = NODE_DEFAULT_SIZE[CanvasNodeType.Audio];
        const center = resolveDropCenter(position, size);
        const id = `audio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setNodes((prev) => [
            ...prev,
            {
                id,
                type: CanvasNodeType.Audio,
                title: file.name,
                position: { x: center.x - size.width / 2, y: center.y - size.height / 2 },
                width: size.width,
                height: size.height,
                metadata: audioMetadata(audio),
            },
        ]);
        setSelectedNodeIds(new Set([id]));
        setSelectedConnectionId(null);
        return size;
    }, [message, promoteLocalMediaToOss]);

    const createMediaFileNode = useCallback(
        async (file: File, position: DropPositionInput) => {
            if (isAudioFile(file)) return createAudioFileNode(file, position);
            if (file.type.startsWith("video/")) return createVideoFileNode(file, position);
            return createImageFileNode(file, position);
        },
        [createAudioFileNode, createImageFileNode, createVideoFileNode],
    );

    const createTextNodeFromClipboard = useCallback(
        (text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return false;

            const node = {
                ...createCanvasNode(CanvasNodeType.Text, getCanvasCenter(), { content: trimmed, status: NODE_STATUS_SUCCESS }),
                title: trimmed.slice(0, 32) || "剪切板文本",
            };

            setNodes((prev) => [...prev, node]);
            setSelectedNodeIds(new Set([node.id]));
            setSelectedConnectionId(null);
            setContextMenu(null);
            setDialogNodeId(node.id);
            return true;
        },
        [getCanvasCenter],
    );

    const pasteSystemClipboard = useCallback(async () => {
        if (!navigator.clipboard) return;

        const items = await navigator.clipboard.read();
        const imageItem = items.find((item) => item.types.some((type) => type.startsWith("image/")));
        if (imageItem) {
            const imageType = imageItem.types.find((type) => type.startsWith("image/"));
            if (!imageType) return;
            const blob = await imageItem.getType(imageType);
            const file = new File([blob], "clipboard-image.png", { type: imageType });
            void createImageFileNode(file, getCanvasCenter());
            message.success("已从剪切板添加图片");
            return;
        }

        const text = await navigator.clipboard.readText();
        if (createTextNodeFromClipboard(text)) message.success("已从剪切板添加文本");
    }, [createImageFileNode, createTextNodeFromClipboard, getCanvasCenter, message]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.target instanceof Element && event.target.closest(CANVAS_SHORTCUT_IGNORE)) return;

            const key = event.key.toLowerCase();
            const isModifierShortcut = event.metaKey || event.ctrlKey;

            if (isModifierShortcut && key === "c" && window.getSelection()?.toString()) return;

            if (isModifierShortcut && !event.altKey && key === "z") {
                event.preventDefault();
                if (event.shiftKey) redoCanvas();
                else undoCanvas();
                return;
            }

            if (isModifierShortcut && !event.altKey && key === "y") {
                event.preventDefault();
                redoCanvas();
                return;
            }

            if (isModifierShortcut && !event.altKey && key === "a") {
                event.preventDefault();
                setSelectedNodeIds(new Set(nodesRef.current.map((node) => node.id)));
                setSelectedConnectionId(null);
                setContextMenu(null);
                setSelectionBox(null);
                return;
            }

            if (isModifierShortcut && !event.altKey && key === "c") {
                event.preventDefault();
                copySelectedNodes();
                return;
            }

            if (isModifierShortcut && !event.altKey && key === "v") {
                event.preventDefault();
                if (!pasteCopiedNodes()) void pasteSystemClipboard();
                return;
            }

            if (event.key === "Delete" || event.key === "Backspace") {
                if (selectedNodeIdsRef.current.size) {
                    deleteNodes(new Set(selectedNodeIdsRef.current));
                } else if (selectedConnectionId) {
                    deleteConnection(selectedConnectionId);
                }
            }

            if (event.key === "Escape") {
                setSelectedNodeIds(new Set());
                setSelectedConnectionId(null);
                setContextMenu(null);
                setNodeCreatePosition(null);
                setSelectionBox(null);
                setConnecting(null);
                setHoveredNodeId(null);
                setToolbarNodeId(null);
                setDialogNodeId(null);
                setEditingNodeId(null);
                setInfoNodeId(null);
                setCropNodeId(null);
                setMaskEditNodeId(null);
                setPendingConnectionCreate(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [copySelectedNodes, deleteConnection, deleteNodes, pasteCopiedNodes, pasteSystemClipboard, redoCanvas, selectedConnectionId, setConnecting, undoCanvas]);

    const handleConnectStart = useCallback(
        (event: ReactMouseEvent, nodeId: string, handleType: "source" | "target") => {
            event.stopPropagation();
            const world = screenToCanvas(event.clientX, event.clientY);
            mouseWorldRef.current = world;
            setMouseWorld(world);
            setConnecting({ nodeId, handleType });
            connectionTargetNodeIdRef.current = null;
            setConnectionTargetNodeId(null);
            setSelectedConnectionId(null);
        },
        [screenToCanvas, setConnecting],
    );

    const handleNodeResizeStart = useCallback(() => {
        historyPausedRef.current = true;
    }, []);

    const handleNodeResize = useCallback((nodeId: string, width: number, height: number, position?: Position) => {
        setNodes((prev) => {
            let changed = false;
            const next = prev.map((node) => {
                if (node.id !== nodeId) return node;
                const nextX = position?.x ?? node.position.x;
                const nextY = position?.y ?? node.position.y;
                if (
                    Math.abs(node.width - width) < 0.01 &&
                    Math.abs(node.height - height) < 0.01 &&
                    Math.abs(node.position.x - nextX) < 0.01 &&
                    Math.abs(node.position.y - nextY) < 0.01
                ) {
                    return node;
                }
                changed = true;
                return { ...node, width, height, position: { x: nextX, y: nextY } };
            });
            return changed ? next : prev;
        });
    }, []);

    const handleNodeResizeEnd = useCallback(() => {
        historyPausedRef.current = false;
        // 缩放过程中已跳过 persist；结束时换新数组引用，让历史/云端 effect 再跑一次
        setNodes((prev) => prev.slice());
    }, []);

    const toggleNodeFreeResize = useCallback((nodeId: string) => {
        setNodes((prev) =>
            prev.map((node) => {
                if (node.id !== nodeId) return node;
                const freeResize = !node.metadata?.freeResize;
                if (freeResize || node.type !== CanvasNodeType.Image) return { ...node, metadata: { ...node.metadata, freeResize } };
                const ratio = (node.metadata?.naturalWidth || node.width) / (node.metadata?.naturalHeight || node.height || 1);
                const height = node.width / ratio;
                return { ...node, height, position: { x: node.position.x, y: node.position.y + node.height / 2 - height / 2 }, metadata: { ...node.metadata, freeResize } };
            }),
        );
    }, []);

    const handleNodeContentChange = useCallback((nodeId: string, content: string) => {
        setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, content } } : node)));
    }, []);

    const handleNodeTitleChange = useCallback((nodeId: string, title: string) => {
        setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, title } : node)));
    }, []);

    const toggleBatchExpanded = useCallback((nodeId: string) => {
        const isExpanded = Boolean(nodesRef.current.find((node) => node.id === nodeId)?.metadata?.imageBatchExpanded);
        if (isExpanded) {
            setCollapsingBatchIds((prev) => new Set(prev).add(nodeId));
            window.setTimeout(() => {
                setCollapsingBatchIds((prev) => {
                    const next = new Set(prev);
                    next.delete(nodeId);
                    return next;
                });
            }, 320);
        } else {
            setOpeningBatchIds((prev) => new Set(prev).add(nodeId));
            window.setTimeout(() => {
                setOpeningBatchIds((prev) => {
                    const next = new Set(prev);
                    next.delete(nodeId);
                    return next;
                });
            }, 260);
        }
        setNodes((prev) =>
            prev.map((node) => {
                if (node.id !== nodeId) return node;
                return { ...node, metadata: { ...node.metadata, imageBatchExpanded: !node.metadata?.imageBatchExpanded } };
            }),
        );
    }, []);

    const setBatchPrimary = useCallback((child: CanvasNodeData) => {
        const rootId = child.metadata?.batchRootId;
        if (!rootId || !child.metadata?.content) return;
        setNodes((prev) =>
            prev.map((node) =>
                node.id === rootId
                    ? {
                          ...node,
                          width: child.width,
                          height: child.height,
                          metadata: {
                              ...node.metadata,
                              content: child.metadata?.content,
                              primaryImageId: child.id,
                              naturalWidth: child.metadata?.naturalWidth,
                              naturalHeight: child.metadata?.naturalHeight,
                              freeResize: child.metadata?.freeResize,
                          },
                      }
                    : node,
            ),
        );
    }, []);

    const openTextEditor = useCallback((node: CanvasNodeData) => {
        if (node.type !== CanvasNodeType.Text) return;
        setSelectedNodeIds(new Set([node.id]));
        setSelectedConnectionId(null);
        setDialogNodeId(node.id);
        setEditingNodeId(node.id);
        setEditRequestNonce((value) => value + 1);
    }, []);

    const handleNodePromptChange = useCallback((nodeId: string, prompt: string) => {
        setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, prompt } } : node)));
    }, []);

    const handleDisconnectReference = useCallback((toNodeId: string, fromNodeId: string) => {
        const nextPrompt = nextPromptAfterDisconnectResource(toNodeId, fromNodeId, nodesRef.current, connectionsRef.current);
        if (nextPrompt != null) {
            setNodes((prev) => prev.map((node) => (node.id === toNodeId ? { ...node, metadata: { ...node.metadata, prompt: nextPrompt } } : node)));
        }
        setConnections((prev) => {
            const removed = prev.find((connection) => connection.toNodeId === toNodeId && connection.fromNodeId === fromNodeId);
            if (removed) {
                setSelectedConnectionId((current) => (current === removed.id ? null : current));
            }
            return prev.filter((connection) => !(connection.toNodeId === toNodeId && connection.fromNodeId === fromNodeId));
        });
    }, []);

    const handleVideoPoster = useCallback(
        (nodeId: string, posterUrl: string, sourceUrl?: string) => {
            if (!posterUrl) return;
            let wrote = false;
            const wasPaused = historyPausedRef.current;
            historyPausedRef.current = true;
            setNodes((prev) => {
                const node = prev.find((item) => item.id === nodeId);
                if (!node || node.type !== CanvasNodeType.Video || node.metadata?.posterUrl) return prev;
                if (sourceUrl && node.metadata?.content !== sourceUrl) return prev;
                wrote = true;
                return prev.map((item) => (item.id === nodeId ? { ...item, metadata: { ...item.metadata, posterUrl } } : item));
            });
            if (!wrote) {
                historyPausedRef.current = wasPaused;
                return;
            }
            window.setTimeout(() => {
                if (!wasPaused) historyPausedRef.current = false;
                updateProject(projectId, { nodes: nodesRef.current });
                setCloudContentRevision((n) => n + 1);
            }, 0);
        },
        [projectId, updateProject],
    );

    const handleVideoMetrics = useCallback((nodeId: string, metrics: { width: number; height: number; durationMs?: number }) => {
        if (metrics.width < 16 || metrics.height < 16) return;
        let wrote = false;
        const wasPaused = historyPausedRef.current;
        historyPausedRef.current = true;
        setNodes((prev) => {
            const node = prev.find((item) => item.id === nodeId);
            if (!node || node.type !== CanvasNodeType.Video || node.metadata?.freeResize) return prev;
            if (Math.min(node.width, node.height) >= VIDEO_NODE_MIN_EDGE) return prev;
            const nextSize = fitNodeSize(metrics.width, metrics.height, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
            wrote = true;
            return prev.map((item) =>
                item.id === nodeId
                    ? {
                          ...item,
                          width: nextSize.width,
                          height: nextSize.height,
                          position: {
                              x: item.position.x + item.width / 2 - nextSize.width / 2,
                              y: item.position.y + item.height / 2 - nextSize.height / 2,
                          },
                          metadata: {
                              ...item.metadata,
                              naturalWidth: metrics.width,
                              naturalHeight: metrics.height,
                              durationMs: metrics.durationMs ?? item.metadata?.durationMs,
                          },
                      }
                    : item,
            );
        });
        if (!wrote) {
            historyPausedRef.current = wasPaused;
            return;
        }
        window.setTimeout(() => {
            if (!wasPaused) historyPausedRef.current = false;
            updateProject(projectId, { nodes: nodesRef.current });
            setCloudContentRevision((n) => n + 1);
        }, 0);
    }, [projectId, updateProject]);

    const handleConfigNodeChange = useCallback((nodeId: string, patch: Partial<CanvasNodeData["metadata"]>) => {
        if (!patch) return;
        setNodes((prev) => prev.map((node) => (node.id === nodeId ? applyNodeConfigPatch(node, patch) : node)));
        // 画布内改视频参数时同步回全局偏好，与「偏好设置」一致并入库
        const node = nodesRef.current.find((item) => item.id === nodeId);
        if (!node || (node.type !== CanvasNodeType.Video && node.metadata?.generationMode !== "video")) return;
        if (typeof patch.size === "string") useConfigStore.getState().updateConfig("videoSize", patch.size);
        if (typeof patch.vquality === "string") useConfigStore.getState().updateConfig("vquality", patch.vquality);
        if (typeof patch.seconds === "string") useConfigStore.getState().updateConfig("videoSeconds", patch.seconds);
        if (typeof patch.generateAudio === "string") useConfigStore.getState().updateConfig("videoGenerateAudio", patch.generateAudio);
        if (typeof patch.watermark === "string") useConfigStore.getState().updateConfig("videoWatermark", patch.watermark);
        if (typeof patch.seed === "string") useConfigStore.getState().updateConfig("videoSeed", patch.seed);
    }, []);

    const downloadNodeImage = useCallback(async (node: CanvasNodeData) => {
        if ((node.type !== CanvasNodeType.Image && node.type !== CanvasNodeType.Video && node.type !== CanvasNodeType.Audio) || !node.metadata?.content) return;
        const content = node.metadata.content;
        const ext = node.type === CanvasNodeType.Video ? "mp4" : node.type === CanvasNodeType.Audio ? audioExtension(node.metadata.mimeType) : imageExtension(content);
        const fallback = node.type === CanvasNodeType.Video ? "视频" : node.type === CanvasNodeType.Audio ? "音频" : "图片";
        const filename = `${(node.title || "").trim().replace(/[\\/:*?"<>|]/g, "_") || fallback}.${ext}`;
        try {
            if (node.type === CanvasNodeType.Video && /^https?:\/\//i.test(content)) {
                const hide = message.loading("正在下载视频…", 0);
                try {
                    saveAs(await fetchRemoteMediaBlob(content), filename);
                } finally {
                    hide();
                }
                return;
            }
            saveAs(content, filename);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "下载失败");
        }
    }, [message]);

    const saveNodeAsset = useCallback(
        async (node: CanvasNodeData) => {
            if (node.type === CanvasNodeType.Text) {
                const content = node.metadata?.content?.trim();
                if (!content) return message.error("没有可保存的文本");
                addAsset({ kind: "text", title: node.metadata?.prompt?.slice(0, 24) || "画布文本", coverUrl: "", tags: [], source: "Canvas", data: { content }, metadata: { source: "canvas", nodeId: node.id } });
                message.success("已加入我的资产");
                return;
            }
            if (node.type === CanvasNodeType.Video) {
                if (!node.metadata?.content) return message.error("没有可保存的视频");
                addAsset({
                    kind: "video",
                    title: node.metadata?.prompt?.slice(0, 24) || "画布视频",
                    coverUrl: "",
                    tags: [],
                    source: "Canvas",
                    data: { url: node.metadata.content, storageKey: node.metadata.storageKey, width: node.width, height: node.height, bytes: node.metadata.bytes || 0, mimeType: node.metadata.mimeType || "video/mp4" },
                    metadata: { source: "canvas", nodeId: node.id, prompt: node.metadata?.prompt },
                });
                message.success("已加入我的资产");
                return;
            }
            if (!node.metadata?.content) return message.error("没有可保存的图片");
            const dataUrl = node.metadata.storageKey ? "" : node.metadata.content;
            const title = node.metadata?.prompt?.slice(0, 24) || "画布图片";
            let compliance = pickComplianceBadgeMeta(node.metadata);
            if (!compliance.complianceStatus) {
                const submitted = await ensureImportComplianceMeta(node.metadata.content, {
                    title,
                    existing: node.metadata,
                });
                if (submitted) compliance = pickComplianceBadgeMeta(submitted);
            }
            addAsset({
                kind: "image",
                title,
                coverUrl: node.metadata.content,
                tags: [],
                source: "Canvas",
                data: {
                    dataUrl,
                    storageKey: node.metadata.storageKey,
                    width: node.metadata.naturalWidth || node.width,
                    height: node.metadata.naturalHeight || node.height,
                    bytes: node.metadata.bytes || getDataUrlByteSize(dataUrl),
                    mimeType: node.metadata.mimeType || "image/png",
                },
                metadata: { source: "canvas", nodeId: node.id, prompt: node.metadata?.prompt, ...compliance },
            });
            message.success("已加入我的资产");
        },
        [addAsset, message],
    );


    const cropImageNode = useCallback(async (node: CanvasNodeData, crop: CanvasImageCropRect) => {
        if (!node.metadata?.content) return;
        try {
            const cropped = await cropDataUrl(node.metadata.content, crop);
            const image = await uploadImage(cropped);
            const width = Math.min(node.width, Math.max(220, image.width));
            const childId = nanoid();
            const child: CanvasNodeData = {
                id: childId,
                type: CanvasNodeType.Image,
                title: "Cropped Image",
                position: { x: node.position.x + node.width + 96, y: node.position.y },
                width,
                height: width * (image.height / image.width),
                metadata: {
                    ...imageMetadata(image),
                    prompt: node.metadata?.prompt,
                },
            };
            setNodes((prev) => [...prev, child]);
            setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
            setSelectedNodeIds(new Set([childId]));
            setDialogNodeId(childId);
            setCropNodeId(null);
        } catch (error) {
            console.error(error);
            message.error(error instanceof Error ? error.message : "裁剪失败，请重试");
        }
    }, [message]);

    const splitImageNode = useCallback(
        async (node: CanvasNodeData, params: CanvasImageSplitParams) => {
            if (!node.metadata?.content) return;
            setSplitNodeId(null);
            const pieces = await splitDataUrl(node.metadata.content, params);
            const gap = 16;
            const cellWidth = node.width / params.columns;
            const cellHeight = node.height / params.rows;
            const startX = node.position.x + node.width + 96;
            const startY = node.position.y;
            const childNodes = await Promise.all(
                pieces.map(async (piece) => {
                    const image = await uploadImage(piece.dataUrl);
                    const id = nanoid();
                    return {
                        id,
                        type: CanvasNodeType.Image,
                        title: `${node.title || "图片"} ${piece.row + 1}-${piece.column + 1}`,
                        position: { x: startX + piece.column * (cellWidth + gap), y: startY + piece.row * (cellHeight + gap) },
                        width: cellWidth,
                        height: cellHeight,
                        metadata: {
                            ...imageMetadata(image),
                            prompt: node.metadata?.prompt,
                        },
                    } satisfies CanvasNodeData;
                }),
            );
            setNodes((prev) => [...prev, ...childNodes]);
            setConnections((prev) => [...prev, ...childNodes.map((child) => ({ id: nanoid(), fromNodeId: node.id, toNodeId: child.id }))]);
            setSelectedNodeIds(new Set(childNodes.map((child) => child.id)));
            setSelectedConnectionId(null);
            setDialogNodeId(null);
            message.success(`已切分为 ${childNodes.length} 个子节点`);
        },
        [message],
    );

    const appendFramesAsImageNodes = useCallback(
        async (videoNode: CanvasNodeData, frames: Array<CapturedVideoFrame & { title: string }>) => {
            const gap = 16;
            const startX = videoNode.position.x + videoNode.width + 96;
            let cursorY = videoNode.position.y;
            const childNodes: CanvasNodeData[] = [];
            for (const frame of frames) {
                const uploaded = await uploadImage(frame.dataUrl);
                const size = fitNodeSize(uploaded.width, uploaded.height, videoNode.width, videoNode.height);
                childNodes.push({
                    id: nanoid(),
                    type: CanvasNodeType.Image,
                    title: frame.title,
                    position: { x: startX, y: cursorY },
                    width: size.width,
                    height: size.height,
                    metadata: imageMetadata(uploaded),
                });
                cursorY += size.height + gap;
            }
            setNodes((prev) => [...prev, ...childNodes]);
            setConnections((prev) => [...prev, ...childNodes.map((child) => ({ id: nanoid(), fromNodeId: videoNode.id, toNodeId: child.id }))]);
            setSelectedNodeIds(new Set(childNodes.map((child) => child.id)));
            setSelectedConnectionId(null);
            setDialogNodeId(null);
            return childNodes.length;
        },
        [],
    );

    const frameExtractingRef = useRef(false);

    const extractVideoEndFrames = useCallback(
        async (node: CanvasNodeData) => {
            if (!node.metadata?.content || frameExtractingRef.current) return;
            frameExtractingRef.current = true;
            let hide = message.loading("正在抽取首尾帧，请稍候…", 0);
            try {
                const { first, last } = await captureVideoFirstLastFrames(node.metadata.content, node.metadata.storageKey);
                hide();
                hide = message.loading("正在生成图片节点…", 0);
                const count = await appendFramesAsImageNodes(node, [
                    { ...first, title: `${node.title || "视频"} · 首帧` },
                    { ...last, title: `${node.title || "视频"} · 尾帧` },
                ]);
                hide();
                message.success(`已抽取首尾帧，生成 ${count} 个图片节点`);
            } catch (error) {
                hide();
                message.error(error instanceof Error ? error.message : "抽取首尾帧失败");
            } finally {
                frameExtractingRef.current = false;
            }
        },
        [appendFramesAsImageNodes, message],
    );

    const extractVideoCurrentFrame = useCallback(
        async (node: CanvasNodeData) => {
            if (!node.metadata?.content || frameExtractingRef.current) return;
            frameExtractingRef.current = true;
            let hide = message.loading("正在抽取当前帧，请稍候…", 0);
            try {
                const el = document.querySelector(`[data-node-id="${node.id}"] video`) as HTMLVideoElement | null;
                el?.pause();
                const timeSec = el && Number.isFinite(el.currentTime) ? el.currentTime : 0;
                const frame = await captureVideoFrameAt(node.metadata.content, timeSec, node.metadata.storageKey);
                hide();
                hide = message.loading("正在生成图片节点…", 0);
                const sec = Math.max(0, Math.round(frame.timeSec * 10) / 10);
                await appendFramesAsImageNodes(node, [{ ...frame, title: `${node.title || "视频"} · ${sec}s` }]);
                hide();
                message.success("已抽取当前帧");
            } catch (error) {
                hide();
                message.error(error instanceof Error ? error.message : "抽取当前帧失败");
            } finally {
                frameExtractingRef.current = false;
            }
        },
        [appendFramesAsImageNodes, message],
    );

    const maskEditImageNode = useCallback(
        async (node: CanvasNodeData, payload: CanvasImageMaskEditPayload) => {
            if (!node.metadata?.content) return;
            const generationConfig = { ...buildGenerationConfig(effectiveConfig, node, "image"), count: "1", size: node.metadata?.size || "auto" };
            if (!isAiConfigReady(generationConfig, generationConfig.model)) {
                openConfigDialog(true);
                return;
            }
            const userPrompt = payload.prompt.trim();
            const prompt = `只修改蒙版透明区域，其他区域保持不变。${userPrompt}`;
            const childId = nanoid();
            const source = { id: node.id, name: `${node.title || node.id}.png`, type: node.metadata.mimeType || "image/png", dataUrl: node.metadata.content, storageKey: node.metadata.storageKey };
            const generationMetadata = buildImageGenerationMetadata("edit", generationConfig, 1, [source]);
            setMaskEditNodeId(null);
            setRunningNodeId(childId);
            setNodes((prev) => [
                ...prev,
                {
                    id: childId,
                    type: CanvasNodeType.Image,
                    title: userPrompt.slice(0, 32) || "局部编辑结果",
                    position: { x: node.position.x + node.width + 96, y: node.position.y },
                    width: node.width,
                    height: node.height,
                    metadata: { prompt, status: NODE_STATUS_LOADING, ...generationMetadata },
                },
            ]);
            setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
            setSelectedNodeIds(new Set([childId]));
            setSelectedConnectionId(null);
            setDialogNodeId(childId);
            const controller = startGenerationRequest(childId, node.id, childId);
            try {
                const image = await requestEdit(generationConfig, prompt, [source], { id: `${node.id}-mask`, name: "mask.png", type: "image/png", dataUrl: payload.maskDataUrl }, { signal: controller.signal }).then((items) => items[0]);
                const uploaded = await uploadImage(image.dataUrl);
                const size = fitNodeSize(uploaded.width, uploaded.height, node.width, node.height);
                setNodes((prev) => prev.map((item) => (item.id === childId ? { ...item, width: size.width, height: size.height, metadata: { ...item.metadata, ...imageMetadata(uploaded), prompt, ...generationMetadata } } : item)));
            } catch (error) {
                if (isGenerationCanceled(error)) return;
                const errorDetails = error instanceof Error ? error.message : "局部修改失败";
                message.error(errorDetails);
                setNodes((prev) => prev.map((item) => (item.id === childId ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, errorDetails } } : item)));
            } finally {
                finishGenerationRequest(childId, controller);
                setRunningNodeId(null);
            }
        },
        [effectiveConfig, finishGenerationRequest, isAiConfigReady, message, openConfigDialog, startGenerationRequest],
    );

    const upscaleImageNode = useCallback(async (node: CanvasNodeData, params: CanvasImageUpscaleParams) => {
        if (!node.metadata?.content) return;
        setUpscaleNodeId(null);
        const upscaled = await upscaleDataUrl(node.metadata.content, params);
        const image = await uploadImage(upscaled);
        const size = fitNodeSize(image.width, image.height);
        const childId = nanoid();
        const child: CanvasNodeData = {
            id: childId,
            type: CanvasNodeType.Image,
            title: "Upscaled Image",
            position: { x: node.position.x + node.width + 96, y: node.position.y },
            width: size.width,
            height: size.height,
            metadata: {
                ...imageMetadata(image),
                prompt: node.metadata?.prompt,
            },
        };
        setNodes((prev) => [...prev, child]);
        setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
        setSelectedNodeIds(new Set([childId]));
        setDialogNodeId(childId);
    }, []);

    const enhanceVideoNode = useCallback(
        async (node: CanvasNodeData, params: VideoUpscaleParams) => {
            const url = node.metadata?.content?.trim();
            if (!url) return;
            if (!isRemoteHttpUrl(url) || !/^https:\/\//i.test(url)) {
                message.error("请先将视频上传到云端后再做画质增强");
                return;
            }
            setVideoEnhanceNodeId(null);
            const childId = nanoid();
            const sourceW = node.metadata?.naturalWidth || node.width;
            const sourceH = node.metadata?.naturalHeight || node.height;
            const placeholderSize = fitNodeSize(sourceW, sourceH, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
            const resLabel = params.resolution || "1080p";
            const fpsLabel = params.targetFps != null ? `${Math.round(params.targetFps)}fps` : "原帧率";
            setNodes((prev) => [
                ...prev,
                {
                    id: childId,
                    type: CanvasNodeType.Video,
                    title: `${node.title || "视频"} · 画质增强${resLabel}/${fpsLabel}`,
                    position: { x: node.position.x + node.width + 96, y: node.position.y },
                    width: placeholderSize.width,
                    height: placeholderSize.height,
                    metadata: { status: NODE_STATUS_LOADING, loadingLabel: "画质增强中" },
                },
            ]);
            setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
            setSelectedNodeIds(new Set([childId]));
            setDialogNodeId(null);
            try {
                const result = await runVideoUpscale({
                    nodeId: node.id,
                    videoUrl: url,
                    durationMs: node.metadata?.durationMs,
                    sourceWidth: node.metadata?.naturalWidth,
                    sourceHeight: node.metadata?.naturalHeight,
                    title: node.title,
                    params,
                });
                const probed = await probeVideoDimensions(result.outputVideoUrl);
                const stored = await storeGeneratedVideo({ url: result.outputVideoUrl, mimeType: "video/mp4" });
                const outputWidth = probed?.width || stored.width || sourceW;
                const outputHeight = probed?.height || stored.height || sourceH;
                const videoSize = fitNodeSize(outputWidth, outputHeight, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
                setNodes((prev) =>
                    prev.map((item) =>
                        item.id === childId
                            ? {
                                  ...item,
                                  width: videoSize.width,
                                  height: videoSize.height,
                                  metadata: withPlatformVideoExpiry(
                                      videoMetadata({ ...stored, width: outputWidth, height: outputHeight, durationMs: stored.durationMs }),
                                  ),
                              }
                            : item,
                    ),
                );
                message.success("画质增强完成");
            } catch (error) {
                if (isGenerationCanceled(error)) return;
                const errorDetails = error instanceof Error ? error.message : "画质增强失败";
                setNodes((prev) => prev.map((item) => (item.id === childId ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, errorDetails } } : item)));
                message.error(errorDetails);
            }
        },
        [message],
    );

    const generateAngleNode = useCallback(
        async (node: CanvasNodeData, params: CanvasImageAngleParams) => {
            if (!node.metadata?.content) return;
            const generationConfig = { ...buildGenerationConfig(effectiveConfig, node, "image"), count: "1" };
            if (!isAiConfigReady(generationConfig, generationConfig.model)) {
                openConfigDialog(true);
                return;
            }
            const childId = nanoid();
            const imageConfig = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
            const title = buildAngleLabel(params);
            const prompt = buildAnglePrompt(params);
            const generationMetadata = buildImageGenerationMetadata("edit", generationConfig, 1, [
                { id: node.id, name: `${node.title || node.id}.png`, type: node.metadata.mimeType || "image/png", dataUrl: node.metadata.content, storageKey: node.metadata.storageKey },
            ]);
            setAngleNodeId(null);
            setRunningNodeId(childId);
            setNodes((prev) => [
                ...prev,
                {
                    id: childId,
                    type: CanvasNodeType.Image,
                    title,
                    position: { x: node.position.x + node.width + 96, y: node.position.y },
                    width: imageConfig.width,
                    height: imageConfig.height,
                    metadata: { prompt, status: NODE_STATUS_LOADING, ...generationMetadata },
                },
            ]);
            setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
            setSelectedNodeIds(new Set([childId]));
            setDialogNodeId(childId);
            const controller = startGenerationRequest(childId, node.id, childId);
            try {
                const image = await requestEdit(
                    generationConfig,
                    prompt,
                    [{ id: node.id, name: `${node.title || node.id}.png`, type: node.metadata.mimeType || "image/png", dataUrl: node.metadata.content, storageKey: node.metadata.storageKey }],
                    undefined,
                    { signal: controller.signal },
                ).then((items) => items[0]);
                const uploaded = await uploadImage(image.dataUrl);
                const size = fitNodeSize(uploaded.width, uploaded.height, imageConfig.width, imageConfig.height);
                setNodes((prev) => prev.map((item) => (item.id === childId ? { ...item, width: size.width, height: size.height, metadata: { ...item.metadata, ...imageMetadata(uploaded), prompt, ...generationMetadata } } : item)));
            } catch (error) {
                if (isGenerationCanceled(error)) return;
                const errorDetails = error instanceof Error ? error.message : "生成失败";
                setNodes((prev) => prev.map((item) => (item.id === childId ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, errorDetails } } : item)));
            } finally {
                finishGenerationRequest(childId, controller);
                setRunningNodeId(null);
            }
        },
        [effectiveConfig, finishGenerationRequest, isAiConfigReady, openConfigDialog, startGenerationRequest],
    );

    const handleFontSizeChange = useCallback((nodeId: string, fontSize: number) => {
        setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, fontSize } } : node)));
    }, []);

    const handleUploadRequest = useCallback((nodeId?: string, position?: Position) => {
        uploadTargetRef.current = { nodeId, position };
        imageInputRef.current?.click();
    }, []);

    const handleImageInputChange = useCallback(
        async (event: ReactChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files || []).filter(
                (f) => f.type.startsWith("image/") || f.type.startsWith("video/") || isAudioFile(f),
            );
            if (!files.length) {
                uploadTargetRef.current = null;
                event.target.value = "";
                return;
            }

            const target = uploadTargetRef.current;
            const basePosition =
                target?.position ||
                screenToCanvas(
                    (containerRef.current?.getBoundingClientRect().left || 0) + size.width / 2,
                    (containerRef.current?.getBoundingClientRect().top || 0) + size.height / 2,
                );
            // 如果有替换目标节点，第一个文件替换它，其余在附近新建
            if (target?.nodeId) {
                const [first, ...rest] = files;

                // 第一个文件：替换目标节点
                if (isAudioFile(first)) {
                    const local = await uploadMediaFile(first, "audio");
                    let audio = local;
                    try {
                        const ossUrl = await promoteLocalMediaToOss(local.storageKey, first.name || "audio.mp3");
                        if (ossUrl) audio = { ...local, url: ossUrl, storageKey: "" };
                    } catch {
                        /* 保存时重试 */
                    }
                    const spec = NODE_DEFAULT_SIZE[CanvasNodeType.Audio];
                    setNodes((prev) =>
                        prev.map((node) =>
                            node.id === target.nodeId
                                ? {
                                      ...node,
                                      type: CanvasNodeType.Audio,
                                      title: first.name,
                                      position: { x: node.position.x + node.width / 2 - spec.width / 2, y: node.position.y + node.height / 2 - spec.height / 2 },
                                      width: spec.width,
                                      height: spec.height,
                                      metadata: { ...node.metadata, ...audioMetadata(audio), errorDetails: undefined },
                                  }
                                : node,
                        ),
                    );
                    setSelectedNodeIds(new Set([target.nodeId]));
                    setSelectedConnectionId(null);
                } else if (first.type.startsWith("video/")) {
                    const local = await uploadMediaFile(first, "video");
                    let video = local;
                    try {
                        const ossUrl = await promoteLocalMediaToOss(local.storageKey, first.name || "video.mp4");
                        if (ossUrl) video = { ...local, url: ossUrl, storageKey: "" };
                    } catch {
                        /* 保存时重试 */
                    }
                    const nextSize = fitNodeSize(video.width || 1280, video.height || 720, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
                    setNodes((prev) =>
                        prev.map((node) =>
                            node.id === target.nodeId
                                ? {
                                      ...node,
                                      type: CanvasNodeType.Video,
                                      title: first.name,
                                      position: { x: node.position.x + node.width / 2 - nextSize.width / 2, y: node.position.y + node.height / 2 - nextSize.height / 2 },
                                      width: nextSize.width,
                                      height: nextSize.height,
                                      metadata: { ...node.metadata, ...videoMetadata(video), errorDetails: undefined },
                                  }
                                : node,
                        ),
                    );
                    setSelectedNodeIds(new Set([target.nodeId]));
                    setSelectedConnectionId(null);
                } else {
                    const local = await uploadImage(first);
                    let image = local;
                    try {
                        const ossUrl = await promoteLocalMediaToOss(local.storageKey, first.name || "image.png");
                        if (ossUrl) image = { ...local, url: ossUrl, storageKey: "" };
                    } catch {
                        /* 保存时重试 */
                    }
                    const s = fitNodeSize(image.width, image.height);
                    setNodes((prev) =>
                        prev.map((node) =>
                            node.id === target.nodeId
                                ? {
                                      ...node,
                                      type: CanvasNodeType.Image,
                                      title: first.name,
                                      width: s.width,
                                      height: s.height,
                                      metadata: {
                                          ...node.metadata,
                                          ...imageMetadata(image),
                                          errorDetails: undefined,
                                          freeResize: false,
                                          isBatchRoot: undefined,
                                          batchRootId: undefined,
                                          batchChildIds: undefined,
                                          batchUsesReferenceImages: undefined,
                                          generationType: undefined,
                                          model: undefined,
                                          size: undefined,
                                          quality: undefined,
                                          count: undefined,
                                          references: undefined,
                                          primaryImageId: undefined,
                                          imageBatchExpanded: undefined,
                                          platformTaskId: undefined,
                                          platformTaskKind: undefined,
                                          complianceStatus: undefined,
                                          complianceAssetId: undefined,
                                          arkAssetId: undefined,
                                          complianceSupplierId: undefined,
                                          complianceSource: undefined,
                                          complianceError: undefined,
                                      },
                                  }
                                : node,
                        ),
                    );
                    setSelectedNodeIds(new Set([target.nodeId]));
                    setSelectedConnectionId(null);
                    if (isRemoteHttpUrl(image.url)) void attachImportCompliance(target.nodeId, image.url, first.name);
                }

                // 剩余文件：在目标节点右侧按真实尺寸横向排列，互不重叠
                const targetNode = nodesRef.current.find((node) => node.id === target.nodeId);
                const resolvePos = createHorizontalPositionResolver(
                    basePosition,
                    targetNode ? targetNode.position.x + targetNode.width + DROP_MEDIA_GAP : null,
                );
                for (const f of rest) {
                    await createMediaFileNode(f, resolvePos);
                }
            } else {
                // 无替换目标：按真实尺寸横向排列，互不重叠
                const resolvePos = createHorizontalPositionResolver(basePosition);
                for (const f of files) {
                    await createMediaFileNode(f, resolvePos);
                }
            }

            uploadTargetRef.current = null;
            event.target.value = "";
        },
        [attachImportCompliance, createMediaFileNode, promoteLocalMediaToOss, screenToCanvas, size.height, size.width],
    );

    const handleDrop = useCallback(
        (event: ReactDragEvent<HTMLDivElement>) => {
            event.preventDefault();
            const files = Array.from(event.dataTransfer.files).filter(
                (item) => item.type.startsWith("image/") || item.type.startsWith("video/") || isAudioFile(item),
            );
            if (!files.length) return;

            const basePos = screenToCanvas(event.clientX, event.clientY);
            const resolvePos = createHorizontalPositionResolver(basePos);
            void (async () => {
                for (const f of files) {
                    await createMediaFileNode(f, resolvePos);
                }
            })();
        },
        [createMediaFileNode, screenToCanvas],
    );

    const startTitleEditing = useCallback(() => {
        setTitleDraft(currentProject?.title || "未命名画布");
        setTitleEditing(true);
    }, [currentProject?.title]);

    const finishTitleEditing = useCallback(() => {
        const nextTitle = titleDraft.trim();
        const prevTitle = currentProject?.title || "";
        setTitleEditing(false);
        if (!nextTitle || nextTitle === prevTitle || !currentProject) return;
        renameProject(projectId, nextTitle);
        setCloudContentRevision((revision) => revision + 1);
    }, [currentProject, projectId, renameProject, titleDraft]);

    const preventCanvasContextMenu = useCallback((event: ReactMouseEvent) => {
        const target = event.target instanceof Element ? event.target : null;
        // 节点自身另有右键菜单
        if (target?.closest("[data-node-id]")) return;
        event.preventDefault();
        setContextMenu(null);
        // 空白处右键：与双击左键相同，打开新建节点菜单
        if (target?.closest("[data-canvas-no-zoom],[data-connection-id],[data-canvas-connect-hub],[data-connection-create-menu]")) {
            return;
        }
        setNodeCreatePosition(screenToCanvas(event.clientX, event.clientY));
    }, [screenToCanvas]);

    const handleGenerateNode = useCallback(
        async (nodeId: string, mode: CanvasNodeGenerationMode, prompt: string) => {
            if (mode === "audio" && generationRequestsRef.current.has(nodeId)) return;
            const sourceNode = nodesRef.current.find((node) => node.id === nodeId);
            const generationConfig = buildGenerationConfig(effectiveConfig, sourceNode, mode);
            if (mode === "audio" && sourceNode && hasResumablePlatformTask(sourceNode)) { await resumePlatformNodeTask(sourceNode); return; }
            if (mode !== "audio" && !isAiConfigReady(generationConfig, generationConfig.model)) {
                openConfigDialog(true);
                return;
            }

            // 插件节点声明了 useBuiltinPanel.writeBackToSelf:复用内置面板生成,但结果写回节点自身。
            // 目前支持 image 模式(全景等展示型节点),前缀由 useBuiltinPanel.promptPrefix 指定。
            const builtinPanel = sourceNode ? getNodeDefinition(sourceNode.type)?.useBuiltinPanel : undefined;
            if (sourceNode && builtinPanel?.writeBackToSelf && builtinPanel.mode === "image") {
                const scene = prompt.trim();
                if (!scene) return;
                setRunningNodeId(nodeId);
                const controller = startGenerationRequest(nodeId, nodeId, nodeId);
                setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, prompt: scene, status: NODE_STATUS_LOADING, errorDetails: undefined } } : node)));
                try {
                    const sceneWithStyle = resolveImageVideoPrompt(generationConfig.systemPrompt, scene);
                    const fullPrompt = `${builtinPanel.promptPrefix || ""}${sceneWithStyle}`;
                    // 上游图片节点作为参考图(图生图);无上游则纯文生图
                    const upstreamNodes = connectionsRef.current
                        .filter((conn) => conn.toNodeId === nodeId)
                        .map((conn) => nodesRef.current.find((node) => node.id === conn.fromNodeId))
                        .filter((node): node is CanvasNodeData => Boolean(node));
                    const refs = upstreamNodes.flatMap((up) =>
                        typeof up.metadata?.content === "string" && up.metadata.content && up.type !== sourceNode.type
                            ? [{ id: up.id, name: `${up.title || up.id}.png`, type: up.metadata.mimeType || "image/png", dataUrl: up.metadata.content, storageKey: up.metadata.storageKey }]
                            : [],
                    );
                    const image = refs.length
                        ? await requestEdit({ ...generationConfig, count: "1" }, fullPrompt, refs, undefined, { signal: controller.signal }).then((items) => items[0])
                        : await requestGeneration({ ...generationConfig, count: "1" }, fullPrompt, { signal: controller.signal }).then((items) => items[0]);
                    const uploaded = await uploadImage(image.dataUrl);
                    setNodes((prev) =>
                        prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, ...imageMetadata(uploaded), prompt: scene, model: generationConfig.model, status: NODE_STATUS_SUCCESS, errorDetails: undefined } } : node)),
                    );
                    setDialogNodeId(null);
                } catch (error) {
                    if (!isGenerationCanceled(error)) {
                        const errorDetails = error instanceof Error ? error.message : "生成失败";
                        message.error(errorDetails);
                        setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_ERROR, errorDetails } } : node)));
                    }
                } finally {
                    finishGenerationRequest(nodeId, controller);
                }
                return;
            }

            setRunningNodeId(nodeId);
            const runController = startGenerationRequest(nodeId, nodeId, nodeId);
            const sourceTextContent = sourceNode?.type === CanvasNodeType.Text ? sourceNode.metadata?.content?.trim() || "" : "";
            const editingTextNode = mode === "text" && Boolean(sourceTextContent);
            const generationContext = await hydrateNodeGenerationContext(
                buildNodeGenerationContext(nodeId, nodesRef.current, connectionsRef.current, editingTextNode ? `请根据要求修改以下文本。\n\n原文：\n${sourceTextContent}\n\n修改要求：\n${prompt}` : prompt),
            );
            const effectivePrompt = generationContext.prompt.trim();
            if (runController.signal.aborted) {
                finishGenerationRequest(nodeId, runController);
                setRunningNodeId(null);
                return;
            }
            const markSourceStatus = sourceNode?.type !== CanvasNodeType.Image && !(mode === "audio" && sourceNode?.type === CanvasNodeType.Audio && sourceNode.metadata?.content) && !editingTextNode;
            if (!effectivePrompt && (mode === "text" || mode === "audio")) {
                finishGenerationRequest(nodeId, runController);
                setRunningNodeId(null);
                return;
            }
            let pendingChildIds: string[] = [];
            if (markSourceStatus) setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, ...(node.type === CanvasNodeType.Config ? {} : { prompt }), status: NODE_STATUS_LOADING, errorDetails: undefined } } : node)));

            try {
                if (mode === "image") {
                    const count = getGenerationCount(generationConfig.count);
                    const isConfigNode = sourceNode?.type === CanvasNodeType.Config;
                    const isImageNode = sourceNode?.type === CanvasNodeType.Image;
                    const isEmptyImageNode = isImageNode && !sourceNode?.metadata?.content;
                    const sourceReference =
                        isImageNode && sourceNode?.metadata?.content
                            ? [{ id: sourceNode.id, name: `${sourceNode.title || sourceNode.id}.png`, type: sourceNode.metadata.mimeType || "image/png", dataUrl: sourceNode.metadata.content, storageKey: sourceNode.metadata.storageKey }]
                            : [];
                    const referenceImages = sourceReference.length ? sourceReference : generationContext.referenceImages;
                    const generationType = referenceImages.length ? ("edit" as const) : ("generation" as const);
                    const generationMetadata = buildImageGenerationMetadata(generationType, generationConfig, count, referenceImages);
                    const parentConfig = NODE_DEFAULT_SIZE[isConfigNode ? CanvasNodeType.Config : isImageNode ? CanvasNodeType.Image : CanvasNodeType.Text];
                    const imageConfig = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
                    const parentPosition = sourceNode?.position || { x: 0, y: 0 };
                    const gap = 96;
                    const rowGap = 36;
                    const rootId = isEmptyImageNode ? nodeId : nanoid();
                    const childIds = count > 1 ? Array.from({ length: count }, () => nanoid()) : [];
                    const targetIds = count > 1 ? childIds : [rootId];
                    pendingChildIds = isEmptyImageNode ? childIds : [rootId, ...childIds];
                    const rootNode: CanvasNodeData = {
                        id: rootId,
                        type: CanvasNodeType.Image,
                        title: effectivePrompt.slice(0, 32) || "Generated Image",
                        position: {
                            x: isEmptyImageNode ? parentPosition.x : parentPosition.x + parentConfig.width + gap,
                            y: parentPosition.y + parentConfig.height / 2 - imageConfig.height / 2,
                        },
                        width: isEmptyImageNode ? sourceNode?.width || imageConfig.width : imageConfig.width,
                        height: isEmptyImageNode ? sourceNode?.height || imageConfig.height : imageConfig.height,
                        metadata: {
                            prompt: effectivePrompt,
                            status: NODE_STATUS_LOADING,
                            isBatchRoot: count > 1,
                            batchChildIds: count > 1 ? childIds : undefined,
                            batchUsesReferenceImages: referenceImages.length > 0,
                            ...generationMetadata,
                            imageBatchExpanded: count > 1 ? true : undefined,
                        },
                    };
                    const childNodes: CanvasNodeData[] = childIds.map((id, index) => ({
                        id,
                        type: CanvasNodeType.Image,
                        title: effectivePrompt.slice(0, 32) || "Generated Image",
                        position: {
                            x: rootNode.position.x + rootNode.width + 120 + (index % 2) * (imageConfig.width + 36),
                            y: rootNode.position.y + Math.floor(index / 2) * (imageConfig.height + rowGap),
                        },
                        width: imageConfig.width,
                        height: imageConfig.height,
                        metadata: { prompt: effectivePrompt, status: NODE_STATUS_LOADING, batchRootId: count > 1 ? rootId : undefined, ...generationMetadata },
                    }));
                    const batchConnections = [...(isEmptyImageNode ? [] : [{ id: nanoid(), fromNodeId: nodeId, toNodeId: rootId }]), ...childIds.map((childId) => ({ id: nanoid(), fromNodeId: rootId, toNodeId: childId }))];

                    setNodes((prev) => [
                        ...prev.map((node) =>
                            node.id === nodeId
                                ? isConfigNode
                                    ? {
                                          ...node,
                                          metadata: { ...node.metadata, status: NODE_STATUS_LOADING, errorDetails: undefined },
                                      }
                                    : isEmptyImageNode
                                      ? {
                                            ...node,
                                            position: rootNode.position,
                                            width: rootNode.width,
                                            height: rootNode.height,
                                            title: rootNode.title,
                                            metadata: { ...node.metadata, ...rootNode.metadata, errorDetails: undefined },
                                        }
                                      : isImageNode
                                        ? {
                                              ...node,
                                              metadata: { ...node.metadata, status: NODE_STATUS_SUCCESS, errorDetails: undefined },
                                          }
                                        : {
                                              ...node,
                                              type: CanvasNodeType.Text,
                                              title: prompt.slice(0, 32) || "Prompt",
                                              width: parentConfig.width,
                                              height: parentConfig.height,
                                              metadata: { ...node.metadata, content: prompt, prompt, status: NODE_STATUS_SUCCESS, fontSize: 14, errorDetails: undefined },
                                          }
                                : node,
                        ),
                        ...(isEmptyImageNode ? [] : [rootNode]),
                        ...childNodes,
                    ]);
                    setConnections((prev) => [...prev, ...batchConnections]);
                    setSelectedNodeIds(new Set([nodeId]));
                    setSelectedConnectionId(null);
                    setDialogNodeId(nodeId);

                    const controller = runController;
                    targetIds.forEach((targetId) => startGenerationRequest(targetId, nodeId, nodeId, controller));
                    if (count > 1) startGenerationRequest(rootId, nodeId, nodeId, controller);
                    let hasSuccess = false;
                    let hasFailure = false;
                    let firstError = "";
                    await Promise.all(
                        targetIds.map(async (targetId) => {
                            try {
                                const created = await createPlatformImageTask({ ...generationConfig, count: "1" }, effectivePrompt, referenceImages, { signal: controller.signal });
                                setNodes((prev) =>
                                    prev.map((node) =>
                                        node.id === targetId
                                            ? {
                                                  ...node,
                                                  metadata: {
                                                      ...node.metadata,
                                                      platformTaskId: String(created.id),
                                                      platformTaskKind: "image",
                                                      status: NODE_STATUS_LOADING,
                                                      errorDetails: undefined,
                                                  },
                                              }
                                            : node,
                                    ),
                                );
                                const image = (await waitForPlatformImageTask(created.id, controller.signal))[0];
                                if (!image) throw new Error("生图完成但未返回图片");
                                const uploaded = await uploadImage(image.dataUrl);
                                const imageSize = fitNodeSize(uploaded.width, uploaded.height, imageConfig.width, imageConfig.height);
                                setNodes((prev) => {
                                    const root = prev.find((node) => node.id === rootId);
                                    return prev.map((node) => {
                                        if (node.id !== targetId && node.id !== rootId) return node;
                                        const center = { x: node.position.x + node.width / 2, y: node.position.y + node.height / 2 };
                                        if (node.id === rootId && (targetId === rootId || !root?.metadata?.primaryImageId))
                                            return {
                                                ...node,
                                                position: { x: center.x - imageSize.width / 2, y: center.y - imageSize.height / 2 },
                                                width: imageSize.width,
                                                height: imageSize.height,
                                                metadata: { ...node.metadata, ...imageMetadata(uploaded), primaryImageId: targetId, ...keepImagePlatformTaskMeta(created.id) },
                                            };
                                        if (node.id === targetId)
                                            return {
                                                ...node,
                                                position: { x: center.x - imageSize.width / 2, y: center.y - imageSize.height / 2 },
                                                width: imageSize.width,
                                                height: imageSize.height,
                                                metadata: { ...node.metadata, ...imageMetadata(uploaded), ...keepImagePlatformTaskMeta(created.id) },
                                            };
                                        return node;
                                    });
                                });
                                hasSuccess = true;
                                if (isConfigNode) setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_SUCCESS, errorDetails: undefined } } : node)));
                                return true;
                            } catch (error) {
                                if (isGenerationCanceled(error)) return false;
                                const errorDetails = error instanceof Error ? error.message : "生成失败";
                                if (!firstError) firstError = errorDetails;
                                hasFailure = true;
                                setNodes((prev) => prev.map((node) => (node.id === targetId ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_ERROR, errorDetails, ...clearPlatformTaskMeta() } } : node)));
                            } finally {
                                finishGenerationRequest(targetId, controller);
                            }
                            return false;
                        }),
                    );
                    if (count > 1) finishGenerationRequest(rootId, controller);
                    if (controller.signal.aborted) {
                        setNodes((prev) => prev.map((node) => (node.id === nodeId && isConfigNode && node.metadata?.status === NODE_STATUS_LOADING ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_IDLE, errorDetails: undefined } } : node)));
                        return;
                    }
                    if (hasFailure) {
                        message.error(hasSuccess ? "部分图片生成失败" : firstError || "生成失败");
                    }
                    setNodes((prev) =>
                        prev.map((node) =>
                            node.id === nodeId && isConfigNode
                                ? { ...node, metadata: { ...node.metadata, status: hasSuccess ? NODE_STATUS_SUCCESS : NODE_STATUS_ERROR, errorDetails: hasSuccess ? undefined : "生成失败" } }
                                : node.id === nodeId && isEmptyImageNode
                                  ? { ...node, metadata: { ...node.metadata, status: hasSuccess ? NODE_STATUS_SUCCESS : NODE_STATUS_ERROR, errorDetails: hasSuccess ? undefined : "生成失败" } }
                                  : node.id === rootId && !hasSuccess && !targetIds.includes(node.id)
                                    ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_ERROR, errorDetails: "全部图片生成失败" } }
                                    : node,
                        ),
                    );
                    return;
                }

                if (mode === "video") {
                    const spec = nodeSizeFromRatio(generationConfig.size, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT) || NODE_DEFAULT_SIZE[CanvasNodeType.Video];
                    const isEmptyVideoNode = sourceNode?.type === CanvasNodeType.Video && !sourceNode.metadata?.content;
                    const videoId = isEmptyVideoNode ? nodeId : nanoid();
                    const parent = sourceNode?.position || { x: 0, y: 0 };
                    const videoNode: CanvasNodeData = {
                        id: videoId,
                        type: CanvasNodeType.Video,
                        title: effectivePrompt.slice(0, 32) || "Generated Video",
                        position: isEmptyVideoNode ? sourceNode.position : { x: parent.x + (sourceNode?.width || spec.width) + 96, y: parent.y },
                        width: isEmptyVideoNode ? sourceNode.width : spec.width,
                        height: isEmptyVideoNode ? sourceNode.height : spec.height,
                        metadata: {
                            prompt: effectivePrompt,
                            status: NODE_STATUS_LOADING,
                            model: generationConfig.model,
                            size: generationConfig.size,
                            seconds: generationConfig.videoSeconds,
                            vquality: generationConfig.vquality,
                            generateAudio: generationConfig.videoGenerateAudio,
                            watermark: generationConfig.videoWatermark,
                            seed: generationConfig.videoSeed,
                            references: generationReferenceUrls(generationContext),
                        },
                    };
                    pendingChildIds = [videoId];
                    setNodes((prev) =>
                        isEmptyVideoNode
                            ? prev.map((node) => (node.id === nodeId ? { ...node, ...videoNode } : node))
                            : [...prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_SUCCESS } } : node)), videoNode],
                    );
                    if (!isEmptyVideoNode) setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: nodeId, toNodeId: videoId }]);
                    const controller = startGenerationRequest(videoId, nodeId, nodeId, runController);
                    try {
                        const task = await createVideoGenerationTask(
                            generationConfig,
                            effectivePrompt,
                            generationContext.referenceImages,
                            generationContext.referenceVideos,
                            generationContext.referenceAudios,
                            { signal: controller.signal },
                        );
                        setNodes((prev) =>
                            prev.map((node) =>
                                node.id === videoId
                                    ? {
                                          ...node,
                                          metadata: {
                                              ...node.metadata,
                                              platformTaskId: task.id,
                                              platformTaskKind: "video",
                                              platformModelKey: task.modelKey,
                                              status: NODE_STATUS_LOADING,
                                          },
                                      }
                                    : node,
                            ),
                        );
                        const result = await waitForVideoGenerationTask(generationConfig, task, { signal: controller.signal });
                        const video = await storeGeneratedVideo(result);
                        const videoSize = fitNodeSize(video.width || spec.width, video.height || spec.height, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
                        setNodes((prev) =>
                            prev.map((node) =>
                                node.id === videoId
                                    ? {
                                          ...node,
                                          width: videoSize.width,
                                          height: videoSize.height,
                                          position: { x: node.position.x + node.width / 2 - videoSize.width / 2, y: node.position.y + node.height / 2 - videoSize.height / 2 },
                                          metadata: {
                                              ...node.metadata,
                                              ...withPlatformVideoExpiry(videoMetadata(video)),
                                              prompt: effectivePrompt,
                                              model: generationConfig.model,
                                              size: generationConfig.size,
                                              seconds: generationConfig.videoSeconds,
                                              vquality: generationConfig.vquality,
                                              generateAudio: generationConfig.videoGenerateAudio,
                                              watermark: generationConfig.videoWatermark,
                                              seed: generationConfig.videoSeed,
                                              references: generationReferenceUrls(generationContext),
                                              ...clearPlatformTaskMeta(),
                                          },
                                      }
                                    : node,
                            ),
                        );
                    } finally {
                        finishGenerationRequest(videoId, controller);
                    }
                    return;
                }

                if (mode === "audio") {
                    const spec = NODE_DEFAULT_SIZE[CanvasNodeType.Audio];
                    const isEmptyAudioNode = sourceNode?.type === CanvasNodeType.Audio && !sourceNode.metadata?.content;
                    const audioId = isEmptyAudioNode ? nodeId : nanoid();
                    const parent = sourceNode?.position || { x: 0, y: 0 };
                    const audioNode: CanvasNodeData = {
                        id: audioId,
                        type: CanvasNodeType.Audio,
                        title: effectivePrompt.slice(0, 32) || "Generated Audio",
                        position: isEmptyAudioNode ? sourceNode.position : { x: parent.x + (sourceNode?.width || spec.width) + 96, y: parent.y + ((sourceNode?.height || spec.height) - spec.height) / 2 },
                        width: isEmptyAudioNode ? sourceNode.width : spec.width,
                        height: isEmptyAudioNode ? sourceNode.height : spec.height,
                        metadata: { prompt: effectivePrompt, status: NODE_STATUS_LOADING, ...buildAudioGenerationMetadata(generationConfig) },
                    };
                    pendingChildIds = [audioId];
                    setNodes((prev) =>
                        isEmptyAudioNode
                            ? prev.map((node) => (node.id === nodeId ? { ...node, ...audioNode } : node))
                            : [...prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_SUCCESS, errorDetails: undefined } } : node)), audioNode],
                    );
                    if (!isEmptyAudioNode) setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: nodeId, toNodeId: audioId }]);
                    const controller = startGenerationRequest(audioId, nodeId, nodeId, runController);
                    try {
                        const audio = await requestAudioGeneration(generationConfig, effectivePrompt, {
                            signal: controller.signal, projectId, nodeId: audioId, context: generationContext,
                            onSubmitted: (id, task) => setNodes(prev => prev.map(item => item.id === audioId ? { ...item, metadata: { ...item.metadata, ...(task ? audioTaskMetadata(task) : {}), platformTaskId: id, platformTaskKind: "audio", status: controller.signal.aborted ? NODE_STATUS_ERROR : NODE_STATUS_LOADING, errorDetails: controller.signal.aborted ? "已停止等待，后台任务继续；可继续查询或打开音频历史" : undefined } } : item)),
                        });
                        setNodes((prev) => prev.map((node) => (node.id === audioId ? { ...node, metadata: { ...node.metadata, ...audioTaskMetadata(audio) } } : node)));
                    } finally {
                        finishGenerationRequest(audioId, controller);
                    }
                    return;
                }

                let streamed = "";
                const isConfigNode = sourceNode?.type === CanvasNodeType.Config;
                const textCount = isConfigNode ? getGenerationCount(generationConfig.count) : 1;
                const parentConfig = NODE_DEFAULT_SIZE[isConfigNode ? CanvasNodeType.Config : CanvasNodeType.Text];
                const textConfig = NODE_DEFAULT_SIZE[CanvasNodeType.Text];
                const parentPosition = sourceNode?.position || { x: 0, y: 0 };
                const childIds = isConfigNode || editingTextNode ? Array.from({ length: textCount }, () => nanoid()) : [];
                pendingChildIds = childIds;
                if (isConfigNode || editingTextNode) {
                    const childNodes: CanvasNodeData[] = childIds.map((id, index) => ({
                        id,
                        type: CanvasNodeType.Text,
                        title: effectivePrompt.slice(0, 32) || "Generated Text",
                        position: {
                            x: parentPosition.x + parentConfig.width + 96,
                            y: parentPosition.y + parentConfig.height / 2 - textConfig.height / 2 + (index - (textCount - 1) / 2) * (textConfig.height + 36),
                        },
                        width: textConfig.width,
                        height: textConfig.height,
                        metadata: { prompt: effectivePrompt, status: NODE_STATUS_LOADING, fontSize: 14, model: generationConfig.model, reasoningEffort: generationConfig.reasoningEffort },
                    }));
                    setNodes((prev) => [...prev.map((node) => (node.id === nodeId && isConfigNode ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_LOADING, errorDetails: undefined } } : node)), ...childNodes]);
                    setConnections((prev) => [...prev, ...childIds.map((childId) => ({ id: nanoid(), fromNodeId: nodeId, toNodeId: childId }))]);
                }

                const controller = runController;
                const textTargetIds = childIds.length ? childIds : [nodeId];
                textTargetIds.forEach((targetNodeId) => startGenerationRequest(targetNodeId, nodeId, nodeId, controller));
                const answers = await Promise.all(
                    textTargetIds.map((targetNodeId) => {
                        let localStreamed = "";
                        return requestImageQuestion(
                            generationConfig,
                            buildNodeResponseMessages({ ...generationContext, prompt: effectivePrompt }),
                            (text) => {
                                localStreamed = text;
                                streamed = text;
                                if (isConfigNode) return;
                                setNodes((prev) => prev.map((node) => (node.id === targetNodeId ? { ...node, type: CanvasNodeType.Text, metadata: { ...node.metadata, content: text, status: NODE_STATUS_LOADING } } : node)));
                            },
                            { signal: controller.signal },
                        )
                            .then((answer) => ({ nodeId: targetNodeId, content: answer || localStreamed }))
                            .finally(() => finishGenerationRequest(targetNodeId, controller));
                    }),
                );
                if (controller.signal.aborted) return;
                const answerByNodeId = new Map(answers.map((item) => [item.nodeId, item.content]));
                setNodes((prev) =>
                    prev.map((node) =>
                        childIds.includes(node.id)
                            ? { ...node, metadata: { ...node.metadata, content: answerByNodeId.get(node.id) || streamed, status: NODE_STATUS_SUCCESS } }
                            : node.id === nodeId && isConfigNode
                              ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_SUCCESS } }
                              : node.id === nodeId && !editingTextNode
                                ? {
                                      ...node,
                                      type: CanvasNodeType.Text,
                                      title: prompt.slice(0, 32) || "Generated Text",
                                      metadata: { ...node.metadata, content: answerByNodeId.get(node.id) || streamed, model: generationConfig.model, reasoningEffort: generationConfig.reasoningEffort, status: NODE_STATUS_SUCCESS },
                                  }
                                : node,
                    ),
                );
            } catch (error) {
                if (isGenerationCanceled(error)) return;
                const errorDetails = error instanceof Error ? error.message : "生成失败";
                if (isVideoPollTimeout(error)) message.warning(errorDetails);
                else message.error(errorDetails);
                setNodes((prev) =>
                    prev.map((node) => {
                        if (node.id !== nodeId && !pendingChildIds.includes(node.id)) return node;
                        if (node.id === nodeId && !markSourceStatus) return node;
                        const keepWaiting = shouldKeepVideoTaskWaiting(node, error);
                        return {
                            ...node,
                            metadata: {
                                ...node.metadata,
                                status: keepWaiting ? NODE_STATUS_LOADING : NODE_STATUS_ERROR,
                                errorDetails,
                                ...(node.metadata?.platformTaskKind === "audio" && !keepWaiting ? clearPlatformTaskMeta() : {}),
                            },
                        };
                    }),
                );
            } finally {
                finishGenerationRequest(nodeId, runController);
                setRunningNodeId(null);
            }
        },
        [effectiveConfig, finishGenerationRequest, isAiConfigReady, message, openConfigDialog, startGenerationRequest, projectId, resumePlatformNodeTask],
    );

    const handleRetryNode = useCallback(
        async (node: CanvasNodeData) => {
            if (node.type === CanvasNodeType.Audio) {
                if (generationRequestsRef.current.has(node.id)) return;
                if (hasResumablePlatformTask(node)) { await resumePlatformNodeTask(node); return; }
                const cfg = buildGenerationConfig(effectiveConfig, node, "audio");
                const controller = startGenerationRequest(node.id, node.id, node.id);
                setRunningNodeId(node.id);
                setNodes(prev => prev.map(item => item.id === node.id ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_LOADING, errorDetails: undefined } } : item));
                try {
                    const context = node.metadata?.audioReferenceSnapshot ? null : await hydrateNodeGenerationContext(buildNodeGenerationContext(node.id, nodesRef.current, connectionsRef.current, node.metadata?.prompt || ""));
                    const task = await requestAudioGeneration(cfg, node.metadata?.prompt || context?.prompt || "", {
                        signal: controller.signal, projectId, nodeId: node.id, context, savedReferences: node.metadata?.audioReferenceSnapshot,
                        onSubmitted: (id, submitted) => setNodes(prev => prev.map(item => item.id === node.id ? { ...item, metadata: { ...item.metadata, ...(submitted ? audioTaskMetadata(submitted) : {}), platformTaskId: id, platformTaskKind: "audio", status: controller.signal.aborted ? NODE_STATUS_ERROR : NODE_STATUS_LOADING, errorDetails: controller.signal.aborted ? "已停止等待，后台任务继续；可继续查询或打开音频历史" : undefined } } : item)),
                    });
                    setNodes(prev => prev.map(item => item.id === node.id ? { ...item, metadata: { ...item.metadata, ...audioTaskMetadata(task) } } : item));
                } catch (error) {
                    if (!isGenerationCanceled(error)) {
                        const details = error instanceof Error ? error.message : "音频生成失败";
                        message.error(details);
                        setNodes(prev => prev.map(item => item.id === node.id ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, errorDetails: details, ...(shouldKeepVideoTaskWaiting(item, error) ? {} : clearPlatformTaskMeta()) } } : item));
                    }
                } finally { finishGenerationRequest(node.id, controller); setRunningNodeId(null); }
                return;
            }
            const sourceNode = findRetrySourceNode(node.id, nodesRef.current, connectionsRef.current) || node;
            const batchRoot = node.metadata?.batchRootId ? nodesRef.current.find((item) => item.id === node.metadata?.batchRootId) : null;
            const savedImageMetadata = node.type === CanvasNodeType.Image ? { ...batchRoot?.metadata, ...node.metadata } : undefined;
            const hasSavedImageMetadata = Boolean(savedImageMetadata?.generationType);
            const generationConfig =
                hasSavedImageMetadata && savedImageMetadata
                    ? {
                          ...effectiveConfig,
                          model: savedImageMetadata.model || effectiveConfig.imageModel || effectiveConfig.model,
                          quality: savedImageMetadata.quality || effectiveConfig.quality,
                          size: savedImageMetadata.size || effectiveConfig.size,
                          background: savedImageMetadata.background ?? effectiveConfig.background,
                          count: "1",
                      }
                    : { ...buildGenerationConfig(effectiveConfig, sourceNode, node.type === CanvasNodeType.Text ? "text" : node.type === CanvasNodeType.Video ? "video" : "image"), count: "1" };
            if (!isAiConfigReady(generationConfig, generationConfig.model)) {
                openConfigDialog(true);
                return;
            }

            const context = hasSavedImageMetadata ? null : await hydrateNodeGenerationContext(buildNodeGenerationContext(sourceNode.id, nodesRef.current, connectionsRef.current, sourceNode.metadata?.prompt || node.metadata?.prompt || ""));
            const prompt = (savedImageMetadata?.prompt || context?.prompt || "").trim();
            if (!prompt) {
                message.warning("找不到提示词，无法重试");
                return;
            }
            const generationType = savedImageMetadata?.generationType;
            const useReferenceImages = generationType ? generationType === "edit" : Boolean(context?.referenceImages.length);
            const retryReferenceImages =
                hasSavedImageMetadata && savedImageMetadata ? await resolveMetadataReferences(savedImageMetadata) : useReferenceImages ? (context?.referenceImages.length ? context.referenceImages : sourceNodeReferenceImages(batchRoot || sourceNode)) : [];
            if (useReferenceImages && !retryReferenceImages) {
                message.error("参考图片已丢失，无法继续重试");
                setNodes((prev) => prev.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, errorDetails: "参考图片已丢失，无法继续重试" } } : item)));
                return;
            }
            const retryImages = retryReferenceImages || [];

            setRunningNodeId(node.id);
            setNodes((prev) => prev.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_LOADING, errorDetails: undefined } } : item)));
            const controller = startGenerationRequest(node.id, sourceNode.id, node.id);

            try {
                if (node.type === CanvasNodeType.Text) {
                    let streamed = "";
                    const answer = await requestImageQuestion(
                        generationConfig,
                        context ? buildNodeResponseMessages({ ...context, prompt }) : [{ role: "user", content: prompt }],
                        (text) => {
                            streamed = text;
                            setNodes((prev) => prev.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, content: text, status: NODE_STATUS_LOADING } } : item)));
                        },
                        { signal: controller.signal },
                    );
                    setNodes((prev) => prev.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, content: answer || streamed, model: generationConfig.model, reasoningEffort: generationConfig.reasoningEffort, status: NODE_STATUS_SUCCESS } } : item)));
                    return;
                }
                if (node.type === CanvasNodeType.Video) {
                    const task = await createVideoGenerationTask(generationConfig, prompt, retryImages, context?.referenceVideos || [], context?.referenceAudios || [], { signal: controller.signal });
                    setNodes((prev) =>
                        prev.map((item) =>
                            item.id === node.id
                                ? {
                                      ...item,
                                      metadata: {
                                          ...item.metadata,
                                          platformTaskId: task.id,
                                          platformTaskKind: "video",
                                          platformModelKey: task.modelKey,
                                          status: NODE_STATUS_LOADING,
                                      },
                                  }
                                : item,
                        ),
                    );
                    const result = await waitForVideoGenerationTask(generationConfig, task, { signal: controller.signal });
                    const video = await storeGeneratedVideo(result);
                    const videoSize = fitNodeSize(video.width || node.width, video.height || node.height, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
                    setNodes((prev) =>
                        prev.map((item) =>
                            item.id === node.id
                                ? {
                                      ...item,
                                      width: videoSize.width,
                                      height: videoSize.height,
                                      position: { x: item.position.x + item.width / 2 - videoSize.width / 2, y: item.position.y + item.height / 2 - videoSize.height / 2 },
                                      metadata: {
                                          ...item.metadata,
                                          ...withPlatformVideoExpiry(videoMetadata(video)),
                                          prompt,
                                          model: generationConfig.model,
                                          size: generationConfig.size,
                                          seconds: generationConfig.videoSeconds,
                                          vquality: generationConfig.vquality,
                                          generateAudio: generationConfig.videoGenerateAudio,
                                          watermark: generationConfig.videoWatermark,
                                          seed: generationConfig.videoSeed,
                                          ...clearPlatformTaskMeta(),
                                      },
                                  }
                                : item,
                        ),
                    );
                    return;
                }

                const created = await createPlatformImageTask(generationConfig, prompt, useReferenceImages ? retryImages : [], { signal: controller.signal });
                setNodes((prev) =>
                    prev.map((item) =>
                        item.id === node.id
                            ? {
                                  ...item,
                                  metadata: {
                                      ...item.metadata,
                                      platformTaskId: String(created.id),
                                      platformTaskKind: "image",
                                      status: NODE_STATUS_LOADING,
                                  },
                              }
                            : item,
                    ),
                );
                const image = (await waitForPlatformImageTask(created.id, controller.signal))[0];
                if (!image) throw new Error("生图完成但未返回图片");
                const uploadedImage = await uploadImage(image.dataUrl);
                const imageConfig = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
                const imageSize = fitNodeSize(uploadedImage.width, uploadedImage.height, imageConfig.width, imageConfig.height);
                const generationMetadata = savedImageMetadata?.generationType
                    ? {
                          generationType: savedImageMetadata.generationType,
                          model: generationConfig.model,
                          size: generationConfig.size,
                          quality: generationConfig.quality,
                          ...(generationConfig.background ? { background: generationConfig.background } : {}),
                          count: savedImageMetadata.count || 1,
                          references: savedImageMetadata.references,
                      }
                    : buildImageGenerationMetadata(useReferenceImages ? "edit" : "generation", generationConfig, 1, retryImages);
                setNodes((prev) =>
                    prev.map((item) =>
                        item.id === node.id
                            ? {
                                  ...item,
                                  type: CanvasNodeType.Image,
                                  width: imageSize.width,
                                  height: imageSize.height,
                                  metadata: { ...item.metadata, ...imageMetadata(uploadedImage), prompt, ...generationMetadata, ...keepImagePlatformTaskMeta(created.id) },
                              }
                            : item,
                    ),
                );
            } catch (error) {
                if (isGenerationCanceled(error)) return;
                const errorDetails = error instanceof Error ? error.message : "生成失败";
                const keepWaiting = shouldKeepVideoTaskWaiting(node, error);
                if (keepWaiting) message.warning(errorDetails);
                else message.error(errorDetails);
                setNodes((prev) =>
                    prev.map((item) =>
                        item.id === node.id
                            ? {
                                  ...item,
                                  metadata: {
                                      ...item.metadata,
                                      status: keepWaiting ? NODE_STATUS_LOADING : NODE_STATUS_ERROR,
                                      errorDetails,
                                  },
                              }
                            : item,
                    ),
                );
            } finally {
                finishGenerationRequest(node.id, controller);
                setRunningNodeId(null);
            }
        },
        [effectiveConfig, finishGenerationRequest, isAiConfigReady, message, openConfigDialog, startGenerationRequest, projectId, resumePlatformNodeTask],
    );

    const generateImageFromTextNode = useCallback(
        (node: CanvasNodeData) => {
            const prompt = (node.metadata?.content || node.metadata?.prompt || "").trim();
            if (!prompt) {
                message.warning("文本节点为空，无法生图");
                return;
            }
            const sourceNode = nodesRef.current.find((item) => item.id === node.id);
            if (!sourceNode) return;
            const nodeSize = getNodeSpec(CanvasNodeType.Config);
            const configNode = createCanvasNode(
                CanvasNodeType.Config,
                {
                    x: sourceNode.position.x + sourceNode.width + 96 + nodeSize.width / 2,
                    y: sourceNode.position.y + sourceNode.height / 2,
                },
                {
                    prompt: "",
                    model: effectiveConfig.imageModel || effectiveConfig.model,
                    size: effectiveConfig.size,
                    count: getGenerationCount(effectiveConfig.canvasImageCount || effectiveConfig.count),
                },
            );
            const connection = { id: nanoid(), fromNodeId: sourceNode.id, toNodeId: configNode.id };
            const nextNodes = nodesRef.current.map((item) => (item.id === sourceNode.id ? { ...item, metadata: { ...item.metadata, content: prompt, prompt, status: NODE_STATUS_SUCCESS } } : item)).concat(configNode);
            const nextConnections = [...connectionsRef.current, connection];
            nodesRef.current = nextNodes;
            connectionsRef.current = nextConnections;
            setNodes(nextNodes);
            setConnections(nextConnections);
            setSelectedNodeIds(new Set([configNode.id]));
            setSelectedConnectionId(null);
            setDialogNodeId(configNode.id);
        },
        [effectiveConfig.canvasImageCount, effectiveConfig.count, effectiveConfig.imageModel, effectiveConfig.model, effectiveConfig.size, message],
    );

    const insertAssistantText = useCallback(
        (text: string, title?: string, at?: { x: number; y: number }) => {
            const center =
                at ||
                screenToCanvas((containerRef.current?.getBoundingClientRect().left || 0) + size.width / 2, (containerRef.current?.getBoundingClientRect().top || 0) + size.height / 2);
            const node = {
                ...createCanvasNode(CanvasNodeType.Text, center, { content: text, status: NODE_STATUS_SUCCESS }),
                title: title || text.slice(0, 32) || "Assistant Text",
            };

            setNodes((prev) => [...prev, node]);
            setSelectedNodeIds(new Set([node.id]));
            setSelectedConnectionId(null);
        },
        [screenToCanvas, size.height, size.width],
    );

    const handleAssetInsert = useCallback(
        (payload: InsertAssetPayload, at?: { x: number; y: number }) => {
            const center =
                at ||
                screenToCanvas((containerRef.current?.getBoundingClientRect().left || 0) + size.width / 2, (containerRef.current?.getBoundingClientRect().top || 0) + size.height / 2);
            if (payload.kind === "text") {
                insertAssistantText(payload.content, payload.title, center);
            } else if (payload.kind === "video") {
                const spec = NODE_DEFAULT_SIZE[CanvasNodeType.Video];
                const id = `video-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                const nextSize = fitNodeSize(payload.width || spec.width, payload.height || spec.height, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
                setNodes((prev) => [
                    ...prev,
                    {
                        id,
                        type: CanvasNodeType.Video,
                        title: payload.title,
                        position: { x: center.x - nextSize.width / 2, y: center.y - nextSize.height / 2 },
                        width: nextSize.width,
                        height: nextSize.height,
                        metadata: { content: payload.url, storageKey: payload.storageKey, status: NODE_STATUS_SUCCESS, naturalWidth: payload.width, naturalHeight: payload.height },
                    },
                ]);
                setSelectedNodeIds(new Set([id]));
            } else if (payload.kind === "audio") {
                const spec = NODE_DEFAULT_SIZE[CanvasNodeType.Audio];
                const id = `audio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                setNodes((prev) => [
                    ...prev,
                    {
                        id,
                        type: CanvasNodeType.Audio,
                        title: payload.title,
                        position: { x: center.x - spec.width / 2, y: center.y - spec.height / 2 },
                        width: spec.width,
                        height: spec.height,
                        metadata: { content: payload.url, storageKey: payload.storageKey, status: NODE_STATUS_SUCCESS },
                    },
                ]);
                setSelectedNodeIds(new Set([id]));
            } else {
                const id = `image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                void (async () => {
                    const storedImage = payload.storageKey
                        ? { url: payload.dataUrl, storageKey: payload.storageKey, width: 1, height: 1, bytes: 0, mimeType: "image/png" }
                        : await uploadImage(payload.dataUrl);
                    const meta = storedImage.width === 1 && storedImage.height === 1 ? await readImageMeta(storedImage.url) : storedImage;
                    const size = fitNodeSize(meta.width, meta.height);
                    const contentUrl = storedImage.url;
                    setNodes((prev) => [
                        ...prev,
                        {
                            id,
                            type: CanvasNodeType.Image,
                            title: payload.title.slice(0, 32) || "Imported Image",
                            position: { x: center.x - size.width / 2, y: center.y - size.height / 2 },
                            width: size.width,
                            height: size.height,
                            metadata: {
                                ...imageMetadata({ ...storedImage, width: meta.width, height: meta.height }),
                                prompt: payload.title,
                                ...(payload.compliance || {}),
                            },
                        },
                    ]);
                    setSelectedNodeIds(new Set([id]));
                    setSelectedConnectionId(null);
                    setDialogNodeId(id);
                    if (!payload.compliance?.complianceAssetId && isRemoteHttpUrl(contentUrl)) {
                        void attachImportCompliance(id, contentUrl, payload.title);
                    }
                })();
            }
            setAssetPickerOpen(false);
        },
        [attachImportCompliance, insertAssistantText, screenToCanvas, size.height, size.width],
    );

    const handleCanvasDrop = useCallback(
        (event: ReactDragEvent<HTMLDivElement>) => {
            const assetPayload = readAssetDragData(event.dataTransfer);
            if (assetPayload) {
                event.preventDefault();
                handleAssetInsert(assetPayload, screenToCanvas(event.clientX, event.clientY));
                return;
            }
            handleDrop(event);
        },
        [handleAssetInsert, handleDrop, screenToCanvas],
    );

    // --- 传给 CanvasNode 的回调/渲染函数统一 memo 化 ---
    // CanvasNode 是 React.memo,但只要这些 prop 每次渲染都是新引用,memo 就失效,
    // 导致点击/悬停/移动视角时全部节点跟着重渲染(markdown 尤其明显)。全部 useCallback 后,
    // 未变化的节点不再重渲染。依赖里的 map/handler 均已 memo 化,纯交互时保持稳定。
    const handleNodeHoverStart = useCallback((nodeId: string) => {
        if (dragRef.current) return;
        setHoveredNodeId(nodeId);
    }, []);
    const handleNodeHoverEnd = useCallback((nodeId: string) => {
        setHoveredNodeId((current) => (current === nodeId ? null : current));
    }, []);
    const handleTitleEditingChange = useCallback((nodeId: string | null) => {
        setTitleEditingNodeId(nodeId);
    }, []);
    const handleNodeViewImage = useCallback((node: CanvasNodeData) => setPreviewNodeId(node.id), []);
    const handleNodeRetry = useCallback((node: CanvasNodeData) => void handleRetryNode(node), [handleRetryNode]);
    const handleNodeContextMenu = useCallback((event: ReactMouseEvent, nodeId: string) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({ type: "node", x: event.clientX, y: event.clientY, nodeId });
    }, []);

    const renderNodePanel = useCallback(
        (panelNode: CanvasNodeData) =>
            panelNode.type === CanvasNodeType.Config ? (
                <CanvasConfigComposer
                    value={panelNode.metadata?.composerContent ?? panelNode.metadata?.prompt ?? ""}
                    inputs={configInputsById.get(panelNode.id) || []}
                    onChange={(composerContent) => handleConfigNodeChange(panelNode.id, { composerContent })}
                    onClose={() => setDialogNodeId(null)}
                    styleDescription={effectiveConfig.systemPrompt}
                    seedStyleDescription={(panelNode.metadata?.generationMode ?? "image") === "image" || panelNode.metadata?.generationMode === "video"}
                />
            ) : (
                <CanvasNodePromptPanel
                    node={panelNode}
                    isRunning={runningNodeId === panelNode.id}
                    mentionReferences={mentionReferencesByNodeId.get(panelNode.id) || EMPTY_REFERENCES}
                    onPromptChange={handleNodePromptChange}
                    onConfigChange={handleConfigNodeChange}
                    onGenerate={handleGenerateNode}
                    onStop={confirmStopGeneration}
                    onDisconnectReference={handleDisconnectReference}
                    modeOverride={getNodeDefinition(panelNode.type)?.useBuiltinPanel?.mode}
                    onImageSettingsOpenChange={(open) => {
                        setNodeImageSettingsOpen(open);
                        if (open) setToolbarNodeId(null);
                    }}
                />
            ),
        [configInputsById, confirmStopGeneration, effectiveConfig.systemPrompt, handleConfigNodeChange, handleDisconnectReference, handleGenerateNode, handleNodePromptChange, mentionReferencesByNodeId, runningNodeId],
    );

    const renderNodeContentPanel = useCallback(
        (contentNode: CanvasNodeData) => (
            <CanvasConfigNodePanel
                node={contentNode}
                isRunning={runningNodeId === contentNode.id}
                inputSummary={getInputSummary(configInputsById.get(contentNode.id) || [])}
                onConfigChange={handleConfigNodeChange}
                onComposerToggle={() => setDialogNodeId((current) => (current === contentNode.id ? null : contentNode.id))}
                onStop={confirmStopGeneration}
                onGenerate={(nodeId) => {
                    const target = nodesRef.current.find((item) => item.id === nodeId);
                    const mode = target?.metadata?.generationMode === "video" ? "video" : target?.metadata?.generationMode === "text" ? "text" : target?.metadata?.generationMode === "audio" ? "audio" : "image";
                    void handleGenerateNode(nodeId, mode, target?.metadata?.composerContent ?? target?.metadata?.prompt ?? "");
                }}
            />
        ),
        [configInputsById, confirmStopGeneration, handleConfigNodeChange, handleGenerateNode, runningNodeId],
    );

    if (!projectLoaded) return <CanvasRefreshShell />;

    return (
        <main className="flex h-full min-h-0 flex-col overflow-hidden" style={{ background: theme.canvas.background, color: theme.node.text }}>
            <CanvasTopBar
                projectId={projectId}
                title={currentProject?.title || "未命名画布"}
                titleDraft={titleDraft}
                isTitleEditing={titleEditing}
                onTitleDraftChange={setTitleDraft}
                onStartTitleEditing={startTitleEditing}
                onFinishTitleEditing={finishTitleEditing}
                onCancelTitleEditing={() => setTitleEditing(false)}
                canUndo={historyState.canUndo}
                canRedo={historyState.canRedo}
                nodeCount={nodes.length}
                edgeCount={connections.length}
                saving={cloudSaving}
                onSave={() => void saveToCloud()}
                onHome={() => navigate("/")}
                onProjects={() => navigate("/canvas")}
                onManageTeam={() => navigate("/team")}
                onCreateProject={createAndOpenProject}
                onDeleteProject={deleteCurrentProject}
                onExportProject={exportCurrentProject}
                onImportImage={() => handleUploadRequest()}
                onUndo={undoCanvas}
                onRedo={redoCanvas}
            />
            <div className="flex min-h-0 flex-1 overflow-hidden">
            <section className="relative min-w-0 flex-1 overflow-hidden">

                <InfiniteCanvas
                    containerRef={containerRef}
                    viewport={viewport}
                    interactionMode={interactionMode}
                    backgroundMode={backgroundMode}
                    onViewportChange={handleViewportChange}
                    onViewportFrame={handleViewportFrame}
                    onGestureChange={handleGestureChange}
                    onCanvasMouseDown={handleCanvasMouseDown}
                    onCanvasDeselect={deselectCanvas}
                    onCanvasDoubleClick={(event) => {
                        setContextMenu(null);
                        setNodeCreatePosition(screenToCanvas(event.clientX, event.clientY));
                    }}
                    onKeyboardMenu={() => {
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        setContextMenu(null);
                        setNodeCreatePosition(screenToCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2));
                    }}
                    onContextMenu={preventCanvasContextMenu}
                    onDrop={handleCanvasDrop}
                >
                    <svg className="absolute left-0 top-0 h-[10000px] w-[10000px] overflow-visible" style={{ pointerEvents: "none", transform: "translateZ(0)", zIndex: 0 }}>
                        {connections
                            .filter((connection) => {
                                const from = nodeById.get(connection.fromNodeId);
                                const to = nodeById.get(connection.toNodeId);
                                return Boolean(from && to && !isHiddenBatchConnectionEndpoint(from, nodes) && !isHiddenBatchConnectionEndpoint(to, nodes));
                            })
                            .map((connection) => {
                                const from = nodeById.get(connection.fromNodeId);
                                const to = nodeById.get(connection.toNodeId);
                                if (!from || !to) return null;

                                return (
                                    <ConnectionPath
                                        key={connection.id}
                                        connection={connection}
                                        from={from}
                                        to={to}
                                        active={selectedConnectionId === connection.id || relatedHighlight.connectionIds.has(connection.id)}
                                        onSelect={() => {
                                            setSelectedConnectionId(connection.id);
                                            setSelectedNodeIds(new Set());
                                            setContextMenu(null);
                                        }}
                                        onContextMenu={(event) => {
                                            setSelectedConnectionId(connection.id);
                                            setSelectedNodeIds(new Set());
                                            setContextMenu({ type: "connection", x: event.clientX, y: event.clientY, connectionId: connection.id });
                                        }}
                                    />
                                );
                            })}
                        {connectingParams
                            ? connectingSourceIds.map((sourceId) => (
                                  <ActiveConnectionPath
                                      key={sourceId}
                                      node={nodeById.get(sourceId)}
                                      handle={{ nodeId: sourceId, handleType: connectingParams.handleType }}
                                      mouseWorld={mouseWorld}
                                      target={connectionTargetNodeId ? nodeById.get(connectionTargetNodeId) : undefined}
                                  />
                              ))
                            : null}
                    </svg>

                    {visibleNodes.map((node) => (
                        <CanvasNode
                            key={node.id}
                            data={node}
                            scale={viewport.k}
                            isSelected={selectedNodeIds.has(node.id)}
                            isRelated={relatedHighlight.nodeIds.has(node.id)}
                            isFocusRelated={activeNodeId === node.id}
                            isConnectionTarget={connectionTargetNodeId === node.id}
                            isConnecting={Boolean(connectingParams)}
                            editRequestNonce={editingNodeId === node.id ? editRequestNonce : 0}
                            showPanel={dialogNodeId === node.id && !selectionBox && !getNodeDefinition(node.type)?.hidePanel}
                            batchCount={batchChildCountById.get(node.id) || 0}
                            groupChildCount={groupChildCountById.get(node.id) || 0}
                            isGroupDropTarget={dropTargetGroupId === node.id}
                            batchExpanded={Boolean(node.metadata?.imageBatchExpanded)}
                            batchClosing={Boolean(node.metadata?.batchRootId && collapsingBatchIds.has(node.metadata.batchRootId))}
                            batchOpening={openingBatchIds.has(node.id)}
                            batchRecovering={collapsingBatchIds.has(node.id)}
                            batchMotion={batchMotionById.get(node.id)}
                            showImageInfo={showImageInfo}
                            mentionReferences={mentionReferencesByNodeId.get(node.id) || EMPTY_REFERENCES}
                            registryVersion={nodeRegistryVersion}
                            renderPanel={renderNodePanel}
                            renderNodeContent={renderNodeContentPanel}
                            onMouseDown={handleNodeMouseDown}
                            onSelectCapture={handleNodeSelectCapture}
                            onHoverStart={handleNodeHoverStart}
                            onHoverEnd={handleNodeHoverEnd}
                            onConnectStart={handleConnectStart}
                            onResizeStart={handleNodeResizeStart}
                            onResize={handleNodeResize}
                            onResizeEnd={handleNodeResizeEnd}
                            onContentChange={handleNodeContentChange}
                            onTitleChange={handleNodeTitleChange}
                            onTitleEditingChange={handleTitleEditingChange}
                            onToggleBatch={toggleBatchExpanded}
                            onSetBatchPrimary={setBatchPrimary}
                            onRetry={handleNodeRetry}
                            onGenerateImage={generateImageFromTextNode}
                            onViewImage={handleNodeViewImage}
                            onContextMenu={handleNodeContextMenu}
                            onVideoPoster={handleVideoPoster}
                            onVideoMetrics={handleVideoMetrics}
                        />
                    ))}

                    {selectionBox ? (
                        <div
                            className="pointer-events-none absolute z-[100] border"
                            style={{
                                left: Math.min(selectionBox.startWorldX, selectionBox.currentWorldX),
                                top: Math.min(selectionBox.startWorldY, selectionBox.currentWorldY),
                                width: Math.abs(selectionBox.currentWorldX - selectionBox.startWorldX),
                                height: Math.abs(selectionBox.currentWorldY - selectionBox.startWorldY),
                                borderColor: theme.canvas.selectionStroke,
                                background: theme.canvas.selectionFill,
                            }}
                        />
                    ) : null}
                    {!selectionBox && hasMultipleSelectedNodes ? (
                        <CanvasMultiSelectConnectHub
                            nodes={nodes}
                            selectedNodeIds={selectedNodeIds}
                            scale={viewport.k}
                            onConnectStart={handleConnectStart}
                        />
                    ) : null}
                </InfiniteCanvas>

                {pendingConnectionCreate ? (
                    <ConnectionCreateMenu
                        screenPosition={canvasToScreen(pendingConnectionCreate.position)}
                        onCreate={(type) => createConnectedNode(type, pendingConnectionCreate)}
                        onClose={cancelPendingConnectionCreate}
                    />
                ) : null}
                {nodeCreatePosition ? (
                    <NodeCreateMenu
                        screenPosition={canvasToScreen(nodeCreatePosition)}
                        onCreate={(type) => {
                            createNode(type, nodeCreatePosition);
                            setNodeCreatePosition(null);
                        }}
                        onClose={() => setNodeCreatePosition(null)}
                    />
                ) : null}

                <CanvasNodeHoverToolbar
                    node={isNodeDragging || nodeImageSettingsOpen || canvasGesturing || titleEditingNodeId ? null : toolbarNode}
                    viewport={viewport}
                    viewportSize={size}
                    onKeep={keepNodeToolbar}
                    onLeave={hideNodeToolbar}
                    onInfo={(node) => setInfoNodeId(node.id)}
                    onEditText={openTextEditor}
                    onDecreaseFont={(node) => handleFontSizeChange(node.id, Math.max(10, (node.metadata?.fontSize || 14) - 2))}
                    onIncreaseFont={(node) => handleFontSizeChange(node.id, Math.min(32, (node.metadata?.fontSize || 14) + 2))}
                    onToggleDialog={(node) => setDialogNodeId((current) => (current === node.id ? null : node.id))}
                    onGenerateImage={generateImageFromTextNode}
                    onUpload={(node) => handleUploadRequest(node.id)}
                    onDownload={downloadNodeImage}
                    onSaveAsset={(node) => void saveNodeAsset(node)}
                    onMaskEdit={(node) => setMaskEditNodeId(node.id)}
                    onCrop={(node) => setCropNodeId(node.id)}
                    onSplit={(node) => setSplitNodeId(node.id)}
                    onUpscale={(node) => setUpscaleNodeId(node.id)}
                    onAngle={(node) => setAngleNodeId(node.id)}
                    onViewImage={(node) => setPreviewNodeId(node.id)}
                    onRetry={(node) => void handleRetryNode(node)}
                    onToggleFreeResize={(node) => toggleNodeFreeResize(node.id)}
                    onDelete={(node) => deleteNodes(new Set([node.id]))}
                    onExtractVideoEnds={(node) => void extractVideoEndFrames(node)}
                    onExtractVideoCurrent={(node) => void extractVideoCurrentFrame(node)}
                    onVideoEnhance={(node) => setVideoEnhanceNodeId(node.id)}
                />

                <CanvasToolbar
                    interactionMode={interactionMode}
                    onInteractionModeChange={(mode) => {
                        setInteractionMode(mode);
                        setContextMenu(null);
                        setNodeCreatePosition(null);
                        containerRef.current?.focus({ preventScroll: true });
                    }}
                    onAddImage={() => createNode(CanvasNodeType.Image)}
                    onAddVideo={() => createNode(CanvasNodeType.Video)}
                    onAddAudio={() => createNode(CanvasNodeType.Audio)}
                    onAddText={() => createNode(CanvasNodeType.Text)}
                    onAddConfig={() => createNode(CanvasNodeType.Config)}
                    onAddGroup={() => createNode(CanvasNodeType.Group)}
                    onUpload={() => handleUploadRequest()}
                    onClear={() => setClearConfirmOpen(true)}
                />

                <CanvasZoomControls scale={viewport.k} onScaleChange={setZoomScale} onReset={resetViewport} isMiniMapOpen={isMiniMapOpen} onToggleMiniMap={() => setIsMiniMapOpen((value) => !value)}>
                    {nodes.length > 0 && <Minimap nodes={nodes} viewport={viewport} viewportSize={size} onViewportChange={setViewport} />}
                </CanvasZoomControls>


                {contextMenu ? (
                    <CanvasNodeContextMenu
                        menu={contextMenu}
                        onClose={() => setContextMenu(null)}
                        onDuplicate={() => {
                            if (contextMenu.type !== "node") return;
                            duplicateNode(contextMenu.nodeId);
                            setContextMenu(null);
                        }}
                        onDelete={() => {
                            if (contextMenu.type === "node") {
                                deleteNodes(new Set([contextMenu.nodeId]));
                            } else {
                                deleteConnection(contextMenu.connectionId);
                            }
                            setContextMenu(null);
                        }}
                    />
                ) : null}

                <input ref={imageInputRef} type="file" multiple accept="image/*,video/*,audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav" className="hidden" onChange={handleImageInputChange} />

                <CanvasNodeInfoModal node={infoNode} open={Boolean(infoNode)} onClose={() => setInfoNodeId(null)} />

                {cropNode?.metadata?.content && (
                    <CanvasLazyDialog onClose={() => setCropNodeId(null)}>
                        <CanvasNodeCropDialog dataUrl={cropNode.metadata.content} open onClose={() => setCropNodeId(null)} onConfirm={(crop) => void cropImageNode(cropNode, crop)} />
                    </CanvasLazyDialog>
                )}
                {maskEditNode?.metadata?.content && (
                    <CanvasLazyDialog onClose={() => setMaskEditNodeId(null)}>
                        <CanvasNodeMaskEditDialog dataUrl={maskEditNode.metadata.content} open onClose={() => setMaskEditNodeId(null)} onConfirm={(payload) => void maskEditImageNode(maskEditNode, payload)} />
                    </CanvasLazyDialog>
                )}
                {splitNode?.metadata?.content && (
                    <CanvasLazyDialog onClose={() => setSplitNodeId(null)}>
                        <CanvasNodeSplitDialog dataUrl={splitNode.metadata.content} open onClose={() => setSplitNodeId(null)} onConfirm={(params) => void splitImageNode(splitNode, params)} />
                    </CanvasLazyDialog>
                )}
                {upscaleNode?.metadata?.content && (
                    <CanvasLazyDialog onClose={() => setUpscaleNodeId(null)}>
                        <CanvasNodeUpscaleDialog dataUrl={upscaleNode.metadata.content} open onClose={() => setUpscaleNodeId(null)} onConfirm={(params) => void upscaleImageNode(upscaleNode, params)} />
                    </CanvasLazyDialog>
                )}
                {videoEnhanceNode?.metadata?.content && (
                    <CanvasLazyDialog onClose={() => setVideoEnhanceNodeId(null)}>
                        <CanvasVideoEnhanceDialog
                            videoUrl={videoEnhanceNode.metadata.content}
                            durationMs={videoEnhanceNode.metadata.durationMs}
                            sourceWidth={videoEnhanceNode.metadata.naturalWidth}
                            sourceHeight={videoEnhanceNode.metadata.naturalHeight}
                            open
                            onClose={() => setVideoEnhanceNodeId(null)}
                            onConfirm={(params) => void enhanceVideoNode(videoEnhanceNode, params)}
                        />
                    </CanvasLazyDialog>
                )}
                {angleNode?.metadata?.content && (
                    <CanvasLazyDialog onClose={() => setAngleNodeId(null)}>
                        <CanvasNodeAngleDialog dataUrl={angleNode.metadata.content} open onClose={() => setAngleNodeId(null)} onConfirm={(params) => void generateAngleNode(angleNode, params)} />
                    </CanvasLazyDialog>
                )}
                {configDialogOpen && (
                    <CanvasLazyDialog onClose={() => setConfigDialogOpen(false)}>
                        <CanvasPlatformSettings />
                    </CanvasLazyDialog>
                )}

                <Modal
                    title="图片详情"
                    open={Boolean(previewNode?.metadata?.content)}
                    centered
                    onCancel={() => setPreviewNodeId(null)}
                    footer={null}
                    width="auto"
                    styles={{ body: { padding: 0, display: "flex", justifyContent: "center", alignItems: "center", maxHeight: "80vh" } }}
                >
                    {previewNode?.metadata?.content ? <img src={previewNode.metadata.content} alt={previewNode.title || "图片"} style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} /> : null}
                </Modal>

                <Modal
                    title="清空画布？"
                    open={clearConfirmOpen}
                    centered
                    onCancel={() => setClearConfirmOpen(false)}
                    footer={
                        <>
                            <Button onClick={() => setClearConfirmOpen(false)}>取消</Button>
                            <Button danger type="primary" onClick={clearCanvas}>
                                清空
                            </Button>
                        </>
                    }
                >
                    <p className="text-sm opacity-60">这会删除当前画布上的所有节点和连线。</p>
                </Modal>

                <AssetPickerModal open={assetPickerOpen} onInsert={handleAssetInsert} onClose={() => setAssetPickerOpen(false)} />
            </section>
            <CanvasSidePanel nodes={nodes} selectedNodeIds={selectedNodeIds} onFocusNode={focusNode} onPreviewNode={setPreviewNodeId}
                onAddNode={createNode} onInsertAsset={handleAssetInsert} onVideoPoster={handleVideoPoster} />
            </div>
        </main>
    );
}
