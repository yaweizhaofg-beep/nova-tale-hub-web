import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { App } from "antd";
import { ChevronRight, Group, Image as ImageIcon, Music2, Play, Puzzle, RefreshCw, Search, Star, Video } from "canvas-lucide";

import { loadVideoPosterUrl } from "@canvas/lib/canvas/canvas-video-frame";
import { VIDEO_NODE_MIN_EDGE } from "@canvas/lib/canvas/canvas-node-size";
import { probeVideoDimensions } from "@canvas/lib/canvas/video-upscale";
import { canvasNodeColor, canvasNodeStatus, canvasThemes } from "@canvas/lib/canvas-theme";
import { ossCanvasDisplayWidth, ossVideoPoster, OssThumbImage } from "@canvas/lib/platform/oss-image";
import { formatBytes } from "@canvas/lib/image-utils";
import { getNodeDefinition } from "@canvas/lib/canvas/node-registry";
import { extractVolcanoRequestId, queryVolcanoModerationResult } from "@canvas/services/api/backend-client";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import { CanvasResourceMentionTextarea } from "./canvas-resource-mention-textarea";
import { CanvasNodeType, type CanvasNodeData, type Position } from "@canvas/types/canvas";
import type { CanvasResourceReference } from "@canvas/lib/canvas/canvas-resource-references";

type ResizeCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type CanvasNodeProps = {
    data: CanvasNodeData;
    scale: number;
    isSelected: boolean;
    isRelated: boolean;
    isFocusRelated: boolean;
    isConnectionTarget: boolean;
    isConnecting: boolean;
    editRequestNonce?: number;
    showPanel: boolean;
    showImageInfo: boolean;
    mentionReferences?: CanvasResourceReference[];

    registryVersion?: number;
    renderPanel?: (node: CanvasNodeData) => ReactNode;
    renderNodeContent?: (node: CanvasNodeData) => ReactNode;
    batchCount?: number;
    groupChildCount?: number;
    isGroupDropTarget?: boolean;
    batchExpanded?: boolean;
    batchClosing?: boolean;
    batchOpening?: boolean;
    batchRecovering?: boolean;
    batchMotion?: { x: number; y: number; index: number };
    onMouseDown: (event: React.MouseEvent, nodeId: string) => void;
    onSelectCapture?: (event: React.MouseEvent, nodeId: string) => void;
    onHoverStart: (nodeId: string) => void;
    onHoverEnd: (nodeId: string) => void;
    onConnectStart: (event: React.MouseEvent, nodeId: string, handleType: "source" | "target") => void;
    onResizeStart?: () => void;
    onResize: (nodeId: string, width: number, height: number, position?: Position) => void;
    onResizeEnd?: () => void;
    onContentChange: (nodeId: string, content: string) => void;
    onTitleChange: (nodeId: string, title: string) => void;
    onTitleEditingChange?: (nodeId: string | null) => void;
    onToggleBatch?: (nodeId: string) => void;
    onSetBatchPrimary?: (node: CanvasNodeData) => void;
    onRetry?: (node: CanvasNodeData) => void;
    onGenerateImage?: (node: CanvasNodeData) => void;
    onViewImage?: (node: CanvasNodeData) => void;
    onVideoPoster?: (nodeId: string, posterUrl: string, sourceUrl: string) => void;
    onVideoMetrics?: (nodeId: string, metrics: { width: number; height: number; durationMs?: number }) => void;
    onContextMenu: (event: React.MouseEvent, nodeId: string) => void;
};

type NodeContentRendererProps = {
    node: CanvasNodeData;
    theme: (typeof canvasThemes)[keyof typeof canvasThemes];
    isEditingContent: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    isBatchRoot: boolean;
    batchCount: number;
    batchExpanded: boolean;
    batchOpening: boolean;
    batchRecovering: boolean;
    renderNodeContent?: (node: CanvasNodeData) => ReactNode;

    onContentChange: (nodeId: string, content: string) => void;
    onStopEditing: () => void;
    mentionReferences: CanvasResourceReference[];
    onRetry?: (node: CanvasNodeData) => void;
    onGenerateImage?: (node: CanvasNodeData) => void;
    onVideoPoster?: (nodeId: string, posterUrl: string, sourceUrl: string) => void;
    onVideoMetrics?: (nodeId: string, metrics: { width: number; height: number; durationMs?: number }) => void;
    onToggleBatch?: () => void;
    onSetBatchPrimary?: () => void;
    groupChildCount: number;
};

export const CanvasNode = React.memo(function CanvasNode({
    data,
    scale,
    isSelected,
    isRelated,
    isFocusRelated,
    isConnectionTarget,
    isConnecting,
    editRequestNonce = 0,
    showPanel,
    showImageInfo,
    mentionReferences = [],

    renderPanel,
    renderNodeContent,
    batchCount = 0,
    groupChildCount = 0,
    isGroupDropTarget = false,
    batchExpanded = false,
    batchClosing = false,
    batchOpening = false,
    batchRecovering = false,
    batchMotion,
    onMouseDown,
    onSelectCapture,
    onHoverStart,
    onHoverEnd,
    onConnectStart,
    onResizeStart,
    onResize,
    onResizeEnd,
    onContentChange,
    onTitleChange,
    onTitleEditingChange,
    onToggleBatch,
    onSetBatchPrimary,
    onRetry,
    onGenerateImage,
    onViewImage,
    onVideoPoster,
    onVideoMetrics,
    onContextMenu,
}: CanvasNodeProps) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const [hovered, setHovered] = useState(false);
    const definition = getNodeDefinition(data.type);

    const [isEditingContent, setIsEditingContent] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(data.title || "");
    const hasImageContent = data.type === CanvasNodeType.Image && Boolean(data.metadata?.content);
    const hasVideoContent = data.type === CanvasNodeType.Video && Boolean(data.metadata?.content);
    const isGroup = data.type === CanvasNodeType.Group;
    const isBatchRoot = data.type === CanvasNodeType.Image && Boolean(data.metadata?.isBatchRoot) && batchCount > 1;
    // 支持「交互/移动」开关的节点:移动态(默认)内容不吃指针,拖动整块;交互态内容可操作。
    // forceInteractive(如编辑态)强制可交互;空态(无内容)始终可交互,避免上传/生成按钮点不动。
    const supportsInteractionToggle = Boolean(definition?.interactionToggle);
    const forceInteractive = supportsInteractionToggle ? Boolean(definition?.forceInteractive?.(data)) : false;
    const contentInteractive = !supportsInteractionToggle || forceInteractive || !data.metadata?.content ? true : Boolean(data.metadata?.interactive);
    const isBatchChild = data.type === CanvasNodeType.Image && Boolean(data.metadata?.batchRootId);
    // 透明背景节点(如 SVG):卡片背景/边框透明,直接融入画布;选中/关联态仍显示描边以便定位
    const transparentBg = Boolean(definition?.transparentBackground);
    const nodeAccent = canvasNodeColor(data.type, theme.node.activeStroke);
    const selectionColor = theme.node.activeStroke;
    const status = data.metadata?.status && data.metadata.status !== "idle" ? canvasNodeStatus[data.metadata.status] : undefined;
    const mediaTitleOverlay = hasImageContent || hasVideoContent;
    const showNodeHeader = !isGroup && !transparentBg;
    const isActive = isConnectionTarget || isSelected || isFocusRelated;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const resizeRef = useRef({
        isResizing: false,
        corner: "bottom-right" as ResizeCorner,
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0,
        startWidth: 0,
        startHeight: 0,
        keepRatio: false,
        ratio: 1,
        raf: 0 as number,
        pending: null as { width: number; height: number; x: number; y: number } | null,
    });
    const scaleRef = useRef(scale);
    scaleRef.current = scale;
    const onResizeRef = useRef(onResize);
    onResizeRef.current = onResize;
    const onResizeEndRef = useRef(onResizeEnd);
    onResizeEndRef.current = onResizeEnd;

    useEffect(() => {
        setTitleDraft(data.title || "");
    }, [data.title]);

    useEffect(() => {
        if (!isEditingTitle) return;
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
    }, [isEditingTitle]);

    useEffect(() => {
        if (!isEditingTitle) return;
        onTitleEditingChange?.(data.id);
        return () => onTitleEditingChange?.(null);
    }, [data.id, isEditingTitle, onTitleEditingChange]);

    const finishTitleEditing = useCallback(() => {
        const title = titleDraft.trim() || data.title || "未命名节点";
        setTitleDraft(title);
        setIsEditingTitle(false);
        if (title !== data.title) onTitleChange(data.id, title);
    }, [data.id, data.title, onTitleChange, titleDraft]);

    useEffect(() => {
        if (!isEditingTitle) return;
        const handleOutsidePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (target instanceof Node && titleInputRef.current?.contains(target)) return;
            finishTitleEditing();
        };
        window.addEventListener("pointerdown", handleOutsidePointerDown, true);
        return () => window.removeEventListener("pointerdown", handleOutsidePointerDown, true);
    }, [finishTitleEditing, isEditingTitle]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const handleWheel = (event: WheelEvent) => event.stopPropagation();
        textarea.addEventListener("wheel", handleWheel, { passive: false });
        return () => textarea.removeEventListener("wheel", handleWheel);
    }, [data.type, isEditingContent]);

    useEffect(() => {
        if (!isEditingContent) return;
        const textarea = textareaRef.current;
        textarea?.focus();
        textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
    }, [isEditingContent]);

    useEffect(() => {
        if (!editRequestNonce || data.type !== CanvasNodeType.Text) return;
        setIsEditingContent(true);
    }, [data.type, editRequestNonce]);

    useEffect(() => {
        if (!isEditingContent) return;

        const handleOutsidePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (isEditingContent && textareaRef.current?.contains(target)) return;

            setIsEditingContent(false);
        };

        window.addEventListener("pointerdown", handleOutsidePointerDown, true);
        return () => window.removeEventListener("pointerdown", handleOutsidePointerDown, true);
    }, [isEditingContent]);

    const flushResizePending = useCallback(() => {
        const pending = resizeRef.current.pending;
        resizeRef.current.raf = 0;
        if (!pending) return;
        resizeRef.current.pending = null;
        onResizeRef.current(data.id, pending.width, pending.height, { x: pending.x, y: pending.y });
    }, [data.id]);

    const handleResizeMove = useCallback(
        (event: MouseEvent) => {
            if (!resizeRef.current.isResizing) return;

            const scaleNow = scaleRef.current;
            const dx = (event.clientX - resizeRef.current.startX) / scaleNow;
            const dy = (event.clientY - resizeRef.current.startY) / scaleNow;
            const minWidth = 220;
            const minHeight = 160;
            const startRight = resizeRef.current.startLeft + resizeRef.current.startWidth;
            const startBottom = resizeRef.current.startTop + resizeRef.current.startHeight;
            const fromLeft = resizeRef.current.corner.includes("left");
            const fromTop = resizeRef.current.corner.includes("top");
            const rawWidth = Math.max(minWidth, resizeRef.current.startWidth + (fromLeft ? -dx : dx));
            const rawHeight = Math.max(minHeight, resizeRef.current.startHeight + (fromTop ? -dy : dy));
            let width = rawWidth;
            let height = rawHeight;
            if (resizeRef.current.keepRatio) {
                const ratio = resizeRef.current.ratio;
                if (Math.abs(dx) >= Math.abs(dy)) {
                    height = width / ratio;
                } else {
                    width = height * ratio;
                }
                if (height < minHeight) {
                    height = minHeight;
                    width = height * ratio;
                }
                if (width < minWidth) {
                    width = minWidth;
                    height = width / ratio;
                }
            }

            resizeRef.current.pending = {
                width,
                height,
                x: fromLeft ? startRight - width : resizeRef.current.startLeft,
                y: fromTop ? startBottom - height : resizeRef.current.startTop,
            };
            if (resizeRef.current.raf) return;
            resizeRef.current.raf = requestAnimationFrame(flushResizePending);
        },
        [flushResizePending],
    );

    const handleResizeUp = useCallback(() => {
        if (!resizeRef.current.isResizing && !resizeRef.current.pending) {
            onResizeEndRef.current?.();
            return;
        }
        resizeRef.current.isResizing = false;
        if (resizeRef.current.raf) {
            cancelAnimationFrame(resizeRef.current.raf);
            resizeRef.current.raf = 0;
        }
        flushResizePending();
        onResizeEndRef.current?.();
    }, [flushResizePending]);

    const handleResizeMoveRef = useRef(handleResizeMove);
    handleResizeMoveRef.current = handleResizeMove;
    const handleResizeUpRef = useRef(handleResizeUp);
    handleResizeUpRef.current = handleResizeUp;

    const handleResizeMouseDown = (event: React.MouseEvent, corner: ResizeCorner) => {
        event.stopPropagation();
        event.preventDefault();
        onResizeStart?.();
        resizeRef.current = {
            isResizing: true,
            corner,
            startX: event.clientX,
            startY: event.clientY,
            startLeft: data.position.x,
            startTop: data.position.y,
            startWidth: data.width,
            startHeight: data.height,
            keepRatio: (data.type === CanvasNodeType.Image && !data.metadata?.freeResize) || data.type === CanvasNodeType.Video || Boolean(definition?.keepAspectRatio?.(data)),
            ratio: (data.metadata?.naturalWidth || data.width) / (data.metadata?.naturalHeight || data.height || 1),
            raf: 0,
            pending: null,
        };
        const onMove = (ev: MouseEvent) => handleResizeMoveRef.current(ev);
        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            handleResizeUpRef.current();
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    useEffect(() => {
        return () => {
            if (resizeRef.current.raf) cancelAnimationFrame(resizeRef.current.raf);
        };
    }, []);

    const titleControl = isEditingTitle ? (
        <input
            ref={titleInputRef}
            value={titleDraft}
            maxLength={64}
            aria-label="节点名称"
            className="h-6 min-w-0 flex-1 rounded border bg-transparent px-1 text-xs"
            style={{ borderColor: theme.node.stroke }}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={finishTitleEditing}
            onKeyDown={(event) => {
                if (event.key === "Enter") finishTitleEditing();
                if (event.key === "Escape") {
                    setTitleDraft(data.title || "");
                    setIsEditingTitle(false);
                }
            }}
        />
    ) : (
        <button
            type="button"
            className="min-w-0 flex-1 text-left text-xs font-semibold hover:underline"
            title="双击修改节点名称"
            onDoubleClick={(event) => {
                event.stopPropagation();
                setIsEditingTitle(true);
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "F2") {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsEditingTitle(true);
                }
            }}
        >
            <span className="block truncate">{data.title || "未命名节点"}</span>
        </button>
    );

    return (
        <div
            data-node-id={data.id}
            className={`node-element absolute flex select-none flex-col transition-shadow duration-200 ${isGroup ? "z-[5]" : isSelected ? "z-50" : "z-10"}`}
            style={{
                transform: `translate(${data.position.x}px, ${data.position.y}px)`,
                width: data.width,
                height: data.height,
                transition: "box-shadow 200ms ease",
                contain: "layout style",
            }}
            onMouseEnter={() => {
                setHovered(true);
                onHoverStart(data.id);
            }}
            onMouseLeave={() => {
                setHovered(false);
                onHoverEnd(data.id);
            }}
            onMouseDownCapture={(event) => onSelectCapture?.(event, data.id)}
            onContextMenu={(event) => onContextMenu(event, data.id)}
        >
            {!showNodeHeader && (isSelected || hovered || isEditingTitle) && (
                <div className="absolute left-3 top-[-28px] z-[65] flex max-w-[calc(100%-24px)]" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                    {titleControl}
                </div>
            )}

            <div
                className="relative flex h-full w-full flex-col overflow-visible rounded-[14px] border"
                style={{
                    background: transparentBg || mediaTitleOverlay ? "transparent" : isGroup ? `color-mix(in srgb, ${theme.toolbar.panel} 40%, transparent)` : theme.node.panel,
                    borderColor: isActive || isGroupDropTarget ? selectionColor : isRelated && !isBatchChild ? theme.node.muted : transparentBg ? "transparent" : isGroup ? theme.node.stroke : nodeAccent + "30",
                    borderStyle: isGroup ? "dashed" : "solid",
                    boxShadow: isActive || isGroupDropTarget ? `0 0 0 1px ${selectionColor}50, 0 0 24px ${selectionColor}20` : showNodeHeader ? "0 4px 20px rgba(0,0,0,.24)" : undefined,
                }}
                onMouseDown={(event) => onMouseDown(event, data.id)}
                onDoubleClick={(event) => {
                    if (isBatchRoot) {
                        event.stopPropagation();
                        onToggleBatch?.(data.id);
                        return;
                    }
                    if (data.type === CanvasNodeType.Image && hasImageContent) {
                        event.stopPropagation();
                        onViewImage?.(data);
                        return;
                    }
                    if (data.type !== CanvasNodeType.Text) return;
                    event.stopPropagation();
                    setIsEditingContent(true);
                }}
            >
                {showNodeHeader && (
                    <div
                        className={`${mediaTitleOverlay ? "absolute inset-x-0 top-0 z-[4]" : "relative"} flex h-9 shrink-0 items-center gap-1.5 rounded-t-[inherit] border-b px-2.5`}
                        style={{
                            background: `linear-gradient(170deg, ${nodeAccent}16, transparent 85%), ${theme.node.panel}`,
                            borderColor: nodeAccent + "26",
                            boxShadow: `inset 0 1px ${nodeAccent}45`,
                        }}
                    >
                        <span className="grid size-5 shrink-0 place-items-center rounded-md border [&>svg]:size-3" aria-hidden style={{ background: nodeAccent + "18", borderColor: nodeAccent + "38", color: nodeAccent }}>{definition?.icon}</span>
                        <span className="flex min-w-0 flex-1" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>{titleControl}</span>
                        {status && <span className="shrink-0 rounded-full border px-1.5 text-[10px] font-semibold" style={{ color: status.color, borderColor: status.color + "40", background: status.color + "14" }}>{status.label}</span>}
                    </div>
                )}
                <div
                    className={`relative flex min-h-0 w-full flex-1 items-center justify-center ${showNodeHeader && !mediaTitleOverlay ? "rounded-b-[inherit]" : "rounded-[inherit]"} ${isBatchRoot ? "overflow-visible" : "overflow-hidden"}`}
                    style={
                        {
                            pointerEvents: contentInteractive ? undefined : "none",
                            "--batch-from-x": `${batchMotion?.x || 0}px`,
                            "--batch-from-y": `${batchMotion?.y || 0}px`,
                            "--batch-from-rotate": `${6 + (batchMotion?.index || 0) * 4}deg`,
                            animation: data.metadata?.batchRootId ? (batchClosing ? "canvas-batch-child-out 260ms cubic-bezier(.4,0,.2,1) both" : "canvas-batch-child-in 340ms cubic-bezier(.2,.85,.18,1) both") : undefined,
                            animationDelay: data.metadata?.batchRootId ? `${batchClosing ? 0 : 45 + (batchMotion?.index || 0) * 24}ms` : undefined,
                        } as React.CSSProperties
                    }
                >
                    <NodeContent
                        node={data}
                        theme={theme}
                        isEditingContent={isEditingContent}
                        textareaRef={textareaRef}
                        isBatchRoot={isBatchRoot}
                        batchCount={batchCount}
                        batchExpanded={batchExpanded}
                        batchOpening={batchOpening}
                        batchRecovering={batchRecovering}
                        renderNodeContent={renderNodeContent}

                        mentionReferences={mentionReferences}
                        onContentChange={onContentChange}
                        onStopEditing={() => setIsEditingContent(false)}
                        onRetry={onRetry}
                        onGenerateImage={onGenerateImage}
                        onVideoPoster={onVideoPoster}
                        onVideoMetrics={onVideoMetrics}
                        onToggleBatch={() => onToggleBatch?.(data.id)}
                        onSetBatchPrimary={() => onSetBatchPrimary?.(data)}
                        groupChildCount={groupChildCount}
                    />
                </div>

                {showImageInfo && hasImageContent ? <ImageInfoBar node={data} /> : null}

                <ResizeHandle corner="top-left" onMouseDown={handleResizeMouseDown} />
                <ResizeHandle corner="top-right" onMouseDown={handleResizeMouseDown} />
                <ResizeHandle corner="bottom-left" onMouseDown={handleResizeMouseDown} />
                <ResizeHandle corner="bottom-right" onMouseDown={handleResizeMouseDown} />
            </div>

            {!isGroup ? <ConnectionHandleDot side="left" accent={nodeAccent} active={hovered || isSelected || isConnecting} onMouseDown={(event) => onConnectStart(event, data.id, "target")} /> : null}
            {!isGroup && definition?.hasSourceHandle !== false && data.type !== CanvasNodeType.Config ? <ConnectionHandleDot side="right" accent={nodeAccent} active={hovered || isSelected || isConnecting} onMouseDown={(event) => onConnectStart(event, data.id, "source")} /> : null}

            {showPanel && !isGroup && renderPanel ? <div className="absolute left-1/2 top-full z-[70] w-[600px] -translate-x-1/2 pt-4">{renderPanel(data)}</div> : null}
        </div>
    );
});

function NodeContent(props: NodeContentRendererProps) {
    if (props.node.type === CanvasNodeType.Config && props.renderNodeContent) return props.renderNodeContent(props.node);
    if (props.isBatchRoot) return <ImageNodeContent {...props} />;
    if (props.node.metadata?.status === "loading") return <LoadingContent theme={props.theme} label={props.node.metadata?.loadingLabel} />;
    if (props.node.metadata?.status === "error") return <ErrorContent node={props.node} theme={props.theme} onRetry={props.onRetry} />;

    const Renderer = nodeContentRenderers[props.node.type as CanvasNodeType];
    if (Renderer) return <Renderer {...props} />;

    // 插件节点:有注册渲染器则渲染,否则展示缺少插件占位
    return <MissingPluginContent theme={props.theme} type={props.node.type} />;
}

const nodeContentRenderers = {
    [CanvasNodeType.Text]: TextContent,
    [CanvasNodeType.Image]: ImageNodeContent,
    [CanvasNodeType.Config]: EmptyImageContent,
    [CanvasNodeType.Video]: VideoNodeContent,
    [CanvasNodeType.Audio]: AudioNodeContent,
    [CanvasNodeType.Group]: GroupNodeContent,
} satisfies Record<CanvasNodeType, (props: NodeContentRendererProps) => ReactNode>;

function GroupNodeContent({ theme, groupChildCount }: NodeContentRendererProps) {
    return (
        <div className="pointer-events-none flex h-full w-full flex-col p-4">
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: theme.node.text }}>
                <span className="grid size-8 place-items-center rounded-xl" style={{ background: theme.toolbar.activeBg, color: theme.node.muted }}>
                    <Group className="size-4" />
                </span>
                <span>组</span>
                <span className="ml-auto rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: theme.node.fill, color: theme.node.muted }}>
                    {groupChildCount} 个节点
                </span>
            </div>
            <div className="mt-3 flex-1 rounded-2xl border border-dashed" style={{ borderColor: theme.node.stroke, background: `${theme.node.fill}55` }} />
        </div>
    );
}

function LoadingContent({ theme, label }: Pick<NodeContentRendererProps, "theme"> & { label?: string }) {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3" style={{ color: theme.node.activeStroke }}>
            <div className="size-10 animate-spin rounded-full border-2" style={{ borderColor: theme.node.stroke, borderTopColor: theme.node.activeStroke }} />
            <span className="text-[10px] tracking-[0.2em]">{label || "生成中"}</span>
        </div>
    );
}

function ErrorContent({ node, theme, onRetry }: Pick<NodeContentRendererProps, "node" | "theme" | "onRetry">) {
    const { message, modal } = App.useApp();
    const [moderationLoading, setModerationLoading] = useState(false);
    const errorText = String(node.metadata?.errorDetails || "").trim();
    const requestId = extractVolcanoRequestId(errorText);

    const queryModeration = async () => {
        if (!requestId || moderationLoading) return;
        setModerationLoading(true);
        try {
            const data = await queryVolcanoModerationResult({ requestId, type: "request_id" });
            const summary = String(data?.summary || "").trim() || "未返回拦截原因";
            modal.info({
                title: `审核拦截原因（${data?.requestId || requestId}）`,
                width: 520,
                content: <pre className="m-0 max-h-[50vh] overflow-auto whitespace-pre-wrap break-words text-sm leading-6">{summary}</pre>,
                okText: "知道了",
            });
        } catch (error) {
            const msg =
                (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                (error instanceof Error ? error.message : "查询失败");
            message.error(msg);
        } finally {
            setModerationLoading(false);
        }
    };

    return (
        <div className="flex max-w-[280px] flex-col items-center gap-3 px-5 text-center">
            <div className="text-xs leading-5 text-red-300">{errorText || "生成失败"}</div>
            <div className="flex flex-wrap items-center justify-center gap-2">
                {requestId ? (
                    <button
                        type="button"
                        disabled={moderationLoading}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition hover:scale-[1.02] disabled:opacity-60"
                        style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
                        onClick={(event) => {
                            event.stopPropagation();
                            void queryModeration();
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <Search className="size-3.5" />
                        {moderationLoading ? "查询中…" : "查询具体失败原因"}
                    </button>
                ) : null}
                <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition hover:scale-[1.02]"
                    style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
                    onClick={(event) => {
                        event.stopPropagation();
                        onRetry?.(node);
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    <RefreshCw className="size-3.5" />
                    重试
                </button>
            </div>
        </div>
    );
}

function MissingPluginContent({ theme, type }: Pick<NodeContentRendererProps, "theme"> & { type: string }) {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center" style={{ color: theme.node.placeholder }}>
            <Puzzle className="size-7 opacity-40" />
            <span className="text-sm">缺少插件</span>
            <span className="text-[11px] opacity-70">节点类型 “{type}” 的插件未安装或未启用</span>
        </div>
    );
}

function TextContent({ node, theme, isEditingContent, textareaRef, mentionReferences, onContentChange, onStopEditing }: NodeContentRendererProps) {
    const fontSize = node.metadata?.fontSize || 14;
    const textStyle = { fontSize: `${fontSize}px`, lineHeight: `${Math.round(fontSize * 1.65)}px`, color: theme.node.text, boxSizing: "border-box" } as React.CSSProperties;

    return (
        <div className="flex h-full w-full flex-col overflow-hidden pt-2.5">
            {isEditingContent ? (
                <CanvasResourceMentionTextarea
                    ref={textareaRef}
                    className="thin-scrollbar block h-full w-full resize-none overflow-y-auto whitespace-pre-wrap break-words border-none bg-transparent px-3 pb-3 outline-none select-text appearance-none"
                    style={textStyle}
                    value={node.metadata?.content || ""}
                    references={mentionReferences}
                    highlightLabels={false}
                    onChange={(value) => onContentChange(node.id, value)}
                    onBlur={onStopEditing}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") onStopEditing();
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onWheel={(event) => event.stopPropagation()}
                />
            ) : (
                <div
                    className="thin-scrollbar block h-full w-full overflow-y-auto whitespace-pre-wrap break-words bg-transparent px-3 pb-3"
                    style={textStyle}
                    onWheel={(event) => event.stopPropagation()}
                >
                    {node.metadata?.content || <span style={{ color: theme.node.placeholder }}>双击编辑文字</span>}
                </div>
            )}
        </div>
    );
}

function ImageNodeContent(props: NodeContentRendererProps) {
    if (!props.node.metadata?.content && props.isBatchRoot) {
        const content =
            props.node.metadata?.status === "loading" ? (
                <LoadingContent theme={props.theme} />
            ) : props.node.metadata?.status === "error" ? (
                <ErrorContent node={props.node} theme={props.theme} onRetry={props.onRetry} />
            ) : (
                <EmptyImageContent {...props} isBatchRoot={false} />
            );
        return (
            <BatchFrame batchCount={props.batchCount} batchExpanded={props.batchExpanded} batchOpening={props.batchOpening} batchRecovering={props.batchRecovering} onToggleBatch={props.onToggleBatch}>
                {content}
            </BatchFrame>
        );
    }
    if (!props.node.metadata?.content) return <EmptyImageContent {...props} />;

    return (
        <ImageContent
            node={props.node}
            isBatchRoot={props.isBatchRoot}
            batchCount={props.batchCount}
            batchExpanded={props.batchExpanded}
            batchOpening={props.batchOpening}
            batchRecovering={props.batchRecovering}
            onToggleBatch={props.onToggleBatch}
            onSetBatchPrimary={props.onSetBatchPrimary}
        />
    );
}

function EmptyImageContent({ theme, isBatchRoot, batchCount, batchExpanded, batchOpening, batchRecovering, onToggleBatch }: NodeContentRendererProps) {
    const accent = canvasNodeColor(CanvasNodeType.Image, theme.node.activeStroke);
    const content = (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2" style={{ color: theme.node.placeholder, background: `radial-gradient(ellipse at center, ${accent}0a, transparent 70%)` }}>
            <div className="grid size-10 place-items-center rounded-lg border" style={{ color: accent, background: accent + "14", borderColor: accent + "36" }}>
                <ImageIcon className="size-4" />
            </div>
            <span className="text-[10px]">空图片节点</span>
        </div>
    );
    if (isBatchRoot)
        return (
            <BatchFrame batchCount={batchCount} batchExpanded={batchExpanded} batchOpening={batchOpening} batchRecovering={batchRecovering} onToggleBatch={onToggleBatch}>
                {content}
            </BatchFrame>
        );
    return content;
}

function formatVideoExpiryCountdown(expiresAt: number, now: number) {
    const left = expiresAt - now;
    if (left <= 0) return "已过期";
    const total = Math.floor(left / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = (value: number) => String(value).padStart(2, "0");
    return `过期时间 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function VideoExpiryBadge({ expiresAt, broken }: { expiresAt?: number; broken?: boolean }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (broken || !expiresAt || expiresAt <= Date.now()) return;
        const timer = window.setInterval(() => {
            const next = Date.now();
            setNow(next);
            if (next >= expiresAt) window.clearInterval(timer);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [broken, expiresAt]);
    const expired = Boolean(broken) || (!!expiresAt && expiresAt <= now);
    if (!expired && !expiresAt) return null;
    const label = expired ? "已过期" : formatVideoExpiryCountdown(expiresAt!, now);
    return (
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-30" title={expired ? "生成视频已失效" : "生成视频有效期倒计时"}>
            <span
                className="inline-block rounded-md px-2 py-1 text-[11px] font-medium leading-none tabular-nums backdrop-blur-sm"
                style={{ background: "rgba(0,0,0,.55)", color: "#f87171" }}
            >
                {label}
            </span>
        </div>
    );
}

function VideoNodeContent({ node, theme, onVideoPoster, onVideoMetrics }: NodeContentRendererProps) {
    const url = node.metadata?.content || "";
    const [playing, setPlaying] = useState(false);
    const [posterFailed, setPosterFailed] = useState(false);
    const [linkBroken, setLinkBroken] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const ossPoster = ossVideoPoster(url, ossCanvasDisplayWidth(node.width));
    const cover = posterFailed ? "" : node.metadata?.posterUrl || ossPoster;
    useEffect(() => {
        setPlaying(false);
        setPosterFailed(false);
        setLinkBroken(false);
    }, [url]);
    useEffect(() => {
        if (!url || !/^https?:\/\//i.test(url)) return;
        const probe = document.createElement("video");
        probe.preload = "metadata";
        const onError = () => setLinkBroken(true);
        probe.addEventListener("error", onError);
        probe.src = url.split("#")[0];
        return () => {
            probe.removeEventListener("error", onError);
            probe.removeAttribute("src");
            probe.load();
        };
    }, [url]);
    useEffect(() => {
        if (!playing) return;
        const element = videoRef.current;
        if (!element) return;
        void element.play().catch(() => undefined);
    }, [playing]);
    useEffect(() => {
        if (!url || !/^https?:\/\//i.test(url) || cover || !onVideoPoster) return;
        let cancelled = false;
        void loadVideoPosterUrl(url, node.metadata?.storageKey)
            .then((posterUrl) => {
                if (!cancelled && posterUrl) onVideoPoster(node.id, posterUrl, url);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [cover, node.id, node.metadata?.storageKey, onVideoPoster, url]);
    useEffect(() => {
        if (!url || !onVideoMetrics || node.metadata?.freeResize) return;
        if (Math.min(node.width, node.height) >= VIDEO_NODE_MIN_EDGE) return;
        let cancelled = false;
        const report = (width: number, height: number, durationMs?: number) => {
            if (!cancelled && width >= 16 && height >= 16) onVideoMetrics(node.id, { width, height, durationMs });
        };
        const element = videoRef.current;
        if (element && element.videoWidth >= 16) {
            report(element.videoWidth, element.videoHeight, Number.isFinite(element.duration) ? Math.round(element.duration * 1000) : undefined);
            return;
        }
        void probeVideoDimensions(url).then((size) => {
            if (size) report(size.width, size.height);
        });
        return () => {
            cancelled = true;
        };
    }, [node.height, node.id, node.metadata?.freeResize, node.width, onVideoMetrics, url]);

    if (!url)
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3" style={{ color: theme.node.placeholder }}>
                <Video className="size-7 opacity-35" />
                <span className="text-sm">空视频节点</span>
            </div>
        );

    if (!playing && cover) {
        return (
            <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-black">
                <img src={cover} alt="" draggable={false} className="pointer-events-none h-full w-full object-contain" onError={() => setPosterFailed(true)} />
                <button
                    type="button"
                    aria-label="播放"
                    data-canvas-no-zoom
                    className="absolute left-1/2 top-1/2 z-[2] grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white"
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        setPlaying(true);
                    }}
                >
                    <Play className="size-6 translate-x-0.5" fill="currentColor" />
                </button>
                <VideoExpiryBadge expiresAt={node.metadata?.videoExpiresAt} broken={linkBroken} />
            </div>
        );
    }

    return (
        <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-black">
            <video
                ref={videoRef}
                src={playing ? url : `${url.split("#")[0]}#t=0.1`}
                controls
                playsInline
                preload="metadata"
                tabIndex={-1}
                className="h-full w-full object-contain"
                data-canvas-no-zoom
                onError={() => setLinkBroken(true)}
            />
            <div className="absolute inset-x-0 top-0 bottom-14 z-[1]" data-canvas-no-zoom aria-hidden />
            <VideoExpiryBadge expiresAt={node.metadata?.videoExpiresAt} broken={linkBroken} />
        </div>
    );
}

function AudioNodeContent({ node, theme }: NodeContentRendererProps) {
    if (!node.metadata?.content)
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2" style={{ color: theme.node.placeholder }}>
                <Music2 className="size-7 opacity-35" />
                <span className="text-sm">空音频节点</span>
            </div>
        );
    return (
        <div className="flex h-full w-full flex-col justify-center gap-3 px-4" style={{ background: theme.node.fill, color: theme.node.text }}>
            <div className="flex min-w-0 items-center gap-2 text-sm opacity-70">
                <Music2 className="size-4 shrink-0" />
                <span className="truncate">音频</span>
            </div>
            <audio src={node.metadata.content} controls className="w-full" data-canvas-no-zoom />
        </div>
    );
}

function ImageContent({
    node,
    isBatchRoot,
    batchCount,
    batchExpanded,
    batchOpening,
    batchRecovering,
    onToggleBatch,
    onSetBatchPrimary,
}: {
    node: CanvasNodeData;
    isBatchRoot: boolean;
    batchCount: number;
    batchExpanded: boolean;
    batchOpening: boolean;
    batchRecovering: boolean;
    onToggleBatch?: () => void;
    onSetBatchPrimary?: () => void;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const isBatchChild = Boolean(node.metadata?.batchRootId);
    const compliance = node.metadata?.complianceStatus;
    const complianceLabel =
        compliance === "ACTIVE" ? "已合规" : compliance === "FAILED" ? "合规失败" : compliance === "PROCESSING" ? "合规检测中" : null;
    const complianceText =
        compliance === "ACTIVE" ? "#4ade80" : compliance === "FAILED" ? "#f87171" : "#e7e5e4";

    return (
        <BatchFrame batchCount={isBatchRoot ? batchCount : 0} batchExpanded={batchExpanded} batchOpening={batchOpening} batchRecovering={batchRecovering} onToggleBatch={onToggleBatch}>
            <div className="h-full w-full overflow-hidden rounded-3xl">
                <OssThumbImage
                    src={node.metadata!.content!}
                    maxWidth={ossCanvasDisplayWidth(node.width)}
                    alt={node.title}
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                    className={`pointer-events-none block h-full w-full select-none ${node.metadata?.freeResize ? "object-fill" : "object-contain"}`}
                />
            </div>
            {complianceLabel ? (
                <div
                    className="pointer-events-none absolute left-2.5 top-2.5 z-30 max-w-[calc(100%-56px)]"
                    title={node.metadata?.complianceError || complianceLabel}
                >
                    <span
                        className="inline-block max-w-full truncate rounded-md px-2 py-1 text-[11px] font-medium leading-none text-white backdrop-blur-sm"
                        style={{ background: "rgba(0,0,0,.55)", color: complianceText }}
                    >
                        {complianceLabel}
                    </span>
                </div>
            ) : null}
            {isBatchRoot ? (
                <button
                    type="button"
                    className="absolute right-2.5 top-2.5 z-30 flex h-8 items-center justify-center gap-1 rounded-full border px-2.5 text-xs font-semibold shadow-[0_6px_18px_rgba(15,23,42,.10)] backdrop-blur-md transition hover:scale-[1.02]"
                    style={{ background: `color-mix(in srgb, ${theme.toolbar.panel} 85%, transparent)`, borderColor: theme.toolbar.border, color: theme.node.text }}
                    aria-label={batchExpanded ? "图片组已展开" : "图片组已收起"}
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleBatch?.();
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                >
                    <span className="leading-none text-[#2f80ff]">{batchCount}</span>
                    <ChevronRight className={`size-3.5 opacity-55 transition-transform ${batchExpanded ? "rotate-90" : ""}`} />
                </button>
            ) : null}
            {isBatchChild ? (
                <button
                    type="button"
                    className="absolute right-3 top-3 z-30 flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium opacity-0 shadow-[0_8px_20px_rgba(68,64,60,.13)] backdrop-blur-md transition group-hover/batch:opacity-100 hover:scale-[1.02]"
                    style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
                    onClick={(event) => {
                        event.stopPropagation();
                        onSetBatchPrimary?.();
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                >
                    <Star className="size-3.5 text-[#2f80ff]" />
                    设为主图
                </button>
            ) : null}
        </BatchFrame>
    );
}

function ImageInfoBar({ node }: { node: CanvasNodeData }) {
    const width = Math.round(node.metadata?.naturalWidth || node.width);
    const height = Math.round(node.metadata?.naturalHeight || node.height);
    const size = formatBytes(node.metadata?.bytes || 0);
    return (
        <div className="pointer-events-none absolute bottom-3 right-3 z-40 max-w-[calc(100%-24px)]">
            <span className="max-w-full truncate rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium leading-none text-white backdrop-blur-sm">
                {width} x {height}
                {size ? ` · ${size}` : ""}
            </span>
        </div>
    );
}

function BatchFrame({ batchCount, batchExpanded, batchOpening, batchRecovering, onToggleBatch, children }: { batchCount: number; batchExpanded: boolean; batchOpening: boolean; batchRecovering: boolean; onToggleBatch?: () => void; children: ReactNode }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const isBatchRoot = batchCount > 1;
    return (
        <div
            className="group/batch relative h-full w-full overflow-visible"
            onDoubleClick={
                isBatchRoot
                    ? (event) => {
                          event.stopPropagation();
                          onToggleBatch?.();
                      }
                    : undefined
            }
        >
            {isBatchRoot ? (
                <div className="pointer-events-none absolute inset-0 overflow-visible">
                    {Array.from({ length: Math.min(batchCount - 1, 5) }).map((_, index) => (
                        <div
                            key={index}
                            className="absolute rounded-[inherit] border shadow-[0_14px_34px_rgba(68,64,60,.16)] transition-all duration-300 group-hover/batch:translate-x-2"
                            style={{
                                inset: 0,
                                background: `linear-gradient(135deg, ${theme.node.panel}, ${theme.node.fill})`,
                                borderColor: theme.node.stroke,
                                opacity: batchExpanded && !batchOpening ? 0.34 : 1,
                                transform:
                                    batchOpening || batchRecovering ? `translate(${54 + index * 22}px, ${20 + index * 12}px) rotate(${8 + index * 5}deg) scale(.98)` : `translate(${34 + index * 18}px, ${14 + index * 10}px) rotate(${6 + index * 4}deg)`,
                                zIndex: -index - 1,
                            }}
                        />
                    ))}
                </div>
            ) : null}
            {children}
        </div>
    );
}
function ResizeHandle({ corner, onMouseDown }: { corner: ResizeCorner; onMouseDown: (event: React.MouseEvent, corner: ResizeCorner) => void }) {
    const positionClass = {
        "top-left": "-left-[14px] -top-[14px] cursor-nwse-resize",
        "top-right": "-right-[14px] -top-[14px] cursor-nesw-resize",
        "bottom-left": "-bottom-[14px] -left-[14px] cursor-nesw-resize",
        "bottom-right": "-bottom-[14px] -right-[14px] cursor-nwse-resize",
    }[corner];

    return <div className={`absolute z-50 size-7 ${positionClass}`} onMouseDown={(event) => onMouseDown(event, corner)} />;
}

function ConnectionHandleDot({ side, accent, active, onMouseDown }: { side: "left" | "right"; accent: string; active: boolean; onMouseDown: (event: React.MouseEvent) => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];

    return (
        <div
            className={`absolute top-1/2 z-30 flex size-16 -translate-y-1/2 cursor-crosshair items-center justify-center transition-opacity duration-150 ${
                side === "left" ? "-left-8" : "-right-8"
            } ${active ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-70"}`}
            onMouseDown={onMouseDown}
        >
            <div
                className="size-3 rounded-full border transition-transform hover:scale-125"
                style={{
                    background: theme.node.panel,
                    borderColor: accent,
                    boxShadow: `0 0 7px ${accent}50`,
                }}
            />
        </div>
    );
}
